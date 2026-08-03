import { db } from './lib/db/drizzle';
import { connectHubConnections } from './lib/db/schema';
async function main() {
  const conns = await db.query.connectHubConnections.findMany();
  console.log('Connections:', conns.length);
}
main().then(()=>process.exit(0));
