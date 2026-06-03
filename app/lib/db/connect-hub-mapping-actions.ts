'use server';

import { db } from './drizzle';
import { connectHubMappingConfigs } from './schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentTeamId } from '../sim-helpers';
import { migrateLegacyConfig } from '../connect-hub/utils/mapper';

/**
 * Lấy cấu hình mapping cho 1 App (Platform) của Team hiện tại
 * @param appSlug Mã của POS (vd: 'pancake-pos')
 */
export async function getMappingConfigAction(appSlug: string) {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) {
      return { error: 'Không tìm thấy không gian làm việc.' };
    }

    const configRecord = await db.query.connectHubMappingConfigs.findFirst({
      where: and(
        eq(connectHubMappingConfigs.appSlug, appSlug),
        eq(connectHubMappingConfigs.teamId, teamId)
      ),
    });

    const rawConfig = configRecord?.config || {};
    // Tự động chuyển đổi định dạng cũ (nếu có) sang cấu trúc gợi ý mới
    const migratedConfig = migrateLegacyConfig(rawConfig);

    return { success: true, data: migratedConfig };
  } catch (error: any) {
    console.error('getMappingConfigAction Error:', error);
    return { error: error.message || 'Lỗi khi lấy cấu hình chuẩn hóa.' };
  }
}

/**
 * Lưu hoặc cập nhật cấu hình mapping cho 1 App (Platform)
 */
export async function saveMappingConfigAction(appSlug: string, configJson: any) {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) {
      return { error: 'Không tìm thấy không gian làm việc.' };
    }

    const existingConfig = await db.query.connectHubMappingConfigs.findFirst({
      where: and(
        eq(connectHubMappingConfigs.appSlug, appSlug),
        eq(connectHubMappingConfigs.teamId, teamId)
      ),
    });

    if (existingConfig) {
      await db
        .update(connectHubMappingConfigs)
        .set({
          config: configJson,
          updatedAt: new Date(),
        })
        .where(eq(connectHubMappingConfigs.id, existingConfig.id));
    } else {
      await db.insert(connectHubMappingConfigs).values({
        appSlug,
        teamId,
        config: configJson,
      });
    }

    return { success: true, message: 'Đã lưu cấu hình chuẩn hóa thành công.' };
  } catch (error: any) {
    console.error('saveMappingConfigAction Error:', error);
    return { error: error.message || 'Lỗi khi lưu cấu hình.' };
  }
}
