import { ActionResult } from '../types';

const DEEPSEEK_API_BASE = 'https://api.deepseek.com';

export async function runDeepSeek(
  actionSlug: string,
  input: Record<string, any>,
  credentials: Record<string, string>
): Promise<ActionResult> {
  const apiKey = credentials?.apiKey;
  if (!apiKey) {
    throw new Error('Thiếu DeepSeek API Key.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    if (actionSlug === 'chat_completion') {
      const model = input.model || 'deepseek-chat';
      let messages: any[] = [];

      if (input.messages && typeof input.messages === 'string') {
        try {
          messages = JSON.parse(input.messages);
        } catch (e) {
          throw new Error('Trường messages phải là mảng JSON hợp lệ.');
        }
      } else if (Array.isArray(input.messages)) {
        messages = input.messages;
      } else if (input.prompt) {
        messages = [{ role: 'user', content: input.prompt }];
      } else {
        throw new Error('Cần cung cấp "prompt" hoặc "messages".');
      }

      const requestPayload: any = {
        model,
        messages,
      };
      if (input.response_format) {
        requestPayload.response_format = input.response_format;
      }
      if (input.temperature !== undefined) {
        requestPayload.temperature = input.temperature;
      }
      if (input.max_tokens) {
        requestPayload.max_tokens = input.max_tokens;
      }

      const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || `HTTP ${response.status}`;
        if (typeof errMsg === 'string' && apiKey) {
          errMsg = errMsg.replace(new RegExp(apiKey, 'g'), 'sk-...[REDACTED]');
        }
        throw new Error(errMsg);
      }

      return {
        success: true,
        data,
      };
    }

    if (actionSlug === 'list_models') {
      const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errMsg = data.error?.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || `HTTP ${response.status}`;
        if (typeof errMsg === 'string' && apiKey) {
          errMsg = errMsg.replace(new RegExp(apiKey, 'g'), 'sk-...[REDACTED]');
        }
        throw new Error(errMsg);
      }

      return {
        success: true,
        data,
      };
    }

    throw new Error(`Action "${actionSlug}" chưa được hỗ trợ.`);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Timeout: Phản hồi từ DeepSeek quá chậm (quá 120s).');
    }
    throw new Error(`Lỗi DeepSeek: ${error.message}`);
  }
}
