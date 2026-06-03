import { getUser } from '@/lib/db/queries';
import { getCurrentTeamId } from '@/lib/sim-helpers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { connectHubConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import MappingManagerClient from './mapping-manager-client';

export default async function MappingPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const teamId = await getCurrentTeamId();
  if (!teamId) {
    redirect('/dashboard');
  }

  // Lấy danh sách kết nối API của Workspace hiện tại
  const connections = await db.query.connectHubConnections.findMany({
    where: eq(connectHubConnections.teamId, teamId),
  });

  // Lọc ra các nền tảng duy nhất (chỉ những nền tảng nào có kết nối thì mới cấu hình)
  const uniqueAppsMap = new Map();
  connections.forEach(conn => {
    if (!uniqueAppsMap.has(conn.appSlug)) {
      uniqueAppsMap.set(conn.appSlug, {
        appSlug: conn.appSlug,
        appName: conn.appName,
        connectionId: conn.id // Truyền connectionId để client chạy dò dữ liệu mẫu
      });
    }
  });

  // TẠM THỜI CHÈN PANCAKE CHAT ĐỂ USER THẤY TRONG MAPPING
  if (!uniqueAppsMap.has('pancake-chat')) {
    uniqueAppsMap.set('pancake-chat', {
      appSlug: 'pancake-chat',
      appName: 'Pancake Chat (Chưa cấu hình API)',
      connectionId: 9999
    });
  }

  const connectedApps = Array.from(uniqueAppsMap.values());

  return (
    <div className="flex-1 w-full p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Chuẩn hóa dữ liệu POS</h1>
          <p className="text-gray-400">
            Cấu hình ánh xạ các trường dữ liệu từ API nguồn (như Pancake, KiotViet) sang định dạng chuẩn của Ai2Hero để sử dụng cho toàn hệ thống.
          </p>
        </div>

        <MappingManagerClient connectedApps={connectedApps} teamId={teamId} />
      </div>
    </div>
  );
}
