'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, MonitorCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RenderProgressWidget() {
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'rendering' | 'done' | 'error'>('disconnected');
  const [percent, setPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    let socket: WebSocket;
    const connectWS = () => {
      try {
        socket = new WebSocket('ws://localhost:3001');
        
        socket.onopen = () => {
          setStatus('connected');
          setWs(socket);
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'progress') {
            setStatus('rendering');
            setPercent(Math.round(data.percent || 0));
          } else if (data.type === 'done') {
            setStatus('done');
            setPercent(100);
          } else if (data.type === 'error') {
            setStatus('error');
            setErrorMsg(data.error);
          }
        };

        socket.onclose = () => {
          setStatus('disconnected');
          setWs(null);
          // Try to reconnect after 5s
          setTimeout(connectWS, 5000);
        };
      } catch (err) {
        console.error("WS Connect error", err);
      }
    };

    connectWS();

    return () => {
      if (socket) socket.close();
    };
  }, []);

  return (
    <Card className="p-4 bg-black/40 border-white/10 backdrop-blur-md mb-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'disconnected' && <AlertCircle size={16} className="text-yellow-500" />}
          {status === 'connected' && <MonitorCheck size={16} className="text-green-500" />}
          {status === 'rendering' && <Loader2 size={16} className="text-pink-500 animate-spin" />}
          {status === 'done' && <CheckCircle2 size={16} className="text-green-400" />}
          {status === 'error' && <AlertCircle size={16} className="text-red-500" />}
          
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">
              {status === 'disconnected' ? 'Local Renderer: Đang kết nối...' : 'Local Renderer: Sẵn sàng'}
            </span>
            {status === 'rendering' && (
              <span className="text-[10px] text-pink-400 font-mono">Đang render video: {percent}%</span>
            )}
            {status === 'error' && (
              <span className="text-[10px] text-red-400">Lỗi: {errorMsg}</span>
            )}
            {status === 'done' && (
              <span className="text-[10px] text-green-400">Render hoàn tất!</span>
            )}
          </div>
        </div>

        {status === 'rendering' && (
          <div className="w-32 bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
