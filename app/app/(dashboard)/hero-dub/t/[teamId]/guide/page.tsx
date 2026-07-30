'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, Terminal, Laptop, Copy, Check } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export default function HeroDubGuidePage() {
  const params = useParams();
  const teamId = params?.teamId || '1';
  
  const [selectedOs, setSelectedOs] = useState<'windows' | 'macos'>('windows');
  const [copiedText, setCopiedText] = useState(false);

  const winCommand = `curl -o herodub-setup.bat https://www.ai2hero.com/uploads/herodub-setup.bat & herodub-setup.bat`;
  const macCommand = `curl -o herodub-setup.sh https://www.ai2hero.com/uploads/herodub-setup.sh && chmod +x herodub-setup.sh && ./herodub-setup.sh`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    showToast('Đã sao chép câu lệnh thành công!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in text-white">
      {/* Navigation & Header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-5">
        <Link
          href={`/hero-dub/t/${teamId}/dashboard`}
          className="p-2 hover:bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight">Hướng Dẫn Cài Đặt HeroDub Worker</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Cài đặt máy xử lý local (worker) cực kỳ nhanh chóng chỉ với 1-2 bước.
          </p>
        </div>
      </div>

      {/* OS Tab Selector */}
      <div className="bg-white/[0.02] border border-white/5 p-1 rounded-xl flex gap-1 w-full max-w-md mx-auto">
        <button
          onClick={() => setSelectedOs('windows')}
          className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedOs === 'windows'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Laptop className="h-4 w-4" />
          Máy tính Windows (🪟)
        </button>
        <button
          onClick={() => setSelectedOs('macos')}
          className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedOs === 'macos'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Terminal className="h-4 w-4" />
          Máy tính MacBook (🍎)
        </button>
      </div>

      {/* Windows Guide */}
      {selectedOs === 'windows' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gray-900/40 border border-white/5 p-6 rounded-2xl shadow-sm space-y-6">
            
            <div className="flex items-start gap-4">
              <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                1
              </span>
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-white">Mở cửa sổ dòng lệnh (CMD)</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  - Nhấn phím <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/5 text-[10px]">Windows + R</kbd> trên bàn phím để mở hộp thoại Run.<br/>
                  - Gõ chữ <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-400 font-mono">cmd</code> và nhấn nút <b>Enter</b> để mở cửa sổ đen CMD.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 border-t border-white/5 pt-5">
              <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                2
              </span>
              <div className="space-y-2 w-full">
                <h3 className="text-sm font-extrabold text-white">Copy và dán lệnh sau để tự động tải & chạy</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium mb-3">
                  Copy câu lệnh dưới đây, dán (Ctrl+V hoặc Click chuột phải) vào cửa sổ đen CMD và nhấn <b>Enter</b>:
                </p>
                
                <div className="bg-black/80 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 font-mono text-amber-400 text-xs">
                  <span className="select-all overflow-x-auto whitespace-nowrap">
                    {winCommand}
                  </span>
                  <button
                    onClick={() => handleCopy(winCommand)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Sao chép"
                  >
                    {copiedText ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 italic mt-2">
                  * Lệnh này sẽ tự động tải file setup mới nhất và chạy ngay lập tức tại thư mục hiện tại.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* macOS Guide */}
      {selectedOs === 'macos' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gray-900/40 border border-white/5 p-6 rounded-2xl shadow-sm space-y-6">
            
            <div className="flex items-start gap-4">
              <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                1
              </span>
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-white">Mở Terminal</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Nhấn tổ hợp phím <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/5 text-[10px]">Command + Space</kbd>, gõ <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400 font-mono">terminal</code> và nhấn <b>Enter</b>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 border-t border-white/5 pt-5">
              <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                2
              </span>
              <div className="space-y-2 w-full">
                <h3 className="text-sm font-extrabold text-white">Copy và dán lệnh cài đặt tự động</h3>
                <p className="text-xs text-gray-400 font-medium mb-3">
                  Copy và dán duy nhất một dòng lệnh sau vào Terminal và nhấn <b>Enter</b>:
                </p>
                
                <div className="bg-black/80 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 font-mono text-amber-400 text-xs">
                  <span className="select-all overflow-x-auto whitespace-nowrap">
                    {macCommand}
                  </span>
                  <button
                    onClick={() => handleCopy(macCommand)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Sao chép"
                  >
                    {copiedText ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Common Warning */}
      <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-400 leading-normal font-bold">
          Sau khi tải về và chạy thành công, công cụ sẽ yêu cầu bạn nhập <b>Mã liên kết</b>. Hãy lấy mã ghép nối từ màn hình Dashboard để kết nối máy tính này với hệ thống.
        </p>
      </div>
    </div>
  );
}
