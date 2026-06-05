const CHIASEGPU_BASE_URL = 'https://api.vilao.ai/v1';

export async function runChiaSeGPU(
  _creds: Record<string, string>, // Không dùng creds, key từ ENV
  action: string,
  input: any
): Promise<any> {
  // Fallback to local hardcoded key if Vercel environment variable is missing
  const apiKey = process.env.CHIASEGPU_API_KEY || 'sk-85ab4cf3cf86c3ed380f5b9f3f27d24647e2fd3330a3b0b50ec85afd522b12e4';
  if (!apiKey) {
    throw new Error('Chưa cấu hình CHIASEGPU_API_KEY trong biến môi trường server. Vui lòng liên hệ quản trị viên.');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  if (action === 'chat_completion') {
    const prompt = input.prompt || 'Xin chào';
    const messages = input.messages || [{ role: 'user', content: prompt }];
    
    const body = {
      model: input.model || 'gpt-3.5-turbo',
      messages,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.max_tokens ?? undefined,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${CHIASEGPU_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.error?.message || response.statusText;
        if (msg.includes('model_not_found') || msg.includes('deprecated')) {
          throw new Error(`Model "${input.model}" đã bị dừng hỗ trợ. Vui lòng chọn model khác.`);
        }
        throw new Error(`ChiaSeGPU API Error (${response.status}): ${msg}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  if (action === 'list_models') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${CHIASEGPU_BASE_URL}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`ChiaSeGPU API Error (${response.status}): ${err.error?.message || response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ trên ChiaSeGPU runner.`);
}
