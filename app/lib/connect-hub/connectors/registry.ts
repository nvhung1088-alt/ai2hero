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
import { coreLogicConnector } from './definitions/core-logic';
import { zaloZnsConnector } from './definitions/zalo-zns';

import { GENERATED_CONNECTORS } from './registry-generated';

const RAW_CONNECTORS: ConnectorDefinition[] = [
  coreLogicConnector,
  zaloZnsConnector,
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
  'core-logic',
  'zalo-zns',
  'custom-http',
  'kiotviet',
  'pancake-pos',
  'pancake-chat',
  'google-sheets',
  'gmail',
  'telegram',
  'openai',
  'chiasegpu',
  'telegram-bot',
  'discord',
  'airtable',
  'sendgrid',
  'github',
  'trello',
  'twilio',
  'mailgun',
  'clickup',
  'facebook'
];

// Combine manual and generated connectors. Manual configuration overrides generated ones.
const manualSlugs = new Set(RAW_CONNECTORS.map(c => c.slug));
const filteredGenerated = GENERATED_CONNECTORS.filter(c => !manualSlugs.has(c.slug));

const MERGED_CONNECTORS = [
  ...RAW_CONNECTORS.map(c => ({
    ...c,
    runtimeType: c.runtimeType || (READY_SLUGS.includes(c.slug) ? 'custom_runner' : 'generic_http') as ConnectorDefinition['runtimeType'],
    runtimeConfidence: c.runtimeConfidence || 'high' as ConnectorDefinition['runtimeConfidence'],
    source: c.source || 'manual' as ConnectorDefinition['source'],
    connectorStatus: c.connectorStatus || 'active' as ConnectorDefinition['connectorStatus'],
    riskLevel: c.riskLevel || 'safe' as ConnectorDefinition['riskLevel'],
  })),
  ...filteredGenerated
];

export const ALL_CONNECTORS: ConnectorDefinition[] = MERGED_CONNECTORS.map(connector => {
  let badge = connector.badge;
  
  // Tự động gán nhãn cho các Cổng AI
  if (!badge && connector.category === 'ai') {
    if (connector.slug === 'chiasegpu') {
      badge = { text: 'Premium', variant: 'premium' };
    } else {
      badge = { text: 'Free', variant: 'free' };
    }
  }

  const isReady = READY_SLUGS.includes(connector.slug) || connector.status === 'ready';

  return {
    ...connector,
    badge,
    status: (isReady ? 'ready' : 'updating') as ConnectorDefinition['status']
  };
}).sort((a, b) => {
  // Pin chiasegpu to top
  if (a.slug === 'chiasegpu') return -1;
  if (b.slug === 'chiasegpu') return 1;
  
  // Sort ready connectors before updating/catalog ones
  const aReady = READY_SLUGS.includes(a.slug) || a.status === 'ready';
  const bReady = READY_SLUGS.includes(b.slug) || b.status === 'ready';
  if (aReady && !bReady) return -1;
  if (!aReady && bReady) return 1;
  
  return 0; // Maintain existing order
});

export function getConnectorBySlug(slug: string): ConnectorDefinition | undefined {
  return ALL_CONNECTORS.find((c) => c.slug === slug);
}

