'use client';

import { Loader2, Download, Eye, Image, CheckCircle2, Pause, AlertCircle, Play, FolderOpen } from 'lucide-react';
import { parseDownloaderError } from '../_shared/downloader-ui-helpers';

interface VideoTableProps {
  videos: any[];
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onUpdateStatus: (videoId: number, status: string) => void;
  onOpenLocal: (path: string) => void;
  onPreviewThumbnail: (video: any) => void;
}

export function DownloaderVideoTable({
  videos,
  currentPage,
  onPageChange,
  isLoading,
  onUpdateStatus,
  onOpenLocal,
  onPreviewThumbnail,
}: VideoTableProps) {
  return (
    <div className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-gray-400 text-xs uppercase bg-black/20">
            <th className="py-3 px-4 font-medium w-8">#</th>
            <th className="py-3 px-4 font-medium w-[90px]">Ảnh bìa</th>
            <th className="py-3 px-4 font-medium">Video ID / Tiêu đề</th>
            <th className="py-3 px-4 font-medium">Dung lượng</th>
            <th className="py-3 px-4 font-medium">Ngày tải</th>
            <th className="py-3 px-4 font-medium">Trạng thái</th>
            <th className="py-3 px-4 font-medium text-right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-teal-500">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                <p className="text-gray-400">Đang tải danh sách video...</p>
              </td>
            </tr>
          ) : videos.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-gray-500">
                <Download className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Chưa có video nào trong dự án</p>
              </td>
            </tr>
          ) : (
            videos.slice((currentPage - 1) * 10, currentPage * 10).map((video) => (
              <tr key={video.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                <td className="py-3 px-4 text-gray-500">{video.id}</td>
                <td className="py-2 px-4">
                  {video.thumbnailUrl ? (
                    <div 
                      className="relative cursor-pointer group/thumb w-20 h-[45px] rounded-md overflow-hidden border border-white/10 bg-black/40 hover:border-purple-500/50 transition-colors"
                      onClick={() => onPreviewThumbnail(video)}
                      title="Click để xem phóng to ảnh bìa"
                    >
                      <img 
                        src={video.thumbnailUrl} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        loading="lazy" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-[45px] bg-white/5 rounded-md flex items-center justify-center">
                      <Image className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <p className="text-gray-200 font-medium truncate max-w-[200px] lg:max-w-md" title={video.title}>{video.title}</p>
                  <a href={video.videoUrl} target="_blank" rel="noreferrer" title={video.videoUrl} className="text-[11px] text-blue-400 hover:underline block truncate max-w-[200px] lg:max-w-md">{video.videoUrl}</a>
                </td>
                <td className="py-3 px-4 text-gray-400 text-xs">
                  {video.actualSizeBytes ? (
                      <span className={video.sizeBytes && video.actualSizeBytes < video.sizeBytes * 0.9 ? "text-red-400" : "text-green-400"}>
                        {(video.actualSizeBytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                  ) : (
                      <span className="text-gray-500">...</span>
                  )}
                  {video.sizeBytes ? (
                    <span className="text-gray-500"> / {(video.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                  ) : ''}
                  {video.duration ? <span className="text-gray-600 block text-[10px]">{video.duration}</span> : null}
                </td>
                <td className="py-3 px-4 text-gray-400 text-xs">
                  {new Date(video.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="py-3 px-4">
                {video.status === 'downloading' ? (
                    <div className="flex items-center gap-2 text-teal-400 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <div>
                        <div>Đang tải {video.progress}%</div>
                        {video.downloadSpeed && <div className="text-teal-300/70 font-mono">{video.downloadSpeed}</div>}
                      </div>
                    </div>
                  ) : video.status === 'completed' ? (
                    <div className="flex items-center gap-2 text-emerald-500 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Hoàn tất</span>
                    </div>
                  ) : video.status === 'paused' ? (
                    <div className="flex items-center gap-2 text-amber-500 text-xs">
                      <Pause className="w-3.5 h-3.5" />
                      <span>Tạm dừng ({video.progress}%)</span>
                    </div>
                  ) : video.status === 'failed' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Thất bại</span>
                      </div>
                      {video.error && (
                        <div 
                          className="text-[10px] leading-tight text-red-300/90 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-1 max-w-[200px] break-words" 
                          title={video.error}
                        >
                          {parseDownloaderError(video.error)}
                        </div>
                      )}
                    </div>
                  ) : video.status === 'force_pending' ? (
                    <div className="flex items-center gap-2 text-teal-400 text-xs">
                      <div className="w-3.5 h-3.5 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                      <span>Đang khởi động tải...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Chờ tải (Pending)</span>
                    </div>
                  )}
                  {video.status === 'downloading' && (
                    <div className="h-1 w-24 bg-black/50 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${video.progress}%` }} />
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {video.status === 'downloading' ? (
                      <>
                        {video.downloadSpeed && <span className="text-teal-400 font-bold text-xs font-mono">{video.downloadSpeed}</span>}
                        <button onClick={() => onUpdateStatus(video.id, 'paused')} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/20 transition-colors" title="Tạm dừng">
                          <Pause className="w-4 h-4" />
                        </button>
                      </>
                    ) : video.status === 'paused' ? (
                      <button onClick={() => onUpdateStatus(video.id, 'pending')} className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/20 transition-colors" title="Tiếp tục tải">
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    ) : video.status === 'failed' ? (
                      <button onClick={() => onUpdateStatus(video.id, 'pending')} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors text-xs font-bold whitespace-nowrap" title="Thử lại">
                        Thử lại
                      </button>
                    ) : video.status === 'pending' ? (
                      <>
                        <button onClick={() => onUpdateStatus(video.id, 'force_pending')} className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg border border-teal-500/30 transition-colors text-xs font-bold whitespace-nowrap" title="Tải ngay lập tức">
                          Tải ngay
                        </button>
                        <button onClick={() => onUpdateStatus(video.id, 'paused')} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/20 transition-colors" title="Tạm dừng">
                          <Pause className="w-4 h-4" />
                        </button>
                      </>
                      ) : video.status === 'completed' && video.localPath ? (
                      <button onClick={() => onOpenLocal(video.localPath!)} className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/20 transition-colors" title="Mở video">
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Pagination Controls */}
      {videos.length > 0 && (
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
          <div className="text-xs text-gray-500">
            Hiển thị {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, videos.length)} trong tổng số {videos.length} video
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-md text-gray-300 text-xs transition-colors"
              title="Trang đầu tiên"
            >
              Đầu
            </button>
            <button 
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-md text-gray-300 text-xs transition-colors"
            >
              Trước
            </button>
            <span className="text-xs text-gray-400 px-2">
              Trang {currentPage} / {Math.ceil(videos.length / 10)}
            </span>
            <button 
              onClick={() => onPageChange(Math.min(currentPage + 1, Math.ceil(videos.length / 10)))}
              disabled={currentPage === Math.ceil(videos.length / 10)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-md text-gray-300 text-xs transition-colors"
            >
              Sau
            </button>
            <button 
              onClick={() => onPageChange(Math.ceil(videos.length / 10))}
              disabled={currentPage === Math.ceil(videos.length / 10)}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-md text-gray-300 text-xs transition-colors"
              title="Trang cuối cùng"
            >
              Cuối
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
