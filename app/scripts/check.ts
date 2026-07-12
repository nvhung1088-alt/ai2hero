import { db } from '../lib/db/drizzle';
import { downloaderVideos, downloaderProjects } from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  console.log("=== ĐANG KIỂM TRA DATABASE HERO DOWNLOADER ===");
  
  // 1. Lấy danh sách dự án
  const projects = await db.select().from(downloaderProjects);
  console.log(`\nTổng số dự án: ${projects.length}`);
  projects.forEach(p => {
    console.log(`- Project ID ${p.id}: "${p.name}" (${p.platform}) - Trạng thái: ${p.status} - Lần quét cuối: ${p.lastScanAt}`);
  });

  // 2. Lấy tổng số video
  const videos = await db.select().from(downloaderVideos);
  console.log(`\nTổng số video trong DB: ${videos.length}`);

  // 3. Phân tích trùng lặp dựa trên video_url
  const extractId = (url: string) => {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : url;
  };

  const counts = new Map<string, number>();
  const titles = new Map<string, string[]>();

  videos.forEach(v => {
    const vidId = extractId(v.videoUrl);
    counts.set(vidId, (counts.get(vidId) || 0) + 1);
    const existingTitles = titles.get(vidId) || [];
    existingTitles.push(v.title || 'No Title');
    titles.set(vidId, existingTitles);
  });

  const duplicates: Array<{id: string, count: number, titles: string[]}> = [];
  counts.forEach((count, vidId) => {
    if (count > 1) {
      duplicates.push({
        id: vidId,
        count,
        titles: titles.get(vidId) || []
      });
    }
  });

  if (duplicates.length === 0) {
    console.log("\n✅ Không tìm thấy bất kỳ video trùng lặp nào trong Database!");
  } else {
    console.log(`\n❌ CẢNH BÁO: Tìm thấy ${duplicates.length} nhóm video bị trùng lặp:`);
  }

  // 4. In thử 5 video mới nhất
  console.log("\n=== 5 VIDEO MỚI NHẤT TRONG HỆ THỐNG ===");
  const latestVideos = await db.select().from(downloaderVideos).orderBy(sql`${downloaderVideos.createdAt} DESC`).limit(5);
  latestVideos.forEach(v => {
    console.log(`- [ID ${v.id}] ${v.title}`);
    console.log(`  Link: ${v.videoUrl}`);
    console.log(`  Trạng thái: ${v.status} | Tiến độ: ${v.progress}%`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error("Lỗi chạy script:", err);
  process.exit(1);
});
