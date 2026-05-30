import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Lỗi: Biến môi trường POSTGRES_URL chưa được thiết lập trong tệp .env');
  process.exit(1);
}

const safeConnectionString = connectionString as string;

async function cleanupPostgres() {
  console.log('📡 Đang kết nối tới PostgreSQL cục bộ...');
  // Connect with a temporary single connection client
  const sqlClient = postgres(safeConnectionString, { max: 1 });

  try {
    console.log('⚡ 1. Thiết lập cấu hình tự động ngắt kết nối idle sau 5 giây...');
    
    // Set system timeouts for idle connections (5000 milliseconds = 5 seconds)
    await sqlClient`ALTER SYSTEM SET idle_session_timeout = 5000;`;
    await sqlClient`ALTER SYSTEM SET idle_in_transaction_session_timeout = 5000;`;
    
    // Reload configuration to apply ALTER SYSTEM changes immediately
    await sqlClient`SELECT pg_reload_conf();`;
    console.log('✅ Đã cấu hình và áp dụng idle timeouts (5 giây) thành công.');

    console.log('⚡ 2. Đang tiến hành quét dọn và giải phóng các kết nối zombie nhàn rỗi...');
    
    // Terminate all sessions currently in 'idle' state (excluding the current setup connection)
    const terminatedSessions = await sqlClient`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE state = 'idle' AND pid <> pg_backend_pid();
    `;
    
    console.log(`🎉 Đã quét dọn thành công! Đã đóng ${terminatedSessions.length} kết nối nhàn rỗi đang bị treo.`);
    console.log('🚀 Bây giờ bạn có thể khởi chạy dev server mượt mà mà không bao giờ lo lỗi "too many clients"!');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình dọn dẹp kết nối:', error);
  } finally {
    await sqlClient.end();
  }
}

cleanupPostgres();
