import postgres from 'postgres';

const sql = postgres('postgresql://postgres.movjykdmanrhmgsdtooz:Hungkeu1088%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function retryFailed() {
  const res = await sql`
    UPDATE downloader_videos 
    SET status = 'pending' 
    WHERE status = 'failed'
    RETURNING id
  `;
  console.log(`Reset ${res.length} failed videos to pending!`);
  process.exit(0);
}

retryFailed().catch(e => console.error(e));
