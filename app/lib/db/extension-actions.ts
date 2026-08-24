'use server';

import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db/drizzle';
import {
  extensionTokens,
  extensionLinkCodes,
  teams,
} from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';

// Dùng cùng AUTH_SECRET nhưng claim type: 'extension' để phân biệt với session JWT
const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  throw new Error('AUTH_SECRET environment variable is required');
}
const key = new TextEncoder().encode(authSecret);

// Extension JWT expiry: 90 ngày
const EXTENSION_TOKEN_EXPIRY_DAYS = 90;

// Link code expiry: 5 phút
const LINK_CODE_EXPIRY_MINUTES = 5;

// ─── Hàm 1: Sinh mã liên kết 6 ký tự ────────────────────────────────────────
export async function generateLinkCode(
  teamId: number,
  userId: number
): Promise<{ success: boolean; code?: string; expiresAt?: string; error?: string }> {
  try {
    // Mã 6 ký tự ngẫu nhiên (uppercase alphanumeric, bỏ O/0/I/1 để tránh nhầm)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from(randomBytes(6))
      .map((b) => chars[b % chars.length])
      .join('');

    const expiresAt = new Date(Date.now() + LINK_CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(extensionLinkCodes).values({
      teamId,
      userId,
      code,
      expiresAt,
    });

    return { success: true, code, expiresAt: expiresAt.toISOString() };
  } catch (err: any) {
    console.error('[extension-actions] generateLinkCode error:', err);
    return { success: false, error: err.message || 'Lỗi sinh mã liên kết' };
  }
}

// ─── Hàm 2: Xác thực mã liên kết & sinh JWT token ────────────────────────────
export async function validateAndPairLinkCode(
  code: string
): Promise<{
  success: boolean;
  accessToken?: string;
  teamId?: number;
  teamName?: string;
  expiresAt?: Date;
  error?: string;
}> {
  try {
    // Tìm code hợp lệ: chưa dùng + chưa hết hạn
    const [linkCode] = await db
      .select()
      .from(extensionLinkCodes)
      .where(
        and(
          eq(extensionLinkCodes.code, code.toUpperCase()),
          isNull(extensionLinkCodes.usedAt),
          gt(extensionLinkCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!linkCode) {
      return { success: false, error: 'Mã liên kết không hợp lệ hoặc đã hết hạn' };
    }

    // Lấy tên workspace
    const [team] = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.id, linkCode.teamId))
      .limit(1);

    if (!team) {
      return { success: false, error: 'Workspace không tồn tại' };
    }

    // Sinh JWT extension token (90 ngày)
    const expiresAt = new Date(Date.now() + EXTENSION_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const accessToken = await new SignJWT({
      teamId: linkCode.teamId,
      userId: linkCode.userId,
      type: 'extension', // Claim phân biệt với session JWT
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${EXTENSION_TOKEN_EXPIRY_DAYS}d`)
      .sign(key);

    // Hash SHA-256 lưu DB (không bao giờ lưu token gốc)
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');

    await db.insert(extensionTokens).values({
      teamId: linkCode.teamId,
      createdByUserId: linkCode.userId,
      tokenHash,
      deviceName: 'Chrome Extension',
      expiresAt,
    });

    // Đánh dấu code đã dùng
    await db
      .update(extensionLinkCodes)
      .set({ usedAt: new Date() })
      .where(eq(extensionLinkCodes.id, linkCode.id));

    return { success: true, accessToken, teamId: team.id, teamName: team.name, expiresAt };
  } catch (err: any) {
    console.error('[extension-actions] validateAndPairLinkCode error:', err);
    return { success: false, error: err.message || 'Lỗi ghép nối extension' };
  }
}

// ─── Hàm 3: Xác thực Bearer Token từ Extension ───────────────────────────────
export async function verifyExtensionToken(
  bearerToken: string
): Promise<{ success: boolean; teamId?: number; userId?: number; tokenId?: number; error?: string }> {
  try {
    // Verify JWT signature + expiry
    const { payload } = await jwtVerify(bearerToken, key, { algorithms: ['HS256'] });

    // Kiểm tra đúng loại extension (không nhầm với session JWT)
    if (payload.type !== 'extension') {
      return { success: false, error: 'Token không hợp lệ' };
    }

    // Kiểm tra hash trong DB + chưa bị revoke
    const tokenHash = createHash('sha256').update(bearerToken).digest('hex');
    const [tokenRecord] = await db
      .select()
      .from(extensionTokens)
      .where(
        and(
          eq(extensionTokens.tokenHash, tokenHash),
          isNull(extensionTokens.revokedAt),
          gt(extensionTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord) {
      return { success: false, error: 'Token đã bị thu hồi hoặc hết hạn' };
    }

    // Cập nhật lastUsedAt
    await db
      .update(extensionTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(extensionTokens.id, tokenRecord.id));

    return {
      success: true,
      teamId: tokenRecord.teamId,
      userId: tokenRecord.createdByUserId,
      tokenId: tokenRecord.id,
    };
  } catch (err: any) {
    console.error('[extension-actions] verifyExtensionToken error:', err);
    return { success: false, error: 'Token không hợp lệ hoặc đã hết hạn' };
  }
}

// ─── Hàm 4: Lấy danh sách thiết bị đã liên kết ───────────────────────────────
export async function getActiveExtensionTokens(
  teamId: number
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const tokens = await db
      .select({
        id: extensionTokens.id,
        deviceName: extensionTokens.deviceName,
        lastUsedAt: extensionTokens.lastUsedAt,
        expiresAt: extensionTokens.expiresAt,
        createdAt: extensionTokens.createdAt,
      })
      .from(extensionTokens)
      .where(
        and(
          eq(extensionTokens.teamId, teamId),
          isNull(extensionTokens.revokedAt),
          gt(extensionTokens.expiresAt, new Date())
        )
      );

    return { success: true, data: tokens };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Hàm 5: Thu hồi quyền truy cập thiết bị ─────────────────────────────────
export async function revokeExtensionToken(
  teamId: number,
  tokenId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(extensionTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(extensionTokens.id, tokenId),
          eq(extensionTokens.teamId, teamId) // Đảm bảo chỉ revoke trong đúng workspace
        )
      );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Hàm 6: Lấy hoặc tạo trực tiếp Extension Token cho Web Dashboard Auto-Pairing ───
export async function getOrCreateDirectExtensionToken(
  teamId: number
): Promise<{ success: boolean; accessToken?: string; teamId?: number; error?: string }> {
  try {
    const expiresAt = new Date(Date.now() + EXTENSION_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const accessToken = await new SignJWT({
      teamId,
      userId: 1,
      type: 'extension',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${EXTENSION_TOKEN_EXPIRY_DAYS}d`)
      .sign(key);

    const tokenHash = createHash('sha256').update(accessToken).digest('hex');

    await db.insert(extensionTokens).values({
      teamId,
      createdByUserId: 1,
      tokenHash,
      deviceName: 'Auto Web Pairing',
      expiresAt,
    });

    return { success: true, accessToken, teamId };
  } catch (err: any) {
    console.error('[extension-actions] getOrCreateDirectExtensionToken error:', err);
    return { success: false, error: err.message };
  }
}
