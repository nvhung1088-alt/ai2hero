export async function runFptAi(
  creds: Record<string, string>,
  action: string,
  input: any
): Promise<any> {
  const apiKey = creds.apiKey;
  if (!apiKey) throw new Error('Thiếu FPT AI API Key.');

  if (action === 'text_to_speech') {
    const text = input.text;
    if (!text) throw new Error('Thiếu văn bản đầu vào.');

    const voice = input.voice || 'banmai';
    const speed = input.speed || '0';

    const response = await fetch('https://api.fpt.ai/hmi/tts/v5', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'speed': speed,
        'voice': voice
      },
      body: text
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Lỗi FPT AI: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    if (data.error !== 0) {
      throw new Error(`FPT AI trả về lỗi: ${data.message}`);
    }

    const audioUrl = data.async;
    if (!audioUrl) throw new Error('Không nhận được Audio URL từ FPT AI.');

    // Chờ 1 chút để FPT gen xong audio (thường tốn 1-3s tùy độ dài)
    // Để an toàn, polling 5 lần, mỗi lần cách nhau 2s
    let audioBuffer = null;
    let maxRetries = 10;
    while (maxRetries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const audioRes = await fetch(audioUrl);
      if (audioRes.ok && audioRes.headers.get('content-type')?.includes('audio')) {
         const arrBuf = await audioRes.arrayBuffer();
         audioBuffer = Buffer.from(arrBuf);
         break;
      }
      maxRetries--;
    }

    if (!audioBuffer) {
       throw new Error('Timeout: Không tải được audio từ FPT AI.');
    }

    return {
      audio: audioBuffer.toString('base64'),
      format: 'mp3'
    };
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ.`);
}
