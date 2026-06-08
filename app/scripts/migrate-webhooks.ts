import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('=== KHỞI CHẠY MIGRATION TẠO BẢNG CONNECT HUB WEBHOOKS ===');

  try {
    // 1. Tạo bảng connect_hub_webhooks
    console.log(' -> Tạo bảng connect_hub_webhooks...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS connect_hub_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        app_slug VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        secret_hash TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        received_count INTEGER NOT NULL DEFAULT 0,
        last_received_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Tạo bảng connect_hub_webhook_logs
    console.log(' -> Tạo bảng connect_hub_webhook_logs...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS connect_hub_webhook_logs (
        id SERIAL PRIMARY KEY,
        webhook_id UUID NOT NULL REFERENCES connect_hub_webhooks(id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        method VARCHAR(10) NOT NULL,
        source_ip VARCHAR(45),
        headers JSONB NOT NULL DEFAULT '{}',
        raw_body TEXT,
        parsed_payload JSONB,
        signature_valid INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        error_message TEXT,
        processed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log(' ✅ Migration thành công! Đã tạo đầy đủ 2 bảng Webhooks.');
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
