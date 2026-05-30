'use client';

import { useState, useEffect } from 'react';
import {
  MOCK_AI_MODELS,
  AIModelConfig
} from '@/lib/shared-constants';
import {
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Zap,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/lib/shared-constants';
import { getBillingPlans, updateBillingPlans } from '@/app/(login)/actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

const AVAILABLE_APPS = [
  { id: 'chat', name: 'AI Chat' },
  { id: 'hub', name: 'AI Hub' },
  { id: 'api', name: 'API Hub' },
  { id: 'sim', name: 'SIM Manager' },
  { id: 'pos', name: 'POS Bán hàng' },
  { id: 'content', name: 'Content Hub' },
];

export default function AdminSettingsPage() {
  // TODO: PLAN_AI_MODELS_REALDB — Chuyển sang DB thật khi tích hợp AI Chat MVP
  const [models, setModels] = useState<AIModelConfig[]>(MOCK_AI_MODELS);
  const [plans, setPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<string | null>(null);
  
  // State quản lý xem các key có bị ẩn hay hiện (mapping modelId -> boolean)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadSettings() {
      try {
        const fetchedPlans = await getBillingPlans();
        if (fetchedPlans && Array.isArray(fetchedPlans)) {
          setPlans(fetchedPlans as any[]);
        }
      } catch (error) {
        console.error('Lỗi khi tải cấu hình gói cước:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Hỗ trợ phím Escape để đóng modal xoay vòng API Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRotateTarget(null);
      }
    };
    if (rotateTarget) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rotateTarget]);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Xử lý bật tắt model
  const toggleModelStatus = (id: string) => {
    setModels(prev =>
      prev.map(m => {
        if (m.id === id) {
          const newStatus = m.status === 'active' ? 'inactive' : 'active';
          showToast(`Đã cập nhật trạng thái của model ${m.name} thành: ${newStatus === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}`, 'success');
          return { ...m, status: newStatus };
        }
        return m;
      })
    );
  };

  // Xoay vòng API Key (Rotate key)
  const executeRotateAPIKey = (id: string) => {
    setModels(prev =>
      prev.map(m => {
        if (m.id === id) {
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          const newKey = m.id === 'gpt4' ? `sk-...${randomSuffix}` : m.id === 'claude' ? `sk-ant-...${randomSuffix}` : `AIza...${randomSuffix}`;
          showToast(`Đã xoay vòng API Key cho ${m.name} thành công.`, 'success');
          return { ...m, apiKeyMasked: newKey };
        }
        return m;
      })
    );
    setRotateTarget(null);
  };

  // Xử lý thay đổi trường dữ liệu của gói cước đang được chọn
  const updateActivePlanField = (field: string, value: any) => {
    setPlans(prev =>
      prev.map(p => {
        if (p.id === activeTab) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  // Xử lý thay đổi danh sách tính năng (Textarea dòng-dòng)
  const handleFeaturesChange = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    updateActivePlanField('features', lines);
  };

  // Bật/tắt quyền truy cập ứng dụng
  const toggleAppPermission = (appId: string) => {
    const activePlan = plans.find(p => p.id === activeTab);
    if (!activePlan) return;
    const currentApps = activePlan.allowedApps || [];
    const newApps = currentApps.includes(appId)
      ? currentApps.filter((id: string) => id !== appId)
      : [...currentApps, appId];
    updateActivePlanField('allowedApps', newApps);
  };

  // Lưu cấu hình hệ thống
  const saveSystemConfig = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('plansJson', JSON.stringify(plans));
      const result = await updateBillingPlans({}, formData);
      if ('success' in result && result.success) {
        showToast(result.success, 'success');
      } else if ('error' in result && result.error) {
        showToast(result.error, 'error');
      }
    } catch (e) {
      showToast('Đã xảy ra lỗi khi lưu cấu hình.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activePlan = plans.find(p => p.id === activeTab);

  return (
    <div className="space-y-8 animate-fade-up text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            Cấu hình hệ thống
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">Cấu hình API Models của các nhà cung cấp AI và điều chỉnh hạn mức gói dịch vụ</p>
        </div>
      </div>

      {/* SECTION 1: AI MODELS CONFIG */}
      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          Nhà cung cấp mô hình AI (API Keys)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {models.map((model) => {
            const isActive = model.status === 'active';
            const usagePercentage = Math.min(100, (model.monthlyUsage / (model.monthlyLimit || 1)) * 100);
            const isKeyVisible = visibleKeys[model.id] || false;

            return (
              <div
                key={model.id}
                className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-white/10 transition-all duration-200 flex flex-col justify-between space-y-5 backdrop-blur-xl"
              >
                {/* Model Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white">{model.name}</h3>
                    <p className="text-[11px] text-gray-400 font-semibold uppercase mt-0.5">{model.provider}</p>
                  </div>
                  <button
                    onClick={() => toggleModelStatus(model.id)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {isActive ? 'Đang bật' : 'Tạm dừng'}
                  </button>
                </div>

                {/* API Key details */}
                <div className="bg-gray-950/50 border border-white/5 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">API Connection Key</span>
                    <button
                      onClick={() => toggleKeyVisibility(model.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title={isKeyVisible ? 'Ẩn Key' : 'Hiện Key'}
                    >
                      {isKeyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-gray-300 font-mono tracking-wider break-all">
                    {isKeyVisible ? (model.id === 'gpt4' ? 'sk-proj-4zXyPqR9sWv8T7uN1m2k3j4h5g6f7e8d9c0b' : model.id === 'claude' ? 'sk-ant-api03-9sWv8T7uN1m2k3j4h5g6f7e8d9c0b' : 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q') : model.apiKeyMasked}
                  </p>
                </div>

                {/* Usage limit bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-gray-400">Sử dụng tháng này</span>
                    <span className="text-gray-200">{formatNumber(model.monthlyUsage)} / {formatNumber(model.monthlyLimit)} reqs</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${isActive ? 'bg-orange-500' : 'bg-gray-500'}`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2">
                  <button
                    onClick={() => setRotateTarget(model.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
                    Xoay vòng API Key
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: BILLING PLANS CONFIG */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="h-4 w-4 text-orange-500" />
          Cấu hình gói dịch vụ & Hạn mức (Billing Plans & Limits)
        </h2>

        {loading ? (
          <div className="text-center py-10 text-gray-400 font-medium">Đang tải cấu hình gói cước từ cơ sở dữ liệu...</div>
        ) : (
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 shadow-sm space-y-6 backdrop-blur-xl">
            {/* Custom Tabs */}
            <div className="flex border-b border-white/5 pb-2 gap-2">
              {(['free', 'pro', 'enterprise'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-bold rounded-lg capitalize transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Gói {tab === 'free' ? 'Free' : tab === 'pro' ? 'Pro' : 'Enterprise'}
                </button>
              ))}
            </div>

            {activePlan && (
              <div className="space-y-6">
                {/* Row 1: Tên, Mô tả */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Tên gói cước
                    </label>
                    <Input
                      type="text"
                      value={activePlan.name || ''}
                      onChange={e => updateActivePlanField('name', e.target.value)}
                      className="rounded-xl border-white/10 bg-white/5 text-white font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Mô tả ngắn
                    </label>
                    <Input
                      type="text"
                      value={activePlan.description || ''}
                      onChange={e => updateActivePlanField('description', e.target.value)}
                      className="rounded-xl border-white/10 bg-white/5 text-white font-medium"
                    />
                  </div>
                </div>

                {/* Row 2: Giá, Chu kỳ, Giới hạn thành viên */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Giá tiền
                    </label>
                    <Input
                      type="text"
                      value={activePlan.price || ''}
                      onChange={e => updateActivePlanField('price', e.target.value)}
                      className="rounded-xl border-white/10 bg-white/5 text-white font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Chu kỳ
                    </label>
                    <Input
                      type="text"
                      value={activePlan.period || ''}
                      onChange={e => updateActivePlanField('period', e.target.value)}
                      placeholder="tháng / trọn đời / bỏ trống"
                      className="rounded-xl border-white/10 bg-white/5 text-white font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Hạn mức thành viên / nhóm
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={activePlan.maxMembers || 0}
                        onChange={e => updateActivePlanField('maxMembers', parseInt(e.target.value) || 0)}
                        className="rounded-xl border-white/10 bg-white/5 text-white font-bold w-32"
                      />
                      <span className="text-sm font-semibold text-gray-500">người</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: App Gating Permissions */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Cho phép truy cập các MVP Apps
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {AVAILABLE_APPS.map(app => {
                      const isAllowed = (activePlan.allowedApps || []).includes(app.id);
                      return (
                        <button
                          key={app.id}
                          onClick={() => toggleAppPermission(app.id)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isAllowed
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10'
                          }`}
                        >
                          <span>{app.name}</span>
                          {isAllowed ? (
                            <CheckSquare className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 4: Tính năng hiển thị ở Pricing Page */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Danh sách tính năng (Mỗi dòng là một tính năng)
                  </label>
                  <textarea
                    rows={6}
                    value={(activePlan.features || []).join('\n')}
                    onChange={e => handleFeaturesChange(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 text-white font-medium p-3.5 focus:border-orange-500 focus:outline-none"
                    placeholder="Tính năng 1&#10;Tính năng 2&#10;Tính năng 3"
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <Button
                onClick={saveSystemConfig}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 py-2 font-bold flex items-center gap-2 shadow-md shadow-orange-500/10 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình hệ thống'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Premium API Key Rotation Confirm Modal */}
      {rotateTarget && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onMouseDown={() => setRotateTarget(null)}
        >
          <div 
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <span className="text-xl">🔑</span>
              <h3 className="text-base font-extrabold text-white">Xoay vòng API Key</h3>
            </div>
            
            <p className="text-sm font-semibold text-gray-300 leading-relaxed">
              Bạn có chắc chắn muốn xoay vòng (đổi mới) API Key này? Tất cả các request hiện tại sẽ chuyển sang Key mới.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRotateTarget(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => executeRotateAPIKey(rotateTarget)}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
              >
                Xác nhận xoay vòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
