import { db } from './lib/db/drizzle';
import { dubScanConfigs } from './lib/db/schema';
async function main() {
  const configs = await db.select().from(dubScanConfigs);
  console.log(configs.map(c => ({ id: c.id, name: c.name, isActive: c.isActive })));
  process.exit(0);
}
main();
