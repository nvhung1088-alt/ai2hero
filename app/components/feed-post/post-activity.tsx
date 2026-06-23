'use client';

import { useState } from 'react';
import { 
  Zap, UserPlus, Sparkles, ClipboardList, Settings, Activity, 
  CheckCircle2, Circle, ArrowRight, Search
} from 'lucide-react';
import { getAppById } from '@/lib/apps-registry';
import { APP_ICON_MAP } from '@/lib/shared-constants';

function parseMessageMentions(text: string) {
  if (!text) return '';
  const parts = text.split(/(@[a-zA-Z0-9À-ỹ\s]+?(?=\s|$|[.,!?;]))/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-orange-400 font-bold hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    return part;
  });
}

const SYSTEM_ACTIVITY_STYLING: Record<string, { icon: React.ComponentType<any>; colorClass: string }> = {
  app_activated: { icon: Zap, colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  member_invited: { icon: UserPlus, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  member_joined: { icon: UserPlus, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  plan_upgraded: { icon: Sparkles, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  data_exported: { icon: ClipboardList, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  settings_updated: { icon: Settings, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  default: { icon: Activity, colorClass: 'text-gray-400 bg-white/5 border-white/10' }
};

interface PostActivityProps {
  type: string;
  message: string;
  appId?: string;
  resultPreview?: string;
  resultMetrics?: { label: string; value: string }[];
  taskTitle?: string;
  taskStatus?: 'pending' | 'in_progress' | 'completed';
  taskAssignee?: string;
  taskDueDate?: string;
  onTaskStatusChange?: (newStatus: 'pending' | 'in_progress' | 'completed') => void;
}

export default function PostActivity({
  type, message, appId, resultPreview, resultMetrics,
  taskTitle, taskStatus, taskAssignee, taskDueDate, onTaskStatusChange
}: PostActivityProps) {
  const [internalTaskStatus, setInternalTaskStatus] = useState(taskStatus);
  const [isMvpModalOpen, setIsMvpModalOpen] = useState(false);

  const resolvedTaskStatus = internalTaskStatus || 'pending';
  const resolvedTaskCompleted = resolvedTaskStatus === 'completed';

  const handleTaskToggle = () => {
    const nextStatus = resolvedTaskCompleted ? 'pending' : 'completed';
    setInternalTaskStatus(nextStatus);
    if (onTaskStatusChange) onTaskStatusChange(nextStatus);
  };

  const handleChangeStatus = (status: 'pending' | 'in_progress' | 'completed') => {
    setInternalTaskStatus(status);
    if (onTaskStatusChange) onTaskStatusChange(status);
  };

  if (type === 'system_activity') {
    let systemStyling = SYSTEM_ACTIVITY_STYLING.default;
    if (message.includes('Kích hoạt')) systemStyling = SYSTEM_ACTIVITY_STYLING.app_activated;
    else if (message.includes('Mời')) systemStyling = SYSTEM_ACTIVITY_STYLING.member_invited;
    else if (message.includes('gia nhập')) systemStyling = SYSTEM_ACTIVITY_STYLING.member_joined;
    else if (message.includes('Nâng cấp')) systemStyling = SYSTEM_ACTIVITY_STYLING.plan_upgraded;
    else if (message.includes('Xuất bản')) systemStyling = SYSTEM_ACTIVITY_STYLING.data_exported;
    else if (message.includes('Cập nhật')) systemStyling = SYSTEM_ACTIVITY_STYLING.settings_updated;

    const SystemIcon = systemStyling.icon;

    return (
      <div className="bg-gray-950/40 border border-white/5 rounded-xl p-4 flex items-start gap-3 text-sm text-gray-300">
        <div className={`h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center ${systemStyling.colorClass}`}>
          <SystemIcon className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="leading-relaxed text-gray-300">
            {parseMessageMentions(message)}
          </p>
          <p className="text-[10px] text-gray-500 font-medium">Hoạt động tự động từ hệ thống</p>
        </div>
      </div>
    );
  }

  if (type === 'mvp_result') {
    const app = appId ? getAppById(appId) : undefined;
    const AppIconComponent = app && APP_ICON_MAP[app.icon] ? APP_ICON_MAP[app.icon] : Sparkles;

    return (
      <div className="space-y-3">
        <p className="text-sm lg:text-base text-gray-200 leading-relaxed font-medium">
          {parseMessageMentions(message)}
        </p>

        <div className="bg-gradient-to-br from-gray-950/80 via-gray-950/40 to-transparent border border-white/5 hover:border-orange-500/20 rounded-xl p-4 space-y-3 relative overflow-hidden transition-all duration-300">
          <div className={`absolute -right-12 -top-12 w-28 h-28 rounded-full bg-gradient-to-tr ${app?.color || 'from-orange-500 to-pink-500'} opacity-5 blur-2xl pointer-events-none`} />

          {app && (
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider flex items-center gap-1.5 bg-gradient-to-r ${app.color} bg-clip-text text-transparent border-orange-500/10`}>
                <AppIconComponent className="h-3 w-3 text-orange-400" />
                <span>{app.name}</span>
              </span>
              <span className="text-[10px] text-gray-600 font-bold uppercase">Kết quả thực tế</span>
            </div>
          )}

          {resultPreview && (
            <p className="text-xs lg:text-sm text-gray-400 leading-relaxed italic border-l-2 border-orange-500/30 pl-3">
              &ldquo;{resultPreview}&rdquo;
            </p>
          )}

          {resultMetrics && resultMetrics.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1.5">
              {resultMetrics.map((met, idx) => (
                <div key={idx} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg p-2 text-center transition-colors">
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold truncate">
                    {met.label}
                  </span>
                  <span className="text-xs lg:text-sm text-white font-extrabold block mt-0.5 truncate">
                    {met.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsMvpModalOpen(true)}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-pink-500/10 hover:from-orange-500/20 hover:to-pink-500/20 text-orange-400 text-[11px] font-bold rounded-xl border border-orange-500/20 transition-all cursor-pointer group"
          >
            <Search className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            <span>Xem thành phẩm chi tiết</span>
            <ArrowRight className="h-3 w-3 opacity-50 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  if (type === 'task_assignment') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          {parseMessageMentions(message)}
        </p>

        <div className="bg-gray-950/40 border border-white/5 hover:border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 transition-colors">
          <button 
            onClick={handleTaskToggle}
            className="mt-0.5 cursor-pointer text-gray-500 hover:text-emerald-400 active:scale-95 transition-all shrink-0 animate-fade-in"
          >
            {resolvedTaskCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 animate-heart-pop" />
            ) : resolvedTaskStatus === 'in_progress' ? (
              <div className="h-5 w-5 rounded-full border-2 border-dashed border-blue-400 animate-spin shrink-0" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>

          <div className="flex-1 space-y-1.5 min-w-0">
            <span className={`text-sm font-extrabold text-white leading-tight block ${resolvedTaskCompleted ? 'line-through text-gray-500 transition-all' : ''}`}>
              {taskTitle}
            </span>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-semibold">
              <span className="flex items-center gap-1">
                👤 Người giao: <span className="text-gray-400">{taskAssignee}</span>
              </span>
              {taskDueDate && (
                <span className="flex items-center gap-1">
                  📅 Hạn: <span className="text-gray-400">{taskDueDate}</span>
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {resolvedTaskCompleted ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider">
                Hoàn thành
              </span>
            ) : resolvedTaskStatus === 'in_progress' ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-wider animate-pulse">
                Đang làm
              </span>
            ) : (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase tracking-wider">
                Chờ làm
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1.5 pl-8">
          {!resolvedTaskCompleted && resolvedTaskStatus !== 'in_progress' && (
            <button
              onClick={() => handleChangeStatus('in_progress')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-bold rounded-lg border border-blue-500/20 transition-all cursor-pointer"
            >
              <Zap className="h-3 w-3 animate-pulse" />
              <span>Nhận việc</span>
            </button>
          )}
          {resolvedTaskStatus === 'in_progress' && !resolvedTaskCompleted && (
            <button
              onClick={() => handleChangeStatus('completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Hoàn thành</span>
            </button>
          )}
          {resolvedTaskCompleted && (
            <button
              onClick={() => handleChangeStatus('pending')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 text-[11px] font-bold rounded-lg border border-gray-500/20 transition-all cursor-pointer"
            >
              <Zap className="h-3 w-3" />
              <span>Làm lại</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
