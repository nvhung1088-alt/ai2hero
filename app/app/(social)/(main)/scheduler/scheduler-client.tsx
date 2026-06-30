'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Search,
  Video,
  Image as ImageIcon,
  FileText,
  Clock,
  Sparkles,
  Check,
  ChevronRight,
  ListOrdered,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { createBatchSchedulesAction, getSchedulesAction } from '@/lib/db/social-scheduler-actions';
import { QueueView } from './queue-view';

interface SchedulerClientProps {
  user: any;
  initialPosts: any[];
  connections: any[];
  initialSchedules: any[];
  activeTeamId: number;
}

export function SchedulerClient({
  user,
  initialPosts,
  connections,
  initialSchedules,
  activeTeamId
}: SchedulerClientProps) {
  const [activeTab, setActiveTab] = useState<'setup' | 'queue'>('setup');
  const [posts] = useState<any[]>(initialPosts);
  const [schedules, setSchedules] = useState<any[]>(initialSchedules);
  
  // Filtering & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'text'>('all');
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<number[]>([]);

  // Config parameters
  const [videoFormat, setVideoFormat] = useState<'video' | 'reel'>('video');
  const [scheduleMode, setScheduleMode] = useState<'auto_interval' | 'custom'>('auto_interval');
  const [intervalHours, setIntervalHours] = useState<number>(2);
  
  // Set default start time to 1 hour from now, in local timezone format for datetime-local input
  const getDefaultStartTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    // Format to yyyy-MM-ddThh:mm
    const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };
  
  const [startAt, setStartAt] = useState<string>(getDefaultStartTime());
  const [customSchedules, setCustomSchedules] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Refresh schedules from DB
  const refreshSchedules = async () => {
    try {
      const latest = await getSchedulesAction(activeTeamId);
      setSchedules(JSON.parse(JSON.stringify(latest)));
    } catch (e) {
      console.error('Failed to load schedules', e);
    }
  };

  // Poll schedules status when in Queue tab
  useEffect(() => {
    if (activeTab !== 'queue') return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshSchedules();
      }
    }, 600000); // refresh every 10m
    return () => clearInterval(interval);
  }, [activeTab]);

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const hasVideo = post.media?.some((m: any) => m.type.includes('video')) || false;
    const hasImage = post.media?.some((m: any) => m.type.includes('image')) || false;

    if (filterType === 'video') return matchesSearch && hasVideo;
    if (filterType === 'image') return matchesSearch && hasImage && !hasVideo;
    if (filterType === 'text') return matchesSearch && !hasImage && !hasVideo;
    return matchesSearch;
  });

  // Check if any selected post contains video
  const hasVideoSelected = posts
    .filter(p => selectedPostIds.includes(p.id))
    .some(p => p.media?.some((m: any) => m.type.includes('video')));

  // Check if any Facebook page connection is selected
  const hasFbSelected = connections
    .filter(c => selectedConnectionIds.includes(c.id))
    .some(c => c.appSlug === 'facebook');

  // Multi-select toggle
  const togglePostSelect = (postId: number) => {
    setSelectedPostIds(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  // Select all / deselect all filtered posts
  const toggleSelectAll = () => {
    const filteredIds = filteredPosts.map(p => p.id);
    const allSelected = filteredIds.every(id => selectedPostIds.includes(id));
    
    if (allSelected) {
      // Remove all filtered posts from selection
      setSelectedPostIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add all filtered posts to selection
      setSelectedPostIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Connection selection toggle
  const toggleConnectionSelect = (connId: number) => {
    setSelectedConnectionIds(prev =>
      prev.includes(connId) ? prev.filter(id => id !== connId) : [...prev, connId]
    );
  };

  // Initialize custom dates for posts when switching to custom mode or when selection changes
  useEffect(() => {
    if (scheduleMode !== 'custom') return;
    const updatedCustom: Record<number, string> = { ...customSchedules };
    let hasChanges = false;
    
    selectedPostIds.forEach((postId, idx) => {
      if (!updatedCustom[postId]) {
        const d = new Date();
        d.setHours(d.getHours() + 1 + idx * 2);
        d.setMinutes(0);
        const tzoffset = d.getTimezoneOffset() * 60000;
        updatedCustom[postId] = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setCustomSchedules(updatedCustom);
    }
  }, [selectedPostIds, scheduleMode]);

  // Handle schedule creation
  const handleScheduleSubmit = async () => {
    if (selectedPostIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một bài viết.', 'error');
      return;
    }
    if (selectedConnectionIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một tài khoản mạng xã hội để đăng.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const selectedConnsObj = connections.filter(c => selectedConnectionIds.includes(c.id));
      const targetPlatforms = Array.from(new Set(selectedConnsObj.map(c => c.appSlug)));

      const customSchedulesArray = selectedPostIds.map(postId => ({
        postId,
        scheduledAt: new Date(customSchedules[postId] || startAt).toISOString()
      }));

      const res = await createBatchSchedulesAction({
        teamId: activeTeamId,
        postIds: selectedPostIds,
        platforms: targetPlatforms,
        connectionIds: selectedConnectionIds,
        mode: scheduleMode,
        intervalHours,
        startAt: new Date(startAt).toISOString(),
        customSchedules: scheduleMode === 'custom' ? customSchedulesArray : undefined,
        videoFormat: hasVideoSelected ? videoFormat : undefined
      });

      if (res.success) {
        showToast(`Đã lên lịch thành công cho ${res.count} bài viết!`, 'success');
        setSelectedPostIds([]);
        // Refresh and switch to queue tab
        await refreshSchedules();
        setActiveTab('queue');
      } else {
        showToast('Lên lịch thất bại, vui lòng thử lại.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Lỗi trong quá trình lập lịch.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate dynamic preview timeline
  const getTimelinePreview = () => {
    if (selectedPostIds.length === 0) return [];
    
    const orderedSelectedPosts = posts.filter(p => selectedPostIds.includes(p.id));
    const baseStartDate = new Date(startAt);

    return orderedSelectedPosts.map((post, idx) => {
      let time = new Date(baseStartDate);
      if (scheduleMode === 'auto_interval') {
        time.setHours(time.getHours() + (idx * intervalHours));
      } else {
        const customDateStr = customSchedules[post.id];
        if (customDateStr) time = new Date(customDateStr);
      }

      return {
        post,
        scheduledAt: time
      };
    }).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  };

  const timeline = getTimelinePreview();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6 text-white">
      {/* Header section with Glassmorphism */}
      <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-pink-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.3)]">
            <CalendarClock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Social Scheduler</h1>
            <p className="text-xs text-white/50 mt-1">Lập lịch phân phối tự động hàng loạt bài đăng lên các kênh mạng xã hội</p>
          </div>
        </div>

        {/* Tab switcher options */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 relative z-10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'setup'
                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Thiết lập Lịch
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Hàng đợi Đăng ({schedules.filter(s => s.status === 'pending').length})
          </button>
        </div>
      </div>

      {activeTab === 'setup' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Content Library (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-pink-500" />
                Thư viện iSocial Feed
              </h2>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-pink-500 hover:text-pink-400 font-semibold"
              >
                {filteredPosts.every(p => selectedPostIds.includes(p.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả trang này'}
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nội dung bài viết..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs placeholder:text-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto">
                {(['all', 'image', 'video', 'text'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-[10px] font-semibold uppercase rounded-lg transition-all ${
                      filterType === type
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {type === 'all' && 'Tất cả'}
                    {type === 'image' && 'Ảnh'}
                    {type === 'video' && 'Video'}
                    {type === 'text' && 'Chữ'}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts Scroll Container */}
            <div className="max-h-[500px] overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => {
                  const isSelected = selectedPostIds.includes(post.id);
                  const hasVideo = post.media?.some((m: any) => m.type.includes('video')) || false;
                  const hasImage = post.media?.some((m: any) => m.type.includes('image')) || false;
                  const firstMedia = post.media?.[0];

                  return (
                    <div
                      key={post.id}
                      onClick={() => togglePostSelect(post.id)}
                      className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-pink-500/5 border-pink-500/30'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Select indicator checkbox */}
                      <div className="flex items-center shrink-0">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-pink-500 border-pink-500' : 'border-white/25 group-hover:border-white/45'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                        <p className="text-xs text-white/80 line-clamp-3 leading-relaxed whitespace-pre-wrap">{post.message}</p>
                        
                        <div className="flex items-center gap-3 text-[10px] text-white/30 mt-1">
                          <span>Đăng ngày: {new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                          <span className="flex items-center gap-1">
                            {hasVideo && <><Video className="h-3 w-3 text-sky-400" /> Video</>}
                            {hasImage && !hasVideo && <><ImageIcon className="h-3 w-3 text-emerald-400" /> Ảnh</>}
                            {!hasImage && !hasVideo && <><FileText className="h-3 w-3 text-amber-400" /> Text</>}
                          </span>
                        </div>
                      </div>

                      {/* Thumbnail Preview */}
                      {firstMedia && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/5 relative bg-black/40 flex items-center justify-center">
                          {firstMedia.type.includes('video') ? (
                            <>
                              <video src={firstMedia.url} className="w-full h-full object-cover" preload="metadata" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Video className="h-4 w-4 text-white drop-shadow" />
                              </div>
                            </>
                          ) : (
                            <img src={firstMedia.url} alt="Media" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-white/35 text-xs">
                  Không tìm thấy bài viết nào phù hợp.
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-white/30 border-t border-white/5 pt-3 flex justify-between items-center">
              <span>Hiển thị {filteredPosts.length} bài viết</span>
              <span className="text-pink-500 font-semibold">Đã chọn {selectedPostIds.length} bài viết</span>
            </div>
          </div>

          {/* RIGHT: Schedule Settings Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 border-b border-white/10 pb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              Cấu hình phân phối
            </h2>

            {/* Platform Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-wider text-white/40 font-bold">
                Chọn tài khoản mạng xã hội
              </label>
              {connections.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {connections.map(conn => {
                    const isSelected = selectedConnectionIds.includes(conn.id);
                    return (
                      <div
                        key={conn.id}
                        onClick={() => toggleConnectionSelect(conn.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-500/5 border-orange-500/30'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-orange-500 border-orange-500' : 'border-white/20'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-white/80">{conn.connectionName}</span>
                          <span className="text-[10px] text-white/40 uppercase mt-0.5">{conn.appSlug}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-center text-xs text-white/40 flex flex-col items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Chưa có tài khoản MXH nào kết nối trong Connect Hub.
                  <a href={`/dashboard/t/${activeTeamId}`} className="text-pink-500 hover:underline font-semibold mt-1">Đi tới Connect Hub →</a>
                </div>
              )}
            </div>

            {/* Reels format toggle */}
            {hasVideoSelected && hasFbSelected && (
              <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                <label className="text-[11px] uppercase tracking-wider text-white/40 font-bold">
                  Đăng Video lên Facebook dưới dạng
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setVideoFormat('video')}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      videoFormat === 'video'
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-transparent text-white/40 border-white/5 hover:border-white/10 hover:text-white/60'
                    }`}
                  >
                    Video thường
                  </button>
                  <button
                    onClick={() => setVideoFormat('reel')}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      videoFormat === 'reel'
                        ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/20 text-white border-pink-500/30'
                        : 'bg-transparent text-white/40 border-white/5 hover:border-white/10 hover:text-white/60'
                    }`}
                  >
                    Facebook Reels (9:16)
                  </button>
                </div>
              </div>
            )}

            {/* Time Settings */}
            <div className="flex flex-col gap-3">
              <label className="text-[11px] uppercase tracking-wider text-white/40 font-bold">
                Lịch biểu thời gian
              </label>
              
              {/* Mode toggle */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setScheduleMode('auto_interval')}
                  className={`flex-1 py-1.5 text-[10px] font-semibold uppercase rounded-lg transition-all ${
                    scheduleMode === 'auto_interval'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  ⏰ Giãn cách tự động
                </button>
                <button
                  onClick={() => setScheduleMode('custom')}
                  className={`flex-1 py-1.5 text-[10px] font-semibold uppercase rounded-lg transition-all ${
                    scheduleMode === 'custom'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  📅 Đặt giờ thủ công
                </button>
              </div>

              {/* Mode configs rendering */}
              {scheduleMode === 'auto_interval' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-white/50">Thời gian bắt đầu:</span>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-white/50">Tần suất đăng bài:</span>
                    <select
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(Number(e.target.value))}
                      className="bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500/50"
                    >
                      <option value={1} className="bg-slate-900 text-white">Mỗi 1 giờ đăng 1 bài</option>
                      <option value={2} className="bg-slate-900 text-white">Mỗi 2 giờ đăng 1 bài (Khuyên dùng)</option>
                      <option value={4} className="bg-slate-900 text-white">Mỗi 4 giờ đăng 1 bài</option>
                      <option value={6} className="bg-slate-900 text-white">Mỗi 6 giờ đăng 1 bài</option>
                      <option value={12} className="bg-slate-900 text-white">Mỗi 12 giờ đăng 1 bài</option>
                      <option value={24} className="bg-slate-900 text-white">Mỗi 24 giờ đăng 1 bài</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {selectedPostIds.length > 0 ? (
                    posts.filter(p => selectedPostIds.includes(p.id)).map((post, idx) => (
                      <div key={post.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5 justify-between">
                        <span className="text-[10px] text-white/70 truncate flex-1 pr-2">#{idx+1}: {post.message}</span>
                        <input
                          type="datetime-local"
                          value={customSchedules[post.id] || startAt}
                          onChange={(e) => setCustomSchedules(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="bg-slate-950 border border-white/10 rounded p-1 text-[10px] text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-center text-white/30 py-4">Chưa chọn bài viết nào để đặt giờ.</span>
                  )}
                </div>
              )}
            </div>

            {/* Timeline Preview */}
            {timeline.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <span className="text-[11px] uppercase tracking-wider text-white/40 font-bold">
                  Xem trước Timeline ({timeline.length} bài)
                </span>
                <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1 mt-1">
                  {timeline.map((item, idx) => {
                    const hasVideo = item.post.media?.some((m: any) => m.type.includes('video')) || false;
                    return (
                      <div key={idx} className="flex gap-2 items-start text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between font-semibold">
                            <span className="text-white/80 truncate">Bài #{idx+1}: {item.post.message}</span>
                            <span className="text-pink-500 shrink-0 ml-2">
                              {item.scheduledAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({item.scheduledAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
                            </span>
                          </div>
                          {hasVideo && hasFbSelected && videoFormat === 'reel' && (
                            <span className="text-[9px] text-amber-500 mt-0.5 block">Format: Reels</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleScheduleSubmit}
              disabled={isLoading || selectedPostIds.length === 0 || selectedConnectionIds.length === 0}
              className={`w-full py-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isLoading || selectedPostIds.length === 0 || selectedConnectionIds.length === 0
                  ? 'bg-white/5 border border-white/5 text-white/30 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-pink-500 to-orange-500 hover:opacity-90 active:scale-[0.99] border border-pink-500/20 text-white shadow-pink-500/10'
              }`}
            >
              {isLoading ? 'Đang lên lịch...' : `🚀 Lên lịch đăng ${selectedPostIds.length} bài viết`}
            </button>
          </div>
        </div>
      ) : (
        <QueueView
          schedules={schedules}
          onRefresh={refreshSchedules}
          activeTeamId={activeTeamId}
        />
      )}
    </div>
  );
}
