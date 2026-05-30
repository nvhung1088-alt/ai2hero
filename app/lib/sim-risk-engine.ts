import type { SimAsset, SimEmployee, SimLinkedAccount } from './db/schema';

export interface RiskFactor {
  label: string;
  points: number;
  type: 'critical' | 'high' | 'watch' | 'info';
}

export interface RiskResult {
  score: number;
  factors: RiskFactor[];
}

export function calculateRiskScore(
  asset: SimAsset,
  helpers?: {
    getEmployee?: (id: number) => SimEmployee | undefined;
    getLinkedAccountsForAsset?: (id: number) => SimLinkedAccount[];
  }
): RiskResult {
  let score = 0;
  const factors: RiskFactor[] = [];
  const now = new Date();

  const getEmployee = helpers?.getEmployee;
  const getLinkedAccountsForAsset = helpers?.getLinkedAccountsForAsset;

  // 1. Số không hợp lệ (numverifyValid === 0 hoặc false)
  if (asset.numverifyValid === 0) {
    score += 40;
    factors.push({ label: 'Số không hợp lệ (Numverify)', points: 40, type: 'critical' });
  }

  // 2. Không rõ người giữ SIM
  if (!asset.ownerEmployeeId) {
    score += 30;
    factors.push({ label: 'Chưa xác định người phụ trách', points: 30, type: 'high' });
  }

  // 3. Nhân viên đã nghỉ việc còn giữ quyền
  if (asset.ownerEmployeeId && getEmployee) {
    const employee = getEmployee(asset.ownerEmployeeId);
    if (employee && employee.status === 'inactive') {
      score += 40;
      factors.push({ label: `NV ${employee.name} đã nghỉ việc`, points: 40, type: 'critical' });
    }
  }

  // 4. SIM gắn tài khoản quan trọng
  const linked = getLinkedAccountsForAsset ? getLinkedAccountsForAsset(asset.id) : [];
  const hasCriticalAccount = linked.some(
    la => la.importanceLevel === 'critical' || la.importanceLevel === 'high'
  );
  if (hasCriticalAccount) {
    const criticalCount = linked.filter(la => la.importanceLevel === 'critical' || la.importanceLevel === 'high').length;
    score += 30;
    factors.push({ label: `${criticalCount} tài khoản quan trọng liên kết`, points: 30, type: 'high' });
  }

  // 5. Không có email/số backup
  const hasNoBackup = linked.some(la => !la.backupEmail && !la.backupPhoneAssetId);
  if (linked.length > 0 && hasNoBackup) {
    score += 25;
    factors.push({ label: 'Tài khoản thiếu backup', points: 25, type: 'high' });
  }

  // 6. Lâu chưa kiểm tra
  if (asset.lastCheckedAt) {
    const lastCheck = new Date(asset.lastCheckedAt);
    const daysSince = Math.floor((now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 60) {
      score += 35;
      factors.push({ label: `${daysSince} ngày chưa kiểm tra`, points: 35, type: 'critical' });
    } else if (daysSince > 30) {
      score += 20;
      factors.push({ label: `${daysSince} ngày chưa kiểm tra`, points: 20, type: 'watch' });
    }
  } else {
    // SIM chưa TỪNG được kiểm tra = rủi ro cao nhất
    score += 35;
    factors.push({ label: 'Chưa kiểm tra lần nào', points: 35, type: 'critical' });
  }

  return {
    score: Math.min(score, 100),
    factors
  };
}

export function getRiskLevel(score: number): 'safe' | 'watch' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'watch';
  return 'safe';
}

export function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (score >= 60) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  if (score >= 30) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
}

export function getRiskText(score: number): string {
  if (score >= 80) return 'Nguy cấp';
  if (score >= 60) return 'Rủi ro cao';
  if (score >= 30) return 'Cần theo dõi';
  return 'An toàn';
}

export function getRiskLabel(level: 'safe' | 'watch' | 'high' | 'critical'): string {
  const map = {
    safe: 'An toàn',
    watch: 'Theo dõi',
    high: 'Nguy cơ cao',
    critical: 'Cần xử lý ngay'
  };
  return map[level] || level;
}

export function daysSinceCheck(date: Date | string | null): number {
  if (!date) return 999;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 999;
  return Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
