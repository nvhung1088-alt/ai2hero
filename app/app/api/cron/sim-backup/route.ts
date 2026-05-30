import { NextResponse } from 'next/server';
import { processScheduledBackups } from '@/lib/db/sim-backup';

export const revalidate = 0;

export async function GET(request: Request) {
  // Xác thực CRON_SECRET nghiêm ngặt từ header
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRITICAL: CRON_SECRET is not configured on the server.');
    return new NextResponse('Internal Server Error: Cron secret configuration missing', { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await processScheduledBackups();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron backup job failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
