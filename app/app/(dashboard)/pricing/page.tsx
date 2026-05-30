import { Check, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSystemSetting } from '@/lib/db/queries';

export default async function PricingPage() {
  const plans = (await getSystemSetting('BILLING_PLANS')) as any[] || [];

  const pricingPlans = plans.map((plan) => {
    let color = 'border-white/5 bg-gray-900/40 hover:border-white/10 relative backdrop-blur-xl';
    let popular = false;
    let href = '/sign-up';

    if (plan.id === 'free') {
      color = 'border-white/5 bg-gray-900/40 hover:border-white/10 relative backdrop-blur-xl hover:border-orange-500/20';
      href = '/sign-up';
    } else if (plan.id === 'pro') {
      color = 'border-orange-500/30 bg-gray-900/60 shadow-xl shadow-orange-500/5 relative backdrop-blur-xl hover:border-orange-500/50';
      popular = true;
      href = '/sign-up';
    } else if (plan.id === 'enterprise') {
      color = 'border-white/5 bg-gray-900/40 hover:border-white/10 relative backdrop-blur-xl hover:border-pink-500/20';
      href = 'mailto:support@ai2hero.com';
    }

    return {
      ...plan,
      color,
      popular,
      href,
    };
  });

  const faqs = [
    {
      q: 'AI2Hero có thực sự miễn phí không?',
      a: 'Đúng vậy! Chúng tôi cung cấp các gói miễn phí trọn đời cho các công cụ MVP được cấu hình để hỗ trợ startup và doanh nghiệp nhỏ kiểm chứng ý tưởng mà không lo tốn phí.',
    },
    {
      q: 'Tôi có thể chuyển đổi giữa các gói bất kỳ lúc nào không?',
      a: 'Hoàn toàn được. Bạn có thể tự nâng cấp lên gói Pro trong trang quản trị cá nhân để mở khóa giới hạn khi lượng công việc của bạn tăng lên.',
    },
    {
      q: 'Dữ liệu doanh nghiệp của tôi có được bảo mật không?',
      a: 'An sau thông tin là ưu tiên hàng đầu của AI2Hero. Toàn bộ cuộc hội thoại AI, dữ liệu SIM hay thông tin POS của bạn đều được mã hóa SSL/TLS khi truyền tải và lưu trữ an toàn trên máy chủ của chúng tôi.',
    },
    {
      q: 'Làm thế nào để yêu cầu tính năng riêng cho doanh nghiệp?',
      a: 'Hãy liên hệ gói Enterprise thông qua email support@ai2hero.com. Đội ngũ kỹ sư của chúng tôi sẽ tư vấn và thiết lập giải pháp tùy biến riêng theo nghiệp vụ của bạn.',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-950 py-16 lg:py-24 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-sm font-medium mb-4 border border-orange-500/20">
            <Sparkles className="h-4 w-4" />
            Minh bạch · Tối ưu · Không chi phí ẩn
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            Chọn gói dịch vụ{' '}
            <span className="text-gradient">phù hợp</span>
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Bắt đầu hoàn toàn miễn phí trọn đời. Nâng cấp lên gói Pro để tối đa hóa hiệu suất làm việc với AI.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch mb-24">
          {pricingPlans.map((plan, i) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-1 ${plan.color} animate-fade-up`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-hero-gradient text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Phổ biến nhất ✨
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <p className="mt-2 text-sm text-gray-400 min-h-[40px]">{plan.description}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                  {plan.period && (
                    <span className="ml-1 text-sm text-gray-450">/{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {(plan.features || []).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <Check className={`h-5 w-5 mr-2 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-orange-500' : 'text-emerald-450'}`} />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <a href={plan.href} className="w-full">
                <Button
                  className={`w-full rounded-full text-base font-semibold py-6 transition-all duration-300 cursor-pointer ${
                    plan.popular
                      ? 'bg-hero-gradient hover:opacity-90 text-white shadow-md shadow-orange-500/10'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-white/10'
                  }`}
                >
                  {plan.cta || 'Bắt đầu ngay'}
                </Button>
              </a>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="text-3xl font-bold text-white">Câu hỏi thường gặp</h2>
            <p className="mt-2 text-gray-400">Mọi thắc mắc của bạn đều có câu trả lời</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-gray-900/40 rounded-2xl p-6 border border-white/5 shadow-sm animate-fade-up backdrop-blur-sm"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <h4 className="flex items-start gap-2.5 font-semibold text-white text-base">
                  <HelpCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  {faq.q}
                </h4>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed ml-7.5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
