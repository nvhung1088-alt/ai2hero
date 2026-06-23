'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, 
  ListTodo, 
  FileText, 
  Sparkles, 
  Film, 
  Play, 
  ArrowLeft,
  Settings,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AutoPilotModal } from './auto-pilot-modal';
import { AutoPilotStatus } from './auto-pilot-status';

interface StepSidebarProps {
  teamId: number;
  projectId: number;
  projectTitle: string;
}

export default function StepSidebar({ teamId, projectId, projectTitle }: StepSidebarProps) {
  const pathname = usePathname();
  const [isAutoPilotOpen, setAutoPilotOpen] = useState(false);
  const [statusConfig, setStatusConfig] = useState<any>(null);

  const handleStartAutoPilot = async (config: any) => {
    setAutoPilotOpen(false);
    setStatusConfig(config);
  };

  const handleCloseStatus = () => {
    setStatusConfig(null);
    // Reload page to reflect new DB state (optional, or redirect to Video tab)
    window.location.href = `/hero-video-maker/t/${teamId}/editor/${projectId}/video`;
  };

  const steps = [
    {
      id: 'novel',
      name: '1. Tiểu Thuyết',
      desc: 'Nhập truyện & Chia chương',
      icon: BookOpen,
      href: `/hero-video-maker/t/${teamId}/editor/${projectId}/novel`,
    },
    {
      id: 'events',
      name: '2. Sự Kiện AI',
      desc: 'AI trích xuất 7 trường sự kiện',
      icon: ListTodo,
      href: `/hero-video-maker/t/${teamId}/editor/${projectId}/events`,
    },
    {
      id: 'script',
      name: '3. Kịch Bản',
      desc: 'Chat với Agent viết kịch bản',
      icon: FileText,
      href: `/hero-video-maker/t/${teamId}/editor/${projectId}/script`,
    },
    {
      id: 'assets',
      name: '4. Sổ Tay & Tài Sản',
      desc: 'Quản lý Nhân vật & Bối cảnh',
      icon: Sparkles,
      href: `/hero-video-maker/t/${teamId}/editor/${projectId}/assets`,
    },
    {
      id: 'storyboard',
      name: '5. Phân Cảnh',
      desc: 'Biên tập & Sinh ảnh storyboard',
      icon: Film,
      href: `/hero-video-maker/t/${teamId}/editor/${projectId}/storyboard`,
    },
    {
      id: 'video',
      name: '6. Video Workbench',
      desc: 'Sinh video từ storyboard',
      icon: Play,
      href: `/hero-video-maker/t/${teamId}/editor/${projectId}/video`,
    },
  ];

  return (
    <div className="w-80 h-screen flex flex-col bg-[#050508] border-r border-white/[0.05] shrink-0 text-slate-200 select-none">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.05]">
        <Link 
          href={`/hero-video-maker/t/${teamId}/dashboard`} 
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-pink-400 transition-colors mb-4 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Quay lại dự án
        </Link>
        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 truncate" title={projectTitle}>
          {projectTitle}
        </h1>
        <p className="text-xs text-slate-500 mt-1">HeroVideoMaker Editor</p>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {steps.map((step) => {
          const isActive = pathname.startsWith(step.href);
          const Icon = step.icon;

          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl transition-all duration-300 relative group overflow-hidden border border-transparent",
                isActive 
                  ? "bg-gradient-to-r from-pink-500/[0.08] to-purple-500/[0.08] border-pink-500/20 text-white" 
                  : "hover:bg-white/[0.02] hover:border-white/[0.02] text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-500" />
              )}
              <div className={cn(
                "p-2 rounded-lg transition-colors duration-300",
                isActive ? "bg-pink-500/10 text-pink-400" : "bg-white/[0.02] text-slate-500 group-hover:text-slate-300"
              )}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold tracking-wide truncate">{step.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate group-hover:text-slate-400 transition-colors">
                  {step.desc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer / Settings */}
      <div className="p-4 border-t border-white/[0.05] bg-[#050508] space-y-2">
        <button 
          onClick={() => setAutoPilotOpen(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-600/20 border border-pink-500/30 text-pink-400 hover:from-pink-500 hover:to-purple-600 hover:text-white transition-all shadow-lg font-bold"
        >
          <Rocket size={18} />
          <span>Auto-Pilot</span>
        </button>
        
        <Link 
          href={`/hero-video-maker/t/${teamId}/editor/${projectId}/settings`}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
            pathname.endsWith('/settings') 
              ? "bg-white/10 text-white" 
              : "text-slate-400 hover:bg-white/[0.02] hover:text-slate-200"
          )}
        >
          <Settings size={18} />
          <div className="text-sm font-medium">Cài đặt Dự án</div>
        </Link>
        <div className="mt-4 text-center text-[10px] text-slate-600">
          Toonflow Engine Integrated v1.0.0
        </div>
      </div>

      <AutoPilotModal 
        isOpen={isAutoPilotOpen} 
        onClose={() => setAutoPilotOpen(false)} 
        onStart={handleStartAutoPilot} 
      />

      <AutoPilotStatus
        isOpen={!!statusConfig}
        teamId={teamId}
        projectId={projectId}
        config={statusConfig}
        onComplete={() => console.log('Auto Pilot Complete')}
        onClose={handleCloseStatus}
      />
    </div>
  );
}
