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

  if (action === 'generate_image') {
    const model = input.model || 'gemini-2.5-flash-image';
    const prompt = input.prompt || 'Please edit and clean this image without text.';
    
    const parts: any[] = [{ text: prompt }];

    // Xử lý attachments (base64 hoặc URL)
    if (input.attachments && Array.isArray(input.attachments)) {
      for (const att of input.attachments) {
        if (typeof att === 'string') {
          if (att.startsWith('data:image/')) {
            const matches = att.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inline_data: { mime_type: matches[1], data: matches[2] }
              });
            }
          } else if (att.startsWith('http://') || att.startsWith('https://')) {
            // Tải ảnh từ URL sang base64
            try {
              const imgRes = await fetch(att);
              if (imgRes.ok) {
                const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
                const arrayBuffer = await imgRes.arrayBuffer();
                const b64 = Buffer.from(arrayBuffer).toString('base64');
                parts.push({
                  inline_data: { mime_type: mimeType, data: b64 }
                });
              }
            } catch (e) {
              console.warn('[Gemini Runner] Không thể tải ảnh từ URL:', att, e);
            }
          }
        } else if (att && typeof att === 'object') {
          const rawData = att.data || att.base64 || '';
          const mimeType = att.mimeType || att.type || 'image/jpeg';
          const cleanB64 = rawData.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
          if (cleanB64) {
            parts.push({
              inline_data: { mime_type: mimeType, data: cleanB64 }
            });
          }
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout cho sinh ảnh

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Gemini Image API Error ${res.status}: ${errText}`);
      }

      const resJson = await res.json();
      const firstCandidate = resJson.candidates?.[0];
      const resParts = firstCandidate?.content?.parts || [];

      let imageUrl = '';
      for (const p of resParts) {
        const inline = p.inlineData || p.inline_data;
        if (inline && inline.data) {
          const mime = inline.mimeType || inline.mime_type || 'image/jpeg';
          imageUrl = `data:${mime};base64,${inline.data}`;
          break;
        }
        if (p.text && !imageUrl) {
          // Kiểm tra nếu có link ảnh trong text
          const m = p.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
          if (m) imageUrl = m[1];
        }
      }

      return {
        success: true,
        image_url: imageUrl,
        url: imageUrl,
        data: [{ url: imageUrl }],
        raw: resJson
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ trên Gemini runner.`);
}

