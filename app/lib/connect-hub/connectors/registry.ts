import { ConnectorDefinition } from './types';
import { customHttpConnector } from './definitions/custom-http';
import { kiotvietConnector } from './definitions/kiotviet';
import { pancakeChatConnector } from './definitions/pancake-chat';
import { pancakePosConnector } from './definitions/pancake-pos';
import { googleSheetsConnector } from './definitions/google-sheets';
import { gmailConnector } from './definitions/gmail';
import { telegramConnector } from './definitions/telegram';
import { openaiConnector } from './definitions/openai';
import { anthropicConnector } from './definitions/anthropic';
import { geminiConnector } from './definitions/gemini';
import { grokConnector } from './definitions/grok';
import { deepseekConnector } from './definitions/deepseek';
import { qwenConnector } from './definitions/qwen';
import { runwayConnector } from './definitions/runway';
import { lumaConnector } from './definitions/luma';
import { sapoConnector } from './definitions/sapo';
import { payosConnector } from './definitions/payos';
import { momoConnector } from './definitions/momo';
import { googleDriveConnector } from './definitions/google-drive';
import { facebookConnector } from './definitions/facebook';
import { zaloConnector } from './definitions/zalo';
import { tiktokConnector } from './definitions/tiktok';
import { chiasegpuConnector } from './definitions/chiasegpu';

const RAW_CONNECTORS: ConnectorDefinition[] = [
  openaiConnector,
  anthropicConnector,
  geminiConnector,
  grokConnector,
  deepseekConnector,
  qwenConnector,
  chiasegpuConnector,
  runwayConnector,
  lumaConnector,
  sapoConnector,
  payosConnector,
  momoConnector,
  kiotvietConnector,
  pancakeChatConnector,
  pancakePosConnector,
  googleDriveConnector,
  googleSheetsConnector,
  facebookConnector,
  zaloConnector,
  tiktokConnector,
  gmailConnector,
  telegramConnector,
  customHttpConnector
];

const READY_SLUGS = [
  'custom-http',
  'kiotviet',
  'pancake-pos',
  'pancake-chat',
  'google-sheets',
  'gmail',
  'telegram',
  'openai',
  'chiasegpu'
];

export const ALL_CONNECTORS: ConnectorDefinition[] = RAW_CONNECTORS.map(connector => {
  let badge = connector.badge;
  
  // Tự động gán nhãn cho các Cổng AI
  if (!badge && connector.category === 'ai') {
    if (connector.slug === 'chiasegpu') {
      badge = { text: 'Premium', variant: 'premium' };
    } else {
      badge = { text: 'Free', variant: 'free' };
    }
  }

  return {
    ...connector,
    badge,
    status: (READY_SLUGS.includes(connector.slug) ? 'ready' : 'updating') as 'ready' | 'updating'
  };
}).sort((a, b) => {
  // 💡 HƯỚNG DẪN STICK ỨNG DỤNG LÊN ĐẦU (PIN-TO-TOP):
  // Muốn đưa một App khác lên đầu danh sách? 
  // Rất đơn giản, hãy thay chữ 'chiasegpu' bằng slug của app bạn muốn (ví dụ: 'openai', 'gemini'...)
  if (a.slug === 'chiasegpu') return -1;
  if (b.slug === 'chiasegpu') return 1;
  return 0; // Giữ nguyên thứ tự của các app còn lại
});


export function getConnectorBySlug(slug: string): ConnectorDefinition | undefined {
  return ALL_CONNECTORS.find((c) => c.slug === slug);
}
