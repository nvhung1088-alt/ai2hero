import { PancakePosClient } from './client';
import { handleReportAction } from './report-actions';
import { handleDataAction } from './data-actions';

const REPORT_ACTIONS = ['get_statistics', 'revenue_summary', 'get_top_orders', 'get_sales_by_channel', 'get_sales_by_employee'];
const DATA_ACTIONS = [
  'list_orders',
  'get_order',
  'create_order',
  'list_products',
  'get_product',
  'list_customers',
  'get_customer',
  'list_warehouses',
  'get_inventory',
  'get_shop_info',
  'probe_sample_data'
];

export async function runPancakePos(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const { shopId, apiKey } = credentials;
  const client = new PancakePosClient(shopId, apiKey);

  if (REPORT_ACTIONS.includes(actionSlug)) {
    return handleReportAction(client, actionSlug, input);
  }

  if (DATA_ACTIONS.includes(actionSlug)) {
    return handleDataAction(client, actionSlug, input);
  }

  // Khả năng tương thích ngược (Backward compatibility)
  // Bản cũ dùng 'get_sales_report', tự động map sang 'get_statistics'
  if (actionSlug === 'get_sales_report') {
    return handleReportAction(client, 'get_statistics', input);
  }

  throw new Error(`Hành động ${actionSlug} chưa được hỗ trợ trên Pancake POS.`);
}
