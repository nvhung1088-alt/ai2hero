'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderKey, Loader2 } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { FileSystemProvider, useFileSystem } from './file-system-context';
import { VideoCard } from './video-card';

interface VideoListClientProps {
  workspaceSlug: string;
}

function VideoGrid({ workspaceSlug }: VideoListClientProps) {
  const { hasPermission, dirHandle, folderName, requestPermission, verifyExistingPermission, getAllVideoFiles, deleteVideoFile } = useFileSystem();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!hasPermission) return;
    setIsLoading(true);
    try {
      const result = await getAllVideoFiles();
      setFiles(result);
    } finally {
      setIsLoading(false);
    }
  }, [getAllVideoFiles, hasPermission]);

  const checkVideoValidity = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const objectUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.onerror = null;
        video.onloadedmetadata = null;
      };

      video.onloadedmetadata = () => {
        // Neu videoWidth = 0 va videoHeight = 0 -> File audio-only hoac khong co khung hinh
        const hasVisual = video.videoWidth > 0 && video.videoHeight > 0;
        cleanup();
        resolve(hasVisual);
      };

      video.onerror = () => {
        // File hong, decode error
        cleanup();
        resolve(false);
      };

      video.src = objectUrl;
    });
  };

  const handleCleanupErrorVideos = async () => {
    if (files.length === 0) {
      showToast('Không có video nào để dọn dẹp.', 'info');
      return;
    }

    setIsCleaning(true);
    try {
      const filesToDelete: string[] = [];
      const seen = new Map<string, string>(); // uniqueKey -> fileName
      const candidatesForVisualCheck: File[] = [];

      // 1. Quet file rong va trung lap
      for (const file of files) {
        // Check file rong (< 500 bytes)
        if (file.size < 500) {
          filesToDelete.push(file.name);
          continue;
        }

        // Lam sach ten video, loai bo cac ky tu copy cua Chrome nhu " (1)", "(2)" truoc extension
        const baseName = file.name.replace(/\s*\(\d+\)(?=\.[^.]+$)/i, '');
        const uniqueKey = `${file.size}_${baseName.toLowerCase()}`;

        if (seen.has(uniqueKey)) {
          // File trung lap, cho vao danh sach xoa
          filesToDelete.push(file.name);
        } else {
          seen.set(uniqueKey, file.name);
          candidatesForVisualCheck.push(file);
        }
      }

      // 2. Quet video hong hoac audio-only (chay tuan tu de khong qua tai DOM)
      for (const file of candidatesForVisualCheck) {
        const isValid = await checkVideoValidity(file);
        if (!isValid) {
          filesToDelete.push(file.name);
        }
      }

      if (filesToDelete.length === 0) {
        showToast('Tuyệt vời! Thư mục sạch sẽ, không có video lỗi hoặc trùng lặp.', 'success');
        return;
      }

      // 3. Thuc hien xoa file truc tiep khoi o cung
      let deletedCount = 0;
      for (const fileName of filesToDelete) {
        const success = await deleteVideoFile(fileName);
        if (success) {
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        showToast(`Đã dọn dẹp xong! Xóa thành công ${deletedCount} video lỗi và trùng lặp.`, 'success');
        await fetchFiles();
      } else {
        showToast('Không thể dọn dẹp các video được đánh dấu lỗi.', 'error');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      showToast('Đã xảy ra lỗi trong quá trình dọn dẹp.', 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOpenFolder = async () => {
    // Chỉ fallback về workspaceSlug nếu chưa có kết nối Folder
    const displayFolderName = folderName || workspaceSlug;

    try {
      await navigator.clipboard?.writeText(displayFolderName);
      showToast(`Đã copy tên thư mục Workspace: ${displayFolderName}. Extension sẽ mở đúng thư mục này.`, 'success');
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
    }

    window.postMessage({ type: 'HERO_VIDEO_OPEN_FOLDER', workspaceSlug, customSubfolder: folderName || undefined, open: true }, window.location.origin);
  };

  useEffect(() => {
    if (hasPermission && dirHandle) {
      window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER', workspaceSlug, customSubfolder: dirHandle.name, open: false }, window.location.origin);
    }
  }, [hasPermission, dirHandle, workspaceSlug]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="space-y-6">
      {hasPermission && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 px-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Đã kết nối thư mục Workspace: {folderName || workspaceSlug}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenFolder}
              className="text-xs px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded transition-all flex items-center gap-1 font-semibold shadow-md active:scale-95 animate-fade-in"
            >
              Mở thư mục
            </button>
            <button
              onClick={handleCleanupErrorVideos}
              disabled={isLoading || isCleaning}
              className="text-xs px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/20 rounded transition-all flex items-center gap-1 disabled:opacity-50 font-medium active:scale-95"
            >
              {isCleaning ? <Loader2 className="w-3 h-3 animate-spin text-rose-400" /> : '🧹'} Dọn dẹp video lỗi
            </button>
            <button
              onClick={fetchFiles}
              disabled={isLoading || isCleaning}
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Quét'} video mới
            </button>
            <button
              onClick={requestPermission}
              disabled={isLoading || isCleaning}
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded transition-colors flex items-center gap-1 disabled:opacity-50 font-medium"
            >
              Đổi thư mục
            </button>
          </div>
        </div>
      )}

      {!hasPermission && (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 pointer-events-none" />
          <FolderKey className="w-10 h-10 text-pink-400 mb-3 relative z-10" />
          <h3 className="text-lg font-bold text-white relative z-10">Kết nối thư mục Workspace</h3>
          <p className="text-sm text-zinc-400 max-w-md text-center mt-2 relative z-10">
            {dirHandle
              ? `Bạn đã kết nối thư mục trước đó. Hãy xác nhận lại quyền truy cập thư mục Workspace: ${folderName || workspaceSlug}.`
              : `Lưu ý quan trọng: Vui lòng vào thư mục Downloads của máy tính, vào thư mục "HeroVideo" và tạo (hoặc chọn) đúng thư mục có tên "${workspaceSlug}" để làm Workspace. Extension chỉ có thể tải file vào bên trong Downloads/HeroVideo/ do bảo mật của Chrome.`}
          </p>
          <div className="flex items-center gap-3 mt-4 relative z-10">
            {dirHandle ? (
              <>
                <button
                  onClick={verifyExistingPermission}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-pink-500/20"
                >
                  Tiếp tục cấp quyền
                </button>
                <button
                  onClick={requestPermission}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg transition-all"
                >
                  Đổi thư mục
                </button>
              </>
            ) : (
              <button
                onClick={requestPermission}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-pink-500/20"
              >
                Cấp quyền và chọn thư mục
              </button>
            )}
          </div>
        </div>
      )}

      {hasPermission && files.length === 0 && !isLoading && (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          Chưa có video nào trong thư mục <b>{folderName || workspaceSlug}</b>. <br /> Hãy dùng Extension để tải video về.
        </div>
      )}

      {hasPermission && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {files.map((file) => (
            <VideoCard key={file.name} file={file} onDeleteSuccess={fetchFiles} />
          ))}
        </div>
      )}
    </div>
  );
}

export function VideoListClient({ workspaceSlug }: VideoListClientProps) {
  return (
    <FileSystemProvider workspaceSlug={workspaceSlug}>
      <VideoGrid workspaceSlug={workspaceSlug} />
    </FileSystemProvider>
  );
}
