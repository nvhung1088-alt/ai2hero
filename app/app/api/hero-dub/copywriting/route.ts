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

    // 4. Soạn thảo Prompt chuyên gia SEO Video Đa Thể Loại (Multi-Genre Adaptive Engine)
    const systemPrompt = `[HỆ THỐNG: BẮT BUỘC CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON THUẦN TÚY. KHÔNG CHÀO HỎI, KHÔNG GIẢI THÍCH]

Hãy đóng vai Giám đốc Sáng tạo & Biên tập Nội dung Video Đa Thể Loại chuyên nghiệp (YouTube, TikTok, Facebook Reels) với khả năng thấu hiểu sâu sắc mọi thể loại: Hoạt hình 3D / Anime / Donghua, Phim ngắn / Drama / Tình cảm, Ẩm thực / Nấu ăn, Khoa học / Khám phá, Sinh tồn / Chế tác, Đời sống / Giải trí...

Dưới đây là thông tin video:
- Tiêu đề gốc video: ${cleanTitle}
- Các câu thoại tiêu biểu trong video:
${subsListText}

QUY TẮC BẮT BUỘC TUYỆT ĐỐI (100% TIẾNG VIỆT - CẤM TUYỆT ĐỐI CHỮ TRUNG QUỐC):
1. TỰ ĐỘNG NHẬN DIỆN THỂ LOẠI & BỐI CẢNH CHÍNH XÁC:
   - Nếu là Hoạt hình 3D / Anime / Donghua / Tiên hiệp: Văn phong hào hùng, kịch tính, phong cách huyền ảo / tu chân / dị năng đỉnh cao.
   - Nếu là Phim ngắn / Drama / Đô thị / Tình cảm: Văn phong cuốn cuốn hút, kịch tính, sâu sắc, nhấn mạnh vào mâu thuẫn câu chuyện và cú twist.
   - Nếu là Ẩm thực / Nấu ăn / Đời sống: Văn phong tươi vui, ấm áp, hấp dẫn vị giác và thư giãn.
   - Nếu là Khoa học / Khám phá / Tài liệu: Văn phong logic, gợi mở tò mò, mở rộng tri thức.
   - Nếu là Sinh tồn / Chế tác / Bushcraft: Văn phong mộc mạc, thực tế, tôn vinh kỹ năng và trải nghiệm tự nhiên.
2. "new_title": Đặt Tiêu đề Tiếng Việt cực kỳ cuốn hút, giật tít câu view chuẩn SEO (dưới 65 ký tự, trọn vẹn câu, bám sát nội dung và thể loại video).
3. "description": Viết đoạn mô tả chi tiết, bài bản và lôi cuốn (khoảng 120-200 từ), chia thành 3 đoạn văn rõ ràng:
   - Đoạn 1 (Hook & Bối cảnh): Mở màn lôi cuốn về nhân vật, bối cảnh hoặc tình huống bất ngờ mở đầu video.
   - Đoạn 2 (Diễn biến chi tiết): Tóm tắt các tình tiết hấp dẫn, công đoạn then chốt hoặc cao trào kịch tính nhất của câu chuyện/quá trình.
   - Đoạn 3 (Cảm xúc & CTA): Đọng lại cảm xúc hoặc thông điệp ý nghĩa, kèm lời kêu gọi người xem nhấn Like, Chia sẻ và Đăng ký theo dõi kênh để đón xem những tập tiếp theo.
4. "hashtags": Tạo bộ 8-10 hashtag chuẩn SEO theo đúng thể loại video (bắt đầu bằng dấu #).

CẤU TRÚC JSON MẪU BẮT BUỘC:
{
  "new_title": "Tiêu đề tiếng Việt giật tít chuẩn SEO tại đây",
  "description": "Đoạn 1 mở màn hấp dẫn...\\n\\nĐoạn 2 chi tiết các diễn biến then chốt...\\n\\nĐoạn 3 cảm xúc và lời kêu gọi Like, Đăng ký kênh...",
  "hashtags": "#theloai1 #theloai2 #hashtag3 #phimhay #xuhuong #hot"
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

    let new_title = String(parsedJson.new_title || cleanTitle).trim();
    // Làm sạch chữ Trung Quốc sót lại trong tiêu đề nếu có
    new_title = new_title.replace(/[\u4e00-\u9fff]/g, '').trim();
    // Kiểm tra xem tiêu đề có bị cắt cụt ngủn hoặc vô nghĩa không (ví dụ "Vlog_AI____", "___", ít hơn 6 ký tự chữ)
    const cleanWordChars = new_title.replace(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ\s]/g, '').trim();
    if (!new_title || cleanWordChars.length < 6 || /^(vlog|clip|video)[\s_]*ai[\s_]*$/i.test(new_title) || /^[\s_–-]+$/.test(new_title)) {
      // Dùng câu phụ đề tiếng Việt tiêu biểu đầu tiên nếu có
      const firstValidSub = Array.isArray(sampleSubs) ? sampleSubs.find((s: string) => s && s.trim().length >= 8 && !/[\u4e00-\u9fff]/.test(s)) : null;
      if (firstValidSub) {
        new_title = firstValidSub.trim().slice(0, 60);
      } else {
        const fallbackWord = cleanTitle.replace(/[\u4e00-\u9fff]/g, '').trim();
        new_title = (fallbackWord && fallbackWord.length >= 6) ? fallbackWord : 'Tập Phim Đặc Sắc';
      }
    }

    let description = String(parsedJson.description || '').trim();
    // Làm sạch chữ Trung Quốc sót lại trong description nếu có
    description = description.replace(/[\u4e00-\u9fff]/g, '').trim();
    if (!description || description.length < 30) {
      description = `Chào mừng các bạn đến với video "${new_title}"!\n\nCùng theo dõi những khoảnh khắc hấp dẫn, diễn biến lôi cuốn và những trải nghiệm đặc sắc nhất được thể hiện trọn vẹn trong tập này.\n\n🔔 Đừng quên bấm Like, Chia sẻ và Đăng ký kênh để đón xem những video mới nhất tiếp theo nhé!`;
    }

    let hashtags = String(parsedJson.hashtags || '').trim();
    hashtags = hashtags.replace(/[\u4e00-\u9fff]/g, '').trim();
    if (!hashtags || !hashtags.includes('#')) {
      hashtags = '#reviewphim #xuhuong #phimhay #tomtatphim #video #hot';
    }

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
