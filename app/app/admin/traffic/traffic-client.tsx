'use client';

import { useState, useEffect } from 'react';
import {
  Gauge,
  Zap,
  ShieldAlert,
  Activity,
  RefreshCw,
  Clock,
  Layers,
  PauseCircle,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MVP_POLLING_MAP,
  getGlobalPollingMode,
  setGlobalPollingMode,
  getPollingTelemetry,
  clearPollingTelemetry,
  PollingMode,
  PollingTelemetryStats,
} from '@/lib/shared-polling-config';

interface TrafficClientProps {
  user: {
    name?: string | null;
    email: string;
  };
}

export function TrafficClientComponent({ user }: TrafficClientProps) {
  const [currentMode, setCurrentMode] = useState<PollingMode>('normal');
  const [telemetry, setTelemetry] = useState<Record<string, PollingTelemetryStats>>({});
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const refreshStats = () => {
    setCurrentMode(getGlobalPollingMode());
    setTelemetry(getPollingTelemetry());
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleModeSelect = (mode: PollingMode) => {
    setGlobalPollingMode(mode);
    setCurrentMode(mode);
  };

  const handleClearTelemetry = () => {
    clearPollingTelemetry();
    setTelemetry({});
  };

  // Tính toán tổng số poll đã tiết kiệm được trên toàn hệ thống
  const totalSavedPolls = Object.values(telemetry).reduce(
    (acc, curr) => acc + (curr.savedPollsTabHidden || 0),
    0
  );
  const totalPolls = Object.values(telemetry).reduce(
    (acc, curr) => acc + (curr.totalPolls || 0),
    0
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-gray-100">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-orange-500/30 text-orange-400">
              <Gauge className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Super Admin: Traffic & Polling Control Manager
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Điều phối tốc độ gọi API toàn platform & Giám sát hạn mức Vercel Quotas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={refreshStats}
            variant="outline"
            size="sm"
            className="border-white/10 bg-gray-900/50 hover:bg-gray-800 text-gray-300 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Cập nhật ({lastRefreshed.toLocaleTimeString()})
          </Button>
          <Button
            onClick={handleClearTelemetry}
            variant="outline"
            size="sm"
            className="border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Log Đếm
          </Button>
        </div>
      </div>

      {/* Vercel Quota Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Invocations */}
        <div className="bg-gradient-to-br from-red-950/40 to-gray-900/60 border border-red-500/30 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-red-500">
            <Activity className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Function Invocations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              100% CỰC ĐẠI
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">1,000,000 / 1M</div>
            <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-red-500 h-full w-full animate-pulse" />
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              ⚠️ Đã chạm trần 1 triệu calls do Polling cũ dồn dập.
            </p>
          </div>
        </div>

        {/* Card 2: CPU Duration */}
        <div className="bg-gradient-to-br from-amber-950/40 to-gray-900/60 border border-amber-500/30 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-500">
            <Clock className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Fluid Active CPU</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              115% VƯỢT HẠN MỨC
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">4h 36m / 4h</div>
            <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full w-[100%]" />
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              ⚠️ Đã vượt quá 4 giờ CPU free cấp cho mỗi tháng.
            </p>
          </div>
        </div>

        {/* Card 3: Saved Polls */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-gray-900/60 border border-emerald-500/30 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-emerald-500">
            <PauseCircle className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Request Tiết Kiệm</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Auto-Pause Tab
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400">+{totalSavedPolls.toLocaleString()}</div>
            <p className="text-xs text-gray-300 mt-1">Lượt API đã chặn khi tab bị ẩn</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Dừng 100% khi người dùng không nhìn màn hình.
            </p>
          </div>
        </div>

        {/* Card 4: Bandwidth */}
        <div className="bg-gradient-to-br from-blue-950/40 to-gray-900/60 border border-blue-500/30 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-blue-500">
            <TrendingDown className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Băng thông (Data)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              AN TOÀN
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">1.8 GB / 100GB</div>
            <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full w-[2%]" />
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Băng thông Vercel hiện rất an toàn.
            </p>
          </div>
        </div>
      </div>

      {/* GLOBAL MODE SWITCHER */}
      <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-orange-400" />
              Chế Độ Tiết Kiệm Traffic Toàn Platform (1-Click Emergency Control)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Chuyển đổi tốc độ Polling của toàn bộ 10 MVP chỉ bằng 1 cú nhấp chuột. Thay đổi áp dụng tức thì trên client.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
            Mode Hiện Tại: {currentMode.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Mode 1: Normal */}
          <div
            onClick={() => handleModeSelect('normal')}
            className={`cursor-pointer rounded-xl p-5 border transition-all duration-200 ${
              currentMode === 'normal'
                ? 'bg-blue-500/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                : 'bg-gray-950/40 border-white/5 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-400">
                <Zap className="w-4 h-4" /> Normal Mode
              </div>
              {currentMode === 'normal' && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
            </div>
            <p className="text-xs text-gray-300 mt-2 font-semibold">Polling Standard (10s - 15s)</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Dùng cho trải nghiệm thời gian thực mượt mà khi hệ thống rảnh quota.
            </p>
          </div>

          {/* Mode 2: Eco */}
          <div
            onClick={() => handleModeSelect('eco')}
            className={`cursor-pointer rounded-xl p-5 border transition-all duration-200 ${
              currentMode === 'eco'
                ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                : 'bg-gray-950/40 border-white/5 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                <Activity className="w-4 h-4" /> Eco Mode (Khuyên Dùng)
              </div>
              {currentMode === 'eco' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>
            <p className="text-xs text-gray-300 mt-2 font-semibold">Giảm 50% Tải (25s - 30s)</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Tối ưu cân bằng giữa trải nghiệm UX và lượng Invocations cắn Vercel.
            </p>
          </div>

          {/* Mode 3: Emergency */}
          <div
            onClick={() => handleModeSelect('emergency')}
            className={`cursor-pointer rounded-xl p-5 border transition-all duration-200 ${
              currentMode === 'emergency'
                ? 'bg-red-500/15 border-red-500 text-white shadow-lg shadow-red-500/10 animate-pulse'
                : 'bg-gray-950/40 border-white/5 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-red-400">
                <ShieldAlert className="w-4 h-4" /> Emergency Saver Mode
              </div>
              {currentMode === 'emergency' && <CheckCircle2 className="w-5 h-5 text-red-400" />}
            </div>
            <p className="text-xs text-gray-300 mt-2 font-semibold">Cắt Giảm 85% Traffic (60s - 120s)</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Chế độ sinh tồn khẩn cấp khi Vercel sắp ngắt dịch vụ hoặc bị tràn quota.
            </p>
          </div>
        </div>
      </div>

      {/* MVP TELEMETRY BREAKDOWN TABLE */}
      <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Chi Tiết Cấu Hình & Realtime Telemetry Theo MVP
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Theo dõi nhịp Polling và số lượng Request tiết kiệm được trên từng module
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/80 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10">
              <tr>
                <th className="p-3">MVP App</th>
                <th className="p-3">Khoảng Nhịp Hiện Tại</th>
                <th className="p-3">Auto-Pause Tab Ẩn</th>
                <th className="p-3">Tổng Lượt Poll Realtime</th>
                <th className="p-3">Số Request Đã Chặn (Tiết Kiệm)</th>
                <th className="p-3">Trạng Thái Phân Luồng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(MVP_POLLING_MAP).map(([appId, cfg]) => {
                const stats = telemetry[appId] || { totalPolls: 0, savedPollsTabHidden: 0 };
                let effectiveMs = cfg.normalIntervalMs;
                if (currentMode === 'eco') effectiveMs = cfg.ecoIntervalMs;
                if (currentMode === 'emergency') effectiveMs = cfg.emergencyIntervalMs;

                return (
                  <tr key={appId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {cfg.appName}
                    </td>
                    <td className="p-3 font-mono text-orange-400 font-bold">
                      {effectiveMs / 1000}s / poll
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        100% Pause
                      </span>
                    </td>
                    <td className="p-3 font-mono text-gray-200">
                      {stats.totalPolls.toLocaleString()} calls
                    </td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">
                      +{stats.savedPollsTabHidden.toLocaleString()} calls
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Unified Controlled
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
