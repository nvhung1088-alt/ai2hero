'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Sparkles, 
  ArrowRight, 
  Save, 
  Send,
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Play
} from 'lucide-react';
import { 
  createVideoScript, 
  updateVideoScript, 
  deleteVideoScript,
  extractScriptAssetsAction
} from '@/lib/db/video-maker-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';

interface ScriptClientProps {
  project: any;
  initialScripts: any[];
  novels: any[];
  models: any[];
  teamId: number;
  projectId: number;
}

export default function ScriptClient({ project, initialScripts, novels, models, teamId, projectId }: ScriptClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [scripts, setScripts] = useState<any[]>(initialScripts);
  const [selectedScript, setSelectedScript] = useState<any | null>(initialScripts[0] || null);
  
  // States cho Form Editor
  const [scriptName, setScriptName] = useState(selectedScript?.name || '');
  const [scriptContent, setScriptContent] = useState(selectedScript?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // States cho Chat AI
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: 'Chào bạn! Tôi là ScriptAgent. Hãy gửi yêu cầu để tôi viết kịch bản chi tiết dựa trên tiểu thuyết và các sự kiện của bạn!' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [textModels, setTextModels] = useState<any[]>([]);

  useEffect(() => {
    const textModelsList = models.filter(m => m.type === 'text');
    setTextModels(textModelsList);
    if (textModelsList.length > 0) {
      const defaultModel = textModelsList.find(m => m.modelName.includes('gpt-4o') || m.modelName.includes('claude')) || textModelsList[0];
      setSelectedModel(defaultModel.modelName);
    }
  }, [models]);

  useEffect(() => {
    if (selectedScript) {
      setScriptName(selectedScript.name);
      setScriptContent(selectedScript.content);
    } else {
      setScriptName('');
      setScriptContent('');
    }
  }, [selectedScript]);

  // Đồng bộ scripts props từ server component
  useEffect(() => {
    setScripts(initialScripts);
    if (initialScripts.length > 0 && !selectedScript) {
      setSelectedScript(initialScripts[0]);
    }
  }, [initialScripts]);

  const handleCreateNewScript = () => {
    setSelectedScript(null);
    setScriptName('Kịch bản mới ' + (scripts.length + 1));
    setScriptContent('');
  };

  const handleSaveScript = async () => {
    if (!scriptName.trim() || !scriptContent.trim()) {
      showToast("Vui lòng điền đầy đủ Tên kịch bản và Nội dung.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (selectedScript) {
        // Update kịch bản có sẵn
        await updateVideoScript(teamId, projectId, selectedScript.id, {
          name: scriptName,
          content: scriptContent
        });
        showToast("Kịch bản đã được lưu.", "success");
        router.refresh();
      } else {
        // Tạo kịch bản mới
        const created = await createVideoScript(teamId, projectId, {
          name: scriptName,
          content: scriptContent,
          extractState: 0
        });
        showToast("Kịch bản mới đã được tạo.", "success");
        setSelectedScript(created);
        router.refresh();
      }
    } catch (e: any) {
      showToast(e.message || "Không thể lưu kịch bản.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Chat AI qua API Multi-Agent SSE
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatting) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
      const res = await fetch('/api/video-maker/ai/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          projectId: projectId,
          message: userMsg
        })
      });

      if (!res.body) throw new Error("Không thể kết nối luồng dữ liệu (Stream).");

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\\n\\n');
          
          // Phần tử cuối cùng có thể là một event chưa hoàn chỉnh (chưa có \n\n)
          buffer = events.pop() || '';

          for (const eventStr of events) {
            const lines = eventStr.split('\\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.substring(6);
                if (dataStr === '[DONE]') {
                  done = true;
                  break;
                }
                try {
                  const event = JSON.parse(dataStr);
                  
                  if (event.type === 'step') {
                    setMessages(prev => {
                      const newMessages = [...prev];
                      const lastMsg = newMessages[newMessages.length - 1];
                      if (lastMsg.role === 'system_step') {
                        newMessages[newMessages.length - 1] = { role: 'system_step', content: event.message };
                      } else {
                        newMessages.push({ role: 'system_step', content: event.message });
                      }
                      return newMessages;
                    });
                  } else if (event.type === 'text') {
                    setMessages(prev => {
                      const cleaned = prev.filter(m => m.role !== 'system_step');
                      return [...cleaned, { role: 'assistant', content: event.content }];
                    });
                  } else if (event.type === 'result' && event.success && event.data?.scripts?.length > 0) {
                    setScriptContent(event.data.scripts[0].content);
                    showToast("Kịch bản AI đã được tự động áp dụng!", "success");
                  } else if (event.type === 'result' && !event.success) {
                    showToast(event.error || "Lỗi AI Pipeline", "error");
                  }
                } catch (err) {
                  console.error("Lỗi parse JSON event:", err, dataStr);
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      showToast(e.message || "Không thể kết nối AI model.", "error");
    } finally {
      setIsChatting(false);
      // Dọn dẹp step msg cuối cùng nếu có lỗi bị treo
      setMessages(prev => prev.filter(m => m.role !== 'system_step'));
    }
  };

  const handleExtractAssets = async () => {
    if (!selectedScript) return;
    setIsExtracting(true);

    try {
      const res = await extractScriptAssetsAction(teamId, projectId, [selectedScript.id], selectedModel);
      if (res.success) {
        showToast("AI đã trích xuất toàn bộ nhân vật, bối cảnh, đạo cụ từ kịch bản.", "success");
        router.push(`/hero-video-maker/t/${teamId}/editor/${projectId}/assets`);
      } else {
        showToast(res.error || "Lỗi trích xuất tài sản AI.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    } finally {
      setIsExtracting(false);
      router.refresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Top action bar */}
      <div className="h-16 border-b border-white/[0.05] flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chọn Kịch Bản:</span>
          <select
            value={selectedScript?.id || 'new'}
            onChange={(e) => {
              if (e.target.value === 'new') {
                handleCreateNewScript();
              } else {
                const found = scripts.find(s => s.id === parseInt(e.target.value, 10));
                setSelectedScript(found || null);
              }
            }}
            className="bg-[#0c0c14] border border-white/[0.08] text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500/50"
          >
            {scripts.map((script) => (
              <option key={script.id} value={script.id}>
                {script.name}
              </option>
            ))}
            <option value="new">+ Tạo kịch bản mới</option>
          </select>

          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider ml-4">AI Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#0c0c14] border border-white/[0.08] text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500/50"
          >
            {textModels.map((model) => (
              <option key={model.modelName} value={model.modelName}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveScript}
            disabled={isSaving}
            className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs gap-2"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Lưu Kịch Bản
          </Button>

          {selectedScript && (
            <Button
              onClick={handleExtractAssets}
              disabled={isExtracting || !scriptContent}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs gap-2 border-0 shadow-lg shadow-pink-500/10"
            >
              {isExtracting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              Trích Xuất Tài Sản AI
              <ArrowRight size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Cột trái: AI Chat Generator */}
        <div className="w-1/2 border-r border-white/[0.05] flex flex-col bg-black/10">
          <div className="p-4 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-pink-400" />
              ScriptAgent Chat
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMessages([
                { role: 'assistant', content: 'Chào bạn! Tôi là ScriptAgent. Hãy gửi yêu cầu để tôi viết kịch bản chi tiết dựa trên tiểu thuyết và các sự kiện của bạn!' }
              ])}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Reset Chat
            </Button>
          </div>

          {/* Hộp hội thoại */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-white border border-pink-500/20' 
                    : msg.role === 'system_step'
                    ? 'bg-transparent text-pink-400/80 italic text-[10px] py-1 px-2 animate-pulse'
                    : 'bg-white/[0.02] border border-white/[0.05] text-slate-300'
                }`}>
                  {msg.role !== 'system_step' && (
                    <div className="font-semibold text-[10px] text-slate-500 mb-1">
                      {msg.role === 'user' ? 'BẠN' : 'ORCHESTRATOR / SCRIPT AGENT'}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-line font-sans flex items-center gap-2">
                    {msg.role === 'system_step' && <Sparkles size={10} />}
                    {msg.content}
                  </div>

                  {msg.role === 'assistant' && msg.content !== messages[0].content && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => {
                          setScriptContent(msg.content);
                          showToast("Nội dung phản hồi từ AI đã được sao chép vào ô kịch bản.", "success");
                        }}
                        className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-[10px] py-1 h-6 gap-1"
                      >
                        Áp dụng kịch bản này
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-white/[0.02] border border-white/[0.05] text-slate-400 rounded-2xl p-4 text-xs flex items-center gap-2">
                  <Loader2 className="animate-spin text-pink-400" size={14} />
                  AI đang viết kịch bản...
                </div>
              </div>
            )}
          </div>

          {/* Ô nhập chat */}
          <div className="p-4 border-t border-white/[0.05] bg-black/20 flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Yêu cầu AI viết kịch bản (ví dụ: 'Hãy viết kịch bản cho chương 1')..."
              className="bg-black/30 border-white/[0.05] text-slate-200 text-xs focus:border-pink-500/30"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isChatting || !inputMessage.trim()}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 shrink-0"
            >
              <Send size={14} />
            </Button>
          </div>
        </div>

        {/* Cột phải: Script Editor */}
        <div className="w-1/2 flex flex-col p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên kịch bản</label>
            <Input
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder="Nhập tên kịch bản..."
              className="bg-[#0b0b10] border-white/[0.05] text-slate-200 text-sm font-semibold"
            />
          </div>

          <div className="flex-1 flex flex-col space-y-1 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nội dung kịch bản</label>
              {selectedScript && (
                <span className="text-[10px] text-slate-500">
                  Trạng thái trích xuất: {
                    selectedScript.extractState === 1 ? 'Đã trích xuất' : 'Chưa trích xuất'
                  }
                </span>
              )}
            </div>
            <Textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder="Biên soạn hoặc dán kịch bản chi tiết ở đây..."
              className="flex-1 bg-[#0b0b10] border-white/[0.05] text-slate-200 font-sans leading-relaxed text-sm resize-none focus:border-pink-500/40 p-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
