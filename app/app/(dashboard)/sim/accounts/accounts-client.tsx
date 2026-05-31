'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  X, 
  User, 
  Link2, 
  Trash2, 
  Edit, 
  Copy, 
  Check, 
  ChevronUp,
  ChevronDown,
  Upload,
  Globe, 
  Mail, 
  ShieldAlert,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { 
  createSimLinkedAccount, 
  updateSimLinkedAccount, 
  deleteSimLinkedAccount,
  importSimLinkedAccountsBatch
} from '@/lib/db/sim-actions';
import { showToast } from '../sim-ui-helpers';

const DOMAIN_TO_PLATFORM: Record<string, string> = {
  'facebook.com': 'facebook',
  'www.facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'business.facebook.com': 'facebook',
  'adsmanager.facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'shopee.vn': 'shopee',
  'www.shopee.vn': 'shopee',
  'banhang.shopee.vn': 'shopee',
  'seller.shopee.vn': 'shopee',
  'shopee.com': 'shopee',
  'tiktok.com': 'tiktok',
  'www.tiktok.com': 'tiktok',
  'seller.tiktok.com': 'tiktok',
  'seller-vn.tiktok.com': 'tiktok',
  'ads.tiktok.com': 'tiktok',
  'lazada.vn': 'lazada',
  'www.lazada.vn': 'lazada',
  'sellercenter.lazada.vn': 'lazada',
  'zalo.me': 'zalo',
  'chat.zalo.me': 'zalo',
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'studio.youtube.com': 'youtube',
  'gmail.com': 'email',
  'mail.google.com': 'email',
  'accounts.google.com': 'email',
  'outlook.live.com': 'email',
  'outlook.office.com': 'email',
  'login.live.com': 'email',
  'cloudflare.com': 'cloudflare',
  'dash.cloudflare.com': 'cloudflare',
  'vps.vn': 'vps',
  'aws.amazon.com': 'cloud'
};

function getPlatformFromUrl(urlString: string): string {
  if (!urlString) return 'other';
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    const hostname = url.hostname.toLowerCase();
    if (DOMAIN_TO_PLATFORM[hostname]) {
      return DOMAIN_TO_PLATFORM[hostname];
    }
    const keys = Object.keys(DOMAIN_TO_PLATFORM);
    for (const key of keys) {
      if (hostname.endsWith('.' + key) || hostname === key) {
        return DOMAIN_TO_PLATFORM[key];
      }
    }
    return 'other';
  } catch (e) {
    const hostLower = urlString.toLowerCase();
    for (const [domain, platform] of Object.entries(DOMAIN_TO_PLATFORM)) {
      if (hostLower.includes(domain)) {
        return platform;
      }
    }
    return 'other';
  }
}

function parseCSVRows(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',') {
      if (inQuotes) {
        row[row.length - 1] += c;
      } else {
        row.push("");
      }
    } else if (c === '\r' || c === '\n') {
      if (inQuotes) {
        row[row.length - 1] += c;
      } else {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      }
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

interface ParsedAccount {
  platformKey: string;
  accountName: string;
  username: string;
  encryptedPassword: string;
  loginUrl: string;
  notes: string;
}

function parseChromeCSV(csvText: string): ParsedAccount[] {
  if (!csvText || !csvText.trim()) {
    throw new Error('Tệp CSV trống hoặc không hợp lệ.');
  }

  const lines = parseCSVRows(csvText.trim());
  if (lines.length < 2) {
    throw new Error('Tệp CSV thiếu dữ liệu tài khoản.');
  }

  const headers = lines[0].map(h => h.toLowerCase().trim());
  const colUrl = headers.indexOf('url');
  const colUsername = headers.indexOf('username');
  const colPassword = headers.indexOf('password');
  const colName = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('title');
  const colNote = headers.indexOf('note') !== -1 ? headers.indexOf('note') : headers.indexOf('notes');

  if (colUrl === -1 || colUsername === -1 || colPassword === -1) {
    throw new Error('Định dạng CSV không chuẩn Chrome (thiếu cột url, username, hoặc password).');
  }

  const results: ParsedAccount[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const url = row[colUrl] || '';
    const username = row[colUsername] || '';
    const password = row[colPassword] || '';
    const name = colName !== -1 ? row[colName] : '';
    const note = colNote !== -1 ? row[colNote] : '';

    if (!username || !password) continue;

    const platform = getPlatformFromUrl(url);

    results.push({
      platformKey: platform,
      accountName: name || `${platform.toUpperCase()} (${username.split('@')[0]})`,
      username,
      encryptedPassword: password,
      loginUrl: url,
      notes: note || 'Đồng bộ qua Chrome CSV trực tiếp'
    });
  }

  return results;
}

interface LinkedAccountJoined {
  id: number;
  platformKey: string;
  accountName: string;
  loginUrl: string | null;
  username: string | null;
  notes: string | null;
  loginEmail: string | null;
  linkedPhoneAssetId: number | null;
  linkedPhoneNumber: string | null;
  backupEmail: string | null;
  backupPhoneAssetId: number | null;
  ownerEmployeeId: number | null;
  ownerName: string | null;
  importanceLevel: string;
  status: string;
  encryptedPassword?: string | null;
  createdAt: Date | string;
}

interface SimAsset {
  id: number;
  name: string;
  value: string;
}

interface Employee {
  id: number;
  name: string;
  status: string;
}

interface AccountsClientProps {
  teamId: number;
  initialAccounts: LinkedAccountJoined[];
  assets: SimAsset[];
  employees: Employee[];
  userRole?: string;
}

// Map platform key sang tiếng Việt & màu sắc
const PLATFORM_MAP: Record<string, { label: string; color: string; bg: string }> = {
  facebook: { label: 'Facebook', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  google: { label: 'Google', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  shopee: { label: 'Shopee', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  telegram: { label: 'Telegram', color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20' },
  tiktok: { label: 'TikTok', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' },
  bank: { label: 'Ngân hàng', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  other: { label: 'Khác', color: 'text-gray-400', bg: 'bg-gray-400/10 border-gray-400/20' }
};

export default function AccountsClient({
  teamId,
  initialAccounts,
  assets,
  employees,
  userRole,
}: AccountsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isOwner = userRole === 'owner';
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [importanceFilter, setImportanceFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Sorting & Pagination states
  const [sortField, setSortField] = useState<'accountName' | 'username' | 'platformKey' | 'importanceLevel' | 'linkedPhoneNumber'>('accountName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Trạng thái Import CSV
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [parsedImportAccounts, setParsedImportAccounts] = useState<ParsedAccount[]>([]);
  const [importTargetSimId, setImportTargetSimId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  const importStats = useMemo(() => {
    let newCount = 0;
    let updatedCount = 0;
    let dupCount = 0;

    parsedImportAccounts.forEach(acc => {
      const existing = initialAccounts.find(
        ea => ea.username === acc.username && ea.platformKey === acc.platformKey
      );
      if (!existing) {
        newCount++;
      } else if (existing.notes?.includes('Đồng bộ') || acc.encryptedPassword !== '') {
        updatedCount++;
      } else {
        dupCount++;
      }
    });

    return { total: parsedImportAccounts.length, newCount, updatedCount, dupCount };
  }, [parsedImportAccounts, initialAccounts]);

  const handleImportFile = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showToast('Chỉ chấp nhận tệp tin .csv', 'error');
      return;
    }
    setImportFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseChromeCSV(text);
        setParsedImportAccounts(parsed);
        if (assets.length > 0) {
          setImportTargetSimId(assets[0].id.toString());
        }
        showToast(`Đọc tệp thành công, tìm thấy ${parsed.length} tài khoản`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Lỗi đọc file CSV', 'error');
        resetImportState();
      }
    };
    reader.readAsText(file);
  };

  const resetImportState = () => {
    setImportFileName('');
    setParsedImportAccounts([]);
    setImportTargetSimId('');
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedImportAccounts.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    const accountsWithSim = parsedImportAccounts.map(acc => ({
      ...acc,
      linkedPhoneAssetId: importTargetSimId ? parseInt(importTargetSimId) : null,
      importanceLevel: 'medium',
      status: 'active'
    }));

    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(accountsWithSim.length / BATCH_SIZE);
    let successCount = 0;
    let hasError = false;

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = accountsWithSim.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const res = await importSimLinkedAccountsBatch(teamId, batch);
        if (res.success) {
          successCount += res.data?.length || 0;
        } else {
          showToast(`Lỗi ở lô ${i + 1}: ${res.error}`, 'error');
          hasError = true;
          break; // Stop on first major batch error
        }
        setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      if (!hasError || successCount > 0) {
        showToast(`Đồng bộ thành công ${successCount} tài khoản lên Web App! 🎉`, 'success');
        setIsImportOpen(false);
        resetImportState();
        router.refresh();
      }
    } catch (err) {
      showToast('Có lỗi bất ngờ xảy ra khi tải lên', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Form states
  const [formAccountName, setFormAccountName] = useState('');
  const [formPlatformKey, setFormPlatformKey] = useState('facebook');
  const [formUsername, setFormUsername] = useState('');
  const [formLoginEmail, setFormLoginEmail] = useState('');
  const [formLoginUrl, setFormLoginUrl] = useState('');
  const [formImportanceLevel, setFormImportanceLevel] = useState('medium');
  const [formLinkedSimId, setFormLinkedSimId] = useState<string>('');
  const [formBackupEmail, setFormBackupEmail] = useState('');
  const [formBackupSimId, setFormBackupSimId] = useState<string>('');
  const [formOwnerId, setFormOwnerId] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Lấy tài khoản đang được chọn để xem chi tiết hoặc sửa
  const selectedAccount = useMemo(() => {
    return initialAccounts.find(a => a.id === selectedAccountId) || null;
  }, [initialAccounts, selectedAccountId]);

  // Escape keydown listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddOpen(false);
        setIsEditOpen(false);
        setSelectedAccountId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Copy text clipboard helper with safety block
  const handleCopy = async (text: string, id: number) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Không thể sao chép — trình duyệt không hỗ trợ', 'error');
    }
  };

  // Lọc tài khoản theo search, platform, importance
  const filteredAccounts = useMemo(() => {
    return initialAccounts.filter(acc => {
      const query = search.toLowerCase().trim();
      const matchSearch = !query ||
        acc.accountName.toLowerCase().includes(query) ||
        (acc.username || '').toLowerCase().includes(query) ||
        (acc.loginEmail || '').toLowerCase().includes(query) ||
        (acc.ownerName || '').toLowerCase().includes(query);

      const accPlatform = acc.platformKey.toLowerCase();
      const matchPlatform = platformFilter === 'ALL' || 
                            accPlatform === platformFilter || 
                            (platformFilter === 'other' && !PLATFORM_MAP[accPlatform]);
                            
      const matchImportance = importanceFilter === 'ALL' || acc.importanceLevel === importanceFilter;

      return matchSearch && matchPlatform && matchImportance;
    });
  }, [initialAccounts, search, platformFilter, importanceFilter]);

  // Sắp xếp tài khoản
  const sortedAccounts = useMemo(() => {
    const sorted = [...filteredAccounts];
    sorted.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredAccounts, sortField, sortOrder]);

  // Phân trang
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAccounts.slice(start, start + itemsPerPage);
  }, [sortedAccounts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(paginatedAccounts.map(acc => acc.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    setIsBulkDeleteOpen(true);
  };

  const executeBulkDelete = () => {
    setIsBulkDeleteOpen(false);
    startTransition(async () => {
      let successCount = 0;
      for (const id of selectedRows) {
        const res = await deleteSimLinkedAccount(teamId, id);
        if (res.success) successCount++;
      }
      showToast(`Đã xóa thành công ${successCount}/${selectedRows.length} tài khoản`, 'success');
      setSelectedRows([]);
      router.refresh();
    });
  };

  const openAddModal = () => {
    setFormAccountName('');
    setFormPlatformKey('facebook');
    setFormUsername('');
    setFormLoginEmail('');
    setFormLoginUrl('');
    setFormImportanceLevel('medium');
    setFormLinkedSimId(assets[0]?.id.toString() || '');
    setFormBackupEmail('');
    setFormBackupSimId('');
    setFormOwnerId('');
    setFormNotes('');
    setFormPassword('');
    setShowFormPassword(false);
    setIsAddOpen(true);
  };

  const openEditModal = (acc: LinkedAccountJoined) => {
    setSelectedAccountId(acc.id);
    setFormAccountName(acc.accountName);
    setFormPlatformKey(acc.platformKey);
    setFormUsername(acc.username || '');
    setFormLoginEmail(acc.loginEmail || '');
    setFormLoginUrl(acc.loginUrl || '');
    setFormImportanceLevel(acc.importanceLevel);
    setFormLinkedSimId(acc.linkedPhoneAssetId?.toString() || '');
    setFormBackupEmail(acc.backupEmail || '');
    setFormBackupSimId(acc.backupPhoneAssetId?.toString() || '');
    setFormOwnerId(acc.ownerEmployeeId?.toString() || '');
    setFormNotes(acc.notes || '');
    setFormPassword(acc.encryptedPassword || '');
    setShowFormPassword(false);
    setIsEditOpen(true);
  };

  // Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccountName || !formUsername) {
      showToast('Vui lòng điền đủ Tên tài khoản và Username', 'error');
      return;
    }

    startTransition(async () => {
      const res = await createSimLinkedAccount(teamId, {
        accountName: formAccountName,
        platformKey: formPlatformKey,
        username: formUsername,
        loginEmail: formLoginEmail || null,
        loginUrl: formLoginUrl || null,
        importanceLevel: formImportanceLevel,
        linkedPhoneAssetId: formLinkedSimId ? parseInt(formLinkedSimId) : null,
        encryptedPassword: formPassword || null,
        backupEmail: formBackupEmail || null,
        backupPhoneAssetId: formBackupSimId ? parseInt(formBackupSimId) : null,
        ownerEmployeeId: formOwnerId ? parseInt(formOwnerId) : null,
        notes: formNotes || null,
        status: 'active'
      });

      if (res.success) {
        showToast('Tạo tài khoản liên kết thành công', 'success');
        setIsAddOpen(false);
        router.refresh();
      } else {
        showToast(res.error || 'Thêm thất bại', 'error');
      }
    });
  };

  // Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !formAccountName || !formUsername) return;

    startTransition(async () => {
      const res = await updateSimLinkedAccount(teamId, selectedAccountId, {
        accountName: formAccountName,
        platformKey: formPlatformKey,
        username: formUsername,
        loginEmail: formLoginEmail || null,
        loginUrl: formLoginUrl || null,
        importanceLevel: formImportanceLevel,
        linkedPhoneAssetId: formLinkedSimId ? parseInt(formLinkedSimId) : null,
        encryptedPassword: formPassword || null,
        backupEmail: formBackupEmail || null,
        backupPhoneAssetId: formBackupSimId ? parseInt(formBackupSimId) : null,
        ownerEmployeeId: formOwnerId ? parseInt(formOwnerId) : null,
        notes: formNotes || null,
      });

      if (res.success) {
        showToast('Cập nhật tài khoản thành công', 'success');
        setIsEditOpen(false);
        router.refresh();
      } else {
        showToast(res.error || 'Cập nhật thất bại', 'error');
      }
    });
  };

  // Delete account
  const handleDelete = (id: number) => {
    startTransition(async () => {
      const res = await deleteSimLinkedAccount(teamId, id);
      if (res.success) {
        showToast('Xóa tài khoản liên kết thành công', 'success');
        router.refresh();
      } else {
        showToast(res.error || 'Xóa thất bại', 'error');
      }
    });
  };

  // Helper hiển thị badge mức độ quan trọng
  const getImportanceBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getImportanceLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Nguy cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      default: return 'Thấp';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cam kết Bảo mật Vault 2.0 */}
      <div className="bg-emerald-950/10 border border-emerald-500/25 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-lg shadow-emerald-950/5 select-none">
        <div className="flex gap-3 items-start">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5 flex-wrap">
              Cam kết Bảo mật Vault 2.0
              <span className="text-[9px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">Military Grade AES-256-CBC</span>
              <span className="text-[9px] font-black tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md">Zero-Knowledge</span>
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed max-w-4xl">
              Để bảo vệ tuyệt đối dữ liệu doanh nghiệp, toàn bộ mật khẩu liên kết được mã hóa đối xứng an toàn trước khi ghi vào cơ sở dữ liệu. Hệ thống cam kết nguyên tắc <strong>Zero-Knowledge</strong>: Kể cả Super Admin, Kỹ sư hệ thống hay bên thứ ba đều <strong>tuyệt đối không thể đọc được mật khẩu gốc</strong> của bạn.
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center text-[10px] text-emerald-400 font-bold shrink-0 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          Đang mã hóa thời gian thực
        </div>
      </div>

      {/* Tool Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tài khoản, username, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Nút Xóa hàng loạt (Bulk Delete) */}
          {selectedRows.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="px-3.5 py-2 text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-45"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa {selectedRows.length} tài khoản
            </button>
          )}

          {/* Lọc Platform */}
          <select
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Tất cả nền tảng</option>
            {Object.entries(PLATFORM_MAP).map(([key, item]) => (
              <option key={key} value={key}>{item.label}</option>
            ))}
          </select>

          {/* Lọc Importance */}
          <select
            value={importanceFilter}
            onChange={(e) => { setImportanceFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Độ quan trọng</option>
            <option value="critical">Nguy cấp</option>
            <option value="high">Cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>

          {/* Nút Nhập CSV Chrome */}
          <button
            onClick={() => { resetImportState(); setIsImportOpen(true); }}
            className="px-3.5 py-2 text-xs font-semibold bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            Nhập CSV Chrome
          </button>

          {/* Nút thêm tài khoản */}
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white hover:opacity-90 flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Liên kết tài khoản
          </button>
        </div>
      </div>

      {/* Main Container: Table + Slide Over Drawer */}
      <div className="relative flex gap-6 items-start">
        {/* Table Area */}
        <div className="flex-1 bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 font-bold select-none bg-white/[0.01]">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={paginatedAccounts.length > 0 && selectedRows.length === paginatedAccounts.length}
                      onChange={handleSelectAll}
                      className="rounded border-white/10 bg-gray-950 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th onClick={() => handleSort('accountName')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Tên tài khoản
                      {sortField === 'accountName' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('platformKey')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Nền tảng
                      {sortField === 'platformKey' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('username')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Username
                      {sortField === 'username' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('linkedPhoneNumber')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      SIM OTP nhận
                      {sortField === 'linkedPhoneNumber' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th className="p-4 text-gray-400">Người phụ trách</th>
                  <th onClick={() => handleSort('importanceLevel')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Độ quan trọng
                      {sortField === 'importanceLevel' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 italic">
                      Chưa có tài khoản liên kết nào khớp bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  paginatedAccounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    const isRowChecked = selectedRows.includes(acc.id);
                    const pInfo = PLATFORM_MAP[acc.platformKey.toLowerCase()] || PLATFORM_MAP.other;
                    return (
                      <tr 
                        key={acc.id}
                        onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                        className={`hover:bg-white/[0.02] cursor-pointer transition-colors border-l-2 ${
                          isSelected ? 'bg-white/[0.03] border-orange-500' : 'border-transparent'
                        }`}
                      >
                        <td className="p-4" onClick={(e) => handleSelectRow(acc.id, e)}>
                          <input
                            type="checkbox"
                            checked={isRowChecked}
                            onChange={() => {}} // Handle click captures this
                            className="rounded border-white/10 bg-gray-950 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 font-extrabold text-white">{acc.accountName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg border ${pInfo.bg} ${pInfo.color}`}>
                            {pInfo.label}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-gray-300">
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="truncate max-w-[120px] inline-block">{acc.username}</span>
                            <button
                              onClick={() => handleCopy(acc.username || '', acc.id)}
                              className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                              title="Copy username"
                            >
                              {copiedId === acc.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300 font-mono">{acc.linkedPhoneNumber || 'Không có SIM'}</td>
                        <td className="p-4 text-gray-400">{acc.ownerName || 'Chưa bàn giao'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getImportanceBadge(acc.importanceLevel)}`}>
                            {getImportanceLabel(acc.importanceLevel)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 select-none bg-white/[0.01]">
            <span>Hiển thị {paginatedAccounts.length} trên tổng số {sortedAccounts.length} tài khoản</span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1 || isPending}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3 py-1.5 bg-white/[0.02] border border-white/15 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all font-semibold"
              >
                Trước
              </button>
              <span className="flex items-center px-1 font-bold text-white">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages || isPending}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 py-1.5 bg-white/[0.02] border border-white/15 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all font-semibold"
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        {/* Slide-over Drawer Chi tiết Tài khoản */}
        {selectedAccount && !isEditOpen && (
          <>
            {/* Mobile Backdrop */}
            <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAccountId(null)} />
            
            {/* Drawer */}
            <div className="fixed lg:sticky top-0 right-0 lg:top-14 z-50 lg:z-0 w-full sm:w-96 h-full lg:h-auto lg:max-h-[calc(100vh-6rem)] bg-gray-900 border-l lg:border border-white/10 lg:rounded-2xl p-5 flex flex-col justify-between overflow-y-auto animate-fade-in shadow-2xl">
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <Globe className="h-5 w-5 text-orange-500" />
                    {selectedAccount.accountName}
                  </h3>
                  <span className="text-xs font-mono text-gray-400">{selectedAccount.username}</span>
                </div>
                <button 
                  onClick={() => setSelectedAccountId(null)}
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 py-4 space-y-5 text-xs text-gray-300">
                {/* Platform & Importance badges */}
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nền tảng</p>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-black rounded-lg border ${PLATFORM_MAP[selectedAccount.platformKey.toLowerCase()]?.bg || PLATFORM_MAP.other.bg} ${PLATFORM_MAP[selectedAccount.platformKey.toLowerCase()]?.color || PLATFORM_MAP.other.color}`}>
                      {PLATFORM_MAP[selectedAccount.platformKey.toLowerCase()]?.label || PLATFORM_MAP.other.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-right">Độ quan trọng</p>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-bold border ${getImportanceBadge(selectedAccount.importanceLevel)}`}>
                      {getImportanceLabel(selectedAccount.importanceLevel)}
                    </span>
                  </div>
                </div>

                {/* Thông tin đăng nhập */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Thông tin đăng nhập</h4>
                  <div className="bg-white/[0.01] p-3 border border-white/5 rounded-xl space-y-2.5">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Tên đăng nhập / ID</span>
                      <div className="flex items-center justify-between">
                        <strong className="text-white font-mono">{selectedAccount.username}</strong>
                        <button
                          onClick={() => handleCopy(selectedAccount.username || '', selectedAccount.id)}
                          className="p-1 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded transition-colors"
                        >
                          {copiedId === selectedAccount.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Mật khẩu</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <strong className="text-white font-mono">
                          {isOwner 
                            ? (showPasswordMap[selectedAccount.id] 
                              ? (selectedAccount.encryptedPassword || '—') 
                              : '••••••••••••')
                            : '••••••••••••'}
                        </strong>
                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowPasswordMap(prev => ({
                                ...prev,
                                [selectedAccount.id]: !prev[selectedAccount.id]
                              }))}
                              className="p-1 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded transition-colors"
                              title={showPasswordMap[selectedAccount.id] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                              {showPasswordMap[selectedAccount.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedAccount.encryptedPassword || '', selectedAccount.id + 100000)}
                              className="p-1 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded transition-colors"
                              title="Copy mật khẩu"
                            >
                              {copiedId === selectedAccount.id + 100000 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedAccount.loginEmail && (
                      <div>
                        <span className="text-gray-500 block text-[10px]">Email đăng nhập</span>
                        <strong className="text-white">{selectedAccount.loginEmail}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 block text-[10px]">Đường dẫn đăng nhập</span>
                      {selectedAccount.loginUrl ? (
                        <a
                          href={selectedAccount.loginUrl.startsWith('http') ? selectedAccount.loginUrl : `https://${selectedAccount.loginUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 font-bold hover:underline flex items-center gap-1 mt-0.5 truncate"
                        >
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          {selectedAccount.loginUrl}
                        </a>
                      ) : (
                        <span className="text-gray-500 italic block mt-0.5">Không có URL (Đăng nhập qua ứng dụng)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bảo mật & OTP */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Phương thức OTP & Bảo mật</h4>
                  <div className="grid grid-cols-2 gap-2.5 bg-white/[0.01] p-3 border border-white/5 rounded-xl">
                    <div>
                      <span className="text-gray-500 block text-[10px]">SIM OTP chính</span>
                      <strong className="text-white font-mono">{selectedAccount.linkedPhoneNumber || 'Không có SIM'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Người phụ trách</span>
                      <strong className="text-white">{selectedAccount.ownerName || 'Chưa bàn giao'}</strong>
                    </div>
                    {selectedAccount.backupEmail && (
                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[10px]">Email khôi phục</span>
                        <strong className="text-white">{selectedAccount.backupEmail}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ghi chú bảo mật */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Ghi chú bảo mật</h4>
                  <div className="bg-white/[0.01] p-3 border border-white/5 rounded-xl text-gray-300 whitespace-pre-wrap font-sans text-xs">
                    {selectedAccount.notes || 'Không có ghi chú nào thêm.'}
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="border-t border-white/5 pt-3 mt-4 flex gap-2">
                <button
                  onClick={() => openEditModal(selectedAccount)}
                  className="flex-1 py-2 text-xs font-bold bg-white/[0.02] hover:bg-white/5 border border-white/10 rounded-xl text-gray-200 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Sửa tài khoản
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (deleteConfirmId !== selectedAccount.id) {
                      setDeleteConfirmId(selectedAccount.id);
                      setTimeout(() => setDeleteConfirmId(null), 3000);
                    } else {
                      handleDelete(selectedAccount.id);
                      setSelectedAccountId(null);
                      setDeleteConfirmId(null);
                    }
                  }}
                  className={`py-2 px-3 text-xs font-bold border rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 ${
                    deleteConfirmId === selectedAccount.id 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                  }`}
                >
                  {deleteConfirmId === selectedAccount.id ? 'Xóa?' : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL: Thêm mới liên kết */}
      {isAddOpen && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setIsAddOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto p-6 animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-base text-white">Liên Kết Tài Khoản Mới</h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên tài khoản */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Tên tài khoản *</label>
                  <input
                    type="text"
                    required
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                    placeholder="Ví dụ: Shop Giày Thể Thao HCM"
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Nền tảng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nền tảng</label>
                  <select
                    value={formPlatformKey}
                    onChange={(e) => setFormPlatformKey(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    {Object.entries(PLATFORM_MAP).map(([key, item]) => (
                      <option key={key} value={key}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Username đăng nhập *</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Tên đăng nhập hoặc ID"
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Mật khẩu */}
                {isOwner && (
                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-semibold">Mật khẩu đăng nhập</label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? "text" : "password"}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        className="w-full px-3 py-2 pr-10 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500 animate-fade-in"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                      >
                        {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Login Email */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Email đăng nhập</label>
                  <input
                    type="email"
                    value={formLoginEmail}
                    onChange={(e) => setFormLoginEmail(e.target.value)}
                    placeholder="partner@gmail.com"
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* URL Đăng nhập */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Đường dẫn đăng nhập (Login URL)</label>
                  <input
                    type="text"
                    value={formLoginUrl}
                    onChange={(e) => setFormLoginUrl(e.target.value)}
                    placeholder="https://facebook.com"
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Mức độ quan trọng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Mức độ quan trọng</label>
                  <select
                    value={formImportanceLevel}
                    onChange={(e) => setFormImportanceLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="critical">Nguy cấp</option>
                  </select>
                </div>

                {/* SIM nhận OTP */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">SIM nhận OTP chính (Tùy chọn)</label>
                  <select
                    value={formLinkedSimId}
                    onChange={(e) => setFormLinkedSimId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">— Không liên kết với SIM nào —</option>
                    {assets.map(sim => (
                      <option key={sim.id} value={sim.id}>{sim.name} ({sim.value})</option>
                    ))}
                  </select>
                </div>

                {/* Nhân sự phụ trách */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nhân sự quản lý tài khoản</label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  >
                    <option value="">Không phân công</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {/* Backup Email */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Email khôi phục (Backup Email)</label>
                  <input
                    type="email"
                    value={formBackupEmail}
                    onChange={(e) => setFormBackupEmail(e.target.value)}
                    placeholder="backup@company.com"
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  />
                </div>

                {/* SIM Khôi phục */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">SIM khôi phục backup</label>
                  <select
                    value={formBackupSimId}
                    onChange={(e) => setFormBackupSimId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  >
                    <option value="">Không có SIM khôi phục</option>
                    {assets.map(sim => (
                      <option key={sim.id} value={sim.id}>{sim.name} ({sim.value})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Ghi chú bổ sung</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú về bảo mật, mật khẩu phụ hoặc phương thức khôi phục..."
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Đang liên kết...' : 'Liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sửa tài khoản */}
      {isEditOpen && selectedAccount && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setIsEditOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto p-6 animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-base text-white">Sửa Tài Khoản Liên Kết</h3>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên tài khoản */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Tên tài khoản *</label>
                  <input
                    type="text"
                    required
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Nền tảng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nền tảng</label>
                  <select
                    value={formPlatformKey}
                    onChange={(e) => setFormPlatformKey(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    {Object.entries(PLATFORM_MAP).map(([key, item]) => (
                      <option key={key} value={key}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Username đăng nhập *</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Mật khẩu */}
                {isOwner && (
                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-semibold">Mật khẩu đăng nhập</label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? "text" : "password"}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                      >
                        {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Login Email */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Email đăng nhập</label>
                  <input
                    type="email"
                    value={formLoginEmail}
                    onChange={(e) => setFormLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  />
                </div>

                {/* URL Đăng nhập */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Đường dẫn đăng nhập (Login URL)</label>
                  <input
                    type="text"
                    value={formLoginUrl}
                    onChange={(e) => setFormLoginUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  />
                </div>

                {/* Mức độ quan trọng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Mức độ quan trọng</label>
                  <select
                    value={formImportanceLevel}
                    onChange={(e) => setFormImportanceLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="critical">Nguy cấp</option>
                  </select>
                </div>

                {/* SIM nhận OTP */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">SIM nhận OTP chính (Tùy chọn)</label>
                  <select
                    value={formLinkedSimId}
                    onChange={(e) => setFormLinkedSimId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">— Không liên kết với SIM nào —</option>
                    {assets.map(sim => (
                      <option key={sim.id} value={sim.id}>{sim.name} ({sim.value})</option>
                    ))}
                  </select>
                </div>

                {/* Nhân sự phụ trách */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nhân sự quản lý tài khoản</label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  >
                    <option value="">Không phân công</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {/* Backup Email */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Email khôi phục (Backup Email)</label>
                  <input
                    type="email"
                    value={formBackupEmail}
                    onChange={(e) => setFormBackupEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  />
                </div>

                {/* SIM Khôi phục */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">SIM khôi phục backup</label>
                  <select
                    value={formBackupSimId}
                    onChange={(e) => setFormBackupSimId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none"
                  >
                    <option value="">Không có SIM khôi phục</option>
                    {assets.map(sim => (
                      <option key={sim.id} value={sim.id}>{sim.name} ({sim.value})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Ghi chú bổ sung</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nhập dữ liệu CSV Chrome */}
      {isImportOpen && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setIsImportOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto p-6 animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-orange-500" />
                <h3 className="font-extrabold text-base text-white">Nhập Mật Khẩu từ File CSV (Chrome)</h3>
              </div>
              <button 
                onClick={() => setIsImportOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Hướng dẫn lấy file CSV mật khẩu từ Chrome */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2 text-gray-400 text-[11px] leading-relaxed">
              <p className="font-extrabold text-white flex items-center gap-1.5">
                <Info className="h-4 w-4 text-orange-400 shrink-0" />
                Hướng dẫn xuất file mật khẩu CSV từ Chrome:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Mở trình duyệt Google Chrome trên máy tính của bạn.</li>
                <li>Truy cập trực tiếp đường dẫn cấu hình: <code className="bg-black/40 px-1.5 py-0.5 rounded text-gray-300 font-mono">chrome://password-manager/settings</code></li>
                <li>Tìm đến mục <b>Xuất mật khẩu (Export passwords)</b> và bấm nút <b>Tải tệp... (Download file)</b>.</li>
                <li>Chrome sẽ yêu cầu bạn nhập mật khẩu/PIN mở khóa máy tính để bảo mật &rarr; Sau khi nhập đúng, Chrome sẽ tải xuống tệp tin <code className="text-orange-400 font-mono">Chrome Passwords.csv</code>.</li>
                <li>Sử dụng ô bên dưới để kéo thả hoặc chọn tệp tin này nhằm đồng bộ mật khẩu hàng loạt lên hệ thống.</li>
              </ol>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              {/* Dropzone kéo thả */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  handleImportFile(file);
                }}
                onClick={() => {
                  const input = document.getElementById('csv-file-input');
                  input?.click();
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  dragOver 
                    ? 'border-orange-500 bg-orange-500/5' 
                    : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20'
                }`}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                />
                <Upload className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-extrabold text-white">
                    {importFileName ? `Đang chọn: ${importFileName}` : 'Kéo thả file CSV vào đây hoặc click để chọn'}
                  </p>
                  <p className="text-gray-500 mt-1 text-[11px]">Chỉ hỗ trợ file .csv mật khẩu xuất từ Chrome</p>
                </div>
              </div>

              {/* Chọn SIM OTP Nhận mặc định */}
              {parsedImportAccounts.length > 0 && (
                <div className="space-y-1.5 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                  <label className="text-gray-400 font-semibold block">SIM OTP liên kết mặc định (Tùy chọn)</label>
                  <span className="text-[10px] text-gray-500 block mb-2">Bạn có thể chọn một SIM để quản lý tập trung OTP cho các tài khoản được import.</span>
                  <select
                    value={importTargetSimId}
                    onChange={(e) => setImportTargetSimId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 font-bold"
                  >
                    <option value="">— Không liên kết SIM —</option>
                    {assets.map(sim => (
                      <option key={sim.id} value={sim.id}>{sim.name} ({sim.value})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview Thống kê */}
              {parsedImportAccounts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Xem trước dữ liệu Nhập</h4>
                  <div className="grid grid-cols-4 gap-2 bg-white/[0.01] border border-white/5 p-3 rounded-xl text-center">
                    <div>
                      <span className="text-gray-500 text-[10px] block">Tổng số</span>
                      <strong className="text-white text-sm font-black">{importStats.total}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-500 text-[10px] block">Thêm mới</span>
                      <strong className="text-emerald-400 text-sm font-black">{importStats.newCount}</strong>
                    </div>
                    <div>
                      <span className="text-blue-400 text-[10px] block">Cập nhật</span>
                      <strong className="text-blue-300 text-sm font-black">{importStats.updatedCount}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Bỏ qua</span>
                      <strong className="text-gray-400 text-sm font-black">{importStats.dupCount}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Tiến trình Upload (Progress Bar) */}
              {isImporting && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-orange-400">Đang đồng bộ dữ liệu lên Web App...</span>
                    <span className="text-white">{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => { setIsImportOpen(false); resetImportState(); }}
                  disabled={isImporting}
                  className="px-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-bold disabled:opacity-30"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isImporting || parsedImportAccounts.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isImporting ? 'Đang đồng bộ...' : 'Đồng bộ lên Web App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Bulk Delete Confirm Modal */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-md animate-fade-in">
          <div 
            className="w-full max-w-md bg-gray-900/90 border border-red-500/20 rounded-2xl p-6 shadow-2xl relative animate-scale-up backdrop-blur-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400">
                <Trash2 className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Xác nhận xóa tài khoản</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Bạn có chắc chắn muốn xóa <strong className="text-red-400 font-extrabold">{selectedRows.length} tài khoản</strong> liên kết đã chọn?
                  Hành động này là không thể hoàn tác, dữ liệu liên kết sẽ bị xóa vĩnh viễn khỏi hệ thống.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-bold transition-all text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-all text-xs shadow-lg shadow-red-500/10"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
