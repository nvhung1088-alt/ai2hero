import { Share2, Users, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function HeroSocialDashboard() {
  const stats = [
    { name: 'Người theo dõi mới', value: '+124', icon: Users, trend: '+12%' },
    { name: 'Lượt Tương Tác', value: '8.4K', icon: Activity, trend: '+24%' },
    { name: 'Bài Đăng Tuần Này', value: '12', icon: Share2, trend: '-2' },
    { name: 'Tỷ Lệ Chuyển Đổi', value: '4.2%', icon: BarChart3, trend: '+0.5%' },
  ];

  return (
    <div className="space-y-8 animate-fade-in p-2 lg:p-4">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Trạm Điều Khiển Social</h1>
        <p className="text-gray-400 mt-2 text-sm">Tổng quan hiệu suất đa kênh mạng xã hội hôm nay.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-900/50 border border-white/5 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {stat.name}
              </span>
              <div className="h-8 w-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-pink-500" />
              </div>
            </div>
            <div className="pt-4">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                <span className={stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>
                  {stat.trend}
                </span>
                <span>so với tháng trước</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-10 text-center shadow-inner">
        <div className="h-16 w-16 bg-white/[0.02] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl">
          <Share2 className="h-8 w-8 text-pink-500/50" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Chưa có kết nối nào</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
          Hãy kết nối Fanpage Facebook, Tiktok hoặc Zalo OA để bắt đầu theo dõi dữ liệu và tự động hóa.
        </p>
        <button className="px-6 py-2.5 bg-white text-gray-950 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors">
          Thêm Kết Nối Mới
        </button>
      </div>
    </div>
  );
}
