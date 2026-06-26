'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Minus, MessageSquare, Mic, Image as ImageIcon, Zap, AlertCircle } from 'lucide-react';

export type ComparisonTab = 'text' | 'voice' | 'media';

interface AiComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ComparisonTab;
}

const TEXT_MODELS = [
  { name: 'GPT-4o', vendor: 'OpenAI', input: '$5.00', output: '$15.00', context: '128K', speed: 'Nhanh', vision: true },
  { name: 'GPT-4o Mini', vendor: 'OpenAI', input: '$0.15', output: '$0.60', context: '128K', speed: 'Rất Nhanh', vision: true },
  { name: 'Claude 3.5 Sonnet', vendor: 'Anthropic', input: '$3.00', output: '$15.00', context: '200K', speed: 'Nhanh', vision: true },
  { name: 'Gemini 1.5 Pro', vendor: 'Google', input: '$3.50', output: '$10.50', context: '2M', speed: 'TB', vision: true },
  { name: 'Gemini 1.5 Flash', vendor: 'Google', input: '$0.075', output: '$0.30', context: '1M', speed: 'Rất Nhanh', vision: true },
  { name: 'DeepSeek V3', vendor: 'DeepSeek', input: '$0.14', output: '$0.28', context: '64K', speed: 'Siêu Tốc', vision: false },
];

const TTS_MODELS = [
  { name: 'Viettel AI', vendor: 'Viettel', price: '25.000đ / 100K ký tự', voices: '6 Giọng Tự nhiên', speed: 'Nhanh', quality: 'Chuẩn vùng miền' },
  { name: 'FPT AI', vendor: 'FPT', price: 'Free / Nhỏ', voices: 'Nhiều giọng', speed: 'Nhanh', quality: 'Chuẩn vùng miền' },
  { name: 'ElevenLabs', vendor: 'ElevenLabs', price: '$0.30 / 1000 Char', voices: '120+ Giọng Cảm xúc', speed: 'TB', quality: 'Xuất sắc thế giới' },
  { name: 'Google Cloud TTS', vendor: 'Google', price: '$16.00 / 1M Char', voices: 'Neural2, Wavenet, Studio', speed: 'Rất Nhanh', quality: 'Khá tốt' },
];

const MEDIA_MODELS = [
  { name: 'DALL-E 3', vendor: 'OpenAI', type: 'Hình ảnh', price: '$0.040 / Ảnh Standard', res: '1024x1024', features: 'Prompt tuân thủ cực cao' },
  { name: 'Luma Dream Machine', vendor: 'Luma', type: 'Video', price: '~ $0.30 / Lượt sinh', res: 'HD 720p', features: 'Sinh video 5s từ ảnh/Text' },
  { name: 'Runway Gen-3', vendor: 'Runway', type: 'Video', price: '~ $0.40 / Lượt sinh', res: 'HD 720p', features: 'Chất lượng điện ảnh, điều khiển Camera' },
];

export function AiComparisonModal({ isOpen, onClose, initialTab = 'text' }: AiComparisonModalProps) {
  const [activeTab, setActiveTab] = useState<ComparisonTab>(initialTab);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  const renderTextTable = () => (
    <table className="w-full text-left text-[11px] sm:text-xs">
      <thead>
        <tr className="text-gray-400 font-bold border-b border-white/10 uppercase tracking-wider">
          <th className="pb-3 pl-2">Mô hình</th>
          <th className="pb-3">Input (1M)</th>
          <th className="pb-3">Output (1M)</th>
          <th className="pb-3">Context</th>
          <th className="pb-3">Vision</th>
          <th className="pb-3">Tốc độ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {TEXT_MODELS.map((m) => (
          <tr key={m.name} className="hover:bg-white/[0.02] transition-colors">
            <td className="py-3 pl-2">
              <p className="font-bold text-gray-200">{m.name}</p>
              <p className="text-[10px] text-gray-500">{m.vendor}</p>
            </td>
            <td className="py-3 font-semibold text-emerald-400">{m.input}</td>
            <td className="py-3 font-semibold text-rose-400">{m.output}</td>
            <td className="py-3 text-cyan-400 font-medium">{m.context}</td>
            <td className="py-3">
              {m.vision ? <Check className="h-4 w-4 text-green-500" /> : <Minus className="h-4 w-4 text-gray-600" />}
            </td>
            <td className="py-3 text-purple-400 font-medium">{m.speed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTtsTable = () => (
    <table className="w-full text-left text-[11px] sm:text-xs">
      <thead>
        <tr className="text-gray-400 font-bold border-b border-white/10 uppercase tracking-wider">
          <th className="pb-3 pl-2">Nhà cung cấp (Engine)</th>
          <th className="pb-3">Giá ước tính</th>
          <th className="pb-3">Số lượng giọng đọc</th>
          <th className="pb-3">Độ chân thực</th>
          <th className="pb-3">Tốc độ sinh (Latency)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {TTS_MODELS.map((m) => (
          <tr key={m.name} className="hover:bg-white/[0.02] transition-colors">
            <td className="py-3 pl-2">
              <p className="font-bold text-gray-200">{m.name}</p>
              <p className="text-[10px] text-gray-500">{m.vendor}</p>
            </td>
            <td className="py-3 font-semibold text-emerald-400">{m.price}</td>
            <td className="py-3 text-cyan-400 font-medium">{m.voices}</td>
            <td className="py-3 text-rose-400 font-medium">{m.quality}</td>
            <td className="py-3 text-purple-400 font-medium">{m.speed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderMediaTable = () => (
    <table className="w-full text-left text-[11px] sm:text-xs">
      <thead>
        <tr className="text-gray-400 font-bold border-b border-white/10 uppercase tracking-wider">
          <th className="pb-3 pl-2">Mô hình Media</th>
          <th className="pb-3">Phân loại</th>
          <th className="pb-3">Chi phí tạo</th>
          <th className="pb-3">Độ phân giải</th>
          <th className="pb-3">Đặc tính nổi bật</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {MEDIA_MODELS.map((m) => (
          <tr key={m.name} className="hover:bg-white/[0.02] transition-colors">
            <td className="py-3 pl-2">
              <p className="font-bold text-gray-200">{m.name}</p>
              <p className="text-[10px] text-gray-500">{m.vendor}</p>
            </td>
            <td className="py-3">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${m.type === 'Hình ảnh' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20'}`}>
                {m.type}
              </span>
            </td>
            <td className="py-3 font-semibold text-emerald-400">{m.price}</td>
            <td className="py-3 text-cyan-400 font-medium">{m.res}</td>
            <td className="py-3 text-gray-300 font-medium">{m.features}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return createPortal(
    <div 
      ref={backdropRef}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up" onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Bảng đối chiếu Trí tuệ Nhân tạo (AI)</h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Dữ liệu tham khảo tính phí & hiệu năng của các Model hàng đầu thế giới.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 sm:px-6 pt-4 border-b border-white/5 bg-gray-900/50">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('text')}
              className={`pb-3 flex items-center gap-2 font-bold text-sm border-b-2 transition-colors cursor-pointer ${activeTab === 'text' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <MessageSquare className="h-4 w-4" /> AI Text (LLM)
            </button>
            <button 
              onClick={() => setActiveTab('voice')}
              className={`pb-3 flex items-center gap-2 font-bold text-sm border-b-2 transition-colors cursor-pointer ${activeTab === 'voice' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Mic className="h-4 w-4" /> AI Voice (TTS)
            </button>
            <button 
              onClick={() => setActiveTab('media')}
              className={`pb-3 flex items-center gap-2 font-bold text-sm border-b-2 transition-colors cursor-pointer ${activeTab === 'media' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <ImageIcon className="h-4 w-4" /> AI Video / Image
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-gray-900/40">
          
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
              <strong>Lưu ý:</strong> Bảng giá dưới đây mang tính chất tham khảo dựa trên giá gốc của nhà cung cấp, chưa bao gồm các thuế phí hoặc chiết khấu khác (nếu có). Các mô hình liên tục được nhà cung cấp tối ưu về cả tốc độ lẫn chi phí qua thời gian.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5 bg-gray-900/80 backdrop-blur-sm">
            {activeTab === 'text' && renderTextTable()}
            {activeTab === 'voice' && renderTtsTable()}
            {activeTab === 'media' && renderMediaTable()}
          </div>
          
        </div>
      </div>
    </div>,
    document.body
  );
}
