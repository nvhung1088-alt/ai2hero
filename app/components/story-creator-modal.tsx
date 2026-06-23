'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Type, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface StoryCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  onPostStory: (data: { type: 'text' | 'photo'; content: string; background?: string }) => void;
}

const TEXT_GRADIENTS = [
  'bg-gradient-to-tr from-blue-500 to-purple-500',
  'bg-gradient-to-tr from-pink-500 to-orange-400',
  'bg-gradient-to-tr from-emerald-400 to-cyan-400',
  'bg-gradient-to-tr from-rose-400 to-red-500',
  'bg-gradient-to-tr from-indigo-500 to-cyan-400',
  'bg-slate-800',
  'bg-gradient-to-tr from-violet-600 to-fuchsia-600',
];

export function StoryCreatorModal({ isOpen, onClose, user, onPostStory }: StoryCreatorModalProps) {
  const [step, setStep] = useState<'select' | 'text' | 'photo'>('select');
  const [textContent, setTextContent] = useState('');
  const [bgClass, setBgClass] = useState(TEXT_GRADIENTS[0]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setTextContent('');
      setBgClass(TEXT_GRADIENTS[0]);
      setPhotoUrl(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (textContent.trim() || photoUrl) {
      if (!window.confirm('Bạn có muốn bỏ tin này không? Mọi nội dung sẽ bị mất.')) {
        return;
      }
    }
    onClose();
  };

  const handleShare = () => {
    if (step === 'select') return;
    if (step === 'text' && !textContent.trim()) return;
    if (step === 'photo' && !photoUrl) return;

    onPostStory({
      type: step,
      content: step === 'text' ? textContent : (photoUrl || ''),
      background: step === 'text' ? bgClass : undefined,
    });
    onClose();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
        setStep('photo');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex bg-black/90 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Sidebar Left */}
      <div className="w-full md:w-[360px] bg-[#242526] h-full flex flex-col border-r border-white/10 shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <button 
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">Tin của bạn</h2>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 shrink-0">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={user.name} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="font-semibold text-white">{user.name}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {step === 'select' && (
            <div className="grid grid-cols-2 gap-3 h-48">
              <label className="cursor-pointer bg-gradient-to-b from-blue-500 to-blue-700 rounded-xl flex flex-col items-center justify-center text-white hover:opacity-90 transition-opacity">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 text-blue-600 shadow-md">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="font-bold">Tạo tin ảnh</span>
              </label>
              
              <button 
                onClick={() => setStep('text')}
                className="cursor-pointer bg-gradient-to-b from-purple-500 to-pink-500 rounded-xl flex flex-col items-center justify-center text-white hover:opacity-90 transition-opacity"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 text-purple-600 shadow-md">
                  <Type className="w-6 h-6" />
                </div>
                <span className="font-bold text-center px-2">Tạo tin văn bản</span>
              </button>
            </div>
          )}

          {step === 'text' && (
            <div className="space-y-4 animate-fade-in">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Bắt đầu nhập..."
                className="w-full h-40 bg-transparent border border-white/20 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
              />
              
              <div>
                <h3 className="text-gray-400 text-sm font-semibold mb-3">Phông nền</h3>
                <div className="flex flex-wrap gap-2">
                  {TEXT_GRADIENTS.map((gradient, i) => (
                    <button
                      key={i}
                      onClick={() => setBgClass(gradient)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        bgClass === gradient ? 'border-blue-500 scale-110' : 'border-transparent hover:scale-110'
                      } ${gradient}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'photo' && (
            <div className="space-y-4 animate-fade-in text-gray-400 text-sm text-center">
              Ảnh của bạn đã được tải lên và sẵn sàng hiển thị trên Tin.
            </div>
          )}
        </div>

        {step !== 'select' && (
          <div className="p-4 border-t border-white/10 flex gap-3 bg-[#242526]">
            <button 
              onClick={() => { setStep('select'); setTextContent(''); setPhotoUrl(null); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Bỏ
            </button>
            <button 
              onClick={handleShare}
              disabled={(step === 'text' && !textContent.trim()) || (step === 'photo' && !photoUrl)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Chia sẻ lên tin
            </button>
          </div>
        )}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 hidden md:flex items-center justify-center p-8 bg-[#18191a]">
        {step !== 'select' ? (
          <div className="relative w-[360px] h-[640px] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center bg-[#242526] transition-all duration-300">
            {step === 'text' && (
              <div className={`absolute inset-0 ${bgClass} flex items-center justify-center p-8 text-center`}>
                <span 
                  className={`text-white font-bold whitespace-pre-wrap break-words leading-tight ${
                    textContent.length > 50 ? 'text-2xl' : 'text-4xl'
                  }`}
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  {textContent || 'Bắt đầu nhập...'}
                </span>
              </div>
            )}
            
            {step === 'photo' && photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={photoUrl} 
                alt="Story preview" 
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ) : (
          <div className="text-gray-500 font-semibold text-lg">
            Chọn ảnh hoặc văn bản để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
}
