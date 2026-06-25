require('dotenv').config({path: '.env'});
const postgres = require('postgres');
const sql = postgres('postgresql://postgres.movjykdmanrhmgsdtooz:Hungkeu1088%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');
sql.unsafe("SELECT id, status, worker_id FROM dub_tasks ORDER BY id DESC LIMIT 5").then(res => {
  console.log(res);
  process.exit();
});
