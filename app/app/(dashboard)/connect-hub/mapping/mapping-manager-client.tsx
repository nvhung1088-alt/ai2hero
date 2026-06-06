'use client';

import { useState, useEffect } from 'react';
import { getMappingConfigAction, saveMappingConfigAction } from '@/lib/db/connect-hub-mapping-actions';
import { runActionAction, getConnectorDetailAction } from '@/lib/db/connect-hub-actions';
import { migrateLegacyConfig, MappingConfigField } from '@/lib/connect-hub/utils/mapper';
import { autoSuggestMapping } from '@/lib/connect-hub/utils/auto-suggest';
import { Loader2, Save, X, Plus, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, Clock, Copy, Check, Activity, Sparkles } from 'lucide-react';

interface MappingManagerClientProps {
  connectedApps: { appSlug: string; appName: string; connectionId?: number }[];
  teamId: number;
}

import { ApiCapability, getCapabilities } from '@/lib/connect-hub/capabilities';
import { getConnectorBySlug } from '@/lib/connect-hub/connectors/registry';
import { DEFAULT_MAPPINGS, STANDARD_FIELDS_DEF } from '@/lib/connect-hub/capabilities/presets';



export default function MappingManagerClient({ connectedApps, teamId }: MappingManagerClientProps) {
  const [selectedApp, setSelectedApp] = useState<string>(connectedApps[0]?.appSlug || '');
  const [config, setConfig] = useState<Record<string, MappingConfigField>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // New States for API Capabilities
  const [activeTab, setActiveTab] = useState<'mapping' | 'capabilities'>('mapping');
  const [expandedCaps, setExpandedCaps] = useState<Record<string, boolean>>({});
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [detailCapabilities, setDetailCapabilities] = useState<ApiCapability[]>([]);
  const [isLoadingDetailCaps, setIsLoadingDetailCaps] = useState(false);

  // States cho Test Modal
  const [testCapability, setTestCapability] = useState<ApiCapability | null>(null);
  const [testInput, setTestInput] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Cập nhật activeTab nếu chọn app không phải POS
  useEffect(() => {
    const connector = getConnectorBySlug(selectedApp);
    if (connector && connector.category !== 'pos' && activeTab === 'mapping') {
      setActiveTab('capabilities');
    }
  }, [selectedApp, activeTab]);

  const handleRunTest = async () => {
    if (!testCapability) return;
    const currentApp = connectedApps.find(app => app.appSlug === selectedApp);
    if (!currentApp || !currentApp.connectionId) {
      setTestResult({ error: 'Không tìm thấy kết nối' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await runActionAction(teamId, {
        connectionId: currentApp.connectionId,
        actionSlug: testCapability.slug,
        input: testInput,
        normalize: false
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Có lỗi xảy ra' });
    }
    setIsTesting(false);
  };


  useEffect(() => {
    if (selectedApp) {
      loadConfig(selectedApp);
    }
  }, [selectedApp]);

  useEffect(() => {
    const loadDetailCaps = async () => {
      setIsLoadingDetailCaps(true);
      try {
        const registryCaps = getCapabilities(selectedApp) || [];
        const res = await getConnectorDetailAction(teamId, selectedApp);
        if (res.success && res.data && res.data.actions) {
          const catalogActions = (res.data.actions as any[])
            .filter(a => a.group)
            .map(a => ({
              slug: a.slug,
              name: a.name,
              description: a.description,
              group: a.group,
              httpMethod: a.httpMethod || 'POST',
              endpoint: a.endpoint || '',
              status: a.status || 'planned',
              inputSchema: a.inputSchema || [],
              outputFields: a.outputFields || [],
              aiInstruction: a.aiInstruction || '',
            }));

          const merged = [...registryCaps];
          catalogActions.forEach(cat => {
            if (!merged.some(m => m.slug === cat.slug)) {
              merged.push(cat);
            }
          });
          
          setDetailCapabilities(merged);
        } else {
          setDetailCapabilities(registryCaps);
        }
      } catch (err) {
        console.error('Lỗi khi tải năng lực API chi tiết:', err);
        setDetailCapabilities(getCapabilities(selectedApp) || []);
      } finally {
        setIsLoadingDetailCaps(false);
      }
    };

    if (selectedApp) {
      loadDetailCaps();
    }
  }, [selectedApp, teamId]);

  const loadConfig = async (appSlug: string) => {
    setIsLoading(true);
    setMessage(null);
    const res = await getMappingConfigAction(appSlug);
    if (res.success && res.data && Object.keys(res.data).length > 0) {
      const migrated = migrateLegacyConfig(res.data);
      setConfig(migrated);
    } else {
      if (DEFAULT_MAPPINGS[appSlug]) {
        const migrated = migrateLegacyConfig(DEFAULT_MAPPINGS[appSlug]);
        setConfig(migrated);
        setMessage({ type: 'success', text: 'Đang tải cấu hình mẫu của hệ thống. Bạn có thể nhấn Lưu để xác nhận.' });
      } else {
        setConfig({});
      }
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedApp) return;
    setIsSaving(true);
    setMessage(null);
    const res = await saveMappingConfigAction(selectedApp, config);
    if (res.success) {
      setMessage({ type: 'success', text: res.message || 'Lưu thành công!' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Lỗi khi lưu.' });
    }
    setIsSaving(false);
  };

  const handleSelectKey = (fieldKey: string, rawKey: string) => {
    setConfig(prev => {
      const current = prev[fieldKey] || { selected: '', suggestions: [] };
      return {
        ...prev,
        [fieldKey]: {
          ...current,
          selected: rawKey
        }
      };
    });
  };

  const handleProbeAndSuggest = async () => {
    const currentApp = connectedApps.find(app => app.appSlug === selectedApp);
    if (!currentApp || !currentApp.connectionId) {
      setMessage({ type: 'error', text: 'Không tìm thấy ID kết nối của cửa hàng để tiến hành phân tích.' });
      return;
    }

    setIsProbing(true);
    setMessage(null);

    try {
      const res = await runActionAction(teamId, {
        connectionId: currentApp.connectionId,
        actionSlug: 'probe_sample_data',
        input: {},
        normalize: false
      });

      if (res.success && res.data) {
        const suggested = autoSuggestMapping(res.data, STANDARD_FIELDS_DEF);
        setConfig(suggested);
        setMessage({
          type: 'success',
          text: 'Đã tự động phân tích dữ liệu mẫu từ cửa hàng thật và cập nhật các trường mapping phù hợp!'
        });
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Dò cấu trúc dữ liệu từ cửa hàng thật thất bại. Vui lòng kiểm tra lại cấu hình kết nối.'
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi tiến hành dò cấu trúc dữ liệu mẫu.' });
    } finally {
      setIsProbing(false);
    }
  };

  const handleCopyInstruction = (slug: string, instruction: string) => {
    navigator.clipboard.writeText(instruction);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const toggleExpandCap = (slug: string) => {
    setExpandedCaps(prev => ({
      ...prev,
      [slug]: !prev[slug]
    }));
  };

  if (connectedApps.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-orange-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Chưa có kết nối nào</h3>
        <p className="text-gray-400 mb-6 max-w-md">
          Bạn cần kết nối ít nhất 1 ứng dụng POS (như Pancake, KiotViet) trong kho ứng dụng để có thể cấu hình chuẩn hóa dữ liệu.
        </p>
      </div>
    );
  }

  // Groups for field mapping
  const groups = ['Khách hàng', 'Sản phẩm', 'Đơn hàng'];
  
  const currentConnector = getConnectorBySlug(selectedApp);
  const capabilityGroups = Array.from(new Set(detailCapabilities.map((c: any) => c.group)));
  const isPosApp = currentConnector?.category === 'pos';

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-900 border border-gray-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-300">Nền tảng POS:</label>
          <select 
            className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
          >
            {connectedApps.map(app => (
              <option key={app.appSlug} value={app.appSlug}>{app.appName}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'mapping' && message && (
            <span className={`text-sm mr-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </span>
          )}
          {activeTab === 'mapping' && (
            <>
              <button
                onClick={handleProbeAndSuggest}
                disabled={isProbing || isLoading || isSaving}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 shrink-0"
              >
                {isProbing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-orange-400" />}
                Phân tích dữ liệu mẫu
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading || isProbing}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:opacity-90 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 shrink-0"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu thay đổi
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-800">
        {isPosApp && (
          <button
            onClick={() => setActiveTab('mapping')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'mapping'
                ? 'border-orange-500 text-orange-500 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Trường dữ liệu (Mapping)
          </button>
        )}
        <button
          onClick={() => setActiveTab('capabilities')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'capabilities'
              ? 'border-orange-500 text-orange-500 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Năng lực API (AI Capabilities)
        </button>
      </div>

      {isLoading || isLoadingDetailCaps ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
        </div>
      ) : activeTab === 'mapping' ? (
        /* Tab: Mapping Config */
        <div className="space-y-8">
          {groups.map(group => {
            const fieldsInGroup = STANDARD_FIELDS_DEF.filter(f => f.group === group);
            return (
              <div key={group} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white">{group}</h3>
                </div>
                <div className="divide-y divide-gray-800">
                  {fieldsInGroup.map(field => {
                    const mappingField = config[field.key] || { selected: '', suggestions: [] };
                    const { selected, suggestions } = mappingField;
                    
                    return (
                      <div key={field.key} className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 hover:bg-gray-800/20 transition-colors">
                        {/* Standard Field Info */}
                        <div className="lg:col-span-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-200">{field.name}</span>
                          </div>
                          <div className="text-xs font-mono text-orange-400 bg-orange-400/10 inline-block px-2 py-0.5 rounded">
                            {field.key}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">{field.desc}</p>
                        </div>
                        
                        {/* POS Source Fields Mapping */}
                        <div className="lg:col-span-2 space-y-4">
                          <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold">
                            Trường dữ liệu từ POS (Chọn 1 từ danh sách gợi ý)
                          </label>
                          
                          {suggestions && suggestions.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {suggestions.map(sug => {
                                const isSelected = selected === sug;
                                return (
                                  <label 
                                    key={sug} 
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-orange-500/10 border-orange-500 text-white font-medium shadow-sm' 
                                        : 'bg-gray-950 border-gray-800 hover:border-gray-700/80 text-gray-300'
                                    }`}
                                  >
                                    <input 
                                      type="radio" 
                                      name={`radio-${field.key}`}
                                      checked={isSelected}
                                      onChange={() => handleSelectKey(field.key, sug)}
                                      className="sr-only" // hidden default radio
                                    />
                                    {/* custom checked dot */}
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected ? 'border-orange-500' : 'border-gray-600'
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    </div>
                                    <span className="font-mono text-sm break-all">{sug}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic py-2">
                              Chưa có trường thô gợi ý. Hãy bấm "Phân tích dữ liệu mẫu" để tự động tìm kiếm.
                            </div>
                          )}

                          {selected && (
                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                              <span>Trường đang chọn: </span>
                              <span className="font-mono text-orange-400 bg-orange-500/5 border border-orange-500/20 px-2.5 py-0.5 rounded-lg">
                                {selected}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Tab: API Capabilities */
        <div className="space-y-8">
          {detailCapabilities.length === 0 ? (
            /* Empty State for other systems */
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Chưa có năng lực nào được khai báo</h3>
              <p className="text-gray-400 max-w-md text-sm">
                Nền tảng này hiện chưa được khai báo danh sách năng lực AI. Chúng tôi sẽ sớm cập nhật cấu trúc API cho hệ thống trong các phiên bản tiếp theo.
              </p>
            </div>
          ) : (
            /* System Capabilities List */
            <div className="space-y-8">
              <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Hướng dẫn cho AI vận hành
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Các năng lực dưới đây mô tả chính xác tập lệnh API cho hệ thống <strong>{currentConnector?.name || selectedApp}</strong>. Mỗi năng lực chứa một cấu trúc hướng dẫn (<code className="text-xs font-mono bg-gray-950 px-1 py-0.5 rounded text-orange-300">aiInstruction</code>) 
                  bằng ngôn ngữ tự nhiên được tối ưu hóa để AI đọc hiểu và tự động gọi endpoint, truyền đúng tham số, cũng như chuẩn hóa dữ liệu trả về cho người dùng mà không cần lập trình lại.
                </p>
              </div>

              {capabilityGroups.map(group => {
                const capsInGroup = detailCapabilities.filter((c: any) => c.group === group);
                if (capsInGroup.length === 0) return null;

                return (
                  <div key={group} className="space-y-4">
                    <h3 className="text-lg font-medium text-white px-2 border-l-2 border-orange-500">{group}</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {capsInGroup.map((cap: any) => {
                        const isExpanded = expandedCaps[cap.slug] || false;
                        const isCopied = copiedSlug === cap.slug;
                        
                        return (
                          <div 
                            key={cap.slug} 
                            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700/80 transition-all shadow-sm"
                          >
                            {/* Card Header */}
                            <div 
                              onClick={() => toggleExpandCap(cap.slug)}
                              className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-800/10 transition-colors select-none"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                                    cap.httpMethod === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    cap.httpMethod === 'POST' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                  }`}>
                                    {cap.httpMethod}
                                  </span>
                                  <h4 className="text-base font-semibold text-gray-200">{cap.name}</h4>
                                  <span className="text-xs font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                                    {cap.endpoint}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400">{cap.description}</p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                                {/* Status Badge */}
                                {cap.status === 'ready' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Sẵn sàng ✅
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                                    <Clock className="h-3 w-3" />
                                    Dự kiến 🔜
                                  </span>
                                )}

                                {/* Expand Icon */}
                                <div className="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              </div>
                            </div>

                            {/* Expandable Body */}
                            {isExpanded && (
                              <div className="px-6 pb-6 border-t border-gray-800 bg-gray-950/30 space-y-4 pt-4">
                                {/* Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-500 block mb-1 uppercase font-semibold tracking-wider">Tham số đầu vào (inputSchema):</span>
                                    {!cap.inputSchema || cap.inputSchema.length === 0 ? (
                                      <span className="text-gray-400 italic">Không có tham số bắt buộc</span>
                                    ) : (
                                      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 space-y-2 max-h-[160px] overflow-y-auto">
                                        {(cap.inputSchema || []).map((param: any) => (
                                          <div key={param.name || param.key} className="flex flex-col gap-0.5 border-b border-gray-900 pb-1.5 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between">
                                              <span className="font-mono text-orange-400 font-medium">
                                                {param.name || param.key}
                                                {param.required && <span className="text-red-500 ml-0.5">*</span>}
                                              </span>
                                              <span className="text-gray-500 font-mono scale-90">{param.type}</span>
                                            </div>
                                            <p className="text-gray-400 leading-normal">{param.label || param.placeholder || param.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block mb-1 uppercase font-semibold tracking-wider">Trường đầu ra chính (outputFields):</span>
                                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto align-content-start text-xs">
                                      {cap.outputFields && cap.outputFields.length > 0 ? (
                                        (cap.outputFields || []).map((field: any) => (
                                          <span key={field} className="font-mono bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-300">
                                            {field}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-gray-500 italic">Không có thông tin đầu ra</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* AI Instruction Section */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Cấu trúc thực hiện cho AI (aiInstruction):</span>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => {
                                          setTestCapability(cap);
                                          setTestInput({});
                                          setTestResult(null);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-600 hover:opacity-90 text-xs font-medium text-white rounded-lg transition-all shadow-sm"
                                      >
                                        <Activity className="h-3 w-3" />
                                        Chạy thử (Test)
                                      </button>
                                      <button 
                                        onClick={() => handleCopyInstruction(cap.slug, cap.aiInstruction)}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-xs text-gray-300 rounded-lg transition-all"
                                      >
                                        {isCopied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                        {isCopied ? 'Đã sao chép' : 'Sao chép HD'}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto border-dashed">
                                    {cap.aiInstruction}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Test Capability Modal */}
      {testCapability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-400" />
                Chạy thử: {testCapability.name}
              </h3>
              <button onClick={() => setTestCapability(null)} className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {testCapability.inputSchema && Object.keys(testCapability.inputSchema).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Tham số đầu vào:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {((testCapability.inputSchema as any[]) || []).map((param: any, idx: number) => (
                      <div key={param.name || idx} className="space-y-1.5">
                        <label className="text-sm text-gray-300 font-medium">
                          {param.label || param.name} {param.required && <span className="text-red-500">*</span>}
                        </label>
                        {param.type === 'select' ? (
                          <select
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm appearance-none"
                            value={testInput[param.name] || ''}
                            onChange={(e) => setTestInput({...testInput, [param.name]: e.target.value})}
                          >
                            <option value="">Chọn {param.label || param.name}...</option>
                            {(param.options || []).map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : param.type === 'textarea' ? (
                          <textarea
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm min-h-[80px]"
                            placeholder={param.placeholder || `Nhập ${param.name}...`}
                            value={testInput[param.name] || ''}
                            onChange={(e) => setTestInput({...testInput, [param.name]: e.target.value})}
                          />
                        ) : (
                          <input 
                            type={param.type === 'password' ? 'password' : 'text'}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm"
                            placeholder={param.placeholder || `Nhập ${param.name}...`}
                            value={testInput[param.name] || ''}
                            onChange={(e) => setTestInput({...testInput, [param.name]: e.target.value})}
                          />
                        )}
                        {param.helpText && <p className="text-xs text-gray-500 mt-1">{param.helpText}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button 
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
                >
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                  {isTesting ? 'Đang gọi API...' : 'Gửi Request'}
                </button>
              </div>

              {testResult && (
                <div className="space-y-2 pt-4 border-t border-gray-800">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Kết quả trả về:</h4>
                  <div className={`p-4 rounded-lg overflow-x-auto border ${testResult.success === false || testResult.error ? 'bg-red-950/20 border-red-900/50 text-red-400' : 'bg-gray-950 border-gray-800 text-gray-300'}`}>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

