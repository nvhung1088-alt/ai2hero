import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { extensionLinkCodes, teams } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { SignJWT } from 'jose';

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  throw new Error('AUTH_SECRET environment variable is required');
}
const key = new TextEncoder().encode(authSecret);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, deviceName, platform } = body;

    if (!code) {
      return NextResponse.json({ error: 'Mã liên kết (code) là bắt buộc' }, { status: 400 });
    }

    // 1. Tìm code hợp lệ trong DB
    const [linkRecord] = await db
      .select()
      .from(extensionLinkCodes)
      .where(
        and(
          eq(extensionLinkCodes.code, code.toUpperCase()),
          gt(extensionLinkCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!linkRecord) {
      return NextResponse.json({ error: 'Mã liên kết không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
    }

    if (linkRecord.usedAt) {
      return NextResponse.json({ error: 'Mã liên kết đã được sử dụng.' }, { status: 400 });
    }

    // Đánh dấu code đã dùng
    await db.update(extensionLinkCodes).set({ usedAt: new Date() }).where(eq(extensionLinkCodes.id, linkRecord.id));

    const teamId = linkRecord.teamId;
    
    // Lấy thông tin team
    const [team] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);

    // 2. Sinh Access Token (JWT)
    const tokenPayload = {
      teamId: teamId,
      userId: linkRecord.userId,
      role: 'downloader-worker',
      deviceName: deviceName || 'Local Worker',
      platform: platform || 'windows',
    };

    const accessToken = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('90d') // Token sống 90 ngày
      .sign(key);

    return NextResponse.json({
      success: true,
      accessToken,
      teamId: teamId,
      teamName: team?.name || 'My Workspace'
    });

  } catch (error: any) {
    console.error('[API Downloader Worker Pair] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
