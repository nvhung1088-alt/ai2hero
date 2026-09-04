import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { connectHubConnections } from '../lib/db/schema';
import { encryptField } from '../lib/sim-crypto';
import { eq, and } from 'drizzle-orm';

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY || '';
  console.log('[*] Testing DeepSeek API Key...');
  
  try {
    const testRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Xin chào, hãy trả lời 2 từ: Sẵn Sàng' }],
        max_tokens: 20
      })
    });

    console.log('[*] DeepSeek HTTP Status:', testRes.status);
    const testData = await testRes.json().catch(() => ({}));
    console.log('[*] DeepSeek Response:', JSON.stringify(testData, null, 2));

    if (testRes.ok) {
      console.log('[✓] DeepSeek API Key HOAT DONG TOT!');
    } else {
      console.warn('[!] DeepSeek API Warning:', testData);
    }
  } catch (e: any) {
    console.error('[!] Network error when testing DeepSeek:', e.message);
  }

  const credentialsJson = JSON.stringify({ apiKey });
  const encryptedCredentials = encryptField(credentialsJson);

  const targetTeams = [3, 1];
  for (const teamId of targetTeams) {
    try {
      const existing = await db
        .select()
        .from(connectHubConnections)
        .where(
          and(
            eq(connectHubConnections.teamId, teamId),
            eq(connectHubConnections.appSlug, 'deepseek')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(connectHubConnections)
          .set({
            connectionName: 'DeepSeek Official API',
            encryptedCredentials: encryptedCredentials as string,
            status: 'connected',
            lastTestedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(connectHubConnections.id, existing[0].id));
        console.log(`[✓] Da cap nhat DeepSeek Connection (ID: ${existing[0].id}) cho Team #${teamId}!`);
      } else {
        const [inserted] = await db
          .insert(connectHubConnections)
          .values({
            userId: 1,
            teamId,
            appSlug: 'deepseek',
            appName: 'DeepSeek',
            connectionName: 'DeepSeek Official API',
            authType: 'api_key',
            encryptedCredentials: encryptedCredentials as string,
            status: 'connected',
            lastTestedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        console.log(`[✓] Da tao moi DeepSeek Connection (ID: ${inserted.id}) cho Team #${teamId}!`);
      }
    } catch (err: any) {
      console.error(`[!] Loi khi luu cho Team #${teamId}:`, err.message);
    }
  }

  console.log('[🎉] HOAN TAT DONG BO DEEPSEEK API KEY!');
  process.exit(0);
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
