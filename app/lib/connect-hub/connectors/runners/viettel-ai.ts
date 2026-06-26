export async function runViettelAi(
  creds: Record<string, string>,
  action: string,
  input: any
): Promise<any> {
  const token = creds.apiKey;
  if (!token) throw new Error('Thiếu Viettel AI Token.');

  if (action === 'text_to_speech') {
    const text = input.text;
    if (!text) throw new Error('Thiếu văn bản đầu vào.');

    const voice = input.voice || 'hn-quynhanh';
    const speed = input.speed || '1.0';

    const body = {
      text: text,
      voice: voice,
      speed: parseFloat(speed),
      tts_return_option: 2,
      token: token,
      without_filter: false
    };

    const response = await fetch('https://viettelai.vn/tts/speech_synthesis', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Lỗi Viettel AI: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    if (!data || !data.file_url) {
      throw new Error('Không nhận được file_url từ Viettel AI.');
    }

    const fileRes = await fetch(data.file_url);
    if (!fileRes.ok) {
      throw new Error(`Lỗi tải audio từ Viettel AI: ${fileRes.status}`);
    }

    const audioBuffer = await fileRes.arrayBuffer();

    return {
      audio: Buffer.from(audioBuffer).toString('base64'),
      format: 'mp3'
    };
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ.`);
}
