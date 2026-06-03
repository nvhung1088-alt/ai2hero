import { NextRequest, NextResponse } from 'next/server';
import { runActionAction } from '@/lib/db/connect-hub-actions';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const activeTeamIdStr = cookieStore.get('activeTeamId')?.value;
    if (!activeTeamIdStr) {
      return NextResponse.json(
        { success: false, error: 'Chưa xác định được Workspace hoạt động.' },
        { status: 400 }
      );
    }
    const teamId = parseInt(activeTeamIdStr);

    const body = await request.json().catch(() => ({}));
    const { connectionId, actionSlug, input, callerModule } = body;

    if (!connectionId || !actionSlug) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tham số bắt buộc connectionId hoặc actionSlug.' },
        { status: 400 }
      );
    }

    // Thực thi Server Action (logic bảo mật, mã hóa giải mã, kiểm tra tenant, ghi log đều gói gọn ở đây)
    const result = await runActionAction(teamId, {
      connectionId: parseInt(connectionId),
      actionSlug,
      input: input || {},
      callerModule: callerModule || 'api-gateway'
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (err: any) {
    console.error('[connect-hub/run-action POST] Lỗi:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi hệ thống khi gọi Action.' },
      { status: 500 }
    );
  }
}
