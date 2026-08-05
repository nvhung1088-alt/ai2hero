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

    if (!activeModel || !activeModel.includes('|')) {
      return NextResponse.json({ error: 'No connect hub LLM model configured for this task' }, { status: 400 });
    }

    const [appSlug, modelName] = activeModel.split('|');

    // 2. Fetch the corresponding connection
    const [connection] = await db
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

    if (!connection) {
      return NextResponse.json({ error: `Connection for ${appSlug} not found or disconnected` }, { status: 400 });
    }

    // 3. Decrypt credentials
    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    // 4. Call Connect Hub Engine với System Role + User Message
    const inputObj: Record<string, string> = {};
    texts.forEach((t: string, i: number) => { inputObj[i.toString()] = t; });
    const jsonInput = JSON.stringify(inputObj);

    let systemMessage = '';

    if (appSlug === 'browser-ai-bridge') {
      systemMessage = `Bạn là chuyên gia dịch thuật phụ đề phim. 
Hãy dịch các câu tiếng Trung sau sang tiếng Việt một cách mượt mà, thoát ý, chuẩn văn phong phim Tiên Hiệp / Cổ Trang.

QUY TẮC BẮT BUỘC:
1. Trả về đúng định dạng JSON gốc (giữ nguyên các key "0", "1"... và chỉ thay value thành tiếng Việt).
2. KHÔNG giải thích, KHÔNG thêm lời chào, KHÔNG bọc trong markdown code block (\`\`\`json). Chỉ trả về mã JSON thuần túy để máy đọc.`;
    } else {
      systemMessage = `Bạn là một biên dịch viên phụ đề phim điện ảnh chuyên nghiệp. Nhiệm vụ duy nhất của bạn là dịch phụ đề từ tiếng Trung Quốc sang tiếng Việt mượt mà, thoát ý, cô đọng, đúng bối cảnh phim.

QUY TẮC PHONG CÁCH & ĐẠI TỪ XƯƠNG HÔ (BẮT BUỘC):
1. TRAU CHUỐT & CÔ ĐỌNG: 
   - Tuyệt đối KHÔNG dịch thô từ-nối-từ (word-by-word) làm câu bị cứng nhắc hoặc tối nghĩa.
   - Dịch theo văn phong nói tự nhiên, cô đọng, mượt mà chuẩn lồng tiếng phim. Loại bỏ các từ đệm vô nghĩa.

2. QUY TẮC SỬA LỖI ĐỒNG ÂM ASR & XUYÊN KHÔNG (BẮT BUỘC — ÁP DỤNG MỌI THỂ LOẠI & NGÔN NGỮ):
   - Nhận dạng giọng nói ASR thường mắc lỗi nghe nhầm âm (Homophone Errors) - phát âm giống nhau nhưng chữ viết sai nghĩa. Phải thực hiện 3 bước tư duy:
     * Nhận diện Chủ đề: Phân tích toàn bộ đoạn thoại để xác định bối cảnh video (Cổ trang, Tu tiên, Đô thị, Y khoa, Game, Quân sự...).
     * Soi lỗi Âm điệu: Nếu gặp từ/cụm từ vô lý trong ngữ cảnh phim nhưng phát âm tương tự một thuật ngữ chuyên môn đúng chủ đề ➔ Tự động khôi phục về thuật ngữ gốc trước khi dịch (Ví dụ cổ trang: "天父"➔"田赋" Thuế ruộng, "严帖专媚"➔"盐铁专卖" Độc quyền muối sắt, "查马户士"➔"茶马互市" Giao thương Trà Ngựa).
     * Thống nhất Thực thể: Nếu một tên riêng (nhân vật, địa danh) xuất hiện dưới nhiều biến thể phát âm gần giống ➔ Quy tụ về 1 tên duy nhất xuyên suốt toàn bộ video. Không được để cùng 1 nhân vật mà đoạn đầu gọi "Yến Quỳnh", đoạn sau thành "Yến Ngư" hay "Diêm Cung".
   - Nếu là Phim Cổ Trang / Triều Đình: Dùng đại từ cổ phong (Trẫm, Bệ hạ, Thần, Khanh, Bổn vương, Tiên sinh). Tuyệt đối KHÔNG dùng "anh/cô/tôi/bạn".
   - Nếu là Phim Xuyên Không (Hiện đại về Cổ đại):
     * Khi giao tiếp với Vua/Mẫu hậu/Quan lại triều đình ➔ Phải dùng xưng hô triều đình (Bệ hạ, Thần, Tiểu nữ, Khanh).
     * Khi suy nghĩ nội tâm, chửi thầm, hoặc nhắc tới thuật ngữ hiện đại ➔ Giữ nguyên đại từ hiện đại (Tôi, Anh, Hệ thống, KPI, Tài khoản).

3. ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC (2 BƯỚC SUY LUẬN):
   - Trả về duy nhất đối tượng JSON với key (0, 1, 2...) giữ nguyên như input. 
   - Với mỗi key, value phải là một đối tượng chứa 2 trường: "asr_correction" (sửa lỗi đồng âm tiếng Trung nếu có, nếu không lỗi thì giữ nguyên) và "vi_translation" (bản dịch tiếng Việt chuẩn xác).
   - Số lượng key trong output PHẢI BẰNG ĐÚNG số lượng key trong input. KHÔNG ĐƯỢC GỘP HOẶC BỎ BỚT KEY.
   - KHÔNG được thêm bất kỳ giải thích hay markdown nào ngoài đối tượng JSON.

VÍ DỤ:
Input: {"0":"这薄雪红磁壳很难考"}
Output: {"0": {"asr_correction": "这博学鸿词科很难考", "vi_translation": "Khoa thi Bác Học Hồng Từ này rất khó đỗ"}}`;
    }

    if (task.translateContext && task.translateContext.trim()) {
      systemMessage += `\n\nBỐI CẢNH & TỪ ĐIỂN PHIM DO NGƯỜI DÙNG CUNG CẤP (BẮT BUỘC TUÂN THỦ 100%):\n${task.translateContext.trim()}`;
    }

    if (previousContext && Array.isArray(previousContext) && previousContext.length > 0) {
      systemMessage += `\n\n[READ_ONLY_CONTEXT] Dưới đây là 3 câu hội thoại cuối cùng của đoạn trước đó để bạn nắm mạch truyện (TUYỆT ĐỐI KHÔNG DỊCH CHÚNG, CHỈ ĐỌC ĐỂ HIỂU NGỮ CẢNH CHUYỂN TIẾP):\n${previousContext.join('\n')}`;
    }

    const userMessage = `Dịch đối tượng JSON phụ đề sau sang tiếng Việt:\n${jsonInput}`;

    let translatedTexts: string[] = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 4;
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

        if (!cleanOutput.startsWith('{')) {
          const objMatch = cleanOutput.match(/\{[\s\S]*\}/);
          if (objMatch) {
            cleanOutput = objMatch[0];
          }
        }

        const parsed = JSON.parse(cleanOutput);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error("Output is not a valid JSON object");
        }

        const tempTexts: string[] = [];
        for (let i = 0; i < texts.length; i++) {
          const key = i.toString();
          if (parsed[key]) {
            let val = parsed[key];
            if (typeof val === 'object' && val !== null) {
              if (val.vi_translation) {
                val = val.vi_translation;
              } else if (val.message && val.message.content) {
                val = val.message.content;
              }
            }
            tempTexts.push(typeof val === 'string' ? val.trim() : texts[i]);
          } else {
            tempTexts.push('');
          }
        }

        const missingKeysCount = tempTexts.filter(t => t === '').length;
        if (missingKeysCount === 0) {
          translatedTexts = tempTexts;
          console.log(`[API Translate] Attempt ${attempts} SUCCESS! All ${texts.length} keys translated cleanly.`);
          break;
        } else {
          console.warn(`[API Translate] Attempt ${attempts} failed: missing ${missingKeysCount} keys out of ${texts.length}.`);
          lastError = `AI returned incomplete JSON keys (${missingKeysCount} missing)`;
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
