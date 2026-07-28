'use client';

import { useState, useEffect } from 'react';
import { 
  syncYoutubeChannelAction, 
  getAiConnectionsAction,
  getSyncChannelsAction,
  saveSyncChannelAction,
  toggleSyncChannelAction,
  deleteSyncChannelAction,
  manualTriggerSyncChannelAction,
  getPublishTargetsAction,
  batchTranslateChannelAiAction
} from '@/lib/db/youtube-sync-actions';
import { Youtube, X, Loader2, CheckCircle2, AlertCircle, Settings2, Sparkles, Play, Save, Share2 } from 'lucide-react';

export function YoutubeSyncModal({ 
  teamId, 
  creatorId, 
  isOpen, 
  onClose,
  onSuccess 
}: { 
  teamId: number;
  creatorId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'manage' | 'manual'>('manage');
  const [channels, setChannels] = useState<any[]>([]);

  const [channelUrl, setChannelUrl] = useState('');
  
  // Basic Settings
  const [fetchAll, setFetchAll] = useState(false);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<'publishing' | 'draft'>('draft');
  const [category, setCategory] = useState('other');
  
  // AI Rewrite
  const [rewriteTitle, setRewriteTitle] = useState(true);
  const [aiList, setAiList] = useState<any[]>([]);
  const [aiConnectionId, setAiConnectionId] = useState<number | null>(null);

  // Publish Targets
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [publishTargets, setPublishTargets] = useState<{type: 'team'|'page'|'group', id: number | null, name: string}[]>([{ type: 'team', id: teamId, name: 'Bảng tin Team' }]);

  // Advanced Filters
  const [minViews, setMinViews] = useState(0);
  const [timeRange, setTimeRange] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');

  const [isSyncing, setIsSyncing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchChannels = async () => {
    const res = await getSyncChannelsAction(teamId);
    if (res.success && res.channels) setChannels(res.channels);
  };

  useEffect(() => {
    if (isOpen) {
      getAiConnectionsAction(teamId).then(list => {
        setAiList(list);
        if (list.length > 0) setAiConnectionId(list[0].id);
      });
      fetchChannels();
      // Lấy danh sách Group & Pages để đăng bài
      if (creatorId) {
        getPublishTargetsAction(parseInt(creatorId)).then(res => {
          if (res.success) {
            setAvailablePages(res.pages || []);
            setAvailableGroups(res.groups || []);
          }
        });
      }
    }
  }, [isOpen, teamId, creatorId]);

  if (!isOpen) return null;

  const handleSaveAuto = async () => {
    if (!channelUrl) { setError('Vui lòng nhập link Kênh Youtube'); return; }
    setError('');
    setIsSyncing(true);
    setStatusText('Đang lưu cấu hình kênh tự động...');
    
    const filters = { 
      limit: fetchAll ? 'all' : limit, 
      minViews, 
      timeRange, 
      durationFilter, 
      status, 
      category, 
      rewriteTitle, 
      useAiTitle: rewriteTitle,
      aiConnectionId,
      publishTargets
    };
    
    const res = await saveSyncChannelAction(teamId, { channelUrl, filters });
    if (res.success) {
       setStatusText('Đã lưu kênh thành công!');
       await fetchChannels();
       setTimeout(() => { 
         setIsSyncing(false); 
         setActiveTab('manage'); 
       }, 1000);
    } else {
       setError(res.error || 'Lỗi lưu kênh');
       setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    if (!channelUrl) {
      setError('Vui lòng nhập link Kênh Youtube');
      return;
    }
    setError('');
    setResults(null);
    setIsSyncing(true);
    setStatusText('Đang quét kênh và đồng bộ dữ liệu. Quá trình lấy tất cả video có thể mất vài phút...');

    try {
      const filters = { 
        limit: fetchAll ? 'all' : limit, 
        minViews, 
        timeRange, 
        durationFilter,
        status,
        category,
        rewriteTitle,
        useAiTitle: rewriteTitle,
        aiConnectionId,
        publishTargets
      };
      // @ts-ignore
      const res = await syncYoutubeChannelAction(channelUrl, filters, teamId, creatorId);
      if (res.success) {
        setResults(res.data || []);
        if ((res.count || 0) === 0 && (res.alreadyExists || 0) > 0) {
           setStatusText(`Đã tìm thấy ${res.alreadyExists} video, nhưng TẤT CẢ đều đã có trong hệ thống.`);
        } else if ((res.count || 0) > 0 && (res.alreadyExists || 0) > 0) {
           setStatusText(`Đã kéo ${res.count} video mới (bỏ qua ${res.alreadyExists} video cũ).`);
        } else {
           setStatusText(`Đã cào và đồng bộ thành công ${res.count} video.`);
        }
        onSuccess();
      } else {
        setError(res.error || 'Đã có lỗi xảy ra.');
        setStatusText('');
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
      setStatusText('');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSyncing && onClose()} />
      <div className="relative w-full max-w-xl bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <Youtube className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Đồng Bộ Kênh Youtube</h2>
              <p className="text-xs text-gray-400">Tự động lấy video & tạo film</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSyncing}
            className="p-2 hover:bg-white/5 rounded-full transition text-gray-400 hover:text-white disabled:opacity-50 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        {!results && !isSyncing && (
          <div className="flex gap-6 border-b border-white/10 mb-2">
            <button 
              onClick={() => setActiveTab('manage')} 
              className={`pb-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'manage' ? 'text-white border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
            >
              Kênh Tự Động
            </button>
            <button 
              onClick={() => {
                setChannelUrl('');
                setActiveTab('manual');
              }} 
              className={`pb-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'manual' ? 'text-white border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
            >
              Thêm Kênh / Quét thủ công
            </button>
          </div>
        )}

        {/* TAB 1: MANAGE CHANNELS */}
        {activeTab === 'manage' && !results && !isSyncing && (
           <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
             {channels.length === 0 ? (
               <div className="py-12 flex flex-col items-center justify-center text-center bg-white/5 border border-white/10 rounded-xl border-dashed">
                 <Settings2 className="w-8 h-8 text-gray-600 mb-3" />
                 <p className="text-gray-400 text-sm mb-2">Chưa có kênh Youtube nào được đặt tự động.</p>
                 <button onClick={() => setActiveTab('manual')} className="text-red-400 font-bold text-xs hover:underline hover:text-red-300">
                    Chuyển sang Cài đặt để Thêm kênh đầu tiên
                 </button>
               </div>
             ) : (
               channels.map(c => (
                 <div key={c.id} className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate">{c.channelName}</div>
                      <a href={c.channelUrl} target="_blank" className="text-xs text-blue-400 hover:underline truncate block mb-1">{c.channelUrl}</a>
                      <div className="text-[10px] font-medium text-gray-400 flex items-center gap-2 flex-wrap">
                         <span>Cập nhật: {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString('vi') : 'Đang chờ quét'}</span>
                         <span>•</span>
                         <span className="text-emerald-400 font-bold">Đã kéo: {c.totalSynced || 0} video</span>
                         <span>•</span>
                         <span className="text-indigo-400 font-bold flex items-center gap-1">
                           <Sparkles className="w-3 h-3 text-indigo-400" /> Đã dịch AI: {c.totalAiProcessed || 0} video
                         </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-black/40 p-1.5 rounded-lg border border-white/5">
                      <button 
                        onClick={() => toggleSyncChannelAction(c.id, !c.isActive).then(fetchChannels)} 
                        className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${c.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-600/50 text-gray-400 hover:bg-gray-600'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        {c.isActive ? 'BẬT' : 'DỪNG'}
                      </button>
                      
                      <button 
                        onClick={async () => {
                           if(isSyncing) return;
                           setIsSyncing(true);
                           setStatusText(`Đang quét kéo video từ kênh: ${c.channelName}...`);
                           try {
                             const res = await manualTriggerSyncChannelAction(c.id, teamId, creatorId);
                             if (res.success) {
                               if (res.count === 0 && res.alreadyExists > 0) {
                                  setStatusText(`Kênh không có video mới (bỏ qua ${res.alreadyExists} video cũ).`);
                               } else {
                                  setStatusText(`Thành công! Đã kéo về ${res.count} video mới.`);
                               }
                               await fetchChannels();
                               setTimeout(() => setIsSyncing(false), 2000);
                             } else {
                               setError(`Lỗi quét kênh: ${res.error}`);
                               setIsSyncing(false);
                             }
                           } catch (e) { 
                               setError('Lỗi không xác định'); 
                               setIsSyncing(false); 
                           }
                        }} 
                        className="p-1.5 hover:bg-white/10 rounded-md text-red-400 hover:text-red-300 transition" 
                        title="Kéo video mới về ngay"
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={async () => {
                           if(isSyncing) return;
                           setIsSyncing(true);
                           setStatusText(`Đang gọi Gemini 2.5 Flash biên dịch ngầm 10 video chưa dịch của kênh: ${c.channelName}...`);
                           try {
                             const res = await batchTranslateChannelAiAction(c.id, teamId);
                             if (res.success) {
                               setStatusText(res.message || `Đã hoàn tất biên dịch & tạo Timeline cho ${res.count} video!`);
                               await fetchChannels();
                               setTimeout(() => setIsSyncing(false), 2500);
                             } else {
                               setError(`Lỗi dịch AI: ${res.error}`);
                               setIsSyncing(false);
                             }
                           } catch (e) { 
                               setError('Lỗi không xác định'); 
                               setIsSyncing(false); 
                           }
                        }} 
                        className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-md text-indigo-300 transition flex items-center gap-1 cursor-pointer" 
                        title="Chạy Gemini 2.5 Flash biên dịch AI (Xử lý 10 video)"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => { 
                          setChannelUrl(c.channelUrl);
                          if (c.filters) {
                            setStatus(c.filters.status || 'draft');
                            setCategory(c.filters.category || 'other');
                            setFetchAll(c.filters.limit === 'all');
                            if(c.filters.limit !== 'all') setLimit(c.filters.limit || 10);
                            setMinViews(c.filters.minViews || 0);
                            setTimeRange(c.filters.timeRange || 'all');
                            setDurationFilter(c.filters.durationFilter || 'all');
                            setRewriteTitle(c.filters.rewriteTitle || false);
                            if(c.filters.aiConnectionId) setAiConnectionId(c.filters.aiConnectionId);
                          }
                          setActiveTab('manual'); 
                        }} 
                        className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 transition" 
                        title="Sửa cấu hình & Quét"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          if(confirm('Bạn có chắc muốn xóa kênh này khỏi lịch tự động?')) {
                            await deleteSyncChannelAction(c.id);
                            fetchChannels();
                          }
                        }} 
                        className="p-1.5 hover:bg-rose-500/20 rounded-md text-gray-400 hover:text-rose-500 transition" 
                        title="Xóa kênh"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                 </div>
               ))
             )}
           </div>
        )}

        {/* TAB 2: MANUAL / ADD CHANNEL FORM */}
        {activeTab === 'manual' && !results && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Link Kênh Youtube</label>
              <input 
                type="text" 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition text-sm"
                placeholder="VD: https://www.youtube.com/@BienSoanPhimAI"
                value={channelUrl}
                onChange={e => setChannelUrl(e.target.value)}
                disabled={isSyncing}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Trạng thái đăng</label>
                <select 
                  className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none"
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  disabled={isSyncing}
                >
                  <option value="draft">Bản nháp (Chờ xử lý)</option>
                  <option value="publishing">Xuất bản luôn</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Danh mục Phim</label>
                <input 
                  type="text"
                  className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                  placeholder="VD: Hành động, Hài..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSyncing}
                />
              </div>
            </div>

            {/* Chọn nơi đăng bài (Chỉ hiện khi trạng thái là Xuất bản luôn) */}
            {status === 'publishing' && (
              <div className="p-3 border border-white/10 bg-white/5 rounded-lg flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Chia sẻ tự động lên iSocial</span>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {/* Bảng tin Team luôn có */}
                  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition">
                    <input 
                      type="checkbox" 
                      className="accent-blue-500 w-4 h-4" 
                      checked={publishTargets.some(t => t.type === 'team')}
                      onChange={(e) => {
                        if(e.target.checked) setPublishTargets([...publishTargets, { type: 'team', id: teamId, name: 'Bảng tin chung' }]);
                        else setPublishTargets(publishTargets.filter(t => t.type !== 'team'));
                      }}
                      disabled={isSyncing}
                    />
                    <span className="text-sm text-gray-300">Bảng tin chung của Team (Mặc định)</span>
                  </label>

                  {availablePages.map(page => (
                    <label key={`page-${page.id}`} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition">
                      <input 
                        type="checkbox" 
                        className="accent-blue-500 w-4 h-4" 
                        checked={publishTargets.some(t => t.type === 'page' && t.id === page.id)}
                        onChange={(e) => {
                          if(e.target.checked) setPublishTargets([...publishTargets, { type: 'page', id: page.id, name: page.name }]);
                          else setPublishTargets(publishTargets.filter(t => !(t.type === 'page' && t.id === page.id)));
                        }}
                        disabled={isSyncing}
                      />
                      <span className="text-sm text-gray-300">Fanpage: {page.name}</span>
                    </label>
                  ))}

                  {availableGroups.map(group => (
                    <label key={`group-${group.id}`} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition">
                      <input 
                        type="checkbox" 
                        className="accent-blue-500 w-4 h-4" 
                        checked={publishTargets.some(t => t.type === 'group' && t.id === group.id)}
                        onChange={(e) => {
                          if(e.target.checked) setPublishTargets([...publishTargets, { type: 'group', id: group.id, name: group.name }]);
                          else setPublishTargets(publishTargets.filter(t => !(t.type === 'group' && t.id === group.id)));
                        }}
                        disabled={isSyncing}
                      />
                      <span className="text-sm text-gray-300">Group: {group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* AI Rewrite toggle */}
            <div className="p-3 border border-white/10 bg-white/5 rounded-lg flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rewriteTitle ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`}>
                  {rewriteTitle && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-gray-200">Dùng AI viết lại Tiêu đề & Tóm tắt hấp dẫn hơn</span>
                </div>
                <input type="checkbox" className="hidden" checked={rewriteTitle} onChange={e => setRewriteTitle(e.target.checked)} disabled={isSyncing} />
              </label>

              {rewriteTitle && (
                <div className="pl-8">
                  {aiList.length > 0 ? (
                    <select 
                      className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
                      value={aiConnectionId || ''}
                      onChange={(e) => setAiConnectionId(parseInt(e.target.value))}
                      disabled={isSyncing}
                    >
                      {aiList.map(ai => (
                        <option key={ai.id} value={ai.id}>{ai.name} ({ai.provider})</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-500">Chưa có kết nối AI nào trong dự án của bạn (Connect Hub).</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fetchAll} onChange={e => setFetchAll(e.target.checked)} disabled={isSyncing} className="accent-red-500" />
                  <span className="text-sm font-medium text-gray-300">Kéo toàn bộ video của kênh (Tối đa)</span>
                </label>
              </div>
              
              {!fetchAll && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-400">Hoặc giới hạn số lượng</span>
                    <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{limit} video</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={limit}
                    onChange={e => setLimit(parseInt(e.target.value))}
                    disabled={isSyncing}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <div className="border border-white/5 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full bg-white/5 p-3 flex items-center justify-between hover:bg-white/10 transition"
              >
                <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Bộ lọc (Lượt xem, Thời gian, Thời lượng)
                </span>
                <span className="text-xs text-gray-500">{showFilters ? 'Ẩn' : 'Hiện'}</span>
              </button>
              
              {showFilters && (
                <div className="p-4 bg-black/20 space-y-4 border-t border-white/5">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Lượt view tối thiểu</label>
                    <input 
                      type="number"
                      min="0"
                      step="1000"
                      className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                      placeholder="Ví dụ: 5000"
                      value={minViews || ''}
                      onChange={e => setMinViews(parseInt(e.target.value) || 0)}
                      disabled={isSyncing}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Thời gian đăng</label>
                      <select 
                        className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none"
                        value={timeRange}
                        onChange={(e: any) => setTimeRange(e.target.value)}
                        disabled={isSyncing}
                      >
                        <option value="all">Tất cả thời gian</option>
                        <option value="day">Trong 24 giờ</option>
                        <option value="week">Trong tuần này</option>
                        <option value="month">Trong tháng này</option>
                        <option value="year">Trong năm nay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Thời lượng video</label>
                      <select 
                        className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none"
                        value={durationFilter}
                        onChange={(e: any) => setDurationFilter(e.target.value)}
                        disabled={isSyncing}
                      >
                        <option value="all">Mọi độ dài</option>
                        <option value="short">Video ngắn (Dưới 1 phút)</option>
                        <option value="medium">Trung bình (1 - 30 phút)</option>
                        <option value="long">Video dài (Trên 30 phút)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Syncing Status / Results */}
        {isSyncing && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 border border-white/5 bg-black/20 rounded-xl">
            <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
            <p className="text-sm font-medium text-gray-300 text-center px-4 animate-pulse">
              {statusText}
            </p>
          </div>
        )}

        {results && (
          <div className="flex flex-col gap-4">
            <div className={`p-4 border rounded-xl flex items-start gap-3 ${results.length > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
              {results.length > 0 ? <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" /> : <CheckCircle2 className="h-6 w-6 text-blue-500 shrink-0" />}
              <div>
                <h3 className={`font-bold ${results.length > 0 ? 'text-green-400' : 'text-blue-400'}`}>
                   {results.length > 0 ? 'Hoàn tất!' : 'Không có video mới'}
                </h3>
                <p className="text-sm text-gray-300 mt-1">{statusText}</p>
              </div>
            </div>
            
            {results.length > 0 && (
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {results.map((r, i) => (
                  <div key={i} className="flex gap-3 bg-black/40 p-2 rounded-lg border border-white/5">
                    <img src={r.coverUrl} className="w-16 h-12 object-cover rounded bg-gray-800 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{r.optimizedTitle}</p>
                      {r.originalTitle !== r.optimizedTitle && (
                         <p className="text-[10px] text-gray-500 truncate line-through mt-0.5">{r.originalTitle}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 mt-auto border-t border-white/10">
          {!isSyncing && (
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition"
            >
              Đóng
            </button>
          )}
          
          {!isSyncing && !results && activeTab === 'manual' && (
            <>
              <button 
                onClick={handleSaveAuto}
                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-2"
              >
                <Save className="h-4 w-4 text-gray-400" />
                Lưu thành Kênh tự động
              </button>
              <button 
                onClick={handleSync}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 transition flex items-center gap-2"
              >
                <Youtube className="h-4 w-4" />
                Bắt đầu quét
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
