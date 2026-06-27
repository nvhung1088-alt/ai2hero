'use client';

import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Terminal, 
  Plus, 
  Trash2, 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  User,
  Folder,
  Activity
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { 
  createCoccocProfileAction, 
  deleteCoccocProfileAction, 
  generateCoccocPairingCodeAction 
} from '@/lib/db/hero-coccoc-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Profile {
  id: number;
  name: string;
  userDataPath: string;
  profileDir: string;
  status: string;
  createdAt: Date;
}

interface Worker {
  id: number;
  deviceName: string | null;
  platform: string | null;
  version: string | null;
  status: string;
  lastSeenAt: Date | null;
}

interface Task {
  id: number;
  videoUrl: string;
  videoTitle: string | null;
  status: string;
  createdAt: Date;
}

interface DashboardClientProps {
  teamId: number;
  userId: number;
  profiles: Profile[];
  worker: Worker | null;
  projectCount: number;
  tasks: { status: string }[];
  recentTasks: Task[];
}

export default function DashboardClient({
  teamId,
  userId,
  profiles,
  worker,
  projectCount,
  tasks,
  recentTasks,
}: DashboardClientProps) {
  const router = useRouter();
  
  // State for Add Profile Modal
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [userDataPath, setUserDataPath] = useState('C:\\Users\\ADMIN\\AppData\\Local\\CocCoc\\Browser\\User Data');
  const [profileDir, setProfileDir] = useState('Default');
  const [submitting, setSubmitting] = useState(false);

  // State for Pairing Worker
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Sync countdown for pairing code
  useEffect(() => {
    if (countdown <= 0) {
      setPairingCode(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle Add Profile
  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !userDataPath) {
      showToast('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createCoccocProfileAction({
        teamId,
        userId,
        name: profileName,
        userDataPath,
        profileDir,
      });

      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Đã thêm Profile Cốc Cốc thành công!', 'success');
        setShowAddProfile(false);
        setProfileName('');
        router.refresh();
      }
    } catch (err: any) {
      showToast('Có lỗi xảy ra: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Profile
  const handleDeleteProfile = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa Profile này không?')) return;

    try {
      const result = await deleteCoccocProfileAction(id, teamId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Đã xóa Profile thành công!', 'success');
        router.refresh();
      }
    } catch (err: any) {
      showToast('Không thể xóa Profile: ' + err.message, 'error');
    }
  };

  // Generate pairing code
  const handleGenerateCode = async () => {
    setPairingLoading(true);
    try {
      const result = await generateCoccocPairingCodeAction(teamId, userId);
      if (result.error) {
        showToast(result.error, 'error');
      } else if (result.code) {
        setPairingCode(result.code);
        setCountdown(300); // 5 minutes
        showToast('Đã sinh mã liên kết mới!', 'success');
      }
    } catch (err: any) {
      showToast('Lỗi sinh mã: ' + err.message, 'error');
    } finally {
      setPairingLoading(false);
    }
  };

  // Calculate KPIs
  const totalDownloaded = tasks.filter(t => t.status === 'completed').length;
  const queueCount = tasks.filter(t => ['pending', 'scanning', 'downloading'].includes(t.status)).length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-white animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            🚀 Hero Cốc Cốc Dashboard
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Hệ thống tự động hóa cào và tải video hàng loạt sử dụng lõi trình duyệt Cốc Cốc.
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
          title="Tải lại trang"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Worker Connection Bar */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 ${
        worker 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : 'bg-rose-500/5 border-rose-500/20'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
              worker 
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
            }`}>
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black flex items-center gap-2">
                Trạng thái Worker Local: 
                <span className={worker ? 'text-emerald-400' : 'text-rose-400'}>
                  {worker ? `Đang trực tuyến (${worker.deviceName})` : 'Ngoại tuyến (Offline)'}
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {worker 
                  ? `OS: ${worker.platform} | Version: ${worker.version} | Trực tuyến lúc ${new Date(worker.lastSeenAt || '').toLocaleTimeString()}`
                  : 'Vui lòng kết nối Worker chạy trên máy tính Windows của bạn để bắt đầu tải.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            {pairingCode ? (
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center gap-4 font-mono text-emerald-400 text-xs w-full justify-between">
                <div>
                  Mã kết nối: <span className="text-sm font-bold tracking-widest text-white">{pairingCode}</span>
                </div>
                <div className="text-[10px] text-gray-400 shrink-0">
                  Hết hạn sau {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={pairingLoading}
                className="flex items-center justify-center gap-2 w-full md:w-auto py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 cursor-pointer select-none transition-all"
              >
                <Key className="h-4 w-4" />
                {pairingLoading ? 'Đang sinh mã...' : 'Kết nối Worker mới'}
              </button>
            )}
            {!worker && (
              <Link
                href={`/hero-coccoc/t/${teamId}/guide`}
                className="flex items-center justify-center gap-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white shrink-0 cursor-pointer"
              >
                Hướng dẫn <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng dự án', value: projectCount, desc: 'Dự án đang cấu hình', color: 'text-emerald-400' },
          { label: 'Video đã tải', value: totalDownloaded, desc: 'Tải thành công về máy', color: 'text-teal-400' },
          { label: 'Trong hàng đợi', value: queueCount, desc: 'Đang đợi quét hoặc tải', color: 'text-amber-400' },
          { label: 'Tác vụ lỗi', value: failedCount, desc: 'Thất bại hoặc bị bỏ qua', color: 'text-rose-400' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 select-none">{kpi.label}</p>
            <h3 className={`text-2xl font-black mt-2 tracking-tight ${kpi.color}`}>{kpi.value}</h3>
            <p className="text-[10px] text-gray-500 font-medium mt-1">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Profiles & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profiles Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-400" />
              Cấu hình Profiles Cốc Cốc
            </h2>
            <button
              onClick={() => setShowAddProfile(true)}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[11px] font-black text-emerald-400 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm Profile
            </button>
          </div>

          {profiles.length === 0 ? (
            <div className="bg-white/[0.01] border border-dashed border-white/5 rounded-2xl p-8 text-center text-gray-500 space-y-3">
              <Laptop className="h-8 w-8 mx-auto text-gray-600" />
              <p className="text-xs font-medium">Chưa cấu hình Profile Cốc Cốc nào trong dự án.</p>
              <p className="text-[10px] text-gray-600">Bạn cần khai báo Profile trình duyệt để Worker biết đường dẫn mở Cốc Cốc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((prof) => (
                <div key={prof.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-white truncate">{prof.name}</span>
                      <span className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                        {prof.profileDir}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Thư mục chứa dữ liệu (User Data)</p>
                      <p className="text-[11px] text-gray-400 font-mono break-all line-clamp-2 bg-black/20 p-2 rounded-lg border border-white/5">
                        {prof.userDataPath}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-white/5 pt-3">
                    <button
                      onClick={() => handleDeleteProfile(prof.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Xóa Profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Tác vụ mới nhất
          </h2>

          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-4 min-h-[250px]">
            {recentTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-12 space-y-2">
                <Folder className="h-8 w-8 mx-auto text-gray-600" />
                <p className="text-xs font-medium">Chưa có tác vụ tải nào được tạo.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentTasks.map((task) => (
                  <div key={task.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-white truncate">
                        {task.videoTitle || 'Đang cào thông tin...'}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5">
                        {task.videoUrl}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                      task.status === 'completed' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : task.status === 'failed'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : task.status === 'downloading'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Profile Modal */}
      {showAddProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-5">
            <div>
              <h3 className="text-base font-black">Khai báo Profile Cốc Cốc</h3>
              <p className="text-xs text-gray-400 mt-1">
                Khai báo thông số trình duyệt Cốc Cốc trên máy cục bộ của bạn.
              </p>
            </div>

            <form onSubmit={handleAddProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400">Tên gợi nhớ Profile</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Profile chính, Profile 1,..."
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400">Đường dẫn User Data (Local)</label>
                <input
                  type="text"
                  required
                  placeholder="Đường dẫn đến thư mục User Data của Cốc Cốc"
                  value={userDataPath}
                  onChange={(e) => setUserDataPath(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500 italic mt-1 leading-relaxed">
                  * Mặc định trên Windows: <code className="bg-black/30 px-1 py-0.5 rounded select-all font-mono">C:\Users\Tên-User\AppData\Local\CocCoc\Browser\User Data</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400">Tên thư mục Profile</label>
                <input
                  type="text"
                  required
                  placeholder="Mặc định: Default"
                  value={profileDir}
                  onChange={(e) => setProfileDir(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500 italic mt-1 leading-relaxed">
                  * Trình duyệt Cốc Cốc lưu thư mục profile đầu tiên là <code className="bg-black/30 px-1 py-0.5 rounded font-mono">Default</code>. Các profile tạo thêm sẽ là <code className="bg-black/30 px-1 py-0.5 rounded font-mono">Profile 1</code>, <code className="bg-black/30 px-1 py-0.5 rounded font-mono">Profile 2</code>.
                </p>
              </div>

              <div className="flex gap-3 justify-end border-t border-white/5 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddProfile(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Xác nhận Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
