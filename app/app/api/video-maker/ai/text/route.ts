import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { streamConnectorAction } from '@/lib/connect-hub/connector-service';

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
    const { model, messages, stream = false, temperature = 0.7 } = body;

    if (!model || typeof model !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu model name.' },
        { status: 400 }
      );
    }

    const [connIdStr, modelRealName] = model.split(':');
    
    if (connIdStr === 'mock') {
      if (stream) {
        return NextResponse.json({ success: false, error: 'Mock stream not supported.' }, { status: 400 });
      }
      return NextResponse.json({
        id: 'mock-chat-id',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'mock-text',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: "Đây là phản hồi giả lập (Mock) từ AI2Hero Connect Hub để bạn test giao diện. Nếu bạn cần dữ liệu thật (như tạo kịch bản/storyboard), vui lòng chọn Model API thật (như GPT-4o)."
            },
            finish_reason: 'stop'
          }
        ]
      });
    }

    const connectionId = parseInt(connIdStr, 10);
    if (isNaN(connectionId)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng model không hợp lệ.' },
        { status: 400 }
      );
    }

    // GỌI THÔNG QUA LÕI CONNECT HUB ĐỂ THỐNG NHẤT USAGE LOG & BẢO MẬT
    const actionResult = await streamConnectorAction({
      teamId: authResult.teamId,
      connectionId,
      actionSlug: 'chat_completion',
      input: {
        model: modelRealName,
        messages,
        temperature,
        stream
      },
      callerModule: 'hero-video-maker'
    });

    if (!actionResult.success) {
      return NextResponse.json(
        { success: false, error: actionResult.error },
        { status: 400 }
      );
    }

    if (stream && actionResult.streamResponse) {
      // Trả thẳng HTTP stream event response từ proxy provider
      return actionResult.streamResponse;
    }

    return NextResponse.json(actionResult.data);
    
  } catch (err: any) {
    console.error('[video-maker-ai-text] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    );
  }
}
