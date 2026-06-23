import { db } from '@/lib/db/drizzle';
import { filmSeries } from '@/lib/db/schema';
import { slugify } from '@/lib/utils/film-url';
import { eq } from 'drizzle-orm';

async function run() {
    console.log("Fetching all film series...");
    const series = await db.select().from(filmSeries);
    let count = 0;
    
    for (const s of series) {
        if (!s.slug) {
            let baseSlug = slugify(s.title);
            if (!baseSlug) baseSlug = `film-${s.id}`;
            let slug = baseSlug;
            let i = 1;
            
            // Check trùng (đơn giản, bỏ qua check db liên tục để nhanh, vì tên film thường unique)
            // Nếu có duplicate lúc push sẽ văng lỗi nhưng hiện tại s.slug chưa unique constraints
            await db.update(filmSeries).set({ slug }).where(eq(filmSeries.id, s.id));
            count++;
        }
    }
    console.log(`Updated ${count} slugs.`);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
