import React from 'react';
import Link from 'next/link';
import { Star, Zap, DollarSign, Target, Info, ArrowLeft, Bot, Sparkles, AudioWaveform } from 'lucide-react';
import { redirect } from 'next/navigation';

// --- CẤU HÌNH DỮ LIỆU ĐÁNH GIÁ AI (DYNAMIC CONFIG) ---
// Anh có thể thêm/sửa AI tại đây, bảng giao diện sẽ tự động cập nhật
const TTS_MODELS = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    icon: <Sparkles className="h-3 w-3 text-yellow-500" />,
    desc: 'Giọng đa ngôn ngữ, siêu thực',
    stars: 5,
    starLabel: 'Điện ảnh (Emotion)',
    priceLabel: '~$180',
    priceDesc: 'Cao nhất',
    priceColor: 'text-rose-400',
    speedLabel: 'Trung bình',
    speedColor: 'text-gray-300',
    bestFor: 'Lồng tiếng phim ngắn (HeroDub), Kênh Youtube kiếm tiền, Nội dung cao cấp.'
  },
  {
    id: 'openai',
    name: 'OpenAI TTS',
    icon: null,
    desc: 'Alloy, Echo, Fable, Onyx...',
    stars: 4,
    starLabel: 'Tự nhiên, Ấm áp',
    priceLabel: '~$15',
    priceDesc: 'Tầm trung',
    priceColor: 'text-orange-400',
    speedLabel: 'Nhanh',
    speedColor: 'text-green-400',
    bestFor: 'Trợ lý ảo giao tiếp (Hero Care), Đọc sách Audiobook tiếng Anh.'
  },
  {
    id: 'viettel',
    name: 'Viettel AI',
    icon: null,
    desc: 'Giọng chuẩn vùng miền VN',
    stars: 4,
    starLabel: 'Chuẩn Tiếng Việt',
    priceLabel: '~$2',
    priceDesc: 'Rất rẻ',
    priceColor: 'text-green-400',
    speedLabel: 'Rất Nhanh',
    speedColor: 'text-cyan-400',
    bestFor: 'Tổng đài viên tự động (Auto-call), Đọc báo Tiếng Việt, Bản tin nội bộ.'
  },
  {
    id: 'fpt',
    name: 'FPT AI',
    icon: null,
    desc: 'BanMai, ThuMinh, MinhQuang...',
    stars: 4,
    starLabel: 'Ngữ điệu tự nhiên',
    priceLabel: '~$3',
    priceDesc: 'Rất rẻ',
    priceColor: 'text-green-400',
    speedLabel: 'Nhanh',
    speedColor: 'text-green-400',
    bestFor: 'Đọc tin tức, Chatbot Tiếng Việt, Ứng dụng doanh nghiệp.'
  },
  {
    id: 'google',
    name: 'Google TTS (WaveNet)',
    icon: null,
    desc: 'Phủ sóng đa ngôn ngữ lớn nhất',
    stars: 3,
    starLabel: 'Cơ bản, rõ ràng',
    priceLabel: '~$4',
    priceDesc: 'Rẻ',
    priceColor: 'text-green-400',
    speedIcon: <Zap className="h-3 w-3" />,
    speedLabel: 'Siêu Tốc',
    speedColor: 'text-purple-400',
    bestFor: 'Dịch thuật trực tuyến, IVR Tổng đài cơ bản, Đọc nháp video.'
  }
];

const LLM_MODELS = [
  {
    id: 'gpt4o',
    name: 'GPT-4o (OpenAI)',
    stars: 5,
    starLabel: 'Xuất sắc',
    priceLabel: '$5.00 / $15.00',
    priceColor: 'text-rose-400',
    priceDesc: null,
    speedIcon: <Zap className="h-3 w-3" />,
    speedLabel: 'Siêu tốc',
    speedColor: 'text-purple-400',
    bestFor: 'Lập trình siêu phức tạp, Phân tích dữ liệu, Đa phương thức (Vision).'
  },
  {
    id: 'claude35',
    name: 'Claude 3.5 Sonnet',
    stars: 5,
    starLabel: 'Xuất sắc (Đỉnh Code)',
    priceLabel: '$3.00 / $15.00',
    priceColor: 'text-orange-400',
    priceDesc: null,
    speedLabel: 'Rất Nhanh',
    speedColor: 'text-cyan-400',
    bestFor: 'Lập trình UI/UX (React, Web), Viết lách sáng tạo, Phân tích văn bản tự nhiên.'
  },
  {
    id: 'gemini15',
    name: 'Gemini 1.5 Pro',
    stars: 4,
    starLabel: 'Rất tốt (2M Context)',
    priceLabel: '$3.50 / $10.50',
    priceColor: 'text-orange-400',
    priceDesc: null,
    speedLabel: 'Nhanh',
    speedColor: 'text-green-400',
    bestFor: 'Tóm tắt thư viện sách, Đọc hàng nghìn file PDF cùng lúc, Video Analysis dài.'
  },
  {
    id: 'gpt4omini',
    name: 'GPT-4o-Mini',
    stars: 3,
    starLabel: 'Khá tốt',
    priceLabel: '$0.15 / $0.60',
    priceColor: 'text-green-400',
    priceDesc: 'Cực rẻ',
    speedIcon: <Zap className="h-3 w-3" />,
    speedLabel: 'Siêu tốc',
    speedColor: 'text-purple-400',
    bestFor: 'Chatbot CSKH cơ bản, Trích xuất dữ liệu tự động, Phân loại Form (JSON).'
  }
];

// Component tiện ích vẽ Ngôi sao
function StarRating({ count }: { count: number }) {
  return (
    <div className="flex text-yellow-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= count ? 'fill-current' : 'text-gray-600'}`} />
      ))}
    </div>
  );
}

export default async function AiMatrixPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 text-white pb-10 max-w-6xl mx-auto">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900/40 border border-white/5 rounded-3xl p-6 lg:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Star className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-4">
          <Link href={`/connect-hub/t/${teamId}/apps`} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Kho ứng dụng
          </Link>
          
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              AI MATRIX EVALUATION
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white leading-tight">
              Bảng Đánh Giá & So Sánh AI
            </h1>
            <p className="text-sm text-gray-300 font-medium max-w-2xl mt-2">
              Hệ thống ma trận phân loại năng lực và giá thành của các mô hình Trí tuệ nhân tạo. 
              Giúp bạn tối ưu hóa chi phí và chọn đúng "vũ khí" cho từng bài toán cụ thể.
            </p>
          </div>
        </div>
      </div>

      {/* 1. TEXT TO SPEECH (Giọng nói AI) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="p-2 bg-gradient-to-br from-sky-500/20 to-blue-500/20 rounded-xl border border-sky-500/30">
            <AudioWaveform className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Lồng Tiếng & Giọng Đọc (Text-to-Speech)</h2>
            <p className="text-xs text-gray-400 font-medium">Bảng giá ước tính trên 1 Triệu ký tự (1M Chars) đầu vào.</p>
          </div>
        </div>

        <div className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-black/20 text-gray-400 font-bold border-b border-white/5">
                  <th className="p-4 w-1/4">Nhà cung cấp</th>
                  <th className="p-4 w-1/6">Chất lượng</th>
                  <th className="p-4 w-1/6">Giá (1M Chars)</th>
                  <th className="p-4 w-1/6">Tốc độ</th>
                  <th className="p-4 w-1/4">Phù hợp nhất cho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {TTS_MODELS.map((model) => (
                  <tr key={model.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-gray-100 flex items-center gap-1.5 text-sm">
                        {model.name} {model.icon}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{model.desc}</div>
                    </td>
                    <td className="p-4">
                      <StarRating count={model.stars} />
                      <span className="text-[10px] text-yellow-400/80 font-medium mt-1 block">{model.starLabel}</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-black text-sm ${model.priceColor}`}>{model.priceLabel}</span>
                      {model.priceDesc && <span className="text-[10px] text-gray-500 block">{model.priceDesc}</span>}
                    </td>
                    <td className="p-4">
                      <span className={`font-medium flex items-center gap-1 ${model.speedColor}`}>
                        {model.speedIcon} {model.speedLabel}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 leading-relaxed">{model.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. TEXT GENERATION (LLM) */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-2 px-1">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
            <Bot className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Sinh Văn Bản & Lập Trình (LLM)</h2>
            <p className="text-xs text-gray-400 font-medium">Bảng giá tham khảo trên 1 Triệu Token (1M Input / 1M Output).</p>
          </div>
        </div>

        <div className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-black/20 text-gray-400 font-bold border-b border-white/5">
                  <th className="p-4 w-1/4">Tên Mô Hình</th>
                  <th className="p-4 w-1/6">Trí Tuệ (IQ)</th>
                  <th className="p-4 w-1/5">Giá (1M In / 1M Out)</th>
                  <th className="p-4 w-1/6">Tốc độ</th>
                  <th className="p-4 w-1/4">Phù hợp nhất cho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {LLM_MODELS.map((model) => (
                  <tr key={model.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-gray-100 text-sm">{model.name}</div>
                    </td>
                    <td className="p-4">
                      <StarRating count={model.stars} />
                      <span className="text-[10px] text-yellow-400/80 font-medium mt-1 block">{model.starLabel}</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-black text-sm ${model.priceColor}`}>{model.priceLabel}</span>
                      {model.priceDesc && <span className="text-[10px] text-gray-500 block">{model.priceDesc}</span>}
                    </td>
                    <td className="p-4">
                      <span className={`font-medium flex items-center gap-1 ${model.speedColor}`}>
                        {model.speedIcon} {model.speedLabel}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 leading-relaxed">{model.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-6">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />
        <p className="text-xs text-blue-200">
          <strong>Ghi chú:</strong> Giá tiền mang tính chất tham khảo và có thể thay đổi tùy theo chính sách của nhà cung cấp vào từng thời điểm cụ thể. Hệ thống AI2Hero luôn nỗ lực cập nhật thông tin chuẩn xác nhất.
        </p>
      </div>
    </div>
  );
}
