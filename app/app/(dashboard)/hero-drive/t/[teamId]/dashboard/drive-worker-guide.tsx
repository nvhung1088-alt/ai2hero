'use client';

import { useState } from 'react';
import { AlertCircle, Terminal, ChevronUp, ChevronDown, Copy, CheckCircle2, HardDrive } from 'lucide-react';

interface WorkerGuideProps {
  teamId: number;
}

export function DriveWorkerGuide({ teamId }: WorkerGuideProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const commandText = 'cd /d "C:\\Users\\ADMIN\\OneDrive\\Desktop\\Ai2Hero" && python scripts/herodrive_worker.py --server https://ai2hero-flax.vercel.app';

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(commandText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 pb-0 shrink-0 space-y-4">
      {/* System Warning Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-500/90 leading-relaxed">
          <span className="font-semibold text-amber-500">Lưu ý hệ thống:</span> Để tối ưu chi phí Máy chủ Đám mây (Vercel), hệ thống đã được thiết kế thuật toán ngủ đông thông minh. 
          Các lệnh như <strong className="text-amber-400">Quét ngay</strong>, <strong className="text-amber-400">Tạm dừng</strong> hoặc cập nhật tiến độ % có thể <strong>chờ tối đa 30-60 giây</strong> mới phản hồi xuống Worker dưới máy bạn.
        </div>
      </div>

      {/* Collapsible Worker Setup Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div 
          className="px-5 py-3 flex items-center justify-between bg-slate-950/60 border-b border-slate-800 cursor-pointer hover:bg-slate-950/80 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            Cài đặt Worker Drive trên máy tính (Bắt buộc)
          </h2>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>

        {isOpen && (
          <div className="p-5 bg-slate-950/90 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bước 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">1</span>
                  Cài đặt & Khởi chạy Worker
                </div>
                <div className="text-xs text-slate-400 leading-relaxed space-y-1">
                  <p>1. Copy toàn bộ câu lệnh bên dưới (chọn 1 trong 2 máy chủ để chạy).</p>
                  <p>2. Bấm phím <strong>Windows + R</strong> ➔ gõ <strong>cmd</strong> ➔ nhấn Enter để mở Terminal.</p>
                  <p>3. Dán câu lệnh vào màn hình đen và nhấn Enter để khởi chạy Worker lập tức!</p>
                </div>

                <div className="space-y-2 mt-2">
                  <p className="text-[11px] text-emerald-400 font-medium">⚡ Cách 1: Chạy 1-Click bằng Shortcut (Nhanh nhất & Khuyên dùng)</p>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <p className="text-emerald-400 font-semibold">🖥️ Nhấp đúp biểu tượng <strong>CHAY_HERODRIVE_WORKER</strong> ngay trên màn hình Desktop của bạn.</p>
                    <p className="text-[11px] text-slate-400 font-mono">Hoặc mở file: <code>c:\Users\ADMIN\OneDrive\Desktop\Ai2Hero\CHAY_HERODRIVE_WORKER_LOCAL.bat</code></p>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  <p className="text-[11px] text-blue-400 font-medium">💻 Cách 2: Chạy bằng Terminal CMD</p>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between gap-4 group">
                    <p className="break-all text-blue-400 font-semibold">{commandText}</p>
                    <button 
                      onClick={handleCopyCommand}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors shrink-0 flex items-center gap-1 text-[11px]" 
                      title="Copy lệnh"
                    >
                      {copied ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đã copy!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bước 2 */}
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">2</span>
                  Cách Thức Tự Đồng Bộ & Tự Động Giải Phóng Đĩa C
                </div>
                <div className="text-xs text-slate-400 leading-relaxed space-y-2">
                  <p>• **Worker tự động quét**: Worker dưới máy bạn sẽ chạy ngầm theo chu kỳ cài đặt (VD: 10s, 1 phút, 1 giờ...).</p>
                  <p>• **Tự động gom nhóm**: Các file cùng tên (video, image, txt) trong thư mục local sẽ được gom thành **1 Bài Đăng MXH**.</p>
                  <p>• **Tự động xóa đĩa C**: Nếu bạn bật tùy chọn <i>"Tự động xóa file máy tính sau khi up"</i>, Worker sẽ tải file lên Google Drive của bạn rồi tự động giải phóng dung lượng đĩa C!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
