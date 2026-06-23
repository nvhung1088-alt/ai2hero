import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Thiếu hoặc sai định dạng header Authorization.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await verifyExtensionToken(token);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Token không hợp lệ hoặc đã hết hạn.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      teamId: authResult.teamId,
      userId: authResult.userId
    });
  } catch (err: any) {
    console.error('[video-maker-auth-check] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    );
  }
}
