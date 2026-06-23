import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';
import { Store, LayoutDashboard, Package, ShoppingCart, Truck, Wallet, Settings, ArrowLeft, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import TopHeader from '@/components/top-header';
import { isPreviewMode } from '@/lib/preview-actions';
import { PreviewBanner } from '@/app/(dashboard)/preview-banner';

export default async function HeroMarketplaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const team = await getTeamForUser();
  const { teamId } = await params;

  if (!team || team.id.toString() !== teamId) {
    redirect('/dashboard');
  }

  const activatedApps = Array.isArray(team.activatedApps) ? team.activatedApps : [];
  const isPreview = await isPreviewMode('hero-marketplace', teamId);
  if (!activatedApps.includes('hero-marketplace') && !isPreview) {
    redirect('/dashboard');
  }

  const sidebarLinks = [
    { name: 'Tổng quan', icon: LayoutDashboard, path: `/hero-marketplace/t/${teamId}/dashboard` },
    { name: 'Quản lý Sản phẩm', icon: Package, path: `/hero-marketplace/t/${teamId}/products` },
    { name: 'Quản lý Đơn hàng', icon: ShoppingCart, path: `/hero-marketplace/t/${teamId}/orders` },
    { name: 'Xử lý đơn hàng', icon: PackageOpen, path: `/hero-marketplace/t/${teamId}/fulfillment` },
    { name: 'Vận chuyển', icon: Truck, path: `/hero-marketplace/t/${teamId}/shipping` },
    { name: 'Ví & Thanh toán', icon: Wallet, path: `/hero-marketplace/t/${teamId}/wallet` },
    { name: 'Cài đặt Shop', icon: Settings, path: `/hero-marketplace/t/${teamId}/settings` }
  ];

  return (
    <>
      {isPreview && <PreviewBanner appId="hero-marketplace" />}
      <div className="flex flex-col min-h-screen bg-gray-950 text-white w-full">
        <TopHeader />
        
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 bg-gray-900/30 border-r border-white/5 p-4 flex flex-col justify-between lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Không gian hiện tại</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-orange-500/10 shrink-0">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-xs text-white truncate leading-snug">{team.name}</p>
                    <p className="text-[9px] text-gray-400 capitalize">{team.planName || 'Free'} Plan</p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/t/${team.id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-lg text-[10px] font-black text-gray-300 hover:text-white transition-all text-center cursor-pointer select-none"
                >
                  <ArrowLeft className="h-3 w-3" /> Quay về Workspace
                </Link>
              </div>

              <div className="space-y-1">
                <div className="mb-4 flex items-center space-x-2 px-3">
                  <div className="rounded bg-gradient-to-tr from-orange-500 to-amber-500 p-1.5 shadow-lg shadow-orange-500/20">
                    <Store className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold tracking-tight text-white">Marketplace</span>
                </div>
                {sidebarLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    className="flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <link.icon className="h-4 w-4 opacity-70" />
                    <span>{link.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 text-center text-[10px] text-gray-500 font-bold select-none">
              HeroMarketplace v1.0
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 w-full overflow-y-auto animate-fade-in bg-gray-950">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
