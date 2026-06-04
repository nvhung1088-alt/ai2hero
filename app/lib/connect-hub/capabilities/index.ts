import { getConnectorBySlug } from '../connectors/registry';
import { ActionDefinition } from '../connectors/types';

export interface ApiCapability extends ActionDefinition {
  // Kế thừa toàn bộ các trường của ActionDefinition.
  // Không thêm static fields, verified sẽ được query động runtime từ DB (Phase 4).
}

/** 
 * Lấy danh sách capabilities cho 1 ứng dụng (appSlug).
 * Derive trực tiếp từ Action definitions đã được khai báo và đăng ký trong connectors registry.
 */
export function getCapabilities(appSlug: string): ApiCapability[] {
  const connector = getConnectorBySlug(appSlug);
  if (!connector) return [];
  
  // Chỉ trả về các actions đã cấu hình UI/AI metadata (có thuộc tính group)
  return connector.actions.filter(a => a.group) as ApiCapability[];
}

/** 
 * Lookup thông tin của 1 capability cụ thể theo appSlug và actionSlug.
 */
export function getCapability(appSlug: string, actionSlug: string): ApiCapability | undefined {
  return getCapabilities(appSlug).find(c => c.slug === actionSlug);
}
