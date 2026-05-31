import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Eye, AlertCircle, ArrowLeft, Terminal, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Chính sách bảo mật | HeroSim — AI2Hero Vault',
  description: 'Chính sách bảo mật thông tin và cam kết Zero-Knowledge bảo vệ an toàn tuyệt đối mật khẩu của HeroSim Chrome Extension.',
};

export default function PrivacyPage() {
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
            <Shield className="h-3.5 w-3.5" />
            <span>PRIVACY POLICY & AGREEMENT</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
            Chính sách{' '}
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Bảo mật Thông tin
            </span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            Cam kết an toàn tuyệt đối và minh bạch 100% về cơ chế mã hóa Zero-Knowledge đối với dữ liệu cá nhân của bạn.
          </p>
        </div>

        {/* Compliant Banner Alert */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-emerald-500/2">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-white">Cam kết tuân thủ chính sách Cửa hàng Chrome trực tuyến</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Tiện ích mở rộng **HeroSim — AI2Hero Vault** tuân thủ tuyệt đối Chính sách Dữ liệu Người dùng của Google bao gồm các điều khoản về **Mục đích Duy nhất (Single Purpose)** và **Hạn chế Sử dụng (Limited Use)**. Chúng tôi cam kết không bán, không chuyển giao và không sử dụng dữ liệu của bạn ngoài mục đích tự động điền mật khẩu cá nhân.
            </p>
          </div>
        </div>

        {/* Tab-like Segmented Bilingual Selector Hint */}
        <div className="text-right">
          <span className="text-[10px] text-gray-500 italic select-none font-mono">Bản dịch song ngữ / Bilingual Vietnamese & English Policy</span>
        </div>

        {/* Policy Body Container */}
        <div className="bg-gray-900/40 border border-white/10 rounded-3xl p-6 lg:p-10 backdrop-blur-md space-y-10 shadow-2xl">
          
          {/* SECTION 1 */}
          <div className="space-y-4 text-left">
            <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="h-5 w-5 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center text-xs font-mono">1</span>
              Mục đích duy nhất (Single Purpose)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-gray-400">
              <div className="space-y-2">
                <p className="font-bold text-gray-200">🇻🇳 Tiếng Việt:</p>
                <p>
                  Tiện ích mở rộng **HeroSim — AI2Hero Vault** được thiết kế với một mục đích duy nhất là giúp người dùng quản lý, lưu trữ bảo mật và tự động điền (autofill) thông tin đăng nhập cùng mã OTP được cấp phát từ hệ thống quản lý SIM của tổ chức. Tiện ích giúp loại bỏ thao tác gõ tay thủ công, tránh rò rỉ Keylogger và tối ưu hóa hiệu suất làm việc của doanh nghiệp.
                </p>
              </div>
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <p className="font-bold text-gray-200">🇺🇸 English:</p>
                <p>
                  The **HeroSim — AI2Hero Vault** Chrome Extension is designed with a single purpose: to assist users in securely storing, managing, and autofilling credentials and OTP codes synced from their organization's SIM management dashboard. It eliminates manual typing, mitigates keylogger vulnerabilities, and enhances business productivity.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="space-y-4 text-left">
            <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="h-5 w-5 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center text-xs font-mono">2</span>
              Kiến trúc Không tri thức (Zero-Knowledge Compliance)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-gray-400">
              <div className="space-y-2">
                <p className="font-bold text-gray-200">🇻🇳 Tiếng Việt:</p>
                <p>
                  Chúng tôi áp dụng kiến trúc an toàn **Zero-Knowledge** nghiêm ngặt:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Mật khẩu của bạn được mã hóa ở server-side bằng thuật toán mã hóa đối xứng **AES-256-CBC** mạnh mẽ thông qua bộ khóa bảo mật tĩnh độc quyền, bảo vệ vĩnh viễn dữ liệu trong database.</li>
                  <li>Khi đồng bộ về Extension, dữ liệu mật khẩu được giải mã qua đường truyền bảo mật HTTPS có gắn Bearer Token JWT và ngay lập tức **mã hóa lại cục bộ** bằng khóa Master PIN cá nhân của người dùng qua thuật toán **AES-GCM** (Web Crypto API).</li>
                  <li>Khóa giải mã chỉ được lưu trữ trên **RAM của trình duyệt (Chrome Session Store)**, bay hơi ngay lập tức khi bạn đóng trình duyệt hoặc tắt máy tính. Ngay cả ban quản trị hệ thống cũng không thể đọc trộm hay giải mã mật khẩu của bạn.</li>
                </ul>
              </div>
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <p className="font-bold text-gray-200">🇺🇸 English:</p>
                <p>
                  We implement a strict **Zero-Knowledge** security model:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Your credentials are encrypted on the server-side using military-grade **AES-256-CBC** cryptography before being saved to our Supabase database, securing database records forever.</li>
                  <li>During synchronization, data is transmitted over secure HTTPS with Bearer Token JWT and immediately **re-encrypted locally** in Chrome using your personal Master PIN via **AES-GCM** (Web Crypto API).</li>
                  <li>The decryption key is temporarily held in **Chrome Session RAM** and evaporates instantly upon closing the browser or locking the vault. Even our super administrators cannot read or decrypt your passwords.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 3 */}
          <div className="space-y-4 text-left">
            <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="h-5 w-5 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center text-xs font-mono">3</span>
              Quyền hạn sử dụng (Permissions Used)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-gray-400">
              <div className="space-y-4">
                <p className="font-bold text-gray-200">🇻🇳 Tiếng Việt:</p>
                <p>
                  Chúng tôi chỉ yêu cầu các quyền tối thiểu phục vụ cho tính năng cốt lõi:
                </p>
                <div className="space-y-2 font-mono text-[11px] bg-black/20 p-3 rounded-xl border border-white/5">
                  <p>• <strong className="text-orange-400">storage</strong>: Lưu trữ cục bộ các thông tin đã mã hóa AES-GCM (Accounts cache) và salt PBKDF2.</p>
                  <p>• <strong className="text-orange-400">alarms</strong>: Kích hoạt bộ quét định kỳ (mỗi 5 phút) để đồng bộ ngầm cơ sở dữ liệu tài khoản từ máy chủ.</p>
                  <p>• <strong className="text-orange-400">host_permissions</strong> (`https://*.ai2hero.com/api/*`): Quyền kết nối duy nhất đến máy chủ chính chủ AI2Hero để đồng bộ thông tin tài khoản.</p>
                </div>
              </div>
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <p className="font-bold text-gray-200">🇺🇸 English:</p>
                <p>
                  We only request the absolute minimum permissions required for core functions:
                </p>
                <div className="space-y-2 font-mono text-[11px] bg-black/20 p-3 rounded-xl border border-white/5">
                  <p>• <strong className="text-orange-400">storage</strong>: To store locally AES-GCM encrypted accounts cache and PBKDF2 salt.</p>
                  <p>• <strong className="text-orange-400">alarms</strong>: To trigger background sync tasks (every 5 minutes) to download authoritative vault updates.</p>
                  <p>• <strong className="text-orange-400">host_permissions</strong> (`https://*.ai2hero.com/api/*`): The sole domain permitted to connect for syncing credentials.</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4 */}
          <div className="space-y-4 text-left">
            <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="h-5 w-5 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center text-xs font-mono">4</span>
              Chính sách Không Thu Thập Dữ Liệu (No Data Collection)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-gray-400">
              <div className="space-y-2">
                <p className="font-bold text-gray-200">🇻🇳 Tiếng Việt:</p>
                <p>
                  Chúng tôi cam kết **KHÔNG**:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Không theo dõi lịch sử duyệt web hay hành vi trực tuyến của người dùng.</li>
                  <li>Không thu thập dữ liệu phi cấu trúc hay đọc các trường thông tin nhạy cảm khác ngoài form đăng nhập khớp domain.</li>
                  <li>Không chèn quảng cáo, không bán thông tin cho các bên trung gian, và không thu thập bất kỳ siêu dữ liệu định danh nào.</li>
                </ul>
              </div>
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <p className="font-bold text-gray-200">🇺🇸 English:</p>
                <p>
                  We strictly guarantee that we **DO NOT**:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Do not monitor your browsing history or online behavior.</li>
                  <li>Do not extract unstructured data or scan any non-credential form fields.</li>
                  <li>Do not serve ads, do not sell user profiles to data brokers, and do not harvest device metadata.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION 5 */}
          <div className="space-y-4 text-left">
            <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="h-5 w-5 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center text-xs font-mono">5</span>
              Quy tắc Hạn chế Sử dụng (Limited Use Disclosure)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-gray-400">
              <div className="space-y-2">
                <p className="font-bold text-gray-200">🇻🇳 Tiếng Việt:</p>
                <p>
                  Việc sử dụng thông tin nhận được từ API của Cửa hàng Chrome trực tuyến của HeroSim sẽ tuân thủ Chính sách quyền riêng tư của Cửa hàng Chrome trực tuyến, bao gồm cả các yêu cầu về **Hạn chế sử dụng**. Dữ liệu sẽ chỉ được sử dụng để cung cấp và cải thiện chức năng của tiện ích, hoàn toàn không phục vụ cho mục đích quảng cáo hoặc mục đích thương mại khác.
                </p>
              </div>
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <p className="font-bold text-gray-200">🇺🇸 English:</p>
                <p>
                  HeroSim's use of information received from Chrome Web Store APIs will adhere to the Chrome Web Store User Data Policy, including the **Limited Use** requirements. The data is processed solely to provide and improve extension features, and is never utilized for advertising or speculative profiling.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Support */}
        <div className="text-center p-6 bg-white/[0.01] border border-white/5 rounded-2xl text-xs text-gray-500 space-y-2 select-none">
          <p>© 2026 AI2Hero Platform. Bảo lưu mọi quyền.</p>
          <p>Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật, vui lòng liên hệ admin tại email: <strong className="text-gray-400">support@ai2hero.com</strong></p>
        </div>

      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="w-full py-6 border-t border-white/5 bg-gray-950 text-center text-[10px] text-gray-600 select-none">
        HeroSim Extension Privacy Policy v4.0.1 · Last updated: May 31, 2026
      </footer>

    </div>
  );
}
