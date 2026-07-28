import { db } from '../lib/db/drizzle';
import { filmEpisodes, filmSeries } from '../lib/db/schema';
import { count, isNotNull } from 'drizzle-orm';

async function main() {
  const totalSeries = await db.select({ count: count() }).from(filmSeries);
  const totalEps = await db.select({ count: count() }).from(filmEpisodes);
  const epsWithSummary = await db.select({ count: count() }).from(filmEpisodes).where(isNotNull(filmEpisodes.summary));
  const epsWithTimeline = await db.select({ count: count() }).from(filmEpisodes).where(isNotNull(filmEpisodes.timeline));

  console.log('=== KẾT QUẢ KIỂM TRA DATABASE HERO FILM ===');
  console.log('🎬 Tổng số Phim (Series):', totalSeries[0].count);
  console.log('📼 Tổng số Tập Phim (Episodes):', totalEps[0].count);
  console.log('✅ Số tập ĐÃ CÓ Tóm tắt (Summary):', epsWithSummary[0].count);
  console.log('❌ Số tập CHƯA CÓ Tóm tắt:', totalEps[0].count - epsWithSummary[0].count);
  console.log('✅ Số tập ĐÃ CÓ Mốc thời gian (Timeline):', epsWithTimeline[0].count);
  console.log('❌ Số tập CHƯA CÓ Mốc thời gian (Timeline):', totalEps[0].count - epsWithTimeline[0].count);
}

main().catch(console.error);
