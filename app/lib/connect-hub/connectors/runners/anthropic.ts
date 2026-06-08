/**
 * Runner Anthropic (Claude) — gọi Messages API trực tiếp.
 * Tuân thủ: system prompt tách riêng, timeout 15s, không log apiKey.
 */
export async function runAnthropic(
  creds: Record<string, string>,
  action: string,
  input: Record<string, any>
): Promise<any> {
  const apiKey = creds.apiKey;
  if (!apiKey) throw new Error('Thiếu Anthropic API Key.');

  const headers = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };

  if (action === 'chat_completion') {
    const model = input.model || 'claude-3-haiku-20240307';

    // Build messages, lọc bỏ role 'system' (Anthropic không chấp nhận trong mảng messages)
    let messages: { role: string; content: string }[];
    if (input.messages && Array.isArray(input.messages)) {
      messages = input.messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || '',
        }));
    } else {
      messages = [{ role: 'user', content: input.prompt || '' }];
    }

    const body: Record<string, any> = {
      model,
      max_tokens: input.max_tokens ? parseInt(input.max_tokens, 10) : 1024,
      messages,
    };
    
    // System prompt truyền riêng ở root payload
    if (input.system) {
      body.system = input.system;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`Anthropic API Error ${res.status}: ${errJson.error?.message || res.statusText}`);
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
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers,
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || `HTTP ${res.status}`;
        if (typeof errMsg === 'string' && apiKey) {
          errMsg = errMsg.replace(new RegExp(apiKey, 'g'), 'sk-...[REDACTED]');
        }
        throw new Error(errMsg);
      }
      return res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ trên Anthropic runner.`);
}
