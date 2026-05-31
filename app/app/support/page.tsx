import React from 'react';
import Link from 'next/link';
import { Mail, MessageCircle, HelpCircle, ArrowLeft, Sparkles, BookOpen, Clock, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Hỗ trợ khách hàng | HeroSim — AI2Hero Vault',
  description: 'Trung tâm hỗ trợ và giải đáp thắc mắc liên quan đến tính năng, kỹ thuật và bảo mật của AI2Hero.',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col justify-between selection:bg-orange-500/30 selection:text-white">
      
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="w-full h-16 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-white text-base tracking-tight">AI2Hero</span>
            <span className="text-[9px] text-gray-500 tracking-widest uppercase font-medium">Platform</span>
          </div>
        </Link>
        
        <Link 
          href="/sign-in" 
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer select-none"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại Đăng nhập
        </Link>
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 lg:py-16 space-y-12">
        
        {/* Intro Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-orange-400 font-medium font-mono">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>CUSTOMER SUPPORT CENTER</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
            Trung tâm{' '}
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Hỗ trợ
            </span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            Chúng tôi luôn sẵn sàng hỗ trợ bạn. Mọi vấn đề về cài đặt, lỗi kỹ thuật, hay các thắc mắc về tài khoản đều sẽ được giải quyết nhanh chóng.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Support */}
          <div className="bg-gray-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md hover:border-orange-500/50 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Mail className="w-24 h-24 text-orange-500" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Hỗ trợ qua Email</h3>
                <p className="text-sm text-gray-400 mb-6">Đội ngũ kỹ thuật của AI2Hero sẽ phản hồi yêu cầu của bạn trong vòng 24-48 giờ làm việc.</p>
                <a href="mailto:support@ai2hero.com" className="inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300">
                  support@ai2hero.com <ArrowLeft className="h-4 w-4 rotate-135" />
                </a>
              </div>
            </div>
          </div>

          {/* Live Chat Support */}
          <div className="bg-gray-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md hover:border-pink-500/50 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <MessageCircle className="w-24 h-24 text-pink-500" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Cộng đồng Zalo / Live Chat</h3>
                <p className="text-sm text-gray-400 mb-6">Tham gia cộng đồng Zalo chính thức của AI2Hero để được hỗ trợ trực tiếp và chia sẻ kinh nghiệm.</p>
                <button className="inline-flex items-center gap-2 text-sm font-bold text-pink-400 hover:text-pink-300 cursor-not-allowed opacity-80">
                  Zalo AI2Hero Support (Comming Soon)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Preview Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <BookOpen className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-bold text-white">Câu hỏi thường gặp về HeroSim</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-gray-200">1. Làm sao để cài đặt HeroSim Extension?</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Sau khi đăng ký tài khoản AI2Hero thành công, bạn truy cập vào cửa hàng Chrome (Chrome Web Store) và tìm kiếm "HeroSim AI2Hero Vault", sau đó nhấn "Thêm vào Chrome". Đăng nhập vào website ai2hero.com một lần để đồng bộ extension.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-gray-200">2. Tôi quên mã PIN bảo mật (Master PIN) thì phải làm sao?</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Mã Master PIN là chìa khóa duy nhất để giải mã dữ liệu của bạn ở cấp độ thiết bị. Nếu bạn quên mã PIN, bạn cần truy cập vào AI2Hero Dashboard để đặt lại (Reset). Tuy nhiên, vì lý do bảo mật Zero-Knowledge, điều này có thể làm mất dữ liệu mật khẩu cục bộ chưa được đồng bộ lên máy chủ.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-gray-200">3. HeroSim báo lỗi không kết nối được máy chủ?</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Vui lòng kiểm tra lại kết nối mạng của bạn. Nếu vẫn không được, hãy mở Extension, chọn Settings và nhấn "Sync Now". Đảm bảo rằng bạn đã đăng nhập hợp lệ trên ai2hero.com.
              </p>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-black/20 border border-white/5 rounded-2xl text-xs text-gray-400 space-y-4 md:space-y-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>Giờ làm việc: Thứ 2 - Thứ 6 (08:00 AM - 17:30 PM)</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500/50" />
            <span>Hỗ trợ sự cố khẩn cấp (24/7) đối với tài khoản Doanh nghiệp.</span>
          </div>
        </div>

      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="w-full py-6 border-t border-white/5 bg-gray-950 text-center text-[10px] text-gray-600 select-none">
        HeroSim Support Center v4.0.1 · Last updated: May 31, 2026
      </footer>

    </div>
  );
}
