import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { heroCareEvents, heroCareInboxes } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { processInboundMessage, parseWebhookPayload } from '@/lib/hero-care/ai-reply-engine';
import crypto from 'crypto';

export const revalidate = 0;

export async function GET(request: Request) {
  // 1. Xác thực CRON_SECRET nghiêm ngặt
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
    // 2. Lấy tối đa 10 events webhook chưa xử lý (FIFO: Oldest first)
    const events = await db
      .select()
      .from(heroCareEvents)
      .where(
        and(
          eq(heroCareEvents.eventType, 'webhook_received'),
          isNull(heroCareEvents.processedAt)
        )
      )
      .orderBy(heroCareEvents.createdAt)
      .limit(10);

    if (events.length === 0) {
      return NextResponse.json({ success: true, message: 'Hàng đợi trống. Không có tin nhắn nào cần xử lý.' });
    }

    let processedCount = 0;
    const details = [];

    // 3. Thực thi tuần tự từng event tin nhắn để tránh race condition và quá tải AI
    for (const event of events) {
      const startTime = Date.now();
      
      // Lock nhanh bằng cách đánh dấu processedAt ngay lập tức (chống cron chạy song song quét trúng)
      await db
        .update(heroCareEvents)
        .set({ processedAt: new Date() })
        .where(eq(heroCareEvents.id, event.id));

      try {
        if (!event.inboxId) {
          throw new Error('Event không có inboxId hợp lệ');
        }

        const [inbox] = await db
          .select()
          .from(heroCareInboxes)
          .where(and(eq(heroCareInboxes.id, event.inboxId), eq(heroCareInboxes.status, 'active')))
          .limit(1);

        if (!inbox) {
          throw new Error(`Inbox #${event.inboxId} không tồn tại hoặc đã bị khóa.`);
        }

        // Parse payload webhook
        const parsed = parseWebhookPayload(inbox.channel, event.payload);
        if (!parsed) {
          throw new Error(`Không thể parse payload webhook của channel: ${inbox.channel}`);
        }

        // Chạy tiến trình trả lời tự động hoặc tạo nháp
        await processInboundMessage({
          teamId: event.teamId,
          inboxId: inbox.id,
          externalMessageId: parsed.externalMessageId,
          senderId: parsed.senderId,
          senderName: parsed.senderName,
          messageText: parsed.messageText,
          attachments: parsed.attachments,
          externalConversationId: parsed.externalConversationId
        });

        processedCount++;
        details.push({
          eventId: event.id,
          status: 'success',
          durationMs: Date.now() - startTime
        });

      } catch (err: any) {
        console.error(`[Hero Care Cron] Lỗi xử lý event #${event.id}:`, err);

        // Ghi nhận thông tin lỗi vào payload của event để phục vụ việc Debug sau này
        const currentPayload = typeof event.payload === 'object' && event.payload !== null ? event.payload : {};
        await db
          .update(heroCareEvents)
          .set({
            payload: {
              ...currentPayload,
              error: err.message || 'Lỗi xử lý không xác định'
            }
          })
          .where(eq(heroCareEvents.id, event.id));

        details.push({
          eventId: event.id,
          status: 'failed',
          error: err.message,
          durationMs: Date.now() - startTime
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      totalScanned: events.length,
      details
    });

  } catch (error: any) {
    console.error('[Hero Care Cron] Lỗi runtime:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi hệ thống cron job' },
      { status: 500 }
    );
  }
}
