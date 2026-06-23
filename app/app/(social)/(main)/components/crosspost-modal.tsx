'use client';

import { useState, useEffect } from 'react';
import { X, Globe, Share2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { executeCrossPostAction, getConnectHubConnectionsAction } from '@/lib/db/social-crosspost-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface CrossPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  teamId: number;
}

export function CrossPostModal({ isOpen, onClose, postId, teamId }: CrossPostModalProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [selectedConnections, setSelectedConnections] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingConnections(true);
      getConnectHubConnectionsAction(teamId).then(data => {
        setConnections(data || []);
        setLoadingConnections(false);
      }).catch(() => {
        setConnections([]);
        setLoadingConnections(false);
      });
      setResults(null);
      setSelectedConnections([]);
    }
  }, [isOpen, teamId]);

  if (!isOpen) return null;

  const validConnections = connections.filter(c => 
    c.appSlug === 'facebook' || c.appSlug === 'zalo' || c.appSlug === 'tiktok' || c.appSlug === 'instagram'
  );

  const toggleConnection = (id: number) => {
    setSelectedConnections(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCrosspost = async () => {
    if (selectedConnections.length === 0) {
      showToast('Vui lòng chọn ít nhất một nền tảng', 'error');
      return;
    }

    setLoading(true);
    const destinations = selectedConnections.map(id => {
      const conn = connections.find(c => c.id === id);
      return {
        connectionId: id,
        platform: conn?.appSlug || 'unknown'
      };
    });

    try {
      const res = await executeCrossPostAction(postId, destinations, teamId);
      setResults(res);
      showToast('Đã gửi yêu cầu đăng chéo', 'success');
    } catch (e: any) {
      showToast('Lỗi khi đăng chéo: ' + e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#161618] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Share2 className="h-5 w-5 text-pink-500" />
            Đăng chéo lên mạng xã hội
          </h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {results ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/80 text-center mb-4">Kết quả đăng bài</h3>
              {results.map((r, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${r.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="flex items-center gap-3">
                    {r.success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="text-sm font-medium capitalize text-white">{r.platform}</span>
                  </div>
                  {!r.success && (
                    <span className="text-xs text-red-400 max-w-[150px] truncate" title={r.error}>{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Chọn các tài khoản mạng xã hội mà bạn muốn đăng chéo bài viết này.
              </p>
              
              {loadingConnections ? (
                <div className="p-4 text-center text-white/50 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải kết nối...
                </div>
              ) : validConnections.length === 0 ? (
                <div className="p-4 text-center rounded-xl border border-dashed border-white/20 bg-white/5 text-white/50 text-sm">
                  Chưa có kết nối mạng xã hội nào (Facebook, Zalo...). Vui lòng thiết lập trong Connect Hub.
                </div>
              ) : (
                <div className="space-y-2">
                  {validConnections.map(conn => (
                    <label key={conn.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedConnections.includes(conn.id) ? 'bg-pink-500/10 border-pink-500/30' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-white/20 text-pink-500 focus:ring-pink-500/50 bg-black"
                        checked={selectedConnections.includes(conn.id)}
                        onChange={() => toggleConnection(conn.id)}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <div className="font-medium text-white capitalize">{conn.name} ({conn.appSlug})</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex gap-3">
          <Button variant="ghost" className="flex-1 text-white/60 hover:text-white" onClick={onClose}>
            {results ? 'Đóng' : 'Hủy'}
          </Button>
          {!results && (
            <Button 
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white" 
              onClick={handleCrosspost}
              disabled={loading || selectedConnections.length === 0}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
              Đăng ngay
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
