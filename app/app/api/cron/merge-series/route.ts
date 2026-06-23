import { db } from '@/lib/db/drizzle';
import { filmSeries } from '@/lib/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
    const allSeriesRaw = await db.select().from(filmSeries);
    const titles = allSeriesRaw.map(s => s.title);
    return NextResponse.json({ count: titles.length, titles });
}
