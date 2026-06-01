'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export function ExtensionStatusBadge({ teamId, workspaceSlug }: { teamId: number | string, workspaceSlug: string }) {
  const [status, setStatus] = useState<'not_installed' | 'not_logged_in' | 'wrong_team' | 'connected' | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Lắng nghe tín hiệu trả lời từ Extension
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'HERO_VIDEO_EXT_PING') {
        clearTimeout(timeoutId);
        const { hasAuth, teamId: extTeamId } = event.data;
        if (!hasAuth) {
           setStatus('not_logged_in');
        } else if (teamId && extTeamId && extTeamId != teamId) {
           setStatus('wrong_team');
        } else {
           setStatus('connected');
           window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER', workspaceSlug, open: false }, window.location.origin);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);

    // Phát tín hiệu kiểm tra kèm thông tin Slug
    window.postMessage({ type: 'HERO_VIDEO_EXT_CHECK', workspaceSlug }, window.location.origin);
    
    // Nếu sau 800ms không có ai trả lời -> Chưa cài đặt
    timeoutId = setTimeout(() => {
       setStatus(prev => (prev === null ? 'not_installed' : prev));
    }, 800);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [teamId, workspaceSlug]);

  if (status === null) return null;

  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-inner" title="Đã đồng bộ với Extension">
        <CheckCircle2 className="w-3.5 h-3.5" /> Extension Đã Kết Nối
      </span>
    );
  }

  // Gộp tất cả các trạng thái Lỗi thành một thông báo chung
  return (
    <Link 
      href="https://chromewebstore.google.com" 
      target="_blank"
      className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition-colors shadow-inner"
      title={
        status === 'not_installed' ? "Bạn chưa cài đặt Extension AI2Hero" : 
        status === 'not_logged_in' ? "Vui lòng mở Extension và Đăng nhập" : 
        "Tài khoản trên Extension không khớp với Website"
      }
    >
      <XCircle className="w-3.5 h-3.5" /> Chưa Kết Nối Extension
    </Link>
  );
}
