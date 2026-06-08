import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import {
  heroCareMessages,
  heroCareScripts,
  heroCareInboxes,
  heroCareEvents,
  connectHubConnections
} from '@/lib/db/schema';
import { and, eq, sql, inArray, desc } from 'drizzle-orm';
import { runConnectorAction } from '@/lib/connect-hub/connector-service';
import crypto from 'crypto';

export const revalidate = 0;

export async function GET(request: Request) {
  // 1. Xác thực CRON_SECRET bảo mật cao
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Learning Cron] Lỗi: Chưa cấu hình CRON_SECRET.');
    return new NextResponse('Internal Server Error: Cron secret configuration missing', { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const expectedAuth = `Bearer ${cronSecret}`;

  try {
    const authBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedAuth);
    
    if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. Quét tin nhắn fallback trong 24h qua
    const fallbackMessages = await db
      .select({
        message: heroCareMessages,
        inbox: heroCareInboxes
      })
      .from(heroCareMessages)
      .innerJoin(heroCareInboxes, eq(heroCareMessages.inboxId, heroCareInboxes.id))
      .where(
        and(
          eq(heroCareMessages.direction, 'inbound'),
          eq(heroCareMessages.aiStatus, 'fallback'),
          sql`${heroCareMessages.createdAt} >= NOW() - INTERVAL '24 hours'`
        )
      )
      .orderBy(desc(heroCareMessages.createdAt));

    if (fallbackMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có tin nhắn fallback nào trong 24h qua cần phân tích.'
      });
    }

    // Nhóm tin nhắn theo inboxId
    const inboxGroups: Record<number, { inbox: typeof heroCareInboxes.$inferSelect; messages: string[] }> = {};
    for (const row of fallbackMessages) {
      const inboxId = row.inbox.id;
      if (!inboxGroups[inboxId]) {
        inboxGroups[inboxId] = {
          inbox: row.inbox,
          messages: []
        };
      }
      // Giới hạn tối đa 30 tin nhắn mỗi inbox để tránh token limit quá dài
      if (inboxGroups[inboxId].messages.length < 30) {
        inboxGroups[inboxId].messages.push(row.message.content);
      }
    }

    const details: any[] = [];
    let totalCreatedScripts = 0;

    // 3. Với mỗi inbox, gọi AI phân tích và sinh FAQ
    for (const [inboxIdStr, group] of Object.entries(inboxGroups)) {
      const inboxId = parseInt(inboxIdStr, 10);
      const { inbox, messages } = group;
      const teamId = inbox.teamId;

      console.log(`[Learning Cron] Đang phân tích ${messages.length} tin nhắn fallback của Inbox #${inboxId} (Team #${teamId})...`);

      // Tìm connection AI thích hợp cho team
      let connectionId = inbox.connectionId;
      if (!connectionId) {
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
        console.warn(`[Learning Cron] Team #${teamId} không có kết nối AI active nào. Bỏ qua.`);
        details.push({
          inboxId,
          status: 'skipped',
          reason: 'No active AI connection found for the team'
        });
        continue;
      }

      const [conn] = await db
        .select()
        .from(connectHubConnections)
        .where(eq(connectHubConnections.id, connectionId))
        .limit(1);

      if (!conn) {
        details.push({
          inboxId,
          status: 'skipped',
          reason: `AI Connection ID #${connectionId} not found`
        });
        continue;
      }

      // Chọn model mặc định theo từng provider
      let defaultModel = 'gpt-4o-mini';
      if (conn.appSlug === 'gemini') defaultModel = 'gemini-2.0-flash';
      else if (conn.appSlug === 'anthropic') defaultModel = 'claude-3-haiku-20240307';
      else if (conn.appSlug === 'deepseek') defaultModel = 'deepseek-chat';
      else if (conn.appSlug === 'grok') defaultModel = 'grok-2-1212';
      else if (conn.appSlug === 'qwen') defaultModel = 'qwen-plus';
      else if (conn.appSlug === 'chiasegpu') defaultModel = 'gpt-3.5-turbo';

      // Xây dựng prompt
      const messagesListText = messages.map((m, idx) => `${idx + 1}. "${m}"`).join('\n');
      const systemPrompt = `Bạn là một chuyên gia AI phân tích hội thoại và thiết kế kịch bản FAQ chăm sóc khách hàng. Nhiệm vụ của bạn là phân tích các tin nhắn fallback (tin nhắn mà AI chưa trả lời được) và tự động sinh ra các kịch bản FAQ mới để bổ sung cho robot nhằm nâng cao tỉ lệ tự động trả lời thành công.`;
      
      const userPrompt = `Dưới đây là danh sách các tin nhắn/câu hỏi từ khách hàng mà trợ lý AI của hòm thư "${inbox.name}" đã không thể tự động trả lời được (bị rơi vào trạng thái fallback):

${messagesListText}

Hãy phân tích các tin nhắn trên, nhóm các tin nhắn có cùng ý định/chủ đề lại với nhau. Với mỗi nhóm ý định phổ biến (chỉ chọn các nhóm có ý nghĩa thực tế cao và có thể trả lời chung được), hãy đề xuất một kịch bản FAQ mới bao gồm:
1) triggerText: Câu hỏi mẫu tiêu biểu đại diện cho nhóm này (ví dụ: "Shop có hỗ trợ đổi trả hàng không?").
2) keywords: Danh sách từ khóa bắt buộc có trong câu hỏi của khách hàng để đối khớp (array of strings, viết chữ thường tiếng Việt có dấu và không dấu, ví dụ: ["đổi trả", "doi tra", "hoàn tiền", "hoan tien"]).
3) intent: Ý định viết thường không dấu một từ (ví dụ: "refund", "pricing", "delivery", "warranty", "promotion").
4) replyText: Nội dung câu trả lời đề xuất (phải lịch sự, chuyên nghiệp, khéo léo).

YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
Bạn PHẢI trả về kết quả duy nhất là một JSON array hợp lệ chứa các kịch bản FAQ đề xuất theo cấu trúc dưới đây. Không thêm bất kỳ văn bản giải thích nào trước hoặc sau JSON block. Không bọc trong markdown code blocks \`\`\`json.
Cấu trúc:
[
  {
    "triggerText": "...",
    "keywords": ["...", "..."],
    "intent": "...",
    "replyText": "..."
  }
]`;

      const aiMessages: any[] = [];
      if (['openai', 'deepseek', 'grok', 'qwen', 'chiasegpu'].includes(conn.appSlug)) {
        aiMessages.push({ role: 'system', content: systemPrompt });
        aiMessages.push({ role: 'user', content: userPrompt });
      } else if (conn.appSlug === 'anthropic') {
        aiMessages.push({ role: 'user', content: userPrompt });
      } else if (conn.appSlug === 'gemini') {
        aiMessages.push({ role: 'user', content: `${systemPrompt}\n\nYêu cầu cụ thể:\n${userPrompt}` });
      }

      try {
        const aiResult = await runConnectorAction({
          teamId,
          connectionId: conn.id,
          actionSlug: 'chat_completion',
          input: {
            model: defaultModel,
            messages: aiMessages,
            temperature: 0.2,
            system: systemPrompt
          },
          callerModule: 'hero-care'
        });

        if (!aiResult.success || !aiResult.data) {
          throw new Error(aiResult.error || 'AI Invocation failed');
        }

        let replyText = '';
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

        if (!replyText.trim()) {
          throw new Error('LLM returned an empty response.');
        }

        // Bóc tách JSON block từ response của AI
        let jsonText = replyText.trim();
        if (jsonText.includes('```json')) {
          jsonText = jsonText.split('```json')[1].split('```')[0].trim();
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.split('```')[1].split('```')[0].trim();
        }

        // Parse JSON
        const proposedScripts = JSON.parse(jsonText);
        if (!Array.isArray(proposedScripts)) {
          throw new Error('AI response is not a JSON array.');
        }

        let createdInThisInbox = 0;

        for (const ps of proposedScripts) {
          // Validate fields
          if (!ps.triggerText || !ps.replyText) continue;

          // Insert pending script into database
          await db.insert(heroCareScripts).values({
            teamId,
            inboxId,
            triggerText: ps.triggerText,
            keywords: ps.keywords || [],
            intent: ps.intent || null,
            replyText: ps.replyText,
            status: 'pending', // Trạng thái pending chờ duyệt
            confidenceThreshold: 70,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          createdInThisInbox++;
          totalCreatedScripts++;
        }

        // Log Event thành công cho inbox
        await db.insert(heroCareEvents).values({
          teamId,
          inboxId,
          eventType: 'learning_completed',
          payload: {
            inboxId,
            fallbackCount: messages.length,
            createdScriptsCount: createdInThisInbox
          },
          processedAt: new Date()
        });

        details.push({
          inboxId,
          status: 'success',
          fallbackCount: messages.length,
          createdScriptsCount: createdInThisInbox
        });

      } catch (err: any) {
        console.error(`[Learning Cron] Lỗi xử lý cho Inbox #${inboxId}:`, err);
        
        // Log Event lỗi cho inbox
        await db.insert(heroCareEvents).values({
          teamId,
          inboxId,
          eventType: 'learning_completed',
          payload: {
            inboxId,
            error: err.message || 'Lỗi xử lý AI hoặc DB'
          },
          processedAt: new Date()
        });

        details.push({
          inboxId,
          status: 'failed',
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalCreatedScripts,
      details
    });

  } catch (error: any) {
    console.error('[Learning Cron] Lỗi runtime:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi hệ thống cron learning' },
      { status: 500 }
    );
  }
}
