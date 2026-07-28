import { db } from '../lib/db/drizzle';
import { filmEpisodes, filmSeries } from '../lib/db/schema';
import { count, isNotNull } from 'drizzle-orm';

async function check() {
  const totalSeries = await db.select({ count: count() }).from(filmSeries);
  const totalEps = await db.select({ count: count() }).from(filmEpisodes);
  const epsWithSummary = await db.select({ count: count() }).from(filmEpisodes).where(isNotNull(filmEpisodes.summary));
  const epsWithTimeline = await db.select({ count: count() }).from(filmEpisodes).where(isNotNull(filmEpisodes.timeline));

  const allEps = await db.select({
    id: filmEpisodes.id,
    epNum: filmEpisodes.episodeNumber,
    title: filmEpisodes.title,
    summary: filmEpisodes.summary,
    timeline: filmEpisodes.timeline,
    seriesId: filmEpisodes.seriesId
  }).from(filmEpisodes);

  console.log('=== THỐNG KÊ HERO FILM DATABASE ===');
  console.log('Tổng số Bộ Phim (Series):', totalSeries[0].count);
  console.log('Tổng số Tập Phim (Episodes):', totalEps[0].count);
  console.log('Số tập đã có Tóm tắt (Summary):', epsWithSummary[0].count);
  console.log('Số tập đã có Mốc thời gian (Timeline):', epsWithTimeline[0].count);
  console.log('\n--- CHI TIẾT TỪNG TẬP ---');
  allEps.forEach(ep => {
    const timelineCount = Array.isArray(ep.timeline) ? ep.timeline.length : 0;
    console.log(`Tập ID ${ep.id} (Series ${ep.seriesId}): ${ep.title} | Summary: ${ep.summary ? '✅ Có' : '❌ Thiếu'} | Timeline: ${ep.timeline ? `✅ Có (${timelineCount} mốc)` : '❌ Thiếu'}`);
  });
}

check().catch(console.error);
