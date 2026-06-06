import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('=== KHỞI CHẠY MIGRATION TẠO BẢNG WEBHOOK FLOWS ===');

  try {
    // 1. Tạo bảng connect_hub_flows
    console.log(' -> Tạo bảng connect_hub_flows...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS connect_hub_flows (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        webhook_id UUID NOT NULL REFERENCES connect_hub_webhooks(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL DEFAULT 'Flow tự động',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Tạo bảng connect_hub_flow_steps
    console.log(' -> Tạo bảng connect_hub_flow_steps...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS connect_hub_flow_steps (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER NOT NULL REFERENCES connect_hub_flows(id) ON DELETE CASCADE,
        step INTEGER NOT NULL,
        connection_id INTEGER NOT NULL REFERENCES connect_hub_connections(id) ON DELETE CASCADE,
        app_slug VARCHAR(100) NOT NULL,
        action_slug VARCHAR(255) NOT NULL,
        input_mapping JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Tạo bảng connect_hub_flow_runs
    console.log(' -> Tạo bảng connect_hub_flow_runs...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS connect_hub_flow_runs (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER NOT NULL REFERENCES connect_hub_flows(id) ON DELETE CASCADE,
        webhook_log_id INTEGER REFERENCES connect_hub_webhook_logs(id) ON DELETE SET NULL,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMP,
        step_results JSONB NOT NULL DEFAULT '[]',
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log(' ✅ Migration thành công! Đã hoàn tất tạo 3 bảng cho Webhook Flows.');
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
