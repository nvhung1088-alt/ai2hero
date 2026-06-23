import { db } from '@/lib/db/drizzle';
import { 
  videoProjects, 
  videoNovels, 
  videoScripts, 
  videoMakerAssets, 
  videoStoryboards,
  videoClips,
  videoImages,
  videoTracks
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Các công cụ Database truy cập cho Production Agent System
 */

export async function getProjectContext(projectId: number) {
  const project = await db.query.videoProjects.findFirst({
    where: eq(videoProjects.id, projectId),
  });
  return project;
}

export async function getNovelEvents(projectId: number) {
  const novels = await db.query.videoNovels.findMany({
    where: eq(videoNovels.projectId, projectId),
    orderBy: (novels, { asc }) => [asc(novels.chapterIndex)]
  });
  return novels;
}

export async function getScriptContext(projectId: number) {
  const scripts = await db.query.videoScripts.findMany({
    where: eq(videoScripts.projectId, projectId),
    orderBy: (scripts, { asc }) => [asc(scripts.id)]
  });
  return scripts;
}

export async function getProjectAssets(projectId: number) {
  const assets = await db.query.videoMakerAssets.findMany({
    where: eq(videoMakerAssets.projectId, projectId)
  });
  return assets;
}

export async function getProjectStoryboards(projectId: number) {
  const storyboards = await db.query.videoStoryboards.findMany({
    where: eq(videoStoryboards.projectId, projectId),
    orderBy: (storyboards, { asc }) => [asc(storyboards.index)]
  });
  return storyboards;
}

export async function getProjectTracks(projectId: number) {
  const tracks = await db.query.videoTracks.findMany({
    where: eq(videoTracks.projectId, projectId)
  });
  return tracks;
}

export async function addDeriveAsset(projectId: number, baseAssetId: number, name: string, derivativeMetadata: any) {
  const baseAsset = await db.query.videoMakerAssets.findFirst({
    where: eq(videoMakerAssets.id, baseAssetId)
  });
  
  if (!baseAsset) throw new Error("Base asset not found");

  const [newAsset] = await db.insert(videoMakerAssets).values({
    projectId,
    name,
    type: baseAsset.type,
    describe: baseAsset.describe,
    prompt: baseAsset.prompt, // có thể được tối ưu sau
    assetId: baseAssetId, // reference back to parent
    derivativeMetadata
  }).returning();
  
  return newAsset;
}

export async function addVideoTrack(projectId: number, trackData: any) {
  const [newTrack] = await db.insert(videoTracks).values({
    projectId,
    data: trackData
  }).returning();
  
  return newTrack;
}

export async function syncStoryboardsFromPipeline(projectId: number, panels: any[], prompts: any[], tracks: any[]) {
  // 1. Delete old storyboards
  await db.delete(videoStoryboards).where(eq(videoStoryboards.projectId, projectId));
  
  // 2. Prepare new storyboards
  const storyboardsData = panels.map((panel) => {
    // Tìm prompt tương ứng
    const promptData = prompts.find(p => p.panelIndex === panel.panelIndex);
    // Tìm duration tương ứng từ video tracks
    let duration = 5;
    for (const track of tracks) {
      if (track.type === 'video') {
        const clip = track.clips?.find((c: any) => c.panelIndex === panel.panelIndex);
        if (clip) {
          duration = clip.duration;
          break;
        }
      }
    }
    
    return {
      projectId,
      index: panel.panelIndex,
      videoDesc: panel.action,
      prompt: promptData?.imagePrompt || '', // Dùng imagePrompt trước để UI sinh ảnh
      duration: duration.toString(),
      state: 'done' // Đã hoàn thành khâu text
    };
  });
  
  if (storyboardsData.length > 0) {
    await db.insert(videoStoryboards).values(storyboardsData);
  }
}
