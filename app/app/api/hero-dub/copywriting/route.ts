import { NextRequest, NextResponse } from 'next/server';
import { verifyDubWorkerToken } from '@/lib/db/hero-dub-actions';
import { db } from '@/lib/db/drizzle';
import { dubTasks, connectHubConnections } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { decryptField } from '@/lib/sim-crypto';
import { executeAction } from '@/lib/connect-hub/connectors/engine';

export const maxDuration = 60; // Timeout tối đa 60 giây

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7).trim();
}

/**
 * Trích xuất an toàn JSON từ kết quả trả về của Runner
 */
function extractJsonFromContent(content: any): any {
  if (!content) return null;
  if (typeof content === 'object') return content;
  
  const str = String(content).trim();
  const cleanStr = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleanStr);
  } catch (e) {
    const match = cleanStr.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {}
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Worker Bearer Token' }, { status: 401 });
    }

    const workerAuth = await verifyDubWorkerToken(token);
    if (!workerAuth || !workerAuth.success) {
      return NextResponse.json({ success: false, error: 'Worker Token không hợp lệ hoặc đã hết hạn' }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, sourceTitle, sampleSubs, engine } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'Thiếu taskId' }, { status: 400 });
    }

    // 1. Lấy thông tin task để xác định teamId
    const [task] = await db
      .select()
      .from(dubTasks)
      .where(eq(dubTasks.id, Number(taskId)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ success: false, error: `Không tìm thấy Task #${taskId}` }, { status: 404 });
    }

    const targetTeamId = task.teamId;
    const targetEngine = (engine || task.publishingAiEngine || 'deepseek').toLowerCase();

    // 2. Tìm kết nối DeepSeek trong Connect Hub của Team
    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, targetTeamId),
          eq(connectHubConnections.appSlug, targetEngine === 'deepseek' ? 'deepseek' : targetEngine)
        )
      )
      .limit(1);

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: `Team #${targetTeamId} chưa cấu hình kết nối '${targetEngine}' trong Connect Hub.`
      }, { status: 400 });
    }

    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    // 3. Xây dựng danh sách phụ đề trích dẫn mẫu
    const subsListText = Array.isArray(sampleSubs) && sampleSubs.length > 0
      ? sampleSubs.map((s: string) => `- ${s}`).join('\n')
      : '(Không có phụ đề mẫu)';

    const cleanTitle = (sourceTitle || task.sourceTitle || `video_${taskId}`).trim();

    // 4. Soạn thảo Prompt chuyên gia SEO Video
    const systemPrompt = `[HỆ THỐNG: BẮT BUỘC CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON THUẦN TÚY. KHÔNG CHÀO HỎI, KHÔNG GIẢI THÍCH]

Hãy đóng vai Giám đốc Sáng tạo Nội dung Phim & Video Ngắn (YouTube Shorts / TikTok / Reels / Review Phim). Dưới đây là thông tin video:
- Tiêu đề gốc video: ${cleanTitle}
- Các câu thoại tiêu biểu trong video:
${subsListText}

QUY TẮC BẮT BUỘC:
1. "new_title": Đặt Tiêu đề Tiếng Việt cực kỳ cuốn hút, giật tít câu view, chuẩn SEO (dưới 65 ký tự, trọn vẹn câu, khơi gợi tò mò mạnh mẽ).
   - Nếu video nói về chế tác nơi trú ẩn (hốc cây, nhà đá, nhà gỗ...) phải bám sát chính xác chất liệu, không tự bịa sai thực tế.
2. "description": Viết đoạn mô tả ngắn 3-4 câu tóm tắt tình huống kịch tính, bất ngờ nhất của video để thúc đẩy người xem click và xem hết.
3. "hashtags": Tạo bộ 6-8 hashtag xu hướng (bắt đầu bằng dấu #, ví dụ: #phimngan #reviewphim #tomtatphim #xuhuong #phimhay).

CẤU TRÚC JSON MẪU BẮT BUỘC:
{
  "new_title": "Tiêu đề tiếng Việt giật tít tại đây",
  "description": "Đoạn mô tả ngắn 3-4 câu tại đây...",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3 #xuhuong #phimhay"
}`;

    const jobId = crypto.randomUUID();

    // 5. Thực thi gọi DeepSeek với JSON Object Mode
    const execResult = await executeAction(connection.appSlug, credentials, 'chat_completion', {
      jobId,
      model: 'deepseek-chat',
      teamId: targetTeamId,
      connectionId: connection.id,
      prompt: systemPrompt,
      attachments: [],
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' }
    });

    if (!execResult.success || !execResult.data) {
      return NextResponse.json({
        success: false,
        error: execResult.error || 'DeepSeek không phản hồi kết quả'
      }, { status: 502 });
    }

    // 6. Bóc tách JSON an toàn
    let parsedJson: any = null;
    if (execResult.data?.choices && execResult.data.choices[0]?.message?.content) {
      parsedJson = extractJsonFromContent(execResult.data.choices[0].message.content);
    } else if (execResult.data?.content) {
      parsedJson = extractJsonFromContent(execResult.data.content);
    } else {
      parsedJson = extractJsonFromContent(execResult.data);
    }

    if (!parsedJson || typeof parsedJson !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Không thể phân tích JSON từ DeepSeek',
        raw: execResult.data
      }, { status: 502 });
    }

    const new_title = parsedJson.new_title || cleanTitle;
    const description = parsedJson.description || `Video: ${cleanTitle}. Theo dõi hành trình hấp dẫn!`;
    const hashtags = parsedJson.hashtags || '#reviewphim #xuhuong #phimhay #tomtatphim';

    return NextResponse.json({
      success: true,
      new_title,
      description,
      hashtags
    });
  } catch (error: any) {
    console.error('[API /api/hero-dub/copywriting] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
