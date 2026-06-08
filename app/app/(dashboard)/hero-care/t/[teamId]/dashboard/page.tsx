import Link from 'next/link';
import { 
  MessageSquare, 
  Settings, 
  Database, 
  BookOpen, 
  Users, 
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { db } from '@/lib/db/drizzle';
import { 
  heroCareMessages, 
  heroCareInboxes, 
  heroCareCustomers
} from '@/lib/db/schema';
import { and, eq, gte, isNotNull, desc, count } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function HeroCareDashboardPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  // === DATA AGGREGATION ===
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    // 1. Tin nhắn nhận hôm nay
    const [inboundRes] = await db
      .select({ count: count() })
      .from(heroCareMessages)
      .where(
        and(
          eq(heroCareMessages.teamId, teamId),
          eq(heroCareMessages.direction, 'inbound'),
          gte(heroCareMessages.createdAt, startOfDay)
        )
      );
    const inboundCount = inboundRes?.count || 0;

    // 2. AI Quota (tổng hợp từ tất cả active inboxes)
    const inboxes = await db
      .select({
        dailyAiCallCount: heroCareInboxes.dailyAiCallCount,
        dailyAiCallLimit: heroCareInboxes.dailyAiCallLimit
      })
      .from(heroCareInboxes)
      .where(and(eq(heroCareInboxes.teamId, teamId), eq(heroCareInboxes.status, 'active')));

    const totalAiCalls = inboxes.reduce((sum, ib) => sum + (ib.dailyAiCallCount || 0), 0);
    const totalAiLimit = inboxes.reduce((sum, ib) => sum + (ib.dailyAiCallLimit || 20), 0);

    // 3. AI Accuracy & Handoff count hôm nay
    const aiMessages = await db
      .select({
        aiStatus: heroCareMessages.aiStatus,
        count: count()
      })
      .from(heroCareMessages)
      .where(
        and(
          eq(heroCareMessages.teamId, teamId),
          gte(heroCareMessages.createdAt, startOfDay),
          isNotNull(heroCareMessages.aiStatus)
        )
      )
      .groupBy(heroCareMessages.aiStatus);

    let successCount = 0;
    let totalAiMessages = 0;
    let handoffCount = 0;

    aiMessages.forEach(m => {
      const status = m.aiStatus;
      const cnt = m.count || 0;
      if (status === 'success') {
        successCount += cnt;
        totalAiMessages += cnt;
      } else if (status === 'failed' || status === 'fallback') {
        totalAiMessages += cnt;
      } else if (status === 'handoff') {
        handoffCount += cnt;
      }
    });

    const aiAccuracy = totalAiMessages > 0 ? Math.round((successCount / totalAiMessages) * 100) : 0;

    // 4. Khách hàng mới nhất
    const recentCustomers = await db
      .select()
      .from(heroCareCustomers)
      .where(eq(heroCareCustomers.teamId, teamId))
      .orderBy(desc(heroCareCustomers.lastSeenAt))
      .limit(5);

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-r from-blue-900/20 via-cyan-900/10 to-transparent p-8 animate-fade-up">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              HỘP THƯ HỖ TRỢ ĐA KÊNH
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-3 text-white">
              Chào mừng bạn đến với Hero Care
            </h2>
            <p className="mt-2 text-gray-400 text-sm leading-relaxed">
              Hệ thống chăm sóc khách hàng tự động và hybrid. AI sẽ học từ các tài liệu snapshot của cửa hàng bạn và tự động soạn thảo hoặc trực tiếp trả lời tin nhắn của khách hàng.
            </p>
          </div>
        </div>

        {/* Navigation Shortcuts - 5 Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            href={`/hero-care/t/${teamId}/chat`}
            className="group relative rounded-xl border border-white/5 bg-gray-900/40 p-5 hover:bg-gray-900/60 hover:border-blue-500/30 transition-all cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-all">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white mt-4 group-hover:text-blue-400 transition-colors text-xs">Hộp thư Chat</h3>
            <p className="text-[10px] text-gray-400 mt-1">Chat trực tiếp, quản lý 3 chế độ trả lời của AI.</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href={`/hero-care/t/${teamId}/scripts`}
            className="group relative rounded-xl border border-white/5 bg-gray-900/40 p-5 hover:bg-gray-900/60 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-105 transition-all">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white mt-4 group-hover:text-cyan-400 transition-colors text-xs">Kịch bản FAQ</h3>
            <p className="text-[10px] text-gray-400 mt-1">Cài đặt từ khóa và câu hỏi mẫu cho robot khớp đáp án.</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href={`/hero-care/t/${teamId}/snapshots`}
            className="group relative rounded-xl border border-white/5 bg-gray-900/40 p-5 hover:bg-gray-900/60 hover:border-purple-500/30 transition-all cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-all">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white mt-4 group-hover:text-purple-400 transition-colors text-xs">Đồng bộ Snapshots</h3>
            <p className="text-[10px] text-gray-400 mt-1">Lưu trữ cache dữ liệu sản phẩm, giá cả và tồn kho.</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href={`/hero-care/t/${teamId}/customers`}
            className="group relative rounded-xl border border-white/5 bg-gray-900/40 p-5 hover:bg-gray-900/60 hover:border-emerald-500/30 transition-all cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-all">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white mt-4 group-hover:text-emerald-400 transition-colors text-xs">Khách hàng</h3>
            <p className="text-[10px] text-gray-400 mt-1">Quản lý thẻ phân loại, ghi chú và lịch sử mua sắm.</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href={`/hero-care/t/${teamId}/settings`}
            className="group relative rounded-xl border border-white/5 bg-gray-900/40 p-5 hover:bg-gray-900/60 hover:border-orange-500/30 transition-all cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 group-hover:scale-105 transition-all">
              <Settings className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white mt-4 group-hover:text-orange-400 transition-colors text-xs">Cấu hình Inbox</h3>
            <p className="text-[10px] text-gray-400 mt-1">Kết nối chatbot, đổi prompt system, cài đặt giới hạn.</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-gray-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Metrics Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">
            Hiệu suất hôm nay
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
            <div className="rounded-xl border border-white/5 bg-gray-900/20 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Tin nhắn nhận</p>
                <h4 className="text-2xl font-black text-white mt-1">{inboundCount}</h4>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-800 text-gray-300 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-gray-900/20 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">AI Gọi API</p>
                <h4 className="text-2xl font-black text-white mt-1">
                  {totalAiCalls} <span className="text-xs text-gray-500">/ {totalAiLimit}</span>
                </h4>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-800 text-gray-300 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-cyan-400" />
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-gray-900/20 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">AI Trả lời chính xác</p>
                <h4 className="text-2xl font-black text-white mt-1">{aiAccuracy}%</h4>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-800 text-gray-300 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-gray-900/20 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Handoff chuyển tiếp</p>
                <h4 className="text-2xl font-black text-white mt-1">{handoffCount}</h4>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-800 text-gray-300 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-white/5 bg-gray-900/40 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Cách hoạt động của Hero Care</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="text-white">Cấu hình Inbox:</strong> Tạo hộp thư và liên kết với kết nối Facebook/Zalo/Telegram của bạn trong mục <Link href={`/hero-care/t/${teamId}/settings`} className="text-blue-400 underline font-semibold">Cấu hình Inbox</Link>.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-white">Soạn thảo Kịch bản FAQ:</strong> Viết sẵn các câu hỏi thường gặp để robot đối khớp tức thì bằng từ khóa hoặc intent mà không cần tốn token gọi AI.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="text-white">Đồng bộ dữ liệu:</strong> Kéo thông tin tồn kho hoặc bảng giá sản phẩm từ KiotViet/Pancake POS làm Snapshot. AI sẽ dựa vào đây để trả lời chuẩn xác.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</span>
                <div>
                  <strong className="text-white">Quản lý Khách hàng:</strong> Ghi chép tags phân loại (vip, wholesale) và note chi tiết trong trang <Link href={`/hero-care/t/${teamId}/customers`} className="text-emerald-400 underline font-semibold">Khách hàng</Link> giúp AI cá nhân hóa câu trả lời.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">5</span>
                <div>
                  <strong className="text-white">Vận hành Hybrid:</strong> Trong mục <Link href={`/hero-care/t/${teamId}/chat`} className="text-blue-400 underline font-semibold">Hộp thư Chat</Link>, AI sẽ tự động soạn tin nhắn nháp (Draft). Bạn có thể bấm duyệt để gửi hoặc sửa đổi câu trả lời.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-gray-900/40 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Khách hàng liên hệ gần đây
            </h3>
            
            <div className="space-y-3">
              {recentCustomers.map(c => (
                <Link
                  key={c.id}
                  href={`/hero-care/t/${teamId}/customers`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center text-white overflow-hidden shrink-0">
                      {c.avatar ? (
                        <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-bold text-[10px] uppercase text-emerald-400">
                          {((c.name || c.externalCustomerId) || 'KH').substring(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{c.name || 'Khách ẩn danh'}</p>
                      <p className="text-[9px] text-gray-500 capitalize">{c.channel}</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-400 font-medium">
                    {c.lastSeenAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 text-gray-500" />
                        {new Date(c.lastSeenAt).toLocaleDateString('vi-VN')}
                      </span>
                    ) : (
                      '-'
                    )}
                  </div>
                </Link>
              ))}

              {recentCustomers.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Chưa có khách hàng liên hệ gần đây.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Error loading dashboard data:', error);
    return (
      <div className="p-6 text-center text-red-400 bg-red-900/10 border border-red-500/20 rounded-2xl max-w-xl mx-auto mt-12">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
        <p className="font-bold">Đã xảy ra lỗi khi tải dữ liệu Dashboard</p>
        <p className="text-xs text-gray-400 mt-1">{error.message || 'Lỗi kết nối cơ sở dữ liệu'}</p>
      </div>
    );
  }
}
