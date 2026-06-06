import { PancakePosClient, toPancakeDateRange } from './client';

/**
 * Ẩn thông tin nhạy cảm (PII Masking) đối với dữ liệu khách hàng và đơn hàng khi AI đọc danh sách.
 * Đảm bảo an toàn thông tin khách hàng theo tiêu chuẩn bảo mật.
 */
export function maskPII(data: any, mode: 'full' | 'masked' = 'masked'): any {
  if (mode === 'full') return data;
  if (!data) return data;

  const maskPhone = (p: string) => {
    if (!p) return p;
    const s = String(p).trim();
    if (s.length < 6) return '***';
    return s.substring(0, 3) + '***' + s.substring(s.length - 3);
  };

  const maskEmail = (e: string) => {
    if (!e) return e;
    const s = String(e).trim();
    const idx = s.indexOf('@');
    if (idx <= 0) return '***';
    const name = s.substring(0, idx);
    const domain = s.substring(idx);
    if (name.length <= 2) return '**' + domain;
    return name.charAt(0) + '***' + name.charAt(name.length - 1) + domain;
  };

  const maskOrder = (o: any) => {
    if (!o) return o;
    const res = { ...o };
    if (res.bill_phone_number) res.bill_phone_number = maskPhone(res.bill_phone_number);
    if (res.bill_email) res.bill_email = maskEmail(res.bill_email);
    if (res.shipping_address) {
      const addr = { ...res.shipping_address };
      if (addr.phone_number) addr.phone_number = maskPhone(addr.phone_number);
      if (addr.address) addr.address = '******';
      if (addr.full_address) {
        const parts = addr.full_address.split(',');
        if (parts.length > 1) {
          addr.full_address = '******, ' + parts.slice(1).join(',').trim();
        } else {
          addr.full_address = '******';
        }
      }
      res.shipping_address = addr;
    }
    if (res.customer) {
      res.customer = maskCustomer(res.customer);
    }
    return res;
  };

  const maskCustomer = (c: any) => {
    if (!c) return c;
    const res = { ...c };
    if (res.phone_number) res.phone_number = maskPhone(res.phone_number);
    if (res.phone_numbers) res.phone_numbers = res.phone_numbers.map(maskPhone);
    if (res.emails) res.emails = res.emails.map(maskEmail);
    if (res.shop_customer_addresses) {
      res.shop_customer_addresses = res.shop_customer_addresses.map((addr: any) => {
        const a = { ...addr };
        if (a.phone_number) a.phone_number = maskPhone(a.phone_number);
        if (a.address) a.address = '******';
        if (a.full_address) {
          const parts = a.full_address.split(',');
          if (parts.length > 1) {
            a.full_address = '******, ' + parts.slice(1).join(',').trim();
          } else {
            a.full_address = '******';
          }
        }
        return a;
      });
    }
    return res;
  };

  if (Array.isArray(data)) {
    return data.map(item => {
      // Nhận diện object Đơn hàng
      if (item && (item.id && (item.bill_phone_number !== undefined || item.total_price !== undefined))) {
        return maskOrder(item);
      }
      // Nhận diện object Khách hàng
      if (item && (item.customer_id !== undefined || item.phone_numbers !== undefined)) {
        return maskCustomer(item);
      }
      return item;
    });
  }

  // Nhận diện object Đơn hàng đơn lẻ
  if (data.id && (data.bill_phone_number !== undefined || data.total_price !== undefined)) {
    return maskOrder(data);
  }

  // Nhận diện object Khách hàng đơn lẻ
  if (data.customer_id !== undefined || data.phone_numbers !== undefined) {
    return maskCustomer(data);
  }

  return data;
}

export async function handleDataAction(
  client: PancakePosClient,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  
  // === ACTION: list_orders ===
  if (actionSlug === 'list_orders') {
    const params: Record<string, any> = {
      page_number: Number(input.page_number || input.pageNumber || 1),
      page_size: Number(input.page_size || input.pageSize || 30),
      search: input.search || undefined,
      option_sort: input.option_sort || 'inserted_at_desc',
      updateStatus: input.updateStatus || 'inserted_at'
    };

    if (input.startDate) {
      const { startDateTime, endDateTime } = toPancakeDateRange(input.startDate, input.endDate || input.startDate);
      params.startDateTime = startDateTime;
      params.endDateTime = endDateTime;
    }

    if (input.filter_status) {
      params.filter_status = Array.isArray(input.filter_status) ? input.filter_status : [input.filter_status];
    }
    if (input.fields) {
      params.fields = Array.isArray(input.fields) ? input.fields : [input.fields];
    }

    const response = await client.getList<any>('/orders', params);
    
    // AI đọc list_orders: Bắt buộc Mask PII để bảo vệ an toàn thông tin khách hàng
    const maskedData = maskPII(response.data, 'masked');

    return {
      status: 'success',
      data: maskedData,
      total_entries: response.total_entries,
      total_pages: response.total_pages
    };
  }

  // === ACTION: get_order ===
  if (actionSlug === 'get_order') {
    const orderId = input.orderId || input.id;
    if (!orderId) throw new Error('Thiếu ID đơn hàng (orderId).');

    // Xem chi tiết 1 đơn cụ thể: Trả về full thông tin (không mask) để phục vụ xử lý
    const response = await client.get<any>(`/orders/${orderId}`);
    return {
      status: 'success',
      data: response.order || response
    };
  }

  // === ACTION: list_products ===
  if (actionSlug === 'list_products') {
    const params: Record<string, any> = {
      page_number: Number(input.page_number || 1),
      page_size: Number(input.page_size || 30),
      search: input.search || undefined
    };

    if (input.category_ids) {
      params.category_ids = Array.isArray(input.category_ids) ? input.category_ids : [input.category_ids];
    }
    if (input.tag_ids) {
      params.tag_ids = Array.isArray(input.tag_ids) ? input.tag_ids : [input.tag_ids];
    }
    if (input.warehouse_id) {
      params.warehouse_id = input.warehouse_id;
    }

    const response = await client.getList<any>('/products', params);
    return {
      status: 'success',
      data: response.data,
      total_entries: response.total_entries,
      total_pages: response.total_pages
    };
  }

  // === ACTION: get_product ===
  if (actionSlug === 'get_product') {
    const productId = input.productId || input.id;
    if (!productId) throw new Error('Thiếu ID sản phẩm (productId).');

    const response = await client.get<any>(`/products/${productId}`);
    return {
      status: 'success',
      data: response.product || response
    };
  }

  // === ACTION: list_customers ===
  if (actionSlug === 'list_customers') {
    const params: Record<string, any> = {
      page_number: Number(input.page_number || 1),
      page_size: Number(input.page_size || 30),
      search: input.search || undefined
    };

    if (input.tags) {
      params.tags = Array.isArray(input.tags) ? input.tags : [input.tags];
    }

    const response = await client.getList<any>('/customers', params);
    
    // Mask PII khi lấy danh sách khách hàng hàng loạt
    const maskedData = maskPII(response.data, 'masked');

    return {
      status: 'success',
      data: maskedData,
      total_entries: response.total_entries,
      total_pages: response.total_pages
    };
  }

  // === ACTION: get_customer ===
  if (actionSlug === 'get_customer') {
    const customerId = input.customerId || input.id;
    if (!customerId) throw new Error('Thiếu ID khách hàng (customerId).');

    // Xem chi tiết 1 khách hàng: Trả về full thông tin
    const response = await client.get<any>(`/customers/${customerId}`);
    return {
      status: 'success',
      data: response.customer || response
    };
  }

  // === ACTION: list_warehouses ===
  if (actionSlug === 'list_warehouses') {
    // warehouses ít thay đổi, sử dụng cache
    const response = await client.getList<any>('/warehouses', {}, true);
    return {
      status: 'success',
      data: response.data
    };
  }

  // === ACTION: get_inventory ===
  if (actionSlug === 'get_inventory') {
    const params: Record<string, any> = {};
    if (input.warehouse_ids) {
      params.warehouse_ids = Array.isArray(input.warehouse_ids) ? input.warehouse_ids : [input.warehouse_ids];
    }
    if (input.category_ids) {
      params.category_ids = Array.isArray(input.category_ids) ? input.category_ids : [input.category_ids];
    }

    try {
      const response = await client.get<any>('/inventory-report', params);
      return {
        status: 'success',
        data: response.data || response
      };
    } catch (error: any) {
      console.warn(`[PancakePosData] API /inventory-report báo lỗi (${error.message}). Trả về mảng trống.`);
      return {
        status: 'success',
        data: [],
        warning: 'Báo cáo tồn kho tạm thời không được hỗ trợ bởi gói API của cửa hàng.'
      };
    }
  }

  // === ACTION: get_shop_info ===
  if (actionSlug === 'get_shop_info') {
    try {
      const response = await client.get<any>('/shop');
      return {
        status: 'success',
        data: response.shop || response
      };
    } catch (error: any) {
      // Fallback: Lấy tên shop từ warehouses hoặc dùng mặc định
      console.warn(`[PancakePosData] API /shop báo lỗi (${error.message}). Thử fallback lấy từ warehouses...`);
      try {
        const warehouses = await client.getList<any>('/warehouses', {}, true);
        if (warehouses.data && warehouses.data.length > 0) {
          const w = warehouses.data[0];
          return {
            status: 'success',
            data: {
              id: client['shopId'],
              name: w.name || 'Cửa hàng Pancake POS',
              phone_number: w.phone_number || ''
            },
            fallback_used: true
          };
        }
      } catch (e) {}

      return {
        status: 'success',
        data: {
          id: client['shopId'],
          name: 'Cửa hàng Pancake POS'
        },
        warning: 'Không thể truy xuất thông tin chi tiết cấu hình shop. Đã trả về thông tin cơ bản.'
      };
    }
  }

  // === ACTION: probe_sample_data (Dò cấu trúc dữ liệu mẫu để sinh mapping) ===
  if (actionSlug === 'probe_sample_data') {
    let orderSample: any = null;
    let productSample: any = null;
    let customerSample: any = null;

    try {
      const orders = await client.getList<any>('/orders', { page_size: 1 });
      if (orders.data && orders.data.length > 0) orderSample = orders.data[0];
    } catch (e) {}

    try {
      const products = await client.getList<any>('/products', { page_size: 1 });
      if (products.data && products.data.length > 0) productSample = products.data[0];
    } catch (e) {}

    try {
      const customers = await client.getList<any>('/customers', { page_size: 1 });
      if (customers.data && customers.data.length > 0) customerSample = customers.data[0];
    } catch (e) {}

    return {
      status: 'success',
      data: {
        order: orderSample,
        product: productSample,
        customer: customerSample
      }
    };
  }

  // === ACTION: create_order ===
  if (actionSlug === 'create_order') {
    if (!input.payload) throw new Error('Thiếu payload tạo đơn hàng.');
    
    // payload có thể là object hoặc string JSON
    const body = typeof input.payload === 'string' ? JSON.parse(input.payload) : input.payload;
    
    // Validate tối thiểu
    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      throw new Error('Payload thiếu danh sách sản phẩm (products). Mỗi sản phẩm cần có variation_id, quantity và price.');
    }
    
    const response = await client.post<any>('/orders', body);
    return {
      status: 'success',
      data: response.order || response.data || response
    };
  }

  throw new Error(`Hành động dữ liệu ${actionSlug} chưa được hỗ trợ.`);
}
