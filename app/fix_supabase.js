require('dotenv').config({path: '.env'});
const postgres = require('postgres');
const sql = postgres('postgresql://postgres.movjykdmanrhmgsdtooz:Hungkeu1088%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');
sql.unsafe("UPDATE dub_tasks SET status='pending', worker_id=NULL WHERE status IN ('assigned', 'tts', 'transcribing', 'downloading')").then(res => {
  console.log("Reset tasks in Supabase:", res.count);
  process.exit();
});
