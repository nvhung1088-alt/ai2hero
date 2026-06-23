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
    const { taskId, text, texts: inputTexts } = body;

    let texts = inputTexts;
    if (!texts && text) {
      texts = [text];
    }

    if (!taskId || !texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'taskId and texts (array) are required' }, { status: 400 });
    }

    // 1. Get task to find the LLM model
    const [task] = await db
      .select({ llmModel: dubTasks.llmModel })
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, auth.teamId)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.llmModel || !task.llmModel.includes('|')) {
      return NextResponse.json({ error: 'No connect hub LLM model configured for this task' }, { status: 400 });
    }

    const [appSlug, modelName] = task.llmModel.split('|');

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
    const jsonInput = JSON.stringify(texts);

    const systemMessage = `Bạn là một dịch giả phụ đề phim chuyên nghiệp. Nhiệm vụ duy nhất của bạn là dịch phụ đề từ tiếng Trung Quốc sang tiếng Việt tự nhiên, mượt mà, đúng ngữ cảnh.

QUY TẮC BẮT BUỘC:
1. Bạn LUÔN LUÔN trả về một JSON array gồm các chuỗi tiếng Việt.
2. Số lượng phần tử trong mảng output PHẢI BẰNG ĐÚNG số lượng phần tử input.
3. KHÔNG được thêm giải thích, ghi chú, markdown, hay bất kỳ text nào ngoài mảng JSON.
4. KHÔNG BAO GIỜ trả về tiếng Trung. Mọi output đều phải là tiếng Việt.
5. TỰ ĐỘNG PHÂN TÍCH NGỮ CẢNH: Dựa vào nội dung của toàn bộ mảng đầu vào, hãy tự suy luận đây là thể loại video gì (Khoa học, Giang hồ, Nấu ăn...) để tự động chọn ĐẠI TỪ NHÂN XƯNG (Ví dụ: Chúng tôi/Mày-Tao/Anh-Em) và TỪ LÓNG phù hợp nhất.
6. Giữ nguyên số liệu, tên riêng (phiên âm nếu cần).

VÍ DỤ:
Input: ["我是狼王","我不能输"]
Output: ["Tôi là Sói Vương","Tôi không được thua"]`;

    const userMessage = `Dịch mảng phụ đề sau sang tiếng Việt:\n${jsonInput}`;

    const result = await executeAction(appSlug, credentials, 'chat_completion', {
      model: modelName,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
    });

    if (!result.success || !result.data) {
       console.error('[API Translate] AI Engine Error:', result.error);
       return NextResponse.json({ error: result.error || 'AI request failed' }, { status: 500 });
    }

    // 5. Bóc tách kết quả - dùng hàm đào sâu qua mọi lớp bọc
    const outputText = extractContentFromResult(result.data);
    console.log('[API Translate] Extracted content:', outputText.substring(0, 200));

    // 6. Parse JSON array từ output text
    let translatedTexts: string[] = [];
    try {
      let cleanOutput = outputText.trim();
      
      // Loại bỏ markdown code block nếu có
      cleanOutput = cleanOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      // Nếu vẫn có text thừa bao quanh mảng, dùng regex trích xuất
      if (!cleanOutput.startsWith('[')) {
        const arrayMatch = cleanOutput.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          cleanOutput = arrayMatch[0];
        }
      }
      
      const parsed = JSON.parse(cleanOutput);
      
      if (!Array.isArray(parsed)) {
        throw new Error("Output is not an array");
      }

      // Kiểm tra mỗi phần tử phải là string
      translatedTexts = parsed.map((item: any, idx: number) => {
        if (typeof item === 'string') return item;
        // Nếu AI trả về object thay vì string, cố gắng lấy content
        if (item && typeof item === 'object' && item.message && item.message.content) {
          return item.message.content;
        }
        return texts[idx]; // fallback về text gốc
      });
      
      // Fallback if AI returned wrong size
      if (translatedTexts.length !== texts.length) {
         console.warn("[API Translate] AI returned array of different length. Input:", texts.length, "Output:", translatedTexts.length);
         while (translatedTexts.length < texts.length) {
            translatedTexts.push(texts[translatedTexts.length]);
         }
         translatedTexts = translatedTexts.slice(0, texts.length);
      }
    } catch (e) {
      console.error('[API Translate] Failed to parse JSON array from AI:', outputText.substring(0, 500));
      translatedTexts = texts;
    }

    return NextResponse.json({ success: true, translatedTexts });
  } catch (error: any) {
    console.error('[API Translate] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
