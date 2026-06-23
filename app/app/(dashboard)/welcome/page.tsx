import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Users,
  Boxes,
  Clock,
  BadgeCheck,
  MessageSquare,
  Brain,
  Plug,
  Smartphone,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Terminal } from './terminal';
import { APPS } from '@/lib/apps-registry';

// Resolve tên icon string → component (dùng cho Apps Showcase từ registry)
const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare, Brain, Plug, Smartphone, ShoppingCart, FileText,
};
function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MessageSquare;
}

export default function HomePage() {
  return (
    <main>
      {/* === HERO SECTION === */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-100/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 text-sm font-medium mb-6 border border-orange-100">
                <Sparkles className="h-4 w-4" />
                Miễn phí — {APPS.length} công cụ AI sẵn sàng
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl leading-[1.1]">
                AI biến bạn
                <span className="block text-gradient mt-1">
                  thành Hero
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mt-5 text-base text-gray-500 sm:mt-6 sm:text-lg lg:text-base xl:text-lg max-w-lg">
                Nền tảng công cụ AI miễn phí cho doanh nghiệp.
                Đăng ký 1 tài khoản — truy cập tất cả ứng dụng.
                Từ AI Chat, Quản lý Kho đến POS và Marketing.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0 flex gap-3 flex-wrap">
                <a href="/sign-up">
                  <Button
                    size="lg"
                    className="text-lg rounded-full bg-hero-gradient hover:opacity-90 text-white shadow-lg shadow-orange-500/25 animate-pulse-glow px-8"
                  >
                    Bắt đầu miễn phí
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg rounded-full px-8"
                  >
                    Xem bảng giá
                  </Button>
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-400 sm:justify-center lg:justify-start">
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-green-500" />
                  Không cần thẻ
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Đăng ký 30 giây
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-purple-500" />
                  Bảo mật SSL
                </span>
              </div>
            </div>

            {/* Terminal */}
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <div className="animate-float">
                <Terminal />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === STATS SECTION === */}
      <section className="py-12 border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '1,200+', label: 'Người dùng', icon: Users },
              { value: String(APPS.length), label: 'Ứng dụng MVP', icon: Boxes },
              { value: '99.9%', label: 'Uptime', icon: Zap },
              { value: '0đ', label: 'Để bắt đầu', icon: Sparkles },
            ].map((stat, i) => (
              <div
                key={i}
                className="text-center animate-fade-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === APPS SHOWCASE === */}
      <section className="py-20 bg-gray-50/50 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Bộ công cụ{' '}
              <span className="text-gradient">AI miễn phí</span>
            </h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              Mỗi công cụ là một ứng dụng hoàn chỉnh. Đăng ký 1 lần, dùng tất cả.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {APPS.map((app, i) => {
              const Icon = resolveIcon(app.icon);
              return (
                <div
                  key={app.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${app.color} transition-all duration-300 group-hover:h-1.5`}
                  />
                  <div
                    className={`flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${app.color} text-white shadow-md mb-4 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {app.name}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {app.description}
                  </p>
                  <span className="inline-block mt-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {app.tier === 'free' ? '✨ Miễn phí' : '⭐ Pro'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* === FEATURES SECTION === */}
      <section className="py-20 bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Tại sao chọn AI2Hero?
            </h2>
          </div>
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {[
              {
                icon: Sparkles,
                color: 'from-orange-500 to-pink-500',
                title: 'AI-Powered',
                desc: 'Mọi công cụ đều được tích hợp AI thông minh — từ chatbot chăm sóc khách hàng đến phân tích dữ liệu tự động.',
              },
              {
                icon: Zap,
                color: 'from-green-500 to-emerald-400',
                title: 'Siêu tốc độ',
                desc: 'Đăng ký trong 30 giây, dùng ngay không cần cấu hình. Mọi thứ đã sẵn sàng cho bạn.',
              },
              {
                icon: Shield,
                color: 'from-blue-500 to-cyan-400',
                title: 'Bảo mật tuyệt đối',
                desc: 'Dữ liệu được bảo vệ bằng mã hóa end-to-end. Phân quyền RBAC cho từng thành viên trong team.',
              },
            ].map((feature, i) => (
              <div key={i} className={`${i > 0 ? 'mt-10 lg:mt-0' : ''} animate-fade-up`} style={{ animationDelay: `${i * 0.15}s` }}>
                <div
                  className={`flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-md`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="mt-5">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-base text-gray-500">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA SECTION === */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-hero-gradient p-10 lg:p-16 text-center text-white">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl font-bold sm:text-4xl">
                Sẵn sàng trở thành Hero?
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
                Đăng ký miễn phí ngay hôm nay và khám phá sức mạnh của AI cho doanh nghiệp bạn.
              </p>
              <div className="mt-8">
                <a href="/sign-up">
                  <Button
                    size="lg"
                    className="text-lg rounded-full bg-white text-gray-900 hover:bg-gray-100 shadow-lg px-8"
                  >
                    Bắt đầu miễn phí
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-gray-900">AI2Hero</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2026 AI2Hero. Made with ❤️ in Vietnam.
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="/pricing" className="hover:text-gray-900 transition-colors">Bảng giá</a>
              <a href="/sign-in" className="hover:text-gray-900 transition-colors">Đăng nhập</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
