'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, Circle, Loader2, Sparkles, XCircle } from 'lucide-react';
import { AgentSSEEvent } from '@/lib/hero-video-maker/agent-types';

interface AutoPilotStatusProps {
  isOpen: boolean;
  teamId: number;
  projectId: number;
  config: any;
  onComplete: () => void;
  onClose: () => void;
}

export function AutoPilotStatus({ isOpen, teamId, projectId, config, onComplete, onClose }: AutoPilotStatusProps) {
  const [logs, setLogs] = useState<AgentSSEEvent[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !config) return;

    setLogs([]);
    setIsFinished(false);
    setHasError(false);

    // Bắt đầu Fetch SSE
    let eventSource: HTMLDivElement | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const startAutoPilot = async () => {
      try {
        const response = await fetch('/api/video-maker/ai/super-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId, projectId, config })
        });

        if (!response.body) throw new Error("No response body");

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;
              try {
                const event = JSON.parse(dataStr);
                
                if (event.type === 'done') {
                  setIsFinished(true);
                  onComplete();
                } else if (event.type === 'step' && (event as any).status === 'error') {
                  setHasError(true);
                }

                setLogs(prev => [...prev, event]);
              } catch (e) {
                console.error("Parse SSE Error", e, dataStr);
              }
            }
          }
        }
      } catch (error) {
        console.error(error);
        setHasError(true);
        setLogs(prev => [...prev, { type: 'step', agentRole: 'orchestrator', status: 'error', message: 'Mất kết nối với máy chủ.' } as any]);
      }
    };

    startAutoPilot();

    return () => {
      if (reader) reader.cancel();
    };
  }, [isOpen, config]);

  // Cuộn log xuống cuối
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl bg-[#09090b] border border-white/10 rounded-2xl text-white p-0 overflow-hidden shadow-2xl flex flex-col">
        
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 border-b border-white/5 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
          
          {isFinished ? (
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-400">
              <CheckCircle2 size={32} />
            </div>
          ) : hasError ? (
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-400">
              <XCircle size={32} />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mb-4 text-pink-400 relative">
              <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping"></div>
              <Bot size={32} />
            </div>
          )}
          
          <h2 className="text-xl font-bold">
            {isFinished ? 'Auto-Pilot Đã Hoàn Tất!' : hasError ? 'Auto-Pilot Gặp Lỗi' : 'Super Agent Đang Chạy...'}
          </h2>
          <p className="text-sm text-slate-400 mt-2 text-center max-w-sm">
            {isFinished 
              ? 'Toàn bộ quy trình từ tiểu thuyết đến video đã được tự động xử lý thành công.' 
              : 'Vui lòng không đóng tab trình duyệt này. Hệ thống đang tự động điều phối các Agent xử lý dự án của bạn.'}
          </p>
        </div>

        <div className="h-80 overflow-y-auto bg-black/40 p-4 font-mono text-sm custom-scrollbar relative">
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 text-slate-300">
                <div className="mt-0.5 shrink-0">
                  {log.type === 'step' && (log as any).status === 'thinking' && <Loader2 size={14} className="animate-spin text-purple-400" />}
                  {log.type === 'step' && (log as any).status === 'executing' && <Loader2 size={14} className="animate-spin text-blue-400" />}
                  {log.type === 'step' && (log as any).status === 'done' && <CheckCircle2 size={14} className="text-green-400" />}
                  {log.type === 'step' && (log as any).status === 'error' && <XCircle size={14} className="text-red-400" />}
                  {log.type === 'text' && <Sparkles size={14} className="text-pink-400" />}
                  {(log as any).type === 'done' && <CheckCircle2 size={14} className="text-green-400" />}
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-2">[{(log as any).agentRole || 'system'}]</span>
                  <span className={(log as any).status === 'error' ? 'text-red-400' : ''}>
                    {(log as any).message || (log as any).content || '...'}
                  </span>
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {(isFinished || hasError) && (
          <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
