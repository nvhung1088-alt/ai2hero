'use client';

import React from 'react';
import {
  X,
  Laptop,
  Terminal,
  Copy,
  Check
} from 'lucide-react';

interface DubGuidePanelProps {
  showGuide: boolean;
  guideOs: 'windows' | 'macos';
  setGuideOs: (_os: 'windows' | 'macos') => void;
  guideCopied: boolean;
  handleToggleGuide: () => void;
  handleCopyGuideCommand: () => void;
}

export default function DubGuidePanel({
  showGuide,
  guideOs,
  setGuideOs,
  guideCopied,
  handleToggleGuide,
  handleCopyGuideCommand,
}: DubGuidePanelProps) {
  if (!showGuide) return null;

  const winCmd = 'curl -o herodub-setup.bat https://ai2hero-flax.vercel.app/uploads/herodub-setup.bat?v=10 & herodub-setup.bat --server https://ai2hero-flax.vercel.app';
  const macCmd = 'curl -o herodub-setup.sh https://www.ai2hero.com/uploads/herodub-setup.sh && chmod +x herodub-setup.sh && ./herodub-setup.sh';

  return (
    <div className="bg-gray-900/60 border border-amber-500/30 p-5 rounded-2xl shadow-sm mb-6 animate-fade-in relative backdrop-blur-sm">
      <button
        onClick={handleToggleGuide}
        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-wrap items-center gap-4 mb-3">
        <h2 className="text-lg font-black text-white">Quy Trình & Lợi Ích Của Local Worker</h2>
        <div className="bg-black/50 border border-white/5 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setGuideOs('windows')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              guideOs === 'windows' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Laptop className="h-3.5 w-3.5" /> Windows
          </button>
          <button
            onClick={() => setGuideOs('macos')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              guideOs === 'macos' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" /> Mac / Linux
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-300 mb-6 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed">
        <span className="text-amber-500 font-bold">💡 Tại sao cần Local Worker?</span> Bằng cách chạy phần mềm trên máy tính cá nhân của bạn, Worker tận dụng tài nguyên (CPU/GPU) có sẵn để xử lý nhận dạng âm thanh (ASR) và Render Video tốc độ cao hoàn toàn miễn phí. Hơn nữa, nó giúp tự động hóa việc quét thư mục, xử lý hàng loạt hàng trăm video cùng lúc mà không cần treo trình duyệt.
      </div>

      <div className="flex items-start gap-4">
        <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
          1
        </span>
        <div className="space-y-4 w-full">
          <h3 className="text-sm font-extrabold text-white">Tải và khởi chạy tự động</h3>
          {guideOs === 'windows' ? (
            <p className="text-xs text-gray-400 leading-relaxed font-medium mb-3">
              Nhấn phím <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/5">Win + R</kbd> gõ <code className="text-amber-400 font-mono bg-black/40 px-1 rounded">cmd</code> rồi dán lệnh dưới đây vào cửa sổ đen (chọn 1 trong 2 máy chủ):
            </p>
          ) : (
            <p className="text-xs text-gray-400 leading-relaxed font-medium mb-3">
              Mở ứng dụng <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/5 text-amber-400">Terminal</kbd> và dán dòng lệnh dưới đây (chọn 1 trong 2 máy chủ):
            </p>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-green-400 font-medium mb-1.5">Cách 1: Tải và cài đặt mới (Chạy lần đầu)</p>
              <div className="bg-black border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4 font-mono text-green-400/90 text-[11px] shadow-inner">
                <span className="select-all overflow-x-auto whitespace-nowrap">
                  {guideOs === 'windows' ? 'curl -o herodub-setup.bat https://ai2hero-flax.vercel.app/uploads/herodub-setup.bat?v=10 & herodub-setup.bat --server https://ai2hero-flax.vercel.app' : 'curl -o herodub-setup.sh https://ai2hero-flax.vercel.app/uploads/herodub-setup.sh && chmod +x herodub-setup.sh && ./herodub-setup.sh --server https://ai2hero-flax.vercel.app'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(guideOs === 'windows' ? 'curl -o herodub-setup.bat https://ai2hero-flax.vercel.app/uploads/herodub-setup.bat?v=10 & herodub-setup.bat --server https://ai2hero-flax.vercel.app' : 'curl -o herodub-setup.sh https://ai2hero-flax.vercel.app/uploads/herodub-setup.sh && chmod +x herodub-setup.sh && ./herodub-setup.sh --server https://ai2hero-flax.vercel.app');
                    handleCopyGuideCommand();
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Sao chép lệnh"
                >
                  {guideCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-amber-500 font-medium mb-1.5">Cách 2: Khởi chạy lại (Nếu đã cài đặt trước đó)</p>
              <div className="bg-black/80 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 font-mono text-amber-500/90 text-[11px] shadow-inner">
                <span className="select-all overflow-x-auto whitespace-nowrap">
                  {guideOs === 'windows' ? 'cd /d "%USERPROFILE%\\HeroDubWorker" && python herodub_worker.py' : 'cd ~/HeroDubWorker && python3 herodub_worker.py'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(guideOs === 'windows' ? 'cd /d "%USERPROFILE%\\HeroDubWorker" && python herodub_worker.py' : 'cd ~/HeroDubWorker && python3 herodub_worker.py');
                    handleCopyGuideCommand();
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Sao chép lệnh"
                >
                  {guideCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-cyan-400 font-medium mb-1.5">Cách 3 (Song Song): Chạy thêm Worker #2 (Đa luồng)</p>
              <div className="bg-black/80 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-between gap-4 font-mono text-cyan-400/90 text-[11px] shadow-inner">
                <span className="select-all overflow-x-auto whitespace-nowrap">
                  {guideOs === 'windows' ? 'curl -o herodub-setup.bat https://ai2hero-flax.vercel.app/uploads/herodub-setup.bat?v=11 & herodub-setup.bat --server https://ai2hero-flax.vercel.app --port 3002' : 'curl -o herodub-setup.sh https://ai2hero-flax.vercel.app/uploads/herodub-setup.sh && chmod +x herodub-setup.sh && ./herodub-setup.sh --server https://ai2hero-flax.vercel.app --port 3002'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(guideOs === 'windows' ? 'curl -o herodub-setup.bat https://ai2hero-flax.vercel.app/uploads/herodub-setup.bat?v=11 & herodub-setup.bat --server https://ai2hero-flax.vercel.app --port 3002' : 'curl -o herodub-setup.sh https://ai2hero-flax.vercel.app/uploads/herodub-setup.sh && chmod +x herodub-setup.sh && ./herodub-setup.sh --server https://ai2hero-flax.vercel.app --port 3002');
                    handleCopyGuideCommand();
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Sao chép lệnh Worker 2"
                >
                  {guideCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4 mt-5 pt-5 border-t border-white/5">
        <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
          2
        </span>
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-white">Nhập Mã liên kết vào màn hình đen</h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            Copy <b className="text-amber-400">Mã liên kết (Worker) 6 chữ số</b> ở góc phải phía trên màn hình Dashboard và dán vào cửa sổ đen CMD để kết nối.
          </p>
        </div>
      </div>
    </div>
  );
}
