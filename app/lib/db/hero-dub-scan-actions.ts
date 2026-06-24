'use server';

import { db } from './drizzle';
import { dubScanConfigs } from './schema';
import { eq, and } from 'drizzle-orm';

export async function getDubScanConfigsAction(teamId: number) {
  try {
    const configs = await db.query.dubScanConfigs.findMany({
      where: (c, { eq }) => eq(c.teamId, teamId),
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });
    return { success: true, configs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveDubScanConfigAction(data: {
  teamId: number;
  userId: number;
  id?: number | string;
  name: string;
  folderPath: string;
  intervalMinutes: number;
  sourceLang?: string;
  targetLang?: string;
  asrEngine?: string;
  subtitleMode?: string;
  ttsEnabled?: boolean;
  ttsEngine?: string;
  ttsVoice?: string;
  ttsSpeed?: string;
  bgVolume?: string;
  ttsVolume?: string;
  outputFolder?: string;
  aiAppSlug?: string;
  aiModel?: string;
  isActive?: boolean;
}) {
  try {
    const configId = data.id ? Number(data.id) : undefined;
    if (configId && !isNaN(configId)) {
      await db.update(dubScanConfigs)
        .set({
          name: data.name,
          folderPath: data.folderPath,
          intervalMinutes: data.intervalMinutes,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          asrEngine: data.asrEngine,
          subtitleMode: data.subtitleMode,
          ttsEnabled: data.ttsEnabled,
          ttsEngine: data.ttsEngine,
          ttsVoice: data.ttsVoice,
          ttsSpeed: data.ttsSpeed,
          bgVolume: data.bgVolume,
          ttsVolume: data.ttsVolume,
          outputFolder: data.outputFolder,
          aiAppSlug: data.aiAppSlug,
          aiModel: data.aiModel,
          isActive: data.isActive !== undefined ? data.isActive : true,
        })
        .where(eq(dubScanConfigs.id, configId));
    } else {
      await db.insert(dubScanConfigs).values({
        teamId: data.teamId,
        userId: data.userId,
        name: data.name,
        folderPath: data.folderPath,
        intervalMinutes: data.intervalMinutes,
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
        asrEngine: data.asrEngine,
        subtitleMode: data.subtitleMode,
        ttsEnabled: data.ttsEnabled,
        ttsEngine: data.ttsEngine,
        ttsVoice: data.ttsVoice,
        ttsSpeed: data.ttsSpeed,
        bgVolume: data.bgVolume,
        ttsVolume: data.ttsVolume,
        outputFolder: data.outputFolder,
        aiAppSlug: data.aiAppSlug,
        aiModel: data.aiModel,
        isActive: data.isActive !== undefined ? data.isActive : true,
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDubScanConfigAction(id: number, teamId: number) {
  try {
    await db.delete(dubScanConfigs).where(and(eq(dubScanConfigs.id, id), eq(dubScanConfigs.teamId, teamId)));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { sql } from 'drizzle-orm';

export async function updateDubScanConfigStatsAction(configId: number, newVideosCount: number) {
  try {
    if (newVideosCount > 0) {
      await db.update(dubScanConfigs)
        .set({
          lastScanAt: new Date(),
          scannedCount: sql`${dubScanConfigs.scannedCount} + ${newVideosCount}`
        })
        .where(eq(dubScanConfigs.id, configId));
    } else {
      await db.update(dubScanConfigs)
        .set({ lastScanAt: new Date() })
        .where(eq(dubScanConfigs.id, configId));
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
