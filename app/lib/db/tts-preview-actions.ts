'use server';

import { db } from './drizzle';
import { connectHubConnections } from './schema';
import { eq, and } from 'drizzle-orm';
import { decryptField } from '../sim-crypto';

export async function generateLivePreviewAudioAction(teamId: number, engineSlug: string, voiceId: string) {
  try {
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

    const credentialsStr = decryptField(connections[0].encryptedCredentials) || '{}';
    const credentials = JSON.parse(credentialsStr);

    let base64Audio = '';

    if (engineSlug === 'viettel-ai') {
      const token = credentials.apiKey;
      if (!token) throw new Error("Thiếu token Viettel AI");

      const res = await fetch("https://viettelai.vn/tts/speech_synthesis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "*/*"
        },
        body: JSON.stringify({
          text: text,
          voice: voiceId,
          speed: 1.0,
          tts_return_option: 2, // 2 = Trả về file_url
          token: token,
          without_filter: false
        })
      });
      if (!res.ok) throw new Error(`Lỗi API Viettel: ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      let arrayBuffer: ArrayBuffer;

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.file_url) {
           const fileRes = await fetch(data.file_url);
           if (!fileRes.ok) throw new Error(`Lỗi tải audio: ${fileRes.status}`);
           arrayBuffer = await fileRes.arrayBuffer();
        } else {
           throw new Error("Không lấy được URL audio từ Viettel");
        }
      } else {
        arrayBuffer = await res.arrayBuffer();
      }
      base64Audio = Buffer.from(arrayBuffer).toString('base64');
    } 
    else if (engineSlug === 'fpt-ai') {
      const apiKey = credentials.apiKey;
      if (!apiKey) throw new Error("Thiếu API Key FPT AI");

      const res = await fetch("https://api.fpt.ai/hmi/tts/v5", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "voice": voiceId,
          "speed": "",
          "format": "mp3"
        },
        body: text
      });
      if (!res.ok) throw new Error(`Lỗi API FPT: ${res.status}`);
      const data = await res.json();
      if (data && data.async === false && data.audiourl) {
         const fileRes = await fetch(data.audiourl);
         const arrayBuffer = await fileRes.arrayBuffer();
         base64Audio = Buffer.from(arrayBuffer).toString('base64');
      } else {
         throw new Error("Không lấy được URL audio từ FPT");
      }
    }
    else if (engineSlug === 'elevenlabs') {
      const apiKey = credentials.apiKey;
      if (!apiKey) throw new Error("Thiếu API Key ElevenLabs");

      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });
      if (!res.ok) throw new Error(`Lỗi API ElevenLabs: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      base64Audio = Buffer.from(arrayBuffer).toString('base64');
    }
    else {
      return { success: false, error: 'Chưa hỗ trợ sinh mẫu live cho ' + engineSlug };
    }

    if (!base64Audio) {
       return { success: false, error: 'Không thể xử lý luồng Audio' };
    }

    return { success: true, base64Audio };

  } catch (error: any) {
    console.error("Live Preview TTS Error:", error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}
