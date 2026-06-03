import { runCustomHttp } from './runners/custom-http';
import { runKiotViet } from './runners/kiotviet';
import { runPancakeChat } from './runners/pancake-chat';
import { runPancakePos } from './runners/pancake-pos';
import { runOpenAI } from './runners/openai';
import { runChiaSeGPU } from './runners/chiasegpu';


const RUNNERS: Record<string, (creds: any, action: string, input: any) => Promise<any>> = {
  'custom-http': runCustomHttp,
  'kiotviet': runKiotViet,
  'pancake-chat': runPancakeChat,
  'pancake-pos': runPancakePos,
  'openai': runOpenAI,
  'chiasegpu': runChiaSeGPU,
};

export async function executeAction(
  appSlug: string,
  decryptedCredentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const runner = RUNNERS[appSlug];
  
  if (!runner) {
    // Trình giả lập Mock cho các connector chưa được viết runtime chi tiết
    // giúp người dùng có trải nghiệm UI mượt mà và test flows
    if (['google-sheets', 'gmail', 'telegram', 'anthropic', 'gemini', 'grok', 'deepseek', 'qwen', 'runway', 'luma', 'sapo', 'payos', 'momo', 'google-drive', 'facebook', 'zalo', 'tiktok'].includes(appSlug)) {
      return simulateMockConnector(appSlug, actionSlug, input);
    }

    return {
      success: false,
      error: `Connector "${appSlug}" chưa hỗ trợ runtime tự động trên gói Lite. Vui lòng sử dụng Custom HTTP API.`
    };
  }

  try {
    const data = await runner(decryptedCredentials, actionSlug, input);
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi xảy ra khi thực thi action trong Connect Hub.'
    };
  }
}

async function simulateMockConnector(
  appSlug: string,
  actionSlug: string,
  input: Record<string, any>
): Promise<{ success: boolean; data?: any }> {
  // Giả lập thời gian trễ mạng 600ms
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (appSlug === 'google-sheets') {
    if (actionSlug === 'get_spreadsheet_values') {
      return {
        success: true,
        data: {
          range: input.range || 'Sheet1!A1:D5',
          values: [
            ['Họ tên', 'Số điện thoại', 'Sản phẩm', 'Ghi chú'],
            ['Nguyen Van A', '0912345678', 'HeroSim Pro', 'Khách hàng VIP'],
            ['Tran Thi B', '0987654321', 'HeroVideo Basic', 'Cần tư vấn thêm'],
            ['Le Van C', '0905556667', 'AI Chat Bot', 'Đã thanh toán']
          ]
        }
      };
    }
    return {
      success: true,
      data: {
        spreadsheetId: input.spreadsheetId,
        updatedRange: input.range,
        updatedRows: 1,
        updatedColumns: 3,
        status: 'success'
      }
    };
  }

  if (appSlug === 'gmail') {
    return {
      success: true,
      data: {
        messageId: `msg_${Math.random().toString(36).substring(7)}`,
        to: input.to,
        subject: input.subject,
        status: 'SENT',
        sentAt: new Date().toISOString()
      }
    };
  }

  if (appSlug === 'telegram') {
    return {
      success: true,
      data: {
        ok: true,
        result: {
          message_id: Math.floor(Math.random() * 100000),
          chat: { id: input.chatId, type: 'group', title: 'AI2Hero Alerts Group' },
          date: Math.floor(Date.now() / 1000),
          text: input.text
        }
      }
    };
  }

  return { success: true, data: { status: 'mock_success' } };
}
