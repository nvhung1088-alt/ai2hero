const postgres = require('postgres');
const sql = postgres('postgresql://postgres.movjykdmanrhmgsdtooz:Hungkeu1088%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');
sql`SELECT id, source_url, translate_engine, llm_model FROM dub_tasks ORDER BY id DESC LIMIT 5`
  .then(res => { console.table(res); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
