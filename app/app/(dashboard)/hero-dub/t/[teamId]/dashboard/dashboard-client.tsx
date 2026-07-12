'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PollingBanner } from '@/components/polling-banner';
import {
  createDubTaskAction,
  getDubTasksAction,
  getDubWorkersAction,
  retryDubTaskAction,
  deleteDubTaskAction,
  deleteDubWorkerAction,
  getDubProjectsAction,
  updateAndRetryDubTaskAction,
} from '@/lib/db/hero-dub-actions';
import {
  getDubScanConfigsAction,
  saveDubScanConfigAction,
  deleteDubScanConfigAction,
} from '@/lib/db/hero-dub-scan-actions';
import { generateLinkCode } from '@/lib/db/extension-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import {
  Languages,
  Video,
  Play,
  Download,
  RefreshCw,
  Trash2,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Laptop,
  Key,
  Copy,
  Check,
  Loader2,
  X,
  Plus,
  Terminal,
  Folder,
  FolderOpen,
  Edit,
  Zap,
  Pause,
  PlayCircle,
  BookOpen,
  Shield,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { generateLivePreviewAudioAction } from '@/lib/db/tts-preview-actions';

interface DashboardClientProps {
  teamId: number;
  userId: number;
  teamName: string;
  connectedAiApps?: { slug: string; name: string; models: any[] }[];
  connectedAiTtsApps?: { slug: string; name: string; voices: string[] }[];
}

export default function DashboardClient({ teamId, userId, teamName, connectedAiApps, connectedAiTtsApps }: DashboardClientProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotalCount, setTaskTotalCount] = useState(0);
  const TASKS_PER_PAGE = 20;

  // Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [sourceLang, setSourceLang] = useState('zh');
  const [targetLang, setTargetLang] = useState('vi');
  const [asrEngine, setAsrEngine] = useState('faster-whisper');
  const [sttPreset, setSttPreset] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [noiseLevel, setNoiseLevel] = useState<'clean' | 'normal' | 'noisy'>('normal');
  const [subtitleMode, setSubtitleMode] = useState('burn_subtitle');

  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsEngine, setTtsEngine] = useState('edge-tts');
  const [ttsVoice, setTtsVoice] = useState('vi-VN-HoaiMyNeural');
  const [ttsSpeed, setTtsSpeed] = useState('1.3');
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

      // 1. Check Browser Cache
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

      // 2. Check Static File
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

      // 3. Gọi Live Generate
      showToast(`Đang kết nối Live Server để lấy âm thanh (${ttsEngine})...`, "warning");
      const res = await generateLivePreviewAudioAction(Number(teamId), ttsEngine, ttsVoice);
      if (!res.success) {
        showToast(res.error || 'Chưa hỗ trợ hoặc lỗi Server', "error");
        return;
      }

      const base64 = res.base64Audio;
      const dataUrl = `data:audio/mp3;base64,${base64}`;

      // Lưu Cache Vĩnh viễn
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
        selectedAiAppSlug, selectedAiModel
      };
      localStorage.setItem('heroDubSettings', JSON.stringify(settings));
    }
  }, [sourceLang, targetLang, asrEngine, sttPreset, noiseLevel, subtitleMode, ttsEnabled, ttsEngine, ttsVoice, ttsSpeed, bgVolume, ttsVolume, outputFolder, selectedAiAppSlug, selectedAiModel, hasLoadedSettings]);

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
    aiAppSlug: string;
    aiModel: string;
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

  const winCmd = 'curl -o herodub-setup.bat https://www.ai2hero.com/uploads/herodub-setup.bat & herodub-setup.bat';
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
  const refreshData = useCallback(async (showLoading = false, page = taskPage) => {
    if (showLoading) setLoading(true);
    try {
      const offset = (page - 1) * TASKS_PER_PAGE;
      const [tasksRes, workersRes, projectsRes, scanConfigsRes] = await Promise.all([
        getDubTasksAction(teamId, { limit: TASKS_PER_PAGE, offset }),
        getDubWorkersAction(teamId),
        getDubProjectsAction(teamId),
        getDubScanConfigsAction(teamId),
      ]);

      if (tasksRes.success && tasksRes.tasks) {
        setTasks(tasksRes.tasks);
        setTaskTotalCount(tasksRes.totalCount || 0);
      }
      if (workersRes.success && workersRes.workers) {
        setWorkers(workersRes.workers);
      }
      if (projectsRes.success && projectsRes.projects) {
        setProjects(projectsRes.projects);
      }
      if (scanConfigsRes.success && scanConfigsRes.configs) {
        // Map dubScanConfigs to AutoScanProject properties to match frontend
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
          aiAppSlug: c.aiAppSlug || '',
          aiModel: c.aiModel || '',
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
  }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load and polling
  useEffect(() => {
    refreshData(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData(false);
      }
    }, 600000); // Poll every 10 minutes

    return () => clearInterval(interval);
  }, [refreshData]);


  // Pairing Code Countdown Timer
  useEffect(() => {
    if (!pairingExpiresAt) return;

    const timer = setInterval(() => {
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

  const handleOpenLocal = async (path: string, isFolder: boolean = false) => {
    try {
      const res = await fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(path)}`, {
        method: 'GET'
      });
      if (!res.ok) {
        throw new Error('Worker Local Server is not running. Vui lng b-t HeroDub Worker ln ? dng tnh nng ny!');
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
      if (e.target) e.target.value = ''; // reset input
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.sourceTitle || '');
    setSourceLang(task.sourceLang);
    setTargetLang(task.targetLang);
    
    // Parse STT engine and preset
    if (task.asrEngine.includes(':')) {
      const parts = task.asrEngine.split(':');
      setAsrEngine(parts[0]);
      if (parts[1]) setSttPreset(parts[1]);
      if (parts[2]) setNoiseLevel(parts[2]);
    } else {
      setAsrEngine(task.asrEngine);
    }

    setTranslateEngine(task.translateEngine === 'connect-hub' ? 'google' : task.translateEngine);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    if (uploadMode === 'file') {
      if (!localFilePaths.trim()) {
        showToast('Vui lòng nhập đường dẫn video.', 'warning');
        return;
      }
    } else {
      // Logic for standard file upload if needed
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
        // --- CHẾ ĐỘ SỬA (EDIT MODE) ---
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
        });

        if (res.error) {
          showToast(`Lỗi: ${res.error}`, 'error');
        } else {
          showToast(`Đã cập nhật và yêu cầu chạy lại tác vụ #${editingTaskId}!`, 'success');
          setEditingTaskId(null);
          refreshData();
        }
      } else if (localFilePaths.trim() !== '') {
        // --- CHẾ ĐỘ TẠO MỚI (CREATE MODE) ---
        const paths = localFilePaths.split('\n').filter(p => p.trim() !== '');
        let successCount = 0;
        for (let i = 0; i < paths.length; i++) {
          let pathStr = paths[i].trim();
          
          // Remove surrounding quotes and whitespaces
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
    // Optimistic update
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
      // Revert if error
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
        aiAppSlug: selectedAiAppSlug || undefined,
        aiModel: selectedAiModel || undefined,
      });

      if (res.success) {
        showToast(editingProjectId ? 'Đã cập nhật cấu hình dự án!' : 'Đã thêm Dự án Quét tự động mới!', 'success');
        setEditingProjectId(null);
        setScanFolderPath('');
        setTaskTitle('');
        setUploadMode('folder'); // Switch back to project list view
        refreshData(); // Fetch the new list from server
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Check if there is an online worker (last seen within 2 minutes)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1"><Clock className="h-3 w-3" /> Đang chờ</span>;
      case 'assigned':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 animate-pulse"><Clock className="h-3 w-3" /> Đã nhận</span>;
      case 'downloading':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Đang tải video</span>;
      case 'transcribing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Nhận dạng ASR</span>;
      case 'translating':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Đang dịch phụ đề</span>;
      case 'burning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Burn phụ đề</span>;
      case 'uploading':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1 animate-bounce"><Loader2 className="h-3 w-3 animate-spin" /> Đang xuất video</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Hoàn thành</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Lỗi</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  const getPlatformLabel = (platform: string, sourceUrl: string = '') => {
    if (platform === 'youtube') return <span className="text-[10px] font-semibold bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-md text-red-400">YouTube</span>;
    if (platform === 'bilibili') return <span className="text-[10px] font-semibold bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 rounded-md text-pink-400">Bilibili</span>;
    if (platform === 'douyin') return <span className="text-[10px] font-semibold bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md text-purple-400">Douyin</span>;
    if (platform === 'local' || sourceUrl.includes('C:\\')) return <span className="text-[10px] font-semibold bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-md text-green-400 flex items-center gap-1"><FolderOpen className="h-3 w-3" /> Local</span>;
    return <span className="text-[10px] font-semibold bg-gray-500/20 border border-gray-500/30 px-2 py-0.5 rounded-md text-gray-400">Web URL</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
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

      {showGuide && (
        <div className="bg-gray-900/60 border border-amber-500/30 p-5 rounded-2xl shadow-sm mb-6 animate-fade-in relative backdrop-blur-sm">
          <button onClick={handleToggleGuide} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors">
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h2 className="text-lg font-black text-white">Quy Trình & Lợi Ích Của Local Worker</h2>
            <div className="bg-black/50 border border-white/5 p-1 rounded-lg flex gap-1">
              <button
                onClick={() => setGuideOs('windows')}
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  guideOs === 'windows' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" /> Windows
              </button>
              <button
                onClick={() => setGuideOs('macos')}
                className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  guideOs === 'macos' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" /> Mac / Linux
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-300 mb-6 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed">
            <span className="text-amber-500 font-bold">💡 Tại sao cần Local Worker?</span> Bằng cách chạy phần mềm trên máy tính cá nhân của bạn, Worker tận dụng tài nguyên (CPU/GPU) có sẵn để xử lý nhận dạng âm thanh (ASR) và Render Video tốc độ cao hoàn toàn miễn phí. Hơn nữa, nó giúp tự động hóa việc quét thư mục, xử lý hàng loạt hàng trăm video cùng lúc mà không cần treo trình duyệt.
          </div>
          
          <div className="flex items-start gap-4">
            <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
              1
            </span>
            <div className="space-y-2 w-full">
              <h3 className="text-sm font-extrabold text-white">Tải và khởi chạy tự động</h3>
              {guideOs === 'windows' ? (
                <p className="text-xs text-gray-400 leading-relaxed font-medium mb-3">
                  Nhấn phím <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/5">Win + R</kbd> gõ <code className="text-amber-400 font-mono bg-black/40 px-1 rounded">cmd</code> rồi dán lệnh dưới đây vào cửa sổ đen (nhấn Enter):
                </p>
              ) : (
                <p className="text-xs text-gray-400 leading-relaxed font-medium mb-3">
                  Mở ứng dụng <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/5 text-amber-400">Terminal</kbd> và dán dòng lệnh dưới đây (nhấn Enter):
                </p>
              )}
              
              <div className="bg-black border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4 font-mono text-amber-400 text-xs shadow-inner">
                <span className="select-all overflow-x-auto whitespace-nowrap">
                  {guideOs === 'windows' ? winCmd : macCmd}
                </span>
                <button
                  onClick={handleCopyGuideCommand}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Sao chép lệnh"
                >
                  {guideCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-4 mt-5 pt-5 border-t border-white/5">
            <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
              2
            </span>
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-white">Nhập Mã liên kết vào màn hình đen</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                Bấm nút <b className="text-amber-400">Kết nối máy local</b> ở trên, copy mã số 6 chữ số và dán vào màn hình đen CMD để kết nối.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Worker Status Bar */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 ${
        isWorkerOnline 
          ? 'bg-green-500/5 border-green-500/10' 
          : 'bg-amber-500/5 border-amber-500/10'
      }`}>
        {isWorkerOnline && activeWorker ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping shrink-0" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0 -ml-5.5 relative z-10" />
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-green-400" />
                <span className="text-xs font-extrabold text-white">
                  Máy xử lý: <span className="text-green-400">{activeWorker.deviceName}</span>
                </span>
                <span className="text-[10px] text-gray-500 font-bold capitalize">
                  ({activeWorker.platform || 'windows'}, v{activeWorker.version || '1.0.0'})
                </span>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 font-bold">
              Hoạt động gần nhất: <span className="text-green-400">Vừa xong</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="text-xs font-extrabold text-gray-300">
                Chưa kết nối máy xử lý local (Worker)
              </div>
            </div>
            <p className="text-[10px] text-amber-500/80 font-bold leading-normal max-w-xl">
              Cần chạy script local worker trên máy tính của bạn để nhận và xử lý tác vụ dịch thuật. Nhấp nút "Kết nối máy local" để lấy mã liên kết và bắt đầu.
            </p>
          </div>
        )}
      </div>

      {/* Main Grid: Form & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Creation Form */}
        <div className="lg:col-span-1 bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl h-fit space-y-4 relative overflow-hidden">
          {editingTaskId && (
            <div className="absolute top-0 left-0 w-full bg-blue-500/20 text-blue-300 text-[10px] py-1 px-4 flex justify-between items-center z-10 font-bold">
              <span>Đang sửa cấu hình Tác vụ #{editingTaskId}</span>
              <button type="button" onClick={() => setEditingTaskId(null)} className="hover:text-white underline">Hủy sửa</button>
            </div>
          )}
          <h2 className={`text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2 ${editingTaskId ? 'mt-4' : ''}`}>
            <Languages className="h-4 w-4 text-amber-400" />
            {editingTaskId ? 'Cập Nhật Tác Vụ Dịch' : 'Tạo tác vụ dịch phụ đề'}
          </h2>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase flex justify-between items-center">
                <span>Nguồn Video</span>
              </label>

              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => { setUploadMode('file'); setEditingProjectId(null); }}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg font-bold transition-all ${uploadMode === 'file' && !editingTaskId ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  File Từng Video
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('folder')}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg font-bold transition-all ${uploadMode === 'folder' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Dự án
                </button>
              </div>
              
              {uploadMode === 'folder' ? (
                <div className="space-y-4 pt-2">
                  {scanProjects.length > 0 && !editingProjectId && (
                    <div className="space-y-2">
                      {scanProjects.map(p => (
                        <div key={p.id} className={`bg-black/40 p-3 rounded-xl border ${p.isActive ? 'border-white/10' : 'border-red-500/20 opacity-75'} flex flex-col gap-2`}>
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white flex items-center gap-2">
                                {p.name}
                                {!p.isActive && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-md">Đã Tạm Dừng</span>}
                              </span>
                              <span 
                                className="text-[10px] text-gray-400 break-all mt-0.5 cursor-pointer hover:text-white transition-colors flex items-center gap-1 group"
                                onClick={() => { navigator.clipboard.writeText(p.folderPath); showToast('Đã copy thư mục gốc', 'success'); }}
                                title="Click để copy đường dẫn"
                              >
                                📁 Gốc: {p.folderPath}
                                <span className="opacity-0 group-hover:opacity-100 text-[9px] bg-white/10 px-1 rounded">Copy</span>
                              </span>
                              {p.outputFolder && (
                                <span 
                                  className="text-[10px] text-amber-500/80 break-all mt-0.5 cursor-pointer hover:text-amber-400 transition-colors flex items-center gap-1 group"
                                  onClick={() => { navigator.clipboard.writeText(p.outputFolder!); showToast('Đã copy thư mục lưu', 'success'); }}
                                  title="Click để copy thư mục lưu video"
                                >
                                  💾 Lưu: {p.outputFolder}
                                  <span className="opacity-0 group-hover:opacity-100 text-[9px] bg-amber-500/20 px-1 rounded">Copy</span>
                                </span>
                              )}
                              <span className="text-[9px] text-amber-500 mt-1 flex flex-col gap-0.5">
                                <span>{p.intervalMinutes === 0 ? 'Chạy 1 lần' : `Quét mỗi ${p.intervalMinutes} phút`}</span>
                                <span>Đã quét: <b className="text-white">{p.scannedCount || 0}</b> video {p.lastScanAt && `| Lần cuối: ${new Date(p.lastScanAt).toLocaleTimeString()}`}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[120px]">
                              <button type="button" onClick={() => handleScanNow(p)} className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 hover:bg-amber-500/20" title="Quét ngay lập tức"><Zap className="h-3 w-3" /></button>
                              <button type="button" onClick={() => handleToggleActive(p)} className={`p-1.5 rounded-lg ${p.isActive ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`} title={p.isActive ? "Tạm dừng quét" : "Tiếp tục quét"}>
                                {p.isActive ? <Pause className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
                              </button>
                              <button type="button" onClick={() => handleEditScanProject(p)} className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-amber-400" title="Sửa dự án"><Edit className="h-3 w-3" /></button>
                              <button type="button" onClick={() => handleDeleteScanProject(p.id)} className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-red-400" title="Xóa dự án"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => { setEditingProjectId('new'); setTaskTitle(''); setScanFolderPath(''); setOutputFolder(''); }} className="w-full py-2 bg-white/5 border border-dashed border-white/10 rounded-xl text-xs text-gray-400 hover:text-white transition-all">+ Tạo Dự Án Mới</button>
                    </div>
                  )}

                  {(!scanProjects.length || editingProjectId) && (
                    <div className="space-y-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-amber-500">{editingProjectId === 'new' || !scanProjects.length ? 'Tạo Dự án Mới' : 'Sửa Dự án'}</h3>
                        {scanProjects.length > 0 && <button type="button" onClick={() => setEditingProjectId(null)} className="text-[10px] text-gray-400 hover:text-white">Hủy</button>}
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase">Đường dẫn Thư mục (VD: D:\Videos)</label>
                         <input type="text" value={scanFolderPath} onChange={e => setScanFolderPath(e.target.value.replace(/["']/g, ''))} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/55" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase">Chu kỳ quét tự động</label>
                         <select value={scanInterval} onChange={e => setScanInterval(Number(e.target.value))} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55 cursor-pointer">
                            <option value={0}>Chạy 1 lần (Không lặp lại)</option>
                            <option value={60}>Quét mỗi 60 phút</option>
                            <option value={120}>Quét mỗi 120 phút</option>
                            <option value={600}>Quét mỗi 10 giờ</option>
                         </select>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
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
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Tên Tác Vụ / Tên Dự Án</label>
              <input
                type="text"
                placeholder="VD: Video giải trí số 1"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                disabled={creatingTask || isUploadingFile}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/55 transition-all shadow-inner"
              />
            </div>

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
                  
                  {/* Noise level selector */}
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

            {uploadMode === 'folder' && (!scanProjects.length || editingProjectId) ? (
              <button
                type="button"
                onClick={handleSaveScanProject}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-95 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-green-500/10 transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Lưu cấu hình Dự Án Quét
              </button>
            ) : uploadMode === 'file' ? (
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
            ) : null}
          </form>
        </div>

        {/* Right Side: Task Queue List */}
        <div className="lg:col-span-2 bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
          <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Video className="h-4 w-4 text-orange-400" />
            Hàng đợi tác vụ dịch thuật ({taskTotalCount})
          </h2>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <span className="text-xs font-bold">Đang tải danh sách tác vụ...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 text-center px-4">
              <Video className="h-8 w-8 text-gray-600" />
              <span className="text-xs font-bold text-gray-400">Không có tác vụ dịch thuật nào trong hàng đợi</span>
              <p className="text-[10px] text-gray-500 leading-normal max-w-sm">
                Hãy dán link video Douyin, Bilibili hoặc YouTube ở cột bên trái để bắt đầu tạo tác vụ dịch tự động.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-wider pb-2">
                    <th className="py-2.5">Nguồn & Tiêu đề</th>
                    <th className="py-2.5">Bộ máy dịch</th>
                    <th className="py-2.5">Trạng thái & Tiến độ</th>
                    <th className="py-2.5">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tasks.map((task) => (
                    <tr key={task.id} className="text-xs group hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 pr-3 max-w-[240px]">
                        <div className="flex gap-3 items-center">
                          {task.sourceThumbnailUrl ? (
                            <img src={task.sourceThumbnailUrl} alt="" className="w-16 h-10 object-cover rounded-md border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-16 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Video className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-extrabold text-white truncate group-hover:text-amber-400 transition-colors" title={task.sourceTitle || task.taskTitle || task.sourceUrl}>
                              {task.sourceTitle || task.taskTitle || 'Chưa đặt tên tác vụ'}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(String(task.id)); showToast('Đã copy ID tác vụ', 'success'); }}
                                className="text-[9px] bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors"
                                title="Copy Task ID"
                              >
                                #{task.id}
                              </button>
                              {getPlatformLabel(task.sourceUrl.includes(':\\') || task.sourceUrl.startsWith('/') ? 'local' : task.sourcePlatform)}
                              {task.durationSec ? (
                                <span className="text-[9px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded font-bold">
                                  {Math.floor(task.durationSec / 60)}:{(task.durationSec % 60).toString().padStart(2, '0')}
                                </span>
                              ) : null}
                              {task.sourcePlatform === 'local' || task.sourceUrl.includes(':\\') || task.sourceUrl.startsWith('/') ? (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    const cleanUrl = task.sourceUrl.replace(/^["']+|["']+$/g, '');
                                    try {
                                      await fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(cleanUrl)}`);
                                      navigator.clipboard.writeText(cleanUrl);
                                      showToast('Đang mở file & Đã copy đường dẫn', 'success');
                                    } catch (err) {
                                      navigator.clipboard.writeText(cleanUrl);
                                      showToast('Đã copy đường dẫn (bật Worker để mở tự động)', 'success');
                                    }
                                  }}
                                  className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-1.5 py-0.5 rounded-md truncate max-w-[200px]"
                                  title={`Click để mở file: ${task.sourceUrl}`}
                                >
                                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{task.sourceUrl}</span>
                                </button>
                              ) : (
                                <a
                                  href={task.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-gray-500 hover:text-gray-300 font-bold flex items-center gap-0.5"
                                >
                                  Link gốc <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-[10px] font-bold text-gray-400">
                        <div className="flex flex-col">
                          <span>ASR: {task.asrEngine?.includes(':') ? task.asrEngine.split(':').map((s: string, i: number) => i === 0 ? s : `(${s})`).join(' ') : task.asrEngine}</span>
                          <span className="text-gray-500">Dịch: {task.translateEngine}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1.5">
                          {getStatusBadge(task.status)}
                          {task.status === 'completed' && task.updatedAt && task.createdAt && (
                            <span className="text-[9px] text-gray-500 font-bold">
                              Đã dịch xong trong: {Math.max(1, Math.floor((new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) / 60000))} phút
                            </span>
                          )}
                          {task.status !== 'completed' && task.status !== 'failed' && (
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${task.progress || 0}%` }}
                              />
                            </div>
                          )}
                          {task.status === 'failed' && task.error && (
                            <span className="text-[9px] text-red-400 font-medium max-w-[180px] line-clamp-1" title={task.error}>
                              Lỗi: {task.error}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">


                          {task.status === 'failed' && (
                            <button
                              onClick={() => handleRetryTask(task.id)}
                              className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 hover:text-orange-300 rounded-lg cursor-pointer transition-all"
                              title="Dịch lại"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {task.outputFolder || task.sourcePlatform === 'local' || task.sourceUrl.includes(':\\') || task.sourceUrl.startsWith('/') ? (
                            <button
                              onClick={async (e) => {
                                e.preventDefault(); e.stopPropagation();
                                const cleanUrl = task.sourceUrl.replace(/^["']+|["']+$/g, '');
                                let folderPath = task.outputFolder || cleanUrl.substring(0, Math.max(cleanUrl.lastIndexOf('\\'), cleanUrl.lastIndexOf('/')));
                                
                                // Nếu đã dịch xong, lấy đúng cái thư mục chứa file kết quả
                                if (task.resultVideoUrl) {
                                  const cleanResultUrl = task.resultVideoUrl.replace(/^["']+|["']+$/g, '');
                                  folderPath = cleanResultUrl.substring(0, Math.max(cleanResultUrl.lastIndexOf('\\'), cleanResultUrl.lastIndexOf('/')));
                                }
                                
                                try {
                                  await fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(folderPath)}`);
                                  navigator.clipboard.writeText(folderPath);
                                  showToast('Đang mở thư mục & Đã copy đường dẫn', 'success');
                                } catch (err) {
                                  navigator.clipboard.writeText(folderPath);
                                  showToast('Đã copy đường dẫn thư mục', 'success');
                                }
                              }}
                              className="p-1.5 flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500/80 hover:text-amber-400 rounded-lg cursor-pointer transition-all"
                              title="Mở thư mục chứa file"
                            >
                              <Folder className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/25 text-amber-500/80 hover:text-amber-400 rounded-lg cursor-pointer transition-all"
                            title="Sửa cấu hình (Đổi giọng, Âm lượng...)"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRetryTask(task.id)}
                            className="p-1.5 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/25 text-blue-500/80 hover:text-blue-400 rounded-lg cursor-pointer transition-all"
                            title="Chạy lại tác vụ (Không sửa cấu hình)"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/25 text-red-500/80 hover:text-red-400 rounded-lg cursor-pointer transition-all"
                            title="Xóa tác vụ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {taskTotalCount > TASKS_PER_PAGE && (
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <span className="text-[10px] text-gray-500 font-bold">
                Trang {taskPage} / {Math.ceil(taskTotalCount / TASKS_PER_PAGE)} &nbsp;·&nbsp; {taskTotalCount} tác vụ
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, taskPage - 1);
                    setTaskPage(newPage);
                    refreshData(true, newPage);
                  }}
                  disabled={taskPage === 1}
                  className="px-3 py-1 rounded-lg text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Trước
                </button>
                {Array.from({ length: Math.min(5, Math.ceil(taskTotalCount / TASKS_PER_PAGE)) }, (_, i) => {
                  const totalPages = Math.ceil(taskTotalCount / TASKS_PER_PAGE);
                  let startPage = Math.max(1, taskPage - 2);
                  const endPage = Math.min(totalPages, startPage + 4);
                  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
                  const page = startPage + i;
                  if (page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => {
                        setTaskPage(page);
                        refreshData(true, page);
                      }}
                      className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                        page === taskPage
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    const newPage = Math.min(Math.ceil(taskTotalCount / TASKS_PER_PAGE), taskPage + 1);
                    setTaskPage(newPage);
                    refreshData(true, newPage);
                  }}
                  disabled={taskPage === Math.ceil(taskTotalCount / TASKS_PER_PAGE)}
                  className="px-3 py-1 rounded-lg text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connected Workers management */}
      <div className="bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Laptop className="h-4 w-4 text-emerald-400" />
          Quản lý máy xử lý kết nối ({workers.length})
        </h2>

        {workers.length === 0 ? (
          <p className="text-[10px] text-gray-500 font-bold py-2">Chưa có máy xử lý nào được ghép nối với workspace này.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((w) => {
              const diffMin = w.lastSeenAt ? (Date.now() - new Date(w.lastSeenAt).getTime()) / 1000 / 60 : 999;
              const isOnline = w.status === 'online' && diffMin <= 2;

              return (
                <div key={w.id} className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-md shadow-green-500/30' : 'bg-red-500'} shrink-0`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-white truncate">{w.deviceName}</span>
                      <span className="text-[9px] text-gray-500 capitalize">{w.platform} | Version {w.version}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                    <button
                      onClick={() => handleDeleteWorker(w.id)}
                      className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-500 cursor-pointer transition-all"
                      title="Gỡ kết nối"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video Player Modal overlay */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
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

            {/* Video Content */}
            <div className="aspect-video w-full bg-[#0b0c10] relative flex items-center justify-center border-y border-white/5">
              <video
                src={previewVideoUrl.startsWith("http") ? previewVideoUrl : `http://127.0.0.1:3001/stream?path=${encodeURIComponent(previewVideoUrl)}`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Actions Footer */}
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
