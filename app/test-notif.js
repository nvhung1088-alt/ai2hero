const { db } = require('./lib/db/drizzle');
const { notifications } = require('./lib/db/schema');

async function testQuery() {
  try {
    console.log('Testing notifications query...');
    const res = await db.select().from(notifications).limit(1);
    console.log('Query success:', res);
    process.exit(0);
  } catch (err) {
    console.error('Query failed with error:', err);
    process.exit(1);
  }
}

testQuery();
