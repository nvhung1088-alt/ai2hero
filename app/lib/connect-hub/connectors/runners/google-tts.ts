export async function runGoogleTts(
  creds: Record<string, string>,
  action: string,
  input: any
): Promise<any> {
  const apiKey = creds.apiKey;
  if (!apiKey) throw new Error('Thiếu Google Cloud API Key.');

  if (action === 'text_to_speech') {
    const text = input.text;
    if (!text) throw new Error('Thiếu văn bản đầu vào.');

    const voiceName = input.voice || 'vi-VN-Wavenet-A';
    const languageCode = voiceName.substring(0, 5); // vd: 'vi-VN'

    const body = {
      input: { text: text },
      voice: { languageCode: languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' }
    };

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Lỗi Google TTS: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.audioContent) {
      throw new Error('Google TTS không trả về nội dung audio.');
    }

    return {
      audio: data.audioContent, // Google TTS trả sẵn chuỗi base64
      format: 'mp3'
    };
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ.`);
}
