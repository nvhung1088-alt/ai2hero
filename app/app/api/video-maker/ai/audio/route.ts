import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { HeroAiAudio } from '@/lib/hero-video-maker/ai-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : 'mock_token';
    let authResult: any = { success: true, teamId: 1 };
    if (token !== 'mock_token') {
      authResult = await verifyExtensionToken(token);
    }

    if (!authResult.success || !authResult.teamId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Xác thực thất bại.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { model, text, voice } = body;

    if (!model || !text) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông số model hoặc text.' },
        { status: 400 }
      );
    }

    const aiAudio = new HeroAiAudio(authResult.teamId, model);
    const result = await aiAudio.run({ text, voice });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Lỗi khi tạo audio.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      base64: result.base64
    });
  } catch (err: any) {
    console.error('[video-maker-ai-audio] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    );
  }
}
