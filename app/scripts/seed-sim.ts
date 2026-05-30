import { db } from '../lib/db/drizzle';
import {
  teams,
  users,
  simEmployees,
  simAssets,
  simPlatforms,
  simLinkedAccounts,
  simRiskEvents,
  simCheckLogs
} from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function seedSim() {
  console.log('--- START SIM SEEDING ---');

  // 1. Lấy team mặc định (thường teamId = 1 của Test Team)
  const defaultTeam = await db.select().from(teams).where(eq(teams.name, 'Test Team')).limit(1);
  if (defaultTeam.length === 0) {
    console.error('Không tìm thấy Test Team. Vui lòng chạy db:seed trước!');
    process.exit(1);
  }
  const teamId = defaultTeam[0].id;
  console.log(`Using Team ID: ${teamId}`);

  // Lấy user test mặc định làm resolver/checker (thường userId = 1)
  const defaultUser = await db.select().from(users).where(eq(users.email, 'test@test.com')).limit(1);
  const userId = defaultUser.length > 0 ? defaultUser[0].id : null;
  console.log(`Using User ID for checks: ${userId}`);

  // Xóa dữ liệu cũ của SIM module để tránh trùng lặp khi chạy lại seed
  await db.delete(simCheckLogs).where(eq(simCheckLogs.teamId, teamId));
  await db.delete(simRiskEvents).where(eq(simRiskEvents.teamId, teamId));
  await db.delete(simLinkedAccounts).where(eq(simLinkedAccounts.teamId, teamId));
  await db.delete(simAssets).where(eq(simAssets.teamId, teamId));
  await db.delete(simEmployees).where(eq(simEmployees.teamId, teamId));
  await db.delete(simPlatforms).where(eq(simPlatforms.teamId, teamId));
  console.log('Cleared existing SIM module data.');

  // 2. Seed Platforms
  const rawPlatforms = [
    { key: 'facebook', label: 'Facebook', icon: '🌐', color: '#1877F2', isDefault: 1 },
    { key: 'google', label: 'Google/YouTube', icon: '📩', color: '#EA4335', isDefault: 1 },
    { key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#000000', isDefault: 1 },
    { key: 'shopee', label: 'Shopee', icon: '🛍️', color: '#EE4D2D', isDefault: 1 },
    { key: 'lazada', label: 'Lazada', icon: '💜', color: '#1010CD', isDefault: 1 },
    { key: 'zalo', label: 'Zalo', icon: '💬', color: '#0068FF', isDefault: 1 },
    { key: 'bank', label: 'Ngân hàng', icon: '🏦', color: '#10B981', isDefault: 1 },
    { key: 'email', label: 'Email doanh nghiệp', icon: '📧', color: '#F59E0B', isDefault: 1 },
    { key: 'telegram', label: 'Telegram', icon: '✈️', color: '#229ED9', isDefault: 0 },
    { key: 'viber', label: 'Viber', icon: '💜', color: '#7360F2', isDefault: 0 },
    { key: 'chatwork', label: 'Chatwork', icon: '💼', color: '#E03C3C', isDefault: 0 },
    { key: 'skype', label: 'Skype', icon: '📞', color: '#00AFF0', isDefault: 0 },
    { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', isDefault: 0 },
    { key: 'other', label: 'Khác', icon: '🔗', color: '#6B7280', isDefault: 1 }
  ];

  console.log('Seeding platforms...');
  await db.insert(simPlatforms).values(
    rawPlatforms.map(p => ({
      teamId,
      key: p.key,
      label: p.label,
      icon: p.icon,
      color: p.color,
      isDefault: p.isDefault
    }))
  );

  // 3. Seed Employees
  const rawEmployees = [
    { oldId: 'e1', name: 'Nguyễn Văn An', phone: '0901000001', email: 'an@company.vn', department: 'Marketing', status: 'active', leftAt: null },
    { oldId: 'e2', name: 'Trần Thị Bình', phone: '0901000002', email: 'binh@company.vn', department: 'Sales', status: 'active', leftAt: null },
    { oldId: 'e3', name: 'Lê Hoàng Cường', phone: '0901000003', email: 'cuong@company.vn', department: 'Operations', status: 'active', leftAt: null },
    { oldId: 'e4', name: 'Phạm Minh Duy', phone: '0901000004', email: 'duy@company.vn', department: 'Marketing', status: 'inactive', leftAt: new Date('2026-03-15') },
    { oldId: 'e5', name: 'Hoàng Thị Em', phone: '0901000005', email: 'em@company.vn', department: 'Sales', status: 'active', leftAt: null },
    { oldId: 'e6', name: 'Võ Đức Phúc', phone: '0901000006', email: 'phuc@company.vn', department: 'IT', status: 'active', leftAt: null },
    { oldId: 'e7', name: 'Đặng Quốc Giang', phone: '0901000007', email: 'giang@company.vn', department: 'Operations', status: 'inactive', leftAt: new Date('2026-01-20') },
    { oldId: 'e8', name: 'Bùi Thanh Hà', phone: '0901000008', email: 'ha@company.vn', department: 'Sales', status: 'active', leftAt: null }
  ];

  console.log('Seeding employees...');
  const employeeIdMap = new Map<string, number>();
  for (const emp of rawEmployees) {
    const [inserted] = await db.insert(simEmployees).values({
      teamId,
      name: emp.name,
      phone: emp.phone,
      email: emp.email,
      department: emp.department,
      status: emp.status,
      leftAt: emp.leftAt
    }).returning();
    employeeIdMap.set(emp.oldId, inserted.id);
  }

  // 4. Seed SIM Assets
  const rawAssets = [
    { oldId: 'a1', name: 'SIM Marketing chính', value: '0901234567', importanceLevel: 'critical', ownerEmployeeId: 'e1', status: 'active', riskScore: 25, lastCheckedAt: new Date('2026-05-20T08:00:00Z'), activationDate: new Date('2024-06-15'), carrier: 'Viettel', lineType: 'mobile', numverifyValid: 1, registeredName: 'Công ty TNHH ABC', registeredId: '0101234567', registeredAt: new Date('2024-06-15'), topupCycleDays: 90, lastTopupAt: new Date('2026-04-15'), renewalDate: new Date('2026-07-14') },
    { oldId: 'a2', name: 'Hotline Sales', value: '0912345678', importanceLevel: 'critical', ownerEmployeeId: 'e2', status: 'active', riskScore: 15, lastCheckedAt: new Date('2026-05-18T10:00:00Z'), activationDate: new Date('2023-01-10'), carrier: 'Mobifone', lineType: 'mobile', numverifyValid: 1, registeredName: 'Công ty TNHH ABC', registeredId: '0101234567', registeredAt: new Date('2023-01-10'), topupCycleDays: 30, lastTopupAt: new Date('2026-05-10'), renewalDate: new Date('2026-06-09') },
    { oldId: 'a3', name: 'SIM Ads backup', value: '0933456789', importanceLevel: 'high', ownerEmployeeId: 'e4', status: 'active', riskScore: 85, lastCheckedAt: new Date('2026-03-10T09:00:00Z'), activationDate: new Date('2024-11-20'), carrier: 'Vinaphone', lineType: 'mobile', numverifyValid: 1, registeredName: 'Phạm Minh Duy', registeredId: '079123456789', registeredAt: new Date('2024-11-20'), topupCycleDays: 180, lastTopupAt: new Date('2026-01-05'), renewalDate: new Date('2026-07-04') },
    { oldId: 'a4', name: 'SIM Zalo OA', value: '0944567890', importanceLevel: 'high', ownerEmployeeId: null, status: 'active', riskScore: 72, lastCheckedAt: new Date('2026-04-01T14:00:00Z'), activationDate: new Date('2025-02-28'), carrier: 'Vietnamobile', lineType: 'mobile', numverifyValid: 1, registeredName: null, registeredId: null, registeredAt: new Date('2025-02-28'), topupCycleDays: 30, lastTopupAt: new Date('2026-04-20'), renewalDate: new Date('2026-05-20') },
    { oldId: 'a5', name: 'SIM cá nhân cũ', value: '0551234567', importanceLevel: 'low', ownerEmployeeId: 'e7', status: 'active', riskScore: 90, lastCheckedAt: new Date('2026-01-15T11:00:00Z'), activationDate: new Date('2022-05-10'), carrier: 'Wintel', lineType: 'mobile', numverifyValid: 0, registeredName: 'Đặng Quốc Giang', registeredId: '068987654321', registeredAt: new Date('2022-05-10'), topupCycleDays: 90, lastTopupAt: new Date('2025-11-01'), renewalDate: new Date('2026-01-30') },
    { oldId: 'a6', name: 'SIM TikTok Shop', value: '0891234567', importanceLevel: 'high', ownerEmployeeId: 'e3', status: 'active', riskScore: 35, lastCheckedAt: new Date('2026-05-10T16:00:00Z'), activationDate: new Date('2025-08-01'), carrier: 'Mobifone', lineType: 'mobile', numverifyValid: 1, registeredName: 'Công ty TNHH ABC', registeredId: '0101234567', registeredAt: new Date('2025-08-01'), topupCycleDays: 30, lastTopupAt: new Date('2026-05-05'), renewalDate: new Date('2026-06-04') },
    { oldId: 'a7', name: 'SIM ngân hàng', value: '0961234567', importanceLevel: 'critical', ownerEmployeeId: 'e6', status: 'active', riskScore: 20, lastCheckedAt: new Date('2026-05-22T07:00:00Z'), activationDate: new Date('2021-03-01'), carrier: 'Viettel', lineType: 'mobile', numverifyValid: 1, registeredName: 'Công ty TNHH ABC', registeredId: '0101234567', registeredAt: new Date('2021-03-01'), topupCycleDays: 90, lastTopupAt: new Date('2026-05-01'), renewalDate: new Date('2026-07-30') },
    { oldId: 'a8', name: 'SIM Shopee chính', value: '0941234567', importanceLevel: 'high', ownerEmployeeId: 'e5', status: 'active', riskScore: 45, lastCheckedAt: new Date('2026-04-25T09:30:00Z'), activationDate: new Date('2024-09-15'), carrier: 'Vinaphone', lineType: 'mobile', numverifyValid: 1, registeredName: 'Hoàng Thị Em', registeredId: '054111222333', registeredAt: new Date('2024-09-15'), topupCycleDays: 30, lastTopupAt: new Date('2026-05-12',), renewalDate: new Date('2026-06-11') },
    { oldId: 'a9', name: 'SIM dự phòng 1', value: '0921234567', importanceLevel: 'medium', ownerEmployeeId: null, status: 'active', riskScore: 60, lastCheckedAt: new Date('2026-03-28T13:00:00Z'), activationDate: new Date('2025-04-10'), carrier: 'Vietnamobile', lineType: 'mobile', numverifyValid: 1, registeredName: null, registeredId: null, registeredAt: new Date('2025-04-10'), topupCycleDays: 30, lastTopupAt: new Date('2026-03-15'), renewalDate: new Date('2026-04-14') },
    { oldId: 'a10', name: 'SIM Facebook BM', value: '0981234567', importanceLevel: 'critical', ownerEmployeeId: 'e1', status: 'active', riskScore: 40, lastCheckedAt: new Date('2026-05-05T08:00:00Z'), activationDate: new Date('2023-07-20'), carrier: 'Viettel', lineType: 'mobile', numverifyValid: 1, registeredName: 'Nguyễn Văn An', registeredId: '012345678901', registeredAt: new Date('2023-07-20'), topupCycleDays: 90, lastTopupAt: new Date('2026-04-01'), renewalDate: new Date('2026-06-30') },
    { oldId: 'a11', name: 'SIM OTP nội bộ', value: '0701234567', importanceLevel: 'medium', ownerEmployeeId: 'e6', status: 'active', riskScore: 30, lastCheckedAt: new Date('2026-05-15T10:00:00Z'), activationDate: new Date('2025-01-05'), carrier: 'Mobifone', lineType: 'mobile', numverifyValid: 1, registeredName: 'Công ty TNHH ABC', registeredId: '0101234567', registeredAt: new Date('2025-01-05'), topupCycleDays: 30, lastTopupAt: new Date('2026-05-10'), renewalDate: new Date('2026-06-09') },
    { oldId: 'a12', name: 'SIM quảng cáo 2', value: '0321234567', importanceLevel: 'medium', ownerEmployeeId: 'e4', status: 'active', riskScore: 75, lastCheckedAt: new Date('2026-02-20T09:00:00Z'), activationDate: new Date('2024-12-01'), carrier: 'Viettel', lineType: 'mobile', numverifyValid: 1, registeredName: 'Phạm Minh Duy', registeredId: '079123456789', registeredAt: new Date('2024-12-01'), topupCycleDays: 90, lastTopupAt: new Date('2026-02-01'), renewalDate: new Date('2026-05-02') },
    { oldId: 'a13', name: 'SIM kiểm thử', value: '0561234567', importanceLevel: 'low', ownerEmployeeId: 'e3', status: 'inactive', riskScore: 10, lastCheckedAt: new Date('2026-05-01T12:00:00Z'), activationDate: new Date('2025-06-15'), carrier: 'Vietnamobile', lineType: 'mobile', numverifyValid: 1, registeredName: 'Lê Hoàng Cường', registeredId: '038999888777', registeredAt: new Date('2025-06-15'), topupCycleDays: 30, lastTopupAt: new Date('2026-04-28'), renewalDate: new Date('2026-05-28') },
    { oldId: 'a14', name: 'SIM domain hosting', value: '0881234567', importanceLevel: 'high', ownerEmployeeId: 'e6', status: 'active', riskScore: 55, lastCheckedAt: new Date('2026-04-10T15:00:00Z'), activationDate: new Date('2022-11-25'), carrier: 'Vinaphone', lineType: 'mobile', numverifyValid: 1, registeredName: 'Công ty TNHH ABC', registeredId: '0101234567', registeredAt: new Date('2022-11-25'), topupCycleDays: 180, lastTopupAt: new Date('2026-03-01'), renewalDate: new Date('2026-08-28') },
    { oldId: 'a15', name: 'SIM Grab/Gojek', value: '0771234567', importanceLevel: 'low', ownerEmployeeId: 'e8', status: 'active', riskScore: 20, lastCheckedAt: new Date('2026-05-19T11:00:00Z'), activationDate: new Date('2025-10-01'), carrier: 'Mobifone', lineType: 'mobile', numverifyValid: 1, registeredName: 'Bùi Thanh Hà', registeredId: '025444555666', registeredAt: new Date('2025-10-01'), topupCycleDays: 30, lastTopupAt: new Date('2026-05-18'), renewalDate: new Date('2026-06-17') }
  ];

  console.log('Seeding SIM assets...');
  const assetIdMap = new Map<string, number>();
  for (const ast of rawAssets) {
    const ownerId = ast.ownerEmployeeId ? employeeIdMap.get(ast.ownerEmployeeId) : null;
    const [inserted] = await db.insert(simAssets).values({
      teamId,
      name: ast.name,
      value: ast.value,
      importanceLevel: ast.importanceLevel,
      ownerEmployeeId: ownerId,
      status: ast.status,
      riskScore: ast.riskScore,
      lastCheckedAt: ast.lastCheckedAt,
      activationDate: ast.activationDate,
      carrier: ast.carrier,
      lineType: ast.lineType,
      numverifyValid: ast.numverifyValid,
      registeredName: ast.registeredName,
      registeredId: ast.registeredId,
      registeredAt: ast.registeredAt,
      topupCycleDays: ast.topupCycleDays,
      lastTopupAt: ast.lastTopupAt,
      renewalDate: ast.renewalDate
    }).returning();
    assetIdMap.set(ast.oldId, inserted.id);
  }

  // 5. Seed Linked Accounts
  const rawAccounts = [
    // === SIM a1: 5 TK ===
    { oldId: 'la1', platformKey: 'facebook', accountName: 'Shop ABC - FB Page', loginUrl: 'https://business.facebook.com', username: 'shop_abc_admin', notes: 'TK chính chạy ads', loginEmail: 'shop@gmail.com', linkedPhoneAssetId: 'a1', backupEmail: 'backup@gmail.com', backupPhoneAssetId: 'a10', ownerEmployeeId: 'e1', importanceLevel: 'critical', status: 'active' },
    { oldId: 'la13', platformKey: 'facebook', accountName: 'FB Page Khuyến Mãi', loginUrl: null, username: null, notes: null, loginEmail: 'promo@gmail.com', linkedPhoneAssetId: 'a1', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e1', importanceLevel: 'high', status: 'active' },
    { oldId: 'la14', platformKey: 'google', accountName: 'Kênh Review Shop ABC', loginUrl: null, username: null, notes: null, loginEmail: 'shop@gmail.com', linkedPhoneAssetId: 'a1', backupEmail: 'backup@gmail.com', backupPhoneAssetId: null, ownerEmployeeId: 'e1', importanceLevel: 'high', status: 'active' },
    { oldId: 'la15', platformKey: 'google', accountName: 'Kênh Hướng dẫn SP', loginUrl: null, username: null, notes: null, loginEmail: 'guide@gmail.com', linkedPhoneAssetId: 'a1', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e1', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la16', platformKey: 'email', accountName: 'marketing@shopabc.vn', loginUrl: null, username: null, notes: null, loginEmail: 'marketing@shopabc.vn', linkedPhoneAssetId: 'a1', backupEmail: 'backup@gmail.com', backupPhoneAssetId: 'a10', ownerEmployeeId: 'e1', importanceLevel: 'high', status: 'active' },

    // === SIM a2: 2 TK ===
    { oldId: 'la11', platformKey: 'bank', accountName: 'MB Bank - Lương NV', loginUrl: 'https://online.mbbank.com.vn', username: 'mbbank_hr', notes: 'Thẻ trả lương', loginEmail: null, linkedPhoneAssetId: 'a2', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e2', importanceLevel: 'high', status: 'active' },
    { oldId: 'la17', platformKey: 'zalo', accountName: 'Zalo Sales Bình', loginUrl: null, username: 'zalo_binh', notes: null, loginEmail: null, linkedPhoneAssetId: 'a2', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e2', importanceLevel: 'medium', status: 'active' },

    // === SIM a3: 3 TK ===
    { oldId: 'la8', platformKey: 'facebook', accountName: 'FB Ads Account cũ', loginUrl: null, username: null, notes: null, loginEmail: 'old@gmail.com', linkedPhoneAssetId: 'a3', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e4', importanceLevel: 'high', status: 'active' },
    { oldId: 'la18', platformKey: 'facebook', accountName: 'FB Page Cũ #2', loginUrl: null, username: null, notes: null, loginEmail: 'old2@gmail.com', linkedPhoneAssetId: 'a3', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e4', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la19', platformKey: 'tiktok', accountName: 'TikTok Ads cũ', loginUrl: null, username: null, notes: null, loginEmail: 'oldtt@gmail.com', linkedPhoneAssetId: 'a3', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e4', importanceLevel: 'medium', status: 'active' },

    // === SIM a4: 2 TK ===
    { oldId: 'la3', platformKey: 'zalo', accountName: 'Zalo OA Shop ABC', loginUrl: null, username: null, notes: null, loginEmail: null, linkedPhoneAssetId: 'a4', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: null, importanceLevel: 'high', status: 'active' },
    { oldId: 'la20', platformKey: 'zalo', accountName: 'Zalo OA Chi nhánh 2', loginUrl: null, username: null, notes: null, loginEmail: null, linkedPhoneAssetId: 'a4', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: null, importanceLevel: 'medium', status: 'active' },

    // === SIM a5: 2 TK ===
    { oldId: 'la9', platformKey: 'zalo', accountName: 'Zalo cá nhân Giang', loginUrl: null, username: 'zalo_giang', notes: null, loginEmail: null, linkedPhoneAssetId: 'a5', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e7', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la21', platformKey: 'facebook', accountName: 'FB cá nhân Giang', loginUrl: null, username: 'giang_fb', notes: null, loginEmail: 'giang.personal@gmail.com', linkedPhoneAssetId: 'a5', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e7', importanceLevel: 'low', status: 'active' },

    // === SIM a6: 6 TK ===
    { oldId: 'la5', platformKey: 'tiktok', accountName: 'TikTok Shop ABC', loginUrl: null, username: null, notes: null, loginEmail: 'tiktok@gmail.com', linkedPhoneAssetId: 'a6', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e3', importanceLevel: 'high', status: 'active' },
    { oldId: 'la12', platformKey: 'tiktok', accountName: 'TikTok Ads Manager', loginUrl: null, username: null, notes: null, loginEmail: 'ttads@gmail.com', linkedPhoneAssetId: 'a6', backupEmail: 'backup@gmail.com', backupPhoneAssetId: 'a11', ownerEmployeeId: 'e3', importanceLevel: 'high', status: 'active' },
    { oldId: 'la22', platformKey: 'tiktok', accountName: 'TikTok Kênh Review', loginUrl: null, username: null, notes: null, loginEmail: 'ttreview@gmail.com', linkedPhoneAssetId: 'a6', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e3', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la23', platformKey: 'google', accountName: 'YouTube Unbox SP', loginUrl: null, username: null, notes: null, loginEmail: 'ytunbox@gmail.com', linkedPhoneAssetId: 'a6', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e3', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la24', platformKey: 'google', accountName: 'YouTube Livestream', loginUrl: null, username: null, notes: null, loginEmail: 'ytlive@gmail.com', linkedPhoneAssetId: 'a6', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e3', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la25', platformKey: 'facebook', accountName: 'FB Livestream Bán Hàng', loginUrl: null, username: null, notes: null, loginEmail: 'fblive@gmail.com', linkedPhoneAssetId: 'a6', backupEmail: 'backup@gmail.com', backupPhoneAssetId: null, ownerEmployeeId: 'e3', importanceLevel: 'high', status: 'active' },

    // === SIM a7: 3 TK ===
    { oldId: 'la6', platformKey: 'email', accountName: 'info@shopabc.vn', loginUrl: null, username: null, notes: null, loginEmail: 'info@shopabc.vn', linkedPhoneAssetId: 'a7', backupEmail: 'admin@shopabc.vn', backupPhoneAssetId: 'a11', ownerEmployeeId: 'e6', importanceLevel: 'critical', status: 'active' },
    { oldId: 'la7', platformKey: 'bank', accountName: 'VCB - TK Doanh nghiệp', loginUrl: null, username: 'vcb_corp', notes: null, loginEmail: null, linkedPhoneAssetId: 'a7', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e6', importanceLevel: 'critical', status: 'active' },
    { oldId: 'la26', platformKey: 'bank', accountName: 'Techcombank - TK Phụ', loginUrl: null, username: 'tcb_sub', notes: null, loginEmail: null, linkedPhoneAssetId: 'a7', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e6', importanceLevel: 'high', status: 'active' },

    // === SIM a8: 3 TK ===
    { oldId: 'la4', platformKey: 'shopee', accountName: 'ShopABC_Official', loginUrl: null, username: null, notes: null, loginEmail: 'shopee@gmail.com', linkedPhoneAssetId: 'a8', backupEmail: 'backup@gmail.com', backupPhoneAssetId: null, ownerEmployeeId: 'e5', importanceLevel: 'high', status: 'active' },
    { oldId: 'la27', platformKey: 'shopee', accountName: 'ShopABC_Outlet', loginUrl: null, username: null, notes: null, loginEmail: 'outlet@gmail.com', linkedPhoneAssetId: 'a8', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e5', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la28', platformKey: 'lazada', accountName: 'Lazada Shop ABC', loginUrl: null, username: null, notes: null, loginEmail: 'lazada@gmail.com', linkedPhoneAssetId: 'a8', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e5', importanceLevel: 'high', status: 'active' },

    // === SIM a10: 4 TK ===
    { oldId: 'la2', platformKey: 'facebook', accountName: 'Business Manager #2', loginUrl: null, username: 'bm2_admin', notes: null, loginEmail: 'bm2@gmail.com', linkedPhoneAssetId: 'a10', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e1', importanceLevel: 'critical', status: 'active' },
    { oldId: 'la29', platformKey: 'facebook', accountName: 'FB Pixel Account', loginUrl: null, username: 'pixel_admin', notes: null, loginEmail: 'pixel@gmail.com', linkedPhoneAssetId: 'a10', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e1', importanceLevel: 'high', status: 'active' },
    { oldId: 'la30', platformKey: 'instagram', accountName: 'IG Shop ABC Official', loginUrl: null, username: 'shopabc_ig', notes: null, loginEmail: 'shop@gmail.com', linkedPhoneAssetId: 'a10', backupEmail: 'backup@gmail.com', backupPhoneAssetId: null, ownerEmployeeId: 'e1', importanceLevel: 'high', status: 'active' },
    { oldId: 'la31', platformKey: 'instagram', accountName: 'IG Shop ABC KOL', loginUrl: null, username: 'kol_ig', notes: null, loginEmail: 'kol@gmail.com', linkedPhoneAssetId: 'a10', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e1', importanceLevel: 'medium', status: 'active' },

    // === SIM a12: 2 TK ===
    { oldId: 'la10', platformKey: 'shopee', accountName: 'ShopABC_Store2', loginUrl: null, username: 'store2_shopee', notes: null, loginEmail: 'store2@gmail.com', linkedPhoneAssetId: 'a12', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e4', importanceLevel: 'medium', status: 'active' },
    { oldId: 'la32', platformKey: 'facebook', accountName: 'FB Ads Retarget', loginUrl: null, username: 'retarget_fb', notes: null, loginEmail: 'retarget@gmail.com', linkedPhoneAssetId: 'a12', backupEmail: null, backupPhoneAssetId: null, ownerEmployeeId: 'e4', importanceLevel: 'medium', status: 'active' }
  ];

  console.log('Seeding linked accounts...');
  for (const acc of rawAccounts) {
    const linkedPhoneAssetId = assetIdMap.get(acc.linkedPhoneAssetId)!;
    const backupPhoneAssetId = acc.backupPhoneAssetId ? assetIdMap.get(acc.backupPhoneAssetId) : null;
    const ownerEmployeeId = acc.ownerEmployeeId ? employeeIdMap.get(acc.ownerEmployeeId) : null;

    await db.insert(simLinkedAccounts).values({
      teamId,
      platformKey: acc.platformKey,
      accountName: acc.accountName,
      loginUrl: acc.loginUrl,
      username: acc.username,
      encryptedPassword: null, // Sẽ điền sau hoặc mock bằng null
      notes: acc.notes,
      loginEmail: acc.loginEmail,
      linkedPhoneAssetId,
      backupEmail: acc.backupEmail,
      backupPhoneAssetId,
      ownerEmployeeId,
      importanceLevel: acc.importanceLevel,
      status: acc.status
    });
  }

  // 6. Seed Risk Events
  const rawRiskEvents = [
    { assetId: 'a3', riskType: 'inactive_employee', riskLevel: 'critical', message: 'NV Phạm Minh Duy đã nghỉ việc nhưng vẫn đang giữ SIM 0933456789 liên kết FB Ads' },
    { assetId: 'a4', riskType: 'no_owner', riskLevel: 'high', message: 'SIM Zalo OA 0944567890 chưa xác định người phụ trách' },
    { assetId: 'a5', riskType: 'invalid_number', riskLevel: 'critical', message: 'SIM 0551234567 không hợp lệ — NV cũ Đặng Quốc Giang đang giữ' },
    { assetId: 'a12', riskType: 'inactive_employee', riskLevel: 'high', message: 'SIM quảng cáo 0321234567 vẫn do NV đã nghỉ quản lý' },
    { assetId: 'a9', riskType: 'no_owner', riskLevel: 'high', message: 'SIM dự phòng 0921234567 không có người phụ trách, đã 58 ngày chưa kiểm tra' },
    { assetId: 'a10', riskType: 'missing_backup', riskLevel: 'high', message: 'Facebook BM #2 liên kết SIM 0981234567 — không có backup' },
    { assetId: 'a14', riskType: 'overdue_check', riskLevel: 'medium', message: 'SIM domain hosting 0881234567 đã 45 ngày chưa kiểm tra' },
    { assetId: 'a5', riskType: 'inactive_employee', riskLevel: 'critical', message: 'NV Đặng Quốc Giang đã nghỉ 4 tháng, vẫn giữ Zalo + SIM 0551234567' },
    { assetId: 'a4', riskType: 'topup_overdue', riskLevel: 'high', message: 'SIM Zalo OA 0944567890 đã quá hạn nạp tiền — có thể bị khóa 1 chiều' },
    { assetId: 'a12', riskType: 'renewal_expired', riskLevel: 'critical', message: 'SIM quảng cáo 0321234567 đã quá ngày gia hạn (02/05/2025) — nguy cơ bị thu hồi số' }
  ];

  console.log('Seeding risk events...');
  for (const re of rawRiskEvents) {
    const assetId = assetIdMap.get(re.assetId)!;
    await db.insert(simRiskEvents).values({
      teamId,
      assetId,
      riskType: re.riskType,
      riskLevel: re.riskLevel,
      message: re.message,
      resolved: 0
    });
  }

  // 7. Seed Check Logs
  const rawCheckLogs = [
    { assetId: 'a1', checkedBy: 'e1', checkedAt: new Date('2026-05-20T08:00:00Z'), checkType: 'manual', riskScoreBefore: 35, riskScoreAfter: 25, notes: 'Đã xác nhận SIM hoạt động, FB page OK', statusAfter: 'safe' },
    { assetId: 'a2', checkedBy: 'e2', checkedAt: new Date('2026-05-18T10:00:00Z'), checkType: 'api', riskScoreBefore: 20, riskScoreAfter: 15, notes: 'Numverify confirm valid, carrier Mobifone đúng', statusAfter: 'safe' },
    { assetId: 'a7', checkedBy: 'e6', checkedAt: new Date('2026-05-22T07:00:00Z'), checkType: 'manual', riskScoreBefore: 25, riskScoreAfter: 20, notes: 'SIM ngân hàng OK, VCB app đăng nhập bình thường', statusAfter: 'safe' },
    { assetId: 'a3', checkedBy: 'e1', checkedAt: new Date('2026-03-10T09:00:00Z'), checkType: 'api', riskScoreBefore: 60, riskScoreAfter: 85, notes: 'NV Duy đã nghỉ, SIM vẫn active nhưng không ai quản lý FB Ads', statusAfter: 'critical' },
    { assetId: 'a6', checkedBy: 'e3', checkedAt: new Date('2026-05-10T16:00:00Z'), checkType: 'manual', riskScoreBefore: 40, riskScoreAfter: 35, notes: 'TikTok Shop hoạt động tốt, đã thêm email backup', statusAfter: 'watch' },
    { assetId: 'a5', checkedBy: 'e6', checkedAt: new Date('2026-01-15T11:00:00Z'), checkType: 'api', riskScoreBefore: 70, riskScoreAfter: 90, notes: 'Numverify báo invalid! NV Giang đã nghỉ. Cần thu hồi SIM', statusAfter: 'critical' },
    { assetId: 'a10', checkedBy: 'e1', checkedAt: new Date('2026-05-05T08:00:00Z'), checkType: 'manual', riskScoreBefore: 50, riskScoreAfter: 40, notes: 'FB BM hoạt động nhưng thiếu backup email cho account #2', statusAfter: 'watch' },
    { assetId: 'a15', checkedBy: 'e8', checkedAt: new Date('2026-05-19T11:00:00Z'), checkType: 'manual', riskScoreBefore: 20, riskScoreAfter: 20, notes: 'SIM Grab dùng bình thường, không liên kết TK quan trọng', statusAfter: 'safe' }
  ];

  console.log('Seeding check logs...');
  for (const cl of rawCheckLogs) {
    const assetId = assetIdMap.get(cl.assetId)!;
    // Map checkedBy từ raw employee id sang Postgres user id nếu có, hoặc default userId
    await db.insert(simCheckLogs).values({
      teamId,
      assetId,
      checkedBy: userId, // Dùng ID của user chạy test
      checkedAt: cl.checkedAt,
      checkType: cl.checkType,
      riskScoreBefore: cl.riskScoreBefore,
      riskScoreAfter: cl.riskScoreAfter,
      notes: cl.notes,
      statusAfter: cl.statusAfter
    });
  }

  console.log('--- SIM SEEDING COMPLETED SUCCESSFULLY ---');
}

seedSim()
  .catch((err) => {
    console.error('SIM seeding failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
