'use client';

import React, { useState, useEffect } from 'react';
import { generateLinkCode } from '@/lib/db/extension-actions';
import { Key, Copy, Check, Loader2, Video, RefreshCw } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface PairingWidgetProps {
  teamId: number;
  userId: number;
}

export default function PairingWidget({ teamId, userId }: PairingWidgetProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Đếm ngược thời gian hết hạn của Code
  useEffect(() => {
    if (!expiresAt) return;

    const timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) {
        setCode(null);
        setExpiresAt(null);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const res = await generateLinkCode(teamId, userId);
      if (res.success && res.code && res.expiresAt) {
        setCode(res.code);
        setExpiresAt(new Date(res.expiresAt));
        setTimeLeft(Math.max(0, Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000)));
        showToast('Đã sinh mã liên kết mới thành công!', 'success');
      } else {
        showToast(res.error || 'Lỗi sinh mã liên kết.', 'error');
      }
    } catch (err) {
      console.error('Pairing widget error:', err);
      showToast('Lỗi hệ thống khi tạo mã.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast('Đã sao chép mã liên kết!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-4">
      <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Video className="h-3.5 w-3.5 text-violet-500" />
        Liên kết App Local (Tauri/Electron)
      </h3>
      
      <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
        Đồng bộ kịch bản, ảnh và video trực tiếp từ App Render local về workspace này. Sinh mã 6 ký tự để kết nối thiết bị của bạn.
      </p>

      {code ? (
        <div className="bg-black/35 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center space-y-3 relative overflow-hidden animate-fade-in">
          <div className="absolute top-1 right-2 text-[9px] text-gray-500 font-bold">
            Hết hạn trong: <span className="text-amber-500">{formatTime(timeLeft)}</span>
          </div>

          <span className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500 select-all">
            {code}
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-200 hover:text-white transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                Đã sao chép mã
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Sao chép mã liên kết
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={handleGenerateCode}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-violet-500/10 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tạo mã...
            </>
          ) : (
            <>
              <Key className="h-4 w-4" />
              Sinh mã liên kết (Link Code)
            </>
          )}
        </button>
      )}

      {code && (
        <button
          type="button"
          onClick={handleGenerateCode}
          disabled={loading}
          className="text-[9px] text-gray-500 hover:text-gray-300 font-bold flex items-center gap-1 cursor-pointer mx-auto"
        >
          <RefreshCw className="h-2.5 w-2.5" /> Tạo lại mã mới
        </button>
      )}
    </div>
  );
}
