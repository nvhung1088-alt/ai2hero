export async function runElevenLabs(
  creds: Record<string, string>,
  action: string,
  input: any
): Promise<any> {
  const apiKey = creds.apiKey;
  if (!apiKey) throw new Error('Thiếu ElevenLabs API Key.');

  if (action === 'text_to_speech') {
    const text = input.text;
    if (!text) throw new Error('Thiếu văn bản đầu vào.');

    let voiceId = '21m00Tcm4TlvDq8ikWAM'; // Mặc định Rachel
    const voiceMap: Record<string, string> = {
      'Rachel': '21m00Tcm4TlvDq8ikWAM',
      'Clyde': '2EiwWnXFnvU5JabPnv8n',
      'Domi': 'AZnzlk1XvdvUeBnXmlld',
      'Bella': 'EXAVITQu4vr4xnSDxMaL',
      'Antoni': 'ErXwobaYiN019PkySvjV',
      'Elli': 'MF3mGyEYCl7XYWbV9V6O',
      'Josh': 'TxGEqnHWrfWFTfGW9XjX',
      'Arnold': 'VR6AewLTigWG4xSOukaG'
    };
    
    if (input.voice) {
      voiceId = voiceMap[input.voice] || input.voice;
    }

    const body = {
      text: text,
      model_id: "eleven_multilingual_v2"
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Lỗi ElevenLabs: ${err.detail?.message || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      audio: Buffer.from(audioBuffer).toString('base64'),
      format: 'mp3'
    };
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ.`);
}
