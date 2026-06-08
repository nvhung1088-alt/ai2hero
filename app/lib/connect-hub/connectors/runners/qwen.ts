import { ActionResult } from '../types';

const QWEN_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export async function runQwen(
  actionSlug: string,
  input: Record<string, any>,
  credentials: Record<string, string>
): Promise<ActionResult> {
  const apiKey = credentials?.apiKey;
  if (!apiKey) {
    throw new Error('Thiếu DashScope API Key.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    if (actionSlug === 'chat_completion') {
      const model = input.model || 'qwen-plus';
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

      const response = await fetch(`${QWEN_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        data,
      };
    }

    if (actionSlug === 'list_models') {
      const response = await fetch(`${QWEN_API_BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
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
      throw new Error('Timeout: Phản hồi từ Qwen quá chậm (quá 15s).');
    }
    throw new Error(`Lỗi Qwen: ${error.message}`);
  }
}
