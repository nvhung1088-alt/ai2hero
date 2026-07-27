const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.movjykdmanrhmgsdtooz:Hungkeu1088%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
});

async function check() {
  const res = await pool.query('SELECT id, video_url, status FROM downloader_videos ORDER BY created_at DESC LIMIT 20');
  console.log("LAST 20 VIDEOS:");
  res.rows.forEach(r => console.log(r));

  const countRes = await pool.query('SELECT COUNT(*) FROM downloader_videos');
  console.log("TOTAL VIDEOS:", countRes.rows[0].count);
  process.exit(0);
}

check().catch(e => console.error(e));
