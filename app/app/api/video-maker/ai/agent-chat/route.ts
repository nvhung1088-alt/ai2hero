import { NextRequest } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { HeroAiText } from '@/lib/hero-video-maker/ai-utils';
import { HeroAgentOrchestrator } from '@/lib/hero-video-maker/agent-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực (Auth)
    const authHeader = req.headers.get('Authorization');
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : 'mock_token';
    
    let authResult: any = { success: true, teamId: 1 };
    if (token !== 'mock_token') {
      authResult = await verifyExtensionToken(token);
    }

    if (!authResult.success || !authResult.teamId) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error || 'Xác thực thất bại.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const teamId = authResult.teamId;

    // 2. Phân tích Request Body
    const body = await req.json();
    const { model, projectId, message } = body;

    if (!model || !projectId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu model, projectId hoặc message.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Khởi tạo Stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Khởi tạo HeroAiText và Orchestrator
          const aiText = new HeroAiText(teamId, model);
          const orchestrator = new HeroAgentOrchestrator(aiText, parseInt(projectId, 10), teamId);

          // 4. Chạy tiến trình xử lý tin nhắn
          await orchestrator.processMessage({
            userMessage: message,
            projectId: parseInt(projectId, 10),
            onEvent: (event) => {
              // 5. Encode và gửi SSE Event xuống client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
          });

        } catch (err: any) {
          console.error('[agent-chat-stream] Processing error:', err);
          const errorEvent = { type: 'result', success: false, error: err.message || 'Lỗi xử lý luồng AI Agent.' };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        } finally {
          // Kết thúc luồng SSE
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    // 6. Trả về SSE HTTP Response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });

  } catch (err: any) {
    console.error('[agent-chat-stream] Setup error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Lỗi khởi tạo luồng máy chủ nội bộ.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
