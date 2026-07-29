import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmEpisodes, filmSeries } from "../lib/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";

const HeroAiText = {
  TitleOptimizeSystem: `Bạn là trợ lý AI biên tập phim ngắn chuyên nghiệp. Tôi sẽ gửi cho bạn thông tin video gồm tiêu đề gốc, mô tả và thời lượng.
Hãy giúp tôi:
1. Giữ nguyên tiêu đề gốc của video (chỉ dịch sang tiếng Việt nếu tiêu đề đang ở tiếng nước ngoài, nếu đã là tiếng Việt thì giữ nguyên).
2. Viết đoạn Tóm tắt nội dung kịch tính 2-3 câu lôi cuốn người xem dựa vào mô tả hoặc tiêu đề.
3. Tạo mảng Timeline phân bổ đều thời lượng, chia làm khoảng 10 mốc thời gian diễn biến chính trong video. Dựa vào độ dài thực tế của phim (ví dụ 60 phút hoặc 120 phút) để ước lượng chia khoảng cách mỗi mốc cho hợp lý (VD: phim 120 phút thì mỗi mốc cách nhau khoảng 12 phút), các mốc phải phủ đều từ đầu đến cuối phim.

Trả về DUY NHẤT định dạng JSON:
{
  "title": "Tiêu đề tiếng Việt",
  "description": "Đoạn tóm tắt nội dung lôi cuốn 2-3 câu...",
  "timeline": [
    { "time": "00:00", "label": "Mở đầu..." },
    ... (khoảng 10 mốc rải đều đến hết phim)
  ]
}`
};

async function main() {
  const ep = await db.query.filmEpisodes.findFirst({
    where: isNotNull(filmEpisodes.duration),
    orderBy: [desc(filmEpisodes.duration)]
  });

  if (!ep) {
    console.log("No episode with duration found.");
    return;
  }

  const series = await db.query.filmSeries.findFirst({
    where: eq(filmSeries.id, ep.seriesId)
  });
  
  const titleToUse = series?.title || ep.title || 'Phim ngắn';
  const durationMinutes = ep.duration ? Math.round(ep.duration / 60) : 0;
  const durationInfo = durationMinutes > 0 ? `\nThời lượng video: khoảng ${durationMinutes} phút.` : '';

  const promptSystem = HeroAiText.TitleOptimizeSystem;
  const finalPrompt = `${promptSystem}${durationInfo}\n\nTiêu đề: ${titleToUse}`;
  
  console.log("=== PROMPT ===");
  console.log(finalPrompt);
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.log("No API key");
    return;
  }
  
  console.log("\n=== CALLING AI ===");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: finalPrompt }] }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  });

  if (!res.ok) {
    console.log("Error:", await res.text());
    return;
  }

  const aiData = await res.json();
  const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log("\n=== RESULT ===");
  console.log(text);
  
  process.exit(0);
}

main().catch(console.error);
