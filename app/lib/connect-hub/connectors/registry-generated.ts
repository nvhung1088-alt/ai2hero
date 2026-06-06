import { ConnectorDefinition } from './types';
import catalogLite from './generated/catalog-lite.json';

export const GENERATED_CONNECTORS: ConnectorDefinition[] = (catalogLite as any[]).map(item => ({
  slug: item.slug,
  name: item.name,
  icon: item.icon,
  logoUrl: item.logoUrl,
  category: item.category as ConnectorDefinition['category'],
  description: item.description,
  authType: item.authType as ConnectorDefinition['authType'],
  authFields: [],
  actions: [],
  setupGuide: item.setupGuide,
  status: item.status as ConnectorDefinition['status'],
  runtimeType: item.runtimeType as ConnectorDefinition['runtimeType'],
  runtimeConfidence: item.runtimeConfidence as ConnectorDefinition['runtimeConfidence'],
  source: item.source as ConnectorDefinition['source'],
  connectorStatus: item.connectorStatus as ConnectorDefinition['connectorStatus'],
  riskLevel: item.riskLevel as ConnectorDefinition['riskLevel'],
  permissionScope: item.permissionScope || ['read'],
}));
