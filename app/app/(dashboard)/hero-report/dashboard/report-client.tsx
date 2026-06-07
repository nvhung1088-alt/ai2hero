'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  Clock, 
  Plus, 
  Play, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  History, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  Settings2,
  Calendar,
  Sparkles,
  MessageSquare,
  ArrowUpRight,
  Pencil
} from 'lucide-react';
import { 
  createReportScheduleAction, 
  updateReportScheduleAction,
  deleteReportScheduleAction, 
  toggleReportScheduleAction, 
  getReportRunsAction,
  testRunReportAction,
  triggerReportRunAction,
  previewReportDataAction,
  testAiCommentaryAction,
  fetchFacebookResourcesAction,
  fetchFacebookCampaignsAction,
  CreateScheduleInput
} from '@/lib/db/hero-report-actions';
import Link from 'next/link';
import { CAPABILITY_RENDERERS } from '@/lib/hero-report/report-renderers';



interface ReportClientProps {
  teamId: number;
  initialSchedules: any[];
  inputConnections: any[];
  outputConnections: any[];
  aiConnections: any[];
  capabilitiesMap: Record<string, any>;
  aiModelsMap: Record<string, { label: string; value: string }[]>;
  initialRuns: any[];
}

export default function ReportClient({
  teamId,
  initialSchedules,
  inputConnections,
  outputConnections,
  aiConnections,
  capabilitiesMap,
  aiModelsMap,
  initialRuns
}: ReportClientProps) {
  // Navigation & States
  const [activeTab, setActiveTab] = useState<'schedules' | 'runs'>('schedules');
  const [schedules, setSchedules] = useState<any[]>(initialSchedules);
  const [runs, setRuns] = useState<any[]>(initialRuns);
  
  // Data Preview State
  const [previewingData, setPreviewingData] = useState(false);
  const [previewDataResult, setPreviewDataResult] = useState<{ success: boolean; text?: string; error?: string; metricsJson?: any } | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [scheduleName, setScheduleName] = useState('');
  const [selectedSources, setSelectedSources] = useState<{ connectionId: number; provider: string; capabilities: string[]; config?: Record<string, any> }[]>([]);
  const [fbResources, setFbResources] = useState<Record<number, { pages: any[]; adAccounts: any[]; campaigns?: Record<string, any[]> }>>({});
  const [fetchingFbResources, setFetchingFbResources] = useState<Record<number, boolean>>({});
  const [fetchingFbCampaigns, setFetchingFbCampaigns] = useState<Record<string, boolean>>({});

  const loadFbResources = async (connId: number) => {
    if (fbResources[connId] || fetchingFbResources[connId]) return;
    setFetchingFbResources(prev => ({ ...prev, [connId]: true }));
    try {
      const res = await fetchFacebookResourcesAction(teamId, connId);
      if (res.success && res.data) {
        setFbResources(prev => ({ ...prev, [connId]: res.data }));
      } else {
        console.error('Lỗi khi fetch Facebook resources:', res.error);
        showToast(res.error || 'Không thể lấy tài khoản Meta', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối Meta', 'error');
    } finally {
      setFetchingFbResources(prev => ({ ...prev, [connId]: false }));
    }
  };

  const loadFbCampaigns = async (connId: number, adAccountId: string) => {
    const key = `${connId}_${adAccountId}`;
    if (fbResources[connId]?.campaigns?.[adAccountId] || fetchingFbCampaigns[key]) return;
    
    setFetchingFbCampaigns(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetchFacebookCampaignsAction(teamId, connId, adAccountId);
      if (res.success && res.data) {
        setFbResources(prev => ({
          ...prev,
          [connId]: {
            ...prev[connId],
            campaigns: {
              ...(prev[connId]?.campaigns || {}),
              [adAccountId]: res.data
            }
          }
        }));
      } else {
        showToast(res.error || 'Không thể lấy danh sách Campaign', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối Meta', 'error');
    } finally {
      setFetchingFbCampaigns(prev => ({ ...prev, [key]: false }));
    }
  };

  React.useEffect(() => {
    if (currentStep === 2) {
      selectedSources.forEach(src => {
        if (src.provider === 'facebook' || src.provider === 'meta') {
          loadFbResources(src.connectionId);
          if (src.config?.adAccountId && src.capabilities.includes('get_campaign_insights')) {
            loadFbCampaigns(src.connectionId, src.config.adAccountId);
          }
        }
      });
    }
  }, [currentStep, selectedSources]);

  const [reportType, setReportType] = useState('daily_sales');
  const [dateRange, setDateRange] = useState('yesterday');
  const [skipAiConfig, setSkipAiConfig] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState(aiConnections.length > 0 ? aiConnections[0].appSlug : '');
  const [aiModel, setAiModel] = useState(aiConnections.length > 0 ? (aiModelsMap[aiConnections[0].appSlug]?.[0]?.value || '') : '');
  const [scheduleType, setScheduleType] = useState<'manual' | 'daily' | 'hourly' | 'weekly'>('daily');
  
  // Time states for cron conversion
  const [cronHour, setCronHour] = useState('08');
  const [cronMinute, setCronMinute] = useState('00');
  const [cronDow, setCronDow] = useState('1'); // 1 = Monday
  
  // Output states
  const [selectedOutputId, setSelectedOutputId] = useState('');
  const [targetId, setTargetId] = useState('');

  // Test Run states (Preview inside Wizard)
  const [testingReport, setTestingReport] = useState(false);
  const [testResponse, setTestResponse] = useState<{ success: boolean; text?: string; error?: string } | null>(null);
  
  // Test AI states
  const [testingAi, setTestingAi] = useState(false);
  const [testAiResult, setTestAiResult] = useState<{ success: boolean; text?: string; error?: string } | null>(null);

  // Notification states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync schedules & runs
  const refreshData = async () => {
    try {
      setActionLoading('refresh');
      // Fetch runs log
      const runsRes = await getReportRunsAction(teamId, undefined, 50);
      if (runsRes.success && runsRes.data) {
        setRuns(runsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Convert inputs to Cron expression
  const generateCronExpression = () => {
    if (scheduleType === 'hourly') {
      return '0 * * * *';
    }
    if (scheduleType === 'daily') {
      return `${parseInt(cronMinute, 10)} ${parseInt(cronHour, 10)} * * *`;
    }
    if (scheduleType === 'weekly') {
      return `${parseInt(cronMinute, 10)} ${parseInt(cronHour, 10)} * * ${cronDow}`;
    }
    return '';
  };

  // Get matching connection info
  const selectedOutputConn = outputConnections.find(c => c.id === parseInt(selectedOutputId, 10));

  // Reset form
  const resetForm = () => {
    setEditingScheduleId(null);
    setScheduleName('');
    setSelectedSources(inputConnections.length > 0 ? [{ connectionId: inputConnections[0].id, provider: inputConnections[0].appSlug, capabilities: [] }] : []);
    setReportType('daily_sales');
    setDateRange('yesterday');
    setSkipAiConfig(false);
    setCustomPrompt('');
    setAiProvider(aiConnections.length > 0 ? aiConnections[0].appSlug : '');
    setAiModel(aiConnections.length > 0 ? (aiModelsMap[aiConnections[0].appSlug]?.[0]?.value || '') : '');
    setScheduleType('daily');
    setCronHour('08');
    setCronMinute('00');
    setCronDow('1');
    setSelectedOutputId(outputConnections[0]?.id?.toString() || '');
    setTargetId('');
    setCurrentStep(1);
    setTestResponse(null);
    setPreviewDataResult(null);
    setTestAiResult(null);
    setFbResources({});
    setFetchingFbResources({});
  };

  // Pre-fill form for editing
  const handleEditSchedule = (sch: any) => {
    setEditingScheduleId(sch.id);
    setScheduleName(sch.name);
    
    const sources = sch.inputSources || [];
    setSelectedSources(sources);
    
    // Tự động tải thông tin Facebook resources ngầm nếu có nguồn Facebook
    sources.forEach((src: any) => {
      if (src.provider === 'facebook' || src.provider === 'meta') {
        loadFbResources(src.connectionId);
        if (src.config?.adAccountId && src.capabilities?.includes('get_campaign_insights')) {
          loadFbCampaigns(src.connectionId, src.config.adAccountId);
        }
      }
    });

    setReportType(sch.reportSpec?.reportType || 'daily_sales');
    setDateRange(sch.reportSpec?.dateRange || 'yesterday');
    setSkipAiConfig(sch.reportSpec?.skipAi || false);
    setCustomPrompt(sch.reportSpec?.customPrompt || '');
    setAiProvider(sch.reportSpec?.aiProvider || (aiConnections.length > 0 ? aiConnections[0].appSlug : ''));
    setAiModel(sch.reportSpec?.aiModel || '');
    setSelectedOutputId(sch.outputConnectionId ? sch.outputConnectionId.toString() : '');
    setTargetId(sch.outputConfig?.chatId || sch.outputConfig?.phone || sch.outputConfig?.userId || '');
    setScheduleType(sch.scheduleType || 'manual');
    if (sch.cronExpression) {
      const parts = sch.cronExpression.split(' ');
      if (parts.length === 5) {
        setCronMinute(parts[0].padStart(2, '0'));
        setCronHour(parts[1].padStart(2, '0'));
        if (sch.scheduleType === 'weekly') {
          setCronDow(parts[4]);
        }
      }
    }
    setCurrentStep(1);
    setTestResponse(null);
    setPreviewDataResult(null);
    setTestAiResult(null);
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSaveSchedule = async () => {
    if (!scheduleName.trim()) {
      showToast('Vui lòng nhập tên lịch báo cáo', 'error');
      return;
    }
    if (selectedSources.length === 0) {
      showToast('Vui lòng chọn ít nhất một kết nối nguồn dữ liệu', 'error');
      return;
    }

    // Validation cho Facebook config
    for (const src of selectedSources) {
      if (src.provider === 'facebook' || src.provider === 'meta') {
        if (src.capabilities.includes('get_page_insights') && !src.config?.pageId) {
          showToast('Vui lòng chọn Fanpage Facebook', 'error');
          return;
        }
        if (src.capabilities.includes('get_ad_account_insights') && !src.config?.adAccountId) {
          showToast('Vui lòng chọn Tài khoản Quảng cáo', 'error');
          return;
        }
        if (src.capabilities.includes('get_campaign_insights')) {
          if (!src.config?.adAccountId) {
            showToast('Vui lòng chọn Tài khoản Quảng cáo cho Chiến dịch', 'error');
            return;
          }
          if (!src.config?.campaignId) {
            showToast('Vui lòng nhập ID Chiến dịch Quảng cáo', 'error');
            return;
          }
        }
      }
    }
    if (!selectedOutputId) {
      showToast('Vui lòng chọn cổng nhận báo cáo', 'error');
      return;
    }
    if (!targetId.trim()) {
      const isZalo = selectedOutputConn?.appSlug === 'zalo-zns';
      showToast(isZalo ? 'Vui lòng nhập Zalo User ID hoặc Số điện thoại nhận tin' : 'Vui lòng nhập Chat ID Telegram', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const cronExpr = generateCronExpression();
      
      const payload: CreateScheduleInput = {
        name: scheduleName,
        inputSources: selectedSources,
        inputConnectionId: selectedSources.length > 0 ? selectedSources[0].connectionId : undefined,
        inputProvider: selectedSources.length > 0 ? selectedSources[0].provider : undefined,
        reportSpec: {
          reportType,
          dateRange,
          skipAi: skipAiConfig,
          customPrompt: customPrompt.trim(),
          aiProvider,
          aiModel,
          metrics: reportType === 'daily_sales' 
            ? ['total_revenue', 'total_orders', 'top_products'] 
            : reportType === 'low_stock' 
            ? ['low_stock_products', 'out_of_stock_count']
            : reportType === 'pending_orders'
            ? ['pending_orders_count']
            : ['top_products_list']
        },
        outputType: selectedOutputConn?.appSlug || 'telegram',
        outputConnectionId: parseInt(selectedOutputId, 10),
        outputConfig: selectedOutputConn?.appSlug === 'zalo-zns'
          ? { phone: targetId.trim() }
          : { chatId: targetId.trim() },
        scheduleType,
        cronExpression: scheduleType !== 'manual' ? cronExpr : undefined,
        timezone: 'Asia/Ho_Chi_Minh'
      };

      let res;
      if (editingScheduleId) {
        res = await updateReportScheduleAction(teamId, editingScheduleId, payload);
      } else {
        res = await createReportScheduleAction(teamId, payload);
      }
      
      if (res.success && res.data) {
        if (editingScheduleId) {
          setSchedules(prev => prev.map(s => s.id === editingScheduleId ? res.data : s));
          showToast('Cập nhật lịch báo cáo thành công');
        } else {
          setSchedules(prev => [res.data, ...prev]);
          showToast('Tạo lịch báo cáo tự động thành công');
        }
        setIsModalOpen(false);
        resetForm();
        refreshData();
      } else {
        showToast(res.error || 'Lỗi khi lưu cấu hình', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi không xác định', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle "Gửi thử ngay" (Test Run on current unsaved configuration)
  const handleTestRun = async () => {
    if (selectedSources.length === 0 || !selectedOutputId || !targetId.trim()) {
      showToast('Vui lòng cấu hình đầy đủ Nguồn dữ liệu & Cổng nhận tin trước khi test', 'error');
      return;
    }

    let finalReportText = previewDataResult?.text;
    
    if (!finalReportText) {
      alert('Chưa có bản xem trước báo cáo!\n\nVui lòng quay lại Bước 2 và nhấn "Test kéo dữ liệu" để tạo báo cáo.');
      return;
    }

    // Nếu không tick "Bỏ qua AI", bắt buộc phải có testAiResult
    if (!skipAiConfig) {
      if (!testAiResult?.success || !testAiResult?.text) {
        alert('Chưa có lời bình AI!\n\nVui lòng quay lại Bước 3 và nhấn "Test gọi AI nhận xét" (hoặc đánh dấu Bỏ qua AI).');
        return;
      }
      // Gắn lời bình AI vào báo cáo
      finalReportText = finalReportText.replace(
        '<i>(Chế độ Xem trước: Bỏ qua bước gọi AI để tiết kiệm token.)</i>', 
        testAiResult.text
      );
    }

    try {
      setTestingReport(true);
      setTestResponse(null);
      
      const cronExpr = generateCronExpression();
      const payload: CreateScheduleInput & { prebuiltText?: string } = {
        name: scheduleName || 'Báo cáo Test',
        inputSources: selectedSources,
        inputConnectionId: selectedSources.length > 0 ? selectedSources[0].connectionId : undefined,
        inputProvider: selectedSources.length > 0 ? selectedSources[0].provider : undefined,
        reportSpec: {
          reportType,
          dateRange,
          skipAi: skipAiConfig,
          customPrompt: customPrompt.trim(),
          aiProvider,
          aiModel
        },
        outputType: selectedOutputConn?.appSlug || 'telegram',
        outputConnectionId: parseInt(selectedOutputId, 10),
        outputConfig: selectedOutputConn?.appSlug === 'zalo-zns'
          ? { phone: targetId.trim() }
          : { chatId: targetId.trim() },
        scheduleType,
        cronExpression: scheduleType !== 'manual' ? cronExpr : undefined,
        prebuiltText: finalReportText
      };

      const res = await testRunReportAction(teamId, payload);
      if (res.success && res.data) {
        setTestResponse({ success: true, text: res.data.reportText });
        showToast('Đã gửi báo cáo thử nghiệm tới Telegram!');
      } else {
        setTestResponse({ success: false, error: res.error || 'Lỗi khi gửi báo cáo thử nghiệm' });
        showToast(res.error || 'Gửi báo cáo test thất bại', 'error');
      }
    } catch (error: any) {
      setTestResponse({ success: false, error: error.message || 'Lỗi kết nối' });
      showToast(error.message || 'Lỗi khi test', 'error');
    } finally {
      setTestingReport(false);
    }
  };

  // Toggle schedule status (Active/Paused)
  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      setActionLoading(`toggle-${id}`);
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const res = await toggleReportScheduleAction(teamId, id, newStatus);
      if (res.success && res.data) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: newStatus, nextRunAt: res.data.nextRunAt } : s));
        showToast(`Đã ${newStatus === 'active' ? 'bật lại' : 'tạm dừng'} lịch báo cáo`);
      } else {
        showToast(res.error || 'Lỗi khi cập nhật trạng thái', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch báo cáo này? Lịch sử chạy liên quan cũng sẽ bị xóa.')) {
      return;
    }

    try {
      setActionLoading(`delete-${id}`);
      const res = await deleteReportScheduleAction(teamId, id);
      if (res.success) {
        setSchedules(prev => prev.filter(s => s.id !== id));
        showToast('Đã xóa cấu hình báo cáo thành công');
        refreshData();
      } else {
        showToast(res.error || 'Lỗi khi xóa', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Run manually now
  const handleRunNow = async (id: number) => {
    try {
      setActionLoading(`run-${id}`);
      const res = await triggerReportRunAction(teamId, id);
      if (res.success) {
        showToast(res.message || 'Đã kích hoạt gửi báo cáo ngay!');
        // Đợi 1 chút rồi reload lịch sử
        setTimeout(refreshData, 2000);
      } else {
        showToast(res.error || 'Kích hoạt chạy thất bại', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-18 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl transition-all animate-slide-in-right ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' 
            : 'bg-rose-950/90 text-rose-400 border-rose-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Main Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-tr from-gray-900 to-gray-950 border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tổng số lịch báo cáo</span>
            <p className="text-2xl font-black text-white">{schedules.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-gradient-to-tr from-gray-900 to-gray-950 border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Lần gửi thành công</span>
            <p className="text-2xl font-black text-emerald-400">
              {runs.filter(r => r.status === 'success').length}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-gradient-to-tr from-gray-900 to-gray-950 border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Lỗi hệ thống</span>
            <p className="text-2xl font-black text-rose-400">
              {runs.filter(r => r.status === 'failed').length}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-2">
        <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'schedules' 
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Lịch báo cáo
          </button>
          <button
            onClick={() => setActiveTab('runs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'runs' 
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Lịch sử gửi ({runs.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={actionLoading === 'refresh'}
            className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'refresh' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <History className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-xl text-xs font-black text-white transition-all cursor-pointer shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Tạo báo cáo tự động
          </button>
        </div>
      </div>

      {/* Tab 1: Schedules List */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="font-extrabold text-sm text-white">Chưa cấu hình báo cáo nào</h3>
                <p className="text-xs text-gray-400">Thiết lập kết nối Pancake POS hoặc KiotViet và hẹn giờ tự động gửi báo cáo kinh doanh qua Telegram.</p>
              </div>
              <button
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Tạo báo cáo đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedules.map((schedule) => {
                const spec = schedule.reportSpec || {};
                const inputConn = inputConnections.find(c => c.id === schedule.inputConnectionId);
                const isToggling = actionLoading === `toggle-${schedule.id}`;
                const isRunning = actionLoading === `run-${schedule.id}`;
                const isDeleting = actionLoading === `delete-${schedule.id}`;

                return (
                  <div
                    key={schedule.id}
                    className={`bg-gradient-to-tr from-gray-900/80 to-gray-950/80 border rounded-2xl p-5 space-y-4 transition-all relative overflow-hidden ${
                      schedule.status === 'active' 
                        ? 'border-white/10 hover:border-white/15' 
                        : 'border-white/5 opacity-60'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-white/5 border border-white/5 text-gray-400 uppercase">
                          {schedule.inputProvider === 'pancake-pos' && 'Pancake POS'}
                          {schedule.inputProvider === 'kiotviet' && 'KiotViet'}
                          {schedule.inputProvider === 'pancake-chat' && 'Pancake Chat'}
                          {(schedule.inputProvider === 'facebook' || schedule.inputProvider === 'meta') && 'Meta Platform'}
                          {!['pancake-pos', 'kiotviet', 'pancake-chat', 'facebook', 'meta'].includes(schedule.inputProvider || '') && (schedule.inputProvider || 'Unknown')}
                        </span>
                        <h4 className="font-extrabold text-sm text-white truncate">{schedule.name}</h4>
                      </div>

                      {/* Switch status */}
                      <button
                        onClick={() => handleToggleStatus(schedule.id, schedule.status)}
                        disabled={isToggling}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all border shrink-0 ${
                          schedule.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="h-3 w-3 animate-spin mx-2" />
                        ) : schedule.status === 'active' ? (
                          'Đang hoạt động'
                        ) : (
                          'Tạm dừng'
                        )}
                      </button>
                    </div>

                    {/* Spec details */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-bold block">AI Model</span>
                        <span className="font-extrabold text-white truncate block max-w-[200px]">
                          {spec.aiModel === 'krr/claude-sonnet-4-6' && 'Claude 3.5 Sonnet'}
                          {spec.aiModel === 'ant/claude-opus-4-7' && 'Claude 3 Opus'}
                          {spec.aiModel === 'krr/claude-haiku-4-7' && 'Claude 3 Haiku'}
                          {spec.aiModel === 'gx/gpt-5.4' && 'GPT-4o'}
                          {spec.aiModel === 'glm-5.1' && 'GPT-3.5 / GLM'}
                          {!spec.aiModel && 'Claude 3.5 Sonnet'}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-bold block">Lịch chạy</span>
                        <span className="font-extrabold text-white flex items-center gap-1">
                          <Clock className="h-3 w-3 text-orange-400 shrink-0" />
                          {schedule.scheduleType === 'manual' && 'Chạy thủ công'}
                          {schedule.scheduleType === 'hourly' && 'Hàng giờ'}
                          {schedule.scheduleType === 'daily' && `Hàng ngày (${schedule.cronExpression ? 'lúc ' + schedule.cronExpression.split(' ')[1] + ':' + schedule.cronExpression.split(' ')[0].padStart(2, '0') : ''})`}
                          {schedule.scheduleType === 'weekly' && `Hàng tuần (${schedule.cronExpression ? 'Thứ ' + (parseInt(schedule.cronExpression.split(' ')[4], 10) + 1) + ' lúc ' + schedule.cronExpression.split(' ')[1] + ':' + schedule.cronExpression.split(' ')[0].padStart(2, '0') : ''})`}
                        </span>
                      </div>
                    </div>

                    {/* Next run metadata */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <div>
                        {schedule.status === 'active' && schedule.nextRunAt ? (
                          <span>Chạy tiếp theo: <strong className="text-gray-200">{new Date(schedule.nextRunAt).toLocaleString('vi-VN')}</strong></span>
                        ) : (
                          <span className="text-gray-500 font-semibold">Chưa có lịch chạy tiếp theo</span>
                        )}
                      </div>
                      {schedule.lastSuccessAt && (
                        <span>Lần cuối: <strong className="text-emerald-400">Thành công</strong></span>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                      <button
                        onClick={() => handleRunNow(schedule.id)}
                        disabled={isRunning || isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] font-extrabold text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                        Chạy ngay
                      </button>

                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        disabled={isRunning || isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-lg text-[11px] font-extrabold text-blue-400 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5 shrink-0" />
                        Sửa
                      </button>

                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        disabled={isRunning || isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-lg text-[11px] font-extrabold text-rose-400 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        )}
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

      {/* Tab 2: Runs History */}
      {activeTab === 'runs' && (
        <div className="bg-gradient-to-tr from-gray-900 to-gray-950 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-white/[0.01] border-b border-white/5 flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-white">Nhật ký thực thi báo cáo (50 lượt gần nhất)</h3>
            <span className="text-[10px] text-gray-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg">Tổng: {runs.length} lượt</span>
          </div>

          {runs.length === 0 ? (
            <div className="py-16 text-center text-gray-500 font-bold text-xs">
              Chưa có ghi chép lịch sử chạy nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-gray-400 font-extrabold select-none">
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Tên lịch báo cáo</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5">Thời gian thực thi</th>
                    <th className="px-5 py-3.5">Chi phí AI</th>
                    <th className="px-5 py-3.5 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {runs.map((run) => {
                    const sch = schedules.find(s => s.id === run.scheduleId);
                    return (
                      <tr key={run.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="px-5 py-4 font-mono text-[10px] text-gray-400">#{run.id}</td>
                        <td className="px-5 py-4 font-extrabold text-white">
                          {sch ? sch.name : `Cấu hình cũ (ID #${run.scheduleId})`}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            run.status === 'success' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : run.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}>
                            {run.status === 'success' && 'Thành công'}
                            {run.status === 'failed' && 'Lỗi'}
                            {run.status === 'running' && 'Đang chạy'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-300 font-medium">
                          {new Date(run.startedAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-5 py-4 text-gray-400 font-bold">
                          {run.status === 'success' && run.aiInputTokens !== null ? (
                            <span>
                              Model: <strong className="text-gray-300">{run.aiModel || 'gpt-3.5'}</strong>
                              <br />
                              Tokens: <strong className="text-gray-300">{run.aiInputTokens + (run.aiOutputTokens || 0)}</strong>
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {run.errorMessage ? (
                            <span className="text-rose-400 font-extrabold" title={run.errorMessage}>Xem lỗi</span>
                          ) : run.reportText ? (
                            <button
                              onClick={() => alert(run.reportText)}
                              className="text-orange-400 hover:text-orange-300 font-black cursor-pointer bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded"
                            >
                              Xem nội dung
                            </button>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Wizard: Tạo lịch báo cáo tự động mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gradient-to-tr from-gray-950 to-gray-900 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white/[0.01] border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">{editingScheduleId ? 'Chỉnh sửa lịch báo cáo' : 'Tạo lịch báo cáo tự động'}</h3>
                  <span className="text-[10px] text-gray-400">Theo dõi định kỳ kết quả kinh doanh</span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-black p-1 hover:bg-white/5 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {/* Steps Progress Indicator */}
            <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[10px] font-black select-none">
              <span className="text-gray-400">Bước {currentStep} trên 5</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 w-6 rounded-full transition-all ${
                      s === currentStep 
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500' 
                        : s < currentStep 
                        ? 'bg-orange-500/30' 
                        : 'bg-white/5'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Modal Body / Steps Content */}
            <div className="p-6 min-h-[300px] max-h-[60vh] overflow-y-auto space-y-4">
              
              {/* Step 1: Nguồn Dữ Liệu */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
                      <Settings2 className="h-4 w-4 text-orange-400" />
                      1. Chọn Nguồn dữ liệu kết nối
                    </label>
                    {inputConnections.length === 0 ? (
                      <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-3">
                        <p className="text-xs text-gray-300">
                          Không gian làm việc này chưa có kết nối API <strong>Pancake POS</strong> hoặc <strong>KiotViet</strong> nào thành công.
                        </p>
                        <Link
                          href={`/connect-hub/t/${teamId}/connections`}
                          className="inline-flex items-center gap-1.5 text-xs font-black text-orange-400 hover:text-orange-300"
                        >
                          Tạo kết nối mới tại Connect Hub <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {inputConnections.map(c => {
                          const isSelected = selectedSources.some(s => s.connectionId === c.id);
                          return (
                            <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                            }`}>
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSources([...selectedSources, { connectionId: c.id, provider: c.appSlug, capabilities: [] }]);
                                  } else {
                                    setSelectedSources(selectedSources.filter(s => s.connectionId !== c.id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-orange-500 focus:ring-orange-500/50 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{c.connectionName}</span>
                                <span className="text-[10px] text-gray-400 uppercase">{c.appSlug}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 font-bold block">
                      Tên cấu hình báo cáo
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Báo cáo Doanh thu Shop Pancake Hàng ngày"
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-xl text-xs text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Chọn Năng Lực Báo Cáo */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-orange-400" />
                      2. Chọn năng lực cần báo cáo
                    </label>
                    {selectedSources.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Vui lòng chọn nguồn dữ liệu ở Bước 1.</p>
                    ) : (
                      <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                        {selectedSources.map((source, idx) => {
                          const conn = inputConnections.find(c => c.id === source.connectionId);
                          const actions = capabilitiesMap[source.provider] || [];
                          
                          return (
                            <div key={source.connectionId} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                              <h4 className="text-[11px] font-bold text-white border-b border-white/5 pb-2 mb-2 flex items-center justify-between">
                                <span>{conn?.connectionName} <span className="text-gray-500 font-normal uppercase">({source.provider})</span></span>
                              </h4>
                              {actions.length === 0 ? (
                                <p className="text-[10px] text-gray-500">Chưa có năng lực nào được hỗ trợ.</p>
                              ) : (
                                <div className="grid grid-cols-1 gap-2">
                                  {/* Bug #3 Fix: Chỉ hiển thị capabilities có renderer trong hệ thống báo cáo */}
                                  {actions.filter((action: any) => CAPABILITY_RENDERERS[action.slug]).map((action: any) => {
                                    const isSelected = source.capabilities.includes(action.slug);
                                    return (
                                      <label key={action.slug} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                        isSelected ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                                      }`}>
                                        <input 
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const newSources = selectedSources.map((src, i) => {
                                              if (i !== idx) return src;
                                              const newCaps = e.target.checked
                                                ? [...src.capabilities, action.slug]
                                                : src.capabilities.filter(c => c !== action.slug);
                                              return { ...src, capabilities: newCaps };
                                            });
                                            setSelectedSources(newSources);
                                          }}
                                          className="w-3.5 h-3.5 mt-0.5 rounded border-gray-600 bg-gray-900 text-orange-500 focus:ring-orange-500/50 cursor-pointer"
                                        />
                                        <div className="flex flex-col">
                                          <span className="text-[11px] font-bold text-white">{action.name}</span>
                                          <span className="text-[10px] text-gray-400 leading-snug">{action.description}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Dropdowns chọn Fanpage / Ad Account dành riêng cho Facebook */}
                              {(source.provider === 'facebook' || source.provider === 'meta') && (
                                <div className="mt-3 p-3 bg-white/[0.01] border border-white/5 rounded-lg space-y-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">
                                      Cấu hình tài khoản Meta
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                         // Force refresh
                                         setFbResources(prev => { const n = {...prev}; delete n[source.connectionId]; return n; });
                                         setFetchingFbResources(prev => { const n = {...prev}; delete n[source.connectionId]; return n; });
                                         loadFbResources(source.connectionId);
                                      }}
                                      className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-gray-300 transition-colors"
                                    >
                                      🔄 Tải lại danh sách
                                    </button>
                                  </div>
                                  
                                  {fetchingFbResources[source.connectionId] ? (
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 py-1">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                                      Đang tải danh sách tài khoản/trang từ Meta...
                                    </div>
                                  ) : (
                                    <>
                                      {source.capabilities.includes('get_page_insights') && (
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400 block font-bold">
                                            Chọn Fanpage Facebook:
                                          </label>
                                          <select
                                            value={source.config?.pageId || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const pages = fbResources[source.connectionId]?.pages || [];
                                              const selectedPage = pages.find((p: any) => p.id === val);
                                              
                                              const newSources = selectedSources.map((src, i) => {
                                                if (i !== idx) return src;
                                                return {
                                                  ...src,
                                                  config: { 
                                                    ...src.config, 
                                                    pageId: val,
                                                    pageToken: selectedPage?.access_token || ''
                                                  }
                                                };
                                              });
                                              setSelectedSources(newSources);
                                            }}
                                            className="w-full px-3 py-2 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-lg text-[11px] text-white focus:outline-none transition-all cursor-pointer"
                                          >
                                            <option value="">-- Chọn Fanpage --</option>
                                            {(fbResources[source.connectionId]?.pages || []).map((p: any) => (
                                              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      {(source.capabilities.includes('get_ad_account_insights') || source.capabilities.includes('get_campaign_insights')) && (
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400 block font-bold">
                                            Chọn Tài khoản Quảng cáo (Ad Account):
                                          </label>
                                          <select
                                            value={source.config?.adAccountId || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const newSources = selectedSources.map((src, i) => {
                                                if (i !== idx) return src;
                                                return {
                                                  ...src,
                                                  config: { ...src.config, adAccountId: val, campaignId: '' }
                                                };
                                              });
                                              setSelectedSources(newSources);
                                              if (val && source.capabilities.includes('get_campaign_insights')) {
                                                loadFbCampaigns(source.connectionId, val);
                                              }
                                            }}
                                            className="w-full px-3 py-2 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-lg text-[11px] text-white focus:outline-none transition-all cursor-pointer"
                                          >
                                            <option value="">-- Chọn Tài khoản --</option>
                                            {(fbResources[source.connectionId]?.adAccounts || []).map((a: any) => (
                                              <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      {source.capabilities.includes('get_campaign_insights') && (
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400 block font-bold">
                                            Chọn Chiến dịch Quảng cáo (Campaign):
                                          </label>
                                          {fetchingFbCampaigns[`${source.connectionId}_${source.config?.adAccountId}`] ? (
                                            <div className="flex items-center gap-2 text-[11px] text-gray-400 py-2">
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải danh sách chiến dịch...
                                            </div>
                                          ) : !source.config?.adAccountId ? (
                                            <div className="text-[11px] text-orange-400">Vui lòng chọn Tài khoản Quảng cáo trước.</div>
                                          ) : (
                                            <select
                                              value={source.config?.campaignId || ''}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const newSources = selectedSources.map((src, i) => {
                                                  if (i !== idx) return src;
                                                  return {
                                                    ...src,
                                                    config: { ...src.config, campaignId: val }
                                                  };
                                                });
                                                setSelectedSources(newSources);
                                              }}
                                              className="w-full px-3 py-2 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-lg text-[11px] text-white focus:outline-none transition-all cursor-pointer"
                                            >
                                              <option value="">-- Chọn Chiến dịch --</option>
                                              <option value="ALL">-- Tất cả chiến dịch --</option>
                                              {(fbResources[source.connectionId]?.campaigns?.[source.config.adAccountId] || []).map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                                              ))}
                                            </select>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs text-gray-300 font-bold block mb-1">
                        Chọn Khoảng thời gian dữ liệu
                      </label>
                      <span className="text-[10px] text-gray-500 block mb-1.5">📊 Báo cáo ngày:</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'today', label: 'Hôm nay' },
                          { id: 'yesterday', label: 'Hôm qua' },
                          { id: 'this_week', label: 'Tuần này' },
                          { id: 'last_7_days', label: '7 ngày' }
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDateRange(d.id)}
                            className={`py-2 px-1 border rounded-lg text-[11px] font-black cursor-pointer transition-all text-center ${
                              dateRange === d.id
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-2.5 mb-1.5">📑 Báo cáo kế toán:</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'last_30_days', label: '30 ngày' },
                          { id: 'this_month', label: 'Tháng này' },
                          { id: 'last_month', label: 'Tháng trước' },
                          { id: 'last_quarter', label: 'Quý trước' }
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDateRange(d.id)}
                            className={`py-2 px-1 border rounded-lg text-[11px] font-black cursor-pointer transition-all text-center ${
                              dateRange === d.id
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      {['last_30_days', 'this_month', 'last_month', 'last_quarter'].includes(dateRange) && (
                        <p className="text-[10px] text-amber-500/80 mt-2 flex items-center gap-1">
                          <span>⏱️</span> Khoảng thời gian dài — Dữ liệu có thể mất 15-30 giây để tải xong.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedSources.length === 0) {
                          showToast('Vui lòng chọn nguồn dữ liệu', 'error');
                          return;
                        }
                        // Validation: Mỗi nguồn phải chọn ít nhất 1 năng lực
                        const hasEmptyCapabilities = selectedSources.some(s => s.capabilities.length === 0);
                        if (hasEmptyCapabilities) {
                          showToast('Mỗi nguồn dữ liệu phải chọn ít nhất 1 năng lực báo cáo', 'error');
                          return;
                        }

                        // Validation cho Facebook config
                        for (const src of selectedSources) {
                          if (src.provider === 'facebook' || src.provider === 'meta') {
                            if (src.capabilities.includes('get_page_insights') && !src.config?.pageId) {
                              showToast('Vui lòng chọn Fanpage Facebook', 'error');
                              return;
                            }
                            if (src.capabilities.includes('get_ad_account_insights') && !src.config?.adAccountId) {
                              showToast('Vui lòng chọn Tài khoản Quảng cáo', 'error');
                              return;
                            }
                            if (src.capabilities.includes('get_campaign_insights')) {
                              if (!src.config?.adAccountId) {
                                showToast('Vui lòng chọn Tài khoản Quảng cáo cho Chiến dịch', 'error');
                                return;
                              }
                              if (!src.config?.campaignId) {
                                showToast('Vui lòng nhập ID Chiến dịch Quảng cáo', 'error');
                                return;
                              }
                            }
                          }
                        }

                        setPreviewingData(true);
                        setPreviewDataResult(null);
                        try {
                          const res = await previewReportDataAction(teamId, {
                            inputSources: selectedSources,
                            reportSpec: { reportType, dateRange },
                            name: scheduleName || 'Test Báo Cáo'
                          });
                          if (res.success) {
                            setPreviewDataResult({ success: true, text: res.data?.reportText, metricsJson: res.data?.metricsJson });
                          } else {
                            setPreviewDataResult({ success: false, error: res.error });
                          }
                        } catch (error: any) {
                          setPreviewDataResult({ success: false, error: error.message });
                        } finally {
                          setPreviewingData(false);
                        }
                      }}
                      disabled={previewingData || selectedSources.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {previewingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Test kéo dữ liệu (Chưa có AI)
                    </button>

                    {previewDataResult && (
                      <div className={`mt-3 p-4 rounded-xl border text-xs max-h-60 overflow-y-auto font-mono whitespace-pre-wrap ${
                        previewDataResult.success 
                          ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                      }`}>
                        {previewDataResult.success ? (
                          <>
                            <div className="font-extrabold text-[10px] text-emerald-500 mb-2">DỮ LIỆU ĐÃ LẤY THÀNH CÔNG:</div>
                            <div dangerouslySetInnerHTML={{ __html: previewDataResult.text?.replace(/\n/g, '<br/>') || '' }} />
                          </>
                        ) : (
                          <>
                            <div className="font-extrabold text-[10px] text-rose-500 mb-1">LỖI LẤY DỮ LIỆU:</div>
                            {previewDataResult.error}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Chỉ dẫn AI viết lời bình */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-4">
                    <label className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-orange-400" />
                      3. Cấu hình AI nhận xét & gợi ý
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-all">
                      <input 
                        type="checkbox"
                        checked={skipAiConfig}
                        onChange={(e) => setSkipAiConfig(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-orange-500 focus:ring-orange-500/50 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">Không sử dụng AI (Chỉ gửi số liệu thô)</span>
                        <span className="text-[10px] text-gray-400">Hệ thống sẽ không gọi AI để tổng hợp, giúp tiết kiệm chi phí token và thời gian thực thi.</span>
                      </div>
                    </label>

                    {!skipAiConfig && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-gray-400 font-bold">1. Chọn nhà cung cấp AI</label>
                            {aiConnections.length === 0 ? (
                              <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2">
                                <p className="text-[11px] text-gray-300">Chưa có kết nối AI nào.</p>
                                <Link href={`/connect-hub/t/${teamId}/connections`} className="inline-flex items-center gap-1 text-[11px] font-black text-orange-400 hover:text-orange-300">
                                  Tạo kết nối AI <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            ) : (
                              <select
                                value={aiProvider}
                                onChange={(e) => {
                                  setAiProvider(e.target.value);
                                  const models = aiModelsMap[e.target.value] || [];
                                  if (models.length > 0) {
                                    setAiModel(models[0].value);
                                  }
                                }}
                                className="w-full px-3 py-2 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-lg text-xs text-white focus:outline-none transition-all"
                              >
                                {aiConnections.map(c => (
                                  <option key={c.id} value={c.appSlug}>{c.connectionName} ({c.appSlug})</option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] text-gray-400 font-bold">2. Chọn mô hình AI (Model)</label>
                            <select
                              value={aiModel}
                              onChange={(e) => setAiModel(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-lg text-xs text-white focus:outline-none transition-all"
                              disabled={!aiProvider || !aiModelsMap[aiProvider] || aiModelsMap[aiProvider].length === 0}
                            >
                              {(aiModelsMap[aiProvider] || []).map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] text-gray-400 font-bold">3. Chỉ dẫn AI viết lời bình (Tùy chọn)</label>
                          <textarea
                            placeholder="Ví dụ: Hãy phân tích kỹ lý do đơn hàng giảm, viết giọng điệu ngắn gọn súc tích, nhấn mạnh hàng tồn dưới 5 chiếc."
                            rows={4}
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-xl text-xs text-white focus:outline-none transition-all resize-none"
                          />
                        </div>

                        <div className="pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!previewDataResult || !previewDataResult.success || !previewDataResult.metricsJson) {
                                console.warn("Cannot test AI because previewDataResult is missing metricsJson:", previewDataResult);
                                alert('Hệ thống chưa có số liệu thô!\n\nVui lòng quay lại Bước 2 và nhấn "Test kéo dữ liệu" một lần nữa để lấy dữ liệu mới nhất cho AI phân tích.');
                                return;
                              }
                              if (!aiModel) {
                                alert('Vui lòng chọn Model AI.');
                                return;
                              }
                              setTestingAi(true);
                              setTestAiResult(null);
                              try {
                                const res = await testAiCommentaryAction(teamId, aiModel, customPrompt, previewDataResult.metricsJson);
                                if (res.success && res.data) {
                                  setTestAiResult({ success: true, text: res.data.aiText });
                                } else {
                                  setTestAiResult({ success: false, error: res.error });
                                }
                              } catch (err: any) {
                                setTestAiResult({ success: false, error: err.message });
                              } finally {
                                setTestingAi(false);
                              }
                            }}
                            disabled={testingAi || !aiModel}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 rounded-xl text-xs font-black text-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {testingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Test gọi AI nhận xét từ Dữ liệu đã kéo
                          </button>

                          {testAiResult && (
                            <div className={`mt-3 p-4 rounded-xl border text-xs max-h-60 overflow-y-auto font-mono whitespace-pre-wrap ${
                              testAiResult.success 
                                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                                : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                            }`}>
                              {testAiResult.success ? (
                                <>
                                  <div className="font-extrabold text-[10px] text-emerald-500 mb-2">🤖 AI NHẬN XÉT (PREVIEW):</div>
                                  <div dangerouslySetInnerHTML={{ __html: testAiResult.text?.replace(/\n/g, '<br/>') || '' }} />
                                </>
                              ) : (
                                <>
                                  <div className="font-extrabold text-[10px] text-rose-500 mb-1">LỖI GỌI AI:</div>
                                  {testAiResult.error}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Thiết Lập Lịch Chạy */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2.5">
                    <label className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-orange-400" />
                      4. Thiết lập Lịch tự động chạy
                    </label>
                    <div className="grid grid-cols-2 gap-3.5">
                      {[
                        { id: 'manual', label: 'Chỉ chạy thủ công', desc: 'Chỉ chạy khi bạn nhấn nút Chạy Ngay' },
                        { id: 'hourly', label: 'Hàng giờ', desc: 'Gửi báo cáo định kỳ mỗi giờ' },
                        { id: 'daily', label: 'Hàng ngày', desc: 'Gửi báo cáo vào một giờ cố định mỗi ngày' },
                        { id: 'weekly', label: 'Hàng tuần', desc: 'Gửi báo cáo vào ngày chỉ định trong tuần' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setScheduleType(item.id as any)}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition-all space-y-1.5 ${
                            scheduleType === item.id 
                              ? 'bg-orange-500/5 border-orange-500/40 shadow-md shadow-orange-500/5' 
                              : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                          }`}
                        >
                          <span className="font-extrabold text-xs text-white block">{item.label}</span>
                          <span className="text-[10px] text-gray-400 font-medium block leading-snug">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Daily configuration */}
                  {scheduleType === 'daily' && (
                    <div className="flex items-center gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                      <span className="text-xs text-gray-400 font-bold">Chọn giờ gửi:</span>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={cronHour}
                        onChange={(e) => setCronHour(e.target.value.padStart(2, '0'))}
                        className="w-16 px-2 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-center text-xs text-white"
                      />
                      <span className="text-gray-400 font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={cronMinute}
                        onChange={(e) => setCronMinute(e.target.value.padStart(2, '0'))}
                        className="w-16 px-2 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-center text-xs text-white"
                      />
                      <span className="text-[11px] text-gray-500 font-semibold ml-2">Múi giờ: Asia/Ho_Chi_Minh</span>
                    </div>
                  )}

                  {/* Weekly configuration */}
                  {scheduleType === 'weekly' && (
                    <div className="space-y-2 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-bold">Chọn thứ:</span>
                        <select
                          value={cronDow}
                          onChange={(e) => setCronDow(e.target.value)}
                          className="px-3 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-xs text-white"
                        >
                          <option value="1">Thứ Hai</option>
                          <option value="2">Thứ Ba</option>
                          <option value="3">Thứ Tư</option>
                          <option value="4">Thứ Năm</option>
                          <option value="5">Thứ Sáu</option>
                          <option value="6">Thứ Bảy</option>
                          <option value="0">Chủ Nhật</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-bold">Chọn giờ:</span>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={cronHour}
                          onChange={(e) => setCronHour(e.target.value.padStart(2, '0'))}
                          className="w-16 px-2 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-center text-xs text-white"
                        />
                        <span className="text-gray-400 font-bold">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={cronMinute}
                          onChange={(e) => setCronMinute(e.target.value.padStart(2, '0'))}
                          className="w-16 px-2 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-center text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Cổng Nhận Báo Cáo */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-orange-400" />
                      5. Chọn Cổng Nhận Báo Cáo
                    </label>
                    {outputConnections.length === 0 ? (
                      <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-3">
                        <p className="text-xs text-gray-300">
                          Không gian làm việc này chưa có kết nối API <strong>Telegram Bot</strong> hoặc <strong>Zalo ZNS & OA</strong> nào thành công.
                        </p>
                        <Link
                          href={`/connect-hub/t/${teamId}/connections`}
                          className="inline-flex items-center gap-1.5 text-xs font-black text-orange-400 hover:text-orange-300"
                        >
                          Tạo kết nối nhận tin tại Connect Hub <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={selectedOutputId}
                        onChange={(e) => setSelectedOutputId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-xl text-xs text-white focus:outline-none transition-all"
                      >
                        <option value="">-- Chọn Cổng Nhận Báo Cáo --</option>
                        {outputConnections.map(c => (
                          <option key={c.id} value={c.id.toString()}>
                            {c.connectionName} ({c.appSlug === 'telegram' ? 'Telegram' : c.appSlug === 'zalo-zns' ? 'Zalo ZNS & OA' : c.appSlug})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 font-bold block">
                      {selectedOutputConn?.appSlug === 'zalo-zns' 
                        ? 'Zalo User ID hoặc Số điện thoại nhận tin' 
                        : 'Nhập Chat ID nhận báo cáo (Cá nhân hoặc Nhóm)'}
                    </label>
                    <input
                      type="text"
                      placeholder={selectedOutputConn?.appSlug === 'zalo-zns'
                        ? 'Ví dụ: 0912345678 hoặc 38472910384729104'
                        : 'Ví dụ: -100123456789 (Nhóm) hoặc 123456789 (Cá nhân)'}
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 border border-white/10 hover:border-white/15 focus:border-orange-500/50 rounded-xl text-xs text-white focus:outline-none transition-all"
                    />
                    
                    {selectedOutputConn?.appSlug === 'zalo-zns' ? (
                      <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl space-y-2 text-[10px] text-gray-400 leading-relaxed">
                        <strong className="text-gray-300">Hướng dẫn gửi báo cáo qua Zalo OA:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Để nhận tin nhắn OA CS miễn phí, người nhận bắt buộc phải <strong>quan tâm Zalo OA</strong> của bạn.</li>
                          <li>Lấy <strong>Zalo User ID</strong> của người nhận trong trang quản trị Zalo OA và nhập vào ô phía trên.</li>
                          <li>Hoặc nhập <strong>Số điện thoại</strong> nếu bạn đã cấu hình gói ZNS Template trả phí cho số điện thoại đó.</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl space-y-2 text-[10px] text-gray-400 leading-relaxed">
                        <strong className="text-gray-300">Hướng dẫn lấy Chat ID Nhóm:</strong>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Tạo một nhóm (Group) mới trên Telegram.</li>
                          <li>Thêm bot <span className="text-orange-400 font-mono font-bold">@myidbot</span> vào nhóm của bạn.</li>
                          <li>Thêm cả <strong>Bot Telegram hệ thống</strong> chính là bot (ai2hero_bot) đã tạo ở bước kết nối Telegram với Connect Hub vào nhóm để gửi tin nhắn lên nhóm.</li>
                          <li>Gõ lệnh <code className="text-orange-400 font-mono bg-white/5 px-1 py-0.5 rounded">/getgroupid</code> trong nhóm. Bot sẽ phản hồi Chat ID (là một chuỗi số âm, ví dụ: -5199688904 hoặc bắt đầu bằng -100).</li>
                          <li>Copy toàn bộ chuỗi số đó (cả dấu trừ) và dán vào ô phía trên.</li>
                        </ol>
                      </div>
                    )}
                  </div>

                  {/* Test preview section */}
                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300 font-bold">Kiểm tra kết nối & định dạng</span>
                      <button
                        type="button"
                        onClick={handleTestRun}
                        disabled={testingReport || selectedSources.length === 0 || !selectedOutputId || !targetId.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 rounded-lg text-[11px] font-extrabold text-orange-400 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {testingReport ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 shrink-0" />
                        )}
                        Gửi thử ngay
                      </button>
                    </div>

                    {testResponse && (
                      <div className={`p-4 rounded-xl border text-xs max-h-48 overflow-y-auto font-mono whitespace-pre-wrap ${
                        testResponse.success 
                          ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                      }`}>
                        {testResponse.success ? (
                          <>
                            <div className="font-extrabold text-[10px] text-emerald-500 mb-2">PREVIEW BÁO CÁO (ĐÃ GỬI QUA CỔNG CHỌN):</div>
                            {testResponse.text}
                          </>
                        ) : (
                          <>
                            <div className="font-extrabold text-[10px] text-rose-500 mb-1">GỬI THẤT BẠI:</div>
                            {testResponse.error}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between shrink-0">
              <button
                type="button"
                disabled={currentStep === 1 || submitting}
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-xl text-xs font-black text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && !scheduleName.trim()) {
                      showToast('Vui lòng nhập tên lịch báo cáo', 'error');
                      return;
                    }
                    if (currentStep === 1 && selectedSources.length === 0) {
                      showToast('Vui lòng chọn ít nhất một kết nối nguồn dữ liệu', 'error');
                      return;
                    }
                    // Validation khi rời Step 2: mỗi nguồn phải chọn ít nhất 1 năng lực
                    if (currentStep === 2) {
                      const hasEmptyCapabilities = selectedSources.some(s => s.capabilities.length === 0);
                      if (hasEmptyCapabilities) {
                        showToast('Mỗi nguồn dữ liệu phải chọn ít nhất 1 năng lực báo cáo', 'error');
                        return;
                      }
                    }
                    setCurrentStep(prev => prev + 1);
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-xl text-xs font-black text-white transition-all cursor-pointer active:scale-[0.98]"
                >
                  Tiếp theo
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || testingReport}
                  onClick={handleSaveSchedule}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-xl text-xs font-black text-white transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {editingScheduleId ? 'Cập nhật lịch báo cáo' : 'Lưu lịch tự động'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
