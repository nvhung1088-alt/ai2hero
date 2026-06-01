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
  const { hasPermission, dirHandle, requestPermission, verifyExistingPermission, getAllVideoFiles } = useFileSystem();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleOpenFolder = async () => {
    const folderPath = `HeroVideo\\${workspaceSlug}`;

    try {
      await navigator.clipboard?.writeText(folderPath);
      showToast('Da copy ten folder workspace. Extension se tao/mo dung thu muc workspace.', 'success');
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
    }

    window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER', workspaceSlug, open: true }, window.location.origin);
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="space-y-6">
      {hasPermission && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 px-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Da ket noi folder workspace: {workspaceSlug}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenFolder}
              className="text-xs px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded transition-all flex items-center gap-1 font-semibold shadow-md active:scale-95"
            >
              Mo thu muc
            </button>
            <button
              onClick={fetchFiles}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Quet'} video moi
            </button>
          </div>
        </div>
      )}

      {!hasPermission && (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 pointer-events-none" />
          <FolderKey className="w-10 h-10 text-pink-400 mb-3 relative z-10" />
          <h3 className="text-lg font-bold text-white relative z-10">Ket noi folder workspace</h3>
          <p className="text-sm text-zinc-400 max-w-md text-center mt-2 relative z-10">
            {dirHandle
              ? `Ban da ket noi folder truoc do. Hay xac nhan lai quyen truy cap folder workspace: ${workspaceSlug}.`
              : `De doc/xoa video dung workspace, hay chon truc tiep folder workspace "${workspaceSlug}" trong Downloads/HeroVideo.`}
          </p>
          <div className="flex items-center gap-3 mt-4 relative z-10">
            {dirHandle ? (
              <>
                <button
                  onClick={verifyExistingPermission}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-pink-500/20"
                >
                  Tiep tuc cap quyen
                </button>
                <button
                  onClick={requestPermission}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg transition-all"
                >
                  Doi folder
                </button>
              </>
            ) : (
              <button
                onClick={requestPermission}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-pink-500/20"
              >
                Cap quyen va chon folder
              </button>
            )}
          </div>
        </div>
      )}

      {hasPermission && files.length === 0 && !isLoading && (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          Chua co video nao trong folder <b>{workspaceSlug}</b>. <br /> Hay dung extension de tai video ve.
        </div>
      )}

      {hasPermission && files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
