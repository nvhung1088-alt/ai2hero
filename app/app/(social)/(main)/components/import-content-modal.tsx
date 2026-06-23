'use client';

import React, { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, X, Facebook } from 'lucide-react';
import { getConnectHubConnectionsAction } from '@/lib/db/social-crosspost-actions';
import { syncSocialContentAction } from '@/lib/db/social-import-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface ImportContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
}

export function ImportContentModal({ isOpen, onClose, teamId }: ImportContentModalProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen, teamId]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await getConnectHubConnectionsAction(teamId);
      setConnections(res || []);
    } catch (error) {
      showToast('Lỗi tải danh sách kết nối MXH.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (connId: number, platform: string) => {
    if (platform !== 'facebook') {
      showToast('Nền tảng này chưa hỗ trợ đồng bộ tự động.', 'error');
      return;
    }

    setSyncingId(connId);
    try {
      const res = await syncSocialContentAction({ connectionId: connId, platform, teamId });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(res.success || 'Đồng bộ thành công!', 'success');
        onClose();
        // Refresh the page or feed to show new posts
        window.location.reload();
      }
    } catch (error) {
      showToast('Đã xảy ra lỗi khi đồng bộ.', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 animate-scale-up z-10 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white leading-tight">Kéo Nội Dung Về</h3>
              <p className="text-xs text-gray-400">Đồng bộ bài viết từ mạng xã hội</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center p-6 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-gray-400 text-sm mb-3">Bạn chưa có kết nối MXH nào.</p>
              <a href="/connect-hub" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors">
                Kết Nối Ngay
              </a>
            </div>
          ) : (
            connections.map(conn => (
              <div 
                key={conn.id} 
                className="flex items-center justify-between p-4 bg-gray-950 border border-white/10 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  {conn.appSlug === 'facebook' ? (
                    <Facebook className="w-8 h-8 text-blue-500" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold uppercase">
                      {conn.appSlug.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white">{conn.connectionName}</h4>
                    <p className="text-xs text-gray-400 capitalize">{conn.appSlug}</p>
                  </div>
                </div>

                {conn.appSlug === 'facebook' ? (
                  <button
                    disabled={syncingId === conn.id}
                    onClick={() => handleSync(conn.id, conn.appSlug)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {syncingId === conn.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-4 h-4" />
                    )}
                    Đồng bộ
                  </button>
                ) : (
                  <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">Chưa hỗ trợ</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
