import { db } from './app/lib/db/drizzle';
import { connectHubConnections, connectHubMappingConfigs } from './app/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptField } from './app/lib/sim-crypto';
import { executeAction } from './app/lib/connect-hub/connectors/engine';
import { normalizeData } from './app/lib/connect-hub/utils/mapper';

async function test() {
  const conn = await db.query.connectHubConnections.findFirst({
    where: eq(connectHubConnections.appSlug, 'pancake-pos')
  });

  if (!conn) {
    console.log("Không tìm thấy kết nối pancake pos");
    return;
  }

  console.log("Đã tìm thấy connection:", conn.appName);

  const decryptedJson = decryptField(conn.encryptedCredentials) || '{}';
  const credentials = JSON.parse(decryptedJson);

  console.log("Calling API with credentials...");

  const res = await executeAction('pancake-pos', credentials, 'list_orders', {});
  
  if (res.success) {
     const configRecord = await db.query.connectHubMappingConfigs.findFirst({
       where: eq(connectHubMappingConfigs.appSlug, 'pancake-pos')
     });
     
     const normalized = normalizeData('pancake-pos', 'list_orders', res.data, configRecord?.config || {});
     console.log("=== NORMALIZED DATA ===");
     console.log("Total Orders:", normalized.length);
     if (normalized.length > 0) {
        console.log("First Order Sample:", JSON.stringify(normalized[0], null, 2));
     }
  } else {
     console.log("LỖI API:", res.error);
  }
}

test().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
