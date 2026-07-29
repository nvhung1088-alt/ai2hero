/**
 * Audit script: Test batchTranslateChannelAiAction trực tiếp
 * Mục đích: Xem tại sao hàm trả về count=0 dù DB có 454 tập chưa dịch
 */
import { db } from '../lib/db/drizzle';
import { filmEpisodes, youtubeSyncChannels } from '../lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function audit(channelId: number, urlTeamId: number) {
  console.log(`\n=== AUDIT batchTranslateChannelAiAction ===`);
  console.log(`Input: channelId=${channelId}, urlTeamId=${urlTeamId}`);

  // Step 1: Kiểm tra API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  console.log(`\n[1] API Key: ${apiKey ? 'CÓ (length=' + apiKey.length + ')' : 'THIẾU ← ĐÂY LÀ LỖI'}`);
  if (apiKey) {
    console.log(`    First 10 chars: ${apiKey.substring(0, 10)}...`);
  }

  // Step 2: Tìm channel record
  const channel = await db.query.youtubeSyncChannels.findFirst({
    where: eq(youtubeSyncChannels.id, channelId)
  });
  console.log(`\n[2] Channel record (id=${channelId}):`, channel ? { 
    id: channel.id, 
    teamId: channel.teamId, 
    channelName: channel.channelName,
    totalSynced: channel.totalSynced,
    totalAiProcessed: channel.totalAiProcessed
  } : 'NOT FOUND ← ĐÂY LÀ LỖI');
  
  if (!channel) return;

  const effectiveTeamId = channel.teamId;
  console.log(`\n[3] effectiveTeamId=${effectiveTeamId} (từ channel.teamId, không dùng urlTeamId=${urlTeamId})`);

  // Step 3: Kiểm tra missingCondition với effectiveTeamId
  const missingCondition = sql`(
    ${filmEpisodes.timeline} IS NULL 
    OR jsonb_typeof(${filmEpisodes.timeline}) != 'array' 
    OR (jsonb_typeof(${filmEpisodes.timeline}) = 'array' AND jsonb_array_length(${filmEpisodes.timeline}) = 0)
  )`;

  const countRes = await db.select({ count: sql<number>`count(*)` })
    .from(filmEpisodes)
    .where(and(eq(filmEpisodes.teamId, effectiveTeamId), missingCondition));
  
  console.log(`\n[4] Count missing episodes (teamId=${effectiveTeamId}): ${countRes[0]?.count}`);

  // Step 4: Thử lấy 3 tập đầu tiên
  const eps = await db.select({
    id: filmEpisodes.id,
    title: filmEpisodes.title,
    seriesId: filmEpisodes.seriesId,
    teamId: filmEpisodes.teamId,
    timeline: filmEpisodes.timeline
  })
  .from(filmEpisodes)
  .where(and(eq(filmEpisodes.teamId, effectiveTeamId), missingCondition))
  .limit(3);

  console.log(`\n[5] Sample 3 missing episodes (query result):`, eps.map(e => ({ 
    id: e.id, teamId: e.teamId, seriesId: e.seriesId, title: e.title?.substring(0, 40), timelineIsNull: e.timeline === null 
  })));

  if (eps.length === 0) {
    console.log(`\n❌ LỖI: Query trả về 0 tập mặc dù có ${countRes[0]?.count} tập`);
  } else {
    console.log(`\n✅ Query đúng! Tìm thấy ${eps.length} tập. Lỗi có thể là ở bước AI call.`);
  }

  // Step 5: Test Gemini API key có hoạt động không
  if (apiKey) {
    console.log(`\n[6] Testing Gemini API...`);
    try {
      const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "OK" in JSON: {"status":"OK"}' }] }],
          generationConfig: { response_mime_type: 'application/json' }
        })
      });
      const data = await testRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`    Gemini response: ${text}`);
      console.log(`    HTTP status: ${testRes.status}`);
      if (!testRes.ok) {
        console.log(`    ❌ Gemini API ERROR:`, JSON.stringify(data).substring(0, 200));
      } else {
        console.log(`    ✅ Gemini API hoạt động bình thường`);
      }
    } catch(e: any) {
      console.log(`    ❌ Gemini fetch EXCEPTION: ${e.message}`);
    }
  }
}

// Chạy audit với channelId=2 (kênh @Zzzphim hoặc CoiTV), urlTeamId mô phỏng từ URL
audit(2, 3).catch(console.error);
