import { db } from '../lib/db/drizzle';
import { downloaderProjects, downloaderVideos } from '../lib/db/schema';
import { eq, ilike } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("Tìm dự án...");
    const projects = await db.select().from(downloaderProjects).where(ilike(downloaderProjects.name, '%hay dài%'));
    if (projects.length === 0) return;
    const project = projects[0];

    const localFolder = (project.settings as any)?.localFolder || path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(localFolder)) fs.mkdirSync(localFolder, { recursive: true });

    const videos = await db.select().from(downloaderVideos).where(eq(downloaderVideos.projectId, project.id));

    let updatedCount = 0;
    for (const video of videos) {
        let thumbUrl = video.thumbnailUrl;
        
        // NẾU CHƯA CÓ THUMBNAIL, TỰ ĐỘNG CÀO TỪ TRANG GỐC BILIBILI
        if (!thumbUrl && video.videoUrl && video.videoUrl.includes('bilibili.com')) {
            console.log(`- Video ID ${video.id} bị rỗng Thumbnail. Đang dùng phép thuật tìm lại...`);
            try {
                const resHTML = await fetch(video.videoUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                const html = await resHTML.text();
                // Bilibili thường dùng meta itemprop="image"
                let match = html.match(/<meta\s+itemprop="image"\s+content="([^"]+)"/i);
                if (!match) {
                    match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                }
                if (!match) {
                    match = html.match(/"pic":"([^"]+)"/);
                }
                
                if (match && match[1]) {
                    thumbUrl = match[1].replace(/\\u002F/g, '/');
                    if (thumbUrl.startsWith('//')) thumbUrl = 'https:' + thumbUrl;
                    if (thumbUrl.startsWith('http:')) thumbUrl = thumbUrl.replace('http:', 'https:');
                    
                    // Cập nhật Database
                    await db.update(downloaderVideos)
                            .set({ thumbnailUrl: thumbUrl })
                            .where(eq(downloaderVideos.id, video.id));
                    console.log(`  => Đã vá DB thành công: ${thumbUrl}`);
                    updatedCount++;
                }
            } catch (e: any) {
                console.log(`  ❌ Lỗi khi bóc HTML: ${e.message}`);
            }
        }

        // TẢI ẢNH VỀ ĐĨA CỨNG
        if (thumbUrl) {
            let ext = thumbUrl.split('?')[0].split('.').pop()?.toLowerCase();
            if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) ext = 'jpg';
            const safeTitle = (video.title || 'video').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_');
            const fileName = `${video.id}_${safeTitle}.${ext}`;
            const filePath = path.join(localFolder, fileName);
            
            if (!fs.existsSync(filePath)) {
                try {
                    const res = await fetch(thumbUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://www.bilibili.com/'
                        }
                    });
                    if (res.ok) {
                        const arrayBuffer = await res.arrayBuffer();
                        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
                        console.log(`  ✅ Đã tải ảnh bìa cho ID ${video.id}`);
                    }
                } catch (e) {}
            }
        }
    }
    console.log(`\nĐÃ VÁ LỖI XONG ${updatedCount} VIDEO CŨ (Trang 2, 3...) CỦA DỰ ÁN.`);
}

main().catch(console.error);
