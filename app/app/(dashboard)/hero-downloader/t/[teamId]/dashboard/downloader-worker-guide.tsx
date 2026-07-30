'use client';

import { useState } from 'react';
import { AlertCircle, Terminal, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import { generateDownloaderPairCodeAction } from '@/lib/db/hero-downloader-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface WorkerGuideProps {
  teamId: number;
}

export function DownloaderWorkerGuide({ teamId }: WorkerGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pairCode, setPairCode] = useState('');

  return (
    <div className="p-6 pb-0 shrink-0 space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-500/90 leading-relaxed">
          <span className="font-semibold text-amber-500">Lưu ý hệ thống:</span> Để tối ưu chi phí Máy chủ Đám mây (Vercel), hệ thống đã được thiết kế thuật toán ngủ đông thông minh. 
          Các lệnh như <strong className="text-amber-400">Tải ngay</strong>, <strong className="text-amber-400">Quét ngay</strong> hoặc cập nhật tiến độ % có thể <strong>chờ tối đa 30-60 giây</strong> mới phản hồi xuống Worker dưới máy bạn.
        </div>
      </div>

      <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-sm">
        <div 
          className="px-5 py-3 flex items-center justify-between bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-500" />
            Cài đặt Worker Downloader trên máy tính (Bắt buộc)
          </h2>
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>

        {isOpen && (
          <div className="p-5 bg-[#0a0f16]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Bước 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-xs">1</span>
                  Cài đặt & Khởi chạy Worker
                </div>
                <div className="text-xs text-gray-400 leading-relaxed space-y-1.5">
                  <p>1. Copy toàn bộ câu lệnh bên dưới.</p>
                  <p>2. Mở thư mục <strong>hero-downloader-worker</strong>, click vào thanh địa chỉ (Address bar) phía trên cùng của thư mục, gõ <strong>cmd</strong> và nhấn Enter.</p>
                  <p>3. Dán câu lệnh dưới đây vào màn hình đen vừa hiện ra và nhấn Enter để khởi chạy!</p>
                </div>
                <div className="bg-black/60 p-3 rounded-lg border border-white/10 font-mono text-xs text-gray-300 flex items-center justify-between gap-4 group">
                  <p className="break-all text-teal-400/90">cd OneDrive\Desktop\Ai2Hero\hero-downloader-worker &amp;&amp; python -m pip install -U -r requirements.txt &amp;&amp; python worker.py</p>
                  <button 
                    onClick={() => { navigator.clipboard.writeText('cd OneDrive\\Desktop\\Ai2Hero\\hero-downloader-worker && python -m pip install -U -r requirements.txt && python worker.py'); showToast('Đã copy câu lệnh', 'success'); }} 
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0" 
                    title="Copy lệnh"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-amber-400/90 leading-relaxed mt-4">
                  <p>💡 <strong>Muốn tải Douyin?</strong> Bạn không cần bẻ khóa nữa! Hãy cài đặt <strong>Extension AI2Hero</strong> vào trình duyệt Chrome để quét và lấy link MP4 gốc tự động 100%.</p>
                  <ol className="list-decimal pl-4 mt-2 space-y-1 text-gray-300">
                    <li>Mở tab mới, gõ <code className="bg-black/50 px-1 rounded text-teal-400">chrome://extensions/</code></li>
                    <li>Bật <strong>Developer mode</strong> (Góc trên bên phải)</li>
                    <li>Bấm <strong>Load unpacked</strong> (Góc trên bên trái)</li>
                    <li>Chọn thư mục tiện ích: <code className="bg-black/50 px-1 rounded text-teal-400">hero-downloader-extension</code> (hoặc <code className="bg-black/50 px-1 rounded text-teal-400">hero-video-assistant</code>) trên máy bạn</li>
                    <li>Ghim Extension lên góc phải Chrome. Mở kênh Douyin bất kỳ, lướt chuột và bấm nút đồng bộ!</li>
                  </ol>
                </div>
              </div>

              {/* Bước 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-xs">2</span>
                  Sinh mã liên kết (Pair Code)
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Mỗi Worker cần được xác thực vào dự án của bạn bằng 1 mã gồm 6 ký tự. Hãy tạo mã và nhập vào màn hình Console của Worker.
                </p>
                <div className="flex flex-col gap-3">
                  {pairCode ? (
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4 flex items-center justify-between">
                      <span className="text-2xl font-bold tracking-[0.2em] text-teal-400">{pairCode}</span>
                      <button onClick={() => { navigator.clipboard.writeText(pairCode); showToast('Đã copy mã liên kết', 'success'); }} className="p-2 text-teal-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-md transition-colors" title="Copy">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={async () => {
                        const res = await generateDownloaderPairCodeAction(teamId);
                        if (res.success && 'code' in res && res.code) {
                          setPairCode(res.code as string);
                          showToast('Đã sinh mã liên kết mới', 'success');
                        } else {
                          showToast('Lỗi: ' + res.error, 'error');
                        }
                      }} 
                      className="w-full py-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-medium rounded-lg transition-colors border border-teal-500/30 text-sm"
                    >
                      Tạo mã liên kết mới
                    </button>
                  )}
                  {pairCode && <p className="text-[10px] text-teal-500/70 text-center">Mã này sẽ hết hạn trong vòng 1 giờ tới.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
