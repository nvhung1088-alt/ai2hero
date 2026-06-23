import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { Laptop, Cpu, Wifi } from 'lucide-react';
import PairingWidget from '../dashboard/pairing-widget';
import { Card } from '@/components/ui/card';

export default async function DevicesPage(props: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await props.params;
  const tid = parseInt(teamId, 10);
  
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">
            Quản lý Thiết bị & Render Farm Local
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Ghép nối các máy tính cấu hình cao của bạn để tạo thành mạng lưới render video tốc độ cao, tiết kiệm chi phí Server.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cột trái: Cấu hình Pairing */}
          <div className="md:col-span-1 space-y-6">
            <PairingWidget teamId={tid} userId={user.id} />
            
            <Card className="p-5 border-white/[0.05] bg-white/[0.01] space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Cpu size={14} className="text-fuchsia-400" />
                Tại sao cần App Local?
              </h3>
              <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
                <li>• Khai thác sức mạnh Card Đồ Họa (GPU) của máy tính cá nhân.</li>
                <li>• Tự động tải ảnh, video và render các scene không tốn phí Cloud.</li>
                <li>• Bảo mật dữ liệu tuyệt đối (Local-first).</li>
                <li>• Bạn có thể tải <a href="#" className="text-fuchsia-400 hover:underline">Hero Renderer App</a> tại đây.</li>
              </ul>
            </Card>
          </div>

          {/* Cột phải: Danh sách thiết bị */}
          <div className="md:col-span-2">
            <Card className="p-0 border-white/[0.05] bg-white/[0.01] overflow-hidden min-h-[400px] flex flex-col">
              <div className="p-4 border-b border-white/[0.05] bg-black/20 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300">Thiết bị đang ghép nối</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                  <Wifi size={10} /> Online: 0
                </span>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white/[0.02] p-6 rounded-full mb-4 border border-white/[0.05]">
                  <Laptop size={48} className="text-slate-600" />
                </div>
                <h4 className="text-slate-300 font-bold mb-2">Chưa có thiết bị nào hoạt động</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Hãy cài đặt Hero Renderer App trên máy tính của bạn và nhập Mã Liên Kết 6 số để bắt đầu chia sẻ sức mạnh phần cứng.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
