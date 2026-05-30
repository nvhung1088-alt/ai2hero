'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  Upload, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Smartphone, 
  User, 
  Calendar, 
  DollarSign, 
  Activity, 
  Trash2, 
  Edit, 
  CheckCircle, 
  RefreshCw, 
  FileSpreadsheet, 
  Link2, 
  ShieldAlert, 
  Check,
  AlertTriangle,
  Info,
  Lock
} from 'lucide-react';
import { 
  createSimAsset, 
  updateSimAsset, 
  deleteSimAsset, 
  addSimCheckLog, 
  importSimAssetsBatch 
} from '@/lib/db/sim-actions';
import { calculateRiskScore, getRiskLevel, getRiskColor, getRiskText } from '@/lib/sim-risk-engine';
import { showToast } from '../sim-ui-helpers';

// Định nghĩa types nội bộ
interface SimAssetJoined {
  id: number;
  name: string;
  value: string;
  importanceLevel: string;
  ownerEmployeeId: number | null;
  ownerName: string | null;
  status: string;
  riskScore: number | null;
  lastCheckedAt: Date | string | null;
  activationDate: Date | string | null;
  carrier: string | null;
  lineType: string | null;
  numverifyValid: number | null;
  registeredName: string | null;
  registeredId: string | null;
  registeredAt: Date | string | null;
  topupCycleDays: number | null;
  lastTopupAt: Date | string | null;
  renewalDate: Date | string | null;
  createdAt: Date | string | null;
}

interface Employee {
  id: number;
  name: string;
  email: string | null;
  status: string;
  userId?: number | null;
  phone?: string | null;
  department?: string | null;
  leftAt?: Date | null;
}

interface LinkedAccount {
  id: number;
  platformKey: string;
  accountName: string;
  username: string | null;
  linkedPhoneAssetId: number | null;
  importanceLevel: string;
  status: string;
  ownerName: string | null;
}

interface CheckLogJoined {
  id: number;
  assetId: number;
  assetName: string | null;
  assetValue: string | null;
  checkedByName: string | null;
  checkedAt: Date | string;
  checkType: string | null;
  riskScoreBefore: number | null;
  riskScoreAfter: number | null;
  notes: string | null;
}

interface AssetsClientProps {
  teamId: number;
  initialAssets: SimAssetJoined[];
  employees: Employee[];
  linkedAccounts: LinkedAccount[];
  initialCheckLogs: CheckLogJoined[];
  userRole?: string;
}

export default function AssetsClient({
  teamId,
  initialAssets,
  employees,
  linkedAccounts,
  initialCheckLogs,
  userRole,
}: AssetsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isOwner = userRole === 'owner';

  // States tìm kiếm, lọc và phân trang
  const [search, setSearch] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState('ALL');
  const [importanceFilter, setImportanceFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'name' | 'value' | 'riskScore' | 'lastCheckedAt' | 'carrier' | 'ownerName'>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // States cho Drawer và Modals
  const [selectedSimId, setSelectedSimId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // States cho Form
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formCarrier, setFormCarrier] = useState('Viettel');
  const [formOwnerId, setFormOwnerId] = useState<string>('');
  const [formLineType, setFormLineType] = useState('Physical');
  const [formImportance, setFormImportance] = useState('medium');
  const [formCycleDays, setFormCycleDays] = useState(30);
  const [formActivationDate, setFormActivationDate] = useState('');
  const [formRegisteredName, setFormRegisteredName] = useState('');
  const [formRegisteredId, setFormRegisteredId] = useState('');
  const [formRegisteredAt, setFormRegisteredAt] = useState('');
  
  // CSV Import State
  const [csvText, setCsvText] = useState('');

  // Tìm SIM được chọn
  const selectedSim = useMemo(() => {
    return initialAssets.find(s => s.id === selectedSimId) || null;
  }, [initialAssets, selectedSimId]);

  // Lấy các tài khoản liên kết của SIM được chọn
  const selectedSimAccounts = useMemo(() => {
    if (!selectedSimId) return [];
    return linkedAccounts.filter(a => a.linkedPhoneAssetId === selectedSimId);
  }, [linkedAccounts, selectedSimId]);

  // Lấy lịch sử kiểm tra của SIM được chọn
  const selectedSimLogs = useMemo(() => {
    if (!selectedSimId) return [];
    return initialCheckLogs.filter(log => log.assetId === selectedSimId);
  }, [initialCheckLogs, selectedSimId]);

  // Danh sách các nhà mạng có sẵn trong dữ liệu
  const carriers = useMemo(() => {
    const set = new Set<string>();
    initialAssets.forEach(s => {
      if (s.carrier) set.add(s.carrier);
    });
    return Array.from(set);
  }, [initialAssets]);

  // Trap Focus / Escape keydown listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddOpen(false);
        setIsEditOpen(false);
        setIsImportOpen(false);
        setSelectedSimId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Xử lý tìm kiếm, lọc
  const filteredAssets = useMemo(() => {
    return initialAssets.filter(sim => {
      // 1. Search
      const query = search.toLowerCase();
      const matchSearch = 
        sim.name.toLowerCase().includes(query) || 
        sim.value.includes(query) || 
        (sim.ownerName && sim.ownerName.toLowerCase().includes(query));
      
      // 2. Carrier Filter
      const matchCarrier = carrierFilter === 'ALL' || sim.carrier === carrierFilter;

      // 3. Risk Filter
      const level = getRiskLevel(sim.riskScore || 0);
      const matchRisk = riskFilter === 'ALL' || 
        (riskFilter === 'SAFE' && level === 'safe') ||
        (riskFilter === 'WATCH' && level === 'watch') ||
        (riskFilter === 'HIGH' && level === 'high') ||
        (riskFilter === 'CRITICAL' && level === 'critical');

      // 4. Line Type Filter
      const matchLineType = lineTypeFilter === 'ALL' || sim.lineType === lineTypeFilter;

      // 5. Importance Filter
      const matchImportance = importanceFilter === 'ALL' || sim.importanceLevel === importanceFilter;

      return matchSearch && matchCarrier && matchRisk && matchLineType && matchImportance;
    });
  }, [initialAssets, search, carrierFilter, riskFilter, lineTypeFilter, importanceFilter]);

  // Xử lý Sắp xếp
  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      let aVal: string | number | Date | null = a[sortField as keyof typeof a] as string | number | Date | null;
      let bVal: string | number | Date | null = b[sortField as keyof typeof b] as string | number | Date | null;

      // Xử lý null
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Xử lý ngày
      if (sortField === 'lastCheckedAt' as any || sortField === 'createdAt' as any) {
        const timeA = aVal instanceof Date ? aVal.getTime() : new Date(String(aVal)).getTime();
        const timeB = bVal instanceof Date ? bVal.getTime() : new Date(String(bVal)).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < (bVal as any)) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortField, sortOrder]);

  // Phân trang
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAssets, currentPage]);

  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage) || 1;

  // Toggle Sắp xếp
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };



  // Mở modal thêm SIM mới
  const openAddModal = () => {
    setFormName('');
    setFormValue('');
    setFormCarrier('Viettel');
    setFormOwnerId('');
    setFormLineType('Physical');
    setFormImportance('medium');
    setFormCycleDays(30);
    setFormActivationDate('');
    setFormRegisteredName('');
    setFormRegisteredId('');
    setFormRegisteredAt('');
    setIsAddOpen(true);
  };

  // Mở modal sửa SIM
  const openEditModal = () => {
    if (!selectedSim) return;
    setFormName(selectedSim.name);
    setFormValue(selectedSim.value);
    setFormCarrier(selectedSim.carrier || 'Viettel');
    setFormOwnerId(selectedSim.ownerEmployeeId?.toString() || '');
    setFormLineType(selectedSim.lineType || 'Physical');
    setFormImportance(selectedSim.importanceLevel || 'medium');
    setFormCycleDays(selectedSim.topupCycleDays || 30);
    
    // Format date YYYY-MM-DD
    const formatDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : '';
    setFormActivationDate(formatDate(selectedSim.activationDate));
    setFormRegisteredName(selectedSim.registeredName || '');
    setFormRegisteredId(selectedSim.registeredId || '');
    setFormRegisteredAt(formatDate(selectedSim.registeredAt));

    setIsEditOpen(true);
  };

  // Xử lý tạo mới SIM
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formValue) {
      showToast('Vui lòng điền đủ Tên SIM và Số điện thoại', 'error');
      return;
    }

    startTransition(async () => {
      const res = await createSimAsset(teamId, {
        name: formName,
        value: formValue,
        importanceLevel: formImportance,
        ownerEmployeeId: formOwnerId ? parseInt(formOwnerId) : null,
        status: 'active',
        riskScore: 0,
        carrier: formCarrier,
        lineType: formLineType,
        numverifyValid: 1, // mặc định hợp lệ, sẽ kiểm tra sau
        registeredName: formRegisteredName || null,
        registeredId: formRegisteredId || null,
        registeredAt: formRegisteredAt ? new Date(formRegisteredAt) : null,
        topupCycleDays: formCycleDays,
        activationDate: formActivationDate ? new Date(formActivationDate) : null,
        lastCheckedAt: null,
        lastTopupAt: null,
        renewalDate: null,
      });

      if (res.success) {
        showToast('Thêm thiết bị SIM thành công', 'success');
        setIsAddOpen(false);
        router.refresh();
      } else {
        showToast(res.error || 'Thêm thất bại', 'error');
      }
    });
  };

  // Xử lý sửa SIM
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimId || !formName || !formValue) return;

    startTransition(async () => {
      const res = await updateSimAsset(teamId, selectedSimId, {
        name: formName,
        value: formValue,
        importanceLevel: formImportance,
        ownerEmployeeId: formOwnerId ? parseInt(formOwnerId) : null,
        carrier: formCarrier,
        lineType: formLineType,
        registeredName: formRegisteredName || null,
        registeredId: formRegisteredId || null,
        registeredAt: formRegisteredAt ? new Date(formRegisteredAt) : null,
        topupCycleDays: formCycleDays,
        activationDate: formActivationDate ? new Date(formActivationDate) : null,
      });

      if (res.success) {
        showToast('Cập nhật thiết bị SIM thành công', 'success');
        setIsEditOpen(false);
        router.refresh();
      } else {
        showToast(res.error || 'Cập nhật thất bại', 'error');
      }
    });
  };

  const handleDelete = async () => {
    if (!selectedSimId) return;

    startTransition(async () => {
      const res = await deleteSimAsset(teamId, selectedSimId);
      if (res.success) {
        showToast('Xóa thiết bị SIM thành công', 'success');
        setSelectedSimId(null);
        router.refresh();
      } else {
        showToast(res.error || 'Xóa thất bại', 'error');
      }
    });
  };

  // Xử lý chạy kiểm tra SIM (Security Check)
  const handleCheckSim = async () => {
    if (!selectedSim) return;

    startTransition(async () => {
      const getEmployee = (id: number) => {
        const emp = employees.find(e => e.id === id);
        if (!emp) return undefined;
        return {
          ...emp,
          phone: null,
          department: null,
          leftAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          teamId,
          userId: emp.userId ?? null
        };
      };
      const getLinkedAccountsForAsset = (id: number) => {
        return linkedAccounts.filter(la => la.linkedPhoneAssetId === id).map(la => ({
          ...la,
          teamId,
          linkedPhoneAssetId: id,
          notes: null,
          loginEmail: null,
          loginUrl: null,
          backupEmail: null,
          backupPhoneAssetId: null,
          ownerEmployeeId: null,
          encryptedPassword: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
      };

      // Ép kiểu sim về dạng SimAsset cho engine
      const simAssetRaw = {
        ...selectedSim,
        teamId,
        riskScore: selectedSim.riskScore || 0,
        lastCheckedAt: selectedSim.lastCheckedAt ? new Date(selectedSim.lastCheckedAt) : null,
        activationDate: selectedSim.activationDate ? new Date(selectedSim.activationDate) : null,
        registeredAt: selectedSim.registeredAt ? new Date(selectedSim.registeredAt) : null,
        lastTopupAt: selectedSim.lastTopupAt ? new Date(selectedSim.lastTopupAt) : null,
        renewalDate: selectedSim.renewalDate ? new Date(selectedSim.renewalDate) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const assessment = calculateRiskScore(simAssetRaw, {
        getEmployee,
        getLinkedAccountsForAsset
      });

      // Tạo ghi chú kiểm tra
      const notes = assessment.factors.length > 0 
        ? `Phát hiện ${assessment.factors.length} yếu tố rủi ro: ${assessment.factors.map(f => f.label).join(', ')}`
        : 'Thiết bị SIM an toàn, không phát hiện rủi ro nào.';

      // 2. Lưu Check Log vào DB (Server Action này tự động cập nhật riskScore và lastCheckedAt của SIM)
      const res = await addSimCheckLog(teamId, {
        assetId: selectedSim.id,
        checkType: 'manual',
        riskScoreBefore: selectedSim.riskScore || 0,
        riskScoreAfter: assessment.score,
        notes,
        statusAfter: getRiskLevel(assessment.score)
      });

      if (res.success) {
        showToast(`Đã kiểm tra SIM. Điểm rủi ro mới: ${assessment.score}/100`, 'success');
        router.refresh();
      } else {
        showToast(res.error || 'Kiểm tra thất bại', 'error');
      }
    });
  };

  // Xử lý Import CSV
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    startTransition(async () => {
      try {
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes; continue; }
            if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
            current += char;
          }
          result.push(current.trim());
          return result;
        };
        const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
        
        // Cần các cột: name, value, carrier
        const nameIdx = headers.indexOf('name');
        const valueIdx = headers.indexOf('value');
        const carrierIdx = headers.indexOf('carrier');

        if (nameIdx === -1 || valueIdx === -1) {
          showToast('Định dạng CSV không chuẩn. Phải chứa các cột: name, value', 'error');
          return;
        }

        const rawAssets = lines.slice(1).map(line => {
          const cols = parseCSVLine(line);
          return {
            name: cols[nameIdx] || 'SIM mới',
            value: cols[valueIdx] || '',
            carrier: carrierIdx !== -1 ? cols[carrierIdx] : 'Khác',
            importanceLevel: 'medium',
            ownerEmployeeId: null,
            status: 'active',
            riskScore: 0,
            lineType: 'Physical',
            numverifyValid: 1,
            topupCycleDays: 30,
            lastCheckedAt: null,
            activationDate: null,
            registeredName: null,
            registeredId: null,
            registeredAt: null,
            lastTopupAt: null,
            renewalDate: null,
          };
        }).filter(ast => ast.value); // Loại bỏ dòng trống sđt

        if (rawAssets.length === 0) {
          showToast('Không tìm thấy dòng dữ liệu nào', 'error');
          return;
        }

        const res = await importSimAssetsBatch(teamId, rawAssets);
        if (res.success) {
          showToast(`Nhập hàng loạt thành công ${res.data?.length} SIM`, 'success');
          setIsImportOpen(false);
          setCsvText('');
          router.refresh();
        } else {
          showToast(res.error || 'Import thất bại', 'error');
        }
      } catch (err: any) {
        showToast('Lỗi phân tích file CSV', 'error');
      }
    });
  };

  // Tạo và tải file CSV mẫu Kho SIM client-side
  const downloadSampleCSV = () => {
    const csvContent = "name,value,carrier\nSIM Hotline 01,0988112233,Viettel\nSIM Marketing 02,0909223344,Mobifone\nSIM CSKH 03,0912345678,Vinaphone";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mau_import_kho_sim.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div className="space-y-4">
      {/* Cam kết Bảo mật Thông tin SIM & Định danh PII */}
      <div className="bg-emerald-950/10 border border-emerald-500/25 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-lg shadow-emerald-950/5 select-none">
        <div className="flex gap-3 items-start">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5 flex-wrap">
              Cam kết Bảo mật Định danh & Sở hữu SIM
              <span className="text-[9px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">Military Grade AES-256-CBC</span>
              <span className="text-[9px] font-black tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md">Zero-Knowledge</span>
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed max-w-4xl">
              Để ngăn ngừa tuyệt đối nguy cơ rò rỉ thông tin cá nhân và tấn công SIM Swapping, toàn bộ dữ liệu <strong>Số điện thoại SIM</strong>, <strong>Họ tên chủ SIM</strong> và <strong>Số giấy tờ (CCCD/MST)</strong> đều được mã hóa đối xứng an toàn trước khi ghi vào cơ sở dữ liệu. Hệ thống cam kết nguyên lý <strong>Zero-Knowledge</strong>: Không một ai kể cả Super Admin có thể xem được thông tin định danh hoặc số điện thoại gốc của SIM nếu chưa được phân quyền thành viên tổ chức hợp lệ.
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center text-[10px] text-emerald-400 font-bold shrink-0 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          Đang bảo vệ dữ liệu PII & Tài sản SIM thời gian thực
        </div>
      </div>

      {/* Search & Tool Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, nhân sự..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
          />
        </div>

        {/* Carrier Filter & Risk Filter & Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Lọc nhà mạng */}
          <select
            value={carrierFilter}
            onChange={(e) => { setCarrierFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Tất cả nhà mạng</option>
            {carriers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Lọc loại SIM */}
          <select
            value={lineTypeFilter}
            onChange={(e) => { setLineTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Loại SIM</option>
            <option value="Physical">SIM Vật lý</option>
            <option value="eSIM">eSIM</option>
          </select>

          {/* Lọc độ quan trọng */}
          <select
            value={importanceFilter}
            onChange={(e) => { setImportanceFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Độ quan trọng</option>
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
            <option value="critical">Nguy cấp</option>
          </select>

          {/* Lọc rủi ro */}
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Mức độ rủi ro</option>
            <option value="SAFE">Lành mạnh</option>
            <option value="WATCH">Theo dõi</option>
            <option value="HIGH">Rủi ro cao</option>
            <option value="CRITICAL">Nguy cấp</option>
          </select>

          {/* Import Button */}
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            Nhập CSV
          </button>

          {/* Add Button */}
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white hover:opacity-90 flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm SIM
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
                  <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Tên SIM
                      {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('value')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Số điện thoại
                      {sortField === 'value' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('carrier')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Nhà mạng
                      {sortField === 'carrier' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('ownerName')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Người phụ trách
                      {sortField === 'ownerName' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('riskScore')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Mức độ rủi ro
                      {sortField === 'riskScore' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('lastCheckedAt')} className="p-4 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      Kiểm tra gần nhất
                      {sortField === 'lastCheckedAt' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                      Không tìm thấy thiết bị SIM nào khớp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedAssets.map((sim) => {
                    const isSelected = selectedSimId === sim.id;
                    return (
                      <tr 
                        key={sim.id}
                        onClick={() => setSelectedSimId(isSelected ? null : sim.id)}
                        className={`hover:bg-white/[0.02] cursor-pointer transition-colors border-l-2 ${
                          isSelected ? 'bg-white/[0.03] border-orange-500' : 'border-transparent'
                        }`}
                      >
                        <td className="p-4 font-extrabold text-white">{sim.name}</td>
                        <td className="p-4 font-mono text-gray-300">{sim.value}</td>
                        <td className="p-4 text-gray-400">{sim.carrier}</td>
                        <td className="p-4 text-gray-300">{sim.ownerName || 'Chưa bàn giao'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskColor(sim.riskScore || 0)}`}>
                            {sim.riskScore ?? 0} - {getRiskText(sim.riskScore || 0)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">
                          {sim.lastCheckedAt ? new Date(sim.lastCheckedAt).toLocaleDateString('vi-VN') : 'Chưa check'}
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
            <span>Hiển thị {paginatedAssets.length} trên tổng số {sortedAssets.length} SIM</span>
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

        {/* Slide-over Drawer Chi tiết SIM */}
        {selectedSim && (
          <>
            {/* Mobile Backdrop */}
            <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSimId(null)} />
            
            {/* Drawer */}
            <div className="fixed lg:sticky top-0 right-0 lg:top-14 z-50 lg:z-0 w-full sm:w-96 h-full lg:h-auto lg:max-h-[calc(100vh-6rem)] bg-gray-900 border-l lg:border border-white/10 lg:rounded-2xl p-5 flex flex-col justify-between overflow-y-auto animate-fade-in shadow-2xl">
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Smartphone className="h-5 w-5 text-orange-500" />
                  {selectedSim.name}
                </h3>
                <span className="text-xs font-mono text-gray-400">{selectedSim.value}</span>
              </div>
              <button 
                onClick={() => setSelectedSimId(null)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 py-4 space-y-5 text-xs text-gray-300">
              {/* Điểm rủi ro & Check button */}
              <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Đánh giá rủi ro</p>
                  <p className="font-black text-white text-base mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-xs border ${getRiskColor(selectedSim.riskScore || 0)}`}>
                      {selectedSim.riskScore ?? 0} / 100 - {getRiskText(selectedSim.riskScore || 0)}
                    </span>
                  </p>
                </div>
                <button
                  disabled={isPending}
                  onClick={handleCheckSim}
                  className="px-2.5 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/30 rounded-lg font-bold flex items-center gap-1 transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
                  Check SIM
                </button>
              </div>

              {/* Thông tin thuê bao */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Thông tin thuê bao</h4>
                <div className="grid grid-cols-2 gap-2.5 bg-white/[0.01] p-3 border border-white/5 rounded-xl">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Nhà mạng</span>
                    <strong className="text-white font-semibold">{selectedSim.carrier || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Loại SIM</span>
                    <strong className="text-white font-semibold">{selectedSim.lineType === 'Physical' ? 'Vật lý' : 'eSIM'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Người phụ trách</span>
                    <strong className="text-white font-semibold">{selectedSim.ownerName || 'Chưa bàn giao'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Nạp tiền chu kỳ</span>
                    <strong className="text-white font-semibold">{selectedSim.topupCycleDays || 30} ngày</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block text-[10px]">Ngày kích hoạt</span>
                    <strong className="text-white font-semibold">
                      {selectedSim.activationDate ? new Date(selectedSim.activationDate).toLocaleDateString('vi-VN') : '—'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Thông tin chính chủ */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Thông tin chính chủ</h4>
                <div className="bg-white/[0.01] p-3 border border-white/5 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Họ và tên</span>
                    <strong className="text-white">
                      {isOwner 
                        ? (selectedSim.registeredName || 'Chưa đăng ký') 
                        : (selectedSim.registeredName ? '•••••••• (Chỉ Owner mới được xem)' : 'Chưa đăng ký')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CCCD/Hộ chiếu</span>
                    <strong className="text-white font-mono">
                      {isOwner 
                        ? (selectedSim.registeredId || '—') 
                        : (selectedSim.registeredId ? '••••••••' : '—')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngày đăng ký</span>
                    <strong className="text-white">
                      {isOwner 
                        ? (selectedSim.registeredAt ? new Date(selectedSim.registeredAt).toLocaleDateString('vi-VN') : '—') 
                        : (selectedSim.registeredAt ? '••••••••' : '—')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tài khoản liên kết */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Tài khoản liên kết ({selectedSimAccounts.length})</h4>
                  <Link2 className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-xl max-h-36 overflow-y-auto divide-y divide-white/5">
                  {selectedSimAccounts.length === 0 ? (
                    <p className="p-3 text-center text-gray-500 italic">Chưa gắn tài khoản nào</p>
                  ) : (
                    selectedSimAccounts.map(acc => (
                      <div key={acc.id} className="p-2.5 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-extrabold text-white truncate">{acc.accountName}</p>
                          <p className="text-[10px] text-gray-400 truncate font-mono">{acc.username || ''}</p>
                        </div>
                        <span className="px-1.5 py-0.5 text-[9px] bg-white/5 text-gray-300 rounded border border-white/10">
                          {acc.platformKey}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lịch sử kiểm định */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Nhật ký check gần đây</h4>
                  <Activity className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-xl max-h-36 overflow-y-auto divide-y divide-white/5">
                  {selectedSimLogs.length === 0 ? (
                    <p className="p-3 text-center text-gray-500 italic">Chưa có lịch sử check</p>
                  ) : (
                    selectedSimLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="p-2.5 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-gray-400">
                            {new Date(log.checkedAt).toLocaleString('vi-VN', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <strong className="text-white">
                            {log.riskScoreBefore} → {log.riskScoreAfter}đ
                          </strong>
                        </div>
                        <p className="text-[10px] text-gray-500 italic truncate" title={log.notes || ''}>
                          {log.notes}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="border-t border-white/5 pt-3 mt-4 flex gap-2">
              <button
                onClick={openEditModal}
                className="flex-1 py-2 text-xs font-bold bg-white/[0.02] hover:bg-white/5 border border-white/10 rounded-xl text-gray-200 hover:text-white flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit className="h-3.5 w-3.5" />
                Sửa SIM
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  if (deleteConfirmId !== selectedSim.id) {
                    setDeleteConfirmId(selectedSim.id);
                    setTimeout(() => setDeleteConfirmId(null), 3000);
                  } else {
                    handleDelete();
                    setDeleteConfirmId(null);
                  }
                }}
                className={`py-2 px-3 text-xs font-bold border rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 ${
                  deleteConfirmId === selectedSim.id 
                    ? 'bg-red-500 border-red-500 text-white' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                }`}
              >
                {deleteConfirmId === selectedSim.id ? 'Xác nhận xóa?' : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {/* MODAL: Thêm SIM mới */}
      {isAddOpen && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setIsAddOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-base text-white">Thêm Thiết Bị SIM Mới</h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên SIM */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Tên định danh SIM *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: SIM CSKH HN 01"
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* SĐT */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="Ví dụ: 0987654321"
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Nhà mạng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nhà mạng</label>
                  <select
                    value={formCarrier}
                    onChange={(e) => setFormCarrier(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Viettel">Viettel</option>
                    <option value="Vinaphone">Vinaphone</option>
                    <option value="Mobifone">Mobifone</option>
                    <option value="Vietnamobile">Vietnamobile</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Nhân sự */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nhân sự phụ trách</label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Chưa bàn giao</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.status === 'active' ? 'Đang làm' : 'Đã nghỉ'})</option>
                    ))}
                  </select>
                </div>

                {/* Loại dòng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Loại SIM</label>
                  <select
                    value={formLineType}
                    onChange={(e) => setFormLineType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Physical">SIM Vật lý</option>
                    <option value="eSIM">eSIM</option>
                  </select>
                </div>

                {/* Độ quan trọng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Mức độ quan trọng</label>
                  <select
                    value={formImportance}
                    onChange={(e) => setFormImportance(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="critical">Rất quan trọng</option>
                  </select>
                </div>

                {/* Ngày kích hoạt */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Ngày kích hoạt</label>
                  <input
                    type="date"
                    value={formActivationDate}
                    onChange={(e) => setFormActivationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Chu kỳ nạp tiền */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Chu kỳ gia hạn (ngày)</label>
                  <input
                    type="number"
                    value={formCycleDays}
                    onChange={(e) => setFormCycleDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Phần chính chủ */}
              {isOwner && (
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Thông tin chính chủ đăng ký</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-gray-500 block">Tên chính chủ</label>
                      <input
                        type="text"
                        value={formRegisteredName}
                        onChange={(e) => setFormRegisteredName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-gray-500 block">Số CCCD / Hộ chiếu</label>
                      <input
                        type="text"
                        value={formRegisteredId}
                        onChange={(e) => setFormRegisteredId(e.target.value)}
                        placeholder="0123456789"
                        className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-gray-500 block">Ngày đăng ký</label>
                      <input
                        type="date"
                        value={formRegisteredAt}
                        onChange={(e) => setFormRegisteredAt(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  {isPending ? 'Đang lưu...' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sửa SIM */}
      {isEditOpen && selectedSim && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setIsEditOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-base text-white">Sửa Thiết Bị SIM</h3>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên SIM */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Tên định danh SIM *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* SĐT */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Nhà mạng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nhà mạng</label>
                  <select
                    value={formCarrier}
                    onChange={(e) => setFormCarrier(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Viettel">Viettel</option>
                    <option value="Vinaphone">Vinaphone</option>
                    <option value="Mobifone">Mobifone</option>
                    <option value="Vietnamobile">Vietnamobile</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Nhân sự */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Nhân sự phụ trách</label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Chưa bàn giao</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.status === 'active' ? 'Đang làm' : 'Đã nghỉ'})</option>
                    ))}
                  </select>
                </div>

                {/* Loại dòng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Loại SIM</label>
                  <select
                    value={formLineType}
                    onChange={(e) => setFormLineType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Physical">SIM Vật lý</option>
                    <option value="eSIM">eSIM</option>
                  </select>
                </div>

                {/* Độ quan trọng */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Mức độ quan trọng</label>
                  <select
                    value={formImportance}
                    onChange={(e) => setFormImportance(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="critical">Rất quan trọng</option>
                  </select>
                </div>

                {/* Ngày kích hoạt */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Ngày kích hoạt</label>
                  <input
                    type="date"
                    value={formActivationDate}
                    onChange={(e) => setFormActivationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Chu kỳ nạp tiền */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Chu kỳ gia hạn (ngày)</label>
                  <input
                    type="number"
                    value={formCycleDays}
                    onChange={(e) => setFormCycleDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Phần chính chủ */}
              {isOwner && (
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Thông tin chính chủ đăng ký</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-gray-500 block">Tên chính chủ</label>
                      <input
                        type="text"
                        value={formRegisteredName}
                        onChange={(e) => setFormRegisteredName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-gray-500 block">CCCD / Hộ chiếu</label>
                      <input
                        type="text"
                        value={formRegisteredId}
                        onChange={(e) => setFormRegisteredId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-gray-500 block">Ngày đăng ký</label>
                      <input
                        type="date"
                        value={formRegisteredAt}
                        onChange={(e) => setFormRegisteredAt(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

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

      {/* MODAL: Import CSV */}
      {isImportOpen && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setIsImportOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                Nhập Kho SIM Bằng CSV
              </h3>
              <button 
                onClick={() => setIsImportOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-1 text-gray-400">
                  <p className="font-bold text-white flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-orange-400" />
                    Hướng dẫn định dạng CSV:
                  </p>
                  <p>Dòng đầu tiên phải là tiêu đề cột. Chấp nhận các cột:</p>
                  <p className="font-mono text-gray-300 text-[10px] bg-black/30 p-1.5 rounded">
                    name, value, carrier
                  </p>
                  <p>Ví dụ copy-paste:</p>
                  <pre className="font-mono text-gray-300 text-[9px] bg-black/30 p-1.5 rounded whitespace-pre-wrap">
                    name, value, carrier{"\n"}
                    SIM Hotline 01, 0988112233, Viettel{"\n"}
                    SIM Marketing 02, 0909223344, Mobifone
                  </pre>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500">Hoặc sử dụng file mẫu chuẩn:</span>
                    <button
                      type="button"
                      onClick={downloadSampleCSV}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      📥 Tải file mẫu CSV
                    </button>
                  </div>
                </div>

                <label className="text-gray-400 font-semibold block mt-3">Dán nội dung CSV vào đây *</label>
                <textarea
                  required
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="name, value, carrier&#10;SIM Marketing 01, 0912345678, Vinaphone"
                  className="w-full p-3 bg-gray-950 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500 placeholder-gray-600"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending || !csvText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Đang nhập...' : 'Nhập Kho SIM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
