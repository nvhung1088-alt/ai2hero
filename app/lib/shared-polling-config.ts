// === SHARED POLLING & TRAFFIC CONFIGURATION MANAGER ===
// Nguồn sự thật duy nhất cho cấu hình Polling của toàn bộ AI2Hero Platform

export type PollingMode = 'normal' | 'eco' | 'emergency';

export interface MVPPollingConfig {
  appId: string;
  appName: string;
  normalIntervalMs: number;     // Khi tab active (Normal Mode)
  ecoIntervalMs: number;        // Khi ở chế độ Tiết kiệm Eco Mode
  emergencyIntervalMs: number;  // Khi ở chế độ Khẩn cấp Emergency Mode
  pauseWhenHidden: boolean;     // Luôn dừng 100% khi tab bị ẩn/background
  maxBackoffMultiplier: number; // Hệ số giãn tối đa khi rảnh (1x -> 4x)
}

// Cấu hình Polling tiêu chuẩn cho từng MVP
export const MVP_POLLING_MAP: Record<string, MVPPollingConfig> = {
  'hero-dub': {
    appId: 'hero-dub',
    appName: 'HeroDub (Lồng tiếng AI)',
    normalIntervalMs: 15000,     // 15s (thay vì 2s)
    ecoIntervalMs: 30000,        // 30s
    emergencyIntervalMs: 60000,  // 60s
    pauseWhenHidden: true,
    maxBackoffMultiplier: 4,     // Tối đa giãn lên 60s khi idle
  },
  'hero-downloader': {
    appId: 'hero-downloader',
    appName: 'Hero Downloader (Cào & Tải video)',
    normalIntervalMs: 15000,
    ecoIntervalMs: 30000,
    emergencyIntervalMs: 60000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 4,
  },
  'hero-care': {
    appId: 'hero-care',
    appName: 'Hero Care (CSKH AI)',
    normalIntervalMs: 20000,
    ecoIntervalMs: 40000,
    emergencyIntervalMs: 90000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 3,
  },
  'connect-hub': {
    appId: 'connect-hub',
    appName: 'Connect Hub (Pairing Code)',
    normalIntervalMs: 10000,
    ecoIntervalMs: 20000,
    emergencyIntervalMs: 45000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 3,
  },
  'hero-video-maker': {
    appId: 'hero-video-maker',
    appName: 'HeroVideoMaker (AI Render)',
    normalIntervalMs: 12000,
    ecoIntervalMs: 25000,
    emergencyIntervalMs: 60000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 4,
  },
  'hero-report': {
    appId: 'hero-report',
    appName: 'Hero Report (Báo cáo POS)',
    normalIntervalMs: 30000,
    ecoIntervalMs: 60000,
    emergencyIntervalMs: 120000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 2,
  },
  'isocial': {
    appId: 'isocial',
    appName: 'iSocial (Mạng xã hội)',
    normalIntervalMs: 25000,
    ecoIntervalMs: 45000,
    emergencyIntervalMs: 90000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 3,
  },
  'hero-drive': {
    appId: 'hero-drive',
    appName: 'HeroDrive (Quét & Tải folder)',
    normalIntervalMs: 20000,
    ecoIntervalMs: 40000,
    emergencyIntervalMs: 60000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 4,
  },
};

// Cờ quản lý Mode toàn cục (lưu vào localStorage & RAM)
const MODE_STORAGE_KEY = 'ai2hero_global_polling_mode';

export function getGlobalPollingMode(): PollingMode {
  if (typeof window === 'undefined') return 'normal';
  return (localStorage.getItem(MODE_STORAGE_KEY) as PollingMode) || 'normal';
}

export function setGlobalPollingMode(mode: PollingMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    window.dispatchEvent(new Event('polling-mode-changed'));
  }
}

// Lấy thời gian Polling thực tế cho 1 MVP dựa trên Mode hiện tại
export function getEffectiveIntervalMs(appId: string, backoffMultiplier = 1): number {
  const config = MVP_POLLING_MAP[appId] || {
    appId,
    appName: appId,
    normalIntervalMs: 15000,
    ecoIntervalMs: 30000,
    emergencyIntervalMs: 60000,
    pauseWhenHidden: true,
    maxBackoffMultiplier: 3,
  };

  const mode = getGlobalPollingMode();
  let baseMs = config.normalIntervalMs;
  if (mode === 'eco') baseMs = config.ecoIntervalMs;
  if (mode === 'emergency') baseMs = config.emergencyIntervalMs;

  const cappedMultiplier = Math.min(backoffMultiplier, config.maxBackoffMultiplier);
  return baseMs * cappedMultiplier;
}

// === TELEMETRY TRACKER (Ghi nhận số lượt poll theo real-time cho Super Admin) ===
const TELEMETRY_STORAGE_KEY = 'ai2hero_polling_telemetry';

export interface PollingTelemetryStats {
  appId: string;
  totalPolls: number;
  savedPollsTabHidden: number;
  lastPollTimestamp: number;
}

export function logPollingEvent(appId: string, isSavedBecauseHidden = false): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    const map: Record<string, PollingTelemetryStats> = raw ? JSON.parse(raw) : {};
    
    if (!map[appId]) {
      map[appId] = { appId, totalPolls: 0, savedPollsTabHidden: 0, lastPollTimestamp: Date.now() };
    }

    if (isSavedBecauseHidden) {
      map[appId].savedPollsTabHidden += 1;
    } else {
      map[appId].totalPolls += 1;
      map[appId].lastPollTimestamp = Date.now();
    }

    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    // Ignore storage parse errors
  }
}

export function getPollingTelemetry(): Record<string, PollingTelemetryStats> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function clearPollingTelemetry(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TELEMETRY_STORAGE_KEY);
  }
}

export function shouldPauseBackgroundPoll(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  return document.visibilityState !== 'visible';
}

