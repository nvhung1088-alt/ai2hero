'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Key, Database, Bell, Save, Shield } from 'lucide-react';

export default function SettingsClient() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'api' | 'storage' | 'notifications'>('api');

  // Dummy states cho UI
  const [openaiKey, setOpenaiKey] = useState('sk-proj-**********************************');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [r2AccountId, setR2AccountId] = useState('');
  const [r2AccessKey, setR2AccessKey] = useState('');
  const [r2SecretKey, setR2SecretKey] = useState('');

  const handleSave = () => {
    showToast('Đã lưu cấu hình thành công (Demo).', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
            Cấu hình & Storage Toàn cục
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Quản lý API Keys cá nhân, nơi lưu trữ tài sản video và webhook thông báo cho toàn bộ Team của bạn.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 space-y-2 shrink-0">
            <button
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                activeTab === 'api'
                  ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-400 border border-pink-500/20'
                  : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Key size={16} />
              AI Model API Keys
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                activeTab === 'storage'
                  ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-400 border border-pink-500/20'
                  : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Database size={16} />
              Cloud Storage (R2/S3)
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-400 border border-pink-500/20'
                  : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Bell size={16} />
              Thông báo & Webhook
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <Card className="p-8 border-white/[0.05] bg-[#09090d] shadow-2xl space-y-6">
              
              {activeTab === 'api' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs leading-relaxed">
                    <Shield size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-1">Mã hóa an toàn (End-to-End Encryption)</strong>
                      API Key của bạn được mã hóa ở cấp độ cơ sở dữ liệu và chỉ giải mã trong tích tắc khi gọi Model. Hệ thống của chúng tôi không lưu trữ plain-text.
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">OpenAI API Key</label>
                      <Input 
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        className="bg-black/40 border-white/[0.05] text-slate-300 font-mono text-sm"
                      />
                      <p className="text-[10px] text-slate-500">Sử dụng cho GPT-4o, Whisper, và Dall-E 3.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Anthropic API Key</label>
                      <Input 
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="bg-black/40 border-white/[0.05] text-slate-300 font-mono text-sm"
                      />
                      <p className="text-[10px] text-slate-500">Sử dụng cho Claude 3.5 Sonnet (Đề xuất cho Kịch bản AI).</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'storage' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-200">Lưu trữ của riêng bạn (BYOS)</h3>
                    <p className="text-xs text-slate-500">Kết nối Cloudflare R2 hoặc AWS S3 để video sinh ra được lưu trực tiếp vào tài khoản của bạn, tiết kiệm chi phí băng thông.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Cloudflare Account ID</label>
                      <Input 
                        value={r2AccountId}
                        onChange={(e) => setR2AccountId(e.target.value)}
                        className="bg-black/40 border-white/[0.05] text-slate-300 font-mono text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Access Key ID</label>
                        <Input 
                          value={r2AccessKey}
                          onChange={(e) => setR2AccessKey(e.target.value)}
                          className="bg-black/40 border-white/[0.05] text-slate-300 font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Secret Access Key</label>
                        <Input 
                          type="password"
                          value={r2SecretKey}
                          onChange={(e) => setR2SecretKey(e.target.value)}
                          className="bg-black/40 border-white/[0.05] text-slate-300 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-200">Webhook & Zalo ZNS</h3>
                    <p className="text-xs text-slate-500">Nhận thông báo tự động khi luồng render video hoàn tất.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Webhook URL (POST)</label>
                      <Input 
                        placeholder="https://your-server.com/api/webhook"
                        className="bg-black/40 border-white/[0.05] text-slate-300 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-white/[0.05] flex justify-end">
                <Button 
                  onClick={handleSave}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/10 gap-2"
                >
                  <Save size={14} />
                  Lưu cấu hình
                </Button>
              </div>

            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
