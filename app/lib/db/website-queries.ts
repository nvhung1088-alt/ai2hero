import { db } from './drizzle';
import { websites } from './schema';
import { eq } from 'drizzle-orm';

export async function getWebsiteBySubdomain(subdomain: string) {
  const data = await db
    .select()
    .from(websites)
    .where(eq(websites.subdomain, subdomain))
    .limit(1);
    
  return data[0] || null;
}
