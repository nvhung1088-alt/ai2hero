import { NextRequest, NextResponse } from 'next/server';
import { validateAndPairLinkCode } from '@/lib/db/extension-actions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Mã liên kết không hợp lệ.' },
        { status: 400 }
      );
    }

    const result = await validateAndPairLinkCode(code);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      teamId: result.teamId,
      teamName: result.teamName,
      expiresAt: result.expiresAt
    });
  } catch (err: any) {
    console.error('[video-maker-auth-pair] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    );
  }
}
