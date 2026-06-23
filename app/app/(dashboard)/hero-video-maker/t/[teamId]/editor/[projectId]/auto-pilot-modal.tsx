'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import presetsData from '@/lib/hero-video-maker/presets.json';
import { Sparkles, Image as ImageIcon, Video, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

interface AutoPilotConfig {
  artStyleId: string;
  storySkillId: string;
  videoModel: string;
  imageModel: string;
}

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: AutoPilotConfig) => void;
}

export function AutoPilotModal({ isOpen, onClose, onStart }: AutoPilotModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [config, setConfig] = useState<AutoPilotConfig>({
    artStyleId: presetsData.artSkills[0]?.id || '',
    storySkillId: presetsData.storySkills[0]?.id || '',
    videoModel: 'hunyuan-video',
    imageModel: 'dall-e-3'
  });

  const handleNext = () => setStep(step + 1 as any);
  const handlePrev = () => setStep(step - 1 as any);
  const handleStart = () => onStart(config);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl bg-[#09090b] border border-white/10 rounded-2xl text-white p-0 overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header Steps */}
        <div className="bg-white/[0.02] border-b border-white/5 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-pink-400" />
            Cấu hình Super Agent (Auto-Pilot)
          </h2>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className={step >= 1 ? 'text-pink-400' : ''}>1. Art Style</span>
            <span className={step >= 2 ? 'text-pink-400' : ''}>2. Sổ tay đạo diễn</span>
            <span className={step === 3 ? 'text-pink-400' : ''}>3. Models</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 h-[500px] overflow-y-auto custom-scrollbar">
          
          {/* STEP 1: ART STYLE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <p className="text-sm text-slate-400">Chọn "Hướng dẫn trực quan" (Art Style) để định hình phong cách đồ họa cho toàn bộ video.</p>
              <div className="grid grid-cols-3 gap-4">
                {presetsData.artSkills.map(style => (
                  <div 
                    key={style.id}
                    onClick={() => setConfig({ ...config, artStyleId: style.id })}
                    className={`relative rounded-xl overflow-hidden cursor-pointer group border-2 transition-all ${
                      config.artStyleId === style.id ? 'border-pink-500' : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <div className="aspect-video relative bg-slate-800">
                      {style.imageUrl ? (
                        <Image src={style.imageUrl} alt={style.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h4 className="text-sm font-bold text-white leading-tight"># {style.name}</h4>
                    </div>
                    {config.artStyleId === style.id && (
                      <div className="absolute top-2 right-2 text-pink-400 bg-black/50 rounded-full">
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: STORY SKILLS (DIRECTOR MANUAL) */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <p className="text-sm text-slate-400">Chọn "Sổ tay Giám đốc" (Workflow) để gò AI vào các quy tắc góc máy, kịch bản, và nhịp độ phim.</p>
              <div className="grid grid-cols-3 gap-4">
                {presetsData.storySkills.map(skill => (
                  <div 
                    key={skill.id}
                    onClick={() => setConfig({ ...config, storySkillId: skill.id })}
                    className={`relative rounded-xl overflow-hidden cursor-pointer p-5 transition-all flex flex-col justify-center items-center text-center min-h-[120px] ${
                      config.storySkillId === skill.id 
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500' 
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <h4 className="text-sm font-bold text-white leading-relaxed"># {skill.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">Gói thủ pháp đạo diễn</p>
                    
                    {config.storySkillId === skill.id && (
                      <div className="absolute top-2 right-2 text-purple-400">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: MODELS */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-xl mx-auto py-8">
              <div className="text-center space-y-2 mb-8">
                <Video size={48} className="mx-auto text-pink-400 mb-4" />
                <h3 className="text-xl font-bold text-white">Xác nhận Model & Chi phí</h3>
                <p className="text-sm text-slate-400">Super Agent sẽ sử dụng API keys từ Cấu Hình Toàn Cục.</p>
              </div>

              <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Image Generation Model</label>
                  <select 
                    value={config.imageModel}
                    onChange={e => setConfig({ ...config, imageModel: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                  >
                    <option value="dall-e-3">DALL-E 3 (High Quality)</option>
                    <option value="stable-diffusion-xl">Stable Diffusion XL (Fast)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Video Generation Model</label>
                  <select 
                    value={config.videoModel}
                    onChange={e => setConfig({ ...config, videoModel: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                  >
                    <option value="hunyuan-video">Hunyuan Video (Tencent)</option>
                    <option value="runway-gen3">Runway Gen-3 Alpha</option>
                    <option value="pika-1.0">Pika Labs 1.0</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-xs leading-relaxed text-center">
                <strong>Lưu ý:</strong> Vui lòng không đóng trình duyệt trong quá trình Auto-Pilot chạy để đảm bảo nhận được log tiến độ đầy đủ.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/40 border-t border-white/5 p-4 flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={step === 1 ? onClose : handlePrev}
            className="text-slate-400 hover:text-white"
          >
            {step === 1 ? 'Hủy' : 'Quay lại'}
          </Button>
          
          {step < 3 ? (
            <Button onClick={handleNext} className="bg-white text-black hover:bg-slate-200 font-bold px-8">
              Tiếp theo
            </Button>
          ) : (
            <Button 
              onClick={handleStart} 
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-8 shadow-lg shadow-pink-500/20"
            >
              🚀 Bắt đầu Auto-Pilot
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
