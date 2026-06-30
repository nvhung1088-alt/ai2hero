import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderProjects, downloaderVideos } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { jwtVerify } from 'jose';

const authSecret = process.env.AUTH_SECRET;
const key = new TextEncoder().encode(authSecret);

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      const { payload: verified } = await jwtVerify(token, key);
      payload = verified;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const teamId = payload.teamId as number;
    const body = await request.json();
    const { action } = body;

    if (action === 'scan_complete') {
      const { projectId, videos } = body; // videos = [{url, title, thumbnail, duration, author}]

      // Cập nhật lastScanAt
      await db.update(downloaderProjects)
        .set({ lastScanAt: new Date() })
        .where(and(eq(downloaderProjects.id, projectId), eq(downloaderProjects.teamId, teamId)));

      // Thêm videos mới (bỏ qua nếu đã tồn tại)
      if (videos && videos.length > 0) {
        // Lấy danh sách video url hiện có của project này
        const existingVideos = await db.select({ videoUrl: downloaderVideos.videoUrl })
          .from(downloaderVideos)
          .where(eq(downloaderVideos.projectId, projectId));
        const existingUrls = new Set(existingVideos.map(v => v.videoUrl));

        const newVideos = videos.filter((v: any) => !existingUrls.has(v.url));
        if (newVideos.length > 0) {
          const insertData = newVideos.map((v: any) => ({
            projectId,
            videoUrl: v.url,
            title: v.title || '',
            thumbnailUrl: v.thumbnail || '',
            duration: v.duration || 0,
            author: v.author || '',
            status: 'pending' as const,
          }));
          await db.insert(downloaderVideos).values(insertData);
          
          // Cập nhật totalVideos trong project
          const totalCount = existingVideos.length + newVideos.length;
          await db.update(downloaderProjects)
            .set({ totalVideos: totalCount })
            .where(eq(downloaderProjects.id, projectId));
        }
      }

      return NextResponse.json({ success: true });

    } else if (action === 'update_video') {
      const { videoId, status, progress, localPath, error, speed, sizeBytes, actualSizeBytes } = body;

      // Ensure video belongs to this team
      const [video] = await db.select({ id: downloaderVideos.id, projectId: downloaderVideos.projectId })
        .from(downloaderVideos)
        .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
        .where(and(eq(downloaderVideos.id, videoId), eq(downloaderProjects.teamId, teamId)))
        .limit(1);

      if (!video) {
        return NextResponse.json({ error: 'Video not found or unauthorized' }, { status: 404 });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (progress !== undefined) updateData.progress = progress;
      if (localPath) updateData.localPath = localPath;
      if (error) updateData.error = error;
      if (speed !== undefined) updateData.downloadSpeed = speed; // Lưu tốc độ download
      if (sizeBytes !== undefined) updateData.sizeBytes = sizeBytes;
      if (actualSizeBytes !== undefined) updateData.actualSizeBytes = actualSizeBytes;
      updateData.updatedAt = new Date();

      await db.update(downloaderVideos)
        .set(updateData)
        .where(eq(downloaderVideos.id, videoId));

      // Cập nhật lại số lượng video hoàn thành cho project
      if (status === 'completed') {
        const completedCount = await db.select({ id: downloaderVideos.id })
          .from(downloaderVideos)
          .where(and(eq(downloaderVideos.projectId, video.projectId), eq(downloaderVideos.status, 'completed')));
        
        await db.update(downloaderProjects)
          .set({ downloadedVideos: completedCount.length })
          .where(eq(downloaderProjects.id, video.projectId));
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[API Downloader Worker Update] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
