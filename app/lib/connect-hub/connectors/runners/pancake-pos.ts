export async function runPancakePos(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const { shopId, apiKey } = credentials;
  if (!shopId || !apiKey) {
    throw new Error('Thiếu cấu hình Shop ID hoặc API Key cho Pancake POS.');
  }

  // 1. Action: Lấy danh sách đơn hàng
  if (actionSlug === 'list_orders') {
    try {
      const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/orders?api_key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi từ Pancake POS: ${res.status} ${res.statusText} (${errText})`);
      }

      const data = await res.json();
      return {
        status: 'success',
        data: data.data || data.orders || []
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy danh sách đơn hàng từ Pancake POS: ${error.message}`);
    }
  }

  // 2. Action: Lấy danh sách khách hàng
  if (actionSlug === 'list_customers') {
    try {
      const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/customers?api_key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi từ Pancake POS: ${res.status} ${res.statusText} (${errText})`);
      }

      const data = await res.json();
      return {
        status: 'success',
        data: data.customers || []
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy danh sách khách hàng từ Pancake POS: ${error.message}`);
    }
  }

  // 3. Action: Lấy danh sách sản phẩm
  if (actionSlug === 'list_products') {
    try {
      const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/products?api_key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi từ Pancake POS: ${res.status} ${res.statusText} (${errText})`);
      }

      const data = await res.json();
      return {
        status: 'success',
        data: data.products || data.data || []
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy danh sách sản phẩm từ Pancake POS: ${error.message}`);
    }
  }

  // 4. Action: Báo cáo doanh số (Dashboard Stats)
  if (actionSlug === 'get_sales_report') {
    try {
      let endpoint = `https://pos.pages.fm/api/v1/shops/${shopId}/orders?api_key=${apiKey}&updateStatus=inserted_at`;
      
      // Cập nhật params theo API Documents của Pancake POS: sử dụng startDateTime, endDateTime định dạng Unix Timestamp (giây)
      if (input.startDate) {
        // Parse startDate (vd: 2026-06-02) thành Unix Timestamp seconds 
        // Lấy thời điểm bắt đầu ngày
        const start = new Date(`${input.startDate}T00:00:00+07:00`).getTime();
        if (!isNaN(start)) {
          endpoint += `&startDateTime=${Math.floor(start / 1000)}`;
        }
      }
      if (input.endDate) {
        // Lấy thời điểm kết thúc ngày
        const end = new Date(`${input.endDate}T23:59:59+07:00`).getTime();
        if (!isNaN(end)) {
          endpoint += `&endDateTime=${Math.floor(end / 1000)}`;
        }
      }

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi từ Pancake POS: ${res.status} ${res.statusText} (${errText})`);
      }

      const json = await res.json();
      const aggs = json.aggs || {};
      
      // Chuyển đổi dữ liệu tổng hợp (aggregations) sang format chuẩn
      const report = {
        totalRevenue: (aggs.cod?.value || 0) + (aggs.prepaid?.value || 0),
        cod: aggs.cod?.value || 0,
        prepaid: aggs.prepaid?.value || 0,
        shippingFee: aggs.shipping_fee?.value || 0,
        partnerFee: aggs.partner_fee?.value || 0,
        orderStatusBuckets: aggs.status?.buckets || [],
      };

      return {
        status: 'success',
        data: report
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy báo cáo doanh số từ Pancake POS: ${error.message}`);
    }
  }
  
  // 5. Action: Tạo đơn hàng mới
  if (actionSlug === 'create_order') {
    try {
      // Mapping linh hoạt cả dạng camelCase và snake_case với fallback an toàn
      const customer = {
        name: input.customerName || input.customer_name || 'Khách lẻ',
        phone_number: input.customerPhone || input.customer_phone || input.customer_phone_number || '',
        address: input.customerAddress || input.customer_address || ''
      };

      const products = input.products || [
        {
          id: Number(input.productId || input.product_id || 0),
          quantity: Number(input.quantity || 1),
          price: Number(input.price || 0)
        }
      ];

      const payload = {
        order: {
          customer,
          products,
          discount: Number(input.discount || 0),
          note: input.note || ''
        }
      };

      const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/orders?api_key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi tạo đơn hàng: ${res.status} ${res.statusText} (${errText})`);
      }

      const data = await res.json();
      return {
        status: 'success',
        data: data.order || data
      };
    } catch (error: any) {
      throw new Error(`Thất bại khi đẩy đơn hàng sang Pancake POS: ${error.message}`);
    }
  }

  // 6. Action: Dò cấu trúc dữ liệu mẫu (Probe Sample Data) để AI/Engine tự gợi ý mapping
  if (actionSlug === 'probe_sample_data') {
    try {
      // Gọi list_orders lấy 1 đơn hàng đầu tiên
      let orderSample: any = null;
      try {
        const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/orders?api_key=${apiKey}&limit=1`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data.orders || [];
          if (list.length > 0) orderSample = list[0];
        }
      } catch (e) {
        console.error('Probe order sample error:', e);
      }

      // Gọi list_products lấy 1 sản phẩm đầu tiên
      let productSample: any = null;
      try {
        const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/products?api_key=${apiKey}&limit=1`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.products || data.data || [];
          if (list.length > 0) productSample = list[0];
        }
      } catch (e) {
        console.error('Probe product sample error:', e);
      }

      // Gọi list_customers lấy 1 khách hàng đầu tiên
      let customerSample: any = null;
      try {
        const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/customers?api_key=${apiKey}&limit=1`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.customers || [];
          if (list.length > 0) customerSample = list[0];
        }
      } catch (e) {
        console.error('Probe customer sample error:', e);
      }

      return {
        status: 'success',
        data: {
          order: orderSample,
          product: productSample,
          customer: customerSample
        }
      };
    } catch (error: any) {
      throw new Error(`Dò cấu trúc dữ liệu từ Pancake POS thất bại: ${error.message}`);
    }
  }

  throw new Error(`Hành động ${actionSlug} chưa được hỗ trợ trên Pancake POS.`);
}
