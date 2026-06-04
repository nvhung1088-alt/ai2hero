export const STATUS_GROUPS = {
  confirmed: [1, 2, 3, 8, 9, 16],   // "Đơn chốt" — khớp Dashboard
  paid: [16],                         // Đã thu tiền
  delivered: [3],                     // Đã nhận
  active: [0, 1, 2, 3, 8, 9, 11, 12, 13, 16, 20], // Tất cả trừ hoàn/hủy
  all: undefined,                     // Không filter
} as const;

/**
 * Chuyển đổi ngày bắt đầu và kết thúc (YYYY-MM-DD) sang Unix timestamp (giây) theo múi giờ Việt Nam.
 * Đảm bảo bao phủ toàn bộ ngày từ 00:00:00 đến 23:59:59.
 */
export function toPancakeDateRange(
  startDate: string, // "2026-06-04"
  endDate: string    // "2026-06-04"
): { startDateTime: number; endDateTime: number } {
  // Quy đổi về giờ Việt Nam (+07:00)
  const start = new Date(`${startDate}T00:00:00+07:00`).getTime();
  const end = new Date(`${endDate}T23:59:59+07:00`).getTime();

  return {
    startDateTime: isNaN(start) ? 0 : Math.floor(start / 1000),
    endDateTime: isNaN(end) ? 0 : Math.floor(end / 1000)
  };
}

/**
 * Helper để parse thời gian từ API Pancake POS.
 * Vì Pancake POS trả về inserted_at dạng UTC nhưng không có chữ Z ở cuối,
 * ta bắt buộc phải thêm chữ Z để JS hiểu đúng giờ UTC và hiển thị đúng giờ Việt Nam.
 */
export function parsePancakeDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z') || dateStr.includes('+')) {
    return new Date(dateStr);
  }
  return new Date(dateStr + 'Z');
}

const BASE_URL = 'https://pos.pages.fm/api/v1';

export class PancakePosClient {
  private cache = new Map<string, { data: any; expiry: number }>();
  private CACHE_TTL = 10 * 60 * 1000; // 10 phút

  constructor(private shopId: string, private apiKey: string) {
    if (!shopId || !apiKey) {
      throw new Error('Thiếu cấu hình Shop ID hoặc API Key cho Pancake POS.');
    }
  }

  /**
   * Che API Key trong các thông điệp log hoặc error
   */
  private redactUrl(url: string): string {
    return url.replace(this.apiKey, '6b82***ce2');
  }

  /**
   * Serialize params theo chuẩn của Pancake POS.
   * Đặc biệt xử lý các tham số mảng như filter_status[] hoặc fields[]
   */
  private serializeParams(params: Record<string, any> = {}): string {
    const queryParts: string[] = [];
    queryParts.push(`api_key=${this.apiKey}`);

    Object.entries(params).forEach(([key, val]) => {
      if (val === undefined || val === null) return;

      if (Array.isArray(val)) {
        // Đối với tham số mảng, Pancake POS yêu cầu cú pháp key[]=val1&key[]=val2
        val.forEach(v => {
          queryParts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(v))}`);
        });
      } else {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    });

    return queryParts.join('&');
  }

  /**
   * Xây dựng URL đầy đủ cho request
   */
  private buildUrl(path: string, params?: Record<string, any>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const queryString = this.serializeParams(params);
    return `${BASE_URL}/shops/${this.shopId}${cleanPath}?${queryString}`;
  }

  /**
   * Gửi request với cơ chế Timeout 15s và Retry 2 lần khi gặp lỗi mạng/429/5xx
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, delay = 1000): Promise<Response> {
    const redactedUrl = this.redactUrl(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout 15 giây

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Nếu gặp mã lỗi 429 (Rate Limit) hoặc 5xx (Lỗi Server) và vẫn còn lượt retry
      if ((res.status === 429 || res.status >= 500) && retries > 0) {
        let retryAfter = delay;
        const retryHeader = res.headers.get('Retry-After');
        if (retryHeader) {
          const seconds = parseInt(retryHeader, 10);
          if (!isNaN(seconds)) retryAfter = seconds * 1000;
        }

        console.warn(`[PancakePosClient] Request lỗi ${res.status}. Đang thử lại sau ${retryAfter}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return this.fetchWithRetry(url, options, retries - 1, delay * 2);
      }

      return res;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Kết nối đến Pancake POS bị quá thời gian (15s): ${redactedUrl}`);
      }
      if (retries > 0) {
        console.warn(`[PancakePosClient] Lỗi kết nối mạng: ${error.message}. Đang thử lại...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Gọi API GET (Có cache cho các API tĩnh như warehouses)
   */
  async get<T>(path: string, params?: Record<string, any>, useCache = false): Promise<T> {
    const url = this.buildUrl(path, params);
    const redactedUrl = this.redactUrl(url);

    if (useCache) {
      const cached = this.cache.get(url);
      if (cached && cached.expiry > Date.now()) {
        return cached.data as T;
      }
    }

    try {
      const res = await this.fetchWithRetry(url, { method: 'GET' });
      const text = await res.text();
      let json: any;

      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Định dạng dữ liệu trả về từ Pancake POS không hợp lệ (không phải JSON): ${text.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(`Lỗi từ Pancake POS (${res.status}): ${json.message || text}`);
      }

      // POS API trả về success: false cho một số trường hợp lỗi quyền hạn hoặc tham số sai
      if (json.success === false) {
        throw new Error(`Lỗi từ API: ${json.message || 'Thao tác không thành công.'}`);
      }

      if (useCache) {
        this.cache.set(url, { data: json, expiry: Date.now() + this.CACHE_TTL });
      }

      return json as T;
    } catch (error: any) {
      console.error(`[PancakePosClient Error] Đường dẫn: ${redactedUrl} | Lỗi: ${error.message}`);
      throw new Error(`Không thể hoàn thành hành động GET trên Pancake POS: ${error.message}`);
    }
  }

  /**
   * Gọi API GET danh sách phân trang
   */
  async getList<T>(path: string, params?: Record<string, any>, useCache = false): Promise<{
    data: T[];
    total_entries: number;
    total_pages: number;
    aggs?: any;
    success: boolean;
  }> {
    const json = await this.get<any>(path, params, useCache);
    
    // Pancake POS API thường trả về data trong trường data hoặc orders hoặc products hoặc customers...
    const data = json.data || json.orders || json.products || json.customers || [];
    
    return {
      data: Array.isArray(data) ? data : [],
      total_entries: Number(json.total_entries ?? (Array.isArray(data) ? data.length : 0)),
      total_pages: Number(json.total_pages ?? 1),
      aggs: json.aggs || null,
      success: json.success !== false
    };
  }
}
