'use server';

import { db } from './drizzle';
import { systemSettings, filmEpisodes, filmSeries } from './schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

export async function getTeamAutoTranslateAction(teamId: number) {
  try {
    const key = `team_${teamId}_auto_translate`;
    const res = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key)
    });
    return res ? res.value === true : false;
  } catch (e) {
    return false;
  }
}

export async function toggleTeamAutoTranslateAction(teamId: number, enabled: boolean) {
  try {
    const key = `team_${teamId}_auto_translate`;
    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key)
    });
    if (existing) {
      await db.update(systemSettings).set({ value: enabled }).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value: enabled });
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function resetTeamAiTranslationAction(teamId: number) {
  try {
    // Tìm tất cả series của team này
    const seriesList = await db.query.filmSeries.findMany({
      where: eq(filmSeries.teamId, teamId),
      columns: { id: true }
    });
    
    if (seriesList.length === 0) return { success: true };
    const seriesIds = seriesList.map(s => s.id);

    // Reset timeline và summary của các tập phim
    await db.update(filmEpisodes)
      .set({ timeline: null, summary: null })
      .where(inArray(filmEpisodes.seriesId, seriesIds));

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
