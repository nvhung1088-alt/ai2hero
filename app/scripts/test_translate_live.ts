/**
 * Kiểm tra xem dịch có đang chạy thật không
 * - Đếm timeline hiện tại
 * - Thử dịch 1 episode thật sự và xem có update DB không
 */
import { db } from '../lib/db/drizzle';
import { filmEpisodes, youtubeSyncChannels } from '../lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  // 1. Đếm hiện tại
  const now = await db.select({ count: sql<number>`count(*)` }).from(filmEpisodes)
    .where(sql`team_id = 3 AND timeline IS NOT NULL AND jsonb_typeof(timeline) = 'array' AND jsonb_array_length(timeline) > 0`);
  console.log(`[A] Hiện tại đã dịch: ${now[0].count} / 473`);

  // 2. Lấy 1 episode chưa dịch
  const ep = await db.select({ id: filmEpisodes.id, title: filmEpisodes.title, seriesId: filmEpisodes.seriesId })
    .from(filmEpisodes)
    .where(sql`team_id = 3 AND (timeline IS NULL OR jsonb_typeof(timeline) != 'array' OR jsonb_array_length(timeline) = 0)`)
    .limit(1);
  
  if (!ep.length) { console.log('Không còn episode chưa dịch'); return; }
  
  const e = ep[0];
  console.log(`\n[B] Test dịch episode: id=${e.id}, title=${e.title}, seriesId=${e.seriesId}`);

  // 3. Test API call
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  console.log(`[C] API key: ${apiKey ? apiKey.substring(0,15) + '...' : 'THIẾU'}`);

  const prompt = `{"description": "Phim hấp dẫn về tình yêu", "timeline": [{"time": "00:00", "label": "Mở đầu"}, {"time": "02:30", "label": "Biến cố"}]}`;
  
  console.log(`[D] Gọi Gemini API...`);
  const t0 = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Trả về JSON này nguyên vẹn: ${prompt}` }] }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  });
  const elapsed = Date.now() - t0;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log(`    HTTP: ${res.status}, Time: ${elapsed}ms`);
  console.log(`    Response: ${text.substring(0, 100)}`);

  try {
    const parsed = JSON.parse(text.replace(/```json/g,'').replace(/```/g,'').trim());
    const summary = parsed.description || 'Phim hấp dẫn';
    const timeline = parsed.timeline || [{ time: '00:00', label: 'Bắt đầu' }];
    
    // 4. Update vào DB
    console.log(`\n[E] Đang update episode ${e.id} vào DB...`);
    await db.update(filmEpisodes).set({ summary, timeline }).where(eq(filmEpisodes.id, e.id));
    
    // 5. Verify update
    const after = await db.select({ count: sql<number>`count(*)` }).from(filmEpisodes)
      .where(sql`team_id = 3 AND timeline IS NOT NULL AND jsonb_typeof(timeline) = 'array' AND jsonb_array_length(timeline) > 0`);
    console.log(`[F] Sau update: ${after[0].count} / 473 (tăng từ ${now[0].count})`);
    
    if (Number(after[0].count) > Number(now[0].count)) {
      console.log(`✅ THÀNH CÔNG! Dịch + update DB hoạt động bình thường.`);
      console.log(`   Vấn đề có thể là: Hàm server action trên Vercel bị timeout, hoặc vòng lặp bị break sớm.`);
    } else {
      console.log(`❌ THẤT BẠI! Update DB không thành công dù API call OK.`);
    }
  } catch(e: any) {
    console.log(`❌ Parse JSON thất bại: ${e.message}`);
    console.log(`   Raw text: ${text.substring(0, 200)}`);
  }
}

main().catch(console.error);
