import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderVideos, downloaderProjects } from '@/lib/db/schema';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { verifyExtensionToken } from '@/lib/db/extension-actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function getHighResThumbnailUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  // Douyin CDN: Chuyển sang CDN public p3.douyinpic.com, bỏ chữ ký URL và ép template ~tplv-dy-1080p.jpeg để luôn nhận ảnh 1080p Full HD
  if (url.includes('douyinpic.com') || url.includes('byteimg.com')) {
    url = url.replace(/https?:\/\/[^/]+douyinpic\.com/i, 'https://p3.douyinpic.com');
    url = url.split('?')[0];
    if (url.includes('~tplv-')) {
      url = url.replace(/~tplv-[^.]+(?:\.jpeg|\.webp|\.jpg)?/i, '~tplv-dy-1080p.jpeg');
    } else {
      url = url + '~tplv-dy-1080p.jpeg';
    }
    return url;
  }
  // Bilibili CDN: loại bỏ đuôi resizer @... (ví dụ @380w_240h_1c.webp) để lấy ảnh gốc HD
  if (url.includes('hdslb.com')) {
    url = url.replace(/@[^/]+$/, '');
  }
  // YouTube: nâng cấp lên maxresdefault (1080p)
  if (url.includes('i.ytimg.com') || url.includes('youtube.com')) {
    url = url.replace(/\/(hqdefault|mqdefault|sddefault)\.jpg/i, '/maxresdefault.jpg');
  }
  return url;
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Bearer Token' }, { status: 401, headers: corsHeaders });
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Token không hợp lệ' }, { status: 401, headers: corsHeaders });
    }

    const data = await req.json();
    const { videos, teamId, projectId } = data;

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ success: false, error: 'No videos provided' }, { headers: corsHeaders });
    }

    if (!teamId) {
      return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400, headers: corsHeaders });
    }

    const parsedTeamId = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;

    // Security: ensure the request is inserting to the user's authorized workspace
    if (parsedTeamId !== auth.teamId) {
      return NextResponse.json({ success: false, error: 'Access denied to this workspace' }, { status: 403, headers: corsHeaders });
    }

    let project = null;
    if (projectId) {
      const parsedProjectId = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
      project = await db.query.downloaderProjects.findFirst({
          where: (projects, { eq, and }) => and(
              eq(projects.id, parsedProjectId),
              eq(projects.teamId, parsedTeamId)
          )
      });
    }

    const firstVid = videos[0] || {};
    const isBilibili = firstVid.platform === 'bilibili' || (firstVid.video_id && String(firstVid.video_id).startsWith('BV'));
    const targetPlatform = isBilibili ? 'bilibili' : 'douyin';

    if (!project) {
      project = await db.query.downloaderProjects.findFirst({
          where: (projects, { eq, and }) => and(
              eq(projects.platform, targetPlatform),
              eq(projects.teamId, parsedTeamId)
          ),
          orderBy: (projects, { desc }) => [desc(projects.createdAt)]
      });
    }

    if (!project) {
        // Auto-create project for this team
        const [newProject] = await db.insert(downloaderProjects).values({
            teamId: parsedTeamId,
            userId: auth.userId, // Secured: mapped to the real user from JWT
            name: isBilibili ? 'Bilibili Extension Sync' : 'Douyin Extension Sync',
            platform: targetPlatform,
            sourceUrl: isBilibili ? 'https://www.bilibili.com' : 'https://www.douyin.com',
            status: 'active',
        }).returning();

        project = newProject;
        
        if (!project) {
            return NextResponse.json({ success: false, error: 'No project found or created' }, { headers: corsHeaders });
        }
    }

    let addedCount = 0;
    
    // Fetch existing videos to avoid duplicates
    const existingVideos = await db.query.downloaderVideos.findMany({
        where: (v, { eq }) => eq(v.projectId, project!.id),
        columns: { videoUrl: true }
    });
    
    const extractId = (url: string) => {
      let match = url.match(/\/video\/(BV[\w]+|\d+)/i);
      if (match) return match[1];
      match = url.match(/modal_id=(\d+)/);
      if (match) return match[1];
      return null;
    };

    const existingIds = new Set(
      existingVideos
        .map(v => extractId(v.videoUrl))
        .filter(Boolean)
    );

    const videosToInsert = [];
    for (const vid of videos) {
      const id = vid.video_id || extractId(vid.original_url || '');
      const newThumbUrl = getHighResThumbnailUrl(vid.cover || vid.cover_url || vid.thumbnail);
      const vidIsBilibili = vid.platform === 'bilibili' || (id && String(id).startsWith('BV'));
      
      if (id && existingIds.has(id)) {
        // Tự động nâng cấp thumbnail HD cho video cũ nếu link mới sắc nét hơn
        if (newThumbUrl && !newThumbUrl.includes('360p') && !newThumbUrl.includes('323:430')) {
          try {
            await db.update(downloaderVideos)
              .set({ thumbnailUrl: newThumbUrl, ...(vidIsBilibili ? {} : { directMp4Url: vid.direct_mp4_url || undefined }) })
              .where(and(eq(downloaderVideos.projectId, project.id), ilike(downloaderVideos.videoUrl, `%${id}%`)));
          } catch(e) {}
        }
        continue; // Skip duplicate insert
      }
      
      let normalizedPageUrl = vid.original_url || vid.play_addr || '';
      if (!normalizedPageUrl || !normalizedPageUrl.startsWith('http')) {
        normalizedPageUrl = vidIsBilibili 
          ? `https://www.bilibili.com/video/${id}`
          : `https://www.douyin.com/video/${id}`;
      }

      const defaultTitle = vidIsBilibili ? `Bilibili ${id}` : `Douyin ${id}`;

      videosToInsert.push({
        projectId: project.id,
        title: vid.desc || vid.title || defaultTitle,
        videoUrl: normalizedPageUrl, 
        directMp4Url: vidIsBilibili ? null : (vid.direct_mp4_url || null),
        author: vid.author || null,     
        thumbnailUrl: newThumbUrl,
        status: 'pending',
        progress: 0,
      });
      if (id) {
        existingIds.add(id);
      }
      addedCount++;
    }

    if (videosToInsert.length > 0) {
      await db.insert(downloaderVideos).values(videosToInsert);
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
