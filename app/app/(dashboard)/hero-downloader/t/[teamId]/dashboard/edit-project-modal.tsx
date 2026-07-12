'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, FolderOpen, Chrome, Edit3 } from 'lucide-react';
import { updateDownloaderProjectAction, deleteDownloaderProjectAction } from '@/lib/db/hero-downloader-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  cookies?: any[];
  project: any;
  onProjectUpdated?: (project: any) => void;
}

export function EditProjectModal({ isOpen, onClose, teamId, cookies = [], project, onProjectUpdated }: EditProjectModalProps) {
  const [sources, setSources] = useState([{ type: 'channel', value: '', label: '' }]);
  const [selectedCookies, setSelectedCookies] = useState<number[]>([]);
  const [isCookieDropdownOpen, setIsCookieDropdownOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [localFolder, setLocalFolder] = useState('');
  const [scanInterval, setScanInterval] = useState('Mỗi 1 giờ');
  const [quality, setQuality] = useState('Tốt nhất (No Watermark)');
  const [maxScanVideos, setMaxScanVideos] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (project) {
      setProjectName(project.name || '');
      setSources(project.settings?.sources || [{ type: 'channel', value: project.sourceUrl || '', label: '' }]);
      setSelectedCookies(project.settings?.cookies || []);
      setLocalFolder(project.settings?.localFolder || '');
      setScanInterval(project.settings?.scanInterval || 'Mỗi 1 giờ');
      setQuality(project.settings?.quality || 'Tốt nhất (No Watermark)');
      setMaxScanVideos(project.settings?.maxScanVideos || 50);
    }
  }, [project]);

  const toggleCookie = (id: number) => {
    setSelectedCookies(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleUpdate = async () => {
    if (!projectName || sources.filter(s => s.value).length === 0) {
      showToast('Vui lòng nhập tên dự án và ít nhất 1 nguồn quét', 'error');
      return;
    }

    setIsSaving(true);
    // Update the project (using the first source as sourceUrl for now as MVP)
    const firstSource = sources.filter(s => s.value)[0];
    const res = await updateDownloaderProjectAction(project.id, teamId, {
      name: projectName,
      platform: firstSource.value.includes('tiktok') ? 'tiktok' : firstSource.value.includes('douyin') ? 'douyin' : 'custom',
      sourceUrl: firstSource.value,
      settings: {
        cookies: selectedCookies,
        localFolder,
        scanInterval,
        quality,
        maxScanVideos,
        sources
      }
    });

    if (res.success && res.project) {
      showToast('Cập nhật dự án thành công', 'success');
      onProjectUpdated?.(res.project);
      onClose();
    } else {
      showToast('Lỗi khi cập nhật dự án: ' + res.error, 'error');
    }
    setIsSaving(false);
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-teal-500"></span>
            Sửa dự án Quét Tải
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Thông tin cơ bản */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">1. Thông tin cơ bản</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-xs text-gray-400 font-medium">Tên dự án</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="VD: Tiktok Hot Trend"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Chrome className="w-3.5 h-3.5 text-teal-500" />
                  Cookie Trình duyệt (Chrome)
                </label>
                <div className="relative">
                  <div 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus-within:border-teal-500/50 transition-colors cursor-pointer flex items-center justify-between"
                    onClick={() => setIsCookieDropdownOpen(!isCookieDropdownOpen)}
                  >
                    <span className="truncate">
                      {selectedCookies.length === 0 
                        ? '-- Chọn Cookie từ Extension --' 
                        : `Đã chọn ${selectedCookies.length} Cookie`}
                    </span>
                    <span className="text-gray-500 text-xs">▼</span>
                  </div>
                  
                  {isCookieDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsCookieDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-20">
                        <div className="max-h-48 overflow-y-auto relative z-20">
                          {cookies.length === 0 && (
                          <div className="p-3 text-xs text-gray-500">Chưa có Cookie nào. Vui lòng thêm trong phần Cài đặt.</div>
                        )}
                        {cookies.map(cookie => (
                          <div 
                            key={cookie.id}
                            onClick={() => toggleCookie(cookie.id)}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-white/5 flex items-center gap-2 ${selectedCookies.includes(cookie.id) ? 'bg-teal-500/10 text-teal-400' : 'text-gray-300'}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCookies.includes(cookie.id) ? 'border-teal-500 bg-teal-500' : 'border-gray-500'}`}>
                              {selectedCookies.includes(cookie.id) && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            {cookie.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs text-gray-400 font-medium">Đường dẫn lưu cục bộ (Local Folder)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={localFolder}
                    onChange={(e) => setLocalFolder(e.target.value)}
                    placeholder="D:\Video\Tiktok\"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none transition-colors font-mono"
                  />
                  <button className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm">Chọn</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lịch & Bộ lọc */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">2. Lịch quét & Bộ lọc</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Chu kỳ quét</label>
                <select 
                  value={scanInterval}
                  onChange={(e) => setScanInterval(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                >
                  <option value="Mỗi 1 giờ">Mỗi 1 giờ</option>
                  <option value="Mỗi 6 giờ">Mỗi 6 giờ</option>
                  <option value="Mỗi 24 giờ">Mỗi 24 giờ</option>
                  <option value="Chỉ quét 1 lần">Chỉ quét 1 lần</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Chất lượng tải</label>
                <select 
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                >
                  <option value="Tốt nhất (No Watermark)">Tốt nhất (No Watermark)</option>
                  <option value="Tiêu chuẩn">Tiêu chuẩn</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Giới hạn video/lần quét</label>
                <input 
                  type="number" 
                  value={maxScanVideos}
                  onChange={(e) => setMaxScanVideos(parseInt(e.target.value) || 50)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Nguồn quét */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">3. Nguồn Quét Tải</h3>
              <button 
                onClick={() => setSources([...sources, { type: 'channel', value: '', label: '' }])}
                className="flex items-center gap-1.5 text-xs font-medium text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1.5 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm nguồn
              </button>
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
              <table className="w-full text-left">
                <thead className="bg-white/[0.02] border-b border-white/5">
                  <tr>
                    <th className="py-2 px-3 text-xs font-medium text-gray-400 w-32">Phân loại</th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-400">URL / Từ khóa</th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-400 w-48">Nhãn gợi nhớ</th>
                    <th className="py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sources.map((source, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <select 
                          value={source.type || 'channel'}
                          onChange={(e) => {
                            const newSources = [...sources];
                            newSources[idx].type = e.target.value;
                            setSources(newSources);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-xs text-gray-200"
                        >
                          <option value="channel">Link Kênh</option>
                          <option value="playlist">Danh sách phát / Collection</option>
                          <option value="keyword">Từ khóa</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={source.value}
                          onChange={(e) => {
                            const newSources = [...sources];
                            newSources[idx].value = e.target.value;
                            setSources(newSources);
                          }}
                          placeholder="VD: https://space.bilibili.com/... hoặc link Danh sách phát..."
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          placeholder="Kênh review đồ ăn"
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => setSources(sources.filter((_, i) => i !== idx))}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-gray-500">
                        Chưa có nguồn quét nào. Hãy thêm nguồn để tải video.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <button 
            onClick={async () => {
              if (!confirm('Bạn có chắc chắn muốn xóa dự án này và toàn bộ video bên trong? Hành động này không thể hoàn tác!')) return;
              setIsDeleting(true);
              const res = await deleteDownloaderProjectAction(project.id, teamId);
              if (res.success) {
                showToast('Đã xóa dự án', 'success');
                onProjectUpdated?.(null); // passing null or triggering refresh
                onClose();
              } else {
                showToast('Lỗi khi xóa dự án: ' + res.error, 'error');
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting || isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Đang xóa...' : 'Xóa dự án'}
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleUpdate}
              disabled={isSaving || isDeleting}
              className="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg shadow-[0_0_15px_rgba(20,184,166,0.2)] transition-all font-medium text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
