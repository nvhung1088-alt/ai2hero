import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, extensionTokens } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { jwtVerify, SignJWT } from 'jose';
import { createHash } from 'crypto';

const authSecret = process.env.AUTH_SECRET;
const key = authSecret ? new TextEncoder().encode(authSecret) : null;
const EXTENSION_TOKEN_EXPIRY_DAYS = 90;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Cấu hình AUTH_SECRET bị thiếu trên server' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const { tempToken, teamId } = body;

    if (!tempToken || !teamId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã xác thực hoặc workspace' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Xác thực tempToken
    let userId: number;
    try {
      const { payload } = await jwtVerify(tempToken, key, { algorithms: ['HS256'] });
      if (payload.type !== 'extension_auth') {
        return NextResponse.json(
          { success: false, error: 'Mã xác thực không hợp lệ' },
          { status: 401, headers: CORS_HEADERS }
        );
      }
      userId = payload.userId as number;
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Mã xác thực đã hết hạn hoặc không hợp lệ' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Kiểm tra xem user có thuộc workspace này không
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, Number(teamId))))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền truy cập vào workspace này' },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // Lấy thông tin team
    const [team] = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(and(eq(teams.id, Number(teamId)), isNull(teams.deletedAt)))
      .limit(1);

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Workspace không tồn tại hoặc đã bị xóa' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Sinh JWT extension token chính thức (90 ngày)
    const expiresAt = new Date(Date.now() + EXTENSION_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const accessToken = await new SignJWT({
      teamId: team.id,
      userId: userId,
      type: 'extension', // Khớp với check in sync/route.ts
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${EXTENSION_TOKEN_EXPIRY_DAYS}d`)
      .sign(key);

    // Lưu hash token vào DB
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    await db.insert(extensionTokens).values({
      teamId: team.id,
      createdByUserId: userId,
      tokenHash,
      deviceName: 'Chrome Extension',
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        accessToken,
        teamId: team.id,
        teamName: team.name,
        expiresAt,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[extension select-workspace POST] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
