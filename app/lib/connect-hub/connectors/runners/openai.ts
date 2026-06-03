export async function runOpenAI(
  creds: Record<string, string>,
  action: string,
  input: any
): Promise<any> {
  const apiKey = creds.apiKey;
  const orgId = creds.organizationId;
  
  if (!apiKey) throw new Error('Thiếu OpenAI API Key trong thông tin xác thực.');
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  if (orgId) headers['OpenAI-Organization'] = orgId;

  if (action === 'chat_completion') {
    // Ưu tiên dùng input.messages (dành cho logic hội thoại phức tạp)
    // Nếu không có, fallback sang dùng input.prompt (dành cho input đơn giản)
    const prompt = input.prompt || 'Xin chào';
    const messages = input.messages || [{ role: 'user', content: prompt }];
    
    const body = {
      model: input.model || 'gpt-3.5-turbo',
      messages,
      temperature: input.temperature ?? 0.7,
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${err.error?.message || response.statusText}`);
    }
    
    return response.json();
  }

  if (action === 'generate_image') {
    const prompt = input.prompt;
    if (!prompt) throw new Error('Thiếu "prompt" để yêu cầu OpenAI tạo ảnh.');
    
    const body = {
      model: input.model || 'dall-e-3', 
      prompt,
      n: input.n || 1,
      size: input.size || '1024x1024'
    };
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${err.error?.message || response.statusText}`);
    }
    
    return response.json();
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ trên OpenAI runner.`);
}
