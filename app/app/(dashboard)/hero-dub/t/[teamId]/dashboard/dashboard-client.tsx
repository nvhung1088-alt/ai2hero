'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSmartPolling } from '@/hooks/use-smart-polling';
import { PollingBanner } from '@/components/polling-banner';
import {
  createDubTaskAction,
  getDubTasksAction,
  getDubWorkersAction,
  retryDubTaskAction,
  deleteDubTaskAction,
  deleteDubWorkerAction,
  resetDubWorkerAction,
  getDubProjectsAction,
  updateAndRetryDubTaskAction,
  clearAllDubDataAction,
  pauseDubTaskAction,
  resumeDubTaskAction,
  clearUnassignedDubTasksAction,
  pauseAllDubTasksAction,
  resumeAllDubTasksAction,
} from '@/lib/db/hero-dub-actions';
import {
  getDubScanConfigsAction,
  saveDubScanConfigAction,
  deleteDubScanConfigAction,
} from '@/lib/db/hero-dub-scan-actions';
import { generateLinkCode } from '@/lib/db/extension-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import {
  Key,
  Copy,
  Check,
  Loader2,
  X,
  Download,
  BookOpen,
  Shield,
  MessageCircle,
  Plus,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { generateLivePreviewAudioAction } from '@/lib/db/tts-preview-actions';

// Shared & Sub-components
import { formatTime } from '../_shared/dub-ui-helpers';
import DubGuidePanel from './dub-guide-panel';
import DubWorkerPanel from './dub-worker-panel';
import DubTaskForm from './dub-task-form';
import DubTaskTable from './dub-task-table';
import { DubScanSidebar } from './dub-scan-sidebar';
import { DubScanProjectPane } from './dub-scan-project-pane';

interface DashboardClientProps {
  teamId: number;
  userId: number;
  teamName: string;
  connectedAiApps?: { slug: string; name: string; models: any[] }[];
  connectedAiTtsApps?: { slug: string; name: string; voices: string[] }[];
  connectedAiImageApps?: { slug: string; name: string; models: any[] }[];
  initialTasks?: any[];
  initialTotalCount?: number;
  initialTaskStats?: { total: number; processing: number; pending: number; completed: number; failed: number };
  initialProjects?: any[];
  initialScanConfigs?: any[];
}

export default function DashboardClient({
  teamId,
  userId,
  connectedAiApps,
  connectedAiTtsApps,
  connectedAiImageApps,
  initialTasks = [],
  initialTotalCount = 0,
  initialTaskStats = { total: 0, processing: 0, pending: 0, completed: 0, failed: 0 },
  initialProjects = [],
  initialScanConfigs = []
}: DashboardClientProps) {
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [loading, setLoading] = useState(initialTasks.length === 0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotalCount, setTaskTotalCount] = useState(initialTotalCount);
  const [taskStats, setTaskStats] = useState(initialTaskStats);
  const [selectedScanConfigId, setSelectedScanConfigId] = useState<number | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [tasksPerPage, setTasksPerPage] = useState<number>(20);

  const handlePauseTask = async (taskId: number) => {
    const res = await pauseDubTaskAction(taskId, teamId);
    if (res.error) showToast(res.error, 'error');
    else { showToast('Đã tạm dừng tác vụ', 'success'); refreshData(false); }
  };

  const handleResumeTask = async (taskId: number) => {
    const res = await resumeDubTaskAction(taskId, teamId);
    if (res.error) showToast(res.error, 'error');
    else { showToast('Đã tiếp tục tác vụ', 'success'); refreshData(false); }
  };

  const handleClearAllData = async () => {
    if (window.confirm('⚠️ Bạn có chắc chắn muốn XÓA SẠCH tất cả các dự án quét và tác vụ dịch thuật không? Thao tác này không thể hoàn tác!')) {
      const res = await clearAllDubDataAction(teamId);
      if (res.error) showToast(res.error, 'error');
      else { showToast('Đã dọn dẹp sạch sẽ toàn bộ dữ liệu!', 'success'); refreshData(true); }
    }
  };

  const handleClearUnassignedTasks = async () => {
    if (window.confirm('⚠️ Bạn có chắc chắn muốn xóa TẤT CẢ các tác vụ dịch lẻ (tự do) không?')) {
      const res = await clearUnassignedDubTasksAction(teamId);
      if (res.error) showToast(res.error, 'error');
      else { showToast('Đã xóa tất cả tác vụ lẻ thành công!', 'success'); refreshData(true); }
    }
  };

  const handlePauseAllTasks = async () => {
    const res = await pauseAllDubTasksAction(teamId, selectedScanConfigId);
    if (res.error) showToast(res.error, 'error');
    else { showToast('Đã tạm dừng tất cả tác vụ trong hàng đợi!', 'success'); refreshData(false); }
  };

  const handleResumeAllTasks = async () => {
    const res = await resumeAllDubTasksAction(teamId, selectedScanConfigId);
    if (res.error) showToast(res.error, 'error');
    else { showToast('Đã kích hoạt lại tất cả tác vụ!', 'success'); refreshData(false); }
  };

  const handleResetWorker = async (workerId: number) => {
    const res = await resetDubWorkerAction(workerId, teamId);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Đã gỡ lỗi và giải phóng ${res.releasedCount} tác vụ về hàng đợi!`, 'success');
      refreshData(true);
    }
  };

  // Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [sourceLang, setSourceLang] = useState('zh');
  const [targetLang, setTargetLang] = useState('vi');
  const [asrEngine, setAsrEngine] = useState('faster-whisper');
  const [sttPreset, setSttPreset] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [noiseLevel, setNoiseLevel] = useState<'clean' | 'normal' | 'noisy'>('normal');
  const [subtitleMode, setSubtitleMode] = useState('burn_subtitle');
  const [translateContext, setTranslateContext] = useState('');

  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsEngine, setTtsEngine] = useState('edge-tts');
  const [ttsVoice, setTtsVoice] = useState('vi-VN-HoaiMyNeural');
  const [ttsSpeed, setTtsSpeed] = useState('1.2');
  const [bgVolume, setBgVolume] = useState('1.0');
  const [ttsVolume, setTtsVolume] = useState('1.5');
  const [outputFolder, setOutputFolder] = useState('');
  
  // Branding State
  const [brandingEnabled, setBrandingEnabled] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');

  const handleTtsEngineChange = (engine: string) => {
    setTtsEngine(engine);
    if (engine === 'edge-tts') {
      setTtsVoice('vi-VN-HoaiMyNeural');
    } else if (engine === 'connect-hub') {
      setTtsVoice('nova');
    } else {
      const app = connectedAiTtsApps?.find(a => a.slug === engine);
      if (app && app.voices && app.voices.length > 0) {
        setTtsVoice(app.voices[0]);
      } else {
        setTtsVoice('');
      }
    }
  };

  const handlePreviewVoice = async () => {
    try {
      const cacheKey = `preview-audio-${ttsEngine}-${ttsVoice}`;
      const urlStatic = `/audio/samples/${ttsVoice}.mp3`;

      const playAudio = (src: string) => {
        const audio = new Audio(src);
        const speed = parseFloat(ttsSpeed);
        if (!isNaN(speed) && speed > 0) {
          audio.playbackRate = speed;
        }
        audio.play().catch(e => {
          showToast(`Không thể phát âm thanh: ${e.message}`, "error");
        });
      };

      if ('caches' in window) {
        const cache = await caches.open('ai2hero-audio-cache');
        const cachedRes = await cache.match(cacheKey);
        if (cachedRes) {
          showToast(`Đang phát mẫu (Local Cache): ${ttsVoice}...`, "success");
          const blob = await cachedRes.blob();
          playAudio(URL.createObjectURL(blob));
          return;
        }
      }

      const staticRes = await fetch(urlStatic, { method: 'HEAD' });
      if (staticRes.ok) {
        if ('caches' in window) {
          const cache = await caches.open('ai2hero-audio-cache');
          const resToCache = await fetch(urlStatic);
          cache.put(cacheKey, resToCache.clone());
        }
        showToast(`Đang phát mẫu (Static): ${ttsVoice}...`, "success");
        playAudio(urlStatic);
        return;
      }

      showToast(`Đang kết nối Live Server để lấy âm thanh (${ttsEngine})...`, "warning");
      const res = await generateLivePreviewAudioAction(Number(teamId), ttsEngine, ttsVoice);
      if (!res.success) {
        showToast(res.error || 'Chưa hỗ trợ hoặc lỗi Server', "error");
        return;
      }

      const base64 = res.base64Audio;
      const dataUrl = `data:audio/mp3;base64,${base64}`;

      if ('caches' in window) {
        try {
          const fetchRes = await fetch(dataUrl);
          const cache = await caches.open('ai2hero-audio-cache');
          cache.put(cacheKey, fetchRes.clone());
        } catch (e) {
          console.error("Lỗi cache data URI", e);
        }
      }

      showToast(`Đã tải Live thành công, đang phát...`, "success");
      playAudio(dataUrl);

    } catch (err: any) {
      console.error(err);
      showToast(`Lỗi nghe thử: ${err.message}`, "error");
    }
  };
  
  const [selectedAiAppSlug, setSelectedAiAppSlug] = useState<string>('');
  const [selectedAiModel, setSelectedAiModel] = useState<string>('');

  const [redesignThumbnailEnabled, setRedesignThumbnailEnabled] = useState<boolean>(false);
  const [thumbnailLogoSource, setThumbnailLogoSource] = useState<string>('project');
  const [customThumbnailLogoUrl, setCustomThumbnailLogoUrl] = useState<string>('');
  const [thumbnailAiAppSlug, setThumbnailAiAppSlug] = useState<string>('');
  const [thumbnailAiModel, setThumbnailAiModel] = useState<string>('');

  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  useEffect(() => {
    if (!hasLoadedSettings) {
      try {
        const saved = localStorage.getItem('heroDubSettings');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.sourceLang) setSourceLang(s.sourceLang);
          if (s.targetLang) setTargetLang(s.targetLang);
          if (s.asrEngine) {
            if (s.asrEngine.includes(':')) {
              const parts = s.asrEngine.split(':');
              setAsrEngine(parts[0]);
              setSttPreset(parts[1] as any);
              if (parts[2]) setNoiseLevel(parts[2] as any);
            } else {
              setAsrEngine(s.asrEngine);
            }
          }
          if (s.sttPreset) setSttPreset(s.sttPreset);
          if (s.noiseLevel) setNoiseLevel(s.noiseLevel);
          if (s.subtitleMode) setSubtitleMode(s.subtitleMode);
          if (s.ttsEnabled !== undefined) setTtsEnabled(s.ttsEnabled);
          if (s.ttsEngine) setTtsEngine(s.ttsEngine);
          if (s.ttsVoice) setTtsVoice(s.ttsVoice);
          if (s.ttsSpeed) setTtsSpeed(s.ttsSpeed);
          if (s.bgVolume) setBgVolume(s.bgVolume);
          if (s.ttsVolume) setTtsVolume(s.ttsVolume);
          if (s.outputFolder) setOutputFolder(s.outputFolder);
          
          if (s.selectedAiAppSlug !== undefined) setSelectedAiAppSlug(s.selectedAiAppSlug);
          if (s.selectedAiModel !== undefined) setSelectedAiModel(s.selectedAiModel);
          if (s.redesignThumbnailEnabled !== undefined) setRedesignThumbnailEnabled(s.redesignThumbnailEnabled);
          if (s.thumbnailLogoSource !== undefined) setThumbnailLogoSource(s.thumbnailLogoSource);
          if (s.customThumbnailLogoUrl !== undefined) setCustomThumbnailLogoUrl(s.customThumbnailLogoUrl);
          if (s.thumbnailAiAppSlug !== undefined) setThumbnailAiAppSlug(s.thumbnailAiAppSlug);
          if (s.thumbnailAiModel !== undefined) setThumbnailAiModel(s.thumbnailAiModel);
          setHasLoadedSettings(true);
          return;
        }
      } catch (e) {}
    }

    if (!hasLoadedSettings && connectedAiApps && connectedAiApps.length > 0) {
      const deepseekApp = connectedAiApps.find(app => app.slug === 'deepseek');
      if (deepseekApp) {
        setSelectedAiAppSlug(deepseekApp.slug);
        if (deepseekApp.models && deepseekApp.models.length > 0) {
          setSelectedAiModel(deepseekApp.models[0].name);
        }
      } else {
        setSelectedAiAppSlug(connectedAiApps[0].slug);
        if (connectedAiApps[0].models && connectedAiApps[0].models.length > 0) {
          setSelectedAiModel(connectedAiApps[0].models[0].name);
        }
      }
      setHasLoadedSettings(true);
    } else if (!hasLoadedSettings && connectedAiApps) {
      setHasLoadedSettings(true);
    }
  }, [connectedAiApps, hasLoadedSettings]);

  useEffect(() => {
    if (hasLoadedSettings) {
      const settings = {
        sourceLang, targetLang, asrEngine, sttPreset, noiseLevel, subtitleMode, ttsEnabled, ttsEngine,
        ttsVoice, ttsSpeed, bgVolume, ttsVolume, outputFolder,
        selectedAiAppSlug, selectedAiModel,
        redesignThumbnailEnabled, thumbnailLogoSource, customThumbnailLogoUrl, thumbnailAiAppSlug, thumbnailAiModel
      };
      localStorage.setItem('heroDubSettings', JSON.stringify(settings));
    }
  }, [sourceLang, targetLang, asrEngine, sttPreset, noiseLevel, subtitleMode, ttsEnabled, ttsEngine, ttsVoice, ttsSpeed, bgVolume, ttsVolume, outputFolder, selectedAiAppSlug, selectedAiModel, redesignThumbnailEnabled, thumbnailLogoSource, customThumbnailLogoUrl, thumbnailAiAppSlug, thumbnailAiModel, hasLoadedSettings]);

  const [creatingTask, setCreatingTask] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [localFilePaths, setLocalFilePaths] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'folder'>('file');
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  interface AutoScanProject {
    id: string;
    name: string;
    folderPath: string;
    intervalMinutes: number;
    sourceLang: string;
    targetLang: string;
    asrEngine: string;
    subtitleMode: string;
    ttsEnabled: boolean;
    ttsEngine: string;
    ttsVoice: string;
    ttsSpeed: string;
    bgVolume: string;
    ttsVolume: string;
    outputFolder?: string;
    translateContext?: string;
    aiAppSlug: string;
    aiModel: string;
    redesignThumbnailEnabled?: boolean;
    thumbnailLogoSource?: string;
    customThumbnailLogoUrl?: string;
    thumbnailAiAppSlug?: string;
    thumbnailAiModel?: string;
    isActive: boolean;
    scannedCount: number;
    lastScanAt?: number | string | Date | null;
  }
  const [scanProjects, setScanProjects] = useState<AutoScanProject[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [translateEngine, setTranslateEngine] = useState('google-free');
  const [qualityPreset, setQualityPreset] = useState('balanced');
  const [scanFolderPath, setScanFolderPath] = useState('');
  const [scanInterval, setScanInterval] = useState(60);

  // Pairing State
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<Date | null>(null);
  const [pairingTimeLeft, setPairingTimeLeft] = useState<number>(0);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingCopied, setPairingCopied] = useState(false);

  // Guide State
  const [showGuide, setShowGuide] = useState(true);
  const [guideCopied, setGuideCopied] = useState(false);

  useEffect(() => {
    const hideGuide = localStorage.getItem('hideHerodubGuide');
    if (hideGuide === 'true') {
      setShowGuide(false);
    }
  }, []);

  const handleToggleGuide = () => {
    const newVal = !showGuide;
    setShowGuide(newVal);
    if (!newVal) {
      localStorage.setItem('hideHerodubGuide', 'true');
    } else {
      localStorage.removeItem('hideHerodubGuide');
    }
  };
  const [guideOs, setGuideOs] = useState<'windows' | 'macos'>('windows');

  const winCmd = 'curl -o herodub-setup.bat https://ai2hero-flax.vercel.app/uploads/herodub-setup.bat?v=14 & herodub-setup.bat --server https://ai2hero-flax.vercel.app';
  const macCmd = 'curl -o herodub-setup.sh https://www.ai2hero.com/uploads/herodub-setup.sh && chmod +x herodub-setup.sh && ./herodub-setup.sh';

  const handleCopyGuideCommand = () => {
    navigator.clipboard.writeText(guideOs === 'windows' ? winCmd : macCmd);
    setGuideCopied(true);
    showToast('Đã sao chép lệnh cài đặt!', 'success');
    setTimeout(() => setGuideCopied(false), 2000);
  };

  // Preview Modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewSrtUrl, setPreviewSrtUrl] = useState<string | null>(null);

  // Fetch Tasks and Workers
  const refreshData = useCallback(async (showLoading = false, page = taskPage, filter = taskFilter, perPage = tasksPerPage) => {
    if (showLoading) setLoading(true);
    try {
      const offset = (page - 1) * perPage;
      const [tasksRes, workersRes, projectsRes, scanConfigsRes] = await Promise.all([
        getDubTasksAction(teamId, { scanConfigId: selectedScanConfigId, status: filter, limit: perPage, offset }),
        getDubWorkersAction(teamId),
        getDubProjectsAction(teamId),
        getDubScanConfigsAction(teamId),
      ]);

      if (tasksRes.success && tasksRes.tasks) {
        setTasks(tasksRes.tasks);
        setTaskTotalCount(tasksRes.totalCount || 0);
        if (tasksRes.taskStats) setTaskStats(tasksRes.taskStats);
      }
      if (workersRes.success && workersRes.workers) {
        setWorkers(workersRes.workers);
      }
      if (projectsRes.success && projectsRes.projects) {
        setProjects(projectsRes.projects);
      }
      if (scanConfigsRes.success && scanConfigsRes.configs) {
        const mappedConfigs: AutoScanProject[] = scanConfigsRes.configs.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          folderPath: c.folderPath,
          intervalMinutes: c.intervalMinutes,
          sourceLang: c.sourceLang,
          targetLang: c.targetLang,
          asrEngine: c.asrEngine,
          subtitleMode: c.subtitleMode,
          ttsEnabled: c.ttsEnabled,
          ttsEngine: c.ttsEngine,
          ttsVoice: c.ttsVoice,
          ttsSpeed: c.ttsSpeed,
          bgVolume: c.bgVolume,
          ttsVolume: c.ttsVolume,
          outputFolder: c.outputFolder,
          translateContext: c.translateContext || '',
          aiAppSlug: c.aiAppSlug || '',
          aiModel: c.aiModel || '',
          redesignThumbnailEnabled: c.redesignThumbnailEnabled ?? false,
          thumbnailLogoSource: c.thumbnailLogoSource || 'project',
          customThumbnailLogoUrl: c.customThumbnailLogoUrl || '',
          thumbnailAiAppSlug: c.thumbnailAiAppSlug || '',
          thumbnailAiModel: c.thumbnailAiModel || '',
          lastScanAt: c.lastScanAt ? new Date(c.lastScanAt).getTime() : undefined,
          isActive: c.isActive !== undefined ? c.isActive : true,
          scannedCount: c.scannedCount || 0
        }));
        setScanProjects(mappedConfigs);
      }
    } catch (err) {
      console.error('Refresh data error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [teamId, taskPage, selectedScanConfigId, taskFilter, tasksPerPage]);

  useSmartPolling({
    appId: 'hero-dub',
    fetchFn: async () => {
      await refreshData(false);
      return false;
    },
  });

  useEffect(() => {
    refreshData(true);
  }, [selectedScanConfigId, taskPage, refreshData]);

  // Pairing Code Countdown Timer
  useEffect(() => {
    if (!pairingExpiresAt) return;

    const timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const diff = Math.max(0, Math.floor((new Date(pairingExpiresAt).getTime() - Date.now()) / 1000));
      setPairingTimeLeft(diff);
      if (diff === 0) {
        setPairingCode(null);
        setPairingExpiresAt(null);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pairingExpiresAt]);

  const handleOpenLocal = async (path: string, _isFolder: boolean = false) => {
    try {
      const res = await fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(path)}`, {
        method: 'GET'
      });
      if (!res.ok) {
        throw new Error('Worker Local Server is not running.');
      }
    } catch (err: any) {
      console.error('Failed to open local path', err);
      try {
        await navigator.clipboard.writeText(path);
        showToast('Đã copy đường dẫn. Bạn có thể tự dán vào thư mục (Explorer) để mở!', 'success');
      } catch (e) {
        showToast(`Không thể tự động mở, vui lòng dùng đường dẫn đã copy.`, 'warning');
      }
    }
  };

  const handleGenerateCode = async () => {
    setPairingLoading(true);
    try {
      const res = await generateLinkCode(teamId, userId);
      if (res.success && res.code && res.expiresAt) {
        setPairingCode(res.code);
        setPairingExpiresAt(new Date(res.expiresAt));
        setPairingTimeLeft(Math.max(0, Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000)));
        showToast('Sinh mã liên kết thành công!', 'success');
      } else {
        showToast(res.error || 'Lỗi sinh mã liên kết.', 'error');
      }
    } catch (err) {
      console.error('Pairing error:', err);
      showToast('Lỗi hệ thống khi tạo mã.', 'error');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setPairingCopied(true);
    showToast('Đã sao chép mã liên kết!', 'success');
    setTimeout(() => setPairingCopied(false), 2000);
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setUploadProgressMsg('Đang gửi file xuống Local Worker...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch('http://127.0.0.1:3001/upload', {
        method: 'POST',
        body: arrayBuffer,
      });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        const currentPaths = localFilePaths.trim();
        setLocalFilePaths(currentPaths ? `${currentPaths}\n${data.path}` : data.path);
        showToast('Đã chuyển file xuống Worker thành công!', 'success');
      } else {
        throw new Error(data.message || 'Lỗi từ Worker');
      }
    } catch (err: any) {
      console.error('Local upload error:', err);
      showToast(`Lỗi gửi file xuống Worker: ${err.message}. Đảm bảo Worker đang chạy!`, 'error');
    } finally {
      setIsUploadingFile(false);
      setUploadProgressMsg('');
      if (e.target) e.target.value = '';
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.sourceTitle || '');
    setSourceLang(task.sourceLang);
    setTargetLang(task.targetLang);
    
    if (task.asrEngine.includes(':')) {
      const parts = task.asrEngine.split(':');
      setAsrEngine(parts[0]);
      if (parts[1]) setSttPreset(parts[1]);
      if (parts[2]) setNoiseLevel(parts[2]);
    } else {
      setAsrEngine(task.asrEngine);
    }

    setTranslateEngine(task.translateEngine === 'connect-hub' ? 'google' : task.translateEngine);
    setTranslateContext(task.translateContext || '');
    if (task.llmModel) {
      setTranslateEngine('connect-hub');
      const parts = task.llmModel.split('|');
      setSelectedAiAppSlug(parts[0]);
      setSelectedAiModel(parts[1]);
    }

    setSubtitleMode(task.subtitleMode || 'burn_subtitle');
    setQualityPreset(task.qualityPreset || 'balanced');
    setTtsEnabled(task.ttsEnabled);
    if (task.ttsEngine) setTtsEngine(task.ttsEngine);
    if (task.ttsVoice) setTtsVoice(task.ttsVoice);
    if (task.ttsSpeed) setTtsSpeed(task.ttsSpeed);
    if (task.bgVolume) setBgVolume(task.bgVolume);
    if (task.ttsVolume) setTtsVolume(task.ttsVolume);

    setUploadMode('file');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Đã tải thông số tác vụ để chỉnh sửa.', 'info');
  };

  const handleCreateTask = async (_e: React.FormEvent) => {
    if (uploadMode === 'file') {
      if (!localFilePaths.trim()) {
        showToast('Vui lòng nhập đường dẫn video.', 'warning');
        return;
      }
    }
    
    setCreatingTask(true);

    const selProj = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
    const taskBranding = {
      brandingEnabled: selectedProjectId !== '',
      projectId: selProj ? selProj.id : undefined,
      logoUrl: selProj ? selProj.logoUrl : undefined,
      logoPosition: selProj ? selProj.logoPosition : undefined,
      introVideoUrl: selProj ? selProj.introVideoUrl : undefined,
      outroVideoUrl: selProj ? selProj.outroVideoUrl : undefined,
    };

    try {
      if (editingTaskId) {
        setUploadProgressMsg(`Đang cập nhật tác vụ #${editingTaskId}...`);
        const res = await updateAndRetryDubTaskAction(editingTaskId, teamId, {
          asrEngine: asrEngine === 'faster-whisper' ? `faster-whisper:${sttPreset}:${noiseLevel}` : asrEngine,
          translateEngine: translateEngine,
          llmModel: selectedAiAppSlug && selectedAiModel ? `${selectedAiAppSlug}|${selectedAiModel}` : undefined,
          subtitleMode,
          qualityPreset,
          ttsEnabled,
          ttsEngine: ttsEnabled ? ttsEngine : undefined,
          ttsVoice: ttsEnabled ? ttsVoice : undefined,
          ttsSpeed: ttsEnabled ? ttsSpeed : undefined,
          bgVolume: ttsEnabled ? bgVolume : undefined,
          ttsVolume: ttsEnabled ? ttsVolume : undefined,
          translateContext: translateContext,
          redesignThumbnailEnabled,
          thumbnailLogoSource,
          customThumbnailLogoUrl,
          thumbnailAiAppSlug,
          thumbnailAiModel,
        });

        if (res.error) {
          showToast(`Lỗi: ${res.error}`, 'error');
        } else {
          showToast(`Đã cập nhật và yêu cầu chạy lại tác vụ #${editingTaskId}!`, 'success');
          setEditingTaskId(null);
          refreshData();
        }
      } else if (localFilePaths.trim() !== '') {
        const paths = localFilePaths.split('\n').filter(p => p.trim() !== '');
        let successCount = 0;
        for (let i = 0; i < paths.length; i++) {
          let pathStr = paths[i].trim();
          pathStr = pathStr.replace(/^["']+|["']+$/g, '').trim();
          const fileName = pathStr.split('\\').pop()?.split('/').pop() || 'Video';
          setUploadProgressMsg(`Đang xử lý ${i + 1}/${paths.length}: ${fileName}`);
          
          const res = await createDubTaskAction({
            teamId,
            userId,
            sourceUrl: pathStr,
            taskTitle: taskTitle.trim() ? `${taskTitle.trim()} - ${fileName}` : fileName,
            sourceThumbnailUrl: undefined,
            sourceLang,
            targetLang,
            asrEngine: asrEngine === 'faster-whisper' ? `faster-whisper:${sttPreset}:${noiseLevel}` : asrEngine,
            subtitleMode,
            llmModel: selectedAiAppSlug && selectedAiModel ? `${selectedAiAppSlug}|${selectedAiModel}` : undefined,
            ttsEnabled,
            ttsEngine: ttsEnabled ? ttsEngine : undefined,
            ttsVoice: ttsEnabled ? ttsVoice : undefined,
            ttsSpeed: ttsEnabled ? ttsSpeed : undefined,
            bgVolume: ttsEnabled ? bgVolume : undefined,
            ttsVolume: ttsEnabled ? ttsVolume : undefined,
            outputFolder: outputFolder.trim() || undefined,
            translateContext: translateContext.trim() || undefined,
            redesignThumbnailEnabled,
            thumbnailLogoSource,
            customThumbnailLogoUrl,
            thumbnailAiAppSlug,
            thumbnailAiModel,
            ...taskBranding,
          });

          if (res.error) {
            showToast(`Lỗi ở video "${fileName}": ${res.error}`, 'error');
          } else if (res.isDuplicate) {
            showToast(`Video "${fileName}" đang trong hàng đợi xử lý!`, 'warning');
          } else {
            successCount++;
          }
        }
        
        if (successCount > 0) {
          showToast(`Đã thêm ${successCount}/${paths.length} video vào hàng đợi!`, 'success');
          setLocalFilePaths('');
          setIsTaskModalOpen(false);
        }
        refreshData();
      } else if (!editingTaskId) {
        showToast('Vui lòng nhập đường dẫn video.', 'warning');
      }
    } catch (err) {
      console.error('Create task error:', err);
      showToast('Lỗi hệ thống khi tạo tác vụ.', 'error');
    } finally {
      setCreatingTask(false);
      setUploadProgressMsg('');
    }
  };

  const handleScanNow = async (config: any) => {
    try {
      showToast('Đang gửi lệnh quét tới Worker...', 'info');
      const res = await fetch('http://127.0.0.1:3001/scan', {
        method: 'POST',
        body: JSON.stringify(config),
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        showToast('Đã nhận lệnh quét ngay thành công!', 'success');
      } else {
        showToast('Worker báo lỗi hoặc không mở tính năng quét!', 'error');
      }
    } catch (e) {
      showToast('Không kết nối được tới Worker Local. Hãy đảm bảo Worker đang chạy.', 'error');
    }
  };

  const handleToggleActive = async (config: any) => {
    const updated = { ...config, isActive: !config.isActive };
    setScanProjects(prev => prev.map(p => p.id === config.id ? updated : p));
    const res = await saveDubScanConfigAction({
      teamId,
      userId: userId!,
      id: config.id,
      name: config.name,
      folderPath: config.folderPath,
      intervalMinutes: config.intervalMinutes,
      sourceLang: config.sourceLang,
      targetLang: config.targetLang,
      asrEngine: config.asrEngine,
      subtitleMode: config.subtitleMode,
      ttsEnabled: config.ttsEnabled,
      ttsEngine: config.ttsEngine,
      outputFolder: config.outputFolder,
      isActive: updated.isActive
    });
    if (!res.success) {
      showToast('Lỗi khi lưu trạng thái Dự án!', 'error');
      setScanProjects(prev => prev.map(p => p.id === config.id ? config : p));
    }
  };

  const handleSaveScanProject = async () => {
    if (!taskTitle.trim() || !scanFolderPath.trim()) {
      showToast('Vui lòng nhập Tên Dự án và Đường dẫn Thư mục', 'warning');
      return;
    }

    try {
      const res = await saveDubScanConfigAction({
        teamId,
        userId: userId!,
        id: editingProjectId && editingProjectId !== 'new' ? parseInt(editingProjectId) : undefined,
        name: taskTitle.trim(),
        folderPath: scanFolderPath.trim(),
        intervalMinutes: scanInterval,
        sourceLang,
        targetLang,
        asrEngine: asrEngine === 'faster-whisper' ? `faster-whisper:${sttPreset}:${noiseLevel}` : asrEngine,
        subtitleMode,
        ttsEnabled,
        ttsEngine,
        ttsVoice: ttsVoice || undefined,
        ttsSpeed: ttsSpeed || undefined,
        bgVolume: bgVolume || undefined,
        ttsVolume: ttsVolume || undefined,
        outputFolder: outputFolder.trim() || undefined,
        translateContext: translateContext.trim() || undefined,
        aiAppSlug: selectedAiAppSlug || undefined,
        aiModel: selectedAiModel || undefined,
        redesignThumbnailEnabled,
        thumbnailLogoSource,
        customThumbnailLogoUrl,
        thumbnailAiAppSlug,
        thumbnailAiModel,
      });

      if (res.success) {
        showToast(editingProjectId ? 'Đã cập nhật cấu hình dự án!' : 'Đã thêm Dự án Quét tự động mới!', 'success');
        setEditingProjectId(null);
        setScanFolderPath('');
        setTaskTitle('');
        setUploadMode('folder');
        setIsTaskModalOpen(false);
        refreshData();
      } else {
        showToast(res.error || 'Lỗi khi lưu dự án', 'error');
      }
    } catch (err: any) {
      showToast('Lỗi hệ thống: ' + err.message, 'error');
    }
  };

  const handleDeleteScanProject = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án quét tự động này?')) return;
    
    try {
      const res = await deleteDubScanConfigAction(parseInt(id), teamId);
      if (res.success) {
        showToast('Đã xóa dự án', 'success');
        if (selectedScanConfigId === parseInt(id)) {
          setSelectedScanConfigId(null);
        }
        refreshData();
      } else {
        showToast(res.error || 'Lỗi khi xóa dự án', 'error');
      }
    } catch (err: any) {
      showToast('Lỗi hệ thống: ' + err.message, 'error');
    }
  };

  const handleEditScanProject = (p: AutoScanProject) => {
    setEditingProjectId(p.id);
    setTaskTitle(p.name);
    setScanFolderPath(p.folderPath);
    setOutputFolder(p.outputFolder || '');
    setTranslateContext(p.translateContext || '');
    setScanInterval(p.intervalMinutes);
    setSourceLang(p.sourceLang);
    setTargetLang(p.targetLang);
    if (p.asrEngine) {
      if (p.asrEngine.includes(':')) {
        const parts = p.asrEngine.split(':');
        setAsrEngine(parts[0]);
        setSttPreset(parts[1] as any);
        setNoiseLevel((parts[2] || 'normal') as any);
      } else {
        setAsrEngine(p.asrEngine);
        setSttPreset('balanced');
        setNoiseLevel('normal');
      }
    }
    setSubtitleMode(p.subtitleMode);
    setTtsEnabled(p.ttsEnabled);
    if (p.ttsEngine) setTtsEngine(p.ttsEngine);
    if (p.ttsVoice) setTtsVoice(p.ttsVoice);
    if (p.ttsSpeed) setTtsSpeed(p.ttsSpeed);
    if (p.bgVolume) setBgVolume(p.bgVolume);
    if (p.ttsVolume) setTtsVolume(p.ttsVolume);
    if (p.aiAppSlug) setSelectedAiAppSlug(p.aiAppSlug);
    if (p.aiModel) setSelectedAiModel(p.aiModel);
    
    setRedesignThumbnailEnabled(p.redesignThumbnailEnabled ?? false);
    if (p.thumbnailLogoSource) setThumbnailLogoSource(p.thumbnailLogoSource);
    if (p.customThumbnailLogoUrl) setCustomThumbnailLogoUrl(p.customThumbnailLogoUrl);
    if (p.thumbnailAiAppSlug) setThumbnailAiAppSlug(p.thumbnailAiAppSlug);
    if (p.thumbnailAiModel) setThumbnailAiModel(p.thumbnailAiModel);

    setUploadMode('folder'); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetryTask = async (taskId: number) => {
    try {
      const res = await retryDubTaskAction(taskId, teamId);
      if (res.success) {
        showToast('Đã xếp hàng chạy lại tác vụ.', 'success');
        refreshData();
      } else {
        showToast(res.error || 'Lỗi chạy lại tác vụ.', 'error');
      }
    } catch (err) {
      showToast('Lỗi hệ thống.', 'error');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tác vụ này?')) return;
    try {
      const res = await deleteDubTaskAction(taskId, teamId);
      if (res.success) {
        showToast('Đã xóa tác vụ thành công.', 'success');
        refreshData();
      } else {
        showToast(res.error || 'Lỗi xóa tác vụ.', 'error');
      }
    } catch (err) {
      showToast('Lỗi hệ thống.', 'error');
    }
  };

  const handleDeleteWorker = async (workerId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa máy xử lý này?')) return;
    try {
      const res = await deleteDubWorkerAction(workerId, teamId);
      if (res.success) {
        showToast('Đã xóa máy xử lý thành công.', 'success');
        refreshData();
      } else {
        showToast(res.error || 'Lỗi xóa máy.', 'error');
      }
    } catch (err) {
      showToast('Lỗi hệ thống.', 'error');
    }
  };

  const isWorkerOnline = workers.some(w => {
    if (w.status !== 'online') return false;
    if (!w.lastSeenAt) return false;
    const diffMin = (Date.now() - new Date(w.lastSeenAt).getTime()) / 1000 / 60;
    return diffMin <= 2;
  });

  const activeWorker = workers.find(w => {
    if (w.status !== 'online') return false;
    if (!w.lastSeenAt) return false;
    const diffMin = (Date.now() - new Date(w.lastSeenAt).getTime()) / 1000 / 60;
    return diffMin <= 2;
  });

  return (
    <div className="p-4 md:p-6 w-full space-y-6 animate-fade-in">
      <PollingBanner intervalMinutes={10} onRefresh={() => refreshData(true)} />
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 tracking-tight">
              HeroDub Studio
            </h1>
            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
              Phase 1 MVP
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Hệ thống tự động hóa ASR, dịch thuật (Trung/Anh -&gt; Việt) và lồng tiếng/burn phụ đề hàng loạt theo lịch.
          </p>
        </div>

        {/* Worker Pairing Widget */}
        <div className="flex items-center gap-3">
          {pairingCode ? (
            <div className="bg-black/35 border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3 relative animate-fade-in">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 font-extrabold uppercase">Mã liên kết (Worker)</span>
                <span className="text-md font-black tracking-widest text-orange-400 select-all leading-tight">
                  {pairingCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Sao chép"
              >
                {pairingCopied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <div className="text-[9px] text-gray-500 font-bold border-l border-white/10 pl-3 flex flex-col justify-center">
                <span>Hết hạn</span>
                <span className="text-amber-500 font-extrabold">{formatTime(pairingTimeLeft)}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerateCode}
              disabled={pairingLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wider transition-all shadow-md cursor-pointer"
            >
              {pairingLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Key className="h-3.5 w-3.5" />
              )}
              Kết nối máy local
            </button>
          )}
          
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo tác vụ dịch mới
          </button>

          <button
            onClick={handleClearAllData}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Xóa toàn bộ dự án quét và tác vụ rác"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa sạch dữ liệu
          </button>

          <button
            onClick={handleToggleGuide}
            className={`px-3 py-2 border rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              showGuide 
                ? 'bg-white/10 border-white/20 text-white shadow-inner' 
                : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-gray-300 hover:text-white shadow-sm'
            }`}
          >
            {showGuide ? 'Đóng hướng dẫn' : 'Hướng dẫn cài đặt'}
          </button>
        </div>
      </div>

      {/* Guide Panel Sub-component */}
      <DubGuidePanel
        showGuide={showGuide}
        guideOs={guideOs}
        setGuideOs={setGuideOs}
        guideCopied={guideCopied}
        handleToggleGuide={handleToggleGuide}
        handleCopyGuideCommand={handleCopyGuideCommand}
      />

      {/* Worker Status Bar Sub-component */}
      <DubWorkerPanel
        workers={workers}
        isWorkerOnline={isWorkerOnline}
        activeWorker={activeWorker}
        handleDeleteWorker={handleDeleteWorker}
        section="status"
      />

      {/* DubTaskForm Modal Overlay */}
      <DubTaskForm
        isOpen={isTaskModalOpen || editingTaskId !== null}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTaskId(null);
        }}
        uploadMode={uploadMode}
        setUploadMode={setUploadMode}
        editingTaskId={editingTaskId}
        setEditingTaskId={setEditingTaskId}
        editingProjectId={editingProjectId}
        setEditingProjectId={setEditingProjectId}
        localFilePaths={localFilePaths}
        setLocalFilePaths={setLocalFilePaths}
        isUploadingFile={isUploadingFile}
        handleLocalFileUpload={handleLocalFileUpload}
        taskTitle={taskTitle}
        setTaskTitle={setTaskTitle}
        sourceLang={sourceLang}
        setSourceLang={setSourceLang}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        asrEngine={asrEngine}
        setAsrEngine={setAsrEngine}
        sttPreset={sttPreset}
        setSttPreset={setSttPreset}
        noiseLevel={noiseLevel}
        setNoiseLevel={setNoiseLevel}
        subtitleMode={subtitleMode}
        setSubtitleMode={setSubtitleMode}
        translateContext={translateContext}
        setTranslateContext={setTranslateContext}
        selectedAiAppSlug={selectedAiAppSlug}
        setSelectedAiAppSlug={setSelectedAiAppSlug}
        selectedAiModel={selectedAiModel}
        setSelectedAiModel={setSelectedAiModel}
        connectedAiApps={connectedAiApps}
        connectedAiTtsApps={connectedAiTtsApps}
        connectedAiImageApps={connectedAiImageApps}
        ttsEnabled={ttsEnabled}
        setTtsEnabled={setTtsEnabled}
        ttsEngine={ttsEngine}
        handleTtsEngineChange={handleTtsEngineChange}
        ttsVoice={ttsVoice}
        setTtsVoice={setTtsVoice}
        ttsSpeed={ttsSpeed}
        setTtsSpeed={setTtsSpeed}
        bgVolume={bgVolume}
        setBgVolume={setBgVolume}
        ttsVolume={ttsVolume}
        setTtsVolume={setTtsVolume}
        handlePreviewVoice={handlePreviewVoice}
        brandingEnabled={brandingEnabled}
        setBrandingEnabled={setBrandingEnabled}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projects={projects}
        outputFolder={outputFolder}
        setOutputFolder={setOutputFolder}
        creatingTask={creatingTask}
        uploadProgressMsg={uploadProgressMsg}
        handleCreateTask={async (e) => {
          await handleCreateTask(e);
          setIsTaskModalOpen(false);
        }}
        redesignThumbnailEnabled={redesignThumbnailEnabled}
        setRedesignThumbnailEnabled={setRedesignThumbnailEnabled}
        thumbnailLogoSource={thumbnailLogoSource}
        setThumbnailLogoSource={setThumbnailLogoSource}
        customThumbnailLogoUrl={customThumbnailLogoUrl}
        setCustomThumbnailLogoUrl={setCustomThumbnailLogoUrl}
        thumbnailAiAppSlug={thumbnailAiAppSlug}
        setThumbnailAiAppSlug={setThumbnailAiAppSlug}
        thumbnailAiModel={thumbnailAiModel}
        setThumbnailAiModel={setThumbnailAiModel}
        scanProjects={scanProjects}
        scanFolderPath={scanFolderPath}
        setScanFolderPath={setScanFolderPath}
        scanInterval={scanInterval}
        setScanInterval={setScanInterval}
        handleSaveScanProject={handleSaveScanProject}
        handleScanNow={handleScanNow}
        handleToggleActive={handleToggleActive}
        handleEditScanProject={handleEditScanProject}
        handleDeleteScanProject={handleDeleteScanProject}
        teamId={teamId}
      />

      {/* Split-pane Workspace Layout (Full Width) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start my-6 w-full">
        {/* Left Sidebar: Scan Projects Navigator */}
        <DubScanSidebar
          scanConfigs={scanProjects}
          selectedConfigId={selectedScanConfigId}
          onSelectConfig={(id) => {
            setSelectedScanConfigId(id ? parseInt(id.toString()) : null);
            setTaskPage(1);
          }}
          onCreateNew={() => {
            setUploadMode('folder');
            setEditingProjectId('new');
            setScanFolderPath('');
            setOutputFolder('');
            setIsTaskModalOpen(true);
          }}
          onEditConfig={(config) => {
            setUploadMode('folder');
            handleEditScanProject(config);
            setIsTaskModalOpen(true);
          }}
          onDeleteConfig={(id) => handleDeleteScanProject(id.toString())}
          onTriggerScan={(id) => {
            const p = scanProjects.find(item => item.id.toString() === id.toString());
            if (p) handleScanNow(p);
          }}
        />

        {/* Right Main Content Pane */}
        <div className="flex-1 min-w-0 w-full">
          {selectedScanConfigId === null ? (
            <DubTaskTable
              tasks={tasks}
              workers={workers}
              loading={loading}
              taskPage={taskPage}
              setTaskPage={setTaskPage}
              taskTotalCount={taskTotalCount}
              taskStats={taskStats}
              taskFilter={taskFilter}
              setTaskFilter={(filter) => {
                setTaskFilter(filter);
                setTaskPage(1);
                refreshData(true, 1, filter, tasksPerPage);
              }}
              tasksPerPage={tasksPerPage}
              setTasksPerPage={(perPage) => {
                setTasksPerPage(perPage);
                setTaskPage(1);
                refreshData(true, 1, taskFilter, perPage);
              }}
              refreshData={refreshData}
              handleRetryTask={handleRetryTask}
              handleDeleteTask={handleDeleteTask}
              handleEditTask={(task) => {
                handleEditTask(task);
                setIsTaskModalOpen(true);
              }}
              handlePauseTask={handlePauseTask}
              handleResumeTask={handleResumeTask}
              handlePauseAll={handlePauseAllTasks}
              handleResumeAll={handleResumeAllTasks}
              handleClearUnassigned={handleClearUnassignedTasks}
              handleOpenLocal={handleOpenLocal}
              setPreviewVideoUrl={setPreviewVideoUrl}
              setPreviewSrtUrl={setPreviewSrtUrl}
              teamId={teamId}
            />
          ) : (
            <DubScanProjectPane
              config={scanProjects.find(p => p.id.toString() === selectedScanConfigId.toString())}
              teamId={teamId}
              tasks={tasks}
              loading={loading}
              taskPage={taskPage}
              setTaskPage={setTaskPage}
              taskTotalCount={taskTotalCount}
              taskStats={taskStats}
              taskFilter={taskFilter}
              setTaskFilter={(filter) => {
                setTaskFilter(filter);
                setTaskPage(1);
                refreshData(true, 1, filter, tasksPerPage);
              }}
              tasksPerPage={tasksPerPage}
              setTasksPerPage={(perPage) => {
                setTasksPerPage(perPage);
                setTaskPage(1);
                refreshData(true, 1, taskFilter, perPage);
              }}
              refreshData={refreshData}
              handleRetryTask={handleRetryTask}
              handleDeleteTask={handleDeleteTask}
              handleEditTask={(task) => {
                handleEditTask(task);
                setIsTaskModalOpen(true);
              }}
              handlePauseTask={handlePauseTask}
              handleResumeTask={handleResumeTask}
              handlePauseAll={handlePauseAllTasks}
              handleResumeAll={handleResumeAllTasks}
              handleOpenLocal={handleOpenLocal}
              setPreviewVideoUrl={setPreviewVideoUrl}
              setPreviewSrtUrl={setPreviewSrtUrl}
              onEdit={(config) => {
                handleEditScanProject(config);
                setIsTaskModalOpen(true);
              }}
              onDelete={(id) => handleDeleteScanProject(id.toString())}
              onTriggerScan={(id) => {
                const p = scanProjects.find(item => item.id.toString() === id.toString());
                if (p) handleScanNow(p);
              }}
              onToggleActive={(config) => handleToggleActive(config)}
              onRefreshTasks={refreshData}
            />
          )}
        </div>
      </div>

      {/* Connected Workers management Sub-component */}
      <DubWorkerPanel
        workers={workers}
        tasks={tasks}
        isWorkerOnline={isWorkerOnline}
        activeWorker={activeWorker}
        handleDeleteWorker={handleDeleteWorker}
        handleResetWorker={handleResetWorker}
        section="management"
      />

      {/* Video Player Modal overlay */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="flex justify-between items-center px-4 py-3 bg-black/40 border-b border-white/5">
              <span className="text-xs font-black text-amber-400">Xem thử kết quả dịch thuật</span>
              <button
                onClick={() => {
                  setPreviewVideoUrl(null);
                  setPreviewSrtUrl(null);
                }}
                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-video w-full bg-[#0b0c10] relative flex items-center justify-center border-y border-white/5">
              <video
                src={previewVideoUrl.startsWith("http") ? previewVideoUrl : `http://127.0.0.1:3001/stream?path=${encodeURIComponent(previewVideoUrl)}`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex justify-end items-center gap-3 px-4 py-3 bg-black/40 border-t border-white/5">
              {previewSrtUrl && (
                <a
                  href={previewSrtUrl.startsWith("http") ? previewSrtUrl : `http://127.0.0.1:3001/srt?path=${encodeURIComponent(previewSrtUrl)}`}
                  download="result.srt"
                  target="_blank"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Tải SRT Phụ Đề
                </a>
              )}
              <button
                onClick={() => {
                  setPreviewVideoUrl(null);
                  setPreviewSrtUrl(null);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Section */}
      <footer className="mt-16 pt-8 pb-4 relative border-t border-white/5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent font-black">AI2Hero</span>
            <span className="text-gray-600">© {new Date().getFullYear()} Bản quyền thuộc về AI2Hero Platform.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/hero-dub/t/${teamId}/guide`} className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Hướng dẫn
            </Link>
            <Link href={`/dashboard/t/${teamId}`} className="hover:text-orange-400 transition-colors flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Workspace
            </Link>
            <a href="https://t.me/ai2hero" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> Hỗ trợ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
