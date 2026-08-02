import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { comparePasswords } from '@/lib/auth/password';
import { SignJWT } from 'jose';

const authSecret = process.env.AUTH_SECRET;
const key = authSecret ? new TextEncoder().encode(authSecret) : null;

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
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Thiếu email hoặc mật khẩu' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Tìm user hoạt động
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase().trim()), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email hoặc mật khẩu không đúng' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Kiểm tra password
    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Email hoặc mật khẩu không đúng' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Lấy danh sách các workspace (teams) của user
    const workspaces = await db
      .select({
        id: teams.id,
        name: teams.name,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, user.id), isNull(teams.deletedAt)));

    if (workspaces.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản của bạn chưa thuộc về bất kỳ workspace nào' },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // Tạo tempToken hết hạn trong 15 phút
    const tempToken = await new SignJWT({
      userId: user.id,
      type: 'extension_auth',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(key);

    return NextResponse.json(
      {
        success: true,
        tempToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        workspaces,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[extension auth POST] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
