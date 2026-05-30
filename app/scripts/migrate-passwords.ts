import { db } from '../lib/db/drizzle';
import { simLinkedAccounts } from '../lib/db/schema';
import { encryptField } from '../lib/sim-crypto';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('=== KHỞI CHẠY MIGRATION MÃ HÓA MẬT KHẨU CHO TÀI KHOẢN LIÊN KẾT ===');
  
  // 1. Tải tất cả tài khoản liên kết trong database
  const accounts = await db.select().from(simLinkedAccounts);
  console.log(`Tìm thấy tổng số ${accounts.length} tài khoản trong database.`);
  
  let migratedCount = 0;
  
  for (const account of accounts) {
    let needsUpdate = false;
    const updateData: any = {};
    
    // Kiểm tra encryptedPassword
    if (account.encryptedPassword) {
      const isAlreadyEncrypted = account.encryptedPassword.includes(':') && account.encryptedPassword.split(':').length >= 2;
      if (!isAlreadyEncrypted) {
        console.log(` -> Tài khoản ID ${account.id} (${account.accountName} - ${account.platformKey}): Phát hiện mật khẩu plaintext cũ: "${account.encryptedPassword}"`);
        updateData.encryptedPassword = encryptField(account.encryptedPassword);
        needsUpdate = true;
      }
    }
    
    // 2. Cập nhật nếu phát hiện plaintext chưa mã hóa
    if (needsUpdate) {
      await db
        .update(simLinkedAccounts)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(simLinkedAccounts.id, account.id));
      
      console.log(` ✅ Đã mã hóa bảo mật thành công cho tài khoản ID ${account.id}`);
      migratedCount++;
    }
  }
  
  console.log(`\n=== KẾT QUẢ MIGRATION ===`);
  console.log(`Số tài khoản đã được mã hóa thành công: ${migratedCount}/${accounts.length}`);
  console.log(`Hệ thống bảo mật mật khẩu tài khoản liên kết đã hoàn tất kiên cố!`);
}

main()
  .catch((error) => {
    console.error('❌ Lỗi khi chạy migration mật khẩu:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
