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

export const ALL_CONNECTORS: ConnectorDefinition[] = [
  openaiConnector,
  anthropicConnector,
  geminiConnector,
  grokConnector,
  deepseekConnector,
  qwenConnector,
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

export function getConnectorBySlug(slug: string): ConnectorDefinition | undefined {
  return ALL_CONNECTORS.find((c) => c.slug === slug);
}
