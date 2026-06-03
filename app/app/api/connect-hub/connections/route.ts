import { NextRequest, NextResponse } from 'next/server';
import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';
import { getUser } from '@/lib/db/queries';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập hệ thống.' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const activeTeamIdStr = cookieStore.get('activeTeamId')?.value;
    if (!activeTeamIdStr) {
      return NextResponse.json(
        { success: false, error: 'Chưa chọn Workspace hoạt động.' },
        { status: 400 }
      );
    }
    const teamId = parseInt(activeTeamIdStr);

    const rawConnections = await getConnectionsByTeam(teamId);

    // Che mờ và loại bỏ hoàn toàn encryptedCredentials khỏi payload trả về client
    const connections = rawConnections.map((conn) => ({
      id: conn.id,
      appSlug: conn.appSlug,
      appName: conn.appName,
      connectionName: conn.connectionName,
      authType: conn.authType,
      status: conn.status,
      usedByModules: conn.usedByModules,
      lastTestedAt: conn.lastTestedAt,
      lastUsedAt: conn.lastUsedAt,
      createdAt: conn.createdAt
    }));

    return NextResponse.json({ success: true, connections }, { status: 200 });
  } catch (err: any) {
    console.error('[connect-hub/connections GET] Lỗi:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi hệ thống khi tải danh sách kết nối.' },
      { status: 500 }
    );
  }
}
