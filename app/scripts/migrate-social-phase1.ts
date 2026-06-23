import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('=== KHỞI CHẠY MIGRATION TẠO BẢNG FEED_COMMENT_LIKES ===');

  try {
    console.log(' -> Tạo bảng feed_comment_likes...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feed_comment_likes (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER NOT NULL REFERENCES feed_comments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction_type VARCHAR(20) DEFAULT 'like',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log(' -> Tạo unique index cho feed_comment_likes...');
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS feed_comment_likes_comment_user_idx ON feed_comment_likes (comment_id, user_id);
    `);

    console.log(' ✅ Migration thành công! Đã tạo bảng feed_comment_likes.');
  } catch (error) {
    console.error('❌ Lỗi khi thực thi các lệnh SQL Migration:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration thất bại:', err);
    process.exit(1);
  });
