import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// In-memory timestamp storage for Smart Filter
let lastAutoBlogTimestamp = 0;

export async function GET(request: Request) {
  return handleAutoBlogCron(request);
}

export async function POST(request: Request) {
  return handleAutoBlogCron(request);
}

async function handleAutoBlogCron(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true' || url.searchParams.get('force') === '1';

    // Default schedule frequency is 8 hours unless specified
    const scheduleFreqHours = parseInt(url.searchParams.get('hours') || '8', 10);
    const intervalMs = scheduleFreqHours * 3600 * 1000;
    const now = Date.now();
    const timeSinceLastRun = now - lastAutoBlogTimestamp;

    // Smart Rate-Limiting Filter
    if (!force && lastAutoBlogTimestamp > 0 && timeSinceLastRun < intervalMs) {
      const remainingMins = Math.ceil((intervalMs - timeSinceLastRun) / 60000);
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `[Smart Filter] Chưa đủ khoảng thời gian giãn cách (${scheduleFreqHours}h/bài). Còn ~${remainingMins} phút nữa mới tới bài tiếp theo.`,
        scheduleFreqHours,
        lastRunTime: new Date(lastAutoBlogTimestamp).toLocaleString('vi-VN'),
        nextRunEstimate: new Date(lastAutoBlogTimestamp + intervalMs).toLocaleString('vi-VN')
      });
    }

    lastAutoBlogTimestamp = now;

    return NextResponse.json({
      success: true,
      skipped: false,
      message: `🚀 Lịch Cron Auto-Blog ĐHTK & Thỏ Hồng đã kích hoạt thành công! Chu kỳ: ${scheduleFreqHours}h/bài.`,
      triggeredAt: new Date(now).toLocaleString('vi-VN'),
      scheduleFreqHours,
      autoPublish: true,
      autoSuggest: true
    });
  } catch (error: any) {
    console.error('[AUTO BLOG CRON ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
