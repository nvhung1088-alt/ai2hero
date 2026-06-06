interface KiotVietCredentials {
  retailer: string;
  clientId: string;
  clientSecret: string;
}

const BASE_URL = 'https://public.kiotapi.com';
const TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

function sanitizeError(msg: string): string {
  if (!msg) return '';
  let sanitized = msg;
  // Che giấu số điện thoại (chuỗi số từ 9-11 chữ số liên tục)
  sanitized = sanitized.replace(/\b\d{9,11}\b/g, '***');
  // Che giấu email
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***');
  // Che giấu Authorization header / access token / secret
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9\-_.]+/gi, 'Bearer ***');
  sanitized = sanitized.replace(/client_secret=[a-zA-Z0-9\-_.]+/gi, 'client_secret=***');
  return sanitized;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetchWithTimeout(url, options);
    
    // Chỉ retry đối với lỗi 429 hoặc 5xx
    if (retries > 0 && (response.status === 429 || response.status >= 500)) {
      let delay = 1000 * (MAX_RETRIES - retries + 1); // Exponential backoff: 1s, 2s
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) {
          delay = parsed * 1000;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    return response;
  } catch (error: any) {
    // Nếu gặp lỗi mạng (không phải timeout), tiến hành retry
    if (retries > 0 && error.name !== 'AbortError') {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (MAX_RETRIES - retries + 1)));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function getKiotVietAccessToken(creds: KiotVietCredentials): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', creds.clientId);
  params.append('client_secret', creds.clientSecret);
  params.append('scopes', 'PublicApi.Access');

  const response = await fetchWithRetry(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Phản hồi xác thực KiotViet không hợp lệ: ${text}`);
  }

  if (!response.ok) {
    throw new Error(data.error_description || data.error || text);
  }

  if (!data.access_token) {
    throw new Error('Không nhận được access_token từ máy chủ KiotViet.');
  }

  return data.access_token;
}

async function kvGet(
  token: string,
  retailer: string,
  path: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<any> {
  const urlObj = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      urlObj.searchParams.append(key, String(val));
    }
  });

  const response = await fetchWithRetry(urlObj.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Retailer': retailer,
      'Accept': 'application/json'
    }
  });

  const text = await response.text();
  let responseData;
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (e) {
    responseData = { rawText: text };
  }

  if (!response.ok) {
    const errMsg = responseData.responseStatus?.message || responseData.message || text || response.statusText;
    const err = new Error(errMsg) as any;
    err.status = response.status;
    throw err;
  }

  return responseData;
}

async function kvPost(
  token: string,
  retailer: string,
  path: string,
  payload: any
): Promise<any> {
  const response = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Retailer': retailer,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let responseData;
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (e) {
    responseData = { rawText: text };
  }

  if (!response.ok) {
    const errMsg = responseData.responseStatus?.message || responseData.message || text || response.statusText;
    const err = new Error(errMsg) as any;
    err.status = response.status;
    throw err;
  }

  return responseData;
}

// Helper fetch nhiều trang hóa đơn, giới hạn maxPages tránh timeout (mặc định 3 trang = 300 hóa đơn)
async function fetchInvoicePages(
  token: string,
  retailer: string,
  fromDate: string,
  toDate: string,
  branchId?: string,
  maxPages = 3
): Promise<{ invoices: any[]; total: number }> {
  if (!fromDate || !toDate) {
    throw new Error('Thiếu khoảng thời gian báo cáo (fromDate, toDate).');
  }

  const cleanFrom = fromDate.length === 10 ? `${fromDate}T00:00:00.000Z` : fromDate;
  const cleanTo = toDate.length === 10 ? `${toDate}T23:59:59.999Z` : toDate;

  const limit = 100;
  const allInvoices: any[] = [];
  const params: Record<string, any> = {
    pageSize: limit,
    currentItem: 0,
    fromPurchaseDate: cleanFrom,
    toPurchaseDate: cleanTo
  };
  
  if (branchId) {
    params.branchIds = branchId;
  }

  const firstPage = await kvGet(token, retailer, '/invoices', params);
  const data = firstPage.data || [];
  allInvoices.push(...data);
  const total = firstPage.total || 0;

  const totalPages = Math.ceil(total / limit);
  const pagesToFetch = Math.min(totalPages, maxPages);

  for (let p = 1; p < pagesToFetch; p++) {
    const nextPage = await kvGet(token, retailer, '/invoices', {
      ...params,
      currentItem: p * limit
    });
    allInvoices.push(...(nextPage.data || []));
  }

  return { invoices: allInvoices, total };
}

const ACTION_HANDLERS: Record<
  string,
  (token: string, retailer: string, input: Record<string, any>) => Promise<any>
> = {
  // === Nhóm Sản phẩm & Kho ===
  list_products: async (token, retailer, input) => {
    return kvGet(token, retailer, '/products', {
      pageSize: input.pageSize,
      currentItem: input.currentItem
    });
  },
  get_product: async (token, retailer, input) => {
    if (!input.productId) throw new Error('Thiếu productId.');
    return kvGet(token, retailer, `/products/${input.productId}`);
  },
  list_categories: async (token, retailer, input) => {
    return kvGet(token, retailer, '/categories', {
      pageSize: input.pageSize,
      currentItem: input.currentItem
    });
  },

  // === Nhóm Đơn hàng ===
  list_orders: async (token, retailer, input) => {
    const params: Record<string, any> = {
      pageSize: input.pageSize,
      currentItem: input.currentItem
    };
    if (input.fromPurchaseDate) {
      params.fromPurchaseDate = input.fromPurchaseDate.length === 10 ? `${input.fromPurchaseDate}T00:00:00.000Z` : input.fromPurchaseDate;
    }
    if (input.toPurchaseDate) {
      params.toPurchaseDate = input.toPurchaseDate.length === 10 ? `${input.toPurchaseDate}T23:59:59.999Z` : input.toPurchaseDate;
    }
    if (input.branchId) params.branchIds = input.branchId;
    if (input.status && input.status !== 'Tất cả') {
      params.status = input.status;
    }
    return kvGet(token, retailer, '/orders', params);
  },
  get_order: async (token, retailer, input) => {
    if (!input.orderId) throw new Error('Thiếu orderId.');
    return kvGet(token, retailer, `/orders/${input.orderId}`);
  },
  create_order: async (token, retailer, input) => {
    if (!input.payload) throw new Error('Thiếu payload tạo đơn hàng.');
    // payload có thể là object đã parse sẵn hoặc string JSON tùy từ cổng vào.
    const body = typeof input.payload === 'string' ? JSON.parse(input.payload) : input.payload;
    return kvPost(token, retailer, '/orders', body);
  },

  // === Nhóm Hóa đơn ===
  list_invoices: async (token, retailer, input) => {
    const params: Record<string, any> = {
      pageSize: input.pageSize,
      currentItem: input.currentItem
    };
    if (input.fromPurchaseDate) {
      params.fromPurchaseDate = input.fromPurchaseDate.length === 10 ? `${input.fromPurchaseDate}T00:00:00.000Z` : input.fromPurchaseDate;
    }
    if (input.toPurchaseDate) {
      params.toPurchaseDate = input.toPurchaseDate.length === 10 ? `${input.toPurchaseDate}T23:59:59.999Z` : input.toPurchaseDate;
    }
    if (input.branchId) params.branchIds = input.branchId;
    if (input.status && input.status !== 'Tất cả') {
      params.status = input.status;
    }
    return kvGet(token, retailer, '/invoices', params);
  },
  get_invoice: async (token, retailer, input) => {
    if (!input.invoiceId) throw new Error('Thiếu invoiceId.');
    return kvGet(token, retailer, `/invoices/${input.invoiceId}`);
  },

  // === Nhóm Khách hàng CRM ===
  list_customers: async (token, retailer, input) => {
    const params: Record<string, any> = {
      pageSize: input.pageSize,
      currentItem: input.currentItem
    };
    if (input.includeTotal !== undefined) {
      params.includeTotal = String(input.includeTotal) === 'true';
    }
    return kvGet(token, retailer, '/customers', params);
  },
  get_customer: async (token, retailer, input) => {
    if (!input.customerId) throw new Error('Thiếu customerId.');
    return kvGet(token, retailer, `/customers/${input.customerId}`);
  },

  // === Nhóm Trả hàng ===
  list_returns: async (token, retailer, input) => {
    const params: Record<string, any> = {
      pageSize: input.pageSize,
      currentItem: input.currentItem
    };
    if (input.fromPurchaseDate) {
      params.fromPurchaseDate = input.fromPurchaseDate.length === 10 ? `${input.fromPurchaseDate}T00:00:00.000Z` : input.fromPurchaseDate;
    }
    if (input.toPurchaseDate) {
      params.toPurchaseDate = input.toPurchaseDate.length === 10 ? `${input.toPurchaseDate}T23:59:59.999Z` : input.toPurchaseDate;
    }
    if (input.branchId) params.branchIds = input.branchId;
    return kvGet(token, retailer, '/returns', params);
  },
  get_return: async (token, retailer, input) => {
    if (!input.returnId) throw new Error('Thiếu returnId.');
    return kvGet(token, retailer, `/returns/${input.returnId}`);
  },

  // === Nhóm Nhà cung cấp ===
  list_suppliers: async (token, retailer, input) => {
    const params: Record<string, any> = {
      pageSize: input.pageSize,
      currentItem: input.currentItem
    };
    if (input.name) params.name = input.name;
    if (input.contactNumber) params.contactNumber = input.contactNumber;
    if (input.includeTotal !== undefined) {
      params.includeTotal = String(input.includeTotal) === 'true';
    }
    return kvGet(token, retailer, '/suppliers', params);
  },
  get_supplier: async (token, retailer, input) => {
    if (!input.supplierId) throw new Error('Thiếu supplierId.');
    return kvGet(token, retailer, `/suppliers/${input.supplierId}`);
  },

  // === Nhóm Nhân viên ===
  list_users: async (token, retailer, input) => {
    try {
      return await kvGet(token, retailer, '/users', {
        pageSize: input.pageSize,
        currentItem: input.currentItem
      });
    } catch (err: any) {
      if (err.status === 403 || err.status === 404) {
        return {
          data: [],
          total: 0,
          note: `Không thể truy cập danh sách nhân viên: ${err.message || 'Không có quyền (403/404)'}`
        };
      }
      throw err;
    }
  },

  // === Nhóm Báo cáo & Thống kê ===
  get_revenue_summary: async (token, retailer, input) => {
    const { invoices, total } = await fetchInvoicePages(
      token,
      retailer,
      input.fromDate,
      input.toDate,
      input.branchId
    );

    let totalRevenue = 0;
    let netRevenue = 0;
    let totalDiscount = 0;
    let totalSurcharge = 0;
    let totalPayment = 0;
    let debtGenerated = 0;
    let totalOrders = 0;
    const byStatus: Record<string, number> = { '1': 0, '2': 0, '3': 0, '5': 0 };

    for (const inv of invoices) {
      const statusStr = String(inv.status);
      byStatus[statusStr] = (byStatus[statusStr] || 0) + 1;

      // Chỉ tính doanh thu cho hóa đơn thành công (status = 1)
      if (inv.status === 1) {
        totalRevenue += inv.total || 0;
        netRevenue += (inv.total || 0) - (inv.surcharge || 0); // KiotViet: Total = Goods - Discount + Surcharge
        totalDiscount += inv.discount || 0;
        totalSurcharge += inv.surcharge || 0;
        totalPayment += inv.totalPayment || 0;
        
        const unpaid = (inv.total || 0) - (inv.totalPayment || 0);
        if (unpaid > 0) debtGenerated += unpaid;
        
        totalOrders += 1;
      }
    }

    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const period = `${input.fromDate} -> ${input.toDate}`;
    const note = total > 300 
      ? `Đã phân tích 300 hóa đơn trên tổng số ${total} hóa đơn của khoảng thời gian này để tránh timeout.` 
      : undefined;

    return {
      totalRevenue,
      netRevenue,
      totalDiscount,
      totalSurcharge,
      totalPayment,
      debtGenerated,
      totalOrders,
      avgOrderValue,
      period,
      byStatus,
      invoiceCount: invoices.length,
      note
    };
  },

  get_top_products: async (token, retailer, input) => {
    const { invoices, total } = await fetchInvoicePages(
      token,
      retailer,
      input.fromDate,
      input.toDate,
      input.branchId
    );

    const topN = Math.max(1, Number(input.topN) || 10);
    const productMap: Record<string, { productId: number; productCode: string; productName: string; totalQty: number; totalRevenue: number }> = {};

    for (const inv of invoices) {
      if (inv.status !== 1) continue;
      const details = inv.invoiceDetails ?? [];
      for (const d of details) {
        if (!d.productId) continue;
        const subTotal = d.subTotal !== undefined ? d.subTotal : ((d.quantity || 0) * (d.price || 0) - (d.discount || 0));
        
        if (!productMap[d.productId]) {
          productMap[d.productId] = {
            productId: d.productId,
            productCode: d.productCode || '',
            productName: d.productName || '',
            totalQty: 0,
            totalRevenue: 0
          };
        }
        productMap[d.productId].totalQty += d.quantity || 0;
        productMap[d.productId].totalRevenue += subTotal || 0;
      }
    }

    const sortedProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, topN);

    const period = `${input.fromDate} -> ${input.toDate}`;
    const note = total > 300 
      ? `Top sản phẩm được tổng hợp từ 300 hóa đơn đầu tiên trong khoảng thời gian này.` 
      : undefined;

    return {
      topProducts: sortedProducts,
      period,
      totalAnalyzed: invoices.length,
      note
    };
  },

  get_sales_by_branch: async (token, retailer, input) => {
    const { invoices, total } = await fetchInvoicePages(
      token,
      retailer,
      input.fromDate,
      input.toDate
    );

    const branchMap: Record<string, { branchId: number; branchName: string; totalRevenue: number; totalOrders: number }> = {};
    let totalRevenue = 0;

    for (const inv of invoices) {
      if (inv.status !== 1) continue;
      const bId = inv.branchId;
      const bName = inv.branchName || `Chi nhánh ${bId}`;

      if (!branchMap[bId]) {
        branchMap[bId] = {
          branchId: bId,
          branchName: bName,
          totalRevenue: 0,
          totalOrders: 0
        };
      }
      branchMap[bId].totalRevenue += inv.total || 0;
      branchMap[bId].totalOrders += 1;
      totalRevenue += inv.total || 0;
    }

    const period = `${input.fromDate} -> ${input.toDate}`;
    const note = total > 300 
      ? `Dữ liệu phân tích chi nhánh dựa trên 300 hóa đơn đầu tiên.` 
      : undefined;

    return {
      branches: Object.values(branchMap),
      period,
      totalRevenue,
      note
    };
  },

  get_sales_by_employee: async (token, retailer, input) => {
    const { invoices, total } = await fetchInvoicePages(
      token,
      retailer,
      input.fromDate,
      input.toDate,
      input.branchId
    );

    const employeeMap: Record<string, { soldById: number; soldByName: string; totalRevenue: number; totalOrders: number }> = {};
    let totalRevenue = 0;

    for (const inv of invoices) {
      if (inv.status !== 1) continue;
      const empId = inv.soldById || inv.creatorId || 0;
      const empName = inv.soldByName || inv.creatorName || 'Không rõ';

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          soldById: empId,
          soldByName: empName,
          totalRevenue: 0,
          totalOrders: 0
        };
      }
      employeeMap[empId].totalRevenue += inv.total || 0;
      employeeMap[empId].totalOrders += 1;
      totalRevenue += inv.total || 0;
    }

    const period = `${input.fromDate} -> ${input.toDate}`;
    const note = total > 300 
      ? `Dữ liệu phân tích nhân viên dựa trên 300 hóa đơn đầu tiên.` 
      : undefined;

    return {
      employees: Object.values(employeeMap),
      period,
      totalRevenue,
      note
    };
  },

  get_customer_debt_report: async (token, retailer, input) => {
    const limit = Math.min(Number(input.pageSize) || 50, 100);
    const minDebt = input.minDebt !== undefined ? Number(input.minDebt) : 0;
    
    const res = await kvGet(token, retailer, '/customers', {
      pageSize: 100,
      includeTotal: true,
      orderBy: 'debt',
      orderDirection: 'Desc'
    });
    
    let customers = res.data || [];
    if (minDebt > 0) {
      customers = customers.filter((c: any) => (c.debt || 0) >= minDebt);
    } else {
      customers = customers.filter((c: any) => (c.debt || 0) > 0);
    }
    
    customers.sort((a: any, b: any) => (b.debt || 0) - (a.debt || 0));
    
    const slicedCustomers = customers.slice(0, limit);
    const totalDebt = customers.reduce((sum: number, c: any) => sum + (c.debt || 0), 0);
    
    return {
      customers: slicedCustomers.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        debt: c.debt || 0,
        totalInvoiced: c.totalInvoiced || 0
      })),
      totalDebt,
      count: customers.length
    };
  },

  get_inventory_report: async (token, retailer, input) => {
    const limit = Math.min(Number(input.pageSize) || 100, 100);
    const params: Record<string, any> = {
      pageSize: limit
    };
    if (input.categoryId) {
      params.categoryId = input.categoryId;
    }
    
    const res = await kvGet(token, retailer, '/products', params);
    const rawProducts = res.data || [];
    
    const products = rawProducts.map((p: any) => {
      const totalStock = (p.inventories || []).reduce((acc: number, inv: any) => acc + (inv.onHand || 0), 0);
      const branchStocks = (p.inventories || []).map((inv: any) => ({
        branchId: inv.branchId,
        branchName: inv.branchName || `Chi nhánh ${inv.branchId}`,
        onHand: inv.onHand || 0
      }));
      return {
        id: p.id,
        code: p.code,
        name: p.fullName || p.name,
        totalStock,
        branchStocks
      };
    });
    
    return {
      products,
      totalProducts: res.total || products.length
    };
  },

  // === Tiện ích & Hỗ trợ ===
  list_branches: async (token, retailer, _input) => {
    return kvGet(token, retailer, '/branches');
  },
  probe_sample_data: async (token, retailer, _input) => {
    const [productsRes, ordersRes, invoicesRes, customersRes] = await Promise.allSettled([
      kvGet(token, retailer, '/products', { pageSize: 1 }),
      kvGet(token, retailer, '/orders', { pageSize: 1 }),
      kvGet(token, retailer, '/invoices', { pageSize: 1 }),
      kvGet(token, retailer, '/customers', { pageSize: 1 })
    ]);

    return {
      product: productsRes.status === 'fulfilled' && productsRes.value.data?.[0] ? productsRes.value.data[0] : null,
      order: ordersRes.status === 'fulfilled' && ordersRes.value.data?.[0] ? ordersRes.value.data[0] : null,
      invoice: invoicesRes.status === 'fulfilled' && invoicesRes.value.data?.[0] ? invoicesRes.value.data[0] : null,
      customer: customersRes.status === 'fulfilled' && customersRes.value.data?.[0] ? customersRes.value.data[0] : null
    };
  }
};

export async function runKiotViet(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const retailer = (credentials.retailer || '').trim();
  const clientId = (credentials.clientId || '').trim();
  const clientSecret = (credentials.clientSecret || '').trim();

  if (!retailer || !clientId || !clientSecret) {
    throw new Error('Thiếu thông tin xác thực KiotViet (Retailer, Client ID hoặc Client Secret).');
  }

  const creds: KiotVietCredentials = { retailer, clientId, clientSecret };

  const handler = ACTION_HANDLERS[actionSlug];
  if (!handler) {
    throw new Error(`Action "${actionSlug}" không được hỗ trợ bởi connector KiotViet.`);
  }

  try {
    let token = await getKiotVietAccessToken(creds);

    try {
      return await handler(token, retailer, input);
    } catch (err: any) {
      // Tự động refresh token nếu hết hạn (HTTP 401)
      if (err.status === 401) {
        token = await getKiotVietAccessToken(creds);
        return await handler(token, retailer, input);
      }
      throw err;
    }
  } catch (error: any) {
    const rawMessage = error.message || String(error);
    throw new Error(`Lỗi KiotViet API: ${sanitizeError(rawMessage)}`);
  }
}
