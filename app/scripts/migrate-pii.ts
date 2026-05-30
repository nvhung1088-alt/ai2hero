import { db } from '../lib/db/drizzle';
import { simAssets } from '../lib/db/schema';
import { encryptField } from '../lib/sim-crypto';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('=== KHỞI CHẠY MIGRATION MÃ HÓA PII CHO HEROSIM ===');
  
  // 1. Tải tất cả SIM trong database
  const assets = await db.select().from(simAssets);
  console.log(`Tìm thấy tổng số ${assets.length} bản ghi SIM trong database.`);
  
  let migratedCount = 0;
  
  for (const asset of assets) {
    let needsUpdate = false;
    const updateData: any = {};
    
    // Kiểm tra số điện thoại (value)
    if (asset.value) {
      const isAlreadyEncrypted = asset.value.includes(':') && asset.value.split(':').length >= 2;
      if (!isAlreadyEncrypted) {
        console.log(` -> SIM ID ${asset.id} (${asset.name}): Phát hiện Số điện thoại plaintext cũ: "${asset.value}"`);
        updateData.value = encryptField(asset.value);
        needsUpdate = true;
      }
    }
    
    // Kiểm tra registeredName
    if (asset.registeredName) {
      const isAlreadyEncrypted = asset.registeredName.includes(':') && asset.registeredName.split(':').length >= 2;
      if (!isAlreadyEncrypted) {
        console.log(` -> SIM ID ${asset.id} (${asset.name}): Phát hiện Họ tên plaintext cũ: "${asset.registeredName}"`);
        updateData.registeredName = encryptField(asset.registeredName);
        needsUpdate = true;
      }
    }
    
    // Kiểm tra registeredId
    if (asset.registeredId) {
      const isAlreadyEncrypted = asset.registeredId.includes(':') && asset.registeredId.split(':').length >= 2;
      if (!isAlreadyEncrypted) {
        console.log(` -> SIM ID ${asset.id} (${asset.name}): Phát hiện CCCD plaintext cũ: "${asset.registeredId}"`);
        updateData.registeredId = encryptField(asset.registeredId);
        needsUpdate = true;
      }
    }
    
    // 2. Cập nhật nếu phát hiện plaintext chưa mã hóa
    if (needsUpdate) {
      await db
        .update(simAssets)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(simAssets.id, asset.id));
      
      console.log(` ✅ Đã mã hóa bảo mật thành công cho SIM ID ${asset.id}`);
      migratedCount++;
    }
  }
  
  console.log(`\n=== KẾT QUẢ MIGRATION ===`);
  console.log(`Số bản ghi SIM đã được mã hóa thành công: ${migratedCount}/${assets.length}`);
  console.log(`Hệ thống bảo mật dữ liệu PII SIM đã hoàn tất kiên cố!`);
}

main()
  .catch((error) => {
    console.error('❌ Lỗi khi chạy migration:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
