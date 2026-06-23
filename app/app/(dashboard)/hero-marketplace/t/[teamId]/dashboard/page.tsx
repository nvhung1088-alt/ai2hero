import { Store, Package, ShoppingCart, DollarSign, ArrowRight, Plug, Clock, User } from 'lucide-react';
import { db } from '@/lib/db/drizzle';
import { marketplaceOrders, marketplaceProducts, marketplaceShops } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function MarketplaceDashboardPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = await getTeamForUser();

  if (!team || team.id.toString() !== teamId) {
    redirect('/dashboard');
  }

  // 1. Fetch real DB data for the team
  const orders = await db
    .select()
    .from(marketplaceOrders)
    .where(eq(marketplaceOrders.teamId, team.id))
    .orderBy(desc(marketplaceOrders.createdAt));

  const products = await db
    .select()
    .from(marketplaceProducts)
    .where(eq(marketplaceProducts.teamId, team.id))
    .orderBy(desc(marketplaceProducts.createdAt));

  const shops = await db
    .select()
    .from(marketplaceShops)
    .where(eq(marketplaceShops.teamId, team.id));

  // 2. Calculate KPI stats
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const newOrdersCount = orders.filter(o => o.status === 'pending').length;
  const activeProductsCount = products.filter(p => p.status === 'active').length;
  const connectedShopsCount = shops.length;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const stats = [
    { name: 'Tổng Doanh Thu', value: formatVND(totalRevenue), icon: DollarSign, trend: '+5%', color: 'from-emerald-500/20 to-teal-500/20', iconColor: 'text-emerald-400' },
    { name: 'Đơn Hàng Mới', value: newOrdersCount.toString(), icon: ShoppingCart, trend: '+12%', color: 'from-orange-500/20 to-pink-500/20', iconColor: 'text-orange-400' },
    { name: 'Sản Phẩm Đang Bán', value: activeProductsCount.toString(), icon: Package, trend: 'Đang chạy', color: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400' },
    { name: 'Cửa Hàng Liên Kết', value: connectedShopsCount.toString(), icon: Store, trend: 'Đồng bộ', color: 'from-purple-500/20 to-fuchsia-500/20', iconColor: 'text-purple-400' },
  ];

  // 3. Slice recent entries
  const recentOrders = orders.slice(0, 5);
  const recentProducts = products.slice(0, 5);

  const hasData = products.length > 0 || orders.length > 0;

  // Render empty state if no products or orders exist
  if (!hasData) {
    return (
      <div className="space-y-8 animate-fade-in p-2 lg:p-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tổng Quan Marketplace</h1>
          <p className="text-gray-400 mt-2 text-sm font-medium">Theo dõi hiệu suất cửa hàng đa kênh của bạn hôm nay.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all">
              <div className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {stat.name}
                </span>
                <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${stat.color} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="pt-4">
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                  <span className="text-emerald-400">{stat.trend}</span>
                  <span>so với tháng trước</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-12 text-center shadow-2xl max-w-4xl mx-auto my-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-pink-500/5 to-purple-500/5 pointer-events-none" />
          <div className="h-16 w-16 bg-white/[0.02] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl">
            <Store className="h-8 w-8 text-orange-500/60" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Chưa có dữ liệu đồng bộ thực tế</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
            Hệ thống của bạn đang trống. Hãy kết nối POS như KiotViet, Pancake POS hoặc sàn Shopee, TikTok Shop để tự động đồng bộ hàng ngàn sản phẩm và quản lý đơn hàng tập trung tại đây.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/hero-marketplace/t/${teamId}/settings`}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              <Plug className="h-4 w-4" />
              <span>Kết nối POS / Sàn ngay</span>
            </Link>
            <Link
              href={`/hero-marketplace/t/${teamId}/products`}
              className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Tạo sản phẩm thủ công
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render populated dashboard
  return (
    <div className="space-y-8 animate-fade-in p-2 lg:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            Tổng Quan Cửa Hàng
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium">Báo cáo hiệu suất bán hàng và trạng thái vận hành đa kênh.</p>
        </div>
        <Link
          href={`/hero-marketplace/t/${teamId}/settings`}
          className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer select-none"
        >
          <Plug className="h-3.5 w-3.5" />
          <span>Cấu hình Đồng bộ</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {stat.name}
              </span>
              <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${stat.color} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="pt-4">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                <span className="text-emerald-400">{stat.trend}</span>
                <span>hoạt động</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Recent Orders */}
        <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-400" />
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Đơn hàng gần đây</h3>
            </div>
            <Link
              href={`/hero-marketplace/t/${teamId}/orders`}
              className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Quản lý Đơn</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs italic">
              Chưa có đơn hàng nào được ghi nhận.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="pb-3">Mã đơn</th>
                    <th className="pb-3">Khách hàng</th>
                    <th className="pb-3 text-right">Tổng tiền</th>
                    <th className="pb-3 text-center">Nguồn</th>
                    <th className="pb-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {recentOrders.map((order) => {
                    let statusColor = 'text-gray-400 bg-gray-400/10 border-gray-400/20';
                    let statusLabel = order.status;
                    if (order.status === 'pending') {
                      statusColor = 'text-orange-400 bg-orange-400/10 border-orange-400/20';
                      statusLabel = 'Chờ xử lý';
                    } else if (order.status === 'paid') {
                      statusColor = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                      statusLabel = 'Đã thanh toán';
                    } else if (order.status === 'shipping') {
                      statusColor = 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
                      statusLabel = 'Đang giao';
                    } else if (order.status === 'completed') {
                      statusColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
                      statusLabel = 'Đã chốt';
                    } else if (order.status === 'cancelled') {
                      statusColor = 'text-red-400 bg-red-400/10 border-red-400/20';
                      statusLabel = 'Đã huỷ';
                    }

                    return (
                      <tr key={order.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 font-mono font-bold text-gray-300">
                          #{order.id}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-gray-400" />
                            </div>
                            <span className="font-semibold text-white max-w-[120px] truncate" title={order.customerName || 'Khách vãng lai'}>
                              {order.customerName || 'Khách vãng lai'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-black text-white">
                          {formatVND(order.totalAmount)}
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-gray-300 border border-white/5 capitalize">
                            {order.source || 'manual'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wider ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Recent Products */}
        <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-400" />
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Sản phẩm mới cập nhật</h3>
            </div>
            <Link
              href={`/hero-marketplace/t/${teamId}/products`}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Quản lý Kho</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentProducts.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs italic">
              Chưa có sản phẩm nào trong kho.
            </div>
          ) : (
            <div className="space-y-3">
              {recentProducts.map((product) => {
                const imagesArray = Array.isArray(product.images) ? product.images : [];
                const mainImage = imagesArray[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop&q=60';
                
                let stockColor = 'text-gray-400';
                let stockBadge = 'bg-gray-800 text-gray-400 border-gray-700';
                if (product.stock <= 0) {
                  stockColor = 'text-red-400';
                  stockBadge = 'bg-red-500/10 text-red-400 border-red-500/20';
                } else if (product.stock <= (product.minStock || 5)) {
                  stockColor = 'text-yellow-400';
                  stockBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                } else {
                  stockColor = 'text-emerald-400';
                  stockBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                }

                return (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/10 rounded-xl transition-all gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate max-w-[180px]" title={product.name}>
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          SKU: {product.sku || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-white">
                        {formatVND(product.price)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 justify-end">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${stockBadge}`}>
                          Tồn: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
