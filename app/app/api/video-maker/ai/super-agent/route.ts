import { NextRequest, NextResponse } from 'next/server';
import { HeroAiText } from '@/lib/hero-video-maker/ai-utils';
import { HeroAgentOrchestrator } from '@/lib/hero-video-maker/agent-orchestrator';
import { MemoryManager } from '@/lib/hero-video-maker/memory-manager';
import { updateVideoProject } from '@/lib/db/video-maker-actions';
import presetsData from '@/lib/hero-video-maker/presets.json';

// Chạy Edge Runtime để hỗ trợ Streaming SSE mượt mà nếu có thể
export const maxDuration = 300; // 5 minutes (requires Pro plan on Vercel)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId, projectId, config } = body;

    if (!teamId || !projectId || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Cập nhật cấu hình vào Database dự án
    await updateVideoProject(parseInt(teamId, 10), projectId, {
      artStyle: config.artStyleId,
      directorManual: config.storySkillId,
      imageModel: config.imageModel,
      videoModel: config.videoModel
    });

    // Extract prompt constraints from presets
    const artStyle = presetsData.artSkills.find(s => s.id === config.artStyleId);
    const storySkill = presetsData.storySkills.find(s => s.id === config.storySkillId);
    
    const constraintPrompt = `
      QUY TẮC BẮT BUỘC (DIRECTOR MANUAL):
      ${storySkill?.prompt || 'Không có hướng dẫn đạo diễn.'}
      
      PHONG CÁCH TRỰC QUAN (ART STYLE):
      ${artStyle?.prompt || 'Không có hướng dẫn mỹ thuật.'}
    `.trim();

    // Setup Streaming SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const aiText = new HeroAiText(parseInt(teamId, 10), config.videoModel);
          const memory = new MemoryManager(projectId);
          
          sendEvent({ type: 'step', agentRole: 'orchestrator', status: 'thinking', message: 'Bắt đầu Super Agent Auto-Pilot...' });
          
          // Ghi cấu hình đạo diễn vào bộ nhớ (System Context)
          await memory.appendChatMessage({
            role: 'system',
            content: `Bạn là Super Agent. Đây là cấu hình Sổ Tay Đạo Diễn và Art Style cho toàn bộ dự án này:\n${constraintPrompt}`,
            timestamp: Date.now()
          });

          // Inject user command to force full pipeline
          const userCommand = "Tạo kịch bản, trích xuất tài sản nhân vật bối cảnh, và lập storyboard chi tiết cho tôi. Áp dụng nghiêm ngặt Sổ tay Đạo diễn và Art Style đã cấu hình.";

          const orchestrator = new HeroAgentOrchestrator(aiText, projectId, parseInt(teamId, 10));
          
          await orchestrator.processMessage({
            userMessage: userCommand,
            projectId: projectId,
            onEvent: (event) => sendEvent(event)
          });

          sendEvent({ type: 'done', message: 'Auto-Pilot hoàn tất!' });
          controller.close();
        } catch (error: any) {
          sendEvent({ type: 'step', agentRole: 'orchestrator', status: 'error', message: `Lỗi: ${error.message}` });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Super Agent error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
