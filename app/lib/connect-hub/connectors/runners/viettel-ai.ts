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
      tts_return_option: 2 // Yêu cầu trả file audio trực tiếp
    };

    const response = await fetch('https://viettelai.vn/tts/speech_synthesis', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Lỗi Viettel AI: ${response.status} - ${errText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      audio: Buffer.from(audioBuffer).toString('base64'),
      format: 'wav'
    };
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ.`);
}
