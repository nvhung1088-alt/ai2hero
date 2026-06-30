import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderVideos, downloaderProjects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const videos = data.videos;

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ success: false, error: 'No videos provided' }, { headers: corsHeaders });
    }

    let project = await db.query.downloaderProjects.findFirst({
        where: (projects, { eq }) => eq(projects.platform, 'douyin'),
        orderBy: (projects, { desc }) => [desc(projects.createdAt)]
    });

    if (!project) {
        project = await db.query.downloaderProjects.findFirst();
        if (!project) {
            return NextResponse.json({ success: false, error: 'No project found' }, { headers: corsHeaders });
        }
    }

    let addedCount = 0;
    for (const vid of videos) {
      // Lưu video_id gốc vào author
      await db.insert(downloaderVideos).values({
        projectId: project.id,
        title: vid.title || `Douyin ${vid.video_id}`,
        videoUrl: vid.direct_mp4_url, 
        author: vid.original_url,     
        thumbnailUrl: vid.cover_url || null,
        status: 'pending',
        progress: 0,
      });
      addedCount++;
    }

    const projectCount = await db.query.downloaderVideos.findMany({
        where: (v, { eq }) => eq(v.projectId, project!.id)
    });
      
    await db.update(downloaderProjects)
      .set({ totalVideos: projectCount.length })
      .where(eq(downloaderProjects.id, project.id));

    return NextResponse.json({ success: true, count: addedCount, projectId: project.id }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Extension API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
