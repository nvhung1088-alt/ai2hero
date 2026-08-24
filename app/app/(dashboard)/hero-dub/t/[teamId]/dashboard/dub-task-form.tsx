'use client';

import React from 'react';
import Link from 'next/link';
import {
  Languages,
  Loader2,
  FolderOpen,
  Zap,
  Pause,
  PlayCircle,
  Edit,
  Trash2,
  ExternalLink,
  Play,
  Check,
  Plus,
  X,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import {
  getDubDictionariesAction,
  autoDetectDictionaryAction
} from '@/lib/db/hero-dub-dictionary-actions';
import { testTranslateConnectionAction, testImageAiConnectionAction } from '@/lib/db/hero-dub-actions';
import { DubDictionary } from '@/lib/db/schema';

interface DubTaskFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  uploadMode: 'file' | 'folder';
  setUploadMode: (_mode: 'file' | 'folder') => void;
  editingTaskId: number | null;
  setEditingTaskId: (_id: number | null) => void;
  editingProjectId: string | null;
  setEditingProjectId: (_id: string | null) => void;
  
  localFilePaths: string;
  setLocalFilePaths: (_paths: string) => void;
  isUploadingFile: boolean;
  handleLocalFileUpload: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  
  taskTitle: string;
  setTaskTitle: (_title: string) => void;
  sourceLang: string;
  setSourceLang: (_lang: string) => void;
  targetLang: string;
  setTargetLang: (_lang: string) => void;
  asrEngine: string;
  setAsrEngine: (_engine: string) => void;
  sttPreset: 'fast' | 'balanced' | 'quality';
  setSttPreset: (_p: 'fast' | 'balanced' | 'quality') => void;
  noiseLevel: 'clean' | 'normal' | 'noisy';
  setNoiseLevel: (_l: 'clean' | 'normal' | 'noisy') => void;
  subtitleMode: string;
  setSubtitleMode: (_mode: string) => void;
  translateContext: string;
  setTranslateContext: (_ctx: string) => void;
  
  selectedAiAppSlug: string;
  setSelectedAiAppSlug: (_slug: string) => void;
  selectedAiModel: string;
  setSelectedAiModel: (_model: string) => void;
  connectedAiApps?: { slug: string; name: string; models: any[] }[];
  connectedAiTtsApps?: { slug: string; name: string; voices: string[] }[];
  connectedAiImageApps?: { slug: string; name: string; models: any[] }[];
  
  ttsEnabled: boolean;
  setTtsEnabled: (_enabled: boolean) => void;
  ttsEngine: string;
  handleTtsEngineChange: (_engine: string) => void;
  ttsVoice: string;
  setTtsVoice: (_voice: string) => void;
  ttsSpeed: string;
  setTtsSpeed: (_speed: string) => void;
  bgVolume: string;
  setBgVolume: (_vol: string) => void;
  ttsVolume: string;
  setTtsVolume: (_vol: string) => void;
  videoSlowdown: string;
  setVideoSlowdown: (_slowdown: string) => void;
  handlePreviewVoice: () => void;
  
  brandingEnabled: boolean;
  setBrandingEnabled: (_enabled: boolean) => void;
  selectedProjectId: number | '';
  setSelectedProjectId: (_id: number | '') => void;
  projects: any[];
  
  outputFolder: string;
  setOutputFolder: (_folder: string) => void;
  creatingTask: boolean;
  uploadProgressMsg: string;
  handleCreateTask: (_e: React.FormEvent) => void;
  
  scanProjects: any[];
  scanFolderPath: string;
  setScanFolderPath: (_path: string) => void;
  scanInterval: number;
  setScanInterval: (_interval: number) => void;
  handleSaveScanProject: () => void;
  handleScanNow: (_config: any) => void;
  handleToggleActive: (_config: any) => void;
  handleEditScanProject: (_project: any) => void;
  handleDeleteScanProject: (_id: string) => void;
  
  teamId: number;
  
  // Props cho Thumbnail (optional fallback)
  redesignThumbnailEnabled?: boolean;
  setRedesignThumbnailEnabled?: (_val: boolean) => void;
  thumbnailLogoSource?: string;
  setThumbnailLogoSource?: (_source: string) => void;
  customThumbnailLogoUrl?: string;
  setCustomThumbnailLogoUrl?: (_url: string) => void;
  thumbnailAiAppSlug?: string;
  setThumbnailAiAppSlug?: (_slug: string) => void;
  thumbnailAiModel?: string;
  setThumbnailAiModel?: (_model: string) => void;
  thumbnailProjectId?: number | '';
  setThumbnailProjectId?: (_id: number | '') => void;
  thumbnailLogoPosition?: string;
  setThumbnailLogoPosition?: (_pos: string) => void;
}

export default function DubTaskForm({
  isOpen = true,
  onClose,
  uploadMode,
  setUploadMode,
  editingTaskId,
  setEditingTaskId,
  editingProjectId,
  setEditingProjectId,
  localFilePaths,
  setLocalFilePaths,
  isUploadingFile,
  handleLocalFileUpload,
  taskTitle,
  setTaskTitle,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  asrEngine,
  setAsrEngine,
  sttPreset,
  setSttPreset,
  noiseLevel,
  setNoiseLevel,
  subtitleMode,
  setSubtitleMode,
  translateContext,
  setTranslateContext,
  selectedAiAppSlug,
  setSelectedAiAppSlug,
  selectedAiModel,
  setSelectedAiModel,
  connectedAiApps,
  connectedAiTtsApps,
  connectedAiImageApps,
  ttsEnabled,
  setTtsEnabled,
  ttsEngine,
  handleTtsEngineChange,
  ttsVoice,
  setTtsVoice,
  ttsSpeed,
  setTtsSpeed,
  bgVolume,
  setBgVolume,
  ttsVolume,
  setTtsVolume,
  videoSlowdown,
  setVideoSlowdown,
  handlePreviewVoice,
  brandingEnabled,
  setBrandingEnabled,
  selectedProjectId,
  setSelectedProjectId,
  projects,
  outputFolder,
  setOutputFolder,
  creatingTask,
  handleCreateTask,
  scanProjects,
  scanFolderPath,
  setScanFolderPath,
  scanInterval,
  setScanInterval,
  handleSaveScanProject,
  handleScanNow,
  handleToggleActive,
  handleEditScanProject,
  handleDeleteScanProject,
  teamId,
  redesignThumbnailEnabled: externalRedesignEnabled,
  setRedesignThumbnailEnabled: externalSetRedesignEnabled,
  thumbnailLogoSource: externalLogoSource,
  setThumbnailLogoSource: externalSetLogoSource,
  customThumbnailLogoUrl: externalCustomLogoUrl,
  setCustomThumbnailLogoUrl: externalSetCustomLogoUrl,
  thumbnailAiAppSlug: externalThumbnailAiAppSlug,
  setThumbnailAiAppSlug: externalSetThumbnailAiAppSlug,
  thumbnailAiModel: externalThumbnailAiModel,
  setThumbnailAiModel: externalSetThumbnailAiModel,
  thumbnailProjectId: externalThumbnailProjectId,
  setThumbnailProjectId: externalSetThumbnailProjectId,
  thumbnailLogoPosition: externalThumbnailLogoPosition,
  setThumbnailLogoPosition: externalSetThumbnailLogoPosition,
}: DubTaskFormProps) {
  // Local fallback states if not passed as props
  const [internalRedesignEnabled, setInternalRedesignEnabled] = React.useState(false);
  const [internalLogoSource, setInternalLogoSource] = React.useState('project');
  const [internalCustomLogoUrl, setInternalCustomLogoUrl] = React.useState('');
  const [internalThumbnailAiAppSlug, setInternalThumbnailAiAppSlug] = React.useState('');
  const [internalThumbnailAiModel, setInternalThumbnailAiModel] = React.useState('');
  const [internalThumbnailProjectId, setInternalThumbnailProjectId] = React.useState<number | ''>('');
  const [internalThumbnailLogoPosition, setInternalThumbnailLogoPosition] = React.useState('top-left');

  const redesignThumbnailEnabled = externalRedesignEnabled !== undefined ? externalRedesignEnabled : internalRedesignEnabled;
  const setRedesignThumbnailEnabled = externalSetRedesignEnabled || setInternalRedesignEnabled;
  const thumbnailLogoSource = externalLogoSource !== undefined ? externalLogoSource : internalLogoSource;
  const setThumbnailLogoSource = externalSetLogoSource || setInternalLogoSource;
  const customThumbnailLogoUrl = externalCustomLogoUrl !== undefined ? externalCustomLogoUrl : internalCustomLogoUrl;
  const setCustomThumbnailLogoUrl = externalSetCustomLogoUrl || setInternalCustomLogoUrl;
  const thumbnailAiAppSlug = externalThumbnailAiAppSlug !== undefined ? externalThumbnailAiAppSlug : internalThumbnailAiAppSlug;
  const setThumbnailAiAppSlug = externalSetThumbnailAiAppSlug || setInternalThumbnailAiAppSlug;
  const thumbnailAiModel = externalThumbnailAiModel !== undefined ? externalThumbnailAiModel : internalThumbnailAiModel;
  const setThumbnailAiModel = externalSetThumbnailAiModel || setInternalThumbnailAiModel;
  const thumbnailProjectId = externalThumbnailProjectId !== undefined ? externalThumbnailProjectId : internalThumbnailProjectId;
  const setThumbnailProjectId = externalSetThumbnailProjectId || setInternalThumbnailProjectId;
  const thumbnailLogoPosition = externalThumbnailLogoPosition !== undefined ? externalThumbnailLogoPosition : internalThumbnailLogoPosition;
  const setThumbnailLogoPosition = externalSetThumbnailLogoPosition || setInternalThumbnailLogoPosition;

  const [dbDictionaries, setDbDictionaries] = React.useState<DubDictionary[]>([]);
  const [selectedDictId, setSelectedDictId] = React.useState<string>('');
  const [isDetectingDict, setIsDetectingDict] = React.useState(false);

  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [testConnectionResult, setTestConnectionResult] = React.useState<{success?: boolean, msg?: string}|null>(null);

  const [isTestingImageAi, setIsTestingImageAi] = React.useState(false);
  const [testImageAiResult, setTestImageAiResult] = React.useState<{success?: boolean, msg?: string, imageUrl?: string}|null>(null);

  const handleTestConnection = async () => {
    if (!selectedAiAppSlug) return;
    setIsTestingConnection(true);
    setTestConnectionResult(null);
    try {
      const res = await testTranslateConnectionAction(teamId, selectedAiAppSlug, selectedAiModel);
      if (res.success) {
        setTestConnectionResult({ success: true, msg: 'Kết nối OK: ' + res.result });
      } else {
        setTestConnectionResult({ success: false, msg: 'Lỗi: ' + res.error });
      }
    } catch (err: any) {
      setTestConnectionResult({ success: false, msg: 'Lỗi mạng: ' + err.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestImageConnection = async () => {
    if (!thumbnailAiAppSlug) {
      showToast('Vui lòng chọn Ứng dụng AI Chỉnh Ảnh trước!', 'error');
      return;
    }
    setIsTestingImageAi(true);
    setTestImageAiResult(null);
    try {
      const sampleImg = (localFilePaths && localFilePaths.length > 0 ? localFilePaths[0] : undefined) || (customThumbnailLogoUrl && customThumbnailLogoUrl.startsWith('http') ? customThumbnailLogoUrl : undefined);
      const res = await testImageAiConnectionAction(teamId, thumbnailAiAppSlug, thumbnailAiModel, sampleImg);
      if (res.success) {
        setTestImageAiResult({ success: true, msg: 'Kết nối & Thử nghiệm mẫu Thumbnail thành công!', imageUrl: res.result });
        showToast('Kết nối & Thử nghiệm mẫu thành công!', 'success');
      } else {
        setTestImageAiResult({ success: false, msg: 'Lỗi: ' + res.error });
        showToast('Kết nối Image AI lỗi: ' + res.error, 'error');
      }
    } catch (err: any) {
      setTestImageAiResult({ success: false, msg: 'Lỗi mạng: ' + err.message });
    } finally {
      setIsTestingImageAi(false);
    }
  };

  React.useEffect(() => {
    if (teamId) {
      getDubDictionariesAction(teamId).then(res => setDbDictionaries(res || []));
    }
  }, [teamId]);

  const handleAutoDetectDict = async () => {
    if (!taskTitle && !localFilePaths) {
      showToast('Vui lòng nhập Tiêu đề hoặc URL/Đường dẫn để AI tự nhận diện!', 'error');
      return;
    }
    setIsDetectingDict(true);
    try {
      const textToMatch = `${taskTitle} ${localFilePaths}`;
      const matched = await autoDetectDictionaryAction(teamId, textToMatch);
      if (matched) {
        setTranslateContext(matched.promptContent);
        setSelectedDictId(String(matched.id));
        showToast(`AI đã tự động khớp từ điển: "${matched.name}"`, 'success');
      } else {
        showToast('Không tìm thấy từ điển khớp tự động. Bạn có thể chọn danh mục thủ công.', 'info');
      }
    } finally {
      setIsDetectingDict(false);
    }
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all z-20"
            title="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {editingTaskId && (
          <div className="bg-blue-500/20 text-blue-300 text-[10px] py-1.5 px-4 rounded-lg flex justify-between items-center z-10 font-bold">
            <span>Đang sửa cấu hình Tác vụ #{editingTaskId}</span>
            <button type="button" onClick={() => setEditingTaskId(null)} className="hover:text-white underline">Hủy sửa</button>
          </div>
        )}
        <h2 className="text-sm font-extrabold text-gray-300 uppercase tracking-wider flex items-center gap-2 pr-8">
          <Languages className="h-5 w-5 text-amber-400" />
          {editingTaskId ? 'Cập Nhật Tác Vụ Dịch' : editingProjectId ? 'Cấu Hình Dự Án Quét Thư Mục' : 'Tạo Tác Vụ Dịch Phụ Đề Mới'}
        </h2>

        {/* Tab Switcher: Tác vụ lẻ vs Dự án quét thư mục */}
        {!editingTaskId && (
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-bold my-2">
            <button
              type="button"
              onClick={() => {
                setUploadMode('file');
                setEditingProjectId(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                uploadMode === 'file' && !editingProjectId
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📹 Tác Vụ Dịch Lẻ (File/URL)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('folder');
                if (!editingProjectId) setEditingProjectId('new');
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                uploadMode === 'folder' || editingProjectId
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📁 Dự Án Quét Thư Mục Tự Động</span>
            </button>
          </div>
        )}

      <form onSubmit={handleCreateTask} className="space-y-4">
        {uploadMode === 'folder' || editingProjectId ? (
          /* FORM TẠO DỰ ÁN QUÉT THƯ MỤC */
          <div className="space-y-4 bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-emerald-400 uppercase">1. Tên Dự Án Quét</label>
              <input
                type="text"
                placeholder="VD: PHIM1, TEST, Kênh Phim Ngắn..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full bg-black/60 border border-emerald-500/30 text-white text-xs rounded-lg h-9 px-3 focus:outline-none focus:border-emerald-400 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-emerald-400 uppercase">2. Đường dẫn Thư mục Gốc cần Quét (Local Path)</label>
              <input
                type="text"
                placeholder="VD: C:\Users\ADMIN\OneDrive\Desktop\DOWNLOAD1\TEST"
                value={scanFolderPath}
                onChange={(e) => setScanFolderPath(e.target.value.replace(/["']/g, ''))}
                className="w-full bg-black/60 border border-emerald-500/30 text-white text-xs rounded-lg h-9 px-3 focus:outline-none focus:border-emerald-400 font-mono"
              />
              <p className="text-[10px] text-gray-400">Worker sẽ tự động phát hiện tất cả các file video nằm trong thư mục này để dịch tự động.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-emerald-400 uppercase">3. Chu kỳ Quét tự động (Phút)</label>
              <input
                type="number"
                min="5"
                max="1440"
                value={scanInterval}
                onChange={(e) => setScanInterval(parseInt(e.target.value) || 60)}
                className="w-full bg-black/60 border border-emerald-500/30 text-white text-xs rounded-lg h-9 px-3 focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>
          </div>
        ) : (
          /* FORM TẠO TÁC VỤ LẺ */
          <div className="space-y-3 bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase flex justify-between items-center">
                <span>Nguồn Video</span>
              </label>

              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300">Đường dẫn Local hoặc Link Video (Bilibili, Douyin, YouTube)</label>
                  <input
                    type="text"
                    placeholder="VD: C:\Video\input.mp4 hoặc https://www.bilibili.com/video/..."
                    value={localFilePaths}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalFilePaths(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 text-zinc-100 text-xs rounded-lg h-9 px-3 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-2">
                  <p className="text-xs text-amber-500 font-semibold mb-1">💡 Mẹo nhập nhiều video cực nhanh (Windows):</p>
                  <ol className="text-[11px] text-gray-300 list-decimal pl-4 space-y-0.5">
                    <li>Bôi đen tất cả các video cần dịch trong máy tính.</li>
                    <li>Giữ phím <strong>Shift + Click chuột phải</strong> vào các file đó.</li>
                    <li>Chọn <strong>&quot;Copy as path&quot;</strong> (Sao chép dưới dạng đường dẫn).</li>
                    <li>Nhấn <strong>Ctrl + V</strong> dán vào ô bên dưới là xong!</li>
                  </ol>
                </div>
                <textarea
                  value={localFilePaths}
                  onChange={(e) => setLocalFilePaths(e.target.value.replace(/["']/g, ''))}
                  placeholder={`C:\\Downloads\\video1.mp4\nD:\\Movies\\video2.mp4\n\n(Bấm Ctrl + V vào đây)`}
                  disabled={creatingTask || isUploadingFile}
                  className="w-full h-28 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none font-mono"
                />
                <div className="flex justify-end pt-1">
                  <input 
                    type="file" 
                    id="localFileInput" 
                    className="hidden" 
                    accept="video/*"
                    onChange={handleLocalFileUpload}
                  />
                  <label 
                    htmlFor="localFileInput" 
                    className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 font-bold"
                  >
                    {isUploadingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
                    Hoặc chọn file từ máy...
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadMode === 'file' && !editingProjectId && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tên Tác Vụ (Tùy chọn)</label>
            <input
              type="text"
              placeholder="VD: Video giải trí số 1"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              disabled={creatingTask || isUploadingFile}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/55 transition-all shadow-inner"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="src-lang" className="text-[10px] font-bold text-gray-400 uppercase">Ngôn ngữ gốc</label>
            <select
              id="src-lang"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              disabled={creatingTask}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
            >
              <option value="zh">Trung Quốc (zh)</option>
              <option value="en">Tiếng Anh (en)</option>
              <option value="ja">Tiếng Nhật (ja)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="tgt-lang" className="text-[10px] font-bold text-gray-400 uppercase">Dịch sang</label>
            <select
              id="tgt-lang"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={creatingTask}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
            >
              <option value="vi">Tiếng Việt (vi)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="asr" className="text-[10px] font-bold text-gray-400 uppercase">Chuyển âm thanh thành text (STT)</label>
          <select
            id="asr"
            value={asrEngine}
            onChange={(e) => setAsrEngine(e.target.value)}
            disabled={creatingTask}
            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
          >
            <option value="faster-whisper">Faster-Whisper (Local)</option>
            <option value="bcut">Bilibili BCut ASR (Free Online)</option>
          </select>
          
          {asrEngine === 'faster-whisper' && (
            <div className="space-y-1.5 pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-[9px] font-bold text-gray-400 uppercase flex items-center justify-between">
                <span>Tốc độ & Chất lượng STT</span>
                <span className="text-[8px] text-amber-500/80 normal-case">Faster-Whisper presets</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-black/25 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setSttPreset('fast')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    sttPreset === 'fast'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">⚡ Nhanh</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Base (Beam 2)</span>
                </button>
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setSttPreset('balanced')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    sttPreset === 'balanced'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">⚖️ Ổn định</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Small (Beam 3)</span>
                </button>
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setSttPreset('quality')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    sttPreset === 'quality'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">💎 Chất lượng</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Small (Beam 5)</span>
                </button>
              </div>
              <p className="text-[8.5px] text-gray-500 leading-relaxed px-1">
                {sttPreset === 'fast' && '⚡ Nhanh: Nhanh gấp ~3.5 lần, độ chính xác ~95-97%. Phù hợp âm rõ.'}
                {sttPreset === 'balanced' && '⚖️ Ổn định: Nhanh gấp ~1.5 lần, độ chính xác ~98-99%. Mặc định.'}
                {sttPreset === 'quality' && '💎 Chất lượng: Độ chính xác ~100%, tốn tài nguyên nhất (Baseline).'}
              </p>
              
              <label className="text-[9px] font-bold text-gray-400 uppercase flex items-center justify-between pt-2">
                <span>Mức độ Tạp âm & Nhạc nền</span>
                <span className="text-[8px] text-amber-500/80 normal-case">VAD noise filters</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-black/25 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setNoiseLevel('clean')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    noiseLevel === 'clean'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">🎤 Ít tạp âm</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Tốc độ: 100%</span>
                </button>
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setNoiseLevel('normal')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    noiseLevel === 'normal'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">🎬 Bình thường</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Tốc độ: ~90-95%</span>
                </button>
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setNoiseLevel('noisy')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    noiseLevel === 'noisy'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">💥 Nhiều tạp âm</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Tốc độ: ~60-80% (AI tách nền)</span>
                </button>
              </div>
              <p className="text-[8.5px] text-gray-500 leading-relaxed px-1">
                {noiseLevel === 'clean' && '🎤 Ít tạp âm: Thích hợp cho podcast, hội thảo, phỏng vấn, âm thanh sạch. Tốc độ giữ nguyên 100%.'}
                {noiseLevel === 'normal' && '🎬 Bình thường: Thích hợp cho vlog, video review, giáo trình. Tốc độ giảm nhẹ còn ~90-95%.'}
                {noiseLevel === 'noisy' && '💥 Nhiều tạp âm: Sử dụng AI Demucs tách riêng giọng nói khỏi nhạc nền trước khi nhận dạng. Phù hợp phim ảnh, video nhạc nền to, cháy nổ. Tốc độ: ~60-80% (thêm bước tách nền).'}
              </p>

              <label className="text-[9px] font-bold text-gray-400 uppercase flex items-center justify-between pt-2">
                <span>Tốc độ Video Gốc (Giảm tốc để lồng tiếng mượt hơn)</span>
                <span className="text-[8px] text-amber-500/80 normal-case">Pre-slowdown</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-black/25 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setVideoSlowdown('1.0')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    videoSlowdown === '1.0'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">⚡ 100%</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Gốc (Không đổi)</span>
                </button>
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setVideoSlowdown('0.95')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    videoSlowdown === '0.95'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">✨ 95%</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Giảm 5%</span>
                </button>
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setVideoSlowdown('0.90')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    videoSlowdown === '0.90'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">🔥 90%</span>
                  <span className="text-[7.5px] text-amber-500/90 font-bold mt-0.5">Khuyên dùng</span>
                </button>
                <button
                  type="button"
                  disabled={creatingTask}
                  onClick={() => setVideoSlowdown('0.85')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                    videoSlowdown === '0.85'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                      : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">🎬 85%</span>
                  <span className="text-[7.5px] text-gray-500 mt-0.5">Giảm 15%</span>
                </button>
              </div>
              <p className="text-[8.5px] text-gray-500 leading-relaxed px-1">
                {videoSlowdown === '1.0' && '⚡ 100%: Giữ nguyên thời lượng video gốc.'}
                {videoSlowdown === '0.95' && '✨ 95%: Giảm nhẹ 5% tốc độ, mắt thường không nhận ra, giúp câu lồng tiếng tiếng Việt đọc thoải mái hơn.'}
                {videoSlowdown === '0.90' && '🔥 90% (Khuyên dùng): Giãn thời lượng 10%, Whisper nhận dạng chuẩn hơn và giọng đọc lồng tiếng AI đọc cực kỳ êm ái, rõ từng từ.'}
                {videoSlowdown === '0.85' && '🎬 85%: Phù hợp phim hành động, hoạt hình hoặc diễn viên nói rất nhanh, cho phép phụ đề và lồng tiếng không bị nuốt chữ.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="translate" className="text-[10px] font-bold text-gray-400 uppercase flex items-center justify-between">
            <span>Dịch thuật (Connect Hub)</span>
            {(!connectedAiApps || connectedAiApps.length === 0) && (
              <Link href={`/t/${teamId}/connect-hub`} className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
                Kết nối ngay <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={selectedAiAppSlug}
              onChange={(e) => {
                setSelectedAiAppSlug(e.target.value);
                if (e.target.value === '') {
                  setSelectedAiModel('');
                } else {
                  const app = connectedAiApps?.find(a => a.slug === e.target.value);
                  if (app && app.models && app.models.length > 0) {
                    setSelectedAiModel(app.models[0].name);
                  } else {
                    setSelectedAiModel('');
                  }
                }
              }}
              disabled={creatingTask}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
            >
              <option value="">Google Dịch (Miễn phí)</option>
              {connectedAiApps?.map(app => (
                <option key={app.slug} value={app.slug}>{app.name}</option>
              ))}
            </select>
            
            <select
              value={selectedAiModel}
              onChange={(e) => setSelectedAiModel(e.target.value)}
              disabled={creatingTask || !selectedAiAppSlug}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 disabled:opacity-50 cursor-pointer"
            >
              {!selectedAiAppSlug ? (
                <option value="">Tự động</option>
              ) : (
                connectedAiApps?.find(a => a.slug === selectedAiAppSlug)?.models.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                )) || <option value="">Chọn Model...</option>
              )}
            </select>
          </div>
          
          {selectedAiAppSlug && (
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 border border-amber-500/20"
              >
                {isTestingConnection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                {isTestingConnection ? 'Đang kiểm tra...' : 'Test kết nối AI'}
              </button>
              {testConnectionResult && (
                <div className={`mt-2 p-2 rounded-lg text-[10px] text-left border ${testConnectionResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {testConnectionResult.msg}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="mode" className="text-[10px] font-bold text-gray-400 uppercase">Phương thức phụ đề</label>
          <select
            id="mode"
            value={subtitleMode}
            onChange={(e) => setSubtitleMode(e.target.value)}
            disabled={creatingTask}
            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
          >
            <option value="burn_subtitle">Burn phụ đề cứng (Mặc định)</option>
            <option value="srt_only">Chỉ xuất file phụ đề SRT</option>
          </select>
        </div>

        {/* Bối cảnh & Từ điển phim */}
        <div className="space-y-2 col-span-1 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="translateContext" className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
              <span>📝 Bối cảnh & Từ điển phim</span>
              <span className="text-[9px] text-amber-400/80 font-normal lowercase">(định hướng xưng hô & sửa lỗi ASR đồng âm)</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoDetectDict}
                disabled={isDetectingDict || creatingTask}
                className="flex items-center gap-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold px-2 py-1 rounded-lg border border-amber-500/30 transition"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isDetectingDict ? 'Đang AI Detect...' : 'AI Auto-Detect'}
              </button>

              <Link
                href={`/hero-dub/t/${teamId}/dictionaries`}
                target="_blank"
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-400 underline transition"
              >
                <BookOpen className="w-3 h-3" /> Kho Từ Điển <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedDictId}
              onChange={(e) => {
                const dictId = e.target.value;
                setSelectedDictId(dictId);
                const found = dbDictionaries.find(d => String(d.id) === dictId);
                if (found) {
                  setTranslateContext(found.promptContent);
                } else if (!dictId) {
                  setTranslateContext('');
                }
              }}
              disabled={creatingTask}
              className="w-1/3 bg-black/40 border border-white/5 rounded-xl px-2.5 py-2 text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-500/55 cursor-pointer"
            >
              <option value="">-- Chọn Mẫu Từ Điển --</option>
              {dbDictionaries.map((dict) => (
                <option key={dict.id} value={dict.id}>
                  {dict.name} {dict.isGlobal ? '(Mẫu chuẩn)' : '(Team)'}
                </option>
              ))}
            </select>

            <textarea
              id="translateContext"
              rows={3}
              value={translateContext}
              onChange={(e) => setTranslateContext(e.target.value)}
              disabled={creatingTask}
              placeholder="Chọn Mẫu Từ Điển hoặc nhấn 'AI Auto-Detect' để hệ thống tự động điền bối cảnh & xưng hô..."
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/55 resize-none font-mono"
            />
          </div>
        </div>


        {/* Lồng tiếng AI (TTS) */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lồng tiếng AI (TTS)</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
                disabled={creatingTask}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {ttsEnabled && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-gray-500 uppercase">Engine lồng tiếng</label>
                <select
                  value={ttsEngine}
                  onChange={(e) => handleTtsEngineChange(e.target.value)}
                  disabled={creatingTask}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                >
                  <option value="edge-tts">Edge-TTS (Miễn phí, rất tự nhiên)</option>
                  <option value="connect-hub">Connect Hub OpenAI (Yêu cầu kết nối OpenAI)</option>
                  {connectedAiTtsApps?.map(app => (
                    <option key={app.slug} value={app.slug}>{app.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-extrabold text-gray-500 uppercase">Giọng lồng tiếng AI</label>
                  <button 
                    type="button" 
                    onClick={handlePreviewVoice}
                    className="text-[9px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 cursor-pointer"
                  >
                    <Play className="h-2.5 w-2.5 fill-current" />
                    Nghe thử
                  </button>
                </div>
                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  disabled={creatingTask}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                >
                  {ttsEngine === 'edge-tts' ? (
                    <>
                      <optgroup label="🇻🇳 Tiếng Việt">
                        <option value="vi-VN-HoaiMyNeural">Hoài Mỹ (Giọng Nữ Miền Nam - Chuẩn)</option>
                        <option value="vi-VN-NamMinhNeural">Nam Minh (Giọng Nam Miền Bắc - Chuẩn)</option>
                      </optgroup>
                      <optgroup label="🇺🇸 Tiếng Anh">
                        <option value="en-US-AriaNeural">Aria (Nữ Mỹ - Tự nhiên)</option>
                        <option value="en-US-ChristopherNeural">Christopher (Nam Mỹ - Trầm ấm)</option>
                        <option value="en-US-GuyNeural">Guy (Nam Mỹ - Tin tức)</option>
                        <option value="en-US-JennyNeural">Jenny (Nữ Mỹ - Thân thiện)</option>
                      </optgroup>
                      <optgroup label="🇨🇳 Tiếng Trung">
                        <option value="zh-CN-XiaoxiaoNeural">Xiaoxiao (Nữ Trung - Sống động)</option>
                        <option value="zh-CN-YunxiNeural">Yunxi (Nam Trung - Ấm áp)</option>
                      </optgroup>
                    </>
                  ) : ttsEngine === 'connect-hub' ? (
                    <>
                      <option value="nova">Nova (Nữ - Mặc định)</option>
                      <option value="alloy">Alloy (Trung tính)</option>
                      <option value="echo">Echo (Nam ấm áp)</option>
                      <option value="fable">Fable (Sinh động)</option>
                      <option value="onyx">Onyx (Nam trầm)</option>
                      <option value="shimmer">Shimmer (Nữ trong trẻo)</option>
                    </>
                  ) : (
                    <>
                      {connectedAiTtsApps?.find(a => a.slug === ttsEngine)?.voices?.map(voice => (
                        <option key={voice} value={voice}>{voice}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-gray-500 uppercase">Tốc độ đọc</label>
                <select
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(e.target.value)}
                  disabled={creatingTask}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer disabled:opacity-50"
                >
                  <option value="0.8">0.8x (Chậm)</option>
                  <option value="1.0">1.0x (Bình thường)</option>
                  <option value="1.1">1.1x (Hơi nhanh)</option>
                  <option value="1.2">1.2x (Nhanh vừa)</option>
                  <option value="1.3">1.3x (Nhanh)</option>
                  <option value="1.4">1.4x (Rất nhanh)</option>
                  <option value="1.5">1.5x (Cực nhanh)</option>
                </select>
              </div>
            </div>
          )}
            
          {ttsEnabled && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-gray-500 uppercase">Âm lượng Video Gốc</label>
                <select
                  value={bgVolume}
                  onChange={(e) => setBgVolume(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                >
                  <option value="0.0">Tắt âm (0.0)</option>
                  <option value="0.2">Rất bé (0.2)</option>
                  <option value="0.5">Bé (0.5)</option>
                  <option value="0.8">Vừa (0.8)</option>
                  <option value="1.0">Mặc định (1.0)</option>
                  <option value="1.5">Lớn (1.5)</option>
                  <option value="2.0">Rất lớn (2.0)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-gray-500 uppercase">Âm lượng Giọng AI</label>
                <select
                  value={ttsVolume}
                  onChange={(e) => setTtsVolume(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                >
                  <option value="0.5">Bé (0.5)</option>
                  <option value="1.0">Vừa (1.0)</option>
                  <option value="1.5">Mặc định (1.5)</option>
                  <option value="2.0">Lớn (2.0)</option>
                  <option value="2.5">Rất lớn (2.5)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Thiết kế lại Ảnh Bìa (AI Thumbnail) */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🖼️ Thiết kế lại Ảnh Bìa (AI Thumbnail)</span>
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={redesignThumbnailEnabled}
                onChange={(e) => setRedesignThumbnailEnabled(e.target.checked)}
                disabled={creatingTask}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {redesignThumbnailEnabled && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-extrabold text-amber-300 uppercase">Ứng dụng AI Chỉnh Ảnh (Connect Hub)</label>
                  {(!connectedAiImageApps || connectedAiImageApps.length === 0) && (
                    <Link href={`/t/${teamId}/connect-hub`} className="text-[9px] text-amber-500 hover:text-amber-400 flex items-center gap-1">
                      Kết nối ngay <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}
                </div>
                <select
                  value={thumbnailAiAppSlug}
                  onChange={(e) => {
                    setThumbnailAiAppSlug(e.target.value);
                    const app = connectedAiImageApps?.find(a => a.slug === e.target.value);
                    if (app && app.models && app.models.length > 0) {
                      setThumbnailAiModel(app.models[0].id || app.models[0].name);
                    } else {
                      setThumbnailAiModel('');
                    }
                  }}
                  disabled={creatingTask}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                >
                  <option value="">-- Chọn Ứng dụng Image AI --</option>
                  {connectedAiImageApps?.map(app => (
                    <option key={app.slug} value={app.slug}>
                      {app.name}
                    </option>
                  ))}
                </select>
              </div>

              {thumbnailAiAppSlug && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[9px] font-extrabold text-amber-300 uppercase">AI Model (Mô hình)</label>
                  <select
                    value={thumbnailAiModel}
                    onChange={(e) => setThumbnailAiModel(e.target.value)}
                    disabled={creatingTask || !thumbnailAiAppSlug}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                  >
                    {!thumbnailAiAppSlug ? (
                      <option value="">Vui lòng chọn Ứng dụng AI trước</option>
                    ) : (
                      <>
                        <option value="">-- Chọn Mô hình AI --</option>
                        {connectedAiImageApps?.find(a => a.slug === thumbnailAiAppSlug)?.models?.map(m => (
                          <option key={m.id || m.name} value={m.id || m.name}>
                            {m.name || m.id}
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={handleTestImageConnection}
                      disabled={isTestingImageAi}
                      className="text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 border border-amber-500/20 cursor-pointer"
                    >
                      {isTestingImageAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      {isTestingImageAi ? 'Đang thử nghiệm tạo mẫu...' : 'Test kết nối & Thử nghiệm mẫu'}
                    </button>
                    {testImageAiResult && (
                      <div className={`mt-2 p-2 rounded-lg text-[10px] text-left border ${testImageAiResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        <div>{testImageAiResult.msg}</div>
                        {testImageAiResult.imageUrl && (
                          <div className="mt-2">
                            <span className="block text-[9px] text-gray-400 mb-1">Mẫu ảnh AI sinh ra:</span>
                            {testImageAiResult.imageUrl.startsWith('http') ? (
                              <img src={testImageAiResult.imageUrl} alt="AI Preview" className="w-32 h-32 object-cover rounded-lg border border-amber-500/30" />
                            ) : (
                              <div className="p-1 bg-black/50 font-mono text-[8px] break-all max-h-20 overflow-y-auto rounded">{testImageAiResult.imageUrl}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 border-t border-amber-500/20 pt-3">
                <label className="text-[9px] font-extrabold text-amber-300 uppercase">Nguồn Logo Mẫu Chèn Vào Ảnh</label>
                <select
                  value={thumbnailLogoSource}
                  onChange={(e) => setThumbnailLogoSource(e.target.value)}
                  disabled={creatingTask}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                >
                  <option value="project">Dùng Logo Thương Hiệu (Lấy từ Dự án đã chọn)</option>
                  <option value="custom">Tải lên Logo Tùy Chỉnh (Nhập URL Logo)</option>
                  <option value="none">Không chèn logo (Chỉ dịch chữ trên ảnh)</option>
                </select>
              </div>

              {thumbnailLogoSource === 'project' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[9px] font-extrabold text-amber-300 uppercase">Chọn Dự Án Lấy Logo</label>
                  <select
                    value={thumbnailProjectId}
                    onChange={(e) => setThumbnailProjectId(e.target.value === '' ? '' : parseInt(e.target.value))}
                    disabled={creatingTask}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                  >
                    <option value="">-- Chọn Dự án (Thương hiệu) --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.logoUrl ? '(Có Logo)' : '(Chưa có Logo)'}</option>
                    ))}
                  </select>
                </div>
              )}

              {thumbnailLogoSource === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-gray-400 uppercase">Đường dẫn Logo Tùy Chỉnh (URL / Path)</label>
                  <input
                    type="text"
                    value={customThumbnailLogoUrl}
                    onChange={(e) => setCustomThumbnailLogoUrl(e.target.value)}
                    disabled={creatingTask}
                    placeholder="VD: https://domain.com/logo.png hoặc C:\logo.png"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/55 font-mono"
                  />
                </div>
              )}

              {thumbnailLogoSource !== 'none' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-amber-300 uppercase">Vị Trí Hiển Thị Logo Trên Ảnh</label>
                  <select
                    value={thumbnailLogoPosition}
                    onChange={(e) => setThumbnailLogoPosition(e.target.value)}
                    disabled={creatingTask}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                  >
                    <option value="top-left">Góc trên bên trái (Top-Left) - Mặc định</option>
                    <option value="top-right">Góc trên bên phải (Top-Right)</option>
                    <option value="bottom-left">Góc dưới bên trái (Bottom-Left)</option>
                    <option value="bottom-right">Góc dưới bên phải (Bottom-Right)</option>
                    <option value="center">Ở giữa ảnh (Center)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Branding */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chèn Logo & Intro/Outro</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={brandingEnabled}
                onChange={(e) => {
                  setBrandingEnabled(e.target.checked);
                  if (!e.target.checked) setSelectedProjectId('');
                }}
                disabled={creatingTask}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {brandingEnabled && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-extrabold text-gray-500 uppercase">Chọn Thương hiệu Branding</label>
                  <Link 
                    href={`/hero-dub/t/${teamId}/projects`}
                    className="text-[9px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
                  >
                    Quản lý Thương hiệu
                  </Link>
                </div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value === '' ? '' : parseInt(e.target.value))}
                  disabled={creatingTask}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer"
                >
                  <option value="">-- Chọn Thương hiệu (Bỏ qua) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedProjectId !== '' && projects.find(p => p.id === selectedProjectId) && (
                  <div className="bg-white/5 p-2 rounded-lg text-[10px] text-gray-400 space-y-1 mt-1">
                    {projects.find(p => p.id === selectedProjectId)?.logoUrl && <div>• Có Logo ({projects.find(p => p.id === selectedProjectId)?.logoPosition})</div>}
                    {projects.find(p => p.id === selectedProjectId)?.introVideoUrl && <div>• Có Video Intro</div>}
                    {projects.find(p => p.id === selectedProjectId)?.outroVideoUrl && <div>• Có Video Outro</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-white/5">
          <label htmlFor="output-folder" className="text-[10px] font-bold text-gray-400 uppercase">Thư mục lưu kết quả (Tùy chọn)</label>
          <input
            id="output-folder"
            type="text"
            placeholder="VD: C:\Users\ADMIN\Videos"
            value={outputFolder}
            onChange={(e) => setOutputFolder(e.target.value.replace(/["']/g, ''))}
            disabled={creatingTask}
            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/55 transition-all"
          />
          <p className="text-[9px] text-gray-500 font-medium">Bỏ trống để dùng thư mục mặc định của Worker</p>
        </div>

        {uploadMode === 'folder' || editingProjectId ? (
          <button
            type="button"
            onClick={handleSaveScanProject}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Check className="h-4 w-4" />
            Lưu Cấu Hình Dự Án Quét Thư Mục
          </button>
        ) : (
          <div className="flex gap-2 w-full">
            {editingTaskId && (
              <button
                type="button"
                onClick={() => setEditingTaskId(null)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer"
              >
                Hủy Sửa
              </button>
            )}
            <button
              type="submit"
              disabled={creatingTask || (!editingTaskId && !localFilePaths.trim())}
              className={`flex items-center justify-center gap-1.5 px-3 py-3 bg-gradient-to-r hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide shadow-lg transition-all cursor-pointer ${editingTaskId ? 'from-blue-500 to-indigo-500 shadow-blue-500/10 flex-[2]' : 'from-amber-500 to-orange-500 shadow-orange-500/10 w-full'}`}
            >
              {creatingTask ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {editingTaskId ? 'Cập Nhật & Chạy Lại' : 'Bắt đầu dịch thuật'}
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  </div>
);
}
