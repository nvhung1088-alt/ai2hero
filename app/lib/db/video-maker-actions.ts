'use server';

import { db } from '@/lib/db/drizzle';
import { ProductionOrchestrator } from '@/lib/hero-video-maker/production-agent';

import {
  videoProjects,
  videoNovels,
  videoScripts,
  videoMakerAssets,
  videoImages,
  videoStoryboards,
  videoClips,
  videoScriptAssets,
  videoMakerAssets2Storyboards,
  videoArtStyles,
  videoPrompts,
  videoAgentWorkData,
  videoTasks,
  videoTracks,
  connectHubConnections,
  NewVideoProject,
  VideoProject,
  NewVideoNovel,
  VideoNovel,
  NewVideoScript,
  VideoScript,
  NewVideoMakerAsset,
  VideoMakerAsset,
  NewVideoImage,
  VideoImage,
  NewVideoStoryboard,
  VideoStoryboard,
  NewVideoClip,
  VideoClip,
  NewVideoArtStyle,
  VideoArtStyle,
  NewVideoPrompt,
  VideoPrompt,
  NewVideoAgentWorkData,
  VideoAgentWorkData,
  NewVideoTask,
  VideoTask
} from '@/lib/db/schema';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// Import AI Utilities
import { 
  HeroAiText, 
  HeroAiImage, 
  HeroAiVideo,
  HeroAiAudio 
} from '../hero-video-maker/ai-utils';
import { CleanNovel } from '../hero-video-maker/novel-processor';
import { extractAssetsFromScripts } from '../hero-video-maker/asset-extractor';

// ============================================================================
// HELPER VALIDATION
// ============================================================================

async function validateProjectAccess(teamId: number, projectId: number) {
  const user = await getUser();
  if (!user) throw new Error('Không có quyền truy cập. Vui lòng đăng nhập.');

  const [project] = await db
    .select()
    .from(videoProjects)
    .where(
      and(
        eq(videoProjects.id, projectId),
        eq(videoProjects.teamId, teamId),
        eq(videoProjects.userId, user.id)
      )
    )
    .limit(1);

  if (!project) throw new Error('Không tìm thấy dự án hoặc không có quyền truy cập.');
  return { user, project };
}

// ============================================================================
// VIDEO PROJECTS
// ============================================================================

export async function getVideoProjects(teamId: number) {
  const user = await getUser();
  if (!user) throw new Error('Không có quyền truy cập. Vui lòng đăng nhập.');

  return await db.query.videoProjects.findMany({
    where: and(eq(videoProjects.teamId, teamId), eq(videoProjects.userId, user.id)),
    orderBy: [desc(videoProjects.createdAt)],
  });
}

export async function getFinishedVideoProjects(teamId: number) {
  const user = await getUser();
  if (!user) throw new Error('Không có quyền truy cập. Vui lòng đăng nhập.');

  return await db.query.videoProjects.findMany({
    where: and(
      eq(videoProjects.teamId, teamId), 
      eq(videoProjects.userId, user.id),
      eq(videoProjects.status, 'done')
    ),
    orderBy: [desc(videoProjects.createdAt)],
  });
}

export async function getVideoProjectById(teamId: number, projectId: number) {
  try {
    const { project } = await validateProjectAccess(teamId, projectId);
    return project;
  } catch (error) {
    return null;
  }
}

export async function createVideoProject(teamId: number, data: Partial<NewVideoProject>) {
  const user = await getUser();
  if (!user) throw new Error('Không có quyền truy cập. Vui lòng đăng nhập.');

  const [newProject] = await db.insert(videoProjects).values({
    ...data,
    teamId,
    userId: user.id,
    title: data.title || 'Dự án Video mới',
    status: data.status || 'draft',
    scenes: data.scenes || [],
  } as any).returning();

  return newProject;
}

export async function updateVideoProject(teamId: number, projectId: number, data: Partial<VideoProject>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.teamId;
  delete updateData.userId;
  delete updateData.createdAt;

  const [updatedProject] = await db.update(videoProjects).set({
    ...updateData,
    updatedAt: new Date(),
  }).where(
    and(
      eq(videoProjects.id, projectId)
    )
  ).returning();

  return updatedProject;
}

export async function deleteVideoProject(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  // 1. Delete all related data explicitly (Cascade Delete)
  await db.delete(videoTasks).where(eq(videoTasks.projectId, projectId));
  await db.delete(videoAgentWorkData).where(eq(videoAgentWorkData.projectId, projectId));
  await db.delete(videoTracks).where(eq(videoTracks.projectId, projectId));
  await db.delete(videoClips).where(eq(videoClips.projectId, projectId));
  await db.delete(videoStoryboards).where(eq(videoStoryboards.projectId, projectId));
  await db.delete(videoImages).where(eq(videoImages.projectId, projectId));
  await db.delete(videoMakerAssets).where(eq(videoMakerAssets.projectId, projectId));
  await db.delete(videoScripts).where(eq(videoScripts.projectId, projectId));
  await db.delete(videoNovels).where(eq(videoNovels.projectId, projectId));

  // 2. Delete the project itself
  await db.delete(videoProjects).where(
    and(
      eq(videoProjects.id, projectId)
    )
  );
  return { success: true };
}

// ============================================================================
// NOVELS (CHƯƠNG TIỂU THUYẾT)
// ============================================================================

export async function getVideoNovels(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  return await db.select().from(videoNovels).where(
    eq(videoNovels.projectId, projectId)
  ).orderBy(asc(videoNovels.chapterIndex));
}

export async function createVideoNovel(teamId: number, projectId: number, data: Partial<NewVideoNovel>) {
  await validateProjectAccess(teamId, projectId);

  const [newNovel] = await db.insert(videoNovels).values({
    ...data,
    projectId,
  } as NewVideoNovel).returning();

  return newNovel;
}

export async function updateVideoNovel(teamId: number, projectId: number, novelId: number, data: Partial<VideoNovel>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.projectId;
  delete updateData.createdAt;

  const [updatedNovel] = await db.update(videoNovels).set(updateData).where(
    and(
      eq(videoNovels.id, novelId),
      eq(videoNovels.projectId, projectId)
    )
  ).returning();

  return updatedNovel;
}

export async function deleteVideoNovel(teamId: number, projectId: number, novelId: number) {
  await validateProjectAccess(teamId, projectId);

  await db.delete(videoNovels).where(
    and(
      eq(videoNovels.id, novelId),
      eq(videoNovels.projectId, projectId)
    )
  );
  return { success: true };
}

export async function bulkCreateVideoNovels(teamId: number, projectId: number, chapters: Partial<NewVideoNovel>[]) {
  await validateProjectAccess(teamId, projectId);

  const values = chapters.map(ch => ({
    ...ch,
    projectId,
  })) as NewVideoNovel[];

  // Delete existing novels first to overwrite
  await db.delete(videoNovels).where(eq(videoNovels.projectId, projectId));

  return await db.insert(videoNovels).values(values).returning();
}

// ============================================================================
// SCRIPTS (KỊCH BẢN)
// ============================================================================

export async function getVideoScripts(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  return await db.select().from(videoScripts).where(
    eq(videoScripts.projectId, projectId)
  ).orderBy(desc(videoScripts.createdAt));
}

export async function getVideoScriptById(teamId: number, projectId: number, scriptId: number) {
  await validateProjectAccess(teamId, projectId);

  const [script] = await db.select().from(videoScripts).where(
    and(
      eq(videoScripts.id, scriptId),
      eq(videoScripts.projectId, projectId)
    )
  ).limit(1);

  return script || null;
}

export async function createVideoScript(teamId: number, projectId: number, data: Partial<NewVideoScript>) {
  await validateProjectAccess(teamId, projectId);

  const [newScript] = await db.insert(videoScripts).values({
    ...data,
    projectId,
  } as NewVideoScript).returning();

  return newScript;
}

export async function updateVideoScript(teamId: number, projectId: number, scriptId: number, data: Partial<VideoScript>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.projectId;
  delete updateData.createdAt;

  const [updatedScript] = await db.update(videoScripts).set(updateData).where(
    and(
      eq(videoScripts.id, scriptId),
      eq(videoScripts.projectId, projectId)
    )
  ).returning();

  return updatedScript;
}

export async function deleteVideoScript(teamId: number, projectId: number, scriptId: number) {
  await validateProjectAccess(teamId, projectId);

  await db.delete(videoScripts).where(
    and(
      eq(videoScripts.id, scriptId),
      eq(videoScripts.projectId, projectId)
    )
  );
  return { success: true };
}

// ============================================================================
// ASSETS (TÀI SẢN NHÂN VẬT, BỐI CẢNH, ĐẠO CỤ)
// ============================================================================

export async function getVideoAssets(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  return await db.select().from(videoMakerAssets).where(
    eq(videoMakerAssets.projectId, projectId)
  ).orderBy(desc(videoMakerAssets.createdAt));
}

export async function getVideoAssetById(teamId: number, projectId: number, assetId: number) {
  await validateProjectAccess(teamId, projectId);

  const [asset] = await db.select().from(videoMakerAssets).where(
    and(
      eq(videoMakerAssets.id, assetId),
      eq(videoMakerAssets.projectId, projectId)
    )
  ).limit(1);

  return asset || null;
}

export async function createVideoAsset(teamId: number, projectId: number, data: Partial<NewVideoMakerAsset>) {
  await validateProjectAccess(teamId, projectId);

  const [newAsset] = await db.insert(videoMakerAssets).values({
    ...data,
    projectId,
  } as NewVideoMakerAsset).returning();

  return newAsset;
}

export async function updateVideoAsset(teamId: number, projectId: number, assetId: number, data: Partial<VideoMakerAsset>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.projectId;
  delete updateData.createdAt;

  const [updatedAsset] = await db.update(videoMakerAssets).set(updateData).where(
    and(
      eq(videoMakerAssets.id, assetId),
      eq(videoMakerAssets.projectId, projectId)
    )
  ).returning();

  return updatedAsset;
}

export async function deleteVideoAsset(teamId: number, projectId: number, assetId: number) {
  await validateProjectAccess(teamId, projectId);

  await db.delete(videoMakerAssets).where(
    and(
      eq(videoMakerAssets.id, assetId),
      eq(videoMakerAssets.projectId, projectId)
    )
  );
  return { success: true };
}

export async function bulkCreateVideoAssets(teamId: number, projectId: number, assets: Partial<NewVideoMakerAsset>[]) {
  await validateProjectAccess(teamId, projectId);

  const values = assets.map(asset => ({
    ...asset,
    projectId,
  })) as NewVideoMakerAsset[];

  return await db.insert(videoMakerAssets).values(values).returning();
}

// ============================================================================
// IMAGES (ẢNH SINH TỪ AI)
// ============================================================================

export async function getVideoImages(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  return await db.select().from(videoImages).where(
    eq(videoImages.projectId, projectId)
  ).orderBy(desc(videoImages.createdAt));
}

export async function createVideoImage(teamId: number, projectId: number, data: Partial<NewVideoImage>) {
  await validateProjectAccess(teamId, projectId);

  const [newImage] = await db.insert(videoImages).values({
    ...data,
    projectId,
  } as NewVideoImage).returning();

  return newImage;
}

export async function updateVideoImage(teamId: number, projectId: number, imageId: number, data: Partial<VideoImage>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.projectId;
  delete updateData.createdAt;

  const [updatedImage] = await db.update(videoImages).set(updateData).where(
    and(
      eq(videoImages.id, imageId),
      eq(videoImages.projectId, projectId)
    )
  ).returning();

  return updatedImage;
}

export async function deleteVideoImage(teamId: number, projectId: number, imageId: number) {
  await validateProjectAccess(teamId, projectId);

  await db.delete(videoImages).where(
    and(
      eq(videoImages.id, imageId),
      eq(videoImages.projectId, projectId)
    )
  );
  return { success: true };
}

// ============================================================================
// STORYBOARDS (PHÂN CẢNH)
// ============================================================================

export async function getVideoTracks(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);
  return db.query.videoTracks.findMany({
    where: eq(videoTracks.projectId, projectId),
    orderBy: [desc(videoTracks.createdAt)]
  });
}

export async function getVideoStoryboards(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  return await db.select().from(videoStoryboards).where(
    eq(videoStoryboards.projectId, projectId)
  ).orderBy(asc(videoStoryboards.index));
}

export async function createVideoStoryboard(teamId: number, projectId: number, data: Partial<NewVideoStoryboard>) {
  await validateProjectAccess(teamId, projectId);

  const [newStoryboard] = await db.insert(videoStoryboards).values({
    ...data,
    projectId,
  } as NewVideoStoryboard).returning();

  return newStoryboard;
}

export async function updateVideoStoryboard(teamId: number, projectId: number, storyboardId: number, data: Partial<VideoStoryboard>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.projectId;
  delete updateData.createdAt;

  const [updatedStoryboard] = await db.update(videoStoryboards).set(updateData).where(
    and(
      eq(videoStoryboards.id, storyboardId),
      eq(videoStoryboards.projectId, projectId)
    )
  ).returning();

  return updatedStoryboard;
}

export async function deleteVideoStoryboard(teamId: number, projectId: number, storyboardId: number) {
  await validateProjectAccess(teamId, projectId);

  await db.delete(videoStoryboards).where(
    and(
      eq(videoStoryboards.id, storyboardId),
      eq(videoStoryboards.projectId, projectId)
    )
  );
  return { success: true };
}

export async function bulkCreateVideoStoryboards(teamId: number, projectId: number, storyboards: Partial<NewVideoStoryboard>[]) {
  await validateProjectAccess(teamId, projectId);

  const values = storyboards.map(story => ({
    ...story,
    projectId,
  })) as NewVideoStoryboard[];

  // Delete existing storyboards for this project first
  await db.delete(videoStoryboards).where(eq(videoStoryboards.projectId, projectId));

  return await db.insert(videoStoryboards).values(values).returning();
}

// ============================================================================
// VIDEO CLIPS (CLIPS RENDER/GEN)
// ============================================================================

export async function getVideoClips(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  return await db.select().from(videoClips).where(
    eq(videoClips.projectId, projectId)
  ).orderBy(desc(videoClips.createdAt));
}

export async function createVideoClip(teamId: number, projectId: number, data: Partial<NewVideoClip>) {
  await validateProjectAccess(teamId, projectId);

  const [newClip] = await db.insert(videoClips).values({
    ...data,
    projectId,
  } as NewVideoClip).returning();

  return newClip;
}

export async function updateVideoClip(teamId: number, projectId: number, clipId: number, data: Partial<VideoClip>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.projectId;
  delete updateData.createdAt;

  const [updatedClip] = await db.update(videoClips).set(updateData).where(
    and(
      eq(videoClips.id, clipId),
      eq(videoClips.projectId, projectId)
    )
  ).returning();

  return updatedClip;
}

export async function deleteVideoClip(teamId: number, projectId: number, clipId: number) {
  await validateProjectAccess(teamId, projectId);

  await db.delete(videoClips).where(
    and(
      eq(videoClips.id, clipId),
      eq(videoClips.projectId, projectId)
    )
  );
  return { success: true };
}

// ============================================================================
// ART STYLES (PHONG CÁCH NGHỆ THUẬT)
// ============================================================================

export async function getVideoArtStyles() {
  return await db.select().from(videoArtStyles);
}

export async function createVideoArtStyle(data: Partial<NewVideoArtStyle>) {
  const user = await getUser();
  if (!user || user.role !== 'admin') throw new Error('Không có quyền thực hiện.');

  const [newStyle] = await db.insert(videoArtStyles).values(data as NewVideoArtStyle).returning();
  return newStyle;
}

export async function updateVideoArtStyle(artStyleId: number, data: Partial<VideoArtStyle>) {
  const user = await getUser();
  if (!user || user.role !== 'admin') throw new Error('Không có quyền thực hiện.');

  const updateData = { ...data };
  delete updateData.id;

  const [updatedStyle] = await db.update(videoArtStyles).set(updateData).where(
    eq(videoArtStyles.id, artStyleId)
  ).returning();

  return updatedStyle;
}

export async function deleteVideoArtStyle(artStyleId: number) {
  const user = await getUser();
  if (!user || user.role !== 'admin') throw new Error('Không có quyền thực hiện.');

  await db.delete(videoArtStyles).where(eq(videoArtStyles.id, artStyleId));
  return { success: true };
}

export async function generateAudioAction(
  teamId: number,
  projectId: number,
  text: string,
  modelString: string,
  voice: string = 'alloy'
) {
  await validateProjectAccess(teamId, projectId);

  try {
    const aiAudio = new HeroAiAudio(teamId, modelString);
    const result = await aiAudio.run({ text, voice });
    return result;
  } catch (error) {
    console.error('[generateAudioAction] Error:', error);
    throw error;
  }
}

export async function updateVideoTrackAudioAction(
  teamId: number,
  projectId: number,
  trackIdString: string,
  clipIndex: number,
  audioUrl: string
) {
  await validateProjectAccess(teamId, projectId);

  // Lấy track mới nhất của project
  const tracks = await db.query.videoTracks.findMany({
    where: eq(videoTracks.projectId, projectId),
    orderBy: [desc(videoTracks.createdAt)]
  });

  if (!tracks || tracks.length === 0) return { success: false };

  const latestTrackRecord = tracks[0];
  const trackData: any = latestTrackRecord.data;

  if (trackData && trackData.tracks) {
    const targetTrack = trackData.tracks.find((t: any) => t.trackId === trackIdString);
    if (targetTrack && targetTrack.clips && targetTrack.clips[clipIndex]) {
      targetTrack.clips[clipIndex].audioUrl = audioUrl;

      await db.update(videoTracks)
        .set({ data: trackData })
        .where(eq(videoTracks.id, latestTrackRecord.id));
      
      return { success: true };
    }
  }

  return { success: false };
}

// ============================================================================
// VIDEO PROMPTS (PROMPT MẪU)
// ============================================================================

export async function getVideoPrompts() {
  return await db.select().from(videoPrompts);
}

export async function getVideoPromptByType(type: string) {
  const [prompt] = await db.select().from(videoPrompts).where(eq(videoPrompts.type, type)).limit(1);
  return prompt || null;
}

export async function createVideoPrompt(data: Partial<NewVideoPrompt>) {
  const user = await getUser();
  if (!user || user.role !== 'admin') throw new Error('Không có quyền thực hiện.');

  const [newPrompt] = await db.insert(videoPrompts).values(data as NewVideoPrompt).returning();
  return newPrompt;
}

export async function updateVideoPrompt(promptId: number, data: Partial<VideoPrompt>) {
  const user = await getUser();
  if (!user || user.role !== 'admin') throw new Error('Không có quyền thực hiện.');

  const updateData = { ...data };
  delete updateData.id;

  const [updatedPrompt] = await db.update(videoPrompts).set(updateData).where(
    eq(videoPrompts.id, promptId)
  ).returning();

  return updatedPrompt;
}

// ============================================================================
// AGENT WORK DATA
// ============================================================================

export async function getVideoAgentWorkData(teamId: number, projectId: number, key: string) {
  await validateProjectAccess(teamId, projectId);

  const [workData] = await db.select().from(videoAgentWorkData).where(
    and(
      eq(videoAgentWorkData.projectId, projectId),
      eq(videoAgentWorkData.key, key)
    )
  ).limit(1);

  return workData || null;
}

export async function saveVideoAgentWorkData(teamId: number, projectId: number, key: string, dataString: string) {
  await validateProjectAccess(teamId, projectId);

  const existing = await getVideoAgentWorkData(teamId, projectId, key);

  if (existing) {
    const [updated] = await db.update(videoAgentWorkData).set({
      data: dataString,
      updatedAt: new Date(),
    }).where(
      eq(videoAgentWorkData.id, existing.id)
    ).returning();
    return updated;
  } else {
    const [inserted] = await db.insert(videoAgentWorkData).values({
      projectId,
      key,
      data: dataString,
    } as NewVideoAgentWorkData).returning();
    return inserted;
  }
}

// ============================================================================
// VIDEO TASKS (TASKS AI BẤT ĐỒNG BỘ)
// ============================================================================

export async function getVideoTasks(teamId: number, projectId: number) {
  await validateProjectAccess(teamId, projectId);

  return await db.select().from(videoTasks).where(
    eq(videoTasks.projectId, projectId)
  ).orderBy(desc(videoTasks.createdAt));
}

export async function createVideoTask(teamId: number, projectId: number, data: Partial<NewVideoTask>) {
  await validateProjectAccess(teamId, projectId);

  const [newTask] = await db.insert(videoTasks).values({
    ...data,
    projectId,
    state: data.state || 'pending',
  } as NewVideoTask).returning();

  return newTask;
}

export async function updateVideoTask(teamId: number, projectId: number, taskId: number, data: Partial<VideoTask>) {
  await validateProjectAccess(teamId, projectId);

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.projectId;
  delete updateData.createdAt;

  const [updatedTask] = await db.update(videoTasks).set(updateData).where(
    and(
      eq(videoTasks.id, taskId),
      eq(videoTasks.projectId, projectId)
    )
  ).returning();

  return updatedTask;
}

// Helper lấy danh sách model khả dụng của team từ Connect Hub
import { getConnectorBySlug } from '@/lib/connect-hub/connectors/registry';

export async function getAvailableModels(teamId: number) {
  const toonflowModels = [
    {
      modelName: 'mock:mock-text',
      type: 'text',
      label: 'Mock Text Model (Giả lập)'
    },
    {
      modelName: 'mock:mock-image',
      type: 'image',
      label: 'Mock Image Model (Giả lập)'
    },
    {
      modelName: 'mock:mock-video',
      type: 'video',
      label: 'Mock Video Model (Giả lập)'
    }
  ];

  try {
    const connections = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.status, 'connected')
        )
      );

    for (const conn of connections) {
      const connector = getConnectorBySlug(conn.appSlug);
      if (!connector || !connector.aiCapability || !connector.aiModels) {
        continue;
      }

      for (const model of connector.aiModels) {
        const formattedModelName = `${conn.id}:${model.name}`;
        toonflowModels.push({
          modelName: formattedModelName,
          type: model.type,
          label: `${connector.name} - ${(model as any).label || model.name}`
        });
      }
    }
  } catch (e) {
    console.error('[getAvailableModels] Error:', e);
  }

  return toonflowModels;
}

// ============================================================================
// AI PIPELINE ACTIONS
// ============================================================================

export async function extractNovelEventsAction(
  teamId: number,
  projectId: number,
  novelId: number,
  modelString: string
) {
  await validateProjectAccess(teamId, projectId);

  // 1. Cập nhật trạng thái chapter thành 'generating' (1)
  await db.update(videoNovels).set({
    eventState: 1, // generating
    errorReason: null
  }).where(
    and(
      eq(videoNovels.id, novelId),
      eq(videoNovels.projectId, projectId)
    )
  );

  try {
    const [novel] = await db.select().from(videoNovels).where(
      and(
        eq(videoNovels.id, novelId),
        eq(videoNovels.projectId, projectId)
      )
    ).limit(1);

    if (!novel) throw new Error('Không tìm thấy chương tiểu thuyết.');

    const aiText = new HeroAiText(teamId, modelString);
    const processor = new CleanNovel(aiText, 1);
    const result = await processor.start([novel]);

    if (!result.length || result[0].event === null) {
      throw new Error('AI không trích xuất được sự kiện.');
    }

    const eventContent = result[0].event;

    // 2. Cập nhật kết quả vào DB
    const [updatedNovel] = await db.update(videoNovels).set({
      event: eventContent,
      eventState: 2, // ready
      errorReason: null
    }).where(
      and(
        eq(videoNovels.id, novelId),
        eq(videoNovels.projectId, projectId)
      )
    ).returning();

    return { success: true, novel: updatedNovel };
  } catch (error: any) {
    console.error('[extractNovelEventsAction] Error:', error);
    await db.update(videoNovels).set({
      eventState: 3, // error
      errorReason: error.message
    }).where(
      and(
        eq(videoNovels.id, novelId),
        eq(videoNovels.projectId, projectId)
      )
    );
    return { success: false, error: error.message };
  }
}

export async function extractAllNovelEventsAction(
  teamId: number,
  projectId: number,
  modelString: string
) {
  await validateProjectAccess(teamId, projectId);

  const chapters = await db.select().from(videoNovels).where(
    eq(videoNovels.projectId, projectId)
  );

  if (!chapters.length) {
    return { success: false, error: 'Không tìm thấy chương tiểu thuyết nào.' };
  }

  // 1. Cập nhật trạng thái tất cả chapter thành 'generating' (1)
  await db.update(videoNovels).set({
    eventState: 1, // generating
    errorReason: null
  }).where(
    eq(videoNovels.projectId, projectId)
  );

  try {
    const aiText = new HeroAiText(teamId, modelString);
    const processor = new CleanNovel(aiText, 5); // concurrency = 5
    
    // Đăng ký sự kiện cập nhật từng chapter vào DB khi xử lý xong
    processor.emitter.on('item', async (data: { id: number; event: string | null; errorReason?: string }) => {
      if (data.event) {
        await db.update(videoNovels).set({
          event: data.event,
          eventState: 2, // ready
          errorReason: null
        }).where(eq(videoNovels.id, data.id));
      } else {
        await db.update(videoNovels).set({
          eventState: 3, // error
          errorReason: data.errorReason || 'AI không trích xuất được sự kiện.'
        }).where(eq(videoNovels.id, data.id));
      }
    });

    await processor.start(chapters);
    return { success: true };
  } catch (error: any) {
    console.error('[extractAllNovelEventsAction] Error:', error);
    // Cập nhật các chapter chưa xong thành error
    await db.update(videoNovels).set({
      eventState: 3,
      errorReason: error.message
    }).where(
      and(
        eq(videoNovels.projectId, projectId),
        eq(videoNovels.eventState, 1)
      )
    );
    return { success: false, error: error.message };
  }
}

export async function extractScriptAssetsAction(
  teamId: number,
  projectId: number,
  scriptIds: number[],
  modelString: string
) {
  await validateProjectAccess(teamId, projectId);

  const aiText = new HeroAiText(teamId, modelString);
  const result = await extractAssetsFromScripts({
    teamId,
    projectId,
    scriptIds,
    aiText
  });

  return result;
}

export async function generateAssetImageAction(
  teamId: number,
  projectId: number,
  assetId: number,
  modelString: string,
  promptOverride?: string,
  resolution?: string
) {
  await validateProjectAccess(teamId, projectId);

  // 1. Cập nhật promptState của asset thành 'generating'
  await db.update(videoMakerAssets).set({
    promptState: 'generating',
    promptErrorReason: null
  }).where(
    and(
      eq(videoMakerAssets.id, assetId),
      eq(videoMakerAssets.projectId, projectId)
    )
  );

  try {
    const [asset] = await db.select().from(videoMakerAssets).where(
      and(
        eq(videoMakerAssets.id, assetId),
        eq(videoMakerAssets.projectId, projectId)
      )
    ).limit(1);

    if (!asset) throw new Error('Không tìm thấy tài sản.');

    const promptText = promptOverride || asset.prompt || asset.describe || asset.name;
    if (!promptText) throw new Error('Không có prompt để sinh ảnh.');

    const aiImage = new HeroAiImage(teamId, modelString);
    const result = await aiImage.run({
      prompt: promptText,
      resolution: resolution || '1024x1024'
    });

    // 2. Lưu ảnh vào videoImages
    const [newImage] = await db.insert(videoImages).values({
      projectId,
      assetId,
      filePath: result.cloudUrl,
      type: 'assets',
      model: modelString,
      resolution: resolution || '1024x1024',
      state: 'done'
    }).returning();

    // 3. Cập nhật imageId và promptState của asset
    const [updatedAsset] = await db.update(videoMakerAssets).set({
      imageId: newImage.id,
      prompt: promptText, // Cập nhật lại prompt nếu có override
      promptState: 'done',
      promptErrorReason: null
    }).where(
      and(
        eq(videoMakerAssets.id, assetId),
        eq(videoMakerAssets.projectId, projectId)
      )
    ).returning();

    return { success: true, image: newImage, asset: updatedAsset };
  } catch (error: any) {
    console.error('[generateAssetImageAction] Error:', error);
    await db.update(videoMakerAssets).set({
      promptState: 'error',
      promptErrorReason: error.message
    }).where(
      and(
        eq(videoMakerAssets.id, assetId),
        eq(videoMakerAssets.projectId, projectId)
      )
    );
    return { success: false, error: error.message };
  }
}

export async function generateStoryboardImageAction(
  teamId: number,
  projectId: number,
  storyboardId: number,
  modelString: string,
  promptOverride?: string,
  resolution?: string
) {
  await validateProjectAccess(teamId, projectId);

  // 1. Cập nhật trạng thái storyboard thành 'generating'
  await db.update(videoStoryboards).set({
    state: 'generating',
    reason: null
  }).where(
    and(
      eq(videoStoryboards.id, storyboardId),
      eq(videoStoryboards.projectId, projectId)
    )
  );

  try {
    const [storyboard] = await db.select().from(videoStoryboards).where(
      and(
        eq(videoStoryboards.id, storyboardId),
        eq(videoStoryboards.projectId, projectId)
      )
    ).limit(1);

    if (!storyboard) throw new Error('Không tìm thấy phân cảnh.');

    const promptText = promptOverride || storyboard.prompt || storyboard.videoDesc;
    if (!promptText) throw new Error('Không có prompt để sinh ảnh phân cảnh.');

    // Tìm các tài sản (nhân vật, bối cảnh) liên kết với phân cảnh này để làm Reference Image
    const assetLinks = await db.select().from(videoMakerAssets2Storyboards)
      .where(eq(videoMakerAssets2Storyboards.storyboardId, storyboardId));
    
    const referenceImages: string[] = [];
    for (const link of assetLinks) {
      const [asset] = await db.select().from(videoMakerAssets).where(eq(videoMakerAssets.id, link.assetId)).limit(1);
      if (asset && asset.imageId) {
        const [img] = await db.select().from(videoImages).where(eq(videoImages.id, asset.imageId)).limit(1);
        if (img && img.filePath) {
          referenceImages.push(img.filePath);
        }
      }
    }

    const aiImage = new HeroAiImage(teamId, modelString);
    const result = await aiImage.run({
      prompt: promptText,
      resolution: resolution || '1024x1024',
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined
    });

    // 2. Cập nhật storyboard
    const [updatedStoryboard] = await db.update(videoStoryboards).set({
      filePath: result.cloudUrl,
      prompt: promptText, // Cập nhật lại prompt nếu có override
      state: 'done',
      reason: null
    }).where(
      and(
        eq(videoStoryboards.id, storyboardId),
        eq(videoStoryboards.projectId, projectId)
      )
    ).returning();

    return { success: true, storyboard: updatedStoryboard };
  } catch (error: any) {
    console.error('[generateStoryboardImageAction] Error:', error);
    await db.update(videoStoryboards).set({
      state: 'error',
      reason: error.message
    }).where(
      and(
        eq(videoStoryboards.id, storyboardId),
        eq(videoStoryboards.projectId, projectId)
      )
    );
    return { success: false, error: error.message };
  }
}

export async function batchGenerateStoryboardImagesAction(
  teamId: number,
  projectId: number,
  storyboardIds: number[],
  modelString: string,
  resolution?: string
) {
  await validateProjectAccess(teamId, projectId);

  // Mark all as generating first
  await db.update(videoStoryboards).set({
    state: 'generating',
    reason: null
  }).where(
    and(
      eq(videoStoryboards.projectId, projectId),
      inArray(videoStoryboards.id, storyboardIds)
    )
  );

  // We process them in chunks of 3 to avoid overwhelming the AI API or getting rate limited
  const CHUNK_SIZE = 3;
  const results = [];
  
  for (let i = 0; i < storyboardIds.length; i += CHUNK_SIZE) {
    const chunk = storyboardIds.slice(i, i + CHUNK_SIZE);
    
    // Process chunk concurrently
    const promises = chunk.map(id => 
      generateStoryboardImageAction(teamId, projectId, id, modelString, undefined, resolution)
    );
    
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }

  return { success: true, count: storyboardIds.length, results };
}

export async function generateVideoClipAction(
  teamId: number,
  projectId: number,
  storyboardId: number,
  modelString: string
) {
  await validateProjectAccess(teamId, projectId);

  // 1. Tạo dòng clip mới ở dạng 'rendering'
  const [newClip] = await db.insert(videoClips).values({
    projectId,
    storyboardId,
    filePath: 'pending',
    state: 'rendering'
  }).returning();

  try {
    const [storyboard] = await db.select().from(videoStoryboards).where(
      and(
        eq(videoStoryboards.id, storyboardId),
        eq(videoStoryboards.projectId, projectId)
      )
    ).limit(1);

    if (!storyboard) throw new Error('Không tìm thấy phân cảnh.');

    const promptText = storyboard.prompt || storyboard.videoDesc || 'Cảnh phim hoạt hình đẹp';
    const imageBase64 = storyboard.filePath ? storyboard.filePath : undefined;

    const aiVideo = new HeroAiVideo(teamId, modelString);
    const result = await aiVideo.run({
      prompt: promptText,
      imageBase64
    });

    let videoUrl = result.videoUrl || result.url;
    if (!videoUrl) throw new Error('AI không trả về video URL.');

    const [updatedClip] = await db.update(videoClips).set({
      filePath: videoUrl,
      state: 'done',
      model: modelString,
      errorReason: null
    }).where(eq(videoClips.id, newClip.id)).returning();

    return { success: true, clip: updatedClip };
  } catch (error: any) {
    console.error('[generateVideoClipAction] Error:', error);
    await db.update(videoClips).set({
      state: 'error',
      errorReason: error.message
    }).where(eq(videoClips.id, newClip.id));
    return { success: false, error: error.message };
  }
}

export async function batchGenerateAssetImagesAction(
  teamId: number,
  projectId: number,
  assetIds: number[],
  modelString: string,
  resolution?: string
) {
  await validateProjectAccess(teamId, projectId);
  
  const results = [];
  for (const id of assetIds) {
    try {
      const res = await generateAssetImageAction(teamId, projectId, id, modelString, undefined, resolution);
      results.push(res);
    } catch (e: any) {
      results.push({ success: false, assetId: id, error: e.message });
    }
  }
  return { success: true, results };
}

export async function polishAssetPromptAction(
  teamId: number,
  projectId: number,
  assetId: number,
  modelString: string
) {
  await validateProjectAccess(teamId, projectId);
  
  const [asset] = await db.select().from(videoMakerAssets).where(
    and(
      eq(videoMakerAssets.id, assetId),
      eq(videoMakerAssets.projectId, projectId)
    )
  ).limit(1);

  if (!asset) throw new Error('Không tìm thấy tài sản.');

  const aiText = new HeroAiText(teamId, modelString);
  const promptRequest = `Bạn là một chuyên gia viết prompt sinh ảnh (Midjourney/DALL-E/Stable Diffusion). Hãy tối ưu hoá mô tả sau đây của một nhân vật/cảnh vật/đối tượng thành một prompt chi tiết, trực quan bằng tiếng Anh. Chỉ trả về nội dung prompt, không giải thích gì thêm.\nMô tả gốc: ${asset.describe || asset.name}`;
  
  try {
    const result = await aiText.invoke({ 
      messages: [{ role: 'user', content: promptRequest }], 
      temperature: 0.7 
    });
    if (!result.text) throw new Error('AI không trả về kết quả');
    
    const polishedPrompt = result.text.trim();
    
    const [updatedAsset] = await db.update(videoMakerAssets).set({
      prompt: polishedPrompt
    }).where(
      eq(videoMakerAssets.id, assetId)
    ).returning();
    
    return { success: true, asset: updatedAsset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function batchGenerateVideoClipsAction(
  teamId: number,
  projectId: number,
  storyboardIds: number[],
  modelString: string
) {
  await validateProjectAccess(teamId, projectId);
  
  // Xử lý song song từng chunk (Ví dụ: 3 video cùng lúc)
  const CHUNK_SIZE = 3;
  const results = [];
  
  for (let i = 0; i < storyboardIds.length; i += CHUNK_SIZE) {
    const chunk = storyboardIds.slice(i, i + CHUNK_SIZE);
    
    const promises = chunk.map(id => 
      generateVideoClipAction(teamId, projectId, id, modelString)
        .catch(error => ({ success: false, storyboardId: id, error: error.message }))
    );
    
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }

  return { success: true, count: storyboardIds.length, results };
}

export async function generateVideoPromptAction(
  teamId: number,
  projectId: number,
  storyboardId: number,
  modelString: string
) {
  await validateProjectAccess(teamId, projectId);
  
  const [storyboard] = await db.select().from(videoStoryboards).where(
    and(
      eq(videoStoryboards.id, storyboardId),
      eq(videoStoryboards.projectId, projectId)
    )
  ).limit(1);

  if (!storyboard) throw new Error('Không tìm thấy phân cảnh.');

  const aiText = new HeroAiText(teamId, modelString);
  const promptRequest = `Bạn là một chuyên gia viết prompt sinh video (Runway/Pika/Sora). Hãy chuyển đổi mô tả sau đây của một phân cảnh thành một prompt video ngắn gọn, tập trung vào chuyển động (motion), ánh sáng và camera angle bằng tiếng Anh. Chỉ trả về nội dung prompt, không giải thích gì thêm.\nMô tả gốc: ${storyboard.videoDesc || storyboard.prompt || 'Một cảnh phim sinh động'}`;
  
  try {
    const result = await aiText.invoke({ 
      messages: [{ role: 'user', content: promptRequest }], 
      temperature: 0.7 
    });
    if (!result.text) throw new Error('AI không trả về kết quả');
    
    const polishedVideoPrompt = result.text.trim();
    
    const [updatedStoryboard] = await db.update(videoStoryboards).set({
      prompt: polishedVideoPrompt // Lưu vào prompt field để dùng khi sinh video
    }).where(
      eq(videoStoryboards.id, storyboardId)
    ).returning();
    
    return { success: true, storyboard: updatedStoryboard };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PRODUCTION ORCHESTRATOR
// ============================================================================

export async function runProductionPipelineAction(teamId: number, projectId: number) {
  try {
    await validateProjectAccess(teamId, projectId);
    
    const aiText = new HeroAiText(teamId, 'openai/gpt-4o');
    const orchestrator = new ProductionOrchestrator(aiText);
    
    // Đánh dấu trạng thái đang chạy trên project
    await db.update(videoProjects).set({ status: 'generating' }).where(eq(videoProjects.id, projectId));
    
    const result = await orchestrator.runPipeline(projectId);
    
    // Hoàn tất
    await db.update(videoProjects).set({ status: 'ready_to_render' }).where(eq(videoProjects.id, projectId));
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('runProductionPipelineAction ERROR:', error);
    await db.update(videoProjects).set({ status: 'error' }).where(eq(videoProjects.id, projectId));
    return { success: false, error: error.message };
  }
}
