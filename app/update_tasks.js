const postgres = require('postgres');
const sql = postgres('postgresql://postgres.movjykdmanrhmgsdtooz:Hungkeu1088%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');
sql`UPDATE dub_tasks SET llm_model = 'deepseek|deepseek-chat', translate_engine = 'connect-hub' WHERE scan_config_id = 36 AND (status = 'pending' OR status = 'transcribing' OR status = 'translating')`
  .then(res => { console.log("Updated", res.count, "tasks"); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
