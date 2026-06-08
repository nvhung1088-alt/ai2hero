import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { heroCareInboxes } from '@/lib/db/schema';
import crypto from 'crypto';

export const revalidate = 0;

export async function GET(request: Request) {
  // 1. Xác thực CRON_SECRET bảo mật cao
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Quota Reset Cron] Lỗi: Chưa cấu hình CRON_SECRET.');
    return new NextResponse('Internal Server Error: Cron secret configuration missing', { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const expectedAuth = `Bearer ${cronSecret}`;

  try {
    const authBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedAuth);
    
    if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('[Quota Reset Cron] Đang thực hiện reset hạn mức sử dụng hàng ngày của tất cả Inboxes...');

    // 2. Reset dailyMessageCount và dailyAiCallCount về 0
    await db
      .update(heroCareInboxes)
      .set({
        dailyMessageCount: 0,
        dailyAiCallCount: 0,
        lastResetAt: new Date(),
        updatedAt: new Date()
      });

    console.log('[Quota Reset Cron] Đã reset hạn mức sử dụng thành công.');

    return NextResponse.json({
      success: true,
      message: 'Đã reset hạn mức tin nhắn và AI call hàng ngày thành công.'
    });

  } catch (error: any) {
    console.error('[Quota Reset Cron] Lỗi runtime:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi hệ thống reset quota' },
      { status: 500 }
    );
  }
}
