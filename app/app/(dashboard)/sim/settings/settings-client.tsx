'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { 
  Save, Bell, Key, Clock, ShieldCheck, Zap, Send, Layers, 
  Trash2, Users, Plus, Edit2, UserX, UserCheck, Smartphone, 
  KeyRound, RefreshCw, Globe, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import { createSimEmployee, updateSimEmployee } from '@/lib/db/sim-actions';
import { 
  saveSystemSetting, 
  createSimPlatformAction, 
  deleteSimPlatformAction,
  testNumverifyConnectionAction,
  testTelegramBotAction,
  sendTelegramTestMessageAction
} from './actions';
import { showToast } from '../sim-ui-helpers';
import { getBackupConfig, saveBackupConfigAction, triggerManualBackupAction } from '@/lib/db/sim-backup-actions';

interface SettingsClientProps {
  initialEmployees: any[];
  initialPlatforms: any[];
  savedSettings: any;
  teamId: number;
  userId: number;
  teamMembers?: any[];
  userRole?: string;
}

export default function SettingsClient({
  initialEmployees,
  initialPlatforms,
  savedSettings,
  teamId,
  userId,
  teamMembers = [],
  userRole,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [employees, setEmployees] = useState(initialEmployees);
  const [platforms, setPlatforms] = useState(initialPlatforms);
  
  // Employee Management Modal State
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    phone: '',
    email: '',
    department: 'Marketing',
    status: 'active',
    userId: '' as string | number
  });
  
  const [isPending, startTransition] = useTransition();
  const empModalRef = useRef<HTMLDivElement>(null);
  
  // Backup configurations states
  const isOwner = userRole === 'owner';
  const [backupEmail, setBackupEmail] = useState('');
  const [backupFrequency, setBackupFrequency] = useState<'weekly' | 'monthly' | 'off'>('monthly');
  const [lastBackupSentAt, setLastBackupSentAt] = useState<string | null>(null);
  const [isBackupPending, setIsBackupPending] = useState(false);

  useEffect(() => {
    if (isOwner) {
      startTransition(async () => {
        const res = await getBackupConfig(teamId);
        if (res.success && res.data) {
          setBackupEmail(res.data.backupEmail || '');
          setBackupFrequency(res.data.frequency as any || 'monthly');
          setLastBackupSentAt(res.data.lastSentAt ? new Date(res.data.lastSentAt).toLocaleString('vi-VN') : 'Chưa từng gửi');
        } else {
          setBackupEmail('');
          setBackupFrequency('monthly');
          setLastBackupSentAt('Chưa từng gửi');
        }
      });
    }
  }, [teamId, isOwner]);

  const handleSaveBackupConfig = () => {
    setIsBackupPending(true);
    startTransition(async () => {
      const res = await saveBackupConfigAction(teamId, backupEmail, backupFrequency);
      setIsBackupPending(false);
      if (res.success) {
        showToast('Đã lưu cấu hình sao lưu thành công!', 'success');
      } else {
        showToast(res.error || 'Lỗi lưu cấu hình', 'error');
      }
    });
  };

  const handleTriggerBackup = () => {
    setIsBackupPending(true);
    startTransition(async () => {
      const res = await triggerManualBackupAction(teamId);
      setIsBackupPending(false);
      if (res.success) {
        showToast(res.message || 'Đã gửi sao lưu thành công!', 'success');
        setLastBackupSentAt(new Date().toLocaleString('vi-VN'));
      } else {
        showToast(res.error || 'Lỗi sao lưu', 'error');
      }
    });
  };

  // Keyboard & Click outside accessibility cho Modal nhân viên
  useEffect(() => {
    if (!empModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEmpModalOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (empModalRef.current && !empModalRef.current.contains(e.target as Node)) {
        setEmpModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [empModalOpen]);

  // Các hàm test API thật
  const handleTestNumverify = () => {
    startTransition(async () => {
      const res = await testNumverifyConnectionAction(teamId, config.numverifyKey);
      if (res.success) {
        showToast(res.message || 'Kết nối API Numverify thành công!', 'success');
      } else {
        showToast(res.error || 'Lỗi kết nối API', 'error');
      }
    });
  };

  const handleTestTelegramBot = () => {
    startTransition(async () => {
      const res = await testTelegramBotAction(teamId, config.telegramToken);
      if (res.success) {
        showToast(res.message || 'Handshake Telegram thành công!', 'success');
      } else {
        showToast(res.error || 'Lỗi kết nối Bot', 'error');
      }
    });
  };

  const handleSendTelegramTestMsg = () => {
    startTransition(async () => {
      const res = await sendTelegramTestMessageAction(teamId, config.telegramToken, config.telegramChatId);
      if (res.success) {
        showToast(res.message || 'Đã gửi tin nhắn test!', 'success');
      } else {
        showToast(res.error || 'Không thể gửi tin nhắn', 'error');
      }
    });
  };

  // Config State
  const [config, setConfig] = useState(() => {
    if (savedSettings) return savedSettings;
    return {
      shopName: 'Shop ABC',
      lang: 'vi',
      numverifyKey: '8f92a7f5d96a2b8e3c4d5e6f7a8b9c0d',
      telegramToken: '123456789:ABCDefghIJKLmnop_QRSTuvwx',
      telegramChatId: '-100987654321',
      dailyReport: true,
      numverifyCycle: 'weekly',
      checkTime: '02:00',
      yellowAlertDays: 30,
      redAlertDays: 60,
      bankSimRiskScore: 30,
      resignedEmpRule: 'critical',
      missingBackupRule: 'high'
    };
  });

  // Extension Link Code State (HeroSim v3.0)
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkCodeExpiry, setLinkCodeExpiry] = useState<Date | null>(null);
  const [linkCountdown, setLinkCountdown] = useState(0);
  const [linkedDevices, setLinkedDevices] = useState<any[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Load danh sách thiết bị đã liên kết khi mount
  useEffect(() => {
    import('./actions').then(({ getLinkedDevicesAction }) => {
      getLinkedDevicesAction(teamId).then((res) => {
        if (res.success && res.data) setLinkedDevices(res.data);
      });
    });
  }, [teamId]);

  // Countdown timer cho link code
  useEffect(() => {
    if (!linkCodeExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((linkCodeExpiry.getTime() - Date.now()) / 1000));
      setLinkCountdown(remaining);
      if (remaining === 0) {
        setLinkCode(null);
        setLinkCodeExpiry(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [linkCodeExpiry]);

  const handleGenerateLinkCode = async () => {
    setIsGeneratingCode(true);
    try {
      const { generateLinkCodeAction } = await import('./actions');
      const res = await generateLinkCodeAction(teamId, userId);
      if (res.success && res.code && res.expiresAt) {
        setLinkCode(res.code);
        setLinkCodeExpiry(new Date(res.expiresAt));
        setLinkCountdown(5 * 60);
      } else {
        showToast(res.error || 'Lỗi sinh mã liên kết', 'error');
      }
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleRevokeDevice = async (tokenId: number) => {
    const { revokeDeviceAction } = await import('./actions');
    const res = await revokeDeviceAction(teamId, tokenId);
    if (res.success) {
      setLinkedDevices((prev) => prev.filter((d) => d.id !== tokenId));
      showToast('Đã thu hồi quyền truy cập thiết bị!', 'success');
    } else {
      showToast(res.error || 'Lỗi thu hồi thiết bị', 'error');
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatRelativeTime = (date: string | Date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };


  // Platforms State
  const [platformForm, setPlatformForm] = useState({ name: '', icon: '📌', color: '#3b82f6' });

  const handleAddPlatform = async () => {
    if (!platformForm.name) return;
    const key = platformForm.name.toLowerCase().trim().replace(/\s+/g, '-');
    
    // Check trùng
    if (platforms.some(p => p.key === key)) {
      showToast('Nền tảng này đã tồn tại!', 'error');
      return;
    }

    const res = await createSimPlatformAction(teamId, key, platformForm.name, platformForm.icon, platformForm.color);
    if (res.success) {
      setPlatforms([...platforms, { teamId, key, label: platformForm.name, icon: platformForm.icon, color: platformForm.color, isDefault: 0 }]);
      setPlatformForm({ name: '', icon: '📌', color: '#3b82f6' });
      showToast('Đã thêm nền tảng mới thành công!', 'success');
    } else {
      showToast(res.error || 'Lỗi thêm nền tảng', 'error');
    }
  };

  const handleDeletePlatform = async (key: string) => {
    const res = await deleteSimPlatformAction(teamId, key);
    if (res.success) {
      setPlatforms(platforms.filter(p => p.key !== key));
      showToast('Đã xóa nền tảng!', 'info');
    } else {
      showToast(res.error || 'Lỗi xóa nền tảng', 'error');
    }
  };



  const openAddEmp = () => {
    setEditingEmp(null);
    setEmpForm({ name: '', phone: '', email: '', department: 'Marketing', status: 'active', userId: '' });
    setEmpModalOpen(true);
  };

  const openEditEmp = (emp: any) => {
    setEditingEmp(emp);
    setEmpForm({
      name: emp.name,
      phone: emp.phone || '',
      email: emp.email || '',
      department: emp.department || 'Marketing',
      status: emp.status || 'active',
      userId: emp.userId || ''
    });
    setEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name) return;

    const submitData = {
      ...empForm,
      userId: empForm.userId === '' ? null : Number(empForm.userId)
    };

    if (editingEmp) {
      // Update
      const res = await updateSimEmployee(teamId, editingEmp.id, submitData);
      if (res.success) {
        setEmployees(employees.map(emp => emp.id === editingEmp.id ? res.data : emp));
        showToast('Đã cập nhật thông tin nhân viên!', 'success');
        setEmpModalOpen(false);
      } else {
        showToast(res.error || 'Lỗi cập nhật nhân viên', 'error');
      }
    } else {
      // Create
      const res = await createSimEmployee(teamId, submitData);
      if (res.success) {
        setEmployees([res.data, ...employees]);
        showToast('Đã thêm nhân viên mới thành công!', 'success');
        setEmpModalOpen(false);
      } else {
        showToast(res.error || 'Lỗi thêm nhân viên', 'error');
      }
    }
  };

  const toggleEmployeeStatus = async (emp: any) => {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    const res = await updateSimEmployee(teamId, emp.id, {
      status: newStatus,
      leftAt: newStatus === 'inactive' ? new Date() : null
    });
    if (res.success) {
      setEmployees(employees.map(e => e.id === emp.id ? { ...e, status: newStatus } : e));
      showToast(`Đã chuyển trạng thái: ${newStatus === 'active' ? 'Đang làm việc' : 'Đã nghỉ việc'}`, 'info');
    } else {
      showToast(res.error || 'Lỗi đổi trạng thái', 'error');
    }
  };

  // Save Settings all configurations to DB
  const handleSaveSettings = async () => {
    const res = await saveSystemSetting(`sim_settings_team_${teamId}`, config);
    if (res.success) {
      showToast('Đã lưu cấu hình cài đặt vào Database thành công!', 'success');
    } else {
      showToast(res.error || 'Lỗi lưu cấu hình', 'error');
    }
  };

  return (
    <div className="space-y-6">


      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Settings Tab List (Left Column) */}
        <div className="w-full lg:w-3/12 bg-gray-900/40 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md flex flex-row lg:flex-col overflow-x-auto gap-1">
          {[
            { id: 'general', icon: ShieldCheck, label: 'Cấu hình chung' },
            { id: 'employees', icon: Users, label: 'Quản lý nhân sự' },
            { id: 'platforms', icon: Layers, label: 'Danh mục kênh' },
            { id: 'api', icon: Key, label: 'API & Tích hợp' },
            { id: 'notifications', icon: Bell, label: 'Telegram Alerts' },
            { id: 'schedule', icon: Clock, label: 'Chu kỳ kiểm tra' },
            { id: 'rules', icon: Zap, label: 'Quy tắc rủi ro' },
            ...(isOwner ? [{ id: 'backup', icon: ShieldCheck, label: 'Sao lưu dữ liệu' }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap lg:w-full select-none cursor-pointer ${
                  isTabActive
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isTabActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Tab Content (Right Column) */}
        <div className="w-full lg:w-9/12 bg-gray-900/40 border border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md relative min-h-[480px] flex flex-col justify-between">
          
          <div className="space-y-6">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-extrabold text-white">Cấu hình chung</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Quản lý các thông số định danh cơ bản của tổ chức và cổng kết nối Extension.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300">Tên doanh nghiệp / Cửa hàng</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                      value={config.shopName}
                      onChange={(e) => setConfig({ ...config, shopName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300">Ngôn ngữ hiển thị</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                      value={config.lang}
                      onChange={(e) => setConfig({ ...config, lang: e.target.value })}
                    >
                      <option value="vi">Tiếng Việt (vi-VN)</option>
                      <option value="en">English (en-US)</option>
                    </select>
                  </div>
                </div>

                {/* HeroSim Chrome Extension — Kết nối mới */}
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-white">🔗 Kết nối Chrome Extension HeroSim v3.0</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Sinh mã liên kết để ghép nối Extension với Workspace này. Đồng bộ mật khẩu 2 chiều an toàn qua API bảo mật.</p>
                    </div>
                  </div>

                  {/* Hiển thị mã liên kết + countdown */}
                  {linkCode ? (
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-3xl font-black tracking-[8px] font-mono text-orange-400 bg-black/40 px-5 py-2.5 rounded-xl border border-orange-500/20 select-all">
                          {linkCode}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          Hết hạn sau: <span className={`font-mono ${linkCountdown < 60 ? 'text-red-400' : 'text-orange-400'}`}>{formatCountdown(linkCountdown)}</span>
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 leading-relaxed">
                        <p className="font-bold text-gray-200 mb-1">Cách dùng:</p>
                        <p>1. Mở Extension HeroSim</p>
                        <p>2. Nhập mã này vào popup</p>
                        <p>3. Đặt Master PIN cá nhân</p>
                        <p>4. Bấm "Liên kết ngay"</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">Bấm nút bên dưới để sinh mã liên kết mới (hiệu lực 5 phút).</p>
                  )}

                  <button
                    onClick={handleGenerateLinkCode}
                    disabled={isGeneratingCode}
                    className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white border-0 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                    {isGeneratingCode ? 'Đang sinh mã...' : 'Sinh mã liên kết mới'}
                  </button>

                  {/* Danh sách thiết bị đã liên kết */}
                  {linkedDevices.length > 0 && (
                    <div className="border-t border-white/5 pt-4 space-y-2">
                      <p className="text-[10px] font-extrabold text-gray-300">Thiết bị đã liên kết ({linkedDevices.length})</p>
                      {linkedDevices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-white/[0.02] rounded-xl border border-white/5">
                          <div>
                            <p className="text-[11px] font-bold text-white">{device.deviceName || 'Chrome Extension'}</p>
                            <p className="text-[9px] text-gray-500">
                              {device.lastUsedAt ? `Dùng ${formatRelativeTime(device.lastUsedAt)}` : `Liên kết ${formatRelativeTime(device.createdAt)}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevokeDevice(device.id)}
                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                          >
                            Thu hồi
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {linkedDevices.length === 0 && (
                    <p className="text-[10px] text-gray-500 italic border-t border-white/5 pt-3">Chưa có thiết bị nào được liên kết.</p>
                  )}
                </div>
              </div>
            )}

            {/* EMPLOYEES TAB */}
            {activeTab === 'employees' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-white">Quản lý nhân sự</h2>
                    <p className="text-[11px] text-gray-400 mt-1">Danh sách nhân viên phụ trách quản lý thiết bị SIM vật lý và các tài khoản liên kết.</p>
                  </div>
                  <button
                    onClick={openAddEmp}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white text-[11px] font-black rounded-xl shadow-lg shadow-orange-500/10 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm nhân viên
                  </button>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01] text-gray-400 font-bold">
                        <th className="p-3">Họ tên nhân sự</th>
                        <th className="p-3">Số điện thoại</th>
                        <th className="p-3">Email liên hệ</th>
                        <th className="p-3">Phòng ban</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                            Chưa có dữ liệu nhân sự nào
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-3 font-extrabold text-white">
                              <div>{emp.name}</div>
                              {emp.userId && (
                                <div className="text-[10px] text-purple-400 font-semibold flex items-center gap-1 mt-0.5 select-none">
                                  <UserCheck className="h-3 w-3 inline" />
                                  <span>Liên kết: {teamMembers.find(m => m.id === emp.userId)?.name || 'Thành viên hệ thống'}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">{emp.phone || '—'}</td>
                            <td className="p-3">{emp.email || '—'}</td>
                            <td className="p-3">{emp.department || 'IT'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                emp.status === 'active' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {emp.status === 'active' ? 'Đang làm' : 'Đã nghỉ'}
                              </span>
                            </td>
                            <td className="p-3 text-right flex justify-end gap-1.5">
                              <button
                                onClick={() => openEditEmp(emp)}
                                className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                                title="Sửa thông tin"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => toggleEmployeeStatus(emp)}
                                className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
                                title={emp.status === 'active' ? 'Đổi trạng thái đã nghỉ' : 'Kích hoạt lại'}
                              >
                                {emp.status === 'active' ? (
                                  <UserX className="h-3.5 w-3.5 text-red-500" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PLATFORMS TAB */}
            {activeTab === 'platforms' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-extrabold text-white">Danh mục kênh liên kết</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Tạo và quản trị các nền tảng công nghệ/kênh tài khoản mà SIM của bạn dùng để nhận mã OTP liên kết.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {platforms.map((p) => (
                    <div 
                      key={p.key} 
                      className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 group hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl leading-none" style={{ color: p.color }}>{p.icon || '🔗'}</span>
                        <span className="text-[11px] font-extrabold text-white">{p.label}</span>
                      </div>
                      {p.isDefault !== 1 && (
                        <button
                          onClick={() => handleDeletePlatform(p.key)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add platform form */}
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-extrabold text-white">Thêm danh mục nền tảng mới</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Tên nền tảng (Ví dụ: Facebook)</label>
                      <input
                        type="text"
                        placeholder="Nhập tên..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                        value={platformForm.name}
                        onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Icon Emoji (Ví dụ: 💬)</label>
                      <input
                        type="text"
                        placeholder="Nhập emoji..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                        value={platformForm.icon}
                        onChange={(e) => setPlatformForm({ ...platformForm, icon: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Màu sắc định danh</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-9 w-12 rounded-xl bg-transparent border-0 cursor-pointer"
                          value={platformForm.color}
                          onChange={(e) => setPlatformForm({ ...platformForm, color: e.target.value })}
                        />
                        <button
                          onClick={handleAddPlatform}
                          className="flex-1 px-4 py-2 bg-white/5 hover:bg-orange-500 hover:text-white text-gray-300 border border-white/10 rounded-xl text-xs font-black transition-all cursor-pointer"
                        >
                          Tạo mới
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API TAB */}
            {activeTab === 'api' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-extrabold text-white">API & Tích hợp</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Cấu hình kết nối cổng API xác thực định dạng số điện thoại viễn thông.</p>
                </div>

                {/* Hướng dẫn đăng ký API Numverify */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2 text-gray-400 text-[11px] leading-relaxed">
                  <p className="font-extrabold text-white flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-orange-400 shrink-0" />
                    Hướng dẫn lấy Numverify API Key:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Truy cập trang chủ <a href="https://numverify.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-bold">numverify.com</a>.</li>
                    <li>Đăng ký một tài khoản miễn phí (Free Plan hỗ trợ 100 requests/tháng, đủ cho nhu cầu check định kỳ shop nhỏ).</li>
                    <li>Sau khi đăng nhập, truy cập Dashboard để lấy <b>API Access Key</b> của bạn.</li>
                    <li>Dán khóa vào ô nhập liệu bên dưới và bấm nút <b>Test kết nối API</b> để kiểm tra, sau đó bấm <b>Lưu cấu hình</b> ở góc dưới.</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300">Numverify API Access Key</label>
                    <input
                      type="password"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                      value={config.numverifyKey}
                      onChange={(e) => setConfig({ ...config, numverifyKey: e.target.value })}
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Khóa API dùng để truy xuất thông tin quốc gia, nhà mạng và độ hợp lệ của SIM khi check tự động.</span>
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleTestNumverify}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> {isPending ? 'Đang test...' : 'Test kết nối API'}
                  </button>
                </div>
              </div>
            )}

            {/* TELEGRAM TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-fade-in max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <h2 className="text-base font-extrabold text-white">Cấu hình Telegram Alerts</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Kích hoạt bot gửi cảnh báo bảo mật tức thì khi phát hiện rủi ro và báo cáo định kỳ.</p>
                </div>

                {/* Hướng dẫn lấy Bot Token và Group Chat ID */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3 text-gray-400 text-[11px] leading-relaxed">
                  <p className="font-extrabold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Info className="h-4 w-4 text-orange-400 shrink-0" />
                    Hướng dẫn cấu hình Telegram Alerts:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-white">1. Cách tạo Bot và lấy Access Token:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Mở Telegram, tìm kiếm và chat với <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-bold">@BotFather</a>.</li>
                        <li>Gửi lệnh <code>/newbot</code>, nhập Tên Bot và Username (phải kết thúc bằng <code>_bot</code>).</li>
                        <li>@BotFather sẽ gửi lại chuỗi <b>HTTP API Access Token</b> dạng <code>123456789:ABCDefgh...</code>. Hãy copy token này dán vào ô bên dưới.</li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold text-white">2. Cách lấy Group Chat ID:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Tạo một nhóm (Group) mới trên Telegram hoặc chọn nhóm có sẵn. Thêm Bot của bạn vào nhóm đó làm Thành viên (hoặc Admin).</li>
                        <li>Để lấy Chat ID: Gửi một tin nhắn bất kỳ vào nhóm chat (ví dụ: <code>/test</code>).</li>
                        <li>Mở trình duyệt, truy cập URL sau (thay thế <code>&lt;TOKEN&gt;</code> bằng Token Bot của bạn):<br />
                          <code className="bg-black/30 px-1.5 py-0.5 rounded break-all text-gray-300 text-[10px]">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
                        </li>
                        <li>Tìm trong dữ liệu JSON trả về đối tượng <code>"chat"</code>, copy giá trị <code>"id"</code> (nhóm chat ID thường bắt đầu bằng dấu trừ, ví dụ: <code>-100123456789</code>).</li>
                        <li>Dán Chat ID vào ô bên dưới, bấm <b>Test kết nối Bot</b> rồi bấm <b>Lưu cấu hình</b>.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300">Bot Access Token</label>
                    <input
                      type="password"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                      value={config.telegramToken}
                      onChange={(e) => setConfig({ ...config, telegramToken: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300">Chat ID (Kênh / Nhóm nhận cảnh báo)</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                      value={config.telegramChatId}
                      onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1.5">
                  <input
                    type="checkbox"
                    id="dailyReport"
                    className="h-4 w-4 rounded bg-white/5 border-white/10 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    checked={config.dailyReport}
                    onChange={(e) => setConfig({ ...config, dailyReport: e.target.checked })}
                  />
                  <label htmlFor="dailyReport" className="text-xs text-gray-300 font-bold select-none cursor-pointer">Gửi báo cáo tổng hợp tự động vào 08:00 sáng mỗi ngày</label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleTestTelegramBot}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? 'Đang test...' : 'Test kết nối Bot'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSendTelegramTestMsg}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" /> {isPending ? 'Đang gửi...' : 'Gửi tin nhắn test'}
                  </button>
                </div>

                {/* Message preview template */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Mẫu tin nhắn cảnh báo sáng</span>
                  <pre className="text-[10px] text-gray-400 font-mono leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5 overflow-x-auto">
{`🛡️ SimGuard — Báo cáo 28/05/2026

📊 Tổng: 14 SIM đang hoạt động
✅ An toàn: 5 | ⚠️ Theo dõi: 4 | 🔴 Cần xử lý: 5

🚨 Cảnh báo ưu tiên:
• SIM 0933456789 — NV đã nghỉ vẫn giữ SIM
• SIM 0551234567 — Số điện thoại không hợp lệ
• SIM 0321234567 — Quá chu kỳ đóng phí duy trì

→ Xem chi tiết tại: app.simguard.vn`}
                  </pre>
                </div>
              </div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === 'schedule' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-extrabold text-white">Chu kỳ kiểm tra tự động</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Cấu hình chu kỳ và khung giờ thực hiện các lệnh gọi tự động quét bảo mật SIM.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300">Tần suất kiểm tra Numverify</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                      value={config.numverifyCycle}
                      onChange={(e) => setConfig({ ...config, numverifyCycle: e.target.value })}
                    >
                      <option value="daily">Mỗi ngày một lần</option>
                      <option value="weekly">Mỗi tuần một lần</option>
                      <option value="monthly">Mỗi tháng một lần</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300">Khung giờ chạy ngầm</label>
                    <input
                      type="time"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                      value={config.checkTime}
                      onChange={(e) => setConfig({ ...config, checkTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* RISK RULES TAB */}
            {activeTab === 'rules' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-extrabold text-white">Quy tắc tính điểm rủi ro</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Tùy biến các quy tắc và ngưỡng điểm phạt cảnh báo tự động của hệ thống.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-300">Số ngày chưa check để gán cảnh báo vàng</label>
                      <input
                        type="number"
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                        value={config.yellowAlertDays}
                        onChange={(e) => setConfig({ ...config, yellowAlertDays: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-300">Số ngày chưa check để gán cảnh báo đỏ</label>
                      <input
                        type="number"
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                        value={config.redAlertDays}
                        onChange={(e) => setConfig({ ...config, redAlertDays: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-300">SIM gắn tài khoản ngân hàng (Cộng thêm điểm rủi ro)</label>
                      <input
                        type="number"
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                        value={config.bankSimRiskScore}
                        onChange={(e) => setConfig({ ...config, bankSimRiskScore: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-300">Nhân viên nghỉ việc chưa bàn giao SIM</label>
                      <select
                        className="w-full px-3.5 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                        value={config.resignedEmpRule}
                        onChange={(e) => setConfig({ ...config, resignedEmpRule: e.target.value })}
                      >
                        <option value="critical">🔴 Nguy cấp (Cần thu hồi ngay)</option>
                        <option value="high">🟠 Rủi ro cao</option>
                        <option value="watch">🟡 Cần theo dõi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BACKUP DATA TAB */}
            {activeTab === 'backup' && isOwner && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-extrabold text-white">📦 Sao lưu dữ liệu tự động</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Cấu hình hệ thống tự động xuất toàn bộ dữ liệu SIM & Tài khoản liên kết và gửi trực tiếp về email định kỳ.</p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-300">Email nhận bản sao lưu *</label>
                      <input
                        type="email"
                        required
                        placeholder="owner@company.com"
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all font-medium"
                        value={backupEmail}
                        onChange={(e) => setBackupEmail(e.target.value)}
                      />
                      <span className="text-[10px] text-gray-500 block">Địa chỉ nhận email đính kèm tệp CSV dữ liệu sao lưu chứa đầy đủ thông tin mật khẩu phục vụ công tác khôi phục.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-300">Tần suất gửi email tự động</label>
                      <select
                        className="w-full px-3.5 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer font-bold"
                        value={backupFrequency}
                        onChange={(e) => setBackupFrequency(e.target.value as any)}
                      >
                        <option value="weekly">Hàng tuần (Gửi vào 3:00 sáng Thứ 2)</option>
                        <option value="monthly">Hàng tháng (Gửi vào ngày 1 hàng tháng)</option>
                        <option value="off">Tắt sao lưu tự động</option>
                      </select>
                      <span className="text-[10px] text-gray-500 block">Chọn lịch trình hệ thống tự động kích hoạt gửi bản sao lưu.</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-gray-500 text-[10px] block">Lần gửi thành công gần nhất</span>
                      <strong className="text-white text-xs">{lastBackupSentAt || 'Chưa từng gửi'}</strong>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerBackup}
                        disabled={isBackupPending || !backupEmail}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white hover:text-orange-400 border border-white/10 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" /> Sao lưu & gửi email ngay
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBackupConfig}
                        disabled={isBackupPending}
                        className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-[11px] font-black transition-all hover:opacity-90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" /> Lưu cấu hình
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl flex items-start gap-3">
                  <Info className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-white text-xs block">Về chính sách bảo mật dữ liệu xuất tệp:</strong>
                    <p className="text-[10.5px] text-gray-400 leading-relaxed">
                      Để phục vụ công tác khôi phục dữ liệu trọn vẹn khi cần thiết, tệp tin CSV sao lưu gửi qua email của bạn sẽ <strong>chứa thông tin mật khẩu đầy đủ và nguyên vẹn</strong> của tất cả các tài khoản liên kết. 
                      Vui lòng đảm bảo hòm thư nhận của bạn được bảo mật đa lớp (2FA), tuyệt đối không chia sẻ email hoặc tệp đính kèm này cho bất kỳ ai khác để tránh nguy cơ rò rỉ thông tin tài khoản doanh nghiệp.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom actions (Apply to tabs that save configs) */}
          {['general', 'api', 'notifications', 'schedule', 'rules'].includes(activeTab) && (
            <div className="border-t border-white/5 pt-4 mt-8 flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-90 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="h-4 w-4" /> Lưu cấu hình
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Employee Modal Dialog */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            ref={empModalRef}
            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10 space-y-4 animate-scale-up"
          >
            <div>
              <h3 className="text-sm font-extrabold text-white">{editingEmp ? 'Cập nhật nhân viên' : 'Thêm nhân sự mới'}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Nhập đầy đủ thông tin nhân sự chịu trách nhiệm bảo quản SIM.</p>
            </div>
            
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-300">Liên kết thành viên hệ thống (Tùy chọn)</label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                  value={empForm.userId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selectedUser = teamMembers.find(m => m.id === Number(val));
                    setEmpForm({
                      ...empForm,
                      userId: val === '' ? '' : Number(val),
                      name: selectedUser ? (selectedUser.name || empForm.name) : empForm.name,
                      email: selectedUser ? (selectedUser.email || empForm.email) : empForm.email
                    });
                  }}
                >
                  <option value="">-- Không liên kết --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-300">Họ và tên *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-300">Số điện thoại</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-300">Email liên hệ</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-300">Phòng ban</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  >
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="IT">IT Support</option>
                    <option value="HR">HR Dept</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-300">Trạng thái</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                    value={empForm.status}
                    onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                  >
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Đã nghỉ việc</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-black rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-90 transition-all cursor-pointer"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
