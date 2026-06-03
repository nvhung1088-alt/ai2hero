import { ConnectorDefinition } from '../types';

export const telegramConnector: ConnectorDefinition = {
  slug: 'telegram',
  name: 'Telegram',
  icon: 'Send',
  category: 'chat',
  description: 'Gửi tin nhắn thông báo tự động vào nhóm chat hoặc cá nhân qua Telegram Bot.',
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
