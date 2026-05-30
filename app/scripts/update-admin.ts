import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Đang cập nhật tài khoản test@test.com thành super_admin...');

  const result = await db
    .update(users)
    .set({ role: 'super_admin' })
    .where(eq(users.email, 'test@test.com'))
    .returning();

  if (result.length > 0) {
    console.log('Cập nhật thành công! Trạng thái user hiện tại:', result[0]);
  } else {
    console.log('Không tìm thấy tài khoản test@test.com trong database.');
  }
}

main()
  .catch((error) => {
    console.error('Lỗi khi chạy script:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
