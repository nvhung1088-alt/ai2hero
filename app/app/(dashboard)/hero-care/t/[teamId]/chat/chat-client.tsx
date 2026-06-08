'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import {
  Search,
  MessageSquare,
  Send,
  Check,
  X,
  User,
  ShoppingBag,
  BookOpen,
  Sparkles,
  Bot,
  UserCheck,
  Edit2,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import {
  getConversationsAction,
  getMessagesAction,
  updateConversationModeAction,
  updateConversationStatusAction,
  sendManualMessageAction,
  approveDraftAction,
  rejectDraftAction,
  getSnapshotItemsAction,
  getCustomerDetailsAction,
  updateCustomerAction
} from '@/lib/db/hero-care-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface Inbox {
  id: number;
  name: string;
  channel: string;
  status: string;
}

interface ChatClientProps {
  teamId: number;
  inboxes: Inbox[];
}

export default function ChatClient({ teamId, inboxes }: ChatClientProps) {
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(
    inboxes.length > 0 ? inboxes[0].id : null
  );

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  
  // UI Tabs & Filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'auto' | 'hybrid' | 'manual' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'customer' | 'orders' | 'scripts'>('customer');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  // Detail Panel Search
  const [snapshotItems, setSnapshotItems] = useState<any[]>([]);
  const [snapshotSearch, setSnapshotSearch] = useState('');

  // Input states
  const [manualInput, setManualInput] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editingDraftText, setEditingDraftText] = useState('');

  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, editingDraftId]);

  // Load conversations on inbox change
  useEffect(() => {
    if (selectedInboxId === null) return;
    async function fetchConvs() {
      const res = await getConversationsAction(teamId, selectedInboxId!);
      if (res.success && res.data) {
        setConversations(res.data);
      }
    }
    fetchConvs();
  }, [selectedInboxId, teamId]);

  // Load messages & customer detail on conv select
  useEffect(() => {
    if (selectedConvId === null) {
      setMessages([]);
      setCustomerInfo(null);
      return;
    }
    
    async function loadConvDetails() {
      const activeConv = conversations.find(c => c.id === selectedConvId);
      if (activeConv && activeConv.customerId) {
        const custRes = await getCustomerDetailsAction(teamId, activeConv.customerId);
        if (custRes.success && custRes.data) {
          setCustomerInfo(custRes.data);
        }
      }

      const msgRes = await getMessagesAction(teamId, selectedConvId!);
      if (msgRes.success && msgRes.data) {
        setMessages(msgRes.data);
      }
    }

    loadConvDetails();
    setIsMobileListVisible(false); // Close list on mobile
  }, [selectedConvId, teamId, conversations]);

  // Load snapshot items for search tab
  useEffect(() => {
    async function fetchSnapshots() {
      const res = await getSnapshotItemsAction(teamId, snapshotSearch);
      if (res.success && res.data) {
        setSnapshotItems(res.data);
      }
    }
    fetchSnapshots();
  }, [teamId, snapshotSearch]);

  // Polling conversations list (10s)
  useEffect(() => {
    if (selectedInboxId === null) return;
    const timer = setInterval(async () => {
      const res = await getConversationsAction(teamId, selectedInboxId!);
      if (res.success && res.data) {
        setConversations(res.data);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [selectedInboxId, teamId]);

  // Polling messages of active conversation (4s)
  useEffect(() => {
    if (selectedConvId === null) return;
    const timer = setInterval(async () => {
      const res = await getMessagesAction(teamId, selectedConvId!);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedConvId, teamId]);

  // Find currently active conversation object
  const activeConv = conversations.find(c => c.id === selectedConvId);

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Search filter
    const nameMatch = conv.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const phoneMatch = conv.customer?.phone?.includes(searchQuery) || false;
    
    if (searchQuery && !nameMatch && !phoneMatch) return false;

    // Tab filter
    if (activeFilter === 'all') return conv.status !== 'resolved';
    if (activeFilter === 'resolved') return conv.status === 'resolved';
    return conv.chatMode === activeFilter && conv.status !== 'resolved';
  });

  // Handle Mode Change
  const handleModeChange = async (mode: 'auto' | 'hybrid' | 'manual') => {
    if (!selectedConvId) return;
    startTransition(async () => {
      const res = await updateConversationModeAction(teamId, selectedConvId, mode);
      if (res.success) {
        setConversations(prev =>
          prev.map(c => (c.id === selectedConvId ? { ...c, chatMode: mode } : c))
        );
        showToast(`Đã chuyển sang chế độ: ${
          mode === 'auto' ? 'AI Tự động 🤖' : mode === 'hybrid' ? 'AI Hỗ trợ 📝' : 'Nhân viên ✍️'
        }`, 'info');
      } else {
        showToast(res.error || 'Lỗi khi chuyển chế độ', 'error');
      }
    });
  };

  // Handle Resolve Conversation
  const handleToggleResolve = async () => {
    if (!selectedConvId || !activeConv) return;
    const newStatus = activeConv.status === 'resolved' ? 'active' : 'resolved';
    startTransition(async () => {
      const res = await updateConversationStatusAction(teamId, selectedConvId, newStatus);
      if (res.success) {
        setConversations(prev =>
          prev.map(c => (c.id === selectedConvId ? { ...c, status: newStatus } : c))
        );
        setSelectedConvId(null);
        showToast(
          newStatus === 'resolved' ? 'Đã đóng cuộc hội thoại thành công' : 'Đã mở lại cuộc hội thoại',
          'success'
        );
      } else {
        showToast(res.error || 'Lỗi khi thay đổi trạng thái', 'error');
      }
    });
  };

  // Send Manual Message
  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !manualInput.trim()) return;
    const textToSend = manualInput;
    setManualInput('');

    const res = await sendManualMessageAction(teamId, selectedConvId, textToSend);
    if (res.success && res.data) {
      setMessages(prev => [...prev, res.data]);
    } else {
      showToast(res.error || 'Không gửi được tin nhắn', 'error');
    }
  };

  // Approve Draft
  const handleApproveDraft = async (msgId: number, isEdited: boolean) => {
    const content = isEdited ? editingDraftText : undefined;
    setEditingDraftId(null);

    const res = await approveDraftAction(teamId, msgId, content);
    if (res.success && res.data) {
      setMessages(prev => prev.map(m => (m.id === msgId ? res.data : m)));
      showToast('Đã duyệt và gửi tin nhắn của AI thành công', 'success');
    } else {
      showToast(res.error || 'Không duyệt được tin nhắn', 'error');
    }
  };

  // Reject Draft
  const handleRejectDraft = async (msgId: number) => {
    const res = await rejectDraftAction(teamId, msgId);
    if (res.success && res.data) {
      setMessages(prev => prev.map(m => (m.id === msgId ? res.data : m)));
      showToast('Đã bỏ qua tin gợi ý', 'info');
    } else {
      showToast(res.error || 'Lỗi khi hủy tin nháp', 'error');
    }
  };

  // Save Customer Notes & Tags
  const handleSaveCustomerDetails = async (notes: string, tagsStr: string) => {
    if (!customerInfo) return;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const res = await updateCustomerAction(teamId, customerInfo.id, { notes, tags });
    if (res.success && res.data) {
      setCustomerInfo(res.data);
      showToast('Đã lưu thông tin khách hàng', 'success');
    } else {
      showToast(res.error || 'Lỗi khi lưu thông tin', 'error');
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-gray-950 text-white relative">
      
      {/* COLUMN 1: Conversation List (Cột trái) */}
      <div className={`w-full lg:w-[320px] shrink-0 border-r border-white/5 bg-gray-900/10 flex flex-col h-full ${
        isMobileListVisible ? 'flex z-20 absolute inset-0 bg-gray-950 lg:relative' : 'hidden lg:flex'
      }`}>
        
        {/* Inbox Picker */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <select
            value={selectedInboxId || ''}
            onChange={(e) => {
              setSelectedInboxId(Number(e.target.value));
              setSelectedConvId(null);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {inboxes.map(ib => (
              <option key={ib.id} value={ib.id} className="bg-gray-900 text-white">
                {ib.name} ({ib.channel})
              </option>
            ))}
            {inboxes.length === 0 && (
              <option value="" disabled className="bg-gray-900 text-gray-500">Chưa cấu hình Inbox</option>
            )}
          </select>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-white/5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm khách hàng, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-3 py-2 border-b border-white/5 shrink-0 overflow-x-auto scrollbar-none flex gap-1 bg-gray-950/20">
          {(['all', 'auto', 'hybrid', 'manual', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeFilter === f
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {f === 'all' && 'Tất cả'}
              {f === 'auto' && '🤖 Auto'}
              {f === 'hybrid' && '📝 Hybrid'}
              {f === 'manual' && '✍️ Gõ tay'}
              {f === 'resolved' && '✅ Đóng'}
            </button>
          ))}
        </div>

        {/* Conversations Scroll Zone */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 bg-gray-950/30">
          {filteredConversations.length > 0 ? (
            filteredConversations.map(conv => {
              const isActive = selectedConvId === conv.id;
              const hasDraft = messages.some(m => m.conversationId === conv.id && m.draftStatus === 'pending');
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-white/5 relative ${
                    isActive ? 'bg-white/5 border-l-2 border-blue-500' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  
                  {/* Text Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-white truncate pr-1">
                        {conv.customer?.name || 'Khách hàng ẩn danh'}
                      </p>
                      <span className="text-[9px] text-gray-500 font-semibold uppercase">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 truncate mt-1">
                      {conv.customer?.phone || 'Chưa cập nhật SĐT'}
                    </p>

                    {/* Meta Badges */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        conv.chatMode === 'auto'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : conv.chatMode === 'hybrid'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        {conv.chatMode === 'auto' ? 'Auto' : conv.chatMode === 'hybrid' ? 'Hybrid' : 'Manual'}
                      </span>
                      {hasDraft && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                          Cần duyệt nháp
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs font-bold">
              Không tìm thấy hội thoại nào
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: Chat Zone (Vùng chat chính - cột giữa) */}
      <div className="flex-1 flex flex-col h-full bg-gray-950/20 relative">
        
        {/* Chat Zone Header */}
        {activeConv ? (
          <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-gray-900/30">
            <div className="flex items-center gap-3">
              {/* Back Button on Mobile */}
              <button
                onClick={() => setIsMobileListVisible(true)}
                className="lg:hidden p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {activeConv.customer?.name || 'Khách hàng ẩn danh'}
                </h3>
                <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                  Active Mode: {activeConv.chatMode}
                </p>
              </div>
            </div>

            {/* Mode Selector and Actions */}
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-950/80 border border-white/5 rounded-xl p-0.5 text-xs">
                {(['auto', 'hybrid', 'manual'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all text-[10px] uppercase cursor-pointer ${
                      activeConv.chatMode === mode
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {mode === 'auto' && '🤖 Auto'}
                    {mode === 'hybrid' && '📝 Hybrid'}
                    {mode === 'manual' && '✍️ Manual'}
                  </button>
                ))}
              </div>

              <button
                onClick={handleToggleResolve}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  activeConv.status === 'resolved'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {activeConv.status === 'resolved' ? 'Mở lại' : 'Đóng hội thoại'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-16 border-b border-white/5 shrink-0 bg-gray-900/30"></div>
        )}

        {/* Message History Screen */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-950/40">
          {selectedConvId ? (
            <>
              {messages.map((msg, index) => {
                const isInbound = msg.direction === 'inbound';
                const isSystem = msg.messageType === 'system';
                
                // If it is a draft that hasn't been sent, we'll display it specially or let the Draft Zone handle it
                if (msg.draftStatus === 'pending' && !isInbound) {
                  return null; // Rendered in the special Draft Zone bottom overlay instead
                }

                if (isSystem) {
                  return (
                    <div key={msg.id || index} className="flex justify-center my-2">
                      <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 font-medium font-mono">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id || index}
                    className={`flex ${isInbound ? 'justify-start' : 'justify-end'} animate-fade-up`}
                  >
                    <div className="max-w-[70%] space-y-1">
                      {/* Message Content Bubble */}
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isInbound
                          ? 'bg-gray-900 border border-white/5 text-white'
                          : msg.senderId?.startsWith('agent-')
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Info Meta */}
                      <div className={`flex items-center gap-1 text-[9px] text-gray-500 ${
                        isInbound ? 'justify-start' : 'justify-end'
                      }`}>
                        {!isInbound && (
                          <span className="font-bold flex items-center gap-0.5">
                            {msg.senderId?.startsWith('agent-') ? (
                              <>
                                <UserCheck className="h-2.5 w-2.5 text-orange-400" />
                                {msg.senderName}
                              </>
                            ) : (
                              <>
                                <Bot className="h-2.5 w-2.5 text-blue-400" />
                                AI Assistant
                              </>
                            )}
                          </span>
                        )}
                        <span>·</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <MessageSquare className="h-12 w-12 text-gray-500 mb-3" />
              <p className="text-sm font-bold text-gray-300">Hộp thư CSKH AI2Hero</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                Chọn một cuộc trò chuyện từ cột trái để bắt đầu nhắn tin hoặc kiểm duyệt tin gợi ý của robot.
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Draft Zone (Review Area) */}
        {selectedConvId && activeConv?.chatMode === 'hybrid' && messages.some(m => m.draftStatus === 'pending') && (
          <div className="mx-6 mb-3 p-4 bg-gray-900/90 border border-amber-500/20 rounded-2xl shadow-xl flex flex-col gap-3 animate-scale-up backdrop-blur-md">
            {messages.filter(m => m.draftStatus === 'pending').map(draft => {
              const isEditing = editingDraftId === draft.id;
              
              return (
                <div key={draft.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                      Robot gợi ý trả lời (Draft)
                    </span>
                    
                    {/* Guardrails check mockup */}
                    <div className="flex gap-1.5 text-[9px] font-semibold text-green-400">
                      <span className="bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ShieldCheck className="h-2.5 w-2.5 text-green-400" />
                        Giá Khớp
                      </span>
                      <span className="bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ShieldCheck className="h-2.5 w-2.5 text-green-400" />
                        Tồn Kho Khớp
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      value={editingDraftText}
                      onChange={(e) => setEditingDraftText(e.target.value)}
                      className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                      rows={3}
                    />
                  ) : (
                    <div className="bg-gray-950/40 p-3.5 rounded-xl border border-white/5 text-xs text-gray-300 leading-relaxed font-mono">
                      {draft.content}
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setEditingDraftId(null)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleApproveDraft(draft.id, true)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Lưu & Gửi
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRejectDraft(draft.id)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-white"
                          title="Bỏ qua gợi ý này"
                        >
                          Bỏ qua
                        </button>
                        <button
                          onClick={() => {
                            setEditingDraftId(draft.id);
                            setEditingDraftText(draft.content);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-blue-400 hover:text-white flex items-center gap-1"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleApproveDraft(draft.id, false)}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-xs font-bold text-white flex items-center gap-1 shadow-md shadow-blue-500/10"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Duyệt & Gửi
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM INPUT BAR */}
        {selectedConvId && (
          <form
            onSubmit={handleSendManual}
            className="p-4 border-t border-white/5 shrink-0 bg-gray-900/20 flex gap-3 relative"
          >
            {activeConv?.chatMode === 'auto' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-t-xl">
                <span className="text-xs font-bold text-green-400 flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl">
                  <Bot className="h-4 w-4 animate-bounce" />
                  AI Auto Mode: Chat box bị tạm khóa để Robot tự phản hồi
                </span>
              </div>
            )}

            <input
              type="text"
              placeholder="Nhập nội dung phản hồi khách hàng (Manual)..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-orange-500/10 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      {/* COLUMN 3: Detail Panel (Cột phải - Thông tin chi tiết) */}
      {selectedConvId && customerInfo && (
        <div className="w-[280px] shrink-0 border-l border-white/5 bg-gray-900/15 hidden xl:flex flex-col h-full">
          
          {/* Tab Selectors */}
          <div className="grid grid-cols-3 border-b border-white/5 p-1 text-center shrink-0 bg-gray-950/20">
            <button
              onClick={() => setRightPanelTab('customer')}
              className={`py-2 text-[10px] font-bold rounded-lg uppercase transition-all flex flex-col items-center gap-1 cursor-pointer ${
                rightPanelTab === 'customer' ? 'bg-white/5 text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" />
              Khách
            </button>
            <button
              onClick={() => setRightPanelTab('orders')}
              className={`py-2 text-[10px] font-bold rounded-lg uppercase transition-all flex flex-col items-center gap-1 cursor-pointer ${
                rightPanelTab === 'orders' ? 'bg-white/5 text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Tồn kho
            </button>
            <button
              onClick={() => setRightPanelTab('scripts')}
              className={`py-2 text-[10px] font-bold rounded-lg uppercase transition-all flex flex-col items-center gap-1 cursor-pointer ${
                rightPanelTab === 'scripts' ? 'bg-white/5 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Gợi ý
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Customer Tab */}
            {rightPanelTab === 'customer' && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                    <User className="h-8 w-8 text-blue-400" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white mt-2">
                    {customerInfo.name || 'Khách hàng ẩn danh'}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    ID: {customerInfo.externalCustomerId || 'Chưa liên kết'}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SĐT:</span>
                    <span className="font-bold text-white">{customerInfo.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Kênh:</span>
                    <span className="font-bold text-white uppercase">{customerInfo.channel || 'web'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Đã chat:</span>
                    <span className="font-bold text-white">{customerInfo.totalConversations} lần</span>
                  </div>
                </div>

                {/* Edit Form for tags & notes */}
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Phân loại Tags (cách nhau bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      defaultValue={(Array.isArray(customerInfo.tags) ? customerInfo.tags : []).join(', ')}
                      placeholder="vip, wholesale..."
                      onBlur={(e) => handleSaveCustomerDetails(customerInfo.notes || '', e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Ghi chú / Trí nhớ (Memory)
                    </label>
                    <textarea
                      rows={4}
                      defaultValue={customerInfo.notes || ''}
                      placeholder="Nhập ghi chú riêng của khách hàng..."
                      onBlur={(e) => handleSaveCustomerDetails(e.target.value, (Array.isArray(customerInfo.tags) ? customerInfo.tags : []).join(', '))}
                      className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-600 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Orders / Inventory Tab */}
            {rightPanelTab === 'orders' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh mã SP, SKU..."
                    value={snapshotSearch}
                    onChange={(e) => setSnapshotSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                  />
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">
                    Danh sách kho Snapshot ({snapshotItems.length})
                  </span>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {snapshotItems.map(item => (
                      <div key={item.id} className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-white truncate max-w-[140px]" title={item.entityName}>
                            {item.entityName}
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 bg-gray-900 border border-white/5 px-1.5 py-0.5 rounded">
                            {item.entityKey}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 pt-1">
                          <span>Loại: {item.dataType}</span>
                          <span className="text-orange-400 font-extrabold">
                            {item.data?.price ? `${Number(item.data.price).toLocaleString()}đ` : 'No price'}
                          </span>
                        </div>
                        {item.data?.stock !== undefined && (
                          <div className="text-[9px] text-cyan-400 font-bold flex justify-between pt-0.5">
                            <span>Tồn kho:</span>
                            <span>{item.data.stock} cái</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {snapshotItems.length === 0 && (
                      <div className="text-center py-6 text-gray-600 text-xs font-bold">
                        Không có mặt hàng nào
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Scripts / FAQ Tab */}
            {rightPanelTab === 'scripts' && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <BookOpen className="h-8 w-8 text-cyan-400 mx-auto" />
                  <h4 className="font-extrabold text-xs text-white mt-2">Kịch bản FAQ Khớp nhanh</h4>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Hệ thống sẽ đối khớp các từ khóa trong tin nhắn để hỗ trợ Robot phản hồi tự động.
                  </p>
                </div>
                
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Kịch bản thường gặp</span>
                  
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
                    <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-cyan-400 block">💬 Hỏi Giá & Ship</span>
                      <p className="text-[10px] text-gray-400">Từ khóa: bao nhiêu, phí ship, ship thế nào</p>
                    </div>
                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-purple-400 block">💬 Đổi trả / Hoàn tiền</span>
                      <p className="text-[10px] text-gray-400">Từ khóa: trả hàng, đổi hàng, hoàn tiền, lỗi</p>
                    </div>
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-orange-400 block">💬 Địa chỉ shop</span>
                      <p className="text-[10px] text-gray-400">Từ khóa: shop ở đâu, địa chỉ, cửa hàng</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
