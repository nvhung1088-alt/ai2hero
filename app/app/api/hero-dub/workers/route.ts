import { NextResponse } from 'next/server';
import { validateAndPairDubWorkerAction } from '@/lib/db/hero-dub-actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, deviceName, platform, version } = body;

    if (!code) {
      return NextResponse.json({ error: 'Mã liên kết (code) là bắt buộc' }, { status: 400 });
    }

    const result = await validateAndPairDubWorkerAction({
      code,
      deviceName: deviceName || 'Local Worker',
      platform: platform || 'windows',
      version: version || '1.0.0',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      workerId: result.workerId,
      accessToken: result.accessToken,
      teamId: result.teamId,
      teamName: result.teamName,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('[API Workers] Error pairing worker:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
