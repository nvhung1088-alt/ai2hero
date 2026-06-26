'use server';

import { db } from './drizzle';
import { connectHubConnections } from './schema';
import { eq, and } from 'drizzle-orm';
import { runConnectorAction } from '../connect-hub/connector-service';

export async function generateLivePreviewAudioAction(teamId: number, engineSlug: string, voiceId: string) {
  try {
    if (engineSlug === 'edge-tts') {
      return { success: false, error: 'Edge-TTS là dịch vụ miễn phí xử lý ngầm (Offline), không hỗ trợ nghe thử Live trực tuyến.' };
    }
    
    // Trong HeroDub UI, tuỳ chọn OpenAI được gán value="connect-hub"
    if (engineSlug === 'connect-hub') {
      engineSlug = 'openai';
    }

    const text = "Xin chào, đây là giọng đọc mẫu tự động được cung cấp bởi hệ thống của ây ai tu hi rô.";

    // Lấy connection từ db
    const connections = await db.select().from(connectHubConnections).where(
      and(
        eq(connectHubConnections.teamId, teamId),
        eq(connectHubConnections.appSlug, engineSlug)
      )
    ).limit(1);

    if (!connections || connections.length === 0) {
      return { success: false, error: 'Chưa cấu hình API (hoặc API Key không chính xác) cho dịch vụ này.' };
    }

    const connectionId = connections[0].id;

    const res = await runConnectorAction({
      teamId,
      connectionId,
      actionSlug: 'text_to_speech',
      input: {
        text: text,
        voice: voiceId,
        speed: 1.0
      },
      callerModule: 'hero-dub-preview',
      isTest: true
    });

    if (!res.success) {
       return { success: false, error: res.error || 'Lỗi sinh âm thanh từ Connect Hub' };
    }

    const base64Audio = res.data?.audio;
    if (!base64Audio) {
       return { success: false, error: 'Không lấy được dữ liệu Audio' };
    }

    return { success: true, base64Audio };

  } catch (error: any) {
    console.error("Live Preview TTS Error:", error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}
