import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { heroReportSchedules } from '@/lib/db/schema';
import { and, eq, lte, isNull, or, lt } from 'drizzle-orm';
import { executeReportTask } from '@/lib/hero-report/engine';
import crypto from 'crypto';

export const revalidate = 0;

export async function GET(request: Request) {
  // 1. Xác thực CRON_SECRET nghiêm ngặt từ header
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRITICAL: CRON_SECRET is not configured on the server.');
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
    const now = new Date();
    // Giải phóng lock nếu tiến trình bị treo quá 10 phút
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // 2. Quét tối đa 10 lịch báo cáo đến hạn chạy
    const schedulesToRun = await db
      .select()
      .from(heroReportSchedules)
      .where(
        and(
          eq(heroReportSchedules.status, 'active'),
          lte(heroReportSchedules.nextRunAt, now),
          or(
            isNull(heroReportSchedules.lockedAt),
            lt(heroReportSchedules.lockedAt, tenMinutesAgo)
          )
        )
      )
      .limit(3);

    if (schedulesToRun.length === 0) {
      return NextResponse.json({ success: true, message: 'Không có báo cáo nào đến hạn chạy.' });
    }

    const results = [];
    
    // 3. Thực thi tuần tự từng báo cáo để hạn chế nghẽn API POS và AI
    for (const schedule of schedulesToRun) {
      const lockId = Math.random().toString(36).substring(7);
      
      // Kích hoạt DB Lock chống chạy trùng lặp
      const [locked] = await db
        .update(heroReportSchedules)
        .set({
          lockedAt: new Date(),
          lockedBy: lockId
        })
        .where(
          and(
            eq(heroReportSchedules.id, schedule.id),
            or(
              isNull(heroReportSchedules.lockedAt),
              lt(heroReportSchedules.lockedAt, tenMinutesAgo)
            )
          )
        )
        .returning();

      if (!locked) {
        results.push({ id: schedule.id, status: 'skipped', reason: 'Đã được lock bởi tiến trình khác' });
        continue;
      }

      try {
        const executeRes = await executeReportTask(schedule.id);
        results.push({ id: schedule.id, status: executeRes.success ? 'success' : 'failed', error: executeRes.error });
      } catch (err: any) {
        console.error(`Error in cron execution for schedule #${schedule.id}:`, err);
        results.push({ id: schedule.id, status: 'failed', error: err.message || 'Lỗi runtime khi chạy' });
      } finally {
        // Unlock
        await db
          .update(heroReportSchedules)
          .set({
            lockedAt: null,
            lockedBy: null
          })
          .where(
            and(
              eq(heroReportSchedules.id, schedule.id),
              eq(heroReportSchedules.lockedBy, lockId)
            )
          );
      }
    }

    return NextResponse.json({ success: true, processed: results.length, details: results });

  } catch (error: any) {
    console.error('Cron report execution failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi hệ thống trong cron job' },
      { status: 500 }
    );
  }
}
