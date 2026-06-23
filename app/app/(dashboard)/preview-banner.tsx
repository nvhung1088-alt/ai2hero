'use client';

import { disablePreviewModeAction } from '@/lib/preview-actions';
import { Eye, LogOut } from 'lucide-react';

export function PreviewBanner({ appId }: { appId: string }) {
  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-xs font-bold z-50 fixed top-0 inset-x-0">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 animate-pulse" />
        <span>BẠN ĐANG TRONG CHẾ ĐỘ XEM TRƯỚC ỨNG DỤNG. Mọi thao tác đều là thật trên không gian thử nghiệm.</span>
      </div>
      <button 
        onClick={() => disablePreviewModeAction(appId)}
        className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-md transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" />
        Thoát Xem Trước
      </button>
    </div>
  );
}
