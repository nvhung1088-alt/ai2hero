'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from './drizzle';
import {
  simEmployees,
  simAssets,
  simLinkedAccounts,
  simRiskEvents,
  simCheckLogs,
  teamMembers,
  activityLogs,
  teams,
  type NewSimAsset,
  type SimAsset,
  type NewSimLinkedAccount,
  type SimLinkedAccount,
  type NewSimEmployee,
  type SimEmployee,
  type NewSimCheckLog
} from './schema';
import { getUser } from './queries';
import { encryptField, decryptField } from '../sim-crypto';

// Helper function to check if the current user belongs to the target team and has write permissions
async function verifyTeamAccess(targetTeamId: number, requireRole?: string[], requiredApp?: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('Chưa đăng nhập');
  }
  
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, targetTeamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (member.length === 0) {
    throw new Error('Không có quyền truy cập Không gian làm việc này');
  }

  // Check role gating if needed
  if (requireRole && !requireRole.includes(member[0].role)) {
    throw new Error('Bạn không có quyền thực hiện hành động này');
  }

  // App activation gating
  if (requiredApp) {
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, targetTeamId))
      .limit(1);

    if (team.length === 0 || team[0].deletedAt) {
      throw new Error('Không gian làm việc không tồn tại hoặc đã bị xóa');
    }

    const activatedApps = (team[0].activatedApps as string[]) || [];
    if (!activatedApps.includes(requiredApp)) {
      throw new Error(`Ứng dụng HeroSim chưa được kích hoạt trong Không gian này`);
    }
  }

  return { user, role: member[0].role };
}

function sanitizeError(error: any): string {
  return error?.message || 'Đã có lỗi xảy ra';
}

// ==========================================
// SIM ASSET CRUD
// ==========================================

export async function createSimAsset(teamId: number, data: Omit<NewSimAsset, 'teamId'>) {
  try {
    const { user } = await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');
    
    const [inserted] = await db
      .insert(simAssets)
      .values({
        ...data,
        value: encryptField(data.value) as string,
        registeredName: encryptField(data.registeredName ?? null),
        registeredId: encryptField(data.registeredId ?? null),
        teamId,
        updatedAt: new Date()
      })
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã thêm thiết bị SIM mới: ${inserted.name} (${data.value})`
    });
      
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating SIM asset:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateSimAsset(teamId: number, assetId: number, data: Partial<Omit<SimAsset, 'id' | 'teamId'>>) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [updated] = await db
      .update(simAssets)
      .set({
        ...data,
        ...(data.value !== undefined ? { value: encryptField(data.value) as string } : {}),
        ...(data.registeredName !== undefined ? { registeredName: encryptField(data.registeredName ?? null) } : {}),
        ...(data.registeredId !== undefined ? { registeredId: encryptField(data.registeredId ?? null) } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(simAssets.teamId, teamId), eq(simAssets.id, assetId)))
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy thiết bị SIM hoặc không có quyền' };
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating SIM asset:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteSimAsset(teamId: number, assetId: number) {
  try {
    const { user } = await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [deleted] = await db
      .delete(simAssets)
      .where(and(eq(simAssets.teamId, teamId), eq(simAssets.id, assetId)))
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy thiết bị SIM hoặc không có quyền' };
    }

    const plainPhone = decryptField(deleted.value) || '';

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xóa thiết bị SIM: ${deleted.name} (${plainPhone})`
    });

    return { success: true, data: deleted };
  } catch (error: any) {
    if (error?.message?.includes('foreign') || error?.message?.includes('restrict') || error?.code === '23503') {
      return { success: false, error: 'Không thể xóa SIM này vì vẫn còn tài khoản liên kết. Vui lòng gỡ liên kết hoặc xóa tài khoản trước.' };
    }
    console.error('Error deleting SIM asset:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ==========================================
// LINKED ACCOUNT CRUD
// ==========================================

export async function createSimLinkedAccount(teamId: number, data: Omit<NewSimLinkedAccount, 'teamId'>) {
  try {
    const { user } = await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [inserted] = await db
      .insert(simLinkedAccounts)
      .values({
        ...data,
        encryptedPassword: encryptField(data.encryptedPassword ?? null),
        teamId,
        updatedAt: new Date()
      })
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã liên kết tài khoản ${inserted.platformKey} cho SIM (${inserted.accountName})`
    });

    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating linked account:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateSimLinkedAccount(teamId: number, accountId: number, data: Partial<Omit<SimLinkedAccount, 'id' | 'teamId'>>) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [updated] = await db
      .update(simLinkedAccounts)
      .set({
        ...data,
        ...(data.encryptedPassword !== undefined ? { encryptedPassword: encryptField(data.encryptedPassword ?? null) } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(simLinkedAccounts.teamId, teamId), eq(simLinkedAccounts.id, accountId)))
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy tài khoản hoặc không có quyền' };
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating linked account:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteSimLinkedAccount(teamId: number, accountId: number) {
  try {
    const { user } = await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [deleted] = await db
      .delete(simLinkedAccounts)
      .where(and(eq(simLinkedAccounts.teamId, teamId), eq(simLinkedAccounts.id, accountId)))
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy tài khoản hoặc không có quyền' };
    }

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xóa tài khoản liên kết ${deleted.platformKey} của SIM (${deleted.accountName})`
    });

    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting linked account:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ==========================================
// EMPLOYEE CRUD
// ==========================================

export async function createSimEmployee(teamId: number, data: Omit<NewSimEmployee, 'teamId'>) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [inserted] = await db
      .insert(simEmployees)
      .values({
        ...data,
        teamId,
        updatedAt: new Date()
      })
      .returning();

    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating SIM employee:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateSimEmployee(teamId: number, employeeId: number, data: Partial<Omit<SimEmployee, 'id' | 'teamId'>>) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [updated] = await db
      .update(simEmployees)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(simEmployees.teamId, teamId), eq(simEmployees.id, employeeId)))
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy nhân viên hoặc không có quyền' };
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating SIM employee:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ==========================================
// RISK EVENTS OPERATIONS
// ==========================================

export async function resolveSimRiskEvent(teamId: number, eventId: number, note?: string) {
  try {
    const { user } = await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [existing] = await db
      .select({ resolved: simRiskEvents.resolved, dismissed: simRiskEvents.dismissed })
      .from(simRiskEvents)
      .where(and(eq(simRiskEvents.teamId, teamId), eq(simRiskEvents.id, eventId)))
      .limit(1);
    
    if (!existing) return { success: false, error: 'Không tìm thấy cảnh báo' };
    if (existing.resolved === 1) return { success: false, error: 'Cảnh báo này đã được giải quyết trước đó' };
    if (existing.dismissed === 1) return { success: false, error: 'Cảnh báo này đã bị bỏ qua trước đó' };

    const [updated] = await db
      .update(simRiskEvents)
      .set({
        resolved: 1,
        resolvedBy: user.id,
        resolvedAt: new Date(),
        resolveNote: note || ''
      })
      .where(and(eq(simRiskEvents.teamId, teamId), eq(simRiskEvents.id, eventId)))
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy cảnh báo hoặc không có quyền' };
    }

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xử lý một cảnh báo bảo mật trên SIM (Sự cố: ${updated.riskType})`
    });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error resolving risk event:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function dismissSimRiskEvent(teamId: number, eventId: number) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [existing] = await db
      .select({ resolved: simRiskEvents.resolved, dismissed: simRiskEvents.dismissed })
      .from(simRiskEvents)
      .where(and(eq(simRiskEvents.teamId, teamId), eq(simRiskEvents.id, eventId)))
      .limit(1);
    
    if (!existing) return { success: false, error: 'Không tìm thấy cảnh báo' };
    if (existing.resolved === 1) return { success: false, error: 'Cảnh báo này đã được giải quyết trước đó' };
    if (existing.dismissed === 1) return { success: false, error: 'Cảnh báo này đã bị bỏ qua trước đó' };

    const [updated] = await db
      .update(simRiskEvents)
      .set({
        dismissed: 1,
        dismissedAt: new Date()
      })
      .where(and(eq(simRiskEvents.teamId, teamId), eq(simRiskEvents.id, eventId)))
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy cảnh báo hoặc không có quyền' };
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error dismissing risk event:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function restoreSimRiskEvent(teamId: number, eventId: number) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [updated] = await db
      .update(simRiskEvents)
      .set({
        resolved: 0,
        resolvedBy: null,
        resolvedAt: null,
        resolveNote: null,
        dismissed: 0,
        dismissedAt: null
      })
      .where(and(eq(simRiskEvents.teamId, teamId), eq(simRiskEvents.id, eventId)))
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy cảnh báo hoặc không có quyền' };
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error restoring risk event:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ==========================================
// CHECK LOG ACTIONS
// ==========================================

export async function addSimCheckLog(teamId: number, data: Omit<NewSimCheckLog, 'teamId' | 'checkedBy'>) {
  try {
    const { user } = await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    const [inserted] = await db
      .insert(simCheckLogs)
      .values({
        ...data,
        teamId,
        checkedBy: user.id,
        checkedAt: new Date()
      })
      .returning();

    // Đồng thời cập nhật lastCheckedAt và riskScore của SIM tương ứng
    await db
      .update(simAssets)
      .set({
        lastCheckedAt: new Date(),
        riskScore: data.riskScoreAfter ?? 0,
        updatedAt: new Date()
      })
      .where(and(eq(simAssets.teamId, teamId), eq(simAssets.id, data.assetId)));

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã hoàn tất kiểm định bảo mật cho SIM`
    });

    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error adding check log:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ==========================================
// BATCH OPERATIONS (CSV/API Import)
// ==========================================

export async function importSimAssetsBatch(teamId: number, rawAssets: Omit<NewSimAsset, 'teamId'>[]) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    if (rawAssets.length === 0) {
      return { success: true, data: [] };
    }

    if (rawAssets.length > 500) {
      return { success: false, error: 'Giới hạn tối đa 500 SIM mỗi lần import' };
    }

    const valuesToInsert = rawAssets.map(ast => ({
      ...ast,
      value: encryptField(ast.value) as string,
      registeredName: encryptField(ast.registeredName ?? null),
      registeredId: encryptField(ast.registeredId ?? null),
      teamId,
      updatedAt: new Date()
    }));

    const inserted = await db
      .insert(simAssets)
      .values(valuesToInsert)
      .returning();

    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error batch importing SIM assets:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function importSimLinkedAccountsBatch(
  teamId: number,
  rawAccounts: Omit<NewSimLinkedAccount, 'teamId'>[]
) {
  try {
    await verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim');

    if (rawAccounts.length === 0) {
      return { success: true, data: [] };
    }

    if (rawAccounts.length > 2000) {
      return { success: false, error: 'Giới hạn tối đa 2000 tài khoản mỗi lần import' };
    }

    // Thực hiện trong transaction để đảm bảo toàn vẹn dữ liệu
    const results = await db.transaction(async (tx) => {
      const insertedOrUpdated = [];

      for (const account of rawAccounts) {
        // Tìm tài khoản trùng lặp dựa trên platformKey và username
        const [existing] = await tx
          .select()
          .from(simLinkedAccounts)
          .where(
            and(
              eq(simLinkedAccounts.teamId, teamId),
              eq(simLinkedAccounts.platformKey, account.platformKey),
              eq(simLinkedAccounts.username, account.username || '')
            )
          )
          .limit(1);

        if (existing) {
          // Cập nhật thông tin mật khẩu, url, notes
          const [updated] = await tx
            .update(simLinkedAccounts)
            .set({
              accountName: account.accountName || existing.accountName,
              loginUrl: account.loginUrl || existing.loginUrl,
              encryptedPassword: account.encryptedPassword ? encryptField(account.encryptedPassword) : existing.encryptedPassword,
              notes: account.notes || existing.notes,
              linkedPhoneAssetId: account.linkedPhoneAssetId || existing.linkedPhoneAssetId,
              updatedAt: new Date(),
            })
            .where(eq(simLinkedAccounts.id, existing.id))
            .returning();
          
          if (updated) insertedOrUpdated.push(updated);
        } else {
          // Thêm mới
          const [inserted] = await tx
            .insert(simLinkedAccounts)
            .values({
              ...account,
              encryptedPassword: encryptField(account.encryptedPassword ?? null),
              teamId,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          
          if (inserted) insertedOrUpdated.push(inserted);
        }
      }

      return insertedOrUpdated;
    });

    return { success: true, data: results };
  } catch (error: any) {
    console.error('Error batch importing SIM linked accounts:', error);
    return { success: false, error: sanitizeError(error) };
  }
}
