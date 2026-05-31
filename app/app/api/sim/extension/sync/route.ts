import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { db } from '@/lib/db/drizzle';
import {
  simLinkedAccounts,
  simAssets,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptField, decryptField } from '@/lib/sim-crypto';

// CORS headers — Extension cần cross-origin access
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

// Helper: Extract Bearer Token từ Authorization header
function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/sim/extension/sync — Extension lấy danh sách tài khoản
export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Thiếu Bearer Token' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Token không hợp lệ' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Lấy danh sách tài khoản từ DB
    const rawAccounts = await db
      .select({
        id: simLinkedAccounts.id,
        platformKey: simLinkedAccounts.platformKey,
        accountName: simLinkedAccounts.accountName,
        loginUrl: simLinkedAccounts.loginUrl,
        username: simLinkedAccounts.username,
        encryptedPassword: simLinkedAccounts.encryptedPassword,
        loginEmail: simLinkedAccounts.loginEmail,
        notes: simLinkedAccounts.notes,
        linkedPhoneAssetId: simLinkedAccounts.linkedPhoneAssetId,
        importanceLevel: simLinkedAccounts.importanceLevel,
        status: simLinkedAccounts.status,
        updatedAt: simLinkedAccounts.updatedAt,
      })
      .from(simLinkedAccounts)
      .where(eq(simLinkedAccounts.teamId, auth.teamId));

    // Giải mã password server-side trước khi gửi về Extension
    // Kênh truyền bảo mật: HTTPS + Bearer Token 90 ngày
    // Extension sẽ mã hóa lại bằng Master PIN (AES-GCM) ở local cache
    const accounts = rawAccounts.map((acc) => {
      let password: string | null = null;
      if (acc.encryptedPassword) {
        try {
          password = decryptField(acc.encryptedPassword);
        } catch {
          // Dữ liệu cũ chưa mã hóa — giữ nguyên
          password = acc.encryptedPassword;
        }
      }
      return {
        id: acc.id,
        platformKey: acc.platformKey,
        accountName: acc.accountName,
        loginUrl: acc.loginUrl,
        username: acc.username,
        password, // Đã giải mã — plaintext
        loginEmail: acc.loginEmail,
        notes: acc.notes,
        linkedPhoneAssetId: acc.linkedPhoneAssetId,
        importanceLevel: acc.importanceLevel,
        status: acc.status,
        updatedAt: acc.updatedAt,
      };
    });

    return NextResponse.json(
      {
        success: true,
        teamId: auth.teamId,
        accounts,
        lastSync: new Date().toISOString(),
        count: accounts.length,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[sync/route GET] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// POST /api/sim/extension/sync — Extension đẩy tài khoản mới lên server
export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Thiếu Bearer Token' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Token không hợp lệ' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const { accounts } = body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Danh sách tài khoản trống' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Lấy SIM đầu tiên của workspace làm default linkedPhoneAssetId
    const [firstAsset] = await db
      .select({ id: simAssets.id })
      .from(simAssets)
      .where(eq(simAssets.teamId, auth.teamId))
      .limit(1);

    if (!firstAsset) {
      return NextResponse.json(
        { success: false, error: 'Workspace chưa có SIM nào. Vui lòng thêm SIM trước.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let synced = 0;

    for (const account of accounts) {
      const { platformKey, accountName, username, password, loginUrl } = account;
      if (!platformKey || !accountName) continue;

      // Mật khẩu từ Extension gửi lên là plaintext trong HTTPS body
      // Server mã hóa AES-256-CBC trước khi lưu DB
      const encryptedPassword = password ? encryptField(password) : null;

      // Tìm tài khoản trùng (platformKey + username)
      const [existing] = await db
        .select({ id: simLinkedAccounts.id })
        .from(simLinkedAccounts)
        .where(
          and(
            eq(simLinkedAccounts.teamId, auth.teamId),
            eq(simLinkedAccounts.platformKey, platformKey),
            eq(simLinkedAccounts.username, username || '')
          )
        )
        .limit(1);

      if (existing) {
        // Update tài khoản đã có
        await db
          .update(simLinkedAccounts)
          .set({
            accountName,
            loginUrl: loginUrl || undefined,
            ...(encryptedPassword ? { encryptedPassword } : {}),
            updatedAt: new Date(),
          })
          .where(eq(simLinkedAccounts.id, existing.id));
      } else {
        // Tạo mới tài khoản
        await db.insert(simLinkedAccounts).values({
          teamId: auth.teamId,
          platformKey,
          accountName,
          username: username || '',
          loginUrl: loginUrl || null,
          encryptedPassword,
          linkedPhoneAssetId: firstAsset.id,
          importanceLevel: 'medium',
          status: 'active',
        });
      }

      synced++;
    }

    return NextResponse.json(
      { success: true, synced, message: `Đã đồng bộ ${synced} tài khoản` },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[sync/route POST] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
