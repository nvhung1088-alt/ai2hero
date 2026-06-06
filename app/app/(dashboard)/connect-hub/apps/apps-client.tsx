'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ConnectorDefinition, AuthField } from '@/lib/connect-hub/connectors/types';
import { createConnectionAction, getConnectorHealthStats, fetchPancakePagesDirectlyAction, pingConnectionPreviewAction, getConnectorDetailAction } from '@/lib/db/connect-hub-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import {
  Search,
  Plug,
  Globe,
  ShoppingCart,
  FileSpreadsheet,
  Mail,
  Send,
  Check,
  Loader2,
  HelpCircle,
  RefreshCw,
  X,
  Lock,
  Bot,
  Brain,
  Sparkles,
  Cpu,
  Network,
  Layers,
  Video,
  Film,
  Store,
  Wallet,
  SmartphoneNfc,
  HardDrive,
  Share2,
  MessageSquare,
  Activity,
  Clock,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AppsClientProps {
  teamId: number;
  allConnectors: ConnectorDefinition[];
  connectedSlugs: string[];
}

function getConnectorIcon(iconName: string, className: string = 'h-5 w-5') {
  switch (iconName) {
    case 'bot':
      return <Bot className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'network':
      return <Network className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'store':
      return <Store className={className} />;
    case 'wallet':
      return <Wallet className={className} />;
    case 'smartphone-nfc':
      return <SmartphoneNfc className={className} />;
    case 'hard-drive':
      return <HardDrive className={className} />;
    case 'share-2':
      return <Share2 className={className} />;
    case 'message-square':
      return <MessageSquare className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'shopping-cart':
      return <ShoppingCart className={className} />;
    case 'shopping-bag':
      return <Store className={className} />;
    case 'file-spreadsheet':
      return <FileSpreadsheet className={className} />;
    case 'mail':
      return <Mail className={className} />;
    case 'send':
      return <Send className={className} />;
    default:
      return <Plug className={className} />;
  }
}


const GRADIENTS = [
  'from-teal-500 to-emerald-400',
  'from-orange-400 to-amber-500',
  'from-blue-500 to-indigo-400',
  'from-slate-700 to-slate-900',
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-fuchsia-500',
  'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-green-500 to-green-600',
  'from-indigo-600 to-blue-700',
  'from-rose-500 to-red-600',
  'from-cyan-500 to-blue-500',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-fuchsia-500 to-pink-600',
  'from-sky-400 to-blue-600',
];

function getConnectorColorFallback(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  return GRADIENTS[hash % GRADIENTS.length];
}

function getConnectorColor(slug: string) {
  switch (slug) {
    case 'openai':
      return 'from-teal-500 to-emerald-400';
    case 'anthropic':
      return 'from-orange-400 to-amber-500';
    case 'gemini':
      return 'from-blue-500 to-indigo-400';
    case 'grok':
      return 'from-slate-700 to-slate-900';
    case 'deepseek':
      return 'from-blue-600 to-indigo-600';
    case 'qwen':
      return 'from-purple-600 to-fuchsia-500';
    case 'runway':
      return 'from-violet-500 to-purple-500';
    case 'luma':
      return 'from-pink-500 to-rose-500';
    case 'sapo':
      return 'from-green-500 to-green-600';
    case 'payos':
      return 'from-indigo-600 to-blue-700';
    case 'momo':
      return 'from-pink-500 to-rose-600';
    case 'google-drive':
      return 'from-blue-500 to-green-500';
    case 'facebook':
      return 'from-blue-600 to-blue-700';
    case 'zalo':
      return 'from-blue-500 to-sky-500';
    case 'tiktok':
      return 'from-gray-900 to-black';
    case 'custom-http':
      return 'from-blue-500 to-cyan-500';
    case 'kiotviet':
      return 'from-green-500 to-emerald-500';
    case 'google-sheets':
      return 'from-green-600 to-teal-500';
    case 'gmail':
      return 'from-red-500 to-rose-400';
    case 'telegram':
      return 'from-sky-400 to-blue-500';
    default:
      return getConnectorColorFallback(slug);
  }
}

function ConnectorLogo({ app, className = "h-5 w-5" }: { app: ConnectorDefinition, className?: string }) {
  const [imgError, setImgError] = useState(false);
  const logoSrc = app.logoUrl || `https://cdn.activepieces.com/pieces/${app.slug}.png`;

  if (!imgError) {
    return <img src={logoSrc} alt={app.name} className={`${className} object-contain`} onError={() => setImgError(true)} />;
  }
  return getConnectorIcon(app.icon, className);
}

export default function ConnectHubAppsClient({
  teamId,
  allConnectors,
  connectedSlugs: initialConnectedSlugs
}: AppsClientProps) {
  const [connectedSlugs, setConnectedSlugs] = useState<string[]>(initialConnectedSlugs);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'popular' | 'ai' | 'pos' | 'payment' | 'social' | 'chat' | 'storage' | 'email' | 'developer' | 'all'>('popular');
  const [filterReady, setFilterReady] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ConnectorDefinition | null>(null);
  
  // Form State
  const [connectionName, setConnectionName] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Health Stats State
  const [healthStats, setHealthStats] = useState<{ totalRequests: number; successRate: number; avgDuration: number } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);


  // Pancake States
  const [pancakePages, setPancakePages] = useState<{id: string, name: string, category: string}[]>([]);
  const [fetchingPages, setFetchingPages] = useState(false);

  // SSR Hydration Fix
  const [isMounted, setIsMounted] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Body Scroll Lock & Escape key listener
  useEffect(() => {
    if (!selectedApp) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseConnect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedApp]);

  // Autofocus input
  useEffect(() => {
    if (selectedApp) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedApp]);

  // Load Health Stats
  useEffect(() => {
    if (selectedApp) {
      setLoadingHealth(true);
      getConnectorHealthStats(teamId, selectedApp.slug).then((res) => {
        if (res.success && res.data) {
          setHealthStats(res.data as any);
        }
        setLoadingHealth(false);
      });
    } else {
      setHealthStats(null);
    }
  }, [selectedApp, teamId]);

  // Bộ lọc danh mục
  const categories = [
    { id: 'popular', label: '🔥 Phổ biến' },

    { id: 'ai', label: '🤖 Trí tuệ Nhân tạo' },
    { id: 'pos', label: '🛒 Bán hàng / POS' },
    { id: 'payment', label: '💳 Thanh toán' },
    { id: 'social', label: '🌐 Mạng xã hội' },
    { id: 'chat', label: '💬 Chat / Alerts' },
    { id: 'storage', label: '📂 Lưu trữ' },
    { id: 'email', label: '✉️ Email' },
    { id: 'developer', label: '🛠️ Developer' },
    { id: 'all', label: 'Tất cả' }
  ];

  // Lọc ứng dụng
  const filteredApps = allConnectors.filter((app) => {
    // 1. Lọc theo thanh tìm kiếm
    const matchesSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterReady && app.status !== 'ready') return false;

    // 2. Lọc theo danh mục active
    if (activeCategory === 'all') return true;
    if (activeCategory === 'popular') return !!app.popular;
    return app.category === activeCategory;
  });

  const handleOpenConnect = async (app: ConnectorDefinition) => {
    setConnectionName(`Kết nối ${app.name}`);
    
    if (app.runtimeType === 'catalog_only' || app.runtimeType === 'generic_http') {
      setLoadingDetail(true);
      setSelectedApp({
        ...app,
        authFields: [],
        actions: []
      });
      
      try {
        const res = await getConnectorDetailAction(teamId, app.slug);
        if (res.success && res.data) {
          const detail = res.data as ConnectorDefinition;
          setSelectedApp(detail);
          
          const defaultData: Record<string, string> = {};
          detail.authFields.forEach(field => {
            defaultData[field.name] = '';
          });
          setFormData(defaultData);
        } else {
          showToast(res.error || 'Không thể tải chi tiết cổng kết nối.', 'error');
          setSelectedApp(null);
        }
      } catch (err) {
        showToast('Lỗi tải dữ liệu chi tiết.', 'error');
        setSelectedApp(null);
      } finally {
        setLoadingDetail(false);
      }
    } else {
      setSelectedApp(app);
      
      // Khởi tạo form data với các trường mặc định
      const defaultData: Record<string, string> = {};
      app.authFields.forEach(field => {
        defaultData[field.name] = '';
      });
      setFormData(defaultData);
    }
  };


  const handleCloseConnect = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSelectedApp(null);
    setConnectionName('');
    setFormData({});
    setSaving(false);
    setTesting(false);
    setPancakePages([]);
    setFetchingPages(false);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Xác định xem một trường nhập liệu cụ thể có cần hiển thị hay không (dành cho Custom HTTP)
  const shouldShowField = (field: AuthField) => {
    if (selectedApp?.slug !== 'custom-http') return true;
    
    const authMethod = formData.authMethod || 'none';
    
    if (field.name === 'authMethod' || field.name === 'baseUrl') return true;
    if (field.name === 'token') return ['bearer_token', 'api_key_header'].includes(authMethod);
    if (field.name === 'headerName') return authMethod === 'api_key_header';
    if (field.name === 'username' || field.name === 'password') return authMethod === 'basic_auth';
    
    return false;
  };

  // Test kết nối trước khi lưu
  const handleTestConnection = async () => {
    if (!selectedApp) return;
    
    // Hủy request cũ nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setTesting(true);
    
    try {
      const res = await pingConnectionPreviewAction(teamId, selectedApp.slug, formData);
      
      if (controller.signal.aborted) return;

      if (!res.success) {
        throw new Error(res.error || 'Kiểm tra kết nối thất bại.');
      }

      showToast(`Kết nối thử nghiệm tới ${selectedApp.name} thành công.`, 'success');
    } catch (error: any) {
      if (controller.signal.aborted) return;
      showToast(error.message || 'Kiểm tra kết nối thất bại.', 'error');
    } finally {
      if (abortControllerRef.current === controller) {
        setTesting(false);
      }
    }
  };

  // Lưu kết nối vào DB
  const handleSaveConnection = async () => {
    if (!selectedApp) return;
    if (!connectionName.trim()) {
      showToast('Vui lòng nhập Tên kết nối.', 'error');
      return;
    }

    // Kiểm tra các trường bắt buộc
    let hasValidationError = false;
    selectedApp.authFields.forEach(field => {
      if (shouldShowField(field) && field.required && !formData[field.name]) {
        showToast(`Trường "${field.label}" là bắt buộc.`, 'error');
        hasValidationError = true;
      }
    });

    if (hasValidationError) return;

    setSaving(true);
    try {
      const result = await createConnectionAction(teamId, {
        appSlug: selectedApp.slug,
        appName: selectedApp.name,
        connectionName: connectionName.trim(),
        authType: selectedApp.authType,
        credentials: formData
      });

      if (result.success) {
        showToast(`Đã lưu kết nối "${connectionName}" thành công.`, 'success');
        
        // Thêm slug vào danh sách đã kết nối để hiển thị badge
        if (!connectedSlugs.includes(selectedApp.slug)) {
          setConnectedSlugs(prev => [...prev, selectedApp.slug]);
        }
        
        handleCloseConnect();
      } else {
        showToast(result.error || 'Có lỗi xảy ra khi lưu kết nối.', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi hệ thống khi lưu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            Kho ứng dụng tích hợp (App Catalog)
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">Tìm kiếm và thiết lập kết nối tới các ứng dụng doanh nghiệp</p>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm ứng dụng tích hợp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl bg-gray-900/40 border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Pill Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex flex-wrap gap-2 flex-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/10'
                  : 'bg-gray-900/40 border border-white/5 text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl hover:bg-emerald-500/20 transition-colors shrink-0">
          <input 
            type="checkbox" 
            checked={filterReady} 
            onChange={(e) => setFilterReady(e.target.checked)}
            className="rounded text-emerald-500 focus:ring-emerald-500 bg-black/50 border-white/20 h-4 w-4"
          />
          <span className="text-xs font-bold text-emerald-400 select-none">Chỉ hiện App ✅ Sẵn sàng</span>
        </label>
      </div>

      {/* Global Security Alert */}
      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in">
        <Lock className="h-5 w-5 text-purple-400 shrink-0" />
        <p className="text-xs text-gray-300 font-medium leading-relaxed">
          Thông tin API Key / Credentials của bạn sẽ được mã hóa đối xứng bằng chuẩn quân đội <span className="text-purple-400 font-bold">AES-256-GCM</span> trực tiếp trên máy chủ AI2Hero trước khi ghi xuống database. Tuyệt đối không lưu plaintext.
        </p>
      </div>

      {/* Grid Cards Connectors */}
      {filteredApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
          <span className="text-4xl">🔍</span>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-300">Không tìm thấy ứng dụng nào khớp</p>
            <p className="text-[10px] text-gray-500 font-medium mt-1">Thử thay đổi từ khóa hoặc bộ lọc danh mục</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => {
            const isConnected = connectedSlugs.includes(app.slug);
            return (
              <div
                key={app.slug}
                onClick={() => handleOpenConnect(app)}
                className="bg-gray-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group backdrop-blur-xl hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  {/* Icon & Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${getConnectorColor(app.slug)} text-white shadow-md shadow-purple-500/5 group-hover:scale-105 transition-transform duration-300`}>
                      <ConnectorLogo app={app} />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end pl-2">
                      {app.badge && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap shadow-sm border ${
                          app.badge.variant === 'premium' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' : 
                          app.badge.variant === 'free' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {app.badge.text}
                        </span>
                      )}
                      {app.status === 'ready' ? (
                        <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap">
                          Sẵn sàng
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap">
                          Đang cập nhật
                        </span>
                      )}
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm whitespace-nowrap">
                          <Check className="h-3 w-3" /> Đã kết nối
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-500 font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap">
                          Chưa liên kết
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium capitalize mt-0.5">
                      Danh mục: {app.category === 'pos' ? 'Bán hàng / POS' : app.category === 'payment' ? 'Thanh toán' : app.category === 'social' ? 'Mạng xã hội' : app.category === 'storage' ? 'Lưu trữ' : app.category === 'email' ? 'Email' : app.category === 'chat' ? 'Chat / Alerts' : app.category === 'developer' ? 'Developer' : app.category === 'ai' ? 'Trí tuệ Nhân tạo' : app.category}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    {app.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-gray-500 group-hover:text-purple-400 transition-colors select-none">
                  <span>Thiết lập kết nối</span>
                  <span>➜</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Connection Modal using React Portal */}
      {isMounted && selectedApp && createPortal(
        <div
          ref={backdropRef}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === backdropRef.current) {
              handleCloseConnect();
            }
          }}
        >
          <div
            className="bg-gray-900/95 border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl animate-scale-up backdrop-blur-2xl flex flex-col max-h-[90vh] overflow-hidden text-white"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 p-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-tr ${getConnectorColor(selectedApp.slug)} text-white`}>
                  <ConnectorLogo app={selectedApp} className="h-4.5 w-4.5" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-white">Kết nối {selectedApp.name}</h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Nhập cấu hình để thiết lập cổng API an toàn</p>
                </div>
              </div>
              <button
                onClick={handleCloseConnect}
                className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pr-5">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <p className="text-xs text-gray-400 font-semibold">Đang tải chi tiết API Schema từ catalog...</p>
                </div>
              ) : (
                <>
                  {/* Warning for Catalog Mode */}
                  {selectedApp.runtimeType === 'catalog_only' && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2.5 animate-fade-in">
                      <Lock className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10.5px] text-amber-400 font-bold">Catalog Mode (Chế độ xem trước)</p>
                        <p className="text-[9.5px] text-gray-300 font-medium leading-relaxed mt-0.5">
                          Cổng kết nối này hiện tại chỉ hỗ trợ xem cấu trúc API để tham khảo. Khả năng chạy thực tế sẽ được hỗ trợ trong đợt nâng cấp Batch tiếp theo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Connection Name field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Tên kết nối gợi nhớ <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="vd: KiotViet Shop Mỹ Phẩm"
                      value={connectionName}
                      onChange={(e) => setConnectionName(e.target.value)}
                      disabled={selectedApp.runtimeType === 'catalog_only'}
                      className="rounded-xl border-white/10 bg-white/5 text-white font-semibold text-xs disabled:opacity-50"
                    />
                    <p className="text-[9px] text-gray-500 font-medium">Đặt tên giúp bạn dễ dàng phân biệt khi gọi connection này từ các MVP khác.</p>
                  </div>


              {/* API Capabilities */}
              {selectedApp.actions && selectedApp.actions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 animate-pulse" /> Khả năng của API (Capabilities)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedApp.actions.map((act) => (
                      <div
                        key={act.slug}
                        className="bg-white/[0.02] border border-white/5 hover:border-purple-500/20 rounded-xl p-3 hover:bg-white/[0.04] transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0 shadow-sm shadow-purple-400/50" />
                          <h4 className="text-[11px] font-bold text-gray-200">{act.name}</h4>
                        </div>
                        <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed mt-1">
                          {act.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API Health Monitor Card */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Activity className="h-3 w-3" /> Theo dõi kết nối (Health Monitor)
                </label>
                {loadingHealth ? (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-center animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                ) : healthStats ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                      <Target className="h-4 w-4 text-emerald-400 mb-1.5" />
                      <span className="text-sm font-black text-white">{healthStats.successRate}%</span>
                      <span className="text-[9px] text-gray-500 font-medium">Tỷ lệ Thành công</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                      <Activity className="h-4 w-4 text-blue-400 mb-1.5" />
                      <span className="text-sm font-black text-white">{healthStats.totalRequests.toLocaleString()}</span>
                      <span className="text-[9px] text-gray-500 font-medium">Tổng Requests</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                      <Clock className="h-4 w-4 text-amber-400 mb-1.5" />
                      <span className="text-sm font-black text-white">{healthStats.avgDuration} <span className="text-[10px] font-normal">ms</span></span>
                      <span className="text-[9px] text-gray-500 font-medium">Độ trễ trung bình</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-gray-500">Chưa có dữ liệu theo dõi kết nối</span>
                  </div>
                )}
              </div>

              {/* Setup Guide Alert */}
              {selectedApp.setupGuide && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-2.5">
                  <HelpCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  {/* ⚠️ SECURITY NOTE: setupGuide phải là nội dung WHITELIST STATIC
                      từ source code (registry). KHÔNG bao giờ render nội dung từ DB/API
                      bên ngoài ở đây mà không sanitize trước bằng DOMPurify. */}
                  <div 
                    className="text-[10px] text-gray-300 font-medium leading-relaxed prose prose-invert prose-p:m-0 prose-p:mb-1 last:prose-p:mb-0 prose-a:text-blue-400 hover:prose-a:text-blue-300 max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedApp.setupGuide }}
                  />
                </div>
              )}

              {/* Dynamic Auth fields */}
              {selectedApp.authFields.map((field) => {
                if (!shouldShowField(field)) return null;

                return (
                  <div key={field.name} className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={formData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={selectedApp.runtimeType === 'catalog_only'}
                        className="w-full rounded-xl border border-white/10 bg-gray-950/50 text-white font-semibold text-xs px-3.5 py-2.5 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                      >

                        <option value="" disabled>-- {field.placeholder || 'Chọn giá trị'} --</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-gray-900">
                            {opt === 'none' ? 'Không xác thực' : opt === 'bearer_token' ? 'Bearer Token' : opt === 'api_key_header' ? 'API Key Header' : opt === 'basic_auth' ? 'Basic Auth' : opt}
                          </option>
                        ))}
                      </select>
                    ) : selectedApp.slug === 'pancake-chat' && field.name === 'selectedPageIds' ? (
                      <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!formData['userAccessToken']) {
                                showToast('Vui lòng nhập User Access Token ở trường phía trên trước.', 'error');
                                return;
                              }
                              setFetchingPages(true);
                              const res = await fetchPancakePagesDirectlyAction(formData['userAccessToken']);
                              setFetchingPages(false);
                              if (res.success && res.data) {
                                setPancakePages(res.data as any);
                                showToast(`Đã tìm thấy ${res.data.length} Fanpage.`, 'success');
                              } else {
                                showToast(res.error || 'Lỗi lấy danh sách', 'error');
                              }
                            }}
                            disabled={fetchingPages}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {fetchingPages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Tải danh sách Page từ Pancake
                          </button>
                          <span className="text-[10px] text-gray-500 font-medium">Tick chọn các Page bên dưới</span>
                        </div>
                        
                        {pancakePages.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                            {pancakePages.map((page) => {
                              const currentIds = formData['selectedPageIds'] ? formData['selectedPageIds'].split(',').map(s => s.trim()).filter(Boolean) : [];
                              const isChecked = currentIds.includes(page.id);
                              return (
                                <label key={page.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-purple-500/20 border-purple-500/50' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-white/20 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        currentIds.push(page.id);
                                      } else {
                                        const idx = currentIds.indexOf(page.id);
                                        if (idx > -1) currentIds.splice(idx, 1);
                                      }
                                      handleFieldChange('selectedPageIds', currentIds.join(', '));
                                    }}
                                  />
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-[11px] font-bold text-gray-200 truncate">{page.name}</span>
                                    <span className="text-[9px] text-gray-500 truncate">{page.id}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <Input
                          type="text"
                          placeholder={field.placeholder || ''}
                          value={formData[field.name] || ''}
                          readOnly
                          className="rounded-xl border-white/10 bg-black/40 text-gray-400 font-semibold text-[10px] opacity-70"
                        />
                      </div>
                    ) : (
                      <Input
                        type={field.type === 'password' ? 'password' : 'text'}
                        placeholder={field.placeholder || ''}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={selectedApp.runtimeType === 'catalog_only'}
                        className="rounded-xl border-white/10 bg-white/5 text-white font-semibold text-xs disabled:opacity-50"
                      />

                    )}

                    {field.helpText && (
                      <p className="text-[9px] text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                        <HelpCircle className="h-3 w-3 text-gray-600" />
                        {field.helpText}
                      </p>
                    )}
                  </div>
                );
              })}
              </>
              )}
            </div>


            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between border-t border-white/5 p-6 pt-4 shrink-0 bg-gray-950/20">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving || loadingDetail || selectedApp.runtimeType === 'catalog_only'}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                    Đang ping test...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Kiểm thử kết nối
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseConnect}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer select-none"
                >
                  {selectedApp.runtimeType === 'catalog_only' ? 'Đóng' : 'Hủy'}
                </button>
                {selectedApp.runtimeType !== 'catalog_only' && (
                  <Button
                    onClick={handleSaveConnection}
                    disabled={saving || testing || loadingDetail}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl shadow-lg shadow-purple-500/10 cursor-pointer disabled:opacity-50 transition-all select-none"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Đang lưu kết nối...
                      </>
                    ) : (
                      'Lưu kết nối API 🔌'
                    )}
                  </Button>
                )}
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
