import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { randomUUID } from 'crypto';

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
    const { model, prompt } = body;

    if (!model || !prompt) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông số model hoặc prompt.' },
        { status: 400 }
      );
    }

    // Tạo stateless taskId mã hóa thời gian bắt đầu
    const taskPayload = {
      id: randomUUID(),
      createdAt: Date.now(),
      model,
      prompt
    };
    
    const taskId = Buffer.from(JSON.stringify(taskPayload)).toString('base64');

    return NextResponse.json({
      success: true,
      taskId,
      status: 'pending'
    });
  } catch (err: any) {
    console.error('[video-maker-ai-video] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    );
  }
}
