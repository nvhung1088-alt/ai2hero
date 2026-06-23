import { runConnectorAction } from '@/lib/connect-hub/connector-service';
import { uploadFile } from '@/lib/storage/r2';
import { db } from '@/lib/db/drizzle';
import { connectHubConnections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// AI DEEP THINKING STRIPPER (DEEPSEEK R1 COMPATIBILITY)
// ============================================================================

export function stripThink(text: string): string {
  if (!text) return '';
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

async function imageUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không thể tải ảnh từ URL: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// ============================================================================
// HERO AI TEXT
// ============================================================================

export class HeroAiText {
  private teamId: number;
  private connectionId: number;
  private modelRealName: string;

  constructor(teamId: number, modelString: string) {
    this.teamId = teamId;
    const [connIdStr, modelRealName] = modelString.split(':');
    this.connectionId = connIdStr === 'mock' ? 0 : parseInt(connIdStr, 10);
    this.modelRealName = modelRealName || '';
  }

  async invoke(params: { system?: string; messages: { role: string; content: string }[]; temperature?: number }) {
    if (this.connectionId === 0) {
      return { text: "Đây là nội dung văn bản giả lập (Mock) từ AI2Hero Connect Hub để test." };
    }

    const fullMessages = params.system
      ? [{ role: 'system', content: params.system }, ...params.messages]
      : params.messages;

    const actionResult = await runConnectorAction({
      teamId: this.teamId,
      connectionId: this.connectionId,
      actionSlug: 'chat_completion',
      input: {
        model: this.modelRealName,
        messages: fullMessages,
        temperature: params.temperature ?? 0.7,
        stream: false
      },
      callerModule: 'hero-video-maker'
    });

    if (!actionResult.success) {
      throw new Error(actionResult.error || 'Lỗi gọi AI Text');
    }

    const content = actionResult.data?.choices?.[0]?.message?.content || actionResult.data?.content || '';
    return { text: stripThink(content) };
  }
}

// ============================================================================
// HERO AI IMAGE
// ============================================================================

export class HeroAiImage {
  private teamId: number;
  private connectionId: number;
  private modelRealName: string;

  constructor(teamId: number, modelString: string) {
    this.teamId = teamId;
    const [connIdStr, modelRealName] = modelString.split(':');
    this.connectionId = connIdStr === 'mock' ? 0 : parseInt(connIdStr, 10);
    this.modelRealName = modelRealName || '';
  }

  async run(params: { prompt: string; resolution?: string; referenceImages?: string[] }) {
    const resolution = params.resolution || '1024x1024';

    if (this.connectionId === 0) {
      const mockBase64 = await imageUrlToBase64('https://picsum.photos/1024/1024');
      return { base64: mockBase64, cloudUrl: 'https://picsum.photos/1024/1024' };
    }

    const inputData: any = {
      model: this.modelRealName,
      prompt: params.prompt,
      resolution,
      size: resolution
    };

    if (params.referenceImages && params.referenceImages.length > 0) {
      inputData.images = params.referenceImages;
    }

    const actionResult = await runConnectorAction({
      teamId: this.teamId,
      connectionId: this.connectionId,
      actionSlug: 'generate_image',
      input: inputData,
      callerModule: 'hero-video-maker'
    });

    if (!actionResult.success) {
      throw new Error(actionResult.error || 'Lỗi gọi AI Image');
    }

    const imageUrl = actionResult.data?.data?.[0]?.url || actionResult.data?.url;
    if (!imageUrl) {
      throw new Error('Provider không trả về URL ảnh hợp lệ.');
    }

    const base64Image = await imageUrlToBase64(imageUrl);

    // Tự động upload lên R2
    let cloudUrl = '';
    try {
      const buffer = Buffer.from(base64Image, 'base64');
      const filename = `toonflow/images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      cloudUrl = await uploadFile(buffer, filename, 'image/png');

      // Tự động đồng bộ lên Google Drive (nếu có connection)
      const [driveConn] = await db
        .select()
        .from(connectHubConnections)
        .where(
          and(
            eq(connectHubConnections.teamId, this.teamId),
            eq(connectHubConnections.appSlug, 'google-drive'),
            eq(connectHubConnections.status, 'connected')
          )
        )
        .limit(1);

      if (driveConn) {
        await runConnectorAction({
          teamId: this.teamId,
          connectionId: driveConn.id,
          actionSlug: 'upload_file',
          input: {
            filename: filename.split('/').pop(),
            content: base64Image,
            contentType: 'image/png'
          },
          callerModule: 'api-gateway'
        });
      }
    } catch (e) {
      console.error('[HeroAiImage] Cloud upload error (non-blocking):', e);
    }

    return { base64: base64Image, cloudUrl: cloudUrl || imageUrl };
  }
}

// ============================================================================
// HERO AI VIDEO
// ============================================================================

export class HeroAiVideo {
  private teamId: number;
  private connectionId: number;
  private modelRealName: string;

  constructor(teamId: number, modelString: string) {
    this.teamId = teamId;
    const [connIdStr, modelRealName] = modelString.split(':');
    this.connectionId = connIdStr === 'mock' ? 0 : parseInt(connIdStr, 10);
    this.modelRealName = modelRealName || '';
  }

  async run(params: { prompt: string; imageBase64?: string }) {
    if (this.connectionId === 0) {
      return { success: true, taskId: 'mock-video-task-id' };
    }

    const actionResult = await runConnectorAction({
      teamId: this.teamId,
      connectionId: this.connectionId,
      actionSlug: 'generate_video',
      input: {
        model: this.modelRealName,
        prompt: params.prompt,
        image: params.imageBase64
      },
      callerModule: 'hero-video-maker'
    });

    if (!actionResult.success) {
      throw new Error(actionResult.error || 'Lỗi gọi AI Video');
    }

    return actionResult.data;
  }
}

// ============================================================================
// HERO AI AUDIO (Voice Over / TTS)
// ============================================================================

export class HeroAiAudio {
  private teamId: number;
  private connectionId: number;
  private modelRealName: string;

  constructor(teamId: number, modelString: string) {
    this.teamId = teamId;
    const [connIdStr, modelRealName] = modelString.split(':');
    this.connectionId = connIdStr === 'mock' ? 0 : parseInt(connIdStr, 10);
    this.modelRealName = modelRealName || '';
  }

  async run(params: { text: string; voice?: string }) {
    if (this.connectionId === 0) {
      return { success: true, audioUrl: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' };
    }

    const actionResult = await runConnectorAction({
      teamId: this.teamId,
      connectionId: this.connectionId,
      actionSlug: 'text_to_speech',
      input: {
        model: this.modelRealName,
        input: params.text,
        voice: params.voice || 'alloy'
      },
      callerModule: 'hero-video-maker'
    });

    if (!actionResult.success) {
      throw new Error(actionResult.error || 'Lỗi gọi AI Audio (TTS)');
    }

    // Giả sử API TTS trả về base64 audio.
    const base64Audio = actionResult.data?.audioBase64 || actionResult.data?.content;
    let cloudUrl = actionResult.data?.url || '';

    if (!cloudUrl && base64Audio) {
      try {
        const buffer = Buffer.from(base64Audio, 'base64');
        const filename = `toonflow/audio/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
        cloudUrl = await uploadFile(buffer, filename, 'audio/mpeg');
      } catch (e) {
        console.error('[HeroAiAudio] Cloud upload error:', e);
      }
    }

    return { 
      success: true, 
      audioUrl: cloudUrl || 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
      base64: base64Audio
    };
  }
}
