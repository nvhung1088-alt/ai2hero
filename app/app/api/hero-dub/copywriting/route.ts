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

    const STOP_WORDS = new Set(['vlog', 'clip', 'video', 'ai', 'mp4', 'full', 'hd', 'hot', 'part', 'tap', 'phim', 'short', 'shorts', 'ep', 'episode', 'goc', 'raw', 'douyin', 'tiktok', 'task', 'thuyet', 'minh']);
    const isMeaningful = (t: string | null | undefined): boolean => {
      if (!t) return false;
      const str = String(t).trim();
      if (/[\u4e00-\u9fff]/.test(str)) return false;
      const clean = str.replace(/^\d+[\s_–-]+/, '')
        .replace(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ\s]/g, ' ')
        .trim();
      const words = clean.split(/\s+/).map(w => w.toLowerCase()).filter(w => !/^\d+$/.test(w));
      if (words.length === 0) return false;
      const meaningfulWords = words.filter(w => !STOP_WORDS.has(w));
      if (meaningfulWords.length < 2) return false;
      const meaningfulLen = meaningfulWords.reduce((acc, w) => acc + w.length, 0);
      return meaningfulLen >= 6;
    };

    // 6. Nhận diện thể loại video và xây dựng mô tả giàu chi tiết
    const detectedGenre = detectVideoGenre(cleanTitle, cleanTitle, Array.isArray(sampleSubs) ? sampleSubs : []);

    let new_title = String(parsedJson.new_title || parsedJson.title || '').trim();
    if (!isMeaningful(new_title)) {
      const firstValidSub = Array.isArray(sampleSubs)
        ? sampleSubs.find((s: string) => isMeaningful(s))
        : null;
      if (firstValidSub) {
        new_title = firstValidSub.trim().slice(0, 60);
      } else {
        new_title = 'Tập Phim Đời Sống Đặc Sắc';
      }
    }

    // Đọc linh hoạt mọi biến thể key của description
    let description = String(
      parsedJson.description ||
      parsedJson.desc ||
      parsedJson.summary ||
      parsedJson.content ||
      parsedJson.mota ||
      parsedJson.mo_ta ||
      parsedJson.noidung ||
      ''
    ).trim();
    description = description.replace(/[\u4e00-\u9fff]/g, '').trim();

    // Nếu DeepSeek không trả về description hoặc trả về quá ngắn (< 100 từ) hoặc sáo rỗng -> Tự động tạo bài mô tả 3 đoạn chi tiết bám sát phụ đề
    const isGenericDesc = description.includes('khoảnh khắc hấp dẫn, diễn biến lôi cuốn và những trải nghiệm đặc sắc');
    if (!description || description.length < 120 || isGenericDesc) {
      description = buildRichDescription(new_title, cleanTitle, Array.isArray(sampleSubs) ? sampleSubs : []);
    }

    // Đọc linh hoạt mọi biến thể key của hashtags
    let hashtags = String(
      parsedJson.hashtags ||
      parsedJson.tags ||
      parsedJson.tag ||
      parsedJson.hash_tags ||
      parsedJson.keywords ||
      ''
    ).trim();
    hashtags = hashtags.replace(/[\u4e00-\u9fff]/g, '').trim();
    if (!hashtags || !hashtags.includes('#')) {
      hashtags = getDefaultHashtags(detectedGenre);
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

function detectVideoGenre(title: string, rawTitle: string, subs: string[]): string {
  const fullText = `${title} ${rawTitle} ${subs.join(' ')}`.toLowerCase();
  
  if (['小猪', '菜花小猪', '萌宠', '可爱', '宠物', 'heo', 'pig', 'chú heo', 'súp lơ', 'bông cải', 'thú cưng', 'pet', 'búp bê', 'tiểu trư'].some(k => fullText.includes(k))) {
    return 'pet_animation';
  }
  if (['anime', '3d', 'donghua', 'hoạt hình', 'tu tiên', 'tu chân', 'đấu la', 'thôn phệ', 'huyền huyễn', 'tiên hiệp', 'võ hiệp', 'kiếm hiệp', '动漫', '动画', '修仙', '玄幻'].some(k => fullText.includes(k))) {
    return 'anime_donghua';
  }
  if (['ẩm thực', 'món ăn', 'nấu ăn', 'món ngon', 'nướng', 'mukbang', 'cooking', 'food', '美食', '做饭', '吃播'].some(k => fullText.includes(k))) {
    return 'food_cooking';
  }
  if (['sinh tồn', 'hoang dã', 'chế tác', 'nơi trú ẩn', 'nhà gỗ', 'hang đá', 'bushcraft', 'survival', '荒野', '求生', '庇护所', '木屋'].some(k => fullText.includes(k))) {
    return 'survival_bushcraft';
  }
  if (['khoa học', 'khám phá', 'vũ trụ', 'bí ẩn', 'tại sao', 'giải mã', 'tri thức', '科普', '科学', '探索'].some(k => fullText.includes(k))) {
    return 'science_discovery';
  }
  if (['phim', 'drama', 'tổng tài', 'hôn nhân', 'mẹ chồng', 'review phim', 'tóm tắt phim', '短剧', '电视剧', '电影', '剧情'].some(k => fullText.includes(k))) {
    return 'movie_drama';
  }
  return 'general_lifestyle';
}

function buildRichDescription(new_title: string, rawTitle: string, sampleSubs: string[] = []): string {
  const genre = detectVideoGenre(new_title, rawTitle, sampleSubs);
  const validSubs = sampleSubs
    .filter(s => s && s.length > 8 && !/[\u4e00-\u9fff]/.test(s))
    .slice(0, 4);
  const quotes = validSubs.length > 0 ? validSubs.map(s => `"${s.trim()}"`).join(', ') : '';

  if (genre === 'pet_animation') {
    const p1 = `Chào mừng các bạn đến với tập phim mới nhất về Chú Heo Bông Súp Lơ siêu đáng yêu: "${new_title}"!\nTheo dõi hành trình phiêu lưu dở khóc dở cười của chú heo nhỏ ngây thơ khi bước ra thế giới xung quanh với biết bao tình huống bất ngờ và ngộ nghĩnh.`;
    const p2 = quotes
      ? `Trong tập này, chú heo đối mặt với muôn vàn khoảnh khắc đáng nhớ cùng những câu thoại ngây ngô khiến người xem bật cười thích thú: ${quotes}. Từng biểu cảm tròn xoe mắt, dáng đi lũn cũn và lòng tốt chân thành của chú heo chắc chắn sẽ làm tan chảy mọi trái tim!`
      : `Trong tập này, chú heo nhỏ trải qua những diễn biến vô cùng hài hước và ấm áp khi tương tác cùng mọi người xung quanh. Từng nét biểu cảm bẽn lẽn, sự nhiệt tình và vụng về đáng yêu mang lại cảm giác xả stress cực kỳ thư giãn cho người xem.`;
    const p3 = `Một tập phim chữa lành (healing) tuyệt vời giúp bạn giải tỏa mọi mệt mỏi sau ngày dài bận rộn.\n\n🔔 Đừng quên bấm LIKE, CHIA SẺ và ĐĂNG KÝ KÊNH để không bỏ lỡ những tập tiếp theo của Chú Heo Bông Súp Lơ nhé!`;
    return `${p1}\n\n${p2}\n\n${p3}`;
  }

  if (genre === 'anime_donghua') {
    const p1 = `Chào mừng các bạn đến với tập phim hoạt hình 3D đỉnh cao: "${new_title}"!\nBước chân vào thế giới huyền ảo đầy mê hoặc với đồ họa sắc nét, những màn giao tranh kịch tính và hành trình đột phá ngoạn mục của các nhân vật chính.`;
    const p2 = quotes
      ? `Diễn biến tập phim được đẩy lên cao trào kịch tính với những tình tiết gay cấn và lời thoại đắt giá: ${quotes}. Những bí mật ẩn giấu dần được khai mở, đưa câu chuyện bước sang một bước ngoặt hoàn toàn mới.`
      : `Diễn biến tập phim mở ra với những màn đối đầu căng thẳng, sự tranh đoạt công pháp và những mưu lược quyết đoán của nhân vật chính khi đứng trước hiểm nguy trùng trùng.`;
    const p3 = `Kỹ xảo 3D mãn nhãn cùng nhịp phim cuốn hút sẽ mang đến trải nghiệm thị giác tuyệt đỉnh.\n\n🔔 Hãy bấm LIKE, CHIA SẺ và ĐĂNG KÝ KÊNH để theo dõi trọn bộ những tập phim bom tấn tiếp theo nhé!`;
    return `${p1}\n\n${p2}\n\n${p3}`;
  }

  if (genre === 'food_cooking') {
    const p1 = `Chào mừng các bạn đến với không gian ẩm thực ấm cúng và hấp dẫn: "${new_title}"!\nCùng khám phá những bí quyết chế biến món ngon độc đáo và cảm nhận trọn vẹn hương vị tinh túy của từng nguyên liệu.`;
    const p2 = quotes
      ? `Tập hôm nay mang đến trải nghiệm vị giác bùng nổ cùng những chia sẻ tận tâm: ${quotes}. Từng công đoạn sơ chế, tẩm ướp đậm đà và canh lửa tỉ mỉ tạo nên món ăn thơm lừng, đẹp mắt và tràn đầy năng lượng.`
      : `Từng công đoạn lựa chọn nguyên liệu tươi ngon, công thức tẩm ướp đặc biệt và kỹ thuật nấu nướng điêu luyện được chia sẻ trọn vẹn, giúp bạn dễ dàng thực hiện thành công ngay tại nhà.`;
    const p3 = `Âm thanh xèo xèo sôi sục trên bếp lửa hòa quyện cùng màu sắc bắt mắt mang lại cảm giác thư thái vô cùng (ASMR Cooking).\n\n🔔 Nhấn LIKE, LƯU LẠI công thức và ĐĂNG KÝ KÊNH để học thêm nhiều món ngon mỗi ngày nhé!`;
    return `${p1}\n\n${p2}\n\n${p3}`;
  }

  if (genre === 'survival_bushcraft') {
    const p1 = `Chào mừng các bạn quay trở lại với hành trình sinh tồn và chế tác nơi hoang dã: "${new_title}"!\nCùng hòa mình vào thiên nhiên đại ngàn, nơi sức mạnh ý chí và đôi bàn tay khéo léo biến những điều mộc mạc thành không gian sống kỳ diệu.`;
    const p2 = quotes
      ? `Quá trình thực hiện đòi hỏi sự kiên trì và kỹ năng sinh tồn đỉnh cao: ${quotes}. Từng thân gỗ, phiến đá tự nhiên được khai phá, đo đạc và lắp ghép tỉ mỉ để tạo nên công trình vững chãi chống chọi mưa gió đại ngàn.`
      : `Từ việc tìm kiếm địa thế lý tưởng, đẵn gỗ, dựng khung chịu lực đến hoàn thiện từng góc nhỏ ấm cúng, tất cả đều được thực hiện hoàn toàn thủ công với kỹ năng sinh tồn điêu luyện.`;
    const p3 = `Âm thanh đẽo gọt mộc mạc hòa cùng tiếng chim rừng xào xạc mang lại cảm giác bình yên, giải tỏa mọi âu lo áp lực.\n\n🔔 Đừng quên bấm LIKE, CHIA SẺ và ĐĂNG KÝ KÊNH để đồng hành cùng chúng mình trong những hành trình tiếp theo!`;
    return `${p1}\n\n${p2}\n\n${p3}`;
  }

  // Mặc định / Phim drama / Đời sống
  const p1 = `Chào mừng các bạn đến với video đặc sắc: "${new_title}"!\nMột câu chuyện lôi cuốn chứa đựng nhiều cung bậc cảm xúc, dẫn dắt người xem qua những diễn biến bất ngờ và sâu sắc.`;
  const p2 = quotes
    ? `Tập phim mang đến những tình huống kịch tính, góc nhìn đa chiều cùng những câu đối thoại ấn tượng: ${quotes}. Từng nút thắt dần được mở ra, phản ánh chân thực những mối quan hệ và suy ngẫm ý nghĩa về cuộc sống.`
    : `Tập phim mang đến những tình huống bất ngờ, sự giằng xé nội tâm và những quyết định then chốt của các nhân vật, đẩy cao trào câu chuyện lên đỉnh điểm.`;
  const p3 = `Hy vọng tập phim sẽ mang lại cho bạn những phút giây lắng đọng và nguồn năng lượng tích cực.\n\n🔔 Hãy nhấn LIKE, BÌNH LUẬN cảm nghĩ của bạn và ĐĂNG KÝ KÊNH để đón xem những tập mới nhất nhé!`;
  return `${p1}\n\n${p2}\n\n${p3}`;
}

function getDefaultHashtags(genre: string): string {
  const mapping: Record<string, string> = {
    pet_animation: '#chuheocon #heobongsouplo #heocon #vloghaihuoc #hoathinh3d #thucung #cute #haihuoc #xuhuong #douyin #giaitri',
    anime_donghua: '#hoathinh3d #donghua #anime #reviewphim #phimhay #xuhuong #tutien #huyenhuyen',
    food_cooking: '#amthuc #monngon #nauan #cooking #food #mukbang #asmr #monanngon #xuhuong',
    survival_bushcraft: '#sinhton #hoangda #ruinho #bushcraft #chetao #asmr #nhago #kynangsinhton',
    science_discovery: '#khoahoc #khampha #bian #vutru #kienthuc #tailieu #thegioidongvat #xuhuong',
    movie_drama: '#phimngan #drama #tomtatphim #reviewphim #phimhay #xuhuong #phimmoi #tinhcam',
    general_lifestyle: '#video #cuocsong #thugian #khampha #xuhuong #hot #giaitri'
  };
  return mapping[genre] || mapping['general_lifestyle'];
}
