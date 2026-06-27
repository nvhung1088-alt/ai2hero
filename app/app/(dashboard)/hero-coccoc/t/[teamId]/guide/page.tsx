'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Laptop, Terminal, Copy, Check, HelpCircle, Key, Info, CheckCircle2 } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { generateCoccocPairingCodeAction } from '@/lib/db/hero-coccoc-actions';

export default function HeroCoccocGuidePage() {
  const params = useParams();
  const teamIdStr = params?.teamId || '1';
  const teamId = parseInt(teamIdStr as string, 10);
  const router = useRouter();

  const [selectedOs, setSelectedOs] = useState<'windows' | 'macos'>('windows');
  const [copiedText, setCopiedText] = useState(false);
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

  const [origin, setOrigin] = useState('https://www.ai2hero.com');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const winCommand = `curl -o coccoc-setup.bat ${origin}/uploads/coccoc-setup.bat & coccoc-setup.bat`;
  const macCommand = `curl -o coccoc-setup.sh ${origin}/uploads/coccoc-setup.sh && chmod +x coccoc-setup.sh && ./coccoc-setup.sh`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    showToast('Đã sao chép câu lệnh thành công!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleGenerateCode = async () => {
    setPairingLoading(true);
    try {
      // mock userId for pairing (Server action only needs teamId to save code)
      const result = await generateCoccocPairingCodeAction(teamId, 1);
      if (result.error) {
        showToast(result.error, 'error');
      } else if (result.code) {
        setPairingCode(result.code);
        setCountdown(300); // 5 minutes
        showToast('Sinh mã kết nối thành công!', 'success');
      }
    } catch (err: any) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in text-white">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-5">
        <Link
          href={`/hero-coccoc/t/${teamId}/dashboard`}
          className="p-2 hover:bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight">Hướng Dẫn Cài Đặt Cốc Cốc Downloader Worker</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Thiết lập script cào video tự động chạy ngầm cục bộ trên máy tính của bạn.
          </p>
        </div>
      </div>

      {/* OS Tab Selector */}
      <div className="bg-white/[0.02] border border-white/5 p-1 rounded-xl flex gap-1 w-full max-w-md mx-auto">
        <button
          onClick={() => setSelectedOs('windows')}
          className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
            selectedOs === 'windows'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Laptop className="h-4 w-4" />
          Máy tính Windows (🪟)
        </button>
        <button
          onClick={() => setSelectedOs('macos')}
          className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
            selectedOs === 'macos'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Terminal className="h-4 w-4" />
          Máy tính MacBook (🍎)
        </button>
      </div>

      {/* Guide Steps */}
      <div className="bg-gray-900/40 border border-white/5 p-6 rounded-2xl shadow-sm space-y-6">
        
        {/* Step 1: Open Terminal */}
        <div className="flex items-start gap-4">
          <span className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
            1
          </span>
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold text-white">Mở Cửa sổ Dòng lệnh (CMD / Terminal)</h3>
            {selectedOs === 'windows' ? (
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                - Nhấn tổ hợp phím <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/5 text-[10px]">Windows + R</kbd> để mở hộp thoại Run.<br/>
                - Gõ chữ <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-400 font-mono">cmd</code> và nhấn <b>Enter</b> để mở cửa sổ đen CMD.
              </p>
            ) : (
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                - Nhấn tổ hợp phím <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/5 text-[10px]">Command + Space</kbd> để mở Spotlight.<br/>
                - Gõ chữ <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-400 font-mono">terminal</code> và nhấn <b>Enter</b>.
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Run Command */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-5">
          <span className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
            2
          </span>
          <div className="space-y-2 w-full">
            <h3 className="text-sm font-extrabold text-white">Sao chép & dán lệnh cài đặt</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium mb-3">
              Copy câu lệnh dưới đây, dán vào cửa sổ Terminal/CMD và nhấn <b>Enter</b> để script tự động thiết lập:
            </p>
            
            <div className="bg-black/80 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-4 font-mono text-emerald-400 text-xs">
              <span className="select-all overflow-x-auto whitespace-nowrap scrollbar-thin">
                {selectedOs === 'windows' ? winCommand : macCommand}
              </span>
              <button
                onClick={() => handleCopy(selectedOs === 'windows' ? winCommand : macCommand)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Sao chép câu lệnh"
              >
                {copiedText ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 italic mt-2">
              * Lệnh này sẽ tự động tải file khởi chạy, tải môi trường Python và thư viện Playwright cần thiết.
            </p>
          </div>
        </div>

        {/* Step 3: Enter Link Code */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-5">
          <span className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
            3
          </span>
          <div className="space-y-3 w-full">
            <h3 className="text-sm font-extrabold text-white">Nhập Mã liên kết khi script yêu cầu</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Khi script chạy trên máy tính, nó sẽ yêu cầu bạn nhập Mã liên kết (6 chữ số). Hãy sinh mã và dán vào script để ghép nối:
            </p>

            <div className="flex items-center gap-4">
              {pairingCode ? (
                <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-6 font-mono text-emerald-400 text-xs">
                  <div>
                    Mã liên kết của bạn: <span className="text-sm font-black tracking-widest text-white">{pairingCode}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Hết hạn sau {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCode}
                  disabled={pairingLoading}
                  className="flex items-center gap-2 py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 cursor-pointer transition-all"
                >
                  <Key className="h-3.5 w-3.5" />
                  {pairingLoading ? 'Đang tạo...' : 'Sinh mã liên kết mới'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* FAQ Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2 select-none">
          <HelpCircle className="h-4.5 w-4.5 text-emerald-400" />
          Câu hỏi thường gặp (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              q: "Worker Cốc Cốc hoạt động như thế nào?",
              a: "Worker chạy nền trên máy bạn. Đến lịch trình, nó tự động mở Cốc Cốc thông qua Playwright, cuộn cào link video và bấm Savior để download video về máy bạn."
            },
            {
              q: "Có cần tắt trình duyệt Cốc Cốc khi chạy không?",
              a: "Không cần. Tuy nhiên khuyên dùng Profile phụ (tạo thêm trong Cốc Cốc) để tránh tranh chấp lock database SQLite Chromium khi mở đồng thời."
            },
            {
              q: "Video tải về lưu ở đâu?",
              a: "Lưu cục bộ tại thư mục (Folder Path) mà bạn đã chỉ định khi tạo Dự Án quét. Hệ thống không tải file lên server để tiết kiệm băng thông và bộ nhớ cho bạn."
            },
            {
              q: "Script CMD có an toàn không?",
              a: "Hoàn toàn an toàn. Câu lệnh CMD chỉ tải file batch setup và chạy script Python Playwright mã nguồn mở thực tế trên máy bạn, không can thiệp hệ thống."
            }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {faq.q}
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
