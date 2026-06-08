import { and, eq, or, isNull, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../db/drizzle';
import {
  heroCareInboxes,
  heroCareSnapshots,
  heroCareCustomers,
  heroCareConversations,
  heroCareMessages,
  heroCareScripts,
  heroCareSnapshotItems,
  heroCareGuardrails,
  heroCareEvents,
  connectHubConnections,
} from '../db/schema';
import { runConnectorAction } from '../connect-hub/connector-service';

/**
 * 3-TIER SCRIPT MATCHER
 * Tầng 1: Khớp từ khóa (Keyword Match)
 * Tầng 2: Khớp ý định (Intent Heuristic Match)
 * Tầng 3: Không khớp -> Trả về null để chuyển giao AI
 */
export async function matchScript(
  teamId: number,
  inboxId: number,
  messageText: string
): Promise<{ script: typeof heroCareScripts.$inferSelect; matchTier: 1 | 2; confidence: number } | null> {
  const normalizedText = messageText.trim().toLowerCase();
  if (!normalizedText) return null;

  // Lấy tất cả scripts active của team (hoặc dùng chung cho mọi inbox, hoặc cho inbox cụ thể này)
  const scripts = await db
    .select()
    .from(heroCareScripts)
    .where(
      and(
        eq(heroCareScripts.teamId, teamId),
        eq(heroCareScripts.status, 'active'),
        or(
          eq(heroCareScripts.inboxId, inboxId),
          isNull(heroCareScripts.inboxId)
        )
      )
    );

  let bestMatch: { script: typeof heroCareScripts.$inferSelect; confidence: number } | null = null;

  for (const script of scripts) {
    let keywords: string[] = [];
    let negativeKeywords: string[] = [];

    // Parse keywords
    if (typeof script.keywords === 'string') {
      try {
        keywords = JSON.parse(script.keywords);
      } catch {
        keywords = [];
      }
    } else if (Array.isArray(script.keywords)) {
      keywords = script.keywords as string[];
    }

    // Parse negative keywords
    if (typeof script.negativeKeywords === 'string') {
      try {
        negativeKeywords = JSON.parse(script.negativeKeywords);
      } catch {
        negativeKeywords = [];
      }
    } else if (Array.isArray(script.negativeKeywords)) {
      negativeKeywords = script.negativeKeywords as string[];
    }

    if (keywords.length === 0) continue;

    // Check negative keywords (nếu có từ khóa phủ định trong tin nhắn -> loại ngay)
    const hasNegative = negativeKeywords.some(kw => normalizedText.includes(kw.trim().toLowerCase()));
    if (hasNegative) continue;

    // Kiểm tra xem messageText có chứa TẤT CẢ các keywords không
    const matchedCount = keywords.filter(kw => normalizedText.includes(kw.trim().toLowerCase())).length;
    if (matchedCount === 0) continue;

    // Tính điểm tin cậy
    const confidence = Math.round((matchedCount / keywords.length) * 100);
    const threshold = script.confidenceThreshold ?? 70;

    if (confidence >= threshold) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { script, confidence };
      }
    }
  }

  // Tầng 1: Khớp từ khóa thành công
  if (bestMatch) {
    return {
      script: bestMatch.script,
      matchTier: 1,
      confidence: bestMatch.confidence
    };
  }

  // Tầng 2: Intent Match (Phân loại Heuristic)
  let detectedIntent: string | null = null;
  if (/(đổi\s+trả|hoàn\s+tiền|trả\s+hàng|refund|trả\s+lại)/gi.test(normalizedText)) {
    detectedIntent = 'refund';
  } else if (/(giao\s+hàng|ship|vận\s+chuyển|đơn\s+hàng|gửi\s+hàng)/gi.test(normalizedText)) {
    detectedIntent = 'shipping';
  } else if (/(giá|bao\s+nhiêu|chi\s+phí|cost|nhiêu\s+tiền|đắt)/gi.test(normalizedText)) {
    detectedIntent = 'pricing';
  } else if (/(còn\s+hàng|tồn\s+kho|hết\s+hàng|stock|size)/gi.test(normalizedText)) {
    detectedIntent = 'stock';
  }

  if (detectedIntent) {
    const intentScript = scripts.find(s => s.intent === detectedIntent);
    if (intentScript) {
      return {
        script: intentScript,
        matchTier: 2,
        confidence: 80
      };
    }
  }

  // Tầng 3: AI Fallback
  return null;
}

/**
 * GUARDRAILS CHECKER
 * Kiểm tra các giới hạn và quy định an toàn trước khi chạy AI
 */
export async function checkGuardrails(
  teamId: number,
  inboxId: number,
  messageText: string,
  conversationId?: number
): Promise<{ passed: boolean; action?: 'handoff' | 'block' | 'warn'; reason?: string }> {
  const normalizedText = messageText.trim().toLowerCase();

  const guardrails = await db
    .select()
    .from(heroCareGuardrails)
    .where(
      and(
        eq(heroCareGuardrails.teamId, teamId),
        eq(heroCareGuardrails.enabled, 1),
        or(
          eq(heroCareGuardrails.inboxId, inboxId),
          isNull(heroCareGuardrails.inboxId)
        )
      )
    );

  for (const gr of guardrails) {
    let condition: any = {};
    if (typeof gr.condition === 'string') {
      try {
        condition = JSON.parse(gr.condition);
      } catch {
        condition = {};
      }
    } else if (gr.condition && typeof gr.condition === 'object') {
      condition = gr.condition;
    }

    // Rule: Chặn từ khóa xấu/nhạy cảm
    if (gr.ruleType === 'keyword_block') {
      const keywords = condition.keywords || [];
      const matched = keywords.some((kw: string) => normalizedText.includes(kw.trim().toLowerCase()));
      if (matched) {
        return {
          passed: false,
          action: (gr.action as 'handoff' | 'block' | 'warn') || 'block',
          reason: `Khớp từ khóa chặn: ${keywords.filter((kw: string) => normalizedText.includes(kw.trim().toLowerCase())).join(', ')}`
        };
      }
    }

    // Rule: Nhận diện ý định để chuyển giao cho nhân viên trực tiếp
    if (gr.ruleType === 'intent_handoff') {
      let detectedIntent: string | null = null;
      if (/(đổi\s+trả|hoàn\s+tiền|trả\s+hàng|refund|trả\s+lại)/gi.test(normalizedText)) {
        detectedIntent = 'refund';
      } else if (/(giao\s+hàng|ship|vận\s+chuyển|đơn\s+hàng|gửi\s+hàng)/gi.test(normalizedText)) {
        detectedIntent = 'shipping';
      } else if (/(giá|bao\s+nhiêu|chi\s+phí|cost|nhiêu\s+tiền|đắt)/gi.test(normalizedText)) {
        detectedIntent = 'pricing';
      } else if (/(còn\s+hàng|tồn\s+kho|hết\s+hàng|stock|size)/gi.test(normalizedText)) {
        detectedIntent = 'stock';
      }

      const intentsToHandoff = condition.intents || [];
      if (detectedIntent && intentsToHandoff.includes(detectedIntent)) {
        return {
          passed: false,
          action: (gr.action as 'handoff' | 'block' | 'warn') || 'handoff',
          reason: `Khớp ý định cần chuyển giao: ${detectedIntent}`
        };
      }
    }

    // Rule: Giới hạn số lượt AI trả lời liên tiếp (chống lặp, kẹt)
    if (gr.ruleType === 'max_turns_handoff' && conversationId) {
      const maxTurns = condition.maxTurns || 5;
      const recentMessages = await db
        .select()
        .from(heroCareMessages)
        .where(
          and(
            eq(heroCareMessages.teamId, teamId),
            eq(heroCareMessages.conversationId, conversationId)
          )
        )
        .orderBy(desc(heroCareMessages.createdAt))
        .limit(maxTurns * 2);

      let aiTurnCount = 0;
      for (const m of recentMessages) {
        if (m.direction === 'outbound') {
          if (m.senderId && m.senderId.startsWith('agent-')) {
            break;
          } else {
            aiTurnCount++;
          }
        }
      }

      if (aiTurnCount >= maxTurns) {
        return {
          passed: false,
          action: (gr.action as 'handoff' | 'block' | 'warn') || 'handoff',
          reason: `Đã vượt quá số lượt AI phản hồi liên tiếp (${maxTurns} lượt)`
        };
      }
    }

    // Rule: Chặn nếu dữ liệu snapshot quá hạn (tránh báo sai tồn kho/giá)
    if (gr.ruleType === 'stale_data_block') {
      const maxStaleMinutes = condition.maxStaleMinutes || 60;
      const snapshots = await db
        .select()
        .from(heroCareSnapshots)
        .where(
          and(
            eq(heroCareSnapshots.inboxId, inboxId),
            eq(heroCareSnapshots.status, 'active')
          )
        );

      const now = Date.now();
      for (const snap of snapshots) {
        if (snap.lastRefreshedAt) {
          const staleTime = now - new Date(snap.lastRefreshedAt).getTime();
          if (staleTime > maxStaleMinutes * 60 * 1000) {
            return {
              passed: false,
              action: (gr.action as 'handoff' | 'block' | 'warn') || 'handoff',
              reason: `Dữ liệu snapshot "${snap.name}" bị lỗi thời (> ${maxStaleMinutes} phút)`
            };
          }
        } else {
          return {
            passed: false,
            action: (gr.action as 'handoff' | 'block' | 'warn') || 'handoff',
            reason: `Dữ liệu snapshot "${snap.name}" chưa bao giờ được đồng bộ`
          };
        }
      }
    }
  }

  return { passed: true };
}

export interface AIReplyResult {
  content: string;
  aiStatus: 'success' | 'failed' | 'fallback' | 'script' | 'handoff' | 'blocked';
  aiConfidence: number;
  usedSnapshotIds: number[];
  usedScriptIds: number[];
  handoffReason?: string;
}

/**
 * BUILD AI REPLY
 * Ráp nối dữ liệu context và gọi connector AI
 */
export async function buildAIReply(params: {
  teamId: number;
  inbox: typeof heroCareInboxes.$inferSelect;
  conversation: typeof heroCareConversations.$inferSelect;
  customer: typeof heroCareCustomers.$inferSelect | null;
  messageText: string;
  matchedScript: { script: typeof heroCareScripts.$inferSelect; matchTier: 1 | 2; confidence: number } | null;
}): Promise<AIReplyResult> {
  const { teamId, inbox, conversation, customer, messageText, matchedScript } = params;

  // 1. Tối ưu: Nếu kịch bản khớp từ khóa chất lượng cao (Tier 1, >=90% tin cậy) -> Trả về thẳng, 0đ AI cost.
  if (matchedScript && matchedScript.matchTier === 1 && matchedScript.confidence >= 90) {
    return {
      content: matchedScript.script.replyText,
      aiStatus: 'script',
      aiConfidence: matchedScript.confidence,
      usedSnapshotIds: [],
      usedScriptIds: [matchedScript.script.id]
    };
  }

  // 2. Chạy Guardrails kiểm tra an toàn
  const guardrailCheck = await checkGuardrails(teamId, inbox.id, messageText, conversation.id);
  if (!guardrailCheck.passed) {
    return {
      content: inbox.defaultReply,
      aiStatus: guardrailCheck.action === 'handoff' ? 'handoff' : 'blocked',
      aiConfidence: 0,
      usedSnapshotIds: [],
      usedScriptIds: [],
      handoffReason: guardrailCheck.reason
    };
  }

  // 3. Kiểm tra Quota giới hạn gọi AI trong ngày của inbox
  if (inbox.dailyAiCallCount >= inbox.dailyAiCallLimit) {
    return {
      content: inbox.defaultReply,
      aiStatus: 'blocked',
      aiConfidence: 0,
      usedSnapshotIds: [],
      usedScriptIds: [],
      handoffReason: 'QUOTA_EXCEEDED'
    };
  }

  // 4. Xây dựng Context cho mô hình ngôn ngữ lớn (LLM)
  // a. Dữ liệu Snapshot (Sản phẩm, tồn kho, giá cả) khớp với tin nhắn
  let snapshotContextText = '';
  const usedSnapshotIds: number[] = [];

  const activeSnapshots = await db
    .select()
    .from(heroCareSnapshots)
    .where(
      and(
        eq(heroCareSnapshots.inboxId, inbox.id),
        eq(heroCareSnapshots.status, 'active')
      )
    );

  if (activeSnapshots.length > 0) {
    const snapIds = activeSnapshots.map(s => s.id);
    let matchingItems = await db
      .select()
      .from(heroCareSnapshotItems)
      .where(
        and(
          inArray(heroCareSnapshotItems.snapshotId, snapIds),
          sql`${heroCareSnapshotItems.entityName} ILIKE ${'%' + messageText.trim() + '%'}`
        )
      )
      .limit(5);

    // Fallback: Nếu không tìm thấy bằng cả câu dài (>3 từ) hoặc có kịch bản khớp, trích xuất từ khóa/lọc từ dừng để tìm kiếm
    if (matchingItems.length === 0) {
      let fallbackQuery = '';
      if (matchedScript && matchedScript.script.keywords) {
        let keywords: string[] = [];
        if (typeof matchedScript.script.keywords === 'string') {
          try { keywords = JSON.parse(matchedScript.script.keywords); } catch {}
        } else if (Array.isArray(matchedScript.script.keywords)) {
          keywords = matchedScript.script.keywords as string[];
        }
        if (keywords.length > 0) {
          fallbackQuery = keywords[0];
        }
      }

      if (!fallbackQuery) {
        const words = messageText.trim().split(/\s+/).filter(w => {
          const stopWords = ['shop', 'ơi', 'mình', 'có', 'không', 'giá', 'bao', 'nhiêu', 'ship', 'dạ', 'cho', 'em', 'xem', 'sản', 'phẩm', 'sp', 'cái', 'chiếc', 'à', 'ạ', 'nè', 'với', 'tư', 'vấn'];
          return !stopWords.includes(w.toLowerCase());
        });
        if (words.length > 0) {
          fallbackQuery = words.slice(0, 2).join(' ');
        }
      }

      if (fallbackQuery) {
        matchingItems = await db
          .select()
          .from(heroCareSnapshotItems)
          .where(
            and(
              inArray(heroCareSnapshotItems.snapshotId, snapIds),
              sql`${heroCareSnapshotItems.entityName} ILIKE ${'%' + fallbackQuery + '%'}`
            )
          )
          .limit(5);
      }
    }

    if (matchingItems.length > 0) {
      snapshotContextText = "DỮ LIỆU KHO HÀNG/SẢN PHẨM HIỆN TẠI:\n";
      matchingItems.forEach(item => {
        if (!usedSnapshotIds.includes(item.snapshotId)) {
          usedSnapshotIds.push(item.snapshotId);
        }
        let detailText = '';
        const itemData = item.data as Record<string, any>;
        if (itemData) {
          detailText = Object.entries(itemData)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        }
        snapshotContextText += `- [${item.entityKey}] ${item.entityName} (${item.dataType}): ${detailText}\n`;
      });
    }
  }

  // b. Chat History (5 tin nhắn gần nhất để giữ ngữ cảnh hội thoại)
  const history = await db
    .select()
    .from(heroCareMessages)
    .where(
      and(
        eq(heroCareMessages.conversationId, conversation.id),
        eq(heroCareMessages.teamId, teamId)
      )
    )
    .orderBy(desc(heroCareMessages.createdAt))
    .limit(5);

  const historyMessages = history
    .reverse()
    .map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content
    }));

  // c. Few-shot example từ FAQ khớp được
  let fewShotText = '';
  const usedScriptIds: number[] = [];
  if (matchedScript) {
    usedScriptIds.push(matchedScript.script.id);
    fewShotText = `VÍ DỤ TRẢ LỜI PHÙ HỢP:\nKhách hỏi: "${matchedScript.script.triggerText}"\nTrả lời: "${matchedScript.script.replyText}"\n\n`;
  }

  // d. Thông tin khách hàng
  let customerText = '';
  if (customer) {
    customerText = `THÔNG TIN KHÁCH HÀNG:\n- Tên: ${customer.name || 'Không rõ'}\n- SĐT: ${customer.phone || 'Chưa có'}\n- Tags: ${JSON.stringify(customer.tags)}\n- Ghi chú: ${customer.notes || 'Không có'}\n\n`;
  }

  // e. Ráp nối System Prompt
  const baseSystemPrompt = inbox.systemPrompt || "Bạn là một trợ lý chăm sóc khách hàng chuyên nghiệp, thân thiện. Hãy trả lời câu hỏi của khách hàng ngắn gọn, trực diện.";
  const systemPromptText = `${baseSystemPrompt}

${customerText}
${snapshotContextText}
${fewShotText}
Hãy dựa trên các thông tin kho hàng/sản phẩm và thông tin khách hàng ở trên để phản hồi tin nhắn mới nhất của khách hàng một cách chính xác. Nếu không có thông tin tồn kho hoặc thông tin yêu cầu, vui lòng trả lời nhã nhặn rằng sẽ kiểm tra lại và báo nhân viên liên hệ lại sau. KHÔNG được tự bịa ra thông tin tồn kho/giá cả khi không có dữ liệu khớp.`;

  // 5. Xác định Connector AI thích hợp
  let connectionId = inbox.connectionId;
  if (!connectionId) {
    // Tự động tìm connection AI đầu tiên của Team nếu chưa set
    const aiConns = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.status, 'connected'),
          inArray(connectHubConnections.appSlug, ['openai', 'gemini', 'anthropic', 'deepseek', 'grok', 'qwen', 'chiasegpu'])
        )
      )
      .limit(1);

    if (aiConns.length > 0) {
      connectionId = aiConns[0].id;
    }
  }

  if (!connectionId) {
    return {
      content: inbox.defaultReply,
      aiStatus: 'failed',
      aiConfidence: 0,
      usedSnapshotIds: [],
      usedScriptIds: [],
      handoffReason: 'NO_AI_CONNECTION'
    };
  }

  const [conn] = await db
    .select()
    .from(connectHubConnections)
    .where(eq(connectHubConnections.id, connectionId))
    .limit(1);

  if (!conn) {
    return {
      content: inbox.defaultReply,
      aiStatus: 'failed',
      aiConfidence: 0,
      usedSnapshotIds: [],
      usedScriptIds: [],
      handoffReason: 'AI_CONNECTION_NOT_FOUND'
    };
  }

  // Chọn model mặc định theo từng provider
  let defaultModel = 'gpt-4o-mini';
  if (conn.appSlug === 'gemini') defaultModel = 'gemini-2.0-flash';
  else if (conn.appSlug === 'anthropic') defaultModel = 'claude-3-haiku-20240307';
  else if (conn.appSlug === 'deepseek') defaultModel = 'deepseek-chat';
  else if (conn.appSlug === 'grok') defaultModel = 'grok-2-1212';
  else if (conn.appSlug === 'qwen') defaultModel = 'qwen-plus';
  else if (conn.appSlug === 'chiasegpu') defaultModel = 'gpt-3.5-turbo';

  // Điều chỉnh cấu trúc messages tương thích với từng model
  const messages: any[] = [];
  if (['openai', 'deepseek', 'grok', 'qwen', 'chiasegpu'].includes(conn.appSlug)) {
    messages.push({ role: 'system', content: systemPromptText });
    messages.push(...historyMessages);
    messages.push({ role: 'user', content: messageText });
  } else if (conn.appSlug === 'anthropic') {
    messages.push(...historyMessages);
    messages.push({ role: 'user', content: messageText });
  } else if (conn.appSlug === 'gemini') {
    if (historyMessages.length > 0) {
      historyMessages[0].content = `Chỉ dẫn hệ thống:\n${systemPromptText}\n\nLịch sử chat:\n${historyMessages[0].content}`;
      messages.push(...historyMessages);
      messages.push({ role: 'user', content: messageText });
    } else {
      messages.push({ role: 'user', content: `Chỉ dẫn hệ thống:\n${systemPromptText}\n\nTin nhắn khách hàng: ${messageText}` });
    }
  } else {
    messages.push({ role: 'system', content: systemPromptText });
    messages.push(...historyMessages);
    messages.push({ role: 'user', content: messageText });
  }

  // 6. Thực thi gọi LLM API qua Connect Hub
  try {
    const aiResult = await runConnectorAction({
      teamId,
      connectionId: conn.id,
      actionSlug: 'chat_completion',
      input: {
        model: defaultModel,
        messages,
        temperature: 0.3,
        system: systemPromptText // Dành riêng cho Anthropic
      },
      callerModule: 'hero-care'
    });

    let replyText = '';
    if (aiResult.success && aiResult.data) {
      const data = aiResult.data;
      if (['openai', 'deepseek', 'grok', 'qwen', 'chiasegpu'].includes(conn.appSlug)) {
        replyText = data.choices?.[0]?.message?.content || '';
      } else if (conn.appSlug === 'gemini') {
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (conn.appSlug === 'anthropic') {
        replyText = data.content?.[0]?.text || '';
      } else {
        replyText = data.choices?.[0]?.message?.content || data.content?.[0]?.text || '';
      }
    }

    if (!replyText.trim()) {
      throw new Error(aiResult.error || 'Mô hình AI phản hồi rỗng.');
    }

    // Cộng dồn usage trong ngày cho inbox
    await db
      .update(heroCareInboxes)
      .set({
        dailyAiCallCount: sql`${heroCareInboxes.dailyAiCallCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(heroCareInboxes.id, inbox.id));

    return {
      content: replyText.trim(),
      aiStatus: 'success',
      aiConfidence: 100,
      usedSnapshotIds,
      usedScriptIds
    };

  } catch (err: any) {
    console.error('[Hero Care] Lỗi gọi AI:', err);
    return {
      content: inbox.defaultReply,
      aiStatus: 'fallback',
      aiConfidence: 0,
      usedSnapshotIds: [],
      usedScriptIds: [],
      handoffReason: `AI_ERROR: ${err.message}`
    };
  }
}

/**
 * DELIVER MESSAGE
 * Gửi tin nhắn phản hồi thật qua cổng kết nối API của inbox
 */
export async function deliverMessage(
  teamId: number,
  inbox: typeof heroCareInboxes.$inferSelect,
  conversation: typeof heroCareConversations.$inferSelect,
  content: string
): Promise<boolean> {
  const connectionId = inbox.connectionId;
  if (!connectionId) {
    console.warn(`[Hero Care] Inbox ${inbox.id} không cấu hình cổng kết nối gửi đi.`);
    return false;
  }

  let actionSlug = 'send_message';
  let input: Record<string, any> = {};

  // Điều khiển định dạng tham số input khớp với từng loại Messaging Connector
  if (inbox.channel === 'pancake') {
    actionSlug = 'send_message';
    const parts = conversation.externalConversationId.split('_');
    const pageId = parts[0] || '';
    const convId = parts[1] || conversation.externalConversationId;
    input = {
      page_id: pageId,
      conversation_id: convId,
      message: content
    };
  } else if (inbox.channel === 'facebook') {
    actionSlug = 'send_message';
    input = {
      conversationId: conversation.externalConversationId,
      message: { text: content }
    };
  } else if (inbox.channel === 'telegram') {
    actionSlug = 'send_message';
    input = {
      chatId: conversation.externalConversationId,
      text: content
    };
  } else if (inbox.channel === 'zalo') {
    actionSlug = 'send_oa_broadcast';
    const [cust] = await db
      .select()
      .from(heroCareCustomers)
      .where(eq(heroCareCustomers.id, conversation.customerId || 0))
      .limit(1);

    input = {
      user_id: cust?.externalCustomerId || conversation.externalConversationId,
      message: content
    };
  } else {
    input = {
      recipientId: conversation.externalConversationId,
      text: content
    };
  }

  try {
    const res = await runConnectorAction({
      teamId,
      connectionId,
      actionSlug,
      input,
      callerModule: 'hero-care'
    });

    if (!res.success) {
      console.error(`[Hero Care] Gửi tin thất bại qua connection ${connectionId}:`, res.error);

      await db.insert(heroCareEvents).values({
        teamId,
        inboxId: inbox.id,
        conversationId: conversation.id,
        eventType: 'message_send_failed',
        payload: { error: res.error, channel: inbox.channel, connectionId },
        processedAt: new Date()
      });

      return false;
    }

    return true;
  } catch (err: any) {
    console.error(`[Hero Care] Exception khi gửi tin:`, err);
    return false;
  }
}

/**
 * PROCESS INBOUND MESSAGE (ORCHESTRATOR)
 * Điều phối luồng tin nhắn inbound từ webhook đến khi phản hồi
 */
export async function processInboundMessage(params: {
  teamId: number;
  inboxId: number;
  externalMessageId: string;
  senderId: string;
  senderName?: string;
  messageText: string;
  attachments?: any[];
  externalConversationId: string;
}): Promise<void> {
  const { teamId, inboxId, externalMessageId, senderId, senderName, messageText, attachments, externalConversationId } = params;

  // 1. Kiểm tra chống trùng lặp tin nhắn (Deduplication)
  const [existingMsg] = await db
    .select()
    .from(heroCareMessages)
    .where(
      and(
        eq(heroCareMessages.teamId, teamId),
        eq(heroCareMessages.inboxId, inboxId),
        eq(heroCareMessages.externalMessageId, externalMessageId)
      )
    )
    .limit(1);

  if (existingMsg) {
    console.log(`[Hero Care] Tránh tin nhắn trùng lặp: ${externalMessageId}`);
    return;
  }

  const [inbox] = await db
    .select()
    .from(heroCareInboxes)
    .where(and(eq(heroCareInboxes.id, inboxId), eq(heroCareInboxes.status, 'active')))
    .limit(1);

  if (!inbox) {
    console.warn(`[Hero Care] Inbox ${inboxId} không tồn tại hoặc đã bị khóa.`);
    return;
  }

  // 2. Cập nhật thông tin khách hàng (Upsert Customer)
  let customer = await db.query.heroCareCustomers.findFirst({
    where: and(
      eq(heroCareCustomers.teamId, teamId),
      eq(heroCareCustomers.externalCustomerId, senderId)
    )
  });

  if (!customer) {
    const [newCust] = await db
      .insert(heroCareCustomers)
      .values({
        teamId,
        externalCustomerId: senderId,
        channel: inbox.channel,
        name: senderName || `Khách hàng ${senderId.slice(-4)}`,
        totalConversations: 1,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    customer = newCust;
  } else {
    customer = (await db
      .update(heroCareCustomers)
      .set({
        name: senderName || customer.name,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(heroCareCustomers.id, customer.id))
      .returning())[0];
  }

  // 3. Cập nhật hội thoại (Upsert Conversation)
  let conversation = await db.query.heroCareConversations.findFirst({
    where: and(
      eq(heroCareConversations.inboxId, inboxId),
      eq(heroCareConversations.externalConversationId, externalConversationId)
    )
  });

  if (!conversation) {
    const [newConv] = await db
      .insert(heroCareConversations)
      .values({
        teamId,
        inboxId,
        externalConversationId,
        customerId: customer.id,
        chatMode: 'hybrid', // Mặc định hybrid: gợi ý nháp để kiểm duyệt
        status: 'active',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    conversation = newConv;

    await db
      .update(heroCareCustomers)
      .set({
        totalConversations: sql`${heroCareCustomers.totalConversations} + 1`
      })
      .where(eq(heroCareCustomers.id, customer.id));
  } else {
    conversation = (await db
      .update(heroCareConversations)
      .set({
        lastMessageAt: new Date(),
        status: 'active', // Mở lại hội thoại nếu đang đóng
        updatedAt: new Date()
      })
      .where(eq(heroCareConversations.id, conversation.id))
      .returning())[0];
  }

  // 4. Lưu tin nhắn inbound của khách
  await db
    .insert(heroCareMessages)
    .values({
      teamId,
      inboxId,
      conversationId: conversation.id,
      externalMessageId,
      senderId,
      senderName: senderName || customer.name,
      direction: 'inbound',
      messageType: 'text',
      content: messageText,
      attachments: attachments ? JSON.stringify(attachments) : '[]',
      createdAt: new Date()
    });

  // Tăng message count của inbox
  await db
    .update(heroCareInboxes)
    .set({
      dailyMessageCount: sql`${heroCareInboxes.dailyMessageCount} + 1`,
      updatedAt: new Date()
    })
    .where(eq(heroCareInboxes.id, inbox.id));

  // 5. Kiểm tra chế độ chat. Nếu nhân viên đang Chat tay -> Bỏ qua AI.
  if (conversation.chatMode === 'manual') {
    console.log(`[Hero Care] Cuộc hội thoại ${conversation.id} đang ở chế độ gõ tay.`);
    return;
  }

  // 6. Chạy kịch bản đối khớp & Gọi AI phản hồi
  const matchedScript = await matchScript(teamId, inboxId, messageText);
  const aiReply = await buildAIReply({
    teamId,
    inbox,
    conversation,
    customer,
    messageText,
    matchedScript
  });

  // 7. Xử lý kết quả theo từng chế độ chat
  if (conversation.chatMode === 'auto') {
    // Chế độ tự động hoàn toàn: Lưu tin nhắn và phát đi ngay lập tức
    const [outboundMsg] = await db
      .insert(heroCareMessages)
      .values({
        teamId,
        inboxId,
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiReply.content,
        aiStatus: aiReply.aiStatus,
        aiConfidence: aiReply.aiConfidence,
        usedSnapshotIds: JSON.stringify(aiReply.usedSnapshotIds),
        usedScriptIds: JSON.stringify(aiReply.usedScriptIds),
        handoffReason: aiReply.handoffReason,
        createdAt: new Date()
      })
      .returning();

    const delivered = await deliverMessage(teamId, inbox, conversation, aiReply.content);

    await db.insert(heroCareEvents).values({
      teamId,
      inboxId,
      conversationId: conversation.id,
      eventType: 'message_sent',
      payload: { messageId: outboundMsg.id, method: 'auto_reply', delivered },
      processedAt: new Date()
    });

    await db
      .update(heroCareConversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(heroCareConversations.id, conversation.id));

  } else if (conversation.chatMode === 'hybrid') {
    // Chế độ Hybrid: Tạo tin nhắn nháp (Draft) chờ nhân viên phê duyệt
    const [draftMsg] = await db
      .insert(heroCareMessages)
      .values({
        teamId,
        inboxId,
        conversationId: conversation.id,
        direction: 'outbound',
        content: aiReply.content,
        draftContent: aiReply.content,
        draftStatus: 'pending',
        aiStatus: aiReply.aiStatus,
        aiConfidence: aiReply.aiConfidence,
        usedSnapshotIds: JSON.stringify(aiReply.usedSnapshotIds),
        usedScriptIds: JSON.stringify(aiReply.usedScriptIds),
        handoffReason: aiReply.handoffReason,
        createdAt: new Date()
      })
      .returning();

    await db.insert(heroCareEvents).values({
      teamId,
      inboxId,
      conversationId: conversation.id,
      eventType: 'draft_created',
      payload: { messageId: draftMsg.id },
      processedAt: new Date()
    });
  }
}

/**
 * PARSE WEBHOOK PAYLOAD
 * Chuẩn hóa các định dạng dữ liệu webhook từ các nguồn khác nhau thành cấu trúc chung
 */
export function parseWebhookPayload(
  channel: string,
  rawPayload: any
): {
  externalMessageId: string;
  senderId: string;
  senderName?: string;
  messageText: string;
  attachments?: any[];
  externalConversationId: string;
} | null {
  try {
    if (channel === 'pancake') {
      const message = rawPayload.data?.message;
      if (!message) return null;

      const sender = rawPayload.data?.sender;
      const pageId = rawPayload.data?.page_id || rawPayload.data?.page?.id || '';
      const convId = rawPayload.data?.conversation_id || '';
      const extConvId = (pageId && convId) ? `${pageId}_${convId}` : (convId || `pk-conv-${Date.now()}`);

      return {
        externalMessageId: message.id || `pk-${Date.now()}`,
        senderId: sender?.id || `pk-user-${Date.now()}`,
        senderName: sender?.name,
        messageText: message.text || '',
        attachments: message.attachments || [],
        externalConversationId: extConvId
      };
    }

    if (channel === 'facebook') {
      const entry = rawPayload.entry?.[0];
      const messaging = entry?.messaging?.[0];
      if (!messaging || !messaging.message) return null;

      // Bỏ qua echo (tin nhắn do chính bot/page gửi đi)
      if (messaging.message.is_echo) {
        return null;
      }

      const senderId = messaging.sender?.id || `fb-user-${Date.now()}`;
      return {
        externalMessageId: messaging.message.mid || `fb-${Date.now()}`,
        senderId: senderId,
        messageText: messaging.message.text || '',
        attachments: messaging.message.attachments || [],
        externalConversationId: `t_${senderId}`
      };
    }

    if (channel === 'telegram') {
      const message = rawPayload.message;
      if (!message) return null;

      if (message.from?.is_bot) {
        return null;
      }

      const chat = message.chat;
      const from = message.from;
      const senderName = [from?.first_name, from?.last_name].filter(Boolean).join(' ');

      return {
        externalMessageId: String(message.message_id),
        senderId: String(from?.id),
        senderName: senderName || undefined,
        messageText: message.text || '',
        externalConversationId: String(chat?.id)
      };
    }

    if (channel === 'zalo') {
      const message = rawPayload.message;
      if (!message) return null;

      const sender = rawPayload.sender;
      return {
        externalMessageId: message.msg_id || `zalo-${Date.now()}`,
        senderId: sender?.id || `zalo-user-${Date.now()}`,
        messageText: message.text || '',
        attachments: message.attachments || [],
        externalConversationId: sender?.id || `zalo-conv-${Date.now()}`
      };
    }

    return null;
  } catch (err) {
    console.error('[Hero Care] Webhook parse error:', err);
    return null;
  }
}
