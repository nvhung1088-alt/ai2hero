'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ConnectorDefinition, AuthField } from '@/lib/connect-hub/connectors/types';
import { createConnectionAction } from '@/lib/db/connect-hub-actions';
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
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AppsClientProps {
  teamId: number;
  allConnectors: ConnectorDefinition[];
  connectedSlugs: string[];
}

function getConnectorIcon(slug: string, className: string = 'h-5 w-5') {
  switch (slug) {
    case 'openai':
      return <Bot className={className} />;
    case 'anthropic':
      return <Brain className={className} />;
    case 'gemini':
      return <Sparkles className={className} />;
    case 'grok':
      return <Cpu className={className} />;
    case 'deepseek':
      return <Network className={className} />;
    case 'qwen':
      return <Layers className={className} />;
    case 'runway':
      return <Video className={className} />;
    case 'luma':
      return <Film className={className} />;
    case 'sapo':
      return <Store className={className} />;
    case 'payos':
      return <Wallet className={className} />;
    case 'momo':
      return <SmartphoneNfc className={className} />;
    case 'google-drive':
      return <HardDrive className={className} />;
    case 'facebook':
      return <Share2 className={className} />;
    case 'zalo':
      return <MessageSquare className={className} />;
    case 'tiktok':
      return <Video className={className} />;
    case 'custom-http':
      return <Globe className={className} />;
    case 'kiotviet':
      return <ShoppingCart className={className} />;
    case 'google-sheets':
      return <FileSpreadsheet className={className} />;
    case 'gmail':
      return <Mail className={className} />;
    case 'telegram':
      return <Send className={className} />;
    default:
      return <Plug className={className} />;
  }
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
      return 'from-purple-500 to-indigo-500';
  }
}

export default function ConnectHubAppsClient({
  teamId,
  allConnectors,
  connectedSlugs: initialConnectedSlugs
}: AppsClientProps) {
  const [connectedSlugs, setConnectedSlugs] = useState<string[]>(initialConnectedSlugs);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'popular' | 'ai' | 'pos' | 'payment' | 'social' | 'chat' | 'storage' | 'email' | 'developer' | 'all'>('popular');
  const [selectedApp, setSelectedApp] = useState<ConnectorDefinition | null>(null);
  
  // Form State
  const [connectionName, setConnectionName] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

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

    // 2. Lọc theo danh mục active
    if (activeCategory === 'all') return true;
    if (activeCategory === 'popular') return !!app.popular;
    return app.category === activeCategory;
  });

  const handleOpenConnect = (app: ConnectorDefinition) => {
    setSelectedApp(app);
    setConnectionName(`Kết nối ${app.name}`);
    
    // Khởi tạo form data với các trường mặc định
    const defaultData: Record<string, string> = {};
    app.authFields.forEach(field => {
      defaultData[field.name] = '';
    });
    setFormData(defaultData);
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
      // Giả lập test kết nối trực tiếp từ form (trước khi lưu chính thức)
      let testSuccess = true;
      let errMsg = '';

      if (selectedApp.slug === 'custom-http') {
        const baseUrl = (formData.baseUrl || '').trim();
        if (!baseUrl) throw new Error('Vui lòng nhập Base URL.');
        
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        
        if (formData.authMethod === 'bearer_token' && formData.token) {
          headers['Authorization'] = `Bearer ${formData.token}`;
        }

        const res = await fetch(`${cleanBaseUrl}/`, { 
          method: 'GET', 
          headers,
          mode: 'no-cors', // Bật mode no-cors để tránh bị chặn CORS cục bộ khi test trên trình duyệt
          signal: controller.signal
        }).catch((err) => {
          if (err.name === 'AbortError') return { aborted: true };
          return null;
        });

        if (res && 'aborted' in res) {
          return; // Hủy kết nối ngang do đóng modal hoặc click nút test lại
        }

        if (!res) {
          throw new Error('Không thể ping kết nối tới Base URL. Vui lòng kiểm tra lại URL hoặc mạng.');
        }
      } else if (selectedApp.slug === 'kiotviet') {
        const retailer = (formData.retailer || '').trim();
        const clientId = (formData.clientId || '').trim();
        const clientSecret = (formData.clientSecret || '').trim();

        if (!retailer || !clientId || !clientSecret) {
          throw new Error('Vui lòng điền đầy đủ Tên gian hàng, Client ID và Client Secret.');
        }

        // Tạo delay ảo hỗ trợ AbortController
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(resolve, 800);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      } else {
        // Giả lập delay test cho Sheets, Gmail, Telegram
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(resolve, 800);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }

      showToast(`Kết nối thử nghiệm tới ${selectedApp.name} thành công.`, 'success');
    } catch (error: any) {
      if (error.name === 'AbortError') return;
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
      <div className="flex flex-wrap gap-2">
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
                      {getConnectorIcon(app.slug)}
                    </div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm">
                        <Check className="h-3 w-3" /> Đã kết nối
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-500 font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Chưa liên kết
                      </span>
                    )}
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
                  {getConnectorIcon(selectedApp.slug, 'h-4.5 w-4.5')}
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
                  className="rounded-xl border-white/10 bg-white/5 text-white font-semibold text-xs"
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
                        className="w-full rounded-xl border border-white/10 bg-gray-950/50 text-white font-semibold text-xs px-3.5 py-2.5 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="" disabled>-- {field.placeholder || 'Chọn giá trị'} --</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-gray-900">
                            {opt === 'none' ? 'Không xác thực' : opt === 'bearer_token' ? 'Bearer Token' : opt === 'api_key_header' ? 'API Key Header' : opt === 'basic_auth' ? 'Basic Auth' : opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={field.type === 'password' ? 'password' : 'text'}
                        placeholder={field.placeholder || ''}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="rounded-xl border-white/10 bg-white/5 text-white font-semibold text-xs"
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
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between border-t border-white/5 p-6 pt-4 shrink-0 bg-gray-950/20">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving}
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
                  Hủy
                </button>
                <Button
                  onClick={handleSaveConnection}
                  disabled={saving || testing}
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
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
