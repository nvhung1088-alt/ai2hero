'use client';

import React, { useState, useTransition } from 'react';
import { 
  Search, Filter, Calendar, DollarSign, ShoppingBag, TrendingUp, 
  RefreshCw, Truck, Printer, Eye, CheckCircle, XCircle, AlertCircle, 
  Clock, ArrowLeft, Copy, ChevronRight, Ban, HelpCircle 
} from 'lucide-react';
import { updateOrderStatusAction, bulkUpdateOrdersAction, getAdminOrdersAction } from '@/lib/db/marketplace-actions';

interface OrdersClientProps {
  currentUser: any;
  team: any;
  initialOrders: any[];
}

export function OrdersClient({ currentUser, team, initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'returns' | 'shipping'>('orders');
  
  // Filtering states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Selection states
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  
  // Detail Sheet state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<'order' | 'customer' | 'shipping' | 'timeline'>('order');
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  
  // Search tracking state (for shipping tab)
  const [trackingSearch, setTrackingSearch] = useState<string>('');
  const [trackingResult, setTrackingResult] = useState<any | null>(null);

  const [isPending, startTransition] = useTransition();

  // Helper formats
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return 'N/A';
    return new Date(dateInput).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Refetch orders data
  const refetchOrders = async () => {
    startTransition(async () => {
      const res = await getAdminOrdersAction();
      if (res.success && res.data) {
        setOrders(res.data);
        // Update currently selected order if sheet is open
        if (selectedOrder) {
          const updated = res.data.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    });
  };

  // Bulk actions handlers
  const handleBulkAction = async (action: 'confirm' | 'print' | 'ship' | 'delivered' | 'cancelled') => {
    if (selectedOrderIds.length === 0) return;
    
    if (confirm(`Bạn có chắc chắn muốn thực hiện thao tác này cho ${selectedOrderIds.length} đơn hàng đã chọn?`)) {
      startTransition(async () => {
        const res = await bulkUpdateOrdersAction(selectedOrderIds, action);
        if (res.success) {
          (window as any).showToast?.({
            title: 'Thành công',
            description: `Đã xử lý hàng loạt ${res.count} đơn hàng.`,
            type: 'success'
          });
          setSelectedOrderIds([]);
          refetchOrders();
        } else {
          (window as any).showToast?.({
            title: 'Thất bại',
            description: res.error || 'Có lỗi xảy ra.',
            type: 'error'
          });
        }
      });
    }
  };

  // Individual status update
  const handleStatusUpdate = async (orderId: number, newStatus: string, detail?: string) => {
    setStatusUpdating(true);
    const res = await updateOrderStatusAction(orderId, newStatus, detail);
    setStatusUpdating(false);
    if (res.success) {
      (window as any).showToast?.({
        title: 'Cập nhật thành công',
        description: `Đơn hàng đã được chuyển sang trạng thái ${newStatus}`,
        type: 'success'
      });
      refetchOrders();
    } else {
      (window as any).showToast?.({
        title: 'Thất bại',
        description: res.error || 'Không thể cập nhật trạng thái.',
        type: 'error'
      });
    }
  };

  // Parsing items inside orders safely
  const parseItems = (itemsJson: any): any[] => {
    if (!itemsJson) return [];
    if (typeof itemsJson === 'string') {
      try {
        return JSON.parse(itemsJson);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(itemsJson) ? itemsJson : [];
  };

  // Filtering logic
  const filteredOrders = orders.filter((order) => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      order.id.toString().includes(searchTerm) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(searchTerm)) ||
      (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    // Source filter
    const matchesSource = sourceFilter === 'all' || order.source === sourceFilter;

    // Carrier filter
    const matchesCarrier = carrierFilter === 'all' || order.carrier === carrierFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesCarrier;
  });

  // Calculate Overview KPIs
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalProfit = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
    .reduce((sum, o) => sum + (o.profit || 0), 0);

  const totalCompleted = orders.filter((o) => o.status === 'completed' || o.status === 'delivered').length;
  
  const totalReturned = orders.filter((o) => o.status === 'returned').length;
  const returnRate = orders.length > 0 ? Math.round((totalReturned / orders.length) * 100) : 0;

  // Track code print mockup
  const handlePrint = (order: any) => {
    handleStatusUpdate(order.id, order.status, 'In phiếu đóng gói đơn hàng');
    (window as any).showToast?.({
      title: 'Đang chuẩn bị in',
      description: `Đang kết xuất phiếu gửi hàng cho hóa đơn #${order.id}`,
      type: 'success'
    });
  };

  // Handle tracking code lookup
  const handleTrackingLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingSearch) return;

    const found = orders.find(
      (o) => o.trackingNumber?.toLowerCase() === trackingSearch.toLowerCase() ||
             o.id.toString() === trackingSearch
    );

    if (found) {
      setTrackingResult(found);
    } else {
      setTrackingResult({ error: 'Không tìm thấy thông tin vận đơn này trên hệ thống.' });
    }
  };

  // Toggle selection
  const toggleSelectOrder = (id: number) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((oid) => oid !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  // Status mapping to badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Chờ xử lý</span>;
      case 'confirmed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Đã xác nhận</span>;
      case 'shipping':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Đang giao</span>;
      case 'completed':
      case 'delivered':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Đã hoàn thành</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Đã hủy</span>;
      case 'returned':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Hoàn/Trả</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  // Source logo/name formatting
  const getSourceBadge = (source: string) => {
    const src = source?.toLowerCase();
    if (src === 'shopee') return <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-600/20 text-orange-500 border border-orange-500/20 rounded">SHOPEE</span>;
    if (src === 'tiktok') return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-white border border-slate-700 rounded">TIKTOK</span>;
    if (src === 'zalo') return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-400/20 rounded">ZALO</span>;
    if (src === 'facebook') return <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600/20 text-indigo-400 border border-indigo-400/20 rounded">FACEBOOK</span>;
    if (src === 'pos') return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-400/20 rounded">POS</span>;
    return <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-700/20 text-gray-400 border border-gray-500/20 rounded">MANUAL</span>;
  };

  const getCarrierName = (carrier: string) => {
    const c = carrier?.toLowerCase();
    if (c === 'ghn') return 'Giao Hàng Nhanh';
    if (c === 'ghtk') return 'Giao Hàng Tiết Kiệm';
    if (c === 'vtp') return 'Viettel Post';
    if (c === 'spx') return 'Shopee Xpress';
    if (c === 'jt') return 'J&T Express';
    return carrier || 'Tự giao hàng';
  };

  return (
    <div className="w-full text-foreground py-6 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            QUẢN LÝ ĐƠN HÀNG MARKETPLACE
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Không gian làm việc: <span className="text-orange-400 font-semibold">{team.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] rounded-lg text-sm text-gray-300 transition"
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/[0.08] mb-6">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'overview' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Tổng quan KPI
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'orders' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Đơn hàng ({orders.length})
          {activeTab === 'orders' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('returns')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'returns' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Hoàn / Trả ({totalReturned})
          {activeTab === 'returns' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('shipping')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'shipping' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Tra cứu vận chuyển
          {activeTab === 'shipping' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
      </div>

      {/* --- TAB CONTENT: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-xl p-6 shadow-2xl relative overflow-hidden group hover:border-orange-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition duration-300" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Doanh thu sạch</p>
                  <p className="text-2xl font-bold text-white mt-2">{formatVND(totalRevenue)}</p>
                </div>
                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-lg">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Trừ đơn huỷ và trả hàng</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-xl p-6 shadow-2xl relative overflow-hidden group hover:border-pink-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition duration-300" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lợi nhuận gộp</p>
                  <p className="text-2xl font-bold text-white mt-2">{formatVND(totalProfit)}</p>
                </div>
                <div className="p-3 bg-pink-500/10 text-pink-500 rounded-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Doanh thu - Phí ship/Chiết khấu</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-xl p-6 shadow-2xl relative overflow-hidden group hover:border-green-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition duration-300" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Đơn hoàn thành</p>
                  <p className="text-2xl font-bold text-white mt-2">{totalCompleted} đơn</p>
                </div>
                <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Đã bàn giao khách thành công</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-xl p-6 shadow-2xl relative overflow-hidden group hover:border-purple-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition duration-300" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tỷ lệ hoàn đơn</p>
                  <p className="text-2xl font-bold text-white mt-2">{returnRate}%</p>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Tổng số đơn hoàn: {totalReturned}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart SVG */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 col-span-2 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-6">Doanh thu 7 ngày gần nhất</h3>
              <div className="h-64 flex items-end justify-between relative mt-4">
                {/* SVG Line & Dots Chart */}
                <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3,3" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3,3" />
                  <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3,3" />
                  
                  {/* Area beneath chart line */}
                  <path 
                    d="M 50 200 L 50 120 Q 150 70 250 160 T 450 60 T 650 90 L 650 200 Z" 
                    fill="url(#chart-grad)" 
                    className="w-full"
                  />
                  
                  {/* Chart Line */}
                  <path 
                    d="M 50 120 Q 150 70 250 160 T 450 60 T 650 90" 
                    fill="none" 
                    stroke="url(#chart-line-grad)" 
                    strokeWidth="3" 
                  />
                  
                  <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </svg>

                {/* Day Columns */}
                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map((day, idx) => (
                  <div key={day} className="flex flex-col items-center z-10 w-full">
                    <span className="text-[10px] text-gray-500 mb-1">
                      {formatVND(Math.max(100000, Math.round(totalRevenue / 7 * (0.8 + idx * 0.15))))}
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-black shadow shadow-orange-400 mb-1" />
                    <span className="text-xs text-gray-400">{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales by Source */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-6">Đơn theo kênh bán</h3>
              <div className="space-y-4">
                {['Shopee', 'TikTok', 'Zalo', 'Facebook', 'POS', 'Manual'].map((platform) => {
                  const count = orders.filter((o) => o.source?.toLowerCase() === platform.toLowerCase()).length;
                  const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                  
                  return (
                    <div key={platform} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-300">
                        <span>{platform}</span>
                        <span>{count} đơn ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: ORDERS --- */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Sub-tabs & Filter Toolbar */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 space-y-4 shadow-xl">
            {/* Horizontal Filter Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-white/[0.04]">
              {[
                { label: 'Tất cả', value: 'all' },
                { label: 'Chờ xử lý', value: 'pending' },
                { label: 'Đã xác nhận', value: 'confirmed' },
                { label: 'Đang giao', value: 'shipping' },
                { label: 'Hoàn thành', value: 'completed' },
                { label: 'Hoàn/Trả', value: 'returned' },
                { label: 'Đã hủy', value: 'cancelled' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    statusFilter === tab.value 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {tab.label}
                  {statusFilter === tab.value && ` (${filteredOrders.length})`}
                </button>
              ))}
            </div>

            {/* Filter toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative col-span-1 md:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Tìm theo ID đơn, tên, sđt, mã vận đơn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              {/* Source filter */}
              <div>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="all" className="bg-[#141420]">Mọi kênh bán</option>
                  <option value="shopee" className="bg-[#141420]">Shopee</option>
                  <option value="tiktok" className="bg-[#141420]">TikTok</option>
                  <option value="zalo" className="bg-[#141420]">Zalo</option>
                  <option value="facebook" className="bg-[#141420]">Facebook</option>
                  <option value="pos" className="bg-[#141420]">POS cửa hàng</option>
                  <option value="manual" className="bg-[#141420]">Nhập tay</option>
                </select>
              </div>

              {/* Carrier filter */}
              <div>
                <select
                  value={carrierFilter}
                  onChange={(e) => setCarrierFilter(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="all" className="bg-[#141420]">Mọi nhà vận chuyển</option>
                  <option value="ghn" className="bg-[#141420]">Giao Hàng Nhanh</option>
                  <option value="ghtk" className="bg-[#141420]">Giao Hàng Tiết Kiệm</option>
                  <option value="vtp" className="bg-[#141420]">Viettel Post</option>
                  <option value="spx" className="bg-[#141420]">Shopee Xpress</option>
                  <option value="jt" className="bg-[#141420]">J&T Express</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedOrderIds.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-orange-950/40 to-pink-950/40 border border-orange-500/20 rounded-xl p-4 gap-4 animate-fade-in shadow-lg">
              <span className="text-xs font-semibold text-orange-400">
                Đang chọn {selectedOrderIds.length} đơn hàng
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkAction('confirm')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Xác nhận
                </button>
                <button
                  onClick={() => handleBulkAction('print')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  In hàng loạt ({selectedOrderIds.length})
                </button>
                <button
                  onClick={() => handleBulkAction('ship')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <Truck className="h-3.5 w-3.5" />
                  Gửi vận chuyển
                </button>
                <button
                  onClick={() => handleBulkAction('delivered')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Đã giao
                </button>
                <button
                  onClick={() => handleBulkAction('cancelled')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Huỷ đơn
                </button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 bg-transparent h-4 w-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mã đơn</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Khách hàng</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nguồn</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vận chuyển</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tổng tiền</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ngày tạo</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 text-sm">
                        Không tìm thấy đơn hàng nào khớp với điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <tr 
                          key={order.id}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            isSelected ? 'bg-orange-500/5' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOrder(order.id)}
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 bg-transparent h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-semibold text-orange-400 text-sm">
                            #{order.id}
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-semibold text-white">{order.customerName || 'Khách vãng lai'}</div>
                            <div className="text-xs text-gray-400">{order.customerPhone || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            {getSourceBadge(order.source)}
                          </td>
                          <td className="p-4 text-sm">
                            <div className="text-white font-medium">{getCarrierName(order.carrier)}</div>
                            <div className="text-xs text-gray-400 font-mono">{order.trackingNumber || 'Chưa có mã vận đơn'}</div>
                          </td>
                          <td className="p-4 font-bold text-white text-sm">
                            {formatVND(order.totalAmount)}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="p-4 text-xs text-gray-400">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsSheetOpen(true);
                                }}
                                className="p-1.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] hover:border-orange-500/30 rounded text-gray-300 transition"
                                title="Xem chi tiết"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handlePrint(order)}
                                className="p-1.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] hover:border-pink-500/30 rounded text-gray-300 transition"
                                title="In phiếu gửi"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: RETURNS --- */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          {/* Returned KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl flex items-center gap-4">
              <div className="p-4 bg-purple-500/10 text-purple-400 rounded-lg">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Tổng số đơn hoàn trả</p>
                <p className="text-2xl font-bold text-white mt-1">{totalReturned} đơn</p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl flex items-center gap-4">
              <div className="p-4 bg-red-500/10 text-red-400 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Giá trị đơn hoàn trả</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatVND(orders.filter((o) => o.status === 'returned').reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                </p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl flex items-center gap-4">
              <div className="p-4 bg-pink-500/10 text-pink-400 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Tỷ lệ hoàn trung bình</p>
                <p className="text-2xl font-bold text-white mt-1">{returnRate}%</p>
              </div>
            </div>
          </div>

          {/* Return reasons chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-6">Lý do hoàn trả phổ biến</h3>
              <div className="space-y-4">
                {[
                  { label: 'Khách đổi ý / không muốn mua nữa', count: Math.ceil(totalReturned * 0.4), color: 'bg-red-500' },
                  { label: 'Không liên lạc được khách hàng', count: Math.ceil(totalReturned * 0.3), color: 'bg-yellow-500' },
                  { label: 'Hàng lỗi / vỡ hỏng do vận chuyển', count: Math.ceil(totalReturned * 0.2), color: 'bg-orange-500' },
                  { label: 'Sai kích thước / sai mô tả', count: Math.ceil(totalReturned * 0.1), color: 'bg-purple-500' }
                ].map((reason) => {
                  const pct = totalReturned > 0 ? Math.round((reason.count / totalReturned) * 100) : 0;
                  return (
                    <div key={reason.label} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-300">
                        <span>{reason.label}</span>
                        <span>{reason.count} đơn ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className={`h-full ${reason.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Danh sách hoàn trả gần đây</h3>
              <div className="divide-y divide-white/[0.04] max-h-60 overflow-y-auto">
                {orders.filter((o) => o.status === 'returned').length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">Chưa ghi nhận đơn hoàn trả nào.</p>
                ) : (
                  orders.filter((o) => o.status === 'returned').map((order) => (
                    <div key={order.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-orange-400">#{order.id}</span>
                        <p className="text-sm font-medium text-white">{order.customerName}</p>
                        <p className="text-[11px] text-gray-500">Lý do: {order.returnReason || 'Không xác định'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white">{formatVND(order.totalAmount)}</span>
                        <p className="text-[10px] text-purple-400 mt-1">{order.returnStatus || 'Đang chờ xử lý'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: SHIPPING LOOKUP --- */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 text-center">
              Tra cứu hành trình vận đơn
            </h3>
            <form onSubmit={handleTrackingLookup} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Nhập mã vận đơn (VD: GHN12345) hoặc ID đơn hàng..."
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-lg text-sm transition"
              >
                Tra cứu
              </button>
            </form>

            {/* Tracking detail output */}
            {trackingResult && (
              <div className="border-t border-white/[0.08] pt-6 animate-fade-in">
                {trackingResult.error ? (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="h-5 w-5" />
                    <span>{trackingResult.error}</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-base">Đơn hàng #{trackingResult.id}</h4>
                        <p className="text-xs text-gray-400 mt-1">Đơn vị vận chuyển: {getCarrierName(trackingResult.carrier)}</p>
                        <p className="text-xs font-mono text-orange-400 mt-1">Mã vận đơn: {trackingResult.trackingNumber || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(trackingResult.status)}
                        <p className="text-xs text-gray-400 mt-2">Ngày đặt: {formatDate(trackingResult.createdAt)}</p>
                      </div>
                    </div>

                    {/* Timeline mockup */}
                    <div className="space-y-4 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
                      <div className="relative pl-6">
                        <div className="absolute left-[-18px] top-1 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-black" />
                        <span className="text-xs text-gray-500">Hôm nay</span>
                        <p className="text-sm font-semibold text-white">Đang phát hàng</p>
                        <p className="text-xs text-gray-400 mt-0.5">Shipper đang trên đường giao hàng đến địa chỉ người nhận.</p>
                      </div>
                      <div className="relative pl-6">
                        <div className="absolute left-[-18px] top-1 h-3.5 w-3.5 rounded-full bg-indigo-500 border-2 border-black" />
                        <span className="text-xs text-gray-500">Hôm qua</span>
                        <p className="text-sm font-semibold text-white">Đã nhập kho trung chuyển</p>
                        <p className="text-xs text-gray-400 mt-0.5">Bưu kiện đã đến Hub phân loại chính TP.HCM.</p>
                      </div>
                      <div className="relative pl-6">
                        <div className="absolute left-[-18px] top-1 h-3.5 w-3.5 rounded-full bg-indigo-500 border-2 border-black" />
                        <span className="text-xs text-gray-500">2 ngày trước</span>
                        <p className="text-sm font-semibold text-white">Đã lấy hàng thành công</p>
                        <p className="text-xs text-gray-400 mt-0.5">Bưu tá đã lấy hàng từ shop và gửi vào kho điều phối gửi.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DETAIL SHEET (SLIDE-IN MODAL) --- */}
      {isSheetOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <div 
            onClick={() => setIsSheetOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />

          {/* Panel content */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-[#0d0d15] border-l border-white/[0.08] shadow-2xl flex flex-col z-50 animate-scale-up">
            {/* Sheet Header */}
            <div className="p-6 border-b border-white/[0.08] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Chi tiết đơn hàng #{selectedOrder.id}</h3>
                <p className="text-xs text-gray-400 mt-1">Kênh bán: {selectedOrder.source} • {formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button 
                onClick={() => setIsSheetOpen(false)}
                className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-gray-400 transition"
              >
                Đóng
              </button>
            </div>

            {/* Status quick switcher in sheet */}
            <div className="p-4 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase">Thay đổi trạng thái:</span>
              <select
                value={selectedOrder.status}
                onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                disabled={statusUpdating}
                className="bg-white/[0.04] border border-white/[0.08] text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-500 transition"
              >
                <option value="pending" className="bg-[#141420]">Chờ xử lý</option>
                <option value="confirmed" className="bg-[#141420]">Đã xác nhận</option>
                <option value="shipping" className="bg-[#141420]">Đang giao</option>
                <option value="completed" className="bg-[#141420]">Đã giao thành công</option>
                <option value="returned" className="bg-[#141420]">Trả hàng / Hoàn tiền</option>
                <option value="cancelled" className="bg-[#141420]">Đã hủy bỏ</option>
              </select>
            </div>

            {/* Sheet Tabs */}
            <div className="flex border-b border-white/[0.04] text-xs font-semibold bg-white/[0.01]">
              {[
                { id: 'order', label: 'Sản phẩm' },
                { id: 'customer', label: 'Khách hàng' },
                { id: 'shipping', label: 'Vận chuyển' },
                { id: 'timeline', label: 'Lịch sử' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id as any)}
                  className={`flex-1 py-3 text-center border-b transition-colors ${
                    detailTab === tab.id 
                      ? 'border-orange-500 text-orange-400' 
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sheet Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: ORDER ITEMS */}
              {detailTab === 'order' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Danh mục sản phẩm</span>
                    {parseItems(selectedOrder.items).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-10 w-10 object-cover rounded bg-white/10" />
                          ) : (
                            <div className="h-10 w-10 bg-white/[0.04] rounded flex items-center justify-center text-gray-500">
                              <ShoppingBag className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white line-clamp-1">{item.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku || 'N/A'} • SL: {item.qty}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white">{formatVND(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="border-t border-white/[0.08] pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Tổng giá trị hàng:</span>
                      <span className="text-white font-medium">{formatVND(selectedOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Phí vận chuyển:</span>
                      <span className="text-white font-medium">+{formatVND(selectedOrder.shippingFee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Khuyến mãi / Giảm giá:</span>
                      <span className="text-red-400 font-medium">-{formatVND(selectedOrder.discount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 border-t border-white/[0.04] pt-2">
                      <span className="font-semibold text-white">Tổng thu hộ (COD):</span>
                      <span className="text-base font-bold text-orange-400">
                        {formatVND(selectedOrder.totalAmount + (selectedOrder.shippingFee || 0) - (selectedOrder.discount || 0))}
                      </span>
                    </div>
                  </div>

                  {/* Estimated profit info card */}
                  <div className="bg-gradient-to-br from-green-500/5 to-emerald-500/10 border border-green-500/10 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-green-400 font-semibold">Ước tính lợi nhuận đơn</span>
                        <p className="text-xs text-gray-400 mt-0.5">Đã trừ chi phí & khấu hao</p>
                      </div>
                      <span className="text-lg font-bold text-green-400">{formatVND(selectedOrder.profit || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOMER INFO */}
              {detailTab === 'customer' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg space-y-3">
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold">Tên khách hàng:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{selectedOrder.customerName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold">Số điện thoại:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{selectedOrder.customerPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold">Địa chỉ nhận hàng:</span>
                      <p className="text-sm text-gray-300 mt-0.5 whitespace-pre-wrap">{selectedOrder.customerAddress || 'Chưa cung cấp'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SHIPPING */}
              {detailTab === 'shipping' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg space-y-3">
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold">Đơn vị vận chuyển:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{getCarrierName(selectedOrder.carrier)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold">Mã vận đơn:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-mono text-orange-400 font-bold">{selectedOrder.trackingNumber || 'Chưa có'}</p>
                        {selectedOrder.trackingNumber && (
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(selectedOrder.trackingNumber);
                              (window as any).showToast?.({ title: 'Đã copy', description: 'Mã vận đơn đã được lưu vào clipboard.', type: 'success' });
                            }}
                            className="p-1 hover:bg-white/[0.08] rounded text-gray-400 transition"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold">Phí vận chuyển thực tế:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{formatVND(selectedOrder.shippingFee || 0)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-semibold">Số lần in phiếu gửi:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{selectedOrder.printCount || 0} lần</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TIMELINE HISTORICAL LOG */}
              {detailTab === 'timeline' && (
                <div className="space-y-6 pl-4 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
                  {(() => {
                    let events: any[] = [];
                    try {
                      events = typeof selectedOrder.timeline === 'string'
                        ? JSON.parse(selectedOrder.timeline)
                        : (selectedOrder.timeline || []);
                      if (!Array.isArray(events)) events = [];
                    } catch (e) {
                      events = [];
                    }

                    if (events.length === 0) {
                      return <p className="text-center text-gray-500 text-xs py-8">Chưa có lịch sử sự kiện.</p>;
                    }

                    return events.map((event: any, index: number) => (
                      <div key={index} className="relative pl-6">
                        <div className="absolute left-[-18px] top-1 h-3.5 w-3.5 rounded-full bg-orange-500 border-2 border-black" />
                        <span className="text-[10px] text-gray-500">{formatDate(event.time)}</span>
                        <p className="text-sm font-semibold text-white mt-0.5">{event.event}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Người thực hiện: {event.by}</p>
                        {event.detail && (
                          <p className="text-xs text-gray-500 italic mt-1 bg-white/[0.02] p-1.5 border border-white/[0.04] rounded">
                            {event.detail}
                          </p>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Sheet Footer */}
            <div className="p-6 border-t border-white/[0.08] bg-white/[0.01] flex justify-between items-center gap-3">
              <button 
                onClick={() => handlePrint(selectedOrder)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] rounded-lg text-sm text-gray-300 transition"
              >
                <Printer className="h-4 w-4" />
                In phiếu đóng hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
