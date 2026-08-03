const postgres = require('postgres');
const sql = postgres('postgresql://postgres.movjykdmanrhmgsdtooz:Hungkeu1088%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres');

async function kill() {
  try {
    const res = await sql`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = 'postgres'`;
    console.log('Killed:', res.length);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

kill();
