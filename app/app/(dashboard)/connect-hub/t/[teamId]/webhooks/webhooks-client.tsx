'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Webhook, Search, Plus, Trash2, AlertCircle, CheckCircle2, X, RefreshCw, 
  Activity, Calendar, Loader2, Copy, Check, Play, Pause, Eye, ShieldCheck, ShieldAlert,
  GitFork, Trash, Save, HelpCircle, CornerDownRight, CheckCircle, XCircle
} from 'lucide-react';
import {
  createWebhookAction,
  toggleWebhookAction,
  deleteWebhookAction,
  getWebhookLogsAction,
  getWebhookFlowAction,
  saveFlowStepsAction,
  getFlowRunsAction,
  getConnectorDetailAction
} from '@/lib/db/connect-hub-actions';

interface WebhooksClientProps {
  teamId: number;
  initialWebhooks: any[];
  connections: {
    id: number;
    appName: string;
    appSlug: string;
    connectionName: string;
  }[];
}

export default function WebhooksClient({ teamId, initialWebhooks, connections }: WebhooksClientProps) {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<any[]>(initialWebhooks);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // States cho Dialog Tạo Webhook
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAppSlug, setSelectedAppSlug] = useState('');
  const [webhookLabel, setWebhookLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ webhook: any; plainSecret: string } | null>(null);

  // States cho Logs Drawer
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);

  // States cho Flow Config
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [flowWebhook, setFlowWebhook] = useState<any | null>(null);
  const [flowData, setFlowData] = useState<{ flow: any; steps: any[] } | null>(null);
  const [editingSteps, setEditingSteps] = useState<any[]>([]);
  const [loadedDetails, setLoadedDetails] = useState<Record<string, any>>({});
  const [flowRuns, setFlowRuns] = useState<any[]>([]);
  const [flowTab, setFlowTab] = useState<'config' | 'history'>('config');
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [isLoadingFlow, setIsLoadingFlow] = useState(false);
  const [selectedRunDetail, setSelectedRunDetail] = useState<any | null>(null);

  // General Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggling status state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const getWebhookUrl = (id: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/api/webhook/${id}`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateWebhook = async () => {
    if (!selectedAppSlug || !webhookLabel.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng chọn Ứng dụng và nhập tên nhãn.' });
      return;
    }

    setIsCreating(true);
    setMessage(null);
    try {
      const res = await createWebhookAction(teamId, {
        appSlug: selectedAppSlug,
        label: webhookLabel.trim()
      });

      if (res.success && res.data) {
        setCreatedResult(res.data);
        // Refresh danh sách
        const listRes = await fetchWebhooks();
        if (listRes) setWebhooks(listRes);
      } else {
        setMessage({ type: 'error', text: res.error || 'Tạo Webhook thất bại.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi hệ thống.' });
    } finally {
      setIsCreating(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const { listWebhooksAction } = await import('@/lib/db/connect-hub-actions');
      const res = await listWebhooksAction(teamId);
      return res.success ? res.data : null;
    } catch {
      return null;
    }
  };

  // --- LOGIC XỬ LÝ FLOW TỰ ĐỘNG ---
  const handleOpenFlowConfig = async (wh: any) => {
    setFlowWebhook(wh);
    setIsFlowOpen(true);
    setIsLoadingFlow(true);
    setFlowTab('config');
    setSelectedRunDetail(null);
    setMessage(null);
    try {
      // 1. Tải flow và steps từ DB
      const res = await getWebhookFlowAction(teamId, wh.id);
      if (res.success && res.data) {
        setFlowData(res.data);
        
        // Chuyển đổi inputMapping từ JSON object thành string định dạng đẹp để người dùng dễ chỉnh sửa
        const stepsWithJsonString = res.data.steps.map((step: any) => {
          let mappingStr = '{}';
          try {
            mappingStr = JSON.stringify(step.inputMapping, null, 2);
          } catch {
            mappingStr = '{}';
          }
          return {
            ...step,
            mappingStr,
            jsonError: null
          };
        });
        setEditingSteps(stepsWithJsonString);

        // 2. Tải metadata chi tiết cho các appSlug đã có sẵn trong các steps của flow
        const appSlugsToLoad = Array.from(new Set(res.data.steps.map((s: any) => s.appSlug))) as string[];
        for (const slug of appSlugsToLoad) {
          if (!loadedDetails[slug]) {
            const detailRes = await getConnectorDetailAction(teamId, slug);
            if (detailRes.success && detailRes.data) {
              setLoadedDetails(prev => ({ ...prev, [slug]: detailRes.data }));
            }
          }
        }

        // 3. Tải lịch sử chạy flow
        const runsRes = await getFlowRunsAction(teamId, res.data.flow.id);
        if (runsRes.success && runsRes.data) {
          setFlowRuns(runsRes.data);
        }
      } else {
        setMessage({ type: 'error', text: res.error || 'Không thể tải cấu hình Flow.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi kết nối hệ thống.' });
    } finally {
      setIsLoadingFlow(false);
    }
  };

  const handleSwitchFlowTab = async (tab: 'config' | 'history') => {
    setFlowTab(tab);
    if (tab === 'history' && flowData?.flow?.id) {
      try {
        const runsRes = await getFlowRunsAction(teamId, flowData.flow.id);
        if (runsRes.success && runsRes.data) {
          setFlowRuns(runsRes.data);
        }
      } catch (err) {
        console.error('Error refreshing runs:', err);
      }
    }
  };

  const handleAddFlowStep = () => {
    if (connections.length === 0) {
      setMessage({ type: 'error', text: 'Bạn cần tạo ít nhất một kết nối API ở tab "Kết nối" trước khi cấu hình Flow.' });
      return;
    }

    const defaultConn = connections[0];
    const newStep = {
      connectionId: defaultConn.id,
      appSlug: defaultConn.appSlug,
      actionSlug: '',
      inputMapping: {},
      mappingStr: '{}',
      jsonError: null
    };
    
    // Tải thông tin actions chi tiết của ứng dụng đầu tiên này
    if (defaultConn.appSlug && !loadedDetails[defaultConn.appSlug]) {
      getConnectorDetailAction(teamId, defaultConn.appSlug).then(res => {
        if (res.success && res.data) {
          setLoadedDetails(prev => ({ ...prev, [defaultConn.appSlug]: res.data }));
        }
      });
    }

    setEditingSteps([...editingSteps, newStep]);
  };

  const handleRemoveFlowStep = (index: number) => {
    const newSteps = [...editingSteps];
    newSteps.splice(index, 1);
    setEditingSteps(newSteps);
  };

  const handleStepConnectionChange = async (index: number, connId: number) => {
    const selectedConn = connections.find(c => c.id === connId);
    if (!selectedConn) return;

    const newSteps = [...editingSteps];
    newSteps[index].connectionId = connId;
    newSteps[index].appSlug = selectedConn.appSlug;
    newSteps[index].actionSlug = ''; // Reset action khi đổi kết nối
    newSteps[index].inputMapping = {};
    newSteps[index].mappingStr = '{}';
    newSteps[index].jsonError = null;
    setEditingSteps(newSteps);

    // Tải thông tin chi tiết các actions cho app mới
    if (!loadedDetails[selectedConn.appSlug]) {
      const res = await getConnectorDetailAction(teamId, selectedConn.appSlug);
      if (res.success && res.data) {
        setLoadedDetails(prev => ({ ...prev, [selectedConn.appSlug]: res.data }));
      }
    }
  };

  const handleStepActionChange = (index: number, actionSlug: string) => {
    const newSteps = [...editingSteps];
    newSteps[index].actionSlug = actionSlug;
    
    // Tạo cấu trúc JSON Input Mapping mẫu từ mô tả schema của action đó
    const appSlug = newSteps[index].appSlug;
    const actionDetails = loadedDetails[appSlug]?.actions?.[actionSlug];
    const properties = actionDetails?.inputProperties || [];
    
    const sampleInput: Record<string, any> = {};
    properties.forEach((prop: any) => {
      // Gợi ý placeholder thích hợp
      sampleInput[prop.name] = prop.required ? `{{payload.${prop.name}}}` : '';
    });

    newSteps[index].inputMapping = sampleInput;
    newSteps[index].mappingStr = JSON.stringify(sampleInput, null, 2);
    newSteps[index].jsonError = null;
    setEditingSteps(newSteps);
  };

  const handleStepMappingChange = (index: number, val: string) => {
    const newSteps = [...editingSteps];
    newSteps[index].mappingStr = val;
    
    // Kiểm tra tính hợp lệ của JSON tại client
    try {
      if (val.trim() === '') {
        newSteps[index].inputMapping = {};
        newSteps[index].jsonError = null;
      } else {
        newSteps[index].inputMapping = JSON.parse(val);
        newSteps[index].jsonError = null;
      }
    } catch (err: any) {
      newSteps[index].jsonError = err.message || 'JSON không hợp lệ';
    }
    
    setEditingSteps(newSteps);
  };

  const handleSaveFlow = async () => {
    if (!flowData?.flow?.id) return;
    
    // Kiểm tra xem có bước nào đang bị lỗi cú pháp JSON hay không
    const hasJsonError = editingSteps.some(step => step.jsonError);
    if (hasJsonError) {
      setMessage({ type: 'error', text: 'Vui lòng sửa các lỗi JSON input mapping trước khi lưu.' });
      return;
    }

    // Kiểm tra xem các bước đã chọn đầy đủ Connection & Action chưa
    const hasEmptyField = editingSteps.some(step => !step.connectionId || !step.actionSlug);
    if (hasEmptyField) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ Kết nối và Hành động cho tất cả các bước.' });
      return;
    }

    setIsSavingFlow(true);
    setMessage(null);

    try {
      const stepsToSave = editingSteps.map(step => {
        let parsedMapping = {};
        try {
          parsedMapping = JSON.parse(step.mappingStr);
        } catch {
          parsedMapping = step.inputMapping || {};
        }
        return {
          connectionId: step.connectionId,
          appSlug: step.appSlug,
          actionSlug: step.actionSlug,
          inputMapping: parsedMapping
        };
      });

      const res = await saveFlowStepsAction(teamId, flowData.flow.id, stepsToSave);
      if (res.success) {
        setMessage({ type: 'success', text: 'Cấu hình Flow đã được lưu thành công.' });
        // Tải lại để hiển thị dữ liệu mới nhất
        await handleOpenFlowConfig(flowWebhook);
      } else {
        setMessage({ type: 'error', text: res.error || 'Không thể lưu cấu hình Flow.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi kết nối hệ thống.' });
    } finally {
      setIsSavingFlow(false);
    }
  };

  const handleToggleStatus = async (webhook: any) => {
    setTogglingId(webhook.id);
    setMessage(null);
    const newStatus = webhook.status === 'active' ? 'paused' : 'active';
    try {
      const res = await toggleWebhookAction(teamId, webhook.id, newStatus);
      if (res.success && res.data) {
        setWebhooks(webhooks.map(w => w.id === webhook.id ? { ...w, status: newStatus } : w));
        setMessage({ type: 'success', text: `Đã ${newStatus === 'active' ? 'kích hoạt lại' : 'tạm dừng'} Webhook thành công.` });
      } else {
        setMessage({ type: 'error', text: res.error || 'Thay đổi trạng thái thất bại.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi hệ thống.' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    setIsDeleting(true);
    setMessage(null);
    try {
      const res = await deleteWebhookAction(teamId, id);
      if (res.success) {
        setWebhooks(webhooks.filter(w => w.id !== id));
        setDeleteConfirmId(null);
        setMessage({ type: 'success', text: 'Đã xóa Webhook thành công.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Lỗi khi xóa Webhook.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi hệ thống.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenLogs = async (webhook: any) => {
    setSelectedWebhook(webhook);
    setIsLogsOpen(true);
    setIsLoadingLogs(true);
    setLogs([]);
    try {
      const res = await getWebhookLogsAction(teamId, webhook.id, 20);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const filteredWebhooks = webhooks.filter((w) =>
    w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.appSlug.toLowerCase().includes(search.toLowerCase())
  );

  const getConnectorColor = (slug: string) => {
    switch (slug) {
      case 'shopify': return 'from-green-500 to-emerald-600';
      case 'slack': return 'from-purple-500 to-pink-500';
      case 'github': return 'from-gray-700 to-gray-900';
      case 'stripe': return 'from-blue-500 to-indigo-600';
      case 'telegram-bot': return 'from-sky-400 to-blue-500';
      default: return 'from-orange-500 to-red-500';
    }
  };

  return (
    <div className="space-y-6 text-white relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white flex items-center gap-2">
            <Webhook className="h-6 w-6 text-purple-500" /> Cổng Nhận Webhooks (Incoming)
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Thiết lập các URL để nhận dữ liệu đẩy từ bên thứ 3 về không gian làm việc của bạn
          </p>
        </div>
        <button
          onClick={() => {
            setCreatedResult(null);
            setSelectedAppSlug('');
            setWebhookLabel('');
            setMessage(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tạo Webhook mới
        </button>
      </div>

      {message && !isCreateOpen && !isLogsOpen && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border bg-purple-500/10 text-purple-400 border-purple-500/20 animate-fade-in`}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">{message.text}</div>
          <button onClick={() => setMessage(null)} className="text-purple-400/60 hover:text-purple-400">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl">
        <div className="relative mb-5 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            type="text"
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            placeholder="Tìm Webhook..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredWebhooks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
            <Webhook className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-400">Chưa cấu hình Webhook nào</p>
            <p className="text-[11px] text-gray-500 mt-1">Click "Tạo Webhook mới" để bắt đầu nhận dữ liệu tự động.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredWebhooks.map((wh) => (
              <div 
                key={wh.id} 
                className="bg-black/35 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 transition-colors"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${getConnectorColor(wh.appSlug)} shadow-sm text-white shrink-0`}>
                      <Webhook className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-200">{wh.label}</h4>
                      <span className="text-[10px] text-gray-500 font-semibold uppercase">{wh.appSlug}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold border ml-2 ${
                        wh.status === 'active'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-white/5 text-gray-400 border-white/5'
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${wh.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                      {wh.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500 font-bold">WEBHOOK ENDPOINT URL</div>
                    <div className="flex items-center gap-2 max-w-xl">
                      <input
                        type="text"
                        readOnly
                        value={getWebhookUrl(wh.id)}
                        className="flex-1 bg-black/50 border border-white/5 rounded-lg py-1 px-2.5 text-[10px] text-gray-400 font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => handleCopy(getWebhookUrl(wh.id), wh.id)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Sao chép URL"
                      >
                        {copiedId === wh.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Đã nhận: <strong className="text-gray-300 font-black">{wh.receivedCount}</strong> lần</span>
                    {wh.lastReceivedAt && (
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Lần cuối: <strong className="text-gray-300 font-bold">{new Date(wh.lastReceivedAt).toLocaleString('vi-VN')}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleToggleStatus(wh)}
                    disabled={togglingId === wh.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                      wh.status === 'active'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                    }`}
                  >
                    {togglingId === wh.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : wh.status === 'active' ? (
                      <><Pause className="h-3 w-3" /> Tạm dừng</>
                    ) : (
                      <><Play className="h-3 w-3" /> Kích hoạt</>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenLogs(wh)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-500/15 text-purple-400 border border-purple-500/25 hover:bg-purple-500/25 rounded-xl text-[11px] font-bold transition-colors"
                  >
                    <Activity className="h-3 w-3" /> Lịch sử nhận
                  </button>

                  <button
                    onClick={() => handleOpenFlowConfig(wh)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 rounded-xl text-[11px] font-bold transition-colors"
                  >
                    <GitFork className="h-3 w-3" /> Cấu hình Flow
                  </button>

                  {deleteConfirmId === wh.id ? (
                    <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/25 rounded-xl p-1 animate-fade-in">
                      <span className="text-rose-400 text-[10px] px-1 font-bold">Xóa?</span>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        disabled={isDeleting}
                        className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg transition-colors"
                      >
                        Có
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold rounded-lg border border-white/10 transition-colors"
                      >
                        Không
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(wh.id)}
                      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/10"
                      title="Xóa Webhook"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Tạo Webhook */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!isCreating) setIsCreateOpen(false); }} />
          
          <div className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gray-900/95 sticky top-0 z-10">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-500" /> Tạo Webhook Endpoint
              </h2>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                disabled={isCreating}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {createdResult ? (
                // Hiển thị kết quả thành công và Secret Key
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-green-500/10 border border-green-500/25 rounded-xl text-green-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Đã tạo Webhook Endpoint thành công!
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Webhook Endpoint URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getWebhookUrl(createdResult.webhook.id)}
                        className="flex-1 bg-black/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-gray-400 font-mono"
                      />
                      <button
                        onClick={() => handleCopy(getWebhookUrl(createdResult.webhook.id), 'wh-url-copy')}
                        className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        {copiedId === 'wh-url-copy' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Secret Key (Chỉ hiển thị 1 lần!)
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Sử dụng Secret Key này để verify tính chân thực của webhook payload (HMAC-SHA256).
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={createdResult.plainSecret}
                        className="flex-1 bg-black/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-amber-400 font-mono font-bold"
                      />
                      <button
                        onClick={() => handleCopy(createdResult.plainSecret, 'wh-secret-copy')}
                        className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        {copiedId === 'wh-secret-copy' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Form tạo mới
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Chọn Ứng dụng nguồn</label>
                    <select
                      value={selectedAppSlug}
                      onChange={(e) => setSelectedAppSlug(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="">-- Chọn Ứng dụng --</option>
                      {connections.map((c) => (
                        <option key={c.id} value={c.appSlug}>
                          {c.appName} ({c.connectionName})
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-500">
                      Chỉ hiển thị các ứng dụng đã có kết nối hoạt động tại Kết nối của tôi.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Nhãn định danh Webhook</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Shopify Order Webhook"
                      value={webhookLabel}
                      onChange={(e) => setWebhookLabel(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>
              )}

              {message && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                  message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  {message.text}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/5 bg-gray-900/95 sticky bottom-0 z-10 flex items-center justify-end gap-3">
              {createdResult ? (
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl text-xs font-bold text-white shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  Xong
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isCreating}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 border border-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreateWebhook}
                    disabled={isCreating}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    {isCreating && <Loader2 className="h-3 w-3 animate-spin" />}
                    Xác nhận tạo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Logs Drawer */}
      {isLogsOpen && selectedWebhook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setIsLogsOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-gray-900 border-l border-white/10 h-full overflow-y-auto shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gray-900/95 sticky top-0 z-10 backdrop-blur-md">
              <div>
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" /> Nhật ký nhận: {selectedWebhook.label}
                </h2>
                <span className="text-[10px] text-gray-500">20 yêu cầu gần nhất</span>
              </div>
              <button 
                onClick={() => setIsLogsOpen(false)} 
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex-1 space-y-4">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="text-xs font-bold">Đang tải nhật ký...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                  <Activity className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-400">Chưa nhận được webhook request nào</p>
                  <p className="text-[10px] text-gray-500 mt-1">Cấu hình URL webhook này trên app bên thứ 3 và thực hiện gửi thử.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 font-bold border-b border-white/5">
                        <th className="pb-3 px-2">Thời gian</th>
                        <th className="pb-3 px-2">Phương thức</th>
                        <th className="pb-3 px-2">IP Nguồn</th>
                        <th className="pb-3 px-2">Chữ ký HMAC</th>
                        <th className="pb-3 px-2">Trạng thái</th>
                        <th className="pb-3 px-2 text-right">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-2.5 px-2 text-gray-300 font-medium">
                            {new Date(log.processedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono font-bold text-gray-400">
                              {log.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">{log.sourceIp}</td>
                          <td className="py-2.5 px-2">
                            {log.signatureValid === 1 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-bold">
                                <ShieldCheck className="h-3.5 w-3.5" /> Hợp lệ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80 font-bold">
                                <ShieldAlert className="h-3.5 w-3.5" /> Không chữ ký
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                log.status === 'success'
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {log.status === 'success' ? 'Thành công' : 'Lỗi'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => setSelectedLogPayload(log)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 hover:text-white text-gray-400 text-[10px] font-bold flex items-center gap-1 ml-auto transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Payload Modal */}
      {selectedLogPayload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedLogPayload(null)} />
          
          <div className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-fade-in max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gray-900/95 sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-purple-500" /> Chi tiết Webhook Payload
                </h3>
                <span className="text-[10px] text-gray-500 font-mono">ID: {selectedLogPayload.id}</span>
              </div>
              <button 
                onClick={() => setSelectedLogPayload(null)} 
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {selectedLogPayload.errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-semibold">
                  <strong>Thông báo lỗi: </strong> {selectedLogPayload.errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Thời gian xử lý</span>
                  <div className="font-bold text-xs text-white">
                    {new Date(selectedLogPayload.processedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Xác thực signature</span>
                  <div className="font-bold text-xs text-white">
                    {selectedLogPayload.signatureValid === 1 ? '✅ Đã hợp lệ' : '⚠️ Bỏ qua/Không hợp lệ'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Headers</div>
                <pre className="bg-black/50 border border-white/5 p-3 rounded-xl text-[10px] text-gray-400 font-mono overflow-auto max-h-[120px] custom-scrollbar">
                  {JSON.stringify(selectedLogPayload.headers, null, 2)}
                </pre>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Body (Parsed Payload)</div>
                <pre className="bg-black/50 border border-white/5 p-3 rounded-xl text-[10px] text-green-400 font-mono overflow-auto max-h-[250px] custom-scrollbar">
                  {JSON.stringify(selectedLogPayload.parsedPayload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-5 border-t border-white/5 bg-gray-900/95 sticky bottom-0 z-10 flex justify-end">
              <button
                onClick={() => setSelectedLogPayload(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 border border-white/10 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Flow Config Drawer */}
      {isFlowOpen && flowWebhook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setIsFlowOpen(false)} />
          
          <div className="relative w-full max-w-3xl bg-gray-900 border-l border-white/10 h-full overflow-y-auto shadow-2xl flex flex-col animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gray-900/95 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <GitFork className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    Cấu hình Flow Tự Động
                  </h3>
                  <span className="text-[10px] text-gray-500 font-medium">Webhook: {flowWebhook.label}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsFlowOpen(false)} 
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-white/5 bg-gray-900 sticky top-[73px] z-10">
              <button
                onClick={() => handleSwitchFlowTab('config')}
                className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
                  flowTab === 'config'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Cấu hình các bước ({editingSteps.length})
              </button>
              <button
                onClick={() => handleSwitchFlowTab('history')}
                className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
                  flowTab === 'history'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Lịch sử thực thi ({flowRuns.length})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {message && isFlowOpen && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border animate-fade-in ${
                  message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <div className="flex-1">{message.text}</div>
                </div>
              )}

              {isLoadingFlow ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                  <span className="text-xs font-bold">Đang tải cấu hình Flow...</span>
                </div>
              ) : flowTab === 'config' ? (
                <div className="space-y-6">
                  {/* Hint Box */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5" /> Hướng dẫn giải nội suy placeholder
                    </span>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                      Sử dụng cú pháp <code className="px-1 py-0.5 bg-black/40 rounded text-cyan-300 font-mono text-[10px] font-bold">{"{{payload.field}}"}</code> để truyền dữ liệu nhận được từ webhook vào tham số của action. 
                      Ví dụ: <code className="text-gray-300 font-mono">{"{{payload.order.code}}"}</code> hoặc <code className="text-gray-300 font-mono">{"{{headers.x-event}}"}</code>.
                    </p>
                  </div>

                  {/* Steps List */}
                  {editingSteps.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-2xl py-12 flex flex-col items-center justify-center text-center p-6 bg-white/[0.01]">
                      <GitFork className="h-10 w-10 text-gray-600 mb-3" />
                      <h4 className="text-xs font-black text-gray-300">Chưa có bước thực thi nào</h4>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-[280px] font-medium">
                        Tạo chuỗi các hành động tự động chạy khi webhook nhận payload POST thành công
                      </p>
                      <button
                        onClick={handleAddFlowStep}
                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm bước đầu tiên
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editingSteps.map((step, idx) => {
                        // Lấy connections list và filter các actions cho app hiện tại
                        const appActions = loadedDetails[step.appSlug]?.actions
                          ? Object.entries(loadedDetails[step.appSlug].actions).map(([slug, detail]: any) => ({
                              slug,
                              name: detail.displayName || detail.name || slug,
                              description: detail.description || ''
                            }))
                          : [];

                        return (
                          <div 
                            key={idx}
                            className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4 relative hover:border-white/10 transition-colors animate-fade-in"
                          >
                            {/* Step Header */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <span className="text-xs font-black text-white flex items-center gap-1.5">
                                <span className="h-5 w-5 bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 rounded-lg flex items-center justify-center text-[10px] font-black">
                                  {idx + 1}
                                </span>
                                Bước thực thi
                              </span>
                              <button
                                onClick={() => handleRemoveFlowStep(idx)}
                                className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 border border-rose-500/10 transition-colors text-[10px] font-bold flex items-center gap-1"
                                title="Xóa bước này"
                              >
                                <Trash className="h-3 w-3" /> Xóa
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Connection Dropdown */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Tài khoản kết nối</label>
                                <select
                                  value={step.connectionId}
                                  onChange={(e) => handleStepConnectionChange(idx, parseInt(e.target.value, 10))}
                                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                                >
                                  {connections.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.connectionName} ({c.appName})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Action Dropdown */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Hành động cần chạy</label>
                                <select
                                  value={step.actionSlug}
                                  onChange={(e) => handleStepActionChange(idx, e.target.value)}
                                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                                  disabled={!step.appSlug || !loadedDetails[step.appSlug]}
                                >
                                  <option value="">-- Chọn hành động --</option>
                                  {appActions.map((act) => (
                                    <option key={act.slug} value={act.slug}>
                                      {act.name}
                                    </option>
                                  ))}
                                </select>
                                {step.appSlug && !loadedDetails[step.appSlug] && (
                                  <span className="text-[9px] text-cyan-400 font-bold animate-pulse">Đang tải danh sách hành động...</span>
                                )}
                              </div>
                            </div>

                            {/* Input Mapping JSON Textarea */}
                            {step.actionSlug && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                    <CornerDownRight className="h-3 w-3 text-cyan-500" /> Tham số gửi đi (Input JSON Mapping)
                                  </label>
                                  {step.jsonError ? (
                                    <span className="text-[9px] font-bold text-rose-400">⚠️ JSON lỗi cú pháp</span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-green-400">✓ JSON hợp lệ</span>
                                  )}
                                </div>
                                <textarea
                                  rows={5}
                                  value={step.mappingStr}
                                  onChange={(e) => handleStepMappingChange(idx, e.target.value)}
                                  className={`w-full bg-black/60 border rounded-xl py-2 px-3 text-xs font-mono focus:outline-none custom-scrollbar ${
                                    step.jsonError ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-cyan-500/50'
                                  }`}
                                  placeholder='{\n  "message": "{{payload.message}}"\n}'
                                />
                                {step.jsonError && (
                                  <p className="text-[9px] text-rose-400 font-mono mt-0.5">{step.jsonError}</p>
                                )}
                                
                                {/* Trình bày chi tiết action description */}
                                {loadedDetails[step.appSlug]?.actions?.[step.actionSlug] && (
                                  <p className="text-[10px] text-gray-500 font-medium">
                                    <strong>Mô tả:</strong> {loadedDetails[step.appSlug].actions[step.actionSlug].description || 'Không có mô tả.'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {editingSteps.length > 0 && (
                    <div className="flex justify-start">
                      <button
                        onClick={handleAddFlowStep}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4 text-cyan-400" /> Thêm bước thực thi
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* History Tab */
                <div className="space-y-4">
                  {flowRuns.length === 0 ? (
                    <div className="border border-white/5 rounded-2xl py-12 flex flex-col items-center justify-center text-center p-6 bg-white/[0.01]">
                      <Activity className="h-10 w-10 text-gray-600 mb-3 animate-pulse" />
                      <h4 className="text-xs font-black text-gray-300">Chưa có lượt chạy nào</h4>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-[280px] font-medium">
                        Flow này chưa từng được kích hoạt hoặc chưa nhận payload POST nào
                      </p>
                    </div>
                  ) : (
                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="py-3 px-4">Thời gian</th>
                            <th className="py-3 px-2">Trạng thái</th>
                            <th className="py-3 px-2">Chi tiết lỗi</th>
                            <th className="py-3 px-4 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flowRuns.map((run) => (
                            <tr 
                              key={run.id} 
                              className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors"
                            >
                              <td className="py-3 px-4 font-semibold text-gray-300">
                                {new Date(run.startedAt).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-3 px-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    run.status === 'success'
                                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                      : run.status === 'failed'
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                  }`}
                                >
                                  {run.status === 'success' ? (
                                    <><CheckCircle className="h-3 w-3" /> Thành công</>
                                  ) : run.status === 'failed' ? (
                                    <><XCircle className="h-3 w-3" /> Thất bại</>
                                  ) : (
                                    'Đang chạy'
                                  )}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-rose-400 font-medium max-w-[200px] truncate">
                                {run.errorMessage || '-'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setSelectedRunDetail(run)}
                                  className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white text-gray-400 text-[10px] font-bold flex items-center gap-1 ml-auto transition-colors border border-white/5"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Xem kết quả
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {flowTab === 'config' && !isLoadingFlow && (
              <div className="p-5 border-t border-white/5 bg-gray-900/95 sticky bottom-0 z-10 flex items-center justify-end gap-3 backdrop-blur-md">
                <button
                  onClick={() => setIsFlowOpen(false)}
                  disabled={isSavingFlow}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 border border-white/10 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveFlow}
                  disabled={isSavingFlow || editingSteps.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
                >
                  {isSavingFlow ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Lưu cấu hình Flow
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal chi tiết kết quả chạy Flow Run */}
      {selectedRunDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedRunDetail(null)} />
          
          <div className="relative w-full max-w-3xl bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-fade-in max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gray-900/95 sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-cyan-400" /> Kết quả thực thi các bước
                </h3>
                <span className="text-[10px] text-gray-500 font-mono">Run ID: {selectedRunDetail.id}</span>
              </div>
              <button 
                onClick={() => setSelectedRunDetail(null)} 
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh] custom-scrollbar">
              {selectedRunDetail.errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-semibold">
                  <strong>Thông báo lỗi: </strong> {selectedRunDetail.errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chi tiết các bước thực hiện</span>
                
                {(!selectedRunDetail.stepResults || selectedRunDetail.stepResults.length === 0) ? (
                  <p className="text-xs text-gray-500 italic">Không có thông tin chi tiết bước.</p>
                ) : (
                  <div className="space-y-3">
                    {(selectedRunDetail.stepResults as any[]).map((res: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`border rounded-xl p-4 space-y-2 bg-black/25 ${
                          res.success ? 'border-green-500/20' : 'border-rose-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            <span className={`h-5 w-5 rounded-lg flex items-center justify-center text-[10px] font-black ${
                              res.success ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                            }`}>
                              {res.step}
                            </span>
                            Hành động: <code className="px-1 py-0.5 bg-white/5 rounded text-[10px] font-mono text-gray-300">{res.actionSlug}</code> ({res.appSlug})
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">Thời gian: {res.durationMs}ms</span>
                        </div>

                        {res.error && (
                          <p className="text-[11px] text-rose-400 font-semibold bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                            <strong>Lỗi:</strong> {res.error}
                          </p>
                        )}

                        {res.dataPreview && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-gray-500 font-bold uppercase">Phản hồi trả về (Preview)</span>
                            <pre className="bg-black/50 border border-white/5 p-2 rounded-lg text-[10px] text-cyan-400 font-mono overflow-auto max-h-[120px] custom-scrollbar">
                              {res.dataPreview}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-white/5 bg-gray-900/95 sticky bottom-0 z-10 flex justify-end">
              <button
                onClick={() => setSelectedRunDetail(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 border border-white/10 cursor-pointer"
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
