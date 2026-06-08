'use client';

import { useState, useTransition } from 'react';
import {
  Users,
  Search,
  Filter,
  X,
  Check,
  Tag,
  FileText,
  ChevronRight,
  MessageSquare,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { updateCustomerAction, getCustomerDetailsAction } from '@/lib/db/hero-care-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface Customer {
  id: number;
  teamId: number;
  externalCustomerId: string;
  channel: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  tags: unknown; // jsonb array of strings e.g. ["vip", "wholesale"]
  notes: string | null;
  totalConversations: number;
  totalOrders: number;
  lastSeenAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface CustomersClientProps {
  teamId: number;
  initialCustomers: Customer[];
}

export default function CustomersClient({ teamId, initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  // Drawer & Edit State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const handleOpenDrawer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditNotes(customer.notes || '');
    
    // Parse tags safely
    let tagsArr: string[] = [];
    if (Array.isArray(customer.tags)) {
      tagsArr = customer.tags;
    } else if (typeof customer.tags === 'string') {
      try {
        tagsArr = JSON.parse(customer.tags);
      } catch (e) {
        tagsArr = [];
      }
    }
    setEditTags(tagsArr);
    setDrawerOpen(true);
    setNewTagInput('');

    // Fetch fresh details from server
    try {
      const res = await getCustomerDetailsAction(teamId, customer.id);
      if (res.success && res.data) {
        const freshCustomer = res.data as Customer;
        setSelectedCustomer(freshCustomer);
        setEditNotes(freshCustomer.notes || '');
        let freshTagsArr: string[] = [];
        if (Array.isArray(freshCustomer.tags)) {
          freshTagsArr = freshCustomer.tags;
        } else if (typeof freshCustomer.tags === 'string') {
          try {
            freshTagsArr = JSON.parse(freshCustomer.tags);
          } catch (e) {
            freshTagsArr = [];
          }
        }
        setEditTags(freshTagsArr);
      }
    } catch (e) {
      console.error('Error loading fresh customer details:', e);
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;

    startTransition(async () => {
      const res = await updateCustomerAction(teamId, selectedCustomer.id, {
        tags: editTags,
        notes: editNotes
      });

      if (res.success) {
        showToast('Đã cập nhật thông tin khách hàng thành công', 'success');
        // Update local list
        setCustomers(prev =>
          prev.map(c =>
            c.id === selectedCustomer.id
              ? { ...c, tags: editTags, notes: editNotes, updatedAt: new Date().toISOString() }
              : c
          )
        );
        setDrawerOpen(false);
        setSelectedCustomer(null);
      } else {
        showToast(res.error || 'Lỗi khi cập nhật khách hàng', 'error');
      }
    });
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (editTags.includes(trimmed)) {
      showToast('Thẻ này đã tồn tại', 'info');
      return;
    }
    setEditTags(prev => [...prev, trimmed]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(query) || false;
    const phoneMatch = c.phone?.includes(query) || false;
    const emailMatch = c.email?.toLowerCase().includes(query) || false;
    const extIdMatch = c.externalCustomerId.toLowerCase().includes(query);

    const matchText = nameMatch || phoneMatch || emailMatch || extIdMatch;
    
    if (searchQuery && !matchText) return false;

    if (selectedChannel !== 'all') {
      return c.channel.toLowerCase() === selectedChannel.toLowerCase();
    }

    return true;
  });

  const getChannelBadge = (channel: string) => {
    const channelLower = channel.toLowerCase();
    switch (channelLower) {
      case 'zalo':
        return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-extrabold uppercase">Zalo</span>;
      case 'telegram':
        return <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-extrabold uppercase">Telegram</span>;
      case 'pancake':
        return <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-extrabold uppercase">Pancake</span>;
      case 'facebook':
        return <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-extrabold uppercase">Facebook</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-extrabold uppercase">{channel}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-emerald-400" />
            Quản lý Khách hàng
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {filteredCustomers.length} liên hệ
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Xem và chỉnh sửa danh sách khách hàng được thu thập từ các kênh. Bổ sung tags phân loại và ghi chú phục vụ cho AI cá nhân hóa câu trả lời.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white/5 p-4 border border-white/10 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-md">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Tìm theo tên, SĐT, email, ID kênh..."
            className="w-full pl-9 bg-gray-900/50 border border-white/5 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 text-xs py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 hidden sm:inline">Lọc theo Kênh:</span>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-gray-900/50 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer w-full md:w-48"
          >
            <option value="all">Tất cả kênh</option>
            <option value="zalo">Zalo OA</option>
            <option value="telegram">Telegram Bot</option>
            <option value="pancake">Pancake Chat</option>
            <option value="facebook">Facebook Page</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Khách hàng</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Kênh</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Liên hệ</th>
                <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Số Chat</th>
                <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Đơn hàng</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Hoạt động cuối</th>
                <th scope="col" className="relative px-6 py-3.5">
                  <span className="sr-only">Hành động</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-transparent">
              {filteredCustomers.map(customer => {
                let tagsArr: string[] = [];
                if (Array.isArray(customer.tags)) {
                  tagsArr = customer.tags;
                } else if (typeof customer.tags === 'string') {
                  try {
                    tagsArr = JSON.parse(customer.tags);
                  } catch (e) {
                    tagsArr = [];
                  }
                }

                return (
                  <tr
                    key={customer.id}
                    onClick={() => handleOpenDrawer(customer)}
                    className="hover:bg-white/5 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center text-white overflow-hidden shrink-0">
                          {customer.avatar ? (
                            <img src={customer.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-bold text-xs uppercase text-emerald-400">
                              {((customer.name || customer.externalCustomerId) || 'KH').substring(0, 2)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            {customer.name || 'Khách ẩn danh'}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {tagsArr.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-mono font-bold">
                                {tag}
                              </span>
                            ))}
                            {tagsArr.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[8px] font-mono font-bold">
                                +{tagsArr.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getChannelBadge(customer.channel)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-300">
                      <div className="font-medium">{customer.phone || '-'}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{customer.email || 'không có email'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-white">
                      {customer.totalConversations}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-white">
                      {customer.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                      {customer.lastSeenAt ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          {new Date(customer.lastSeenAt).toLocaleString('vi-VN')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <ChevronRight className="h-4 w-4 text-gray-500 inline hover:text-white" />
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <HelpCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-300">Không tìm thấy khách hàng nào</p>
                    <p className="text-xs text-gray-500 mt-1">Dữ liệu khách hàng sẽ tự động xuất hiện khi có tin nhắn liên hệ từ Zalo/Telegram/Pancake.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLIDE-OVER DRAWER */}
      {drawerOpen && selectedCustomer && (
        <div className="fixed inset-0 overflow-hidden z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-gray-900 border-l border-white/10 shadow-2xl flex flex-col">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-emerald-400" />
                  Chi tiết Khách hàng
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                
                {/* Profile Card */}
                <div className="flex flex-col items-center text-center p-4 bg-white/5 border border-white/5 rounded-2xl gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center text-white overflow-hidden shadow-inner">
                    {selectedCustomer.avatar ? (
                      <img src={selectedCustomer.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-extrabold text-lg uppercase text-emerald-400">
                        {((selectedCustomer.name || selectedCustomer.externalCustomerId) || 'KH').substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white leading-tight">
                      {selectedCustomer.name || 'Khách ẩn danh'}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5">
                      {getChannelBadge(selectedCustomer.channel)}
                      <span className="text-[10px] font-mono text-gray-500">ID: {selectedCustomer.externalCustomerId}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3 bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thông tin liên hệ</h4>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs border-b border-white/5 pb-2.5">
                    <span className="text-gray-500 font-medium">Số điện thoại:</span>
                    <span className="col-span-2 text-white font-bold">{selectedCustomer.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs border-b border-white/5 pb-2.5">
                    <span className="text-gray-500 font-medium">Email:</span>
                    <span className="col-span-2 text-white font-bold break-all">{selectedCustomer.email || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs border-b border-white/5 pb-2.5">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      Số cuộc chat:
                    </span>
                    <span className="col-span-2 text-white font-extrabold">{selectedCustomer.totalConversations} lần</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      <ShoppingBag className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      Số đơn hàng:
                    </span>
                    <span className="col-span-2 text-white font-extrabold">{selectedCustomer.totalOrders} đơn</span>
                  </div>
                </div>

                {/* Tags Management */}
                <div className="space-y-3 bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-emerald-400" />
                    Thẻ Phân Loại (Tags)
                  </h4>
                  
                  <div className="flex gap-2 flex-wrap min-h-[30px] items-center">
                    {editTags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-semibold">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {editTags.length === 0 && (
                      <span className="text-xs text-gray-500 italic">Chưa gắn thẻ phân loại</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="ví dụ: vip, wholesale"
                      className="flex-1 bg-gray-900 border border-white/5 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                {/* Notes Management */}
                <div className="space-y-3 bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-sky-400" />
                    Ghi chú khách hàng
                  </h4>
                  <textarea
                    rows={4}
                    placeholder="Ghi chú về thói quen mua sắm, khiếu nại cũ, sản phẩm hay quan tâm..."
                    className="w-full bg-gray-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-600 leading-relaxed resize-none"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-white/5 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 text-gray-300 hover:bg-white/5 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveCustomer}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/15 cursor-pointer transition-all"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
