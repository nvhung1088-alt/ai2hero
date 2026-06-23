'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Save, Image as ImageIcon, Play, ArrowLeft, RefreshCw } from 'lucide-react';
import { VideoProject } from '@/lib/db/schema';
import { updateVideoProject, runProductionPipelineAction } from '@/lib/db/video-maker-actions';
import { STORYBOARD_GENERATOR_PROMPT } from '@/lib/hero-video-maker/storyboard-prompt';

export default function VideoEditorClient({ 
  project, 
  connections, 
  teamId 
}: { 
  project: VideoProject; 
  connections: any[];
  teamId: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [idea, setIdea] = useState('');
  const [scenes, setScenes] = useState<any[]>(Array.isArray(project.scenes) ? project.scenes : []);
  const [selectedConnection, setSelectedConnection] = useState<number | ''>(
    connections.length > 0 ? connections[0].id : ''
  );
  
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);

  const handleRunPipeline = async () => {
    if (!confirm('Bạn có chắc muốn chạy luồng tạo video tự động (Auto-Pilot) không? Quá trình này có thể mất vài phút.')) return;
    
    try {
      setIsRunningPipeline(true);
      const res = await runProductionPipelineAction(teamId, project.id);
      if (res.success) {
        alert('Tạo video tự động thành công! Vui lòng làm mới trang để xem kết quả.');
        router.refresh();
      } else {
        alert('Lỗi: ' + res.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('Lỗi khi chạy Auto-Pilot: ' + err.message);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateVideoProject(teamId, project.id, {
        title,
        scenes,
        updatedAt: new Date()
      });
      alert('Đã lưu dự án thành công!');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu dự án');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!idea.trim()) return alert('Vui lòng nhập ý tưởng!');
    if (!selectedConnection) return alert('Vui lòng chọn kết nối AI từ Connect Hub!');

    const conn = connections.find(c => c.id === selectedConnection);
    const model = conn?.appSlug === 'openai' ? 'gpt-4o' : 'gpt-3.5-turbo'; // Default model inference based on slug

    try {
      setIsGeneratingScript(true);
      const finalPrompt = `
      ${STORYBOARD_GENERATOR_PROMPT}
      
      Ý TƯỞNG CỦA NGƯỜI DÙNG:
      ${idea}
      `;

      const response = await fetch('/api/video-maker/ai/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnection,
          model,
          prompt: finalPrompt,
          streaming: false
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Lỗi sinh kịch bản');
      }

      // API có thể trả về resData.data dạng string
      let jsonText = resData.data;
      if (typeof jsonText !== 'string') {
        jsonText = JSON.stringify(resData.data);
      }
      
      // Bóc tách JSON nếu bị bọc trong markdown codeblock
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) jsonText = jsonMatch[1];

      const parsedData = JSON.parse(jsonText);
      if (parsedData.title) setTitle(parsedData.title);
      if (parsedData.scenes) setScenes(parsedData.scenes);
      
      alert('Sinh kịch bản thành công!');
    } catch (error: any) {
      console.error('Error generating script:', error);
      alert('Lỗi sinh kịch bản: ' + error.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const updateScene = (index: number, key: string, value: any) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], [key]: value };
    setScenes(newScenes);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push(`/hero-video-maker/t/${teamId}/projects`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold border-none bg-transparent hover:bg-gray-100 focus-visible:ring-0 px-2 w-[400px]"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Lưu nháp
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleRunPipeline}
            disabled={isRunningPipeline}
          >
            {isRunningPipeline ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {isRunningPipeline ? 'Đang Tạo Video Tự Động...' : 'Tạo Video Tự Động (Auto-Pilot)'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Generator */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-lg flex items-center">
                <Wand2 className="w-5 h-5 mr-2 text-indigo-500" />
                AI Tự động lên Kịch Bản
              </CardTitle>
              <CardDescription>
                Sinh kịch bản và prompt ảnh tự động qua Connect Hub
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nguồn AI (Connection)</label>
                <select 
                  className="w-full border rounded-md p-2 text-sm"
                  value={selectedConnection}
                  onChange={(e) => setSelectedConnection(e.target.value ? parseInt(e.target.value) : '')}
                >
                  <option value="">-- Chọn kết nối API --</option>
                  {connections.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.appSlug})</option>
                  ))}
                </select>
                {connections.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Chưa có kết nối nào. Hãy thiết lập ở Connect Hub.</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Ý tưởng (Prompt)</label>
                <Textarea 
                  placeholder="Ví dụ: Một video ngắn giới thiệu về lịch sử của AI, phong cách bí ẩn, khoa học viễn tưởng..."
                  className="min-h-[120px] text-sm"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                />
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" 
                onClick={handleGenerateScript}
                disabled={isGeneratingScript || !selectedConnection}
              >
                {isGeneratingScript ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {isGeneratingScript ? 'AI Đang suy nghĩ...' : 'Tạo Storyboard'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Storyboard Editor */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold flex items-center justify-between">
            <span>Chi tiết các cảnh (Scenes)</span>
            <span className="text-sm font-normal text-gray-500">Tổng: {scenes.length} cảnh</span>
          </h3>

          {scenes.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-10 text-center text-gray-500 bg-gray-50/50">
              Chưa có cảnh nào. Vui lòng sử dụng AI để tạo hoặc thêm thủ công.
            </div>
          ) : (
            scenes.map((scene, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center text-sm font-medium">
                  <span>Cảnh {scene.order || index + 1}</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{scene.duration || 5}s</span>
                </div>
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  {/* Cột Tóm tắt / Hình ảnh */}
                  <div className="w-full sm:w-1/3 bg-gray-50 p-4 border-r flex flex-col items-center justify-center min-h-[160px] relative group">
                    {scene.imageUrl ? (
                      <img src={scene.imageUrl} alt={`Scene ${index}`} className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <span className="text-xs">Chưa sinh ảnh</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button size="sm" variant="secondary" className="text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" /> Sinh Ảnh AI
                      </Button>
                    </div>
                  </div>
                  
                  {/* Cột Kịch Bản & Prompt */}
                  <div className="w-full sm:w-2/3 p-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Lời bình (Narration)</label>
                      <Textarea 
                        value={scene.narration} 
                        onChange={(e) => updateScene(index, 'narration', e.target.value)}
                        className="min-h-[60px] text-sm resize-none focus-visible:ring-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Prompt tạo ảnh (Tiếng Anh)</label>
                      <Textarea 
                        value={scene.imagePrompt} 
                        onChange={(e) => updateScene(index, 'imagePrompt', e.target.value)}
                        className="min-h-[60px] text-xs font-mono text-gray-600 bg-gray-50 resize-none focus-visible:ring-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
