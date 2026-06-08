'use client';

import { useState, useTransition } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Bot, 
  Sparkles,
  MessageSquare,
  AlertTriangle,
  X,
  Check,
  Shield,
  Zap,
  Clock
} from 'lucide-react';
import { 
  createInboxAction, 
  updateInboxAction, 
  deleteInboxAction,
  getGuardrailsAction,
  saveGuardrailAction,
  deleteGuardrailAction,
  getEventsAction,
  type CreateInboxInput 
} from '@/lib/db/hero-care-actions';
import { useRouter } from 'next/navigation';

interface SettingsClientProps {
  teamId: number;
  initialInboxes: any[];
  connections: any[];
  initialGuardrails: any[];
  initialEvents: any[];
}

export default function SettingsClient({
  teamId,
  initialInboxes,
  connections,
  initialGuardrails,
  initialEvents
}: SettingsClientProps) {
  const router = useRouter();
  const [inboxes, setInboxes] = useState<any[]>(initialInboxes);
  const [isOpen, setIsOpen] = useState(false);
  const [editingInbox, setEditingInbox] = useState<any | null>(null);
  
  // Tab control & extra data states (Phase 5)
  const [activeTab, setActiveTab] = useState<'inboxes' | 'guardrails' | 'quota' | 'logs'>('inboxes');
  const [guardrails, setGuardrails] = useState<any[]>(initialGuardrails);
  const [events, setEvents] = useState<any[]>(initialEvents);
  
  // Guardrails Edit Form states
  const [isGuardrailOpen, setIsGuardrailOpen] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<any | null>(null);
  const [grInboxId, setGrInboxId] = useState<string>('all');
  const [grRuleType, setGrRuleType] = useState<'keyword_block' | 'intent_handoff' | 'max_turns_handoff' | 'stale_data_block'>('keyword_block');
  const [grAction, setGrAction] = useState<'handoff' | 'block' | 'warn'>('handoff');
  const [grEnabled, setGrEnabled] = useState<number>(1);
  const [grConditionValue, setGrConditionValue] = useState<string>('');

  // Event Logs filters & detail viewer states
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedEventInbox, setSelectedEventInbox] = useState<string>('all');
  const [viewingEvent, setViewingEvent] = useState<any | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateInboxInput>({
    name: '',
    channel: 'telegram',
    connectionId: null,
    status: 'active',
    systemPrompt: 'Bạn là trợ lý chăm sóc khách hàng thân thiện của cửa hàng. Hãy trả lời ngắn gọn, lịch sự và sử dụng dữ liệu được cung cấp.',
    defaultReply: 'Hiện tại các nhân viên hỗ trợ đều đang bận. Chúng tôi sẽ phản hồi bạn trong giây lát!',
    dailyMessageLimit: 50,
    dailyAiCallLimit: 20
  });

  const handleOpenCreate = () => {
    setEditingInbox(null);
    setFormData({
      name: '',
      channel: 'telegram',
      connectionId: connections.find(c => c.appSlug === 'telegram')?.id || null,
      status: 'active',
      systemPrompt: 'Bạn là trợ lý chăm sóc khách hàng thân thiện của cửa hàng. Hãy trả lời ngắn gọn, lịch sự và sử dụng dữ liệu được cung cấp.',
      defaultReply: 'Hiện tại các nhân viên hỗ trợ đều đang bận. Chúng tôi sẽ phản hồi bạn trong giây lát!',
      dailyMessageLimit: 50,
      dailyAiCallLimit: 20
    });
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (inbox: any) => {
    setEditingInbox(inbox);
    setFormData({
      name: inbox.name,
      channel: inbox.channel,
      connectionId: inbox.connectionId,
      status: inbox.status as any,
      systemPrompt: inbox.systemPrompt || '',
      defaultReply: inbox.defaultReply,
      dailyMessageLimit: inbox.dailyMessageLimit,
      dailyAiCallLimit: inbox.dailyAiCallLimit
    });
    setError(null);
    setIsOpen(true);
  };

  const handleChannelChange = (channel: string) => {
    // Auto find compatible connection
    const matchedConn = connections.find(c => c.appSlug === channel);
    setFormData(prev => ({
      ...prev,
      channel,
      connectionId: matchedConn ? matchedConn.id : null
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      if (editingInbox) {
        // Update
        const res = await updateInboxAction(teamId, editingInbox.id, formData);
        if (res.success && res.data) {
          setInboxes(prev => prev.map(i => i.id === editingInbox.id ? res.data : i));
          setIsOpen(false);
          router.refresh();
        } else {
          setError(res.error || 'Cập nhật thất bại');
        }
      } else {
        // Create
        const res = await createInboxAction(teamId, formData);
        if (res.success && res.data) {
          setInboxes(prev => [res.data, ...prev]);
          setIsOpen(false);
          router.refresh();
        } else {
          setError(res.error || 'Tạo thất bại');
        }
      }
    });
  };

  const handleDelete = (inboxId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa Inbox này? Mọi hội thoại liên quan sẽ không thể truy cập.')) {
      return;
    }

    startTransition(async () => {
      const res = await deleteInboxAction(teamId, inboxId);
      if (res.success) {
        setInboxes(prev => prev.filter(i => i.id !== inboxId));
        router.refresh();
      } else {
        alert(res.error || 'Xóa thất bại');
      }
    });
  };

  const handleToggleStatus = (inbox: any) => {
    const nextStatus = inbox.status === 'active' ? 'paused' : 'active';
    startTransition(async () => {
      const res = await updateInboxAction(teamId, inbox.id, { status: nextStatus });
      if (res.success && res.data) {
        setInboxes(prev => prev.map(i => i.id === inbox.id ? res.data : i));
        router.refresh();
      } else {
        alert(res.error || 'Cập nhật trạng thái thất bại');
      }
    });
  };

  // ─── GUARDRAILS HANDLERS ───
  const handleOpenCreateGuardrail = () => {
    setEditingGuardrail(null);
    setGrInboxId('all');
    setGrRuleType('keyword_block');
    setGrAction('handoff');
    setGrEnabled(1);
    setGrConditionValue('');
    setIsGuardrailOpen(true);
  };

  const handleOpenEditGuardrail = (gr: any) => {
    setEditingGuardrail(gr);
    setGrInboxId(gr.inboxId ? gr.inboxId.toString() : 'all');
    setGrRuleType(gr.ruleType);
    setGrAction(gr.action);
    setGrEnabled(gr.enabled);

    let condValue = '';
    const cond = gr.condition || {};
    if (gr.ruleType === 'keyword_block') {
      condValue = Array.isArray(cond.keywords) ? cond.keywords.join(', ') : '';
    } else if (gr.ruleType === 'intent_handoff') {
      condValue = Array.isArray(cond.intents) ? cond.intents.join(', ') : '';
    } else if (gr.ruleType === 'max_turns_handoff') {
      condValue = cond.maxTurns ? cond.maxTurns.toString() : '3';
    } else if (gr.ruleType === 'stale_data_block') {
      condValue = cond.staleMinutes ? cond.staleMinutes.toString() : '60';
    }
    setGrConditionValue(condValue);
    setIsGuardrailOpen(true);
  };

  const handleSaveGuardrail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let condition: Record<string, any> = {};
    if (grRuleType === 'keyword_block') {
      condition = {
        keywords: grConditionValue.split(',').map(k => k.trim()).filter(Boolean)
      };
      if (condition.keywords.length === 0) {
        alert('Vui lòng nhập ít nhất 1 từ khóa');
        return;
      }
    } else if (grRuleType === 'intent_handoff') {
      condition = {
        intents: grConditionValue.split(',').map(k => k.trim()).filter(Boolean)
      };
      if (condition.intents.length === 0) {
        alert('Vui lòng nhập ít nhất 1 ý định (intent)');
        return;
      }
    } else if (grRuleType === 'max_turns_handoff') {
      const turns = parseInt(grConditionValue, 10);
      if (isNaN(turns) || turns <= 0) {
        alert('Số lượt chat phải lớn hơn 0');
        return;
      }
      condition = { maxTurns: turns };
    } else if (grRuleType === 'stale_data_block') {
      const mins = parseInt(grConditionValue, 10);
      if (isNaN(mins) || mins <= 0) {
        alert('Số phút quá hạn phải lớn hơn 0');
        return;
      }
      condition = { staleMinutes: mins };
    }

    const payload = {
      id: editingGuardrail?.id,
      inboxId: grInboxId === 'all' ? null : parseInt(grInboxId, 10),
      ruleType: grRuleType,
      condition,
      action: grAction,
      enabled: grEnabled
    };

    startTransition(async () => {
      const res = await saveGuardrailAction(teamId, payload);
      if (res.success && res.data) {
        if (editingGuardrail) {
          setGuardrails(prev => prev.map(g => g.id === editingGuardrail.id ? res.data : g));
        } else {
          setGuardrails(prev => [res.data, ...prev]);
        }
        setIsGuardrailOpen(false);
      } else {
        alert(res.error || 'Lưu quy tắc thất bại');
      }
    });
  };

  const handleDeleteGuardrail = async (guardrailId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa Quy tắc bảo vệ này?')) return;
    
    startTransition(async () => {
      const res = await deleteGuardrailAction(teamId, guardrailId);
      if (res.success) {
        setGuardrails(prev => prev.filter(g => g.id !== guardrailId));
      } else {
        alert(res.error || 'Xóa quy tắc thất bại');
      }
    });
  };

  // ─── EVENT LOGS HANDLERS ───
  const handleRefreshEvents = async () => {
    startTransition(async () => {
      const inboxIdVal = selectedEventInbox === 'all' ? undefined : parseInt(selectedEventInbox, 10);
      const eventTypeVal = selectedEventType === 'all' ? undefined : selectedEventType;
      
      const res = await getEventsAction(teamId, {
        inboxId: inboxIdVal,
        eventType: eventTypeVal,
        limit: 50
      });

      if (res.success && res.data) {
        setEvents(res.data);
      } else {
        alert(res.error || 'Không thể làm mới nhật ký sự kiện');
      }
    });
  };

  // Channel helper styling
  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'telegram':
        return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase">Telegram</span>;
      case 'zalo':
        return <span className="bg-blue-600/10 text-blue-400 border border-blue-600/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase">Zalo OA</span>;
      case 'facebook':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase">Facebook</span>;
      case 'pancake':
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase">Pancake</span>;
      default:
        return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase">{channel}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header động theo tab */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Bot className="h-6 w-6 text-blue-500" />
            {activeTab === 'inboxes' && 'Cấu hình Hòm thư (Inboxes)'}
            {activeTab === 'guardrails' && 'Hàng rào Bảo vệ (Guardrails)'}
            {activeTab === 'quota' && 'Giới hạn & Hạn mức (Quotas)'}
            {activeTab === 'logs' && 'Nhật ký Hoạt động (Event Logs)'}
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            {activeTab === 'inboxes' && 'Kết nối các kênh chat, phân quyền system prompt chỉ thị và cấu hình bot.'}
            {activeTab === 'guardrails' && 'Thiết lập các quy tắc an toàn bảo vệ bot: chặn từ xấu, giới hạn lượt chat, stale cache.'}
            {activeTab === 'quota' && 'Giám sát tài nguyên, số tin nhắn và AI call đã sử dụng trong ngày của các Inbox.'}
            {activeTab === 'logs' && 'Lịch sử nhật ký hoạt động hệ thống: cuộc gọi AI, đồng bộ snapshot, kích hoạt guardrail.'}
          </p>
        </div>

        {/* Nút action động */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'inboxes' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tạo Inbox mới
            </button>
          )}
          {activeTab === 'guardrails' && (
            <button
              onClick={handleOpenCreateGuardrail}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/10 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Thêm quy tắc mới
            </button>
          )}
          {activeTab === 'logs' && (
            <button
              onClick={handleRefreshEvents}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
              Làm mới nhật ký
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation Bar */}
      <div className="flex border-b border-white/5 gap-6 pb-px">
        <button
          onClick={() => setActiveTab('inboxes')}
          className={`pb-3 text-xs font-bold px-1 relative transition-all cursor-pointer ${
            activeTab === 'inboxes' ? 'text-blue-400 font-extrabold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📨 Inboxes ({inboxes.length})
          {activeTab === 'inboxes' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full animate-fade-in" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('guardrails')}
          className={`pb-3 text-xs font-bold px-1 relative transition-all cursor-pointer ${
            activeTab === 'guardrails' ? 'text-purple-400 font-extrabold' : 'text-gray-400 hover:text-white'
          }`}
        >
          🛡️ Hàng rào ({guardrails.length})
          {activeTab === 'guardrails' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500 rounded-full animate-fade-in" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('quota')}
          className={`pb-3 text-xs font-bold px-1 relative transition-all cursor-pointer ${
            activeTab === 'quota' ? 'text-amber-400 font-extrabold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Quota Dashboard
          {activeTab === 'quota' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500 rounded-full animate-fade-in" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-xs font-bold px-1 relative transition-all cursor-pointer ${
            activeTab === 'logs' ? 'text-emerald-400 font-extrabold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📋 Nhật ký Logs ({events.length})
          {activeTab === 'logs' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      {/* ─── TAB CONTENT 1: INBOXES ─── */}
      {activeTab === 'inboxes' && (
        <div className="space-y-6 animate-fade-up">
          {/* Warning note */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3 backdrop-blur-md">
            <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-white">Lưu ý kết nối:</strong> Trước khi liên kết Inbox, bạn cần vào <a href={`/connect-hub/t/${teamId}/connections`} className="text-blue-400 underline font-extrabold">Connect Hub</a> để thêm kết nối tương ứng (Telegram Bot Token, Zalo OA Access Token, Pancake API Key). Nếu Inbox không được gán Connection, AI sẽ không thể gửi tin nhắn phản hồi thực tế cho khách.
            </div>
          </div>

          {inboxes.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-gray-900/10 p-16 text-center text-gray-500 text-xs font-medium">
              Bạn chưa có Inbox nào. Bấm nút "Tạo Inbox mới" ở trên để bắt đầu.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inboxes.map((inbox) => (
                <div 
                  key={inbox.id} 
                  className={`rounded-2xl border transition-all p-5 bg-white/5 flex flex-col justify-between backdrop-blur-md ${
                    inbox.status === 'active' ? 'border-white/5 hover:border-blue-500/20' : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Inbox Title & Channel */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-white text-sm leading-tight">{inbox.name}</h3>
                          {getChannelBadge(inbox.channel)}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">ID: #{inbox.id}</span>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(inbox)}
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${
                          inbox.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-gray-800 text-gray-400 border-gray-750 hover:bg-gray-700'
                        }`}
                      >
                        {inbox.status === 'active' ? '● Hoạt động' : '○ Tạm dừng'}
                      </button>
                    </div>

                    {/* Connection Status */}
                    <div className="rounded-xl bg-gray-950/40 p-3 border border-white/5 flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-500">Kết nối (Connect Hub):</span>
                      {inbox.connectionId ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          ID #{inbox.connectionId}
                        </span>
                      ) : (
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Chưa liên kết
                        </span>
                      )}
                    </div>

                    {/* Quotas Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-gray-950/20 rounded-xl p-3 border border-white/5">
                      <div className="space-y-1">
                        <span className="text-gray-500 block">Tin nhắn hôm nay:</span>
                        <strong className="text-white font-mono">{inbox.dailyMessageCount} / {inbox.dailyMessageLimit}</strong>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-500 block">AI Gọi hôm nay:</span>
                        <strong className="text-white font-mono">{inbox.dailyAiCallCount} / {inbox.dailyAiCallLimit}</strong>
                      </div>
                    </div>

                    {/* Prompt Preview */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Chỉ thị AI (System Prompt)</span>
                      <p className="text-xs text-gray-400 leading-relaxed bg-gray-950/40 p-3 rounded-xl border border-white/5 line-clamp-2">
                        {inbox.systemPrompt || 'Không có chỉ thị tùy chỉnh'}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                    <button
                      onClick={() => handleOpenEdit(inbox)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Sửa cấu hình
                    </button>
                    <button
                      onClick={() => handleDelete(inbox.id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa Inbox
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT 2: GUARDRAILS (Phase 5) ─── */}
      {activeTab === 'guardrails' && (
        <div className="space-y-6 animate-fade-up">
          {/* Intro Guardrail banner */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 flex gap-3 backdrop-blur-md">
            <Shield className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-white">Nguyên lý hoạt động Hàng rào:</strong> Hệ thống tự động kiểm tra nội dung tin nhắn inbound trước khi kích hoạt gọi AI. Nếu vi phạm, hệ thống sẽ thực hiện hành động cấu hình sẵn (<strong className="text-amber-400">handoff</strong> chuyển nhân viên, <strong className="text-red-400">block</strong> hủy trả lời, hoặc <strong className="text-yellow-400">warn</strong> cảnh báo).
            </div>
          </div>

          {guardrails.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-gray-900/10 p-16 text-center text-gray-500 text-xs font-medium">
              Bạn chưa có Quy tắc bảo vệ nào. Bấm nút "Thêm quy tắc mới" ở trên để bắt đầu thiết lập.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {guardrails.map((gr) => {
                const matchedInbox = inboxes.find(ib => ib.id === gr.inboxId);
                const isGrActive = gr.enabled === 1;

                // Render condition display text
                let conditionLabel = '';
                let conditionDetail = '';
                if (gr.ruleType === 'keyword_block') {
                  conditionLabel = 'Danh sách từ khóa bị chặn';
                  conditionDetail = Array.isArray(gr.condition?.keywords) 
                    ? gr.condition.keywords.join(', ') 
                    : 'Không cấu hình';
                } else if (gr.ruleType === 'intent_handoff') {
                  conditionLabel = 'Ý định (Intent) chuyển giao nhân viên';
                  conditionDetail = Array.isArray(gr.condition?.intents) 
                    ? gr.condition.intents.join(', ') 
                    : 'Không cấu hình';
                } else if (gr.ruleType === 'max_turns_handoff') {
                  conditionLabel = 'Lượt chat AI liên tiếp tối đa';
                  conditionDetail = `${gr.condition?.maxTurns || 3} lượt`;
                } else if (gr.ruleType === 'stale_data_block') {
                  conditionLabel = 'Thời gian snapshot quá stale (phút)';
                  conditionDetail = `${gr.condition?.staleMinutes || 60} phút`;
                }

                return (
                  <div
                    key={gr.id}
                    className={`rounded-2xl border p-5 bg-white/5 flex flex-col justify-between backdrop-blur-md transition-all ${
                      isGrActive ? 'border-white/5 hover:border-purple-500/20' : 'border-white/5 opacity-60'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Title & Toggle Enabled */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-sm font-extrabold text-white leading-tight">
                            {gr.ruleType === 'keyword_block' && '🚫 Chặn từ khóa xấu'}
                            {gr.ruleType === 'intent_handoff' && '🔄 Chuyển nhân viên khi có ý định cụ thể'}
                            {gr.ruleType === 'max_turns_handoff' && '⏱️ Giới hạn số lượt chat bot'}
                            {gr.ruleType === 'stale_data_block' && '❄️ Chặn dữ liệu cache quá hạn (Stale)'}
                          </h3>
                          <span className="text-[10px] text-gray-500 font-mono">ID: #{gr.id}</span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                          isGrActive 
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-gray-800 text-gray-400 border-gray-750'
                        }`}>
                          {isGrActive ? 'Đang bật' : 'Đã tắt'}
                        </span>
                      </div>

                      {/* Scope and Action Info */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-gray-950/20 rounded-xl p-3 border border-white/5">
                        <div>
                          <span className="text-gray-500 block">Phạm vi:</span>
                          <strong className="text-white">
                            {matchedInbox ? `Inbox: ${matchedInbox.name}` : 'Áp dụng toàn Workspace'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Hành động vi phạm:</span>
                          <span className={`font-extrabold uppercase text-[10px] ${
                            gr.action === 'block' ? 'text-red-400' : gr.action === 'handoff' ? 'text-amber-400' : 'text-yellow-400'
                          }`}>
                            {gr.action}
                          </span>
                        </div>
                      </div>

                      {/* Condition Details */}
                      <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">
                          {conditionLabel}
                        </span>
                        <p className="text-xs text-white leading-relaxed font-mono font-medium truncate">
                          {conditionDetail}
                        </p>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                      <button
                        onClick={() => handleOpenEditGuardrail(gr)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Sửa quy tắc
                      </button>
                      <button
                        onClick={() => handleDeleteGuardrail(gr.id)}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT 3: QUOTA DASHBOARD (Phase 5) ─── */}
      {activeTab === 'quota' && (
        <div className="space-y-6 animate-fade-up">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 backdrop-blur-md">
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-white">Đặt lại hạn mức hàng ngày:</strong> Hạn mức tin nhắn và AI call của tất cả Inbox được tự động reset về <strong className="text-white">0</strong> mỗi ngày lúc <strong className="text-white">00:00 UTC+7 (nửa đêm)</strong> thông qua API Endpoint <code className="bg-gray-950 px-1 py-0.5 rounded font-mono text-[10px]">/api/cron/hero-care-reset</code>.
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">Hạn mức các Inbox hoạt động hôm nay</h3>
            
            {inboxes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs font-medium">Chưa cấu hình Inbox nào để giám sát.</div>
            ) : (
              <div className="space-y-8">
                {inboxes.map((ib) => {
                  const msgPercent = Math.min(Math.round(((ib.dailyMessageCount || 0) / (ib.dailyMessageLimit || 50)) * 100), 100);
                  const aiPercent = Math.min(Math.round(((ib.dailyAiCallCount || 0) / (ib.dailyAiCallLimit || 20)) * 100), 100);

                  return (
                    <div key={ib.id} className="space-y-4 border-b border-white/5 pb-6 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs leading-none">{ib.name}</span>
                          {getChannelBadge(ib.channel)}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">ID: #{ib.id}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Progress Messages */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-gray-400">Số lượng tin nhắn gửi đi:</span>
                            <span className="text-white font-mono font-bold">
                              {ib.dailyMessageCount} / {ib.dailyMessageLimit} cuộn ({msgPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                msgPercent >= 90 ? 'bg-red-500' : msgPercent >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} 
                              style={{ width: `${msgPercent}%` }} 
                            />
                          </div>
                        </div>

                        {/* Progress AI Call */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-gray-400">Số lượt gọi API AI:</span>
                            <span className="text-white font-mono font-bold">
                              {ib.dailyAiCallCount} / {ib.dailyAiCallLimit} lần ({aiPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                aiPercent >= 90 ? 'bg-red-500' : aiPercent >= 70 ? 'bg-yellow-500' : 'bg-cyan-500'
                              }`} 
                              style={{ width: `${aiPercent}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 4: EVENT LOGS (Phase 5) ─── */}
      {activeTab === 'logs' && (
        <div className="space-y-6 animate-fade-up">
          {/* Filters Bar for logs */}
          <div className="bg-white/5 p-4 border border-white/10 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-gray-400 font-bold shrink-0">Loại Event:</span>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="bg-gray-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer w-full sm:w-48"
              >
                <option value="all">Tất cả sự kiện</option>
                <option value="webhook_received">webhook_received</option>
                <option value="message_sent">message_sent</option>
                <option value="snapshot_refreshed">snapshot_refreshed</option>
                <option value="guardrail_triggered">guardrail_triggered</option>
                <option value="ai_invocation">ai_invocation</option>
                <option value="learning_completed">learning_completed</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-gray-400 font-bold shrink-0">Lọc theo Inbox:</span>
              <select
                value={selectedEventInbox}
                onChange={(e) => setSelectedEventInbox(e.target.value)}
                className="bg-gray-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer w-full sm:w-48"
              >
                <option value="all">Tất cả Inbox</option>
                {inboxes.map(ib => (
                  <option key={ib.id} value={ib.id}>{ib.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-white/5">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Thời gian</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Loại Event</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Hòm thư (Inbox)</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái xử lý</th>
                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {events.map((event) => {
                    const matchedInbox = inboxes.find(ib => ib.id === event.inboxId);
                    return (
                      <tr key={event.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                          {new Date(event.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-white/5 text-[10px] font-bold font-mono">
                            {event.eventType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-white font-bold">
                          {matchedInbox ? matchedInbox.name : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          {event.processedAt ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" />
                              Đã xử lý
                            </span>
                          ) : (
                            <span className="text-gray-400 font-semibold animate-pulse">
                              Đang chờ...
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => setViewingEvent(event)}
                            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            Xem Chi Tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {events.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-500 font-medium">
                        Không tìm thấy sự kiện nào khớp bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── INBOX DRAWER (Giữ nguyên form code cũ) ─── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex-1" onClick={() => setIsOpen(false)} />
          
          <div className="w-full max-w-xl bg-gray-900 border-l border-white/10 p-6 overflow-y-auto flex flex-col justify-between shadow-2xl h-full animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  {editingInbox ? 'Chỉnh sửa Inbox' : 'Tạo Inbox mới'}
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} id="inbox-form" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Tên Hòm thư (Inbox)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Telegram CSKH Sỉ"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Kênh nhận tin</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['telegram', 'zalo', 'facebook', 'pancake'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleChannelChange(c)}
                        className={`py-2 px-1 rounded-lg border text-[11px] font-bold uppercase transition-all cursor-pointer ${
                          formData.channel === c
                            ? 'bg-blue-600/10 text-blue-400 border-blue-500/50'
                            : 'bg-gray-950 border-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {c === 'zalo' ? 'Zalo OA' : c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 flex justify-between">
                    <span>Liên kết kết nối (Connect Hub)</span>
                    <span className="text-gray-500 font-normal">Kênh: {formData.channel}</span>
                  </label>
                  <select
                    value={formData.connectionId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, connectionId: e.target.value ? parseInt(e.target.value, 10) : null }))}
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">-- Chọn kết nối --</option>
                    {connections
                      .filter(c => c.appSlug === formData.channel)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.connectionName} (ID: #{c.id})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                    Chỉ thị AI (System Prompt)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả vai trò, nhiệm vụ của AI trả lời tự động cho hòm thư này..."
                    value={formData.systemPrompt || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Câu phản hồi mặc định dự phòng</label>
                  <input
                    type="text"
                    required
                    value={formData.defaultReply}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultReply: e.target.value }))}
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Giới hạn Tin nhắn/Ngày</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formData.dailyMessageLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, dailyMessageLimit: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Giới hạn AI Call/Ngày</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formData.dailyAiCallLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, dailyAiCallLimit: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-white/5 pt-4 flex items-center justify-end gap-3 shrink-0 mt-6">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="inbox-form"
                disabled={isPending}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                {isPending ? 'Đang xử lý...' : (editingInbox ? 'Lưu thay đổi' : 'Tạo mới')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── GUARDRAILS DRAWER (Phase 5) ─── */}
      {isGuardrailOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex-1" onClick={() => setIsGuardrailOpen(false)} />
          
          <div className="w-full max-w-xl bg-gray-900 border-l border-white/10 p-6 overflow-y-auto flex flex-col justify-between shadow-2xl h-full animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  {editingGuardrail ? 'Chỉnh sửa Quy tắc' : 'Thêm Quy tắc Hàng rào'}
                </h3>
                <button onClick={() => setIsGuardrailOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGuardrail} id="guardrail-form" className="space-y-4">
                {/* Inbox target */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Áp dụng cho Hòm thư</label>
                  <select
                    value={grInboxId}
                    onChange={(e) => setGrInboxId(e.target.value)}
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="all">Toàn bộ Workspace (Global)</option>
                    {inboxes.map(ib => (
                      <option key={ib.id} value={ib.id}>{ib.name}</option>
                    ))}
                  </select>
                </div>

                {/* Rule type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Loại quy tắc hàng rào</label>
                  <select
                    value={grRuleType}
                    onChange={(e) => {
                      setGrRuleType(e.target.value as any);
                      // Default condition template values
                      if (e.target.value === 'max_turns_handoff') setGrConditionValue('3');
                      else if (e.target.value === 'stale_data_block') setGrConditionValue('60');
                      else setGrConditionValue('');
                    }}
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="keyword_block">🚫 Chặn từ khóa xấu (Keyword Block)</option>
                    <option value="intent_handoff">🔄 Chuyển giao khi có ý định (Intent Handoff)</option>
                    <option value="max_turns_handoff">⏱️ Giới hạn số lượt chat bot liên tiếp</option>
                    <option value="stale_data_block">❄️ Chặn dữ liệu cache quá stale (quá hạn)</option>
                  </select>
                </div>

                {/* Condition Value dynamic input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    {grRuleType === 'keyword_block' && 'Các từ khóa cấm (cách nhau bằng dấu phẩy)'}
                    {grRuleType === 'intent_handoff' && 'Các ý định cần handoff (ví dụ: refund, complaint, cancel)'}
                    {grRuleType === 'max_turns_handoff' && 'Số lượt chat AI liên tục tối đa (1-10)'}
                    {grRuleType === 'stale_data_block' && 'Thời gian quá hạn tối đa của snapshot (phút)'}
                  </label>
                  
                  {grRuleType === 'keyword_block' || grRuleType === 'intent_handoff' ? (
                    <textarea
                      rows={3}
                      required
                      value={grConditionValue}
                      onChange={(e) => setGrConditionValue(e.target.value)}
                      placeholder={grRuleType === 'keyword_block' ? 'ví dụ: hack, scam, lua dao, mat mat' : 'ví dụ: refund, complaint, cancel, tra hang, khieu nai'}
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors leading-relaxed font-mono"
                    />
                  ) : (
                    <input
                      type="number"
                      required
                      min={1}
                      value={grConditionValue}
                      onChange={(e) => setGrConditionValue(e.target.value)}
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  )}
                </div>

                {/* Action on violation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Hành động xử lý khi vi phạm</label>
                  <select
                    value={grAction}
                    onChange={(e) => setGrAction(e.target.value as any)}
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="handoff">Chuyển tiếp nhân viên hỗ trợ (Handoff)</option>
                    <option value="block">Chặn gửi tin & Hủy (Block)</option>
                    <option value="warn">Gửi tin cảnh báo cho người vận hành (Warn)</option>
                  </select>
                </div>

                {/* Enabled checkbox */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 block">Kích hoạt</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="gr-enabled"
                      checked={grEnabled === 1}
                      onChange={(e) => setGrEnabled(e.target.checked ? 1 : 0)}
                      className="h-4 w-4 bg-gray-950 border border-white/10 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="gr-enabled" className="text-xs text-gray-300 cursor-pointer">Bật quy tắc này hoạt động ngay</label>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-white/5 pt-4 flex items-center justify-end gap-3 shrink-0 mt-6">
              <button
                type="button"
                onClick={() => setIsGuardrailOpen(false)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="guardrail-form"
                disabled={isPending}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-lg shadow-purple-500/10 cursor-pointer"
              >
                {isPending ? 'Đang xử lý...' : (editingGuardrail ? 'Lưu thay đổi' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DETAIL VIEW EVENT LOG (Phase 5) ─── */}
      {viewingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                Chi tiết sự kiện nhật ký #{viewingEvent.id}
              </h3>
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin text-xs text-gray-300">
              <div className="grid grid-cols-2 gap-4 bg-gray-950/40 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-gray-500 font-bold block uppercase tracking-wider text-[9px]">Thời gian sự kiện:</span>
                  <span className="text-white font-mono">{new Date(viewingEvent.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block uppercase tracking-wider text-[9px]">Loại sự kiện (Type):</span>
                  <span className="text-white font-mono font-bold text-emerald-400">{viewingEvent.eventType}</span>
                </div>
              </div>

              {/* Event Payload CodeViewer */}
              <div className="space-y-1.5">
                <span className="text-gray-500 font-bold block uppercase tracking-wider text-[9px]">Thông tin chi tiết (Payload JSON):</span>
                <div className="bg-gray-950 rounded-xl border border-white/5 p-4 overflow-x-auto max-h-[40vh] scrollbar-thin">
                  <pre className="font-mono text-[11px] text-gray-300 leading-relaxed whitespace-pre">
                    {JSON.stringify(viewingEvent.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
