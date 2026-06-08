import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('=== KHỞI CHẠY MIGRATION TẠO BẢNG HERO CARE ===');

  try {
    // 1. Tạo bảng hero_care_inboxes
    console.log(' -> Tạo bảng hero_care_inboxes...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_inboxes (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        connection_id INTEGER REFERENCES connect_hub_connections(id) ON DELETE SET NULL,
        webhook_id UUID REFERENCES connect_hub_webhooks(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        system_prompt TEXT,
        default_reply TEXT NOT NULL DEFAULT 'Hiện tại nhân viên đang bận, chúng tôi sẽ phản hồi sớm.',
        daily_message_limit INTEGER NOT NULL DEFAULT 50,
        daily_ai_call_limit INTEGER NOT NULL DEFAULT 20,
        daily_message_count INTEGER NOT NULL DEFAULT 0,
        daily_ai_call_count INTEGER NOT NULL DEFAULT 0,
        last_reset_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Tạo bảng hero_care_snapshots
    console.log(' -> Tạo bảng hero_care_snapshots...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_snapshots (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        inbox_id INTEGER NOT NULL REFERENCES hero_care_inboxes(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        refresh_interval_minutes INTEGER NOT NULL DEFAULT 15,
        max_stale_minutes INTEGER NOT NULL DEFAULT 60,
        allow_stale_fallback INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        config JSONB DEFAULT '{}',
        last_refreshed_at TIMESTAMP,
        next_refresh_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Tạo bảng hero_care_customers
    console.log(' -> Tạo bảng hero_care_customers...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_customers (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        external_customer_id VARCHAR(255),
        channel VARCHAR(50),
        name VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        avatar TEXT,
        tags JSONB DEFAULT '[]',
        notes TEXT,
        total_conversations INTEGER DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        last_seen_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log(' -> Tạo indexes cho hero_care_customers...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS hero_care_cust_team_idx ON hero_care_customers (team_id);
      CREATE INDEX IF NOT EXISTS hero_care_cust_ext_idx ON hero_care_customers (external_customer_id);
    `);

    // 4. Tạo bảng hero_care_conversations
    console.log(' -> Tạo bảng hero_care_conversations...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_conversations (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        inbox_id INTEGER NOT NULL REFERENCES hero_care_inboxes(id) ON DELETE CASCADE,
        external_conversation_id VARCHAR(255) NOT NULL,
        customer_id INTEGER REFERENCES hero_care_customers(id) ON DELETE SET NULL,
        chat_mode VARCHAR(20) NOT NULL DEFAULT 'hybrid',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        last_message_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Tạo bảng hero_care_messages
    console.log(' -> Tạo bảng hero_care_messages...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_messages (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        inbox_id INTEGER NOT NULL REFERENCES hero_care_inboxes(id) ON DELETE CASCADE,
        conversation_id INTEGER NOT NULL REFERENCES hero_care_conversations(id) ON DELETE CASCADE,
        external_message_id VARCHAR(255),
        sender_id VARCHAR(255),
        sender_name VARCHAR(255),
        direction VARCHAR(20) NOT NULL,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        ai_status VARCHAR(20),
        ai_confidence INTEGER,
        used_snapshot_ids JSONB DEFAULT '[]',
        used_script_ids JSONB DEFAULT '[]',
        handoff_reason TEXT,
        draft_content TEXT,
        draft_status VARCHAR(20),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Tạo bảng hero_care_scripts
    console.log(' -> Tạo bảng hero_care_scripts...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_scripts (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        inbox_id INTEGER REFERENCES hero_care_inboxes(id) ON DELETE CASCADE,
        trigger_text TEXT NOT NULL,
        keywords JSONB DEFAULT '[]',
        negative_keywords JSONB DEFAULT '[]',
        trigger_examples JSONB DEFAULT '[]',
        intent VARCHAR(50),
        confidence_threshold INTEGER DEFAULT 70,
        reply_text TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Tạo bảng hero_care_snapshot_items
    console.log(' -> Tạo bảng hero_care_snapshot_items...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_snapshot_items (
        id SERIAL PRIMARY KEY,
        snapshot_id INTEGER NOT NULL REFERENCES hero_care_snapshots(id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        data_type VARCHAR(50) NOT NULL,
        entity_key VARCHAR(255) NOT NULL,
        entity_name VARCHAR(255),
        data JSONB NOT NULL,
        data_hash VARCHAR(64),
        refreshed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log(' -> Tạo indexes cho hero_care_snapshot_items...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS hero_care_si_snapshot_idx ON hero_care_snapshot_items (snapshot_id);
      CREATE INDEX IF NOT EXISTS hero_care_si_entity_idx ON hero_care_snapshot_items (entity_key);
    `);

    // 8. Tạo bảng hero_care_guardrails
    console.log(' -> Tạo bảng hero_care_guardrails...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_guardrails (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        inbox_id INTEGER REFERENCES hero_care_inboxes(id) ON DELETE CASCADE,
        rule_type VARCHAR(50) NOT NULL,
        condition JSONB NOT NULL,
        action VARCHAR(20) NOT NULL DEFAULT 'handoff',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 9. Tạo bảng hero_care_events
    console.log(' -> Tạo bảng hero_care_events...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_care_events (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        inbox_id INTEGER REFERENCES hero_care_inboxes(id) ON DELETE SET NULL,
        conversation_id INTEGER REFERENCES hero_care_conversations(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        payload JSONB,
        processed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log(' -> Tạo indexes cho hero_care_events...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS hero_care_events_team_idx ON hero_care_events (team_id);
      CREATE INDEX IF NOT EXISTS hero_care_events_processed_idx ON hero_care_events (processed_at);
    `);

    console.log(' ✅ Migration thành công! Đã tạo đầy đủ 9 bảng cho Hero Care.');
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
