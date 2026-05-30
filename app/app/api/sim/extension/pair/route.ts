import { NextRequest, NextResponse } from 'next/server';
import { validateAndPairLinkCode } from '@/lib/db/extension-actions';

// CORS headers — Extension ID không cố định nên phải allow *
// Bảo mật được đảm bảo bằng Bearer Token (không có token = không có data)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linkCode, deviceName } = body;

    if (!linkCode || typeof linkCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã liên kết' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = await validateAndPairLinkCode(linkCode.trim());

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        accessToken: result.accessToken,
        teamId: result.teamId,
        teamName: result.teamName,
        expiresAt: result.expiresAt,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[pair/route] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
