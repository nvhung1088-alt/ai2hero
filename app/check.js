require('dotenv').config({path: '.env'});
const postgres = require('postgres');
const sql = postgres(process.env.POSTGRES_URL);
sql.unsafe("SELECT id, status, worker_id FROM dub_tasks").then(res => {
  console.log(res);
  process.exit();
});
