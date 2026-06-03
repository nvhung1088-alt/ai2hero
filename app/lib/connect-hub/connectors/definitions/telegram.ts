import { ConnectorDefinition } from '../types';

export const telegramConnector: ConnectorDefinition = {
  slug: 'telegram',
  name: 'Telegram',
  icon: 'Send',
  category: 'chat',
  description: 'Gửi tin nhắn thông báo tự động vào nhóm chat hoặc cá nhân qua Telegram Bot.',
  setupGuide: `
    <div class="space-y-4">
      <div class="rounded-md bg-blue-500/10 p-4 border border-blue-500/20">
        <h4 class="text-sm font-semibold text-blue-600 mb-2">🤖 Hướng dẫn lấy Telegram Bot Token</h4>
        <ol class="list-decimal list-inside text-sm text-muted-foreground space-y-2 mt-2">
          <li>Mở ứng dụng Telegram và tìm kiếm <a href="https://t.me/BotFather" target="_blank" class="text-blue-500 hover:underline font-medium">@BotFather</a> (có tích xanh).</li>
          <li>Gõ lệnh <code class="bg-muted px-1.5 py-0.5 rounded text-primary">/newbot</code>, sau đó nhập <b>Tên hiển thị</b> của Bot (Vd: <i class="text-foreground">ai2hero</i>).</li>
          <li>Tiếp theo, nhập <b>Username</b> cho Bot. <span class="text-amber-500 font-medium">Lưu ý: Bắt buộc phải kết thúc bằng chữ <code>bot</code></span> (Vd: <code class="bg-muted px-1 py-0.5 rounded text-foreground">ai2hero_bot</code>).</li>
          <li>Khi thành công, BotFather sẽ cấp một đoạn mã HTTP API (Vd: <code>8804769040:AAHLIKxpN4...</code>). Đó chính là <b>Bot Token</b>.</li>
          <li>Sao chép toàn bộ chuỗi Token đó và dán vào ô bên dưới.</li>
        </ol>
      </div>
      
      <div class="rounded-md bg-amber-500/10 p-4 border border-amber-500/20 mt-4">
        <h4 class="text-sm font-semibold text-amber-600 mb-2">Lưu ý khi gửi tin nhắn (Chat ID)</h4>
        <p class="text-sm text-muted-foreground">
          Để Bot có thể gửi tin vào một Nhóm (Group), bạn cần thêm Bot vào Nhóm đó và tìm <b>Chat ID</b> của Nhóm (thường bắt đầu bằng dấu trừ <code>-100...</code>). <br/>
          Nếu muốn Bot gửi tin nhắn riêng cho Cá nhân, người đó bắt buộc phải tìm tên Bot của bạn và bấm nút <code>/start</code> trước thì Bot mới có quyền gửi tin.
        </p>
      </div>
    </div>
  `,
  authType: 'api_key',
  authFields: [
    {
      name: 'botToken',
      label: 'Telegram Bot Token',
      type: 'password',
      required: true,
      secret: true,
      placeholder: 'vd: 123456:ABC-DEF1234ghIkl-zyx',
      helpText: 'Lấy từ @BotFather khi khởi tạo bot Telegram mới.'
    }
  ],
  actions: [
    {
      slug: 'send_message',
      name: 'Gửi tin nhắn',
      description: 'Gửi tin nhắn text (hỗ trợ Markdown) đến Chat ID mong muốn.',
      inputSchema: [
        {
          name: 'chatId',
          label: 'Chat ID',
          type: 'text',
          required: true,
          placeholder: 'vd: -100123456789 hoặc 987654321',
          helpText: 'ID của nhóm chat hoặc ID người nhận (phải /start bot trước).'
        },
        {
          name: 'text',
          label: 'Nội dung tin nhắn',
          type: 'textarea',
          required: true,
          placeholder: '🔔 *Thông báo từ AI2Hero Connect Hub*:\nĐã phát sinh đơn hàng mới!',
          helpText: 'Hỗ trợ định dạng Telegram MarkdownV2 hoặc HTML cơ bản.'
        }
      ]
    }
  ],
  popular: true
};
