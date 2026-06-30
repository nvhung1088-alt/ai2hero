'use client';

import { useState } from 'react';
import { Save, Terminal, Code2, Server, Settings, ShieldCheck, FolderOpen, Check, Search, Download, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import { updateDownloaderSettingsAction, createDownloaderCookieAction, deleteDownloaderCookieAction, generateDownloaderPairCodeAction } from '@/lib/db/hero-downloader-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export default function DownloaderSettingsClient({ 
  teamId,
  initialSettings,
  initialCookies = []
}: { 
  teamId: number;
  initialSettings?: any;
  initialCookies?: any[];
}) {
  const [activeTab, setActiveTab] = useState<'general' | 'advanced'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isWorkerSetupOpen, setIsWorkerSetupOpen] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [settings, setSettings] = useState(() => {
    if (initialSettings) {
      return {
        maxConcurrentScans: initialSettings.maxConcurrentScans ?? 5,
        maxConcurrentDownloads: initialSettings.maxConcurrentDownloads ?? 3,
        autoStartWorker: initialSettings.autoStartWorker === 1,
      };
    }
    return {
      maxConcurrentScans: 5,
      maxConcurrentDownloads: 3,
      autoStartWorker: true,
    };
  });
  const [cookies, setCookies] = useState<any[]>(initialCookies);
  
  const [newCookieName, setNewCookieName] = useState('');
  const [newCookieData, setNewCookieData] = useState('');
  const [isAddingCookie, setIsAddingCookie] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateDownloaderSettingsAction(teamId, settings);
    if (res.success) {
      showToast('Lưu cài đặt thành công', 'success');
      setTimeout(() => setIsSaving(false), 1000);
    } else {
      showToast('Lỗi khi lưu cài đặt: ' + res.error, 'error');
      setIsSaving(false);
    }
  };

  const handleAddCookie = async () => {
    if (!newCookieName || !newCookieData) {
      showToast('Vui lòng nhập đủ tên và nội dung Cookie', 'error');
      return;
    }
    setIsAddingCookie(true);
    const res = await createDownloaderCookieAction({ teamId, name: newCookieName, cookieData: newCookieData });
    if (res.success && res.cookie) {
      showToast('Thêm Cookie thành công', 'success');
      setCookies([res.cookie, ...cookies]);
      setNewCookieName('');
      setNewCookieData('');
    } else {
      showToast('Lỗi: ' + res.error, 'error');
    }
    setIsAddingCookie(false);
  };

  const handleDeleteCookie = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xoá Cookie này?')) return;
    const res = await deleteDownloaderCookieAction(id, teamId);
    if (res.success) {
      setCookies(cookies.filter(c => c.id !== id));
      showToast('Đã xoá Cookie', 'success');
    } else {
      showToast('Lỗi: ' + res.error, 'error');
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-6 h-6 text-teal-500" />
          Cài đặt Ứng dụng & Quản lý Cookie
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          Quản lý thư mục lưu trữ mặc định, giới hạn băng thông, và thiết lập Cookie trình duyệt dùng cho Worker tải video.
        </p>
      </div>

      {/* Settings Panel */}
      <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex border-b border-white/5 bg-white/[0.02] px-4 overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Cài đặt Chung
          </button>
          <button 
            onClick={() => setActiveTab('advanced')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'advanced' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Quản lý Cookie (Get cookies.txt)
          </button>
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Default Save Path */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-teal-500" /> Thư mục lưu Video mặc định
                </h3>
                <div className="flex gap-2">
                  <input type="text" defaultValue="D:\Downloads\HeroVideo" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-teal-500/50 transition-colors" />
                  <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-lg transition-colors whitespace-nowrap border border-white/10">
                    Duyệt...
                  </button>
                </div>
                <p className="text-xs text-gray-500">Thư mục này sẽ được chọn mặc định mỗi khi tạo dự án quét tải mới.</p>
              </div>

              <div className="h-px bg-white/5 w-full" />

              {/* Concurrent Limits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-teal-500" /> Tác vụ quét đồng thời
                  </h3>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Số luồng Chrome ẩn mở ra để phân tích và bóc tách link video cùng lúc.</p>
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-teal-500/50 transition-colors"
                    value={settings.maxConcurrentScans}
                    onChange={(e) => setSettings({ ...settings, maxConcurrentScans: parseInt(e.target.value) })}
                  >
                    <option value={2}>2 tác vụ</option>
                    <option value={5}>5 tác vụ (Khuyên dùng)</option>
                    <option value={10}>10 tác vụ (Cần CPU mạnh)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-teal-500" /> Tác vụ tải đồng thời
                  </h3>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Số lượng video được phép tải về máy tính cùng một lúc (tránh nghẽn mạng).</p>
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-teal-500/50 transition-colors"
                    value={settings.maxConcurrentDownloads}
                    onChange={(e) => setSettings({ ...settings, maxConcurrentDownloads: parseInt(e.target.value) })}
                  >
                    <option value={1}>1 video</option>
                    <option value={3}>3 video (Khuyên dùng)</option>
                    <option value={5}>5 video (Mạng khoẻ)</option>
                    <option value={10}>10 video</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-500" /> Tự động khởi động
                  </h3>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Tự động bật sẵn Worker chạy ngầm khi mở máy tính.</p>
                  <div className="flex items-center gap-3 h-[42px] px-1">
                    <input 
                      type="checkbox" 
                      checked={settings.autoStartWorker} 
                      onChange={(e) => setSettings({ ...settings, autoStartWorker: e.target.checked })}
                      className="w-4 h-4 rounded bg-black/40 border-white/10 text-teal-500 focus:ring-teal-500/50" 
                    />
                    <span className="text-sm text-gray-300">Chạy ngầm ở Taskbar</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5 w-full" />

              {/* Hướng dẫn cài đặt Worker (Mặc định ẩn) */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                <button 
                  onClick={() => setIsWorkerSetupOpen(!isWorkerSetupOpen)}
                  className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-teal-500" />
                    <span className="font-semibold text-white">Cài đặt Worker Downloader trên máy tính (Bắt buộc)</span>
                  </div>
                  {isWorkerSetupOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                
                {isWorkerSetupOpen && (
                  <div className="p-5 border-t border-white/5 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Bước 1 */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                          <span className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-xs">1</span>
                          Cài đặt & Khởi chạy Worker
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Tải thư mục <strong>hero-downloader-worker</strong> về máy tính. Mở Terminal/CMD tại thư mục đó và chạy lệnh sau để cài đặt thư viện:
                        </p>
                        <div className="bg-black/50 p-3 rounded-lg border border-white/5 font-mono text-xs text-gray-300">
                          <p>pip install -r requirements.txt</p>
                          <p className="mt-2 text-teal-500/50"># Sau đó khởi chạy worker</p>
                          <p>python worker.py</p>
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
                                if (res.success && res.code) {
                                  setPairCode(res.code);
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
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300 font-medium leading-relaxed">
                  <p className="text-teal-400 font-bold mb-1">Hướng dẫn lấy Cookie bằng tiện ích "Get cookies.txt":</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Cài đặt tiện ích <strong>Get cookies.txt LOCALLY</strong> trên Chrome.</li>
                    <li>Đăng nhập vào trang web cần tải video (VD: Tiktok, Douyin).</li>
                    <li>Bấm vào icon tiện ích và chọn <strong>Export</strong> để copy toàn bộ mã Netscape Cookie.</li>
                    <li>Dán mã vừa copy vào ô bên dưới, đặt tên gợi nhớ và lưu lại để sử dụng cho dự án quét.</li>
                  </ol>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Add new cookie form */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-teal-500" /> Thêm Cookie Mới
                  </h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Tên gợi nhớ (VD: Tiktok Acc 1)</label>
                    <input 
                      type="text" 
                      value={newCookieName}
                      onChange={(e) => setNewCookieName(e.target.value)}
                      placeholder="Nhập tên Cookie..." 
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Nội dung Cookie (Netscape format)</label>
                    <textarea 
                      rows={6} 
                      value={newCookieData}
                      onChange={(e) => setNewCookieData(e.target.value)}
                      className="w-full bg-[#0a0f16] border border-white/10 rounded-xl p-4 text-sm text-teal-400 font-mono focus:outline-none focus:border-teal-500/50 transition-colors custom-scrollbar"
                      placeholder="# Netscape HTTP Cookie File&#10;..."
                    ></textarea>
                  </div>
                  <button 
                    onClick={handleAddCookie}
                    disabled={isAddingCookie}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/10 transition-colors text-sm hover:border-teal-500/50 hover:text-teal-400 disabled:opacity-50"
                  >
                    {isAddingCookie ? 'Đang thêm...' : 'Thêm vào danh sách'}
                  </button>
                </div>

                {/* Saved cookies list */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-teal-500" /> Danh sách Cookie đã lưu
                  </h3>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                    {cookies.length === 0 && (
                      <div className="text-gray-500 text-sm py-4">Chưa có Cookie nào được lưu.</div>
                    )}
                    {cookies.map(cookie => (
                      <div key={cookie.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-200">{cookie.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cookie.status === 'alive' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : cookie.status === 'dead' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
                            Trạng thái: {cookie.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Cập nhật: {new Date(cookie.createdAt).toLocaleDateString()}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-teal-400 hover:text-teal-300 transition-colors font-medium">Check Live</button>
                            <span className="text-white/20">|</span>
                            <button onClick={() => handleDeleteCookie(cookie.id)} className="text-red-400 hover:text-red-300 transition-colors font-medium">Xoá</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 md:px-8 py-5 border-t border-white/5 bg-black/20 flex items-center justify-end gap-3">
          <button className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            Khôi phục mặc định
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all font-bold text-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Check className="w-4 h-4 animate-in zoom-in" /> Đã lưu thành công!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Lưu Cài đặt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
