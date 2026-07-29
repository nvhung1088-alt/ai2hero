import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { youtubeSyncChannels } from '@/lib/db/schema';
import { eq, and, isNull, or, lte } from 'drizzle-orm';
import { syncYoutubeChannelAction, batchTranslateTeamAiAction } from '@/lib/db/youtube-sync-actions';
import { getTeamAutoTranslateAction } from '@/lib/db/auto-translate';

// Thiết lập giới hạn thời gian chạy cho Vercel (Max duration)
export const maxDuration = 300; // Cho phép API chạy tối đa 5 phút
export const dynamic = 'force-dynamic'; // Bỏ cache API

export async function GET(request: Request) {
  try {
    // Để bảo mật trên môi trường Production, Vercel gửi header Authorization kèm theo cấu hình CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
       return NextResponse.json({ error: 'Unauthorized CRON trigger' }, { status: 401 });
    }

    // Thời gian cách đây 24 tiếng
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Lấy các Kênh Đang Bật và (Chưa từng quét HOẶC đã quá 24h kể từ lần quét cuối)
    const channelsToSync = await db.query.youtubeSyncChannels.findMany({
       where: and(
         eq(youtubeSyncChannels.isActive, true),
         or(
           isNull(youtubeSyncChannels.lastSyncedAt),
           lte(youtubeSyncChannels.lastSyncedAt, twentyFourHoursAgo)
         )
       )
    });

    if (channelsToSync.length === 0) {
       return NextResponse.json({ success: true, message: 'Không có kênh nào cần quét ở thời điểm hiện tại.' });
    }

    const results = [];

    // Để đề phòng quá tải và timeout trên Serverless Vercel, mỗi lần cron chạy ta chỉ quét tối đa 3 kênh
    const batch = channelsToSync.slice(0, 3);
    
    for (const channel of batch) {
       // @ts-ignore - Hàm syncYoutubeChannelAction được thiết kế dùng chung
       const res = await syncYoutubeChannelAction(
           channel.channelUrl, 
           channel.filters as any, 
           channel.teamId, 
           channel.creatorId ? String(channel.creatorId) : ''
       );

       // Sau khi quét xong (dù thành công hay lỗi), vẫn phải cập nhật `lastSyncedAt` để không bị kẹt ở lần sau
       await db.update(youtubeSyncChannels).set({
          lastSyncedAt: new Date(),
          totalSynced: (channel.totalSynced || 0) + (res.count || 0),
          updatedAt: new Date()
       }).where(eq(youtubeSyncChannels.id, channel.id));

       // Dịch tự động nếu team bật tính năng này
       let autoTranslateTriggered = false;
       const isAutoTranslate = await getTeamAutoTranslateAction(channel.teamId);
       if (isAutoTranslate) {
         try {
           // Gọi chạy dịch 1 mẻ (15 video) tự động cho team này
           await batchTranslateTeamAiAction(channel.teamId);
           autoTranslateTriggered = true;
         } catch (e) {
           console.error('Auto translate error for team', channel.teamId, e);
         }
       }

       results.push({ 
         channelUrl: channel.channelUrl, 
         success: res.success, 
         error: res.error, 
         count: res.count || 0,
         autoTranslateTriggered
       });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã quét ${batch.length} kênh tự động.`, 
      results 
    });

  } catch (error: any) {
    console.error('Youtube Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
