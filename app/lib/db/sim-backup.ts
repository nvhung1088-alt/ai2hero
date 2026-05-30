import { db } from './drizzle';
import { simAssets, simLinkedAccounts, simBackupConfigs, teams } from './schema';
import { getSimAssets, getSimLinkedAccounts } from './sim-queries';
import { eq, and, isNull } from 'drizzle-orm';
import { Resend } from 'resend';

// Helper che giấu mật khẩu (chỉ giữ lại 3 ký tự đầu) để an toàn khi gửi qua email
function maskPassword(pwd: string | null): string {
  if (!pwd) return '';
  if (pwd.length <= 3) return '***';
  return pwd.substring(0, 3) + '****';
}

// Sinh nội dung CSV cho danh sách SIM (Thêm BOM \ufeff để Excel hiển thị đúng tiếng Việt UTF-8)
function generateSimAssetsCSV(assets: any[]): string {
  let csv = '\ufeff'; // UTF-8 BOM
  csv += 'Tên SIM,Số điện thoại,Nhà mạng,Trạng thái,Họ tên chính chủ,CCCD/Hộ chiếu chính chủ,Ngày đăng ký chính chủ,Ngày kích hoạt,Người phụ trách\n';
  
  for (const ast of assets) {
    const name = `"${(ast.name || '').replace(/"/g, '""')}"`;
    const value = `"${(ast.value || '').replace(/"/g, '""')}"`;
    const carrier = `"${(ast.carrier || '').replace(/"/g, '""')}"`;
    const status = ast.status === 'active' ? 'Đang hoạt động' : ast.status === 'locked' ? 'Bị khóa' : 'Cảnh báo';
    const regName = `"${(ast.registeredName || '').replace(/"/g, '""')}"`;
    const regId = `"${(ast.registeredId || '').replace(/"/g, '""')}"`;
    const regAt = ast.registeredAt ? new Date(ast.registeredAt).toLocaleDateString('vi-VN') : '';
    const actDate = ast.activationDate ? new Date(ast.activationDate).toLocaleDateString('vi-VN') : '';
    const owner = `"${(ast.ownerName || 'Chưa bàn giao').replace(/"/g, '""')}"`;
    
    csv += `${name},${value},${carrier},${status},${regName},${regId},${regAt},${actDate},${owner}\n`;
  }
  
  return csv;
}

// Sinh nội dung CSV cho danh sách tài khoản liên kết
function generateSimAccountsCSV(accounts: any[]): string {
  let csv = '\ufeff'; // UTF-8 BOM
  csv += 'Tên tài khoản,Nền tảng,Tên đăng nhập / ID,Mật khẩu,Email liên kết,URL đăng nhập,SIM OTP liên kết,Trạng thái,Mức độ quan trọng,Ghi chú\n';
  
  for (const acc of accounts) {
    const name = `"${(acc.accountName || '').replace(/"/g, '""')}"`;
    const platform = `"${(acc.platformKey || '').toUpperCase().replace(/"/g, '""')}"`;
    const username = `"${(acc.username || '').replace(/"/g, '""')}"`;
    const password = `"${(acc.encryptedPassword || '').replace(/"/g, '""')}"`;
    const email = `"${(acc.loginEmail || '').replace(/"/g, '""')}"`;
    const url = `"${(acc.loginUrl || '').replace(/"/g, '""')}"`;
    const sim = `"${(acc.linkedPhoneNumber ? `${acc.accountName} (${acc.linkedPhoneNumber})` : 'Chưa gắn SIM').replace(/"/g, '""')}"`;
    const status = acc.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa';
    const importance = acc.importanceLevel === 'critical' ? 'Rất quan trọng' : acc.importanceLevel === 'high' ? 'Cao' : 'Trung bình';
    const notes = `"${(acc.notes || '').replace(/"/g, '""')}"`;
    
    csv += `${name},${platform},${username},${password},${email},${url},${sim},${status},${importance},${notes}\n`;
  }
  
  return csv;
}

// Gửi email backup qua Resend
export async function sendBackupEmail(toEmail: string, teamName: string, assetsCsv: string, accountsCsv: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình RESEND_API_KEY trong file .env');
  }

  const resend = new Resend(apiKey);
  
  // Với tài khoản Resend miễn phí, from bắt buộc phải là onboarding@resend.dev nếu chưa verify domain
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  const response = await resend.emails.send({
    from: `SimGuard Backup <${fromEmail}>`,
    to: toEmail,
    subject: `[SimGuard] Sao lưu dữ liệu tự động - Không gian ${teamName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px border #e5e7eb; rounded-xl: 12px; background-color: #ffffff; color: #1f2937;">
        <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 8px;">Sao lưu dữ liệu tự động SimGuard</h2>
        <p>Xin chào,</p>
        <p>Đây là tệp tin sao lưu dữ liệu tự động định kỳ của hệ thống quản lý SIM (SimGuard) cho Không gian làm việc <strong>${teamName}</strong>.</p>
        <p>Đính kèm trong email này là 2 file CSV chứa toàn bộ thông tin SIM và tài khoản liên kết hiện tại của bạn.</p>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 6px;">
          <strong style="color: #991b1b; display: block; margin-bottom: 4px;">⚠️ Cảnh báo Bảo mật Cực kỳ quan trọng:</strong>
          <span style="font-size: 13px; color: #7f1d1d;">
            Tệp tin đính kèm <strong>chứa thông tin mật khẩu đầy đủ</strong> của các tài khoản liên kết doanh nghiệp để phục vụ công tác khôi phục trọn vẹn dữ liệu khi cần thiết. 
            Vui lòng lưu giữ tệp tin này ở nơi an toàn, tuyệt đối không chia sẻ email hoặc file đính kèm cho bất kỳ ai và đảm bảo hòm thư điện tử của bạn được bảo mật đa lớp (2FA).
          </span>
        </div>
        
        <p style="font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center;">
          Hệ thống bảo mật dữ liệu SimGuard Vault 2.0 • AI2Hero Platform
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `sim_assets_${teamName.toLowerCase().replace(/\s+/g, '_')}_backup.csv`,
        content: Buffer.from(assetsCsv).toString('base64'),
      },
      {
        filename: `sim_accounts_${teamName.toLowerCase().replace(/\s+/g, '_')}_backup.csv`,
        content: Buffer.from(accountsCsv).toString('base64'),
      }
    ]
  });

  if (response.error) {
    throw new Error(`Resend API Error: ${response.error.message}`);
  }

  return response.data;
}

// Thực thi sao lưu dữ liệu cho 1 team cụ thể
export async function executeBackupForTeam(teamId: number, toEmail: string) {
  // 1. Lấy thông tin Team
  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), isNull(teams.deletedAt))).limit(1);
  if (!team) {
    throw new Error('Không tìm thấy Không gian làm việc hoặc đã bị xóa');
  }

  // 2. Lấy dữ liệu SIM & Accounts thật từ DB
  const assets = await getSimAssets(teamId);
  const accounts = await getSimLinkedAccounts(teamId);

  // 3. Sinh chuỗi CSV tiếng Việt
  const assetsCsv = generateSimAssetsCSV(assets);
  const accountsCsv = generateSimAccountsCSV(accounts);

  // 4. Gửi email qua Resend
  return await sendBackupEmail(toEmail, team.name, assetsCsv, accountsCsv);
}

// Bộ máy quét chạy ngầm (Cron) quét các cấu hình sao lưu đến hạn
export async function processScheduledBackups() {
  console.log('=== BẮT ĐẦU QUÉT LỊCH SAO LƯU TỰ ĐỘNG SIM MANAGER ===');
  
  // Lấy tất cả cấu hình backup đang được bật
  const configs = await db
    .select({
      id: simBackupConfigs.id,
      teamId: simBackupConfigs.teamId,
      backupEmail: simBackupConfigs.backupEmail,
      frequency: simBackupConfigs.frequency,
      lastSentAt: simBackupConfigs.lastSentAt,
      teamName: teams.name
    })
    .from(simBackupConfigs)
    .innerJoin(teams, eq(simBackupConfigs.teamId, teams.id))
    .where(and(isNull(teams.deletedAt)));
    
  console.log(`Tìm thấy ${configs.length} cấu hình backup trong hệ thống.`);
  
  let processedCount = 0;
  let errorCount = 0;
  
  for (const config of configs) {
    // Nếu frequency là 'off', bỏ qua
    if (config.frequency === 'off') continue;
    
    // Kiểm tra xem đã đến hạn gửi chưa
    let shouldSend = false;
    const now = new Date();
    
    if (!config.lastSentAt) {
      // Chưa bao giờ gửi -> gửi ngay
      shouldSend = true;
    } else {
      const lastSent = new Date(config.lastSentAt);
      const diffTime = Math.abs(now.getTime() - lastSent.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (config.frequency === 'weekly' && diffDays >= 7) {
        shouldSend = true;
      } else if (config.frequency === 'monthly' && diffDays >= 30) {
        shouldSend = true;
      }
    }
    
    if (shouldSend) {
      console.log(` -> Đang xử lý backup cho team ID ${config.teamId} (${config.teamName}) gửi đến email: ${config.backupEmail}`);
      try {
        // Thực thi sinh CSV + gửi mail
        await executeBackupForTeam(config.teamId, config.backupEmail);
        
        // Cập nhật lastSentAt trong DB
        await db
          .update(simBackupConfigs)
          .set({
            lastSentAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(simBackupConfigs.id, config.id));
          
        console.log(` ✅ Đã gửi email backup thành công cho team ID ${config.teamId}`);
        processedCount++;
      } catch (err: any) {
        console.error(` ❌ Lỗi xử lý backup cho team ID ${config.teamId}:`, err);
        errorCount++;
      }
    }
  }
  
  console.log(`=== KẾT THÚC QUÉT LỊCH: Đã xử lý thành công: ${processedCount}, Lỗi: ${errorCount} ===`);
  return { processed: processedCount, errors: errorCount };
}
