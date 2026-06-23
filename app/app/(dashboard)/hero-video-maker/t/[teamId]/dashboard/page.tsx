import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, extensionTokens, videoProjects } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import Link from 'next/link';
import { Video, Film, Laptop, Plus, Settings, Play, ShieldAlert, Cpu } from 'lucide-react';
import PairingWidget from './pairing-widget';

export const revalidate = 0;

export default async function HeroVideoMakerDashboard({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // IDOR Protection: Verify user belongs to this team
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)),
  });
  
  if (!membership) {
    redirect('/dashboard');
  }

  const teamList = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  const team = teamList[0];

  if (!team) {
    redirect('/dashboard');
  }

  // Lấy danh sách thiết bị render đã liên kết (extensionTokens)
  const linkedDevices = await db.select()
    .from(extensionTokens)
    .where(and(eq(extensionTokens.teamId, teamId)))
    .orderBy(desc(extensionTokens.createdAt));

  // Lấy danh sách dự án
  const projects = await db.select()
    .from(videoProjects)
    .where(eq(videoProjects.teamId, teamId))
    .orderBy(desc(videoProjects.createdAt));

  const stats = {
    totalProjects: projects.length,
    renderedVideos: projects.filter(p => p.status === 'done').length,
    activeDevicesCount: linkedDevices.length,
    storageDestination: 'Cloud / Local'
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#08080c] p-6 lg:p-8 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Bảng điều khiển HeroVideoMaker AI
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Tạo video ngắn hàng loạt bằng AI. Soạn kịch bản, sinh ảnh và render tự động ngay trên máy tính của bạn.
            </p>
          </div>
          <div>
            <Link
              href={`/hero-video-maker/t/${teamId}/projects`}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-violet-500/10 transition-all select-none cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Soạn Video Mới
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tổng dự án</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white">{stats.totalProjects}</span>
              <span className="text-[10px] text-gray-500 font-bold">bản nháp</span>
            </div>
          </div>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Đã render</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{stats.renderedVideos}</span>
              <span className="text-[10px] text-gray-500 font-bold">video thành phẩm</span>
            </div>
          </div>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Thiết bị render</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white">{stats.activeDevicesCount}</span>
              <span className="text-[10px] text-gray-500 font-bold">đã liên kết</span>
            </div>
          </div>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nơi lưu trữ</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xs font-black text-gray-200 truncate max-w-[120px]">{stats.storageDestination}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area: Recent Projects & Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 shadow-sm backdrop-blur-xl space-y-6">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Video className="h-4 w-4 text-violet-400" />
                Dự án video gần đây
              </h2>

              {projects.length === 0 ? (
                <div className="border border-dashed border-white/5 rounded-xl py-12 px-4 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-extrabold text-gray-200">Chưa có dự án nào</h3>
                    <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed font-medium">
                      Bắt đầu soạn kịch bản video AI đầu tiên của bạn để tạo ra những video ngắn viral.
                    </p>
                  </div>
                  <Link
                    href={`/hero-video-maker/t/${teamId}/projects`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold transition-all"
                  >
                    Mở trình quản lý
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map(p => (
                    <Link key={p.id} href={`/hero-video-maker/t/${teamId}/editor/${p.id}`} className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 group-hover:scale-110 transition-transform">
                          <Film size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{p.title}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 font-bold uppercase tracking-wider">
                        {p.status || 'draft'}
                      </div>
                    </Link>
                  ))}
                  {projects.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href={`/hero-video-maker/t/${teamId}/projects`} className="text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors">
                        Xem tất cả dự án →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area: Pairing & Devices */}
          <div className="space-y-6">
            
            {/* Pairing Widget */}
            <PairingWidget teamId={teamId} userId={user.id} />

            {/* Linked Devices Status */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Laptop className="h-3.5 w-3.5 text-violet-400" />
                Thiết bị render đang chạy
              </h3>

              {linkedDevices.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/5 rounded-xl space-y-2">
                  <Cpu className="h-5 w-5 text-gray-600 mx-auto" />
                  <p className="text-[10px] text-gray-500 font-medium max-w-[180px] mx-auto leading-relaxed">
                    Chưa có ứng dụng render local nào được kết nối với workspace này.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {linkedDevices.map((dev) => (
                    <div key={dev.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-gray-200 truncate">{dev.deviceName || 'Thiết bị Tauri'}</p>
                        <p className="text-[9px] text-gray-500">
                          Kết nối: {dev.createdAt ? new Date(dev.createdAt).toLocaleDateString('vi-VN') : 'Mới'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] text-emerald-400 font-bold uppercase">Online</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Guide */}
            <div className="bg-violet-950/20 border border-violet-500/10 rounded-2xl p-5 space-y-3">
              <h4 className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Hướng dẫn nhanh
              </h4>
              <ol className="text-[10px] text-gray-400 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                <li>Tải xuống file chạy Renderer App về máy tính</li>
                <li>Chạy ứng dụng và nhập mã Liên kết 6 chữ số ở trên</li>
                <li>Tạo dự án mới, soạn kịch bản và sinh ảnh trên AI2Hero Web</li>
                <li>Bấm Render, App local sẽ tự tải ảnh, ghép video bằng FFmpeg và đẩy lên Drive/Lưu máy</li>
              </ol>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
