import { db } from '../lib/db/drizzle';
import { filmEpisodes, filmSeries } from '../lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production' });

const HeroAiText = {
  TitleOptimizeSystem: `Bạn là trợ lý AI biên tập phim ngắn dọc chuyên nghiệp. Tôi sẽ gửi cho bạn thông tin video gồm tiêu đề gốc.
Hãy giúp tôi:
1. Tối ưu lại tiêu đề ngắn gọn, kịch tính, chuẩn phim ngắn dọc, bỏ các từ rác (như HD, Full, Vietsub).
2. Viết đoạn Tóm tắt nội dung kịch tính 2-3 câu lôi cuốn người xem.
3. Tạo mảng Timeline các mốc thời gian diễn biến chính trong video (VD: [{"time": "00:00", "label": "Mở đầu..."}, {"time": "01:30", "label": "Biến cố..."}]).

Trả về DUY NHẤT định dạng JSON:
{
  "title": "Tiêu đề kịch tính mới",
  "description": "Đoạn tóm tắt nội dung lôi cuốn 2-3 câu...",
  "timeline": [
    { "time": "00:00", "label": "Mô tả mốc 1" },
    { "time": "01:30", "label": "Mô tả mốc 2" }
  ]
}`
};

async function backfill() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ Không tìm thấy GEMINI_API_KEY trong file environment!');
    return;
  }

  // Lấy các tập phim chưa có Timeline
  const eps = await db.select({
    id: filmEpisodes.id,
    title: filmEpisodes.title,
    videoUrl: filmEpisodes.videoUrl,
    seriesId: filmEpisodes.seriesId
  })
  .from(filmEpisodes)
  .where(or(isNull(filmEpisodes.timeline), isNull(filmEpisodes.summary)))
  .limit(20); // Xử lý từng đợt 20 tập

  console.log(`🚀 Tìm thấy ${eps.length} tập phim cần bổ sung AI Summary & Timeline...`);

  for (let i = 0; i < eps.length; i++) {
    const ep = eps[i];
    console.log(`[${i + 1}/${eps.length}] Đang xử lý Tập ID ${ep.id}: ${ep.title}...`);

    try {
      // Lấy thông tin Series mẹ
      const series = await db.query.filmSeries.findFirst({
        where: eq(filmSeries.id, ep.seriesId)
      });
      const titleToUse = series?.title || ep.title || 'Phim ngắn';

      const prompt = `${HeroAiText.TitleOptimizeSystem}\n\nTiêu đề gốc: ${titleToUse}`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' }
        })
      });

      const aiData = await res.json();
      const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const rawText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawText);

      const summary = parsed.description || `Bộ phim kịch tính: ${titleToUse}. Cùng xem ngay!`;
      const timeline = Array.isArray(parsed.timeline) ? parsed.timeline : [
        { time: '00:00', label: 'Mở đầu bộ phim' },
        { time: '01:00', label: 'Diễn biến hấp dẫn' }
      ];

      await db.update(filmEpisodes)
        .set({ summary, timeline })
        .where(eq(filmEpisodes.id, ep.id));

      console.log(`  └─ ✅ Đã tạo Summary & ${timeline.length} mốc Timeline!`);
    } catch (err: any) {
      console.error(`  └─ ❌ Lỗi AI cho tập ID ${ep.id}:`, err.message);
    }
  }

  console.log('🎉 Hoàn thành đợt bổ sung AI cho 20 tập phim!');
}

backfill().catch(console.error);
