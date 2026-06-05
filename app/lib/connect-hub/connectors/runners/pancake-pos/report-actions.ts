import { PancakePosClient, STATUS_GROUPS, toPancakeDateRange, parsePancakeDate } from './client';

export async function handleReportAction(
  client: PancakePosClient,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  // 1. Chuẩn hóa ngày giờ lọc theo múi giờ Việt Nam
  const startDate = input.startDate || new Date().toISOString().split('T')[0];
  const endDate = input.endDate || startDate;
  const { startDateTime, endDateTime } = toPancakeDateRange(startDate, endDate);

  // === ACTION: get_statistics (Thống kê doanh số & lợi nhuận) ===
  if (actionSlug === 'get_statistics') {
    const groupBy = input.groupBy || 'status';
    
    // Thử cách 1: Gọi endpoint chính thức của hệ thống
    try {
      const statsUrl = `/orders/statistics`;
      const response = await client.get<any>(statsUrl, {
        start_date: startDateTime,
        end_date: endDateTime,
        group_by: groupBy
      });
      
      // Nếu response thành công và có dữ liệu hợp lệ
      if (response && response.success !== false && response.summary) {
        const statusBreakdown: Record<number, number> = {};
        if (Array.isArray(response.by_status)) {
          response.by_status.forEach((item: any) => {
            const s = Number(item.status ?? 0);
            statusBreakdown[s] = (statusBreakdown[s] || 0) + (item.count || 0);
          });
        }

        return {
          status: 'success',
          data: {
            summary: response.summary,
            by_status: response.by_status || [],
            by_date: response.by_date || [],
            statusBreakdown,
            fallback_used: false
          }
        };
      }
    } catch (error: any) {
      // Ghi log cảnh báo và tự động chuyển sang Fallback
      console.warn(`[PancakePosReport] Thử gọi /orders/statistics lỗi (${error.message}). Đang kích hoạt Fallback qua /orders...`);
    }

    // Cách 2 (Fallback): Lấy toàn bộ đơn hàng trong ngày (không filter status) để tự tính toán
    try {
      // Lấy danh sách tối đa 250 đơn không filter status để đếm trạng thái
      const ordersRes = await client.getList<any>('/orders', {
        page_size: 250,
        page_number: 1,
        updateStatus: 'inserted_at',
        startDateTime,
        endDateTime
      });

      const allOrders = ordersRes.data || [];
      
      // Đếm status breakdown
      const statusBreakdown: Record<number, number> = {};
      allOrders.forEach(o => {
        const s = o.status !== undefined ? Number(o.status) : 0;
        statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
      });

      // Lọc các đơn hàng CONFIRMED (đơn chốt) để tính doanh thu
      const confirmedStatuses = [1, 2, 3, 8, 9, 16];
      const orders = allOrders.filter(o => o.status !== undefined && confirmedStatuses.includes(Number(o.status)));
      
      let confirmed_orders = orders.length;
      let gross_sales = 0;
      let cod_total = 0;      // [FIX] Track riêng để Renderer hiển thị breakdown
      let prepaid_total = 0;  // [FIX] Track riêng để Renderer hiển thị breakdown
      let collected_revenue = 0;
      let shipping_fee = 0;
      let partner_fee = 0;
      let total_cost = 0;

      orders.forEach(o => {
        // Doanh số gốc (Gross Sales)
        // Áp dụng công thức khớp Dashboard: Nếu đơn shopee có giảm giá sàn (buyer_total_amount > 0), dùng buyer_total_amount, ngược lại dùng total_price
        if (o.buyer_total_amount && o.buyer_total_amount > 0) {
          gross_sales += o.buyer_total_amount;
        } else {
          gross_sales += o.total_price || 0;
        }

        // [FIX] Track cod và prepaid riêng lẻ để Renderer hiển thị đúng
        const orderCod = o.cod || 0;
        const orderPrepaid = o.prepaid || 0;
        cod_total += orderCod;
        prepaid_total += orderPrepaid;
        collected_revenue += orderCod + orderPrepaid;

        // Phí ship khách trả
        shipping_fee += o.shipping_fee || 0;

        // Phí ĐVVC shop chịu
        partner_fee += o.partner_fee || 0;

        // Tính giá vốn (Cost of Goods Sold - COGS)
        let orderCost = 0;
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach((item: any) => {
            const vInfo = item.variation_info || {};
            const importPrice = vInfo.last_imported_price ?? vInfo.avg_price ?? vInfo.exact_price ?? 0;
            orderCost += (item.quantity || 1) * importPrice;
          });
        }
        total_cost += orderCost;
      });

      // Lợi nhuận = Tiền thực thu (Collected) - Giá vốn
      // (Đối với đơn Shopee/sàn, COD/Prepaid nhận về đã tự trừ phí sàn nên không được trừ phí sàn thêm lần nữa)
      const total_profit = collected_revenue - total_cost;
      const average_order_value = confirmed_orders > 0 ? Math.round(gross_sales / confirmed_orders) : 0;

      return {
        status: 'success',
        data: {
          summary: {
            total_orders: confirmed_orders,
            total_revenue: gross_sales,            // Doanh số gốc
            collected_revenue: collected_revenue,  // Tiền thực thu (COD + Prepaid)
            cod: cod_total,                        // [FIX] COD riêng lẻ cho Renderer
            prepaid: prepaid_total,                // [FIX] Prepaid riêng lẻ cho Renderer
            total_profit: total_profit,            // Lợi nhuận
            average_order_value: average_order_value,
            shipping_fee: shipping_fee,
            partner_fee: partner_fee,
            total_cost: total_cost
          },
          statusBreakdown,
          fallback_used: true,
          warning: 'Báo cáo sử dụng số liệu tính toán từ danh sách đơn hàng (Fallback) do API statistics của POS không được cấp quyền truy cập.'
        }
      };
    } catch (fallbackError: any) {
      throw new Error(`Thất bại khi chạy thuật toán fallback tính toán báo cáo: ${fallbackError.message}`);
    }
  }

  // === ACTION: revenue_summary (Tổng hợp doanh thu nhanh qua aggs) ===
  if (actionSlug === 'revenue_summary') {
    try {
      const response = await client.getList<any>('/orders', {
        page_size: 1, // Chỉ lấy 1 đơn để đọc trường aggs nhanh
        updateStatus: 'inserted_at',
        startDateTime,
        endDateTime,
        filter_status: STATUS_GROUPS.confirmed
      });

      const aggs = response.aggs || {};
      const cod = aggs.cod?.value || 0;
      const prepaid = aggs.prepaid?.value || 0;
      const shipping_fee = aggs.shipping_fee?.value || 0;
      const partner_fee = aggs.partner_fee?.value || 0;

      return {
        status: 'success',
        data: {
          cod,
          prepaid,
          collected_revenue: cod + prepaid,
          shipping_fee,
          partner_fee,
          status_buckets: aggs.status?.buckets || [],
          warning: 'Số liệu được lấy nhanh từ máy chủ tổng hợp Pancake POS.'
        }
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy tổng hợp doanh thu từ Pancake POS: ${error.message}`);
    }
  }

  // === ACTION: get_top_orders (Top đơn hàng giá trị cao) ===
  if (actionSlug === 'get_top_orders') {
    const limit = Number(input.limit || 5);
    try {
      const response = await client.getList<any>('/orders', {
        page_size: limit,
        page_number: 1,
        updateStatus: 'inserted_at',
        startDateTime,
        endDateTime,
        filter_status: STATUS_GROUPS.confirmed,
        option_sort: 'order_valuation_desc'
      });

      return {
        status: 'success',
        data: response.data || []
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy top đơn hàng từ Pancake POS: ${error.message}`);
    }
  }

  // === CÁC ACTION BÁO CÁO SIÊU TỐC (Dùng Endpoint /orders/statistics) ===
  const FAST_STATS_ACTIONS: Record<string, string> = {
    get_sales_by_channel: 'source',
    get_sales_by_employee: 'assigning_seller',
    get_sales_by_status: 'status',
    get_sales_by_date: 'date',
    get_sales_by_partner: 'partner'
  };

  if (FAST_STATS_ACTIONS[actionSlug]) {
    try {
      const groupBy = FAST_STATS_ACTIONS[actionSlug];
      const statsUrl = `/orders/statistics`;
      const response = await client.get<any>(statsUrl, {
        start_date: startDateTime,
        end_date: endDateTime,
        group_by: groupBy
      });
      
      return {
        status: 'success',
        data: response || {}
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy dữ liệu thống kê siêu tốc cho ${actionSlug}: ${error.message}`);
    }
  }

  throw new Error(`Báo cáo hành động ${actionSlug} chưa được hỗ trợ.`);
}
