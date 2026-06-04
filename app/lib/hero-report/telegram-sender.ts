/**
 * Gửi tin nhắn thực tế tới Telegram Bot API
 * Tự động fallback sang tin nhắn dạng văn bản thuần nếu định dạng Markdown lỗi
 */
export async function sendTelegramMessage(
  botToken: string, 
  chatId: string, 
  text: string
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
      signal: AbortSignal.timeout(10000) // Timeout 10s tránh treo tiến trình Serverless
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }

    // Nếu Telegram báo lỗi 400 (thường do lỗi parse cú pháp Markdown vì ký tự đặc biệt)
    // Thực hiện gửi lại dưới dạng text thuần để đảm bảo tin nhắn không bị thất lạc
    if (response.status === 400) {
      console.warn('Telegram Markdown parse error, falling back to plain text send...');
      
      const fallbackResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text // Gửi không kèm parse_mode
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      const fallbackData = await fallbackResponse.json();
      if (fallbackResponse.ok && fallbackData.ok) {
        return { ok: true, messageId: fallbackData.result?.message_id };
      }
      return { ok: false, error: fallbackData.description || 'Lỗi gửi tin nhắn fallback' };
    }

    return { ok: false, error: data.description || 'Lỗi gửi tin nhắn Telegram' };
  } catch (error: any) {
    console.error('Error in sendTelegramMessage:', error);
    return { ok: false, error: error.message || 'Lỗi kết nối tới Telegram Bot API' };
  }
}
