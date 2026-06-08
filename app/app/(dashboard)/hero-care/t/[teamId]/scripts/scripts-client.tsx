'use client';

import { useState, useTransition } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Pause,
  Tag,
  AlertCircle,
  X,
  Check,
  Filter,
  Sparkles
} from 'lucide-react';
import {
  createScriptAction,
  updateScriptAction,
  deleteScriptAction
} from '@/lib/db/hero-care-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface Script {
  id: number;
  inboxId: number | null;
  triggerText: string;
  keywords: unknown;
  negativeKeywords: unknown;
  triggerExamples: unknown;
  intent: string | null;
  confidenceThreshold: number | null;
  replyText: string;
  status: string;
}

interface Inbox {
  id: number;
  name: string;
  channel: string;
}

interface ScriptsClientProps {
  teamId: number;
  initialScripts: Script[];
  inboxes: Inbox[];
}

export default function ScriptsClient({ teamId, initialScripts, inboxes }: ScriptsClientProps) {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInboxFilter, setSelectedInboxFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected'>('active');
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);

  // Form State
  const [formInboxId, setFormInboxId] = useState<string>('all');
  const [formTriggerText, setFormTriggerText] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formNegativeKeywords, setFormNegativeKeywords] = useState('');
  const [formReplyText, setFormReplyText] = useState('');
  const [formIntent, setFormIntent] = useState('');
  const [formThreshold, setFormThreshold] = useState(70);
  const [formStatus, setFormStatus] = useState<'active' | 'paused' | 'pending' | 'rejected'>('active');

  const openCreateModal = () => {
    setEditingScript(null);
    setFormInboxId(inboxes.length > 0 ? inboxes[0].id.toString() : 'all');
    setFormTriggerText('');
    setFormKeywords('');
    setFormNegativeKeywords('');
    setFormReplyText('');
    setFormIntent('general');
    setFormThreshold(70);
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (script: Script) => {
    setEditingScript(script);
    setFormInboxId(script.inboxId ? script.inboxId.toString() : 'all');
    setFormTriggerText(script.triggerText);
    
    // Parse keywords
    const keywordsArr = Array.isArray(script.keywords) ? script.keywords : [];
    setFormKeywords(keywordsArr.join(', '));

    const negKeywordsArr = Array.isArray(script.negativeKeywords) ? script.negativeKeywords : [];
    setFormNegativeKeywords(negKeywordsArr.join(', '));

    setFormReplyText(script.replyText);
    setFormIntent(script.intent || 'general');
    setFormThreshold(script.confidenceThreshold || 70);
    setFormStatus(script.status as 'active' | 'paused' | 'pending' | 'rejected');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTriggerText.trim() || !formReplyText.trim()) {
      showToast('Vui lòng điền đầy đủ Câu hỏi mẫu và Nội dung phản hồi', 'error');
      return;
    }

    const keywords = formKeywords.split(',').map(k => k.trim()).filter(Boolean);
    const negativeKeywords = formNegativeKeywords.split(',').map(k => k.trim()).filter(Boolean);
    const inboxIdVal = formInboxId === 'all' ? null : parseInt(formInboxId, 10);

    const payload = {
      inboxId: inboxIdVal,
      triggerText: formTriggerText,
      keywords,
      negativeKeywords,
      triggerExamples: [],
      intent: formIntent || null,
      confidenceThreshold: formThreshold,
      replyText: formReplyText,
      status: formStatus
    };

    startTransition(async () => {
      if (editingScript) {
        // Update Action
        const res = await updateScriptAction(teamId, editingScript.id, payload);
        if (res.success && res.data) {
          setScripts(prev => prev.map(s => (s.id === editingScript.id ? (res.data as Script) : s)));
          showToast('Đã cập nhật kịch bản FAQ thành công', 'success');
          setIsModalOpen(false);
        } else {
          showToast(res.error || 'Lỗi khi cập nhật kịch bản', 'error');
        }
      } else {
        // Create Action
        const res = await createScriptAction(teamId, payload);
        if (res.success && res.data) {
          setScripts(prev => [res.data as Script, ...prev]);
          showToast('Đã tạo kịch bản FAQ mới thành công', 'success');
          setIsModalOpen(false);
        } else {
          showToast(res.error || 'Lỗi khi tạo kịch bản', 'error');
        }
      }
    });
  };

  const handleDelete = async (scriptId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kịch bản FAQ này?')) return;
    startTransition(async () => {
      const res = await deleteScriptAction(teamId, scriptId);
      if (res.success) {
        setScripts(prev => prev.filter(s => s.id !== scriptId));
        showToast('Đã xóa kịch bản FAQ thành công', 'success');
      } else {
        showToast(res.error || 'Lỗi khi xóa kịch bản', 'error');
      }
    });
  };

  const handleToggleStatus = async (script: Script) => {
    const newStatus = script.status === 'active' ? 'paused' : 'active';
    const res = await updateScriptAction(teamId, script.id, { status: newStatus });
    if (res.success && res.data) {
      setScripts(prev => prev.map(s => (s.id === script.id ? (res.data as Script) : s)));
      showToast(
        newStatus === 'active' ? 'Đã kích hoạt kịch bản' : 'Đã tạm dừng kịch bản',
        'info'
      );
    } else {
      showToast(res.error || 'Lỗi khi thay đổi trạng thái', 'error');
    }
  };

  const handleApprove = async (script: Script) => {
    startTransition(async () => {
      const res = await updateScriptAction(teamId, script.id, { status: 'active' });
      if (res.success && res.data) {
        setScripts(prev => prev.map(s => (s.id === script.id ? (res.data as Script) : s)));
        showToast('Đã duyệt kịch bản FAQ thành công', 'success');
      } else {
        showToast(res.error || 'Lỗi khi duyệt kịch bản', 'error');
      }
    });
  };

  const handleReject = async (script: Script) => {
    startTransition(async () => {
      const res = await updateScriptAction(teamId, script.id, { status: 'rejected' });
      if (res.success && res.data) {
        setScripts(prev => prev.map(s => (s.id === script.id ? (res.data as Script) : s)));
        showToast('Đã từ chối kịch bản FAQ', 'info');
      } else {
        showToast(res.error || 'Lỗi khi từ chối kịch bản', 'error');
      }
    });
  };

  const pendingCount = scripts.filter(s => s.status === 'pending').length;
  const approvedCount = scripts.filter(s => s.status === 'active' || s.status === 'paused').length;
  const rejectedCount = scripts.filter(s => s.status === 'rejected').length;

  // Filter scripts
  const filteredScripts = scripts.filter(s => {
    // Tab filter
    if (activeTab === 'pending') {
      if (s.status !== 'pending') return false;
    } else if (activeTab === 'active') {
      if (s.status !== 'active' && s.status !== 'paused') return false;
    } else if (activeTab === 'rejected') {
      if (s.status !== 'rejected') return false;
    }

    // Text query search
    const textMatch = s.triggerText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.replyText.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (searchQuery && !textMatch) return false;

    // Inbox filter
    if (selectedInboxFilter !== 'all') {
      const inboxIdVal = parseInt(selectedInboxFilter, 10);
      return s.inboxId === inboxIdVal;
    }

    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-cyan-400" />
            Kịch bản FAQ
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {filteredScripts.length} kịch bản
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Thiết lập câu hỏi và kịch bản trả lời nhanh. Hệ thống sẽ tự động quét trùng khớp từ khóa để trả lời khách hàng mà không cần tốn phí gọi AI.
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-500/15 cursor-pointer self-start sm:self-auto transition-all"
        >
          <Plus className="h-4 w-4" />
          Thêm kịch bản mới
        </button>
      </div>

      {/* Filter Quick Search & Inbox Selector */}
      <div className="bg-white/5 p-4 border border-white/10 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-md">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Tìm theo mẫu câu hỏi, câu trả lời..."
            className="w-full pl-9 bg-gray-900/50 border border-white/5 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 text-xs py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 hidden sm:inline">Lọc theo Inbox:</span>
          <select
            value={selectedInboxFilter}
            onChange={(e) => setSelectedInboxFilter(e.target.value)}
            className="bg-gray-900/50 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer w-full md:w-48"
          >
            <option value="all">Tất cả Inbox</option>
            {inboxes.map(ib => (
              <option key={ib.id} value={ib.id}>{ib.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab bar (Phase 4) */}
      <div className="flex border-b border-white/10 gap-4 pb-px animate-fade-up">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 text-xs font-bold px-1 relative transition-all cursor-pointer ${
            activeTab === 'active' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          ✅ Đã duyệt ({approvedCount})
          {activeTab === 'active' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-xs font-bold px-1 relative transition-all cursor-pointer ${
            activeTab === 'pending' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          📋 Chờ duyệt ({pendingCount})
          {pendingCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[9px] font-extrabold border border-yellow-500/20">
              New
            </span>
          )}
          {activeTab === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`pb-3 text-xs font-bold px-1 relative transition-all cursor-pointer ${
            activeTab === 'rejected' ? 'text-red-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          ❌ Từ chối ({rejectedCount})
          {activeTab === 'rejected' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredScripts.map(script => {
          const keywordsArr = Array.isArray(script.keywords) ? script.keywords : [];
          const negKeywordsArr = Array.isArray(script.negativeKeywords) ? script.negativeKeywords : [];
          const matchedInbox = inboxes.find(ib => ib.id === script.inboxId);
          const isActive = script.status === 'active';

          let cardStyle = "bg-white/5 border border-white/5";
          if (script.status === 'pending') {
            cardStyle = "bg-yellow-500/5 border border-yellow-500/20 shadow-md shadow-yellow-500/5 border-dashed";
          } else if (script.status === 'rejected') {
            cardStyle = "bg-red-500/5 border border-red-500/20 opacity-60";
          } else if (script.status === 'paused') {
            cardStyle = "bg-white/5 border border-white/5 opacity-60";
          }

          return (
            <div
              key={script.id}
              className={`${cardStyle} rounded-2xl p-5 hover:border-white/10 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 backdrop-blur-xl`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white leading-snug">
                    {script.triggerText}
                  </h3>
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-gray-800 text-gray-400 border border-white/5 uppercase">
                      {matchedInbox ? `Inbox: ${matchedInbox.name}` : 'Tất cả Inbox'}
                    </span>
                    {script.intent && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                        Intent: {script.intent}
                      </span>
                    )}
                    {script.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase animate-pulse">
                        Chờ duyệt
                      </span>
                    )}
                    {script.status === 'rejected' && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                        Đã từ chối
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {script.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(script)}
                        className="p-1.5 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all font-bold cursor-pointer"
                        title="Duyệt kịch bản"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleReject(script)}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-bold cursor-pointer"
                        title="Từ chối kịch bản"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {script.status === 'rejected' && (
                    <>
                      <button
                        onClick={() => handleApprove(script)}
                        className="p-1.5 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all font-bold cursor-pointer"
                        title="Khôi phục & Duyệt"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(script.id)}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-bold cursor-pointer"
                        title="Xóa vĩnh viễn"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {(script.status === 'active' || script.status === 'paused') && (
                    <>
                      <button
                        onClick={() => handleToggleStatus(script)}
                        className={`p-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                        }`}
                        title={isActive ? 'Tạm dừng kịch bản' : 'Kích hoạt kịch bản'}
                      >
                        {isActive ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => openEditModal(script)}
                        className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(script.id)}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                        title="Xóa kịch bản"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Keywords list */}
              {(keywordsArr.length > 0 || negKeywordsArr.length > 0) && (
                <div className="bg-gray-950/40 border border-white/5 rounded-xl p-3 space-y-2">
                  {keywordsArr.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="font-bold text-green-400 uppercase tracking-wider text-[9px]">Có từ khóa:</span>
                      {keywordsArr.map((k, idx) => (
                        <span key={idx} className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-md font-semibold font-mono">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  {negKeywordsArr.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="font-bold text-red-400 uppercase tracking-wider text-[9px]">Không chứa:</span>
                      {negKeywordsArr.map((k, idx) => (
                        <span key={idx} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md font-semibold font-mono">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reply Content */}
              <div className="space-y-1 bg-gray-950/20 border border-white/5 rounded-xl p-3">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Robot phản hồi:</span>
                <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {script.replyText}
                </p>
              </div>

              {/* Stats / Threshold info */}
              <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1">
                <span>Ngưỡng tin cậy: {script.confidenceThreshold || 70}%</span>
                <span>ID: #{script.id}</span>
              </div>
            </div>
          );
        })}

        {filteredScripts.length === 0 && (
          <div className="col-span-1 lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl py-16 text-center">
            <AlertCircle className="h-10 w-10 text-cyan-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-300">Không tìm thấy kịch bản FAQ nào</p>
            <p className="text-xs text-gray-500 mt-1">Hãy bấm nút "Thêm kịch bản mới" để tạo kịch bản FAQ đầu tiên cho robot.</p>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                {editingScript ? 'Cập nhật kịch bản FAQ' : 'Tạo kịch bản FAQ mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Inbox select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Áp dụng cho Inbox
                </label>
                <select
                  value={formInboxId}
                  onChange={(e) => setFormInboxId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all" className="bg-gray-900 text-white">Tất cả Inbox</option>
                  {inboxes.map(ib => (
                    <option key={ib.id} value={ib.id} className="bg-gray-900 text-white">{ib.name}</option>
                  ))}
                </select>
              </div>

              {/* Trigger / Trigger text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Câu hỏi mẫu chính (Ví dụ: "Hỏi giá băng keo")
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giá băng keo bao nhiêu một cuộn sỉ"
                  value={formTriggerText}
                  onChange={(e) => setFormTriggerText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600"
                />
              </div>

              {/* Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                    Từ khóa bắt buộc có (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    placeholder="ví dụ: giá sỉ, giá lẻ, giá"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 font-mono text-green-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Từ khóa phủ định (không được chứa)
                  </label>
                  <input
                    type="text"
                    placeholder="ví dụ: hoàn tiền, đổi trả"
                    value={formNegativeKeywords}
                    onChange={(e) => setFormNegativeKeywords(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 font-mono text-red-400"
                  />
                </div>
              </div>

              {/* Response Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Nội dung robot phản hồi
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập nội dung phản hồi robot sẽ nhắn cho khách hàng..."
                  value={formReplyText}
                  onChange={(e) => setFormReplyText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600"
                />
              </div>

              {/* Intent / Threshold */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Ý định / Phân nhóm (Intent)
                  </label>
                  <input
                    type="text"
                    placeholder="ví dụ: pricing, shipping, general"
                    value={formIntent}
                    onChange={(e) => setFormIntent(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Ngưỡng tin cậy khớp (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(parseInt(e.target.value) || 70)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Trạng thái
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="accent-cyan-500"
                    />
                    Kích hoạt hoạt động
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'paused'}
                      onChange={() => setFormStatus('paused')}
                      className="accent-cyan-500"
                    />
                    Tạm dừng hoạt động
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-xs font-bold text-white shadow-md shadow-cyan-500/10 flex items-center gap-1.5"
              >
                {isPending ? (
                  'Đang xử lý...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Lưu kịch bản
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
