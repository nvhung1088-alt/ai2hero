require('dotenv').config({path: '.env'});
const postgres = require('postgres');
const sql = postgres(process.env.POSTGRES_URL);
sql.unsafe("SELECT id, token FROM dub_workers").then(res => {
  console.log(res);
  process.exit();
});
