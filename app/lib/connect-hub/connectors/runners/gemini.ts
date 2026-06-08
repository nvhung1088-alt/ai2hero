/**
 * Runner Google Gemini — gọi REST API trực tiếp, không dùng SDK.
 * Tuân thủ: Timeout 15s, không log apiKey, che thông tin lỗi sensitive.
 */
export async function runGemini(
  creds: Record<string, string>,
  action: string,
  input: Record<string, any>
): Promise<any> {
  const apiKey = creds.apiKey;
  if (!apiKey) throw new Error('Thiếu Gemini API Key.');

  if (action === 'chat_completion') {
    const model = input.model || 'gemini-2.0-flash';
    
    // Build contents từ messages hoặc prompt đơn
    let contents: { role: string; parts: { text: string }[] }[];
    if (input.messages && Array.isArray(input.messages)) {
      contents = input.messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user', // Gemini dùng 'model' thay vì 'assistant'
        parts: [{ text: m.content || '' }],
      }));
    } else {
      contents = [{ role: 'user', parts: [{ text: input.prompt || '' }] }];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: controller.signal,
        }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Gemini API Error ${res.status}: ${errText}`);
      }
      return res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (action === 'list_models') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { signal: controller.signal }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let errMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || `HTTP ${res.status}`;
        if (typeof errMsg === 'string' && apiKey) {
          errMsg = errMsg.replace(new RegExp(apiKey, 'g'), 'sk-...[REDACTED]');
        }
        throw new Error(errMsg);
      }
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ trên Gemini runner.`);
}
