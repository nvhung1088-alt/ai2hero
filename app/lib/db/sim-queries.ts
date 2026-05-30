import { desc, and, eq, sql } from 'drizzle-orm';
import { db } from './drizzle';
import {
  simEmployees,
  simAssets,
  simPlatforms,
  simLinkedAccounts,
  simRiskEvents,
  simCheckLogs,
  users
} from './schema';
import { decryptField } from '../sim-crypto';

export async function getSimAssets(teamId: number) {
  const results = await db
    .select({
      id: simAssets.id,
      name: simAssets.name,
      value: simAssets.value,
      importanceLevel: simAssets.importanceLevel,
      ownerEmployeeId: simAssets.ownerEmployeeId,
      ownerName: simEmployees.name,
      status: simAssets.status,
      riskScore: simAssets.riskScore,
      lastCheckedAt: simAssets.lastCheckedAt,
      activationDate: simAssets.activationDate,
      carrier: simAssets.carrier,
      lineType: simAssets.lineType,
      numverifyValid: simAssets.numverifyValid,
      registeredName: simAssets.registeredName,
      registeredId: simAssets.registeredId,
      registeredAt: simAssets.registeredAt,
      topupCycleDays: simAssets.topupCycleDays,
      lastTopupAt: simAssets.lastTopupAt,
      renewalDate: simAssets.renewalDate,
      createdAt: simAssets.createdAt
    })
    .from(simAssets)
    .leftJoin(simEmployees, eq(simAssets.ownerEmployeeId, simEmployees.id))
    .where(eq(simAssets.teamId, teamId))
    .orderBy(desc(simAssets.createdAt));

  return results.map(r => ({
    ...r,
    value: decryptField(r.value) as string,
    registeredName: decryptField(r.registeredName),
    registeredId: decryptField(r.registeredId),
  }));
}

export async function getSimAssetById(teamId: number, assetId: number) {
  const result = await db
    .select()
    .from(simAssets)
    .where(and(eq(simAssets.teamId, teamId), eq(simAssets.id, assetId)))
    .limit(1);
    
  if (result.length === 0) return null;
  return {
    ...result[0],
    value: decryptField(result[0].value) as string,
    registeredName: decryptField(result[0].registeredName),
    registeredId: decryptField(result[0].registeredId),
  };
}

export async function getSimEmployees(teamId: number) {
  return await db
    .select()
    .from(simEmployees)
    .where(eq(simEmployees.teamId, teamId))
    .orderBy(simEmployees.name);
}

export async function getSimPlatforms(teamId: number) {
  return await db
    .select()
    .from(simPlatforms)
    .where(eq(simPlatforms.teamId, teamId))
    .orderBy(simPlatforms.key);
}

export async function getSimLinkedAccounts(teamId: number, assetId?: number) {
  let query = db
    .select({
      id: simLinkedAccounts.id,
      platformKey: simLinkedAccounts.platformKey,
      accountName: simLinkedAccounts.accountName,
      loginUrl: simLinkedAccounts.loginUrl,
      username: simLinkedAccounts.username,
      notes: simLinkedAccounts.notes,
      loginEmail: simLinkedAccounts.loginEmail,
      encryptedPassword: simLinkedAccounts.encryptedPassword,
      linkedPhoneAssetId: simLinkedAccounts.linkedPhoneAssetId,
      linkedPhoneNumber: simAssets.value,
      backupEmail: simLinkedAccounts.backupEmail,
      backupPhoneAssetId: simLinkedAccounts.backupPhoneAssetId,
      ownerEmployeeId: simLinkedAccounts.ownerEmployeeId,
      ownerName: simEmployees.name,
      importanceLevel: simLinkedAccounts.importanceLevel,
      status: simLinkedAccounts.status,
      createdAt: simLinkedAccounts.createdAt
    })
    .from(simLinkedAccounts)
    .leftJoin(simAssets, eq(simLinkedAccounts.linkedPhoneAssetId, simAssets.id))
    .leftJoin(simEmployees, eq(simLinkedAccounts.ownerEmployeeId, simEmployees.id));

  let results;
  if (assetId !== undefined) {
    results = await query
      .where(
        and(
          eq(simLinkedAccounts.teamId, teamId),
          eq(simLinkedAccounts.linkedPhoneAssetId, assetId)
        )
      )
      .orderBy(simLinkedAccounts.accountName);
  } else {
    results = await query
      .where(eq(simLinkedAccounts.teamId, teamId))
      .orderBy(simLinkedAccounts.accountName);
  }

  return results.map(r => ({
    ...r,
    linkedPhoneNumber: decryptField(r.linkedPhoneNumber),
    encryptedPassword: decryptField(r.encryptedPassword)
  }));
}

export async function getSimRiskEvents(
  teamId: number,
  status?: 'active' | 'resolved' | 'dismissed'
) {
  let conditions = [eq(simRiskEvents.teamId, teamId)];

  if (status === 'resolved') {
    conditions.push(eq(simRiskEvents.resolved, 1));
  } else if (status === 'dismissed') {
    conditions.push(eq(simRiskEvents.dismissed, 1));
  } else if (status === 'active') {
    conditions.push(eq(simRiskEvents.resolved, 0));
    conditions.push(eq(simRiskEvents.dismissed, 0));
  }

  const results = await db
    .select({
      id: simRiskEvents.id,
      assetId: simRiskEvents.assetId,
      assetName: simAssets.name,
      assetValue: simAssets.value,
      riskType: simRiskEvents.riskType,
      riskLevel: simRiskEvents.riskLevel,
      message: simRiskEvents.message,
      resolved: simRiskEvents.resolved,
      resolvedBy: simRiskEvents.resolvedBy,
      resolvedByName: users.name,
      resolvedAt: simRiskEvents.resolvedAt,
      resolveNote: simRiskEvents.resolveNote,
      dismissed: simRiskEvents.dismissed,
      dismissedAt: simRiskEvents.dismissedAt,
      createdAt: simRiskEvents.createdAt
    })
    .from(simRiskEvents)
    .leftJoin(simAssets, eq(simRiskEvents.assetId, simAssets.id))
    .leftJoin(users, eq(simRiskEvents.resolvedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(simRiskEvents.createdAt));

  return results.map(r => ({
    ...r,
    assetValue: decryptField(r.assetValue)
  }));
}

export async function getSimCheckLogs(teamId: number, assetId?: number) {
  let query = db
    .select({
      id: simCheckLogs.id,
      assetId: simCheckLogs.assetId,
      assetName: simAssets.name,
      assetValue: simAssets.value,
      checkedBy: simCheckLogs.checkedBy,
      checkedByName: users.name,
      checkedAt: simCheckLogs.checkedAt,
      checkType: simCheckLogs.checkType,
      riskScoreBefore: simCheckLogs.riskScoreBefore,
      riskScoreAfter: simCheckLogs.riskScoreAfter,
      notes: simCheckLogs.notes,
      statusAfter: simCheckLogs.statusAfter,
      createdAt: simCheckLogs.createdAt
    })
    .from(simCheckLogs)
    .leftJoin(simAssets, eq(simCheckLogs.assetId, simAssets.id))
    .leftJoin(users, eq(simCheckLogs.checkedBy, users.id));

  let results;
  if (assetId !== undefined) {
    results = await query
      .where(
        and(
          eq(simCheckLogs.teamId, teamId),
          eq(simCheckLogs.assetId, assetId)
        )
      )
      .orderBy(desc(simCheckLogs.createdAt));
  } else {
    results = await query
      .where(eq(simCheckLogs.teamId, teamId))
      .orderBy(desc(simCheckLogs.createdAt));
  }

  return results.map(r => ({
    ...r,
    assetValue: decryptField(r.assetValue)
  }));
}

export async function getSimDashboardStats(teamId: number) {
  const [assetsCount, accountsCount, employeesCount, activeRisks, avgRisk] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(simAssets).where(eq(simAssets.teamId, teamId)),
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(simLinkedAccounts).where(eq(simLinkedAccounts.teamId, teamId)),
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(simEmployees).where(eq(simEmployees.teamId, teamId)),
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(simRiskEvents).where(and(eq(simRiskEvents.teamId, teamId), eq(simRiskEvents.resolved, 0), eq(simRiskEvents.dismissed, 0))),
    db.select({ avg: sql<number>`cast(coalesce(avg(${simAssets.riskScore}), 0) as integer)` }).from(simAssets).where(eq(simAssets.teamId, teamId)),
  ]);

  return {
    totalSIMs: assetsCount[0]?.count ?? 0,
    totalAccounts: accountsCount[0]?.count ?? 0,
    totalEmployees: employeesCount[0]?.count ?? 0,
    activeRisks: activeRisks[0]?.count ?? 0,
    avgRiskScore: avgRisk[0]?.avg ?? 0
  };
}
