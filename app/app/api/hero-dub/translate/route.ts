import { NextResponse } from 'next/server';
import { verifyDubWorkerToken } from '@/lib/db/hero-dub-actions';
import { db } from '@/lib/db/drizzle';
import { dubTasks, connectHubConnections } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { decryptField } from '@/lib/sim-crypto';
import { executeAction } from '@/lib/connect-hub/connectors/engine';

export const maxDuration = 60; // Thoi gian timeout toi da cho Vercel (60 giay)

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

/**
 * Đào sâu qua mọi lớp bọc (Runner -> Engine -> API) để lấy đúng cái "content" text cuối cùng.
 * Cấu trúc có thể là:
 *   { success, data: { id, choices: [{ message: { content } }] } }           ← Trực tiếp
 *   { success, data: { success, data: { id, choices: [{ message }] } } }     ← Bọc 2 lớp
 *   string (JSON stringified)
 */
function extractContentFromResult(resultData: any): string {
  let data = resultData;

  // Unwrap nếu bị bọc thêm 1 lớp { success, data: {...} }
  if (data && typeof data === 'object' && data.data && !data.choices) {
    data = data.data;
  }
  // Unwrap thêm lần nữa nếu vẫn còn bọc
  if (data && typeof data === 'object' && data.data && !data.choices) {
    data = data.data;
  }

  // Nếu data là string, thử parse
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return data; // Nếu không parse được, coi như đây là text thuần
    }
  }

  // Bóc choices[0].message.content (chuẩn OpenAI/DeepSeek format)
  if (data && data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content || '';
  }

  // Nếu data là mảng choices trực tiếp
  if (Array.isArray(data) && data[0] && data[0].message) {
    return data[0].message.content || '';
  }

  // Nếu có trường text
  if (data && data.text) {
    return data.text;
  }

  // Fallback cuối cùng
  return typeof data === 'string' ? data : JSON.stringify(data);
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyDubWorkerToken(token);
  if (!auth.success || !auth.workerId || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, text, texts: inputTexts, previousContext, jobId, fallbackModel } = body;

    let texts = inputTexts;
    if (!texts && text) {
      texts = [text];
    }

    if (!taskId || !texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'taskId and texts (array) are required' }, { status: 400 });
    }

    // 1. Get task to find the LLM model and translation context
    const [task] = await db
      .select({ 
        llmModel: dubTasks.llmModel,
        translateContext: dubTasks.translateContext,
      })
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, auth.teamId)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    let activeModel = fallbackModel || task.llmModel;
    let appSlug = '';
    let modelName = '';
    let connection: any = null;

    if (fallbackModel && fallbackModel.includes('|')) {
      const [fSlug, fModel] = fallbackModel.split('|');
      // 1. Tìm connection tương ứng với fallbackModel (ví dụ: deepseek)
      const [fConn] = await db
        .select()
        .from(connectHubConnections)
        .where(
          and(
            eq(connectHubConnections.teamId, auth.teamId),
            eq(connectHubConnections.appSlug, fSlug),
            eq(connectHubConnections.status, 'connected')
          )
        )
        .limit(1);

      if (fConn) {
        connection = fConn;
        appSlug = fSlug;
        modelName = fModel;
      } else {
        // 2. Nếu không có deepseek, tự động tìm bất kỳ Cloud LLM nào Team đã kết nối (openai, chiasegpu, anthropic, qwen, grok)
        const cloudConns = await db
          .select()
          .from(connectHubConnections)
          .where(
            and(
              eq(connectHubConnections.teamId, auth.teamId),
              eq(connectHubConnections.status, 'connected')
            )
          );

        const candidate = cloudConns.find(c => ['deepseek', 'openai', 'chiasegpu', 'anthropic', 'qwen', 'grok'].includes(c.appSlug));
        if (candidate) {
          connection = candidate;
          appSlug = candidate.appSlug;
          modelName = candidate.appSlug === 'deepseek' ? 'deepseek-chat' : (candidate.appSlug === 'openai' ? 'gpt-4o-mini' : 'default');
        } else {
          return NextResponse.json({ error: 'NO_CLOUD_LLM_CONFIGURED: Không tìm thấy Cloud AI nào kết nối trong Connect Hub' }, { status: 400 });
        }
      }
    } else {
      if (!activeModel || !activeModel.includes('|')) {
        return NextResponse.json({ error: 'No connect hub LLM model configured for this task' }, { status: 400 });
      }

      const [slug, mName] = activeModel.split('|');
      appSlug = slug;
      modelName = mName;

      // Fetch connection chuẩn
      const [conn] = await db
        .select()
        .from(connectHubConnections)
        .where(
          and(
            eq(connectHubConnections.teamId, auth.teamId),
            eq(connectHubConnections.appSlug, appSlug),
            eq(connectHubConnections.status, 'connected')
          )
        )
        .limit(1);

      if (!conn) {
        return NextResponse.json({ error: `Connection for ${appSlug} not found or disconnected` }, { status: 400 });
      }
      connection = conn;
    }

    // 3. Decrypt credentials
    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    // 4. Call Connect Hub Engine với System Role + User Message
    const inputObj: Record<string, string> = {};
    texts.forEach((t: string, i: number) => { inputObj[i.toString()] = t; });
    const jsonInput = JSON.stringify(inputObj, null, 2);

    let systemMessage = `Bạn là một biên dịch viên phụ đề phim và video đa phương tiện chuyên nghiệp (Senior Film & Video Subtitle Translator). 
Nhiệm vụ của bạn là dịch toàn bộ các câu thoại từ tiếng Trung Quốc sang tiếng Việt tự nhiên, thoát ý, cô đọng và chuẩn xác 100% theo đúng bối cảnh video.

QUY TẮC 1: TỰ ĐỘNG PHÁT HIỆN THỂ LOẠI & ÁP DỤNG VĂN PHONG TƯƠNG ỨNG
Hãy phân tích ngữ cảnh, từ vựng và chủ đề của các câu thoại để tự động nhận diện thể loại video và chọn văn phong phù hợp nhất:
1. 🌿 Sinh Tồn Hoang Dã / Chế Tác Thủ Công / Xây Dựng / Thiên Nhiên (Wilderness Survival / Bushcraft / DIY):
   - Văn phong: Mộc mạc, gần gũi, cuốn hút, truyền cảm hứng, chuẩn phong cách thuyết minh / vlog sinh tồn đời thực.
   - Xưng hô: "tôi / mình / anh em / các bạn / chú cún / chú chó...".
   - Thuật ngữ: Nơi trú ẩn, hốc cây, bão tuyết, bão cát, đốn gỗ, bẫy đá, tạo lửa, lò sưởi, săn bắt, chống rét...

2. 🔬 Khoa Học / Khám Phá / Phim Tài Liệu / Công Nghệ (Science / Documentary / Tech):
   - Văn phong: Khách quan, chuẩn xác, hiện đại, logic, nghiêm túc và dễ hiểu.
   - Thuật ngữ: Dịch chuẩn xác các danh từ khoa học, vật lý, sinh học, thiên văn, vũ trụ, kỹ thuật theo từ điển tiếng Việt hiện đại.

3. 🏢 Hiện Đại / Đô Thị / Hài Hước / Đời Sống / Tình Cảm / Drama (Modern / Comedy / Romance):
   - Văn phong: Tự nhiên, đời thường, sinh động, bắt trend, chân thật như ngôn ngữ giao tiếp hàng ngày.
   - Xưng hô: "tôi - bạn / anh - em / sếp - em / mày - tao..." tùy thuộc vào mối quan hệ và hoàn cảnh của nhân vật.

4. ⚔️ Cổ Trang / Tiên Hiệp / Kiếm Hiệp / Triều Đình / Xuyên Không (Historical / Xianxia / Wuxia):
   - Văn phong: Hán Việt cổ phong tao nhã, khí phái, đúng chuẩn phim truyền hình cổ trang.
   - Xưng hô: "Trẫm, Bệ hạ, Thần, Khanh, Huynh, Đệ, Tại hạ, Đạo hữu, Tiên sinh...".

5. 💥 Hành Động / Quân Sự / Trinh Thám / Tội Phạm (Action / Military / Crime):
   - Văn phong: Gãy gọn, dứt khoát, kịch tính, dồn dập, sắc bén.

QUY TẮC 2: TRAU CHUỐT & SỬA LỖI ĐỒNG ÂM ASR
- Dịch theo văn phong nói tự nhiên, cô đọng, mượt mà chuẩn lồng tiếng phim. Tuyệt đối KHÔNG dịch thô word-by-word.
- Tự động phát hiện và khôi phục các lỗi nghe nhầm đồng âm ASR (Homophone Errors) của tiếng Trung trước khi dịch.

QUY TẮC 3: ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC
- BẮT BUỘC trả về duy nhất đối tượng JSON thuần túy (không markdown, không giải thích) dạng key-value.
- Cấu trúc JSON bắt buộc phải có đầy đủ đúng ${texts.length} keys từ "0" đến "${texts.length - 1}":
{
  "0": "câu dịch tiếng Việt của câu 0",
  "1": "câu dịch tiếng Việt của câu 1",
  ...
  "${texts.length - 1}": "câu dịch tiếng Việt của câu cuối cùng"
}
- BẮT BUỘC: Tuyệt đối KHÔNG gộp câu, KHÔNG bỏ sót câu, KHÔNG đánh số lệch thứ tự.
- BẮT BUỘC: 100% giá trị value là chuỗi tiếng Việt dịch thoát ý, tự nhiên, chuẩn lồng tiếng, KHÔNG giữ lại chữ Hán.`;

    if (task.translateContext && task.translateContext.trim()) {
      systemMessage += `\n\nBỐI CẢNH & TỪ ĐIỂN PHIM DO NGƯỜI DÙNG CUNG CẤP (BẮT BUỘC TUÂN THỦ 100%):\n${task.translateContext.trim()}`;
    }

    if (previousContext && Array.isArray(previousContext) && previousContext.length > 0) {
      systemMessage += `\n\n[READ_ONLY_CONTEXT] Dưới đây là 3 câu hội thoại cuối cùng của đoạn trước đó để bạn nắm mạch truyện (TUYỆT ĐỐI KHÔNG DỊCH CHÚNG, CHỈ ĐỌC ĐỂ HIỂU NGỮ CẢNH CHUYỂN TIẾP):\n${previousContext.join('\n')}`;
    }

    const userMessage = `Dịch trọn vẹn đối tượng JSON phụ đề sau sang tiếng Việt (giữ nguyên đầy đủ tất cả ${texts.length} keys từ "0" đến "${texts.length - 1}"):\n${jsonInput}`;

    let translatedTexts: string[] = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 2;
    let lastError: string = '';

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      console.log(`[API Translate] Attempt ${attempts}/${MAX_ATTEMPTS} for task ${taskId}...`);
      
      const result = await executeAction(appSlug, credentials, 'chat_completion', {
        jobId, // Truyền jobId từ worker xuống để không tạo nhiều job mới khi polling
        model: modelName,
        teamId: auth.teamId,
        connectionId: connection.id,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      if (!result.success || !result.data) {
        lastError = result.error || 'AI request failed';
        console.warn(`[API Translate] Attempt ${attempts} AI error: ${lastError}`);
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      // Nếu đang được xử lý trên Extension (chưa có kết quả do tốn thời gian)
      if (result.data?.isPending) {
        return NextResponse.json({ 
          success: true, 
          isPending: true, 
          jobId: result.data.jobId,
          message: 'Đang xử lý trên trình duyệt...'
        });
      }

        const outputText = extractContentFromResult(result.data);
      
      try {
        let cleanOutput = outputText.trim();
        cleanOutput = cleanOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        // --- BỘ BÓC TÁCH ĐA TẦNG DEEPSEEK SIÊU BỀN (MULTI-STRATEGY RESILIENT PARSER) ---
        let candidateTexts: (string | null)[] = new Array(texts.length).fill(null);
        let parsed: any = null;

        // Tầng 1: Thử parse JSON chuẩn hoặc sửa trailing comma
        try {
          parsed = JSON.parse(cleanOutput);
        } catch (jsonErr) {
          const jsonMatch = cleanOutput.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (jsonMatch) {
            try {
              const fixed = jsonMatch[0].replace(/,\s*([\}\]])/g, '$1');
              parsed = JSON.parse(fixed);
            } catch (e2) {
              // Bỏ qua để xuống tầng regex
            }
          }
        }

        // Trường hợp 1A: DeepSeek trả về JSON Array trực tiếp ["câu 0", "câu 1", ...]
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (let i = 0; i < texts.length; i++) {
            if (i < parsed.length) {
              let val = parsed[i];
              if (typeof val === 'object' && val !== null) {
                val = val.vi_translation || val.vi || val.text || val.translation || Object.values(val)[0];
              }
              if (typeof val === 'string' && val.trim().length > 0) {
                candidateTexts[i] = val.trim();
              }
            }
          }
        }
        // Trường hợp 1B: DeepSeek trả về JSON Object key-value
        else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Phát hiện 0-indexed hay 1-indexed
          const has0 = '0' in parsed;
          const has1 = '1' in parsed;
          const hasTotal = texts.length.toString() in parsed;
          const is1Indexed = !has0 && has1 && (hasTotal || !((texts.length - 1).toString() in parsed));

          for (let i = 0; i < texts.length; i++) {
            const key = is1Indexed ? (i + 1).toString() : i.toString();
            let val = parsed[key];
            if (val && typeof val === 'object') {
              val = val.vi_translation || val.vi || val.text || val.translation || (val.message && val.message.content);
            }
            if (typeof val === 'string' && val.trim().length > 0) {
              candidateTexts[i] = val.trim();
            }
          }
          // Nếu sau khi map theo key mà vẫn thiếu, nhưng số lượng values của parsed xấp xỉ texts.length:
          const currentFound = candidateTexts.filter(t => t !== null).length;
          if (currentFound < texts.length * 0.8) {
            const rawVals: string[] = Object.values(parsed)
              .map((v: any) => {
                if (typeof v === 'object' && v !== null) {
                  return (v.vi_translation || v.vi || v.text || v.translation || Object.values(v)[0] || '') as string;
                }
                return typeof v === 'string' ? v : '';
              })
              .filter((v: string) => v && v.trim().length > 0);

            if (rawVals.length >= Math.min(texts.length * 0.7, 4)) {
              for (let i = 0; i < texts.length; i++) {
                if (!candidateTexts[i] && i < rawVals.length) {
                  candidateTexts[i] = rawVals[i].trim();
                }
              }
            }
          }
        }

        // Tầng 2: Regex từng dòng "key": "value" chịu lỗi unescaped quotes
        const validParsedCount = candidateTexts.filter(t => t !== null).length;
        if (validParsedCount < texts.length * 0.7) {
          const kvMap = new Map<number, string>();
          const kvLines = cleanOutput.split('\n');
          for (const line of kvLines) {
            const lineClean = line.trim().replace(/,\s*$/, '').trim();
            const m = lineClean.match(/^["']?(\d+)["']?\s*:\s*["']?(.*?)["']?$/);
            if (m) {
              const idx = parseInt(m[1], 10);
              let val = m[2].trim();
              if (val.startsWith('"') && val.endsWith('"') && val.length > 1) val = val.slice(1, -1);
              else if (val.startsWith("'") && val.endsWith("'") && val.length > 1) val = val.slice(1, -1);
              if (val) kvMap.set(idx, val);
            }
          }

          if (kvMap.size >= Math.min(texts.length * 0.5, 4)) {
            const is1Indexed = !kvMap.has(0) && kvMap.has(1);
            for (let i = 0; i < texts.length; i++) {
              const k = is1Indexed ? i + 1 : i;
              if (kvMap.has(k) && !candidateTexts[i]) {
                candidateTexts[i] = kvMap.get(k)!.trim();
              }
            }
          }
        }

        // Tầng 3: Regex multi-line bóc tách "key": "value"
        if (candidateTexts.filter(t => t !== null).length < texts.length * 0.7) {
          const multiPattern = /["']?(\d+)["']?\s*:\s*["']([\s\S]*?)(?=["']\s*,\s*["']?\d+["']?\s*:|["']?\s*\}|$)/g;
          let match;
          const multiMap = new Map<number, string>();
          while ((match = multiPattern.exec(cleanOutput)) !== null) {
            const idx = parseInt(match[1], 10);
            const val = match[2].trim().replace(/[",\']+$/, '').trim();
            if (val) multiMap.set(idx, val);
          }

          if (multiMap.size >= Math.min(texts.length * 0.5, 4)) {
            const is1Indexed = !multiMap.has(0) && multiMap.has(1);
            for (let i = 0; i < texts.length; i++) {
              const k = is1Indexed ? i + 1 : i;
              if (multiMap.has(k) && !candidateTexts[i]) {
                candidateTexts[i] = multiMap.get(k)!.trim();
              }
            }
          }
        }

        // Tầng 4: Danh sách đánh số kiểu "1. [Text]" hoặc "[0] Text"
        if (candidateTexts.filter(t => t !== null).length < texts.length * 0.7) {
          const numLines = cleanOutput.match(/(?:^|\n)\s*(?:\[?(\d+)\]?[\.\:\-\s]+)(.+)/g);
          if (numLines && numLines.length >= Math.min(texts.length * 0.5, 4)) {
            const numMap = new Map<number, string>();
            for (const nl of numLines) {
              const m = nl.trim().match(/^(?:\[?(\d+)\]?[\.\:\-\s]+)(.+)$/);
              if (m) {
                numMap.set(parseInt(m[1], 10), m[2].trim().replace(/^["']|["']$/g, ''));
              }
            }
            const is1Indexed = !numMap.has(0) && numMap.has(1);
            for (let i = 0; i < texts.length; i++) {
              const k = is1Indexed ? i + 1 : i;
              if (numMap.has(k) && !candidateTexts[i]) {
                candidateTexts[i] = numMap.get(k)!.trim();
              }
            }
          }
        }

        // Tầng 5: Tách theo từng dòng tiếng Việt thuần túy
        if (candidateTexts.filter(t => t !== null).length < texts.length * 0.7) {
          const pureLines = cleanOutput.split('\n')
            .map(l => l.trim().replace(/^[-*•\d\.\:\s]+/, '').trim())
            .filter(l => l.length > 2 && !l.startsWith('{') && !l.startsWith('}') && !l.startsWith('[') && !l.startsWith(']') && !l.includes('```'));
          
          const vietnameseLines = pureLines.filter(l => (l.match(/[\u4e00-\u9fff]/g) || []).length < 2);
          if (vietnameseLines.length >= Math.min(texts.length * 0.6, 4)) {
            for (let i = 0; i < texts.length; i++) {
              if (i < vietnameseLines.length && !candidateTexts[i]) {
                candidateTexts[i] = vietnameseLines[i];
              }
            }
          }
        }

        // Kiểm đếm kết quả
        const missingCount = candidateTexts.filter(t => t === null || t.trim() === '').length;
        if (missingCount === 0) {
          translatedTexts = candidateTexts.map(t => t!);
          console.log(`[API Translate] Attempt ${attempts} SUCCESS! 100% (${texts.length}/${texts.length}) keys parsed flawlessly.`);
          break;
        } else if (missingCount <= Math.max(2, Math.floor(texts.length * 0.35))) {
          // THIẾU MỘT VÀI CÂU: TỰ ĐỘNG CỨU HỘ BẰNG DEEPSEEK MINI-RESCUE (CẤM TRẢ TIẾNG TRUNG)
          console.log(`[API Translate] Thiếu ${missingCount}/${texts.length} câu. Kích hoạt DeepSeek Mini-Rescue...`);
          const missingIndices: number[] = [];
          const missingObj: Record<string, string> = {};
          for (let i = 0; i < texts.length; i++) {
            if (!candidateTexts[i] || candidateTexts[i]!.trim() === '') {
              missingIndices.push(i);
              missingObj[i.toString()] = texts[i];
            }
          }
          
          try {
            const miniRes = await executeAction(appSlug, credentials, 'chat_completion', {
              model: modelName,
              teamId: auth.teamId,
              connectionId: connection.id,
              messages: [
                { role: 'system', content: 'Bạn là chuyên gia dịch phụ đề. Hãy dịch chính xác các câu thoại sau sang tiếng Việt tự nhiên chuẩn lồng tiếng. BẮT BUỘC trả về JSON object với đúng các key đã cho, tuyệt đối không trả tiếng Trung.' },
                { role: 'user', content: JSON.stringify(missingObj, null, 2) }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.2
            });
            if (miniRes.success && miniRes.data) {
              const miniOutput = extractContentFromResult(miniRes.data);
              const miniParsed = JSON.parse(miniOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
              for (const idx of missingIndices) {
                const val = miniParsed[idx.toString()] || miniParsed[idx];
                if (val && typeof val === 'string' && val.trim().length > 0) {
                  candidateTexts[idx] = val.trim();
                }
              }
            }
          } catch (miniErr: any) {
            console.warn(`[API Translate] DeepSeek Mini-Rescue error: ${miniErr.message}`);
          }
          
          // Kiểm tra lại sau mini-rescue
          const stillMissing = candidateTexts.filter(t => t === null || t.trim() === '').length;
          if (stillMissing === 0) {
            translatedTexts = candidateTexts.map(t => t!);
            console.log(`[API Translate] DeepSeek Mini-Rescue 100% cứu hộ thành công!`);
            break;
          } else {
            // Không bao giờ trả tiếng Trung nguyên bản để không kích hoạt Google Translate
            translatedTexts = candidateTexts.map((t, idx) => {
              if (t && t.trim().length > 0) return t.trim();
              if (idx > 0 && candidateTexts[idx - 1]) return candidateTexts[idx - 1]!;
              return '...';
            });
            console.warn(`[API Translate] DeepSeek rescue finalized with ${stillMissing} bridged keys.`);
            break;
          }
        } else {
          lastError = `DeepSeek output incomplete (${texts.length - missingCount}/${texts.length} câu bóc tách được)`;
          console.warn(`[API Translate] Attempt ${attempts} failed: ${lastError}`);
        }
      } catch (e: any) {
        console.warn(`[API Translate] Attempt ${attempts} JSON parse error: ${e.message}`);
        lastError = e.message;
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    if (translatedTexts.length === 0) {
      console.error(`[API Translate] Tất cả ${MAX_ATTEMPTS} lần thử dịch thuật thất bại. Lỗi cuối cùng: ${lastError}`);
      
      let friendlyError = lastError;
      if (lastError.includes('Content Script') || lastError.includes('sendMessage')) {
        friendlyError = 'Không thể kết nối với Content Script trên Tab AI. Vui lòng mở sẵn Tab ChatGPT/Gemini và Reload lại Extension.';
      } else if (lastError.includes('khung nhập liệu') || lastError.includes('input')) {
        friendlyError = 'Không tìm thấy khung nhập liệu trên ChatGPT/Gemini. Vui lòng kiểm tra xem trang web có bị yêu cầu Đăng nhập lại hoặc CAPTCHA không.';
      } else if (lastError.includes('Timeout')) {
        friendlyError = 'AI trên trình duyệt không phản hồi đúng thời gian (Timeout). Vui lòng thử lại hoặc giảm bớt độ dài.';
      }

      return NextResponse.json({ 
        error: `Lỗi Dịch Thuật AI: ${friendlyError}`,
        detail: lastError,
        isBlockError: true 
      }, { status: 500 });
    }

    // VÒNG LẶP AI TỰ HỌC (PHƯƠNG ÁN B): Kích hoạt ngầm không làm chậm response
    const { dictionaryId } = body;
    if (dictionaryId) {
      import('@/lib/db/hero-dub-dictionary-actions').then(({ evaluateAndLearnAction }) => {
        evaluateAndLearnAction(Number(dictionaryId), JSON.stringify(texts), JSON.stringify(translatedTexts))
          .then((res) => {
            if (res?.learnedCount && res.learnedCount > 0) {
              console.log(`[API Translate] AI Flywheel learned ${res.learnedCount} new rules for Dictionary #${dictionaryId}! New Score: ${res.newScore}`);
            }
          })
          .catch(err => console.error('[API Translate] Async learn error:', err));
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, translatedTexts });
  } catch (error: any) {
    console.error('[API Translate] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
