export function isInternalUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    
    // AWS / Cloud Metadata API
    if (hostname === '169.254.169.254') {
      return true;
    }
    
    // RFC1918 Private IP Ranges (10.x.x.x, 172.16.x.x-172.31.x.x, 192.168.x.x)
    const ipPattern = /^(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)$/;
    if (ipPattern.test(hostname)) {
      return true;
    }
    
    return false;
  } catch (e) {
    return true; // Từ chối nếu URL không phân tích cú pháp được
  }
}

export async function runCustomHttp(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const baseUrl = (credentials.baseUrl || '').trim();
  const authMethod = credentials.authMethod || 'none';
  const path = (input.path || '').trim();

  if (!baseUrl) {
    throw new Error('Thiếu Base URL của API.');
  }

  // Xử lý ghép URL an toàn
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${cleanBaseUrl}${cleanPath}`;

  // Kiểm tra chặn SSRF
  if (isInternalUrl(fullUrl)) {
    throw new Error('Bảo mật: Từ chối truy cập vào địa chỉ IP nội bộ.');
  }

  // Chuẩn bị headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Áp dụng xác thực dựa trên authMethod
  if (authMethod === 'bearer_token' && credentials.token) {
    headers['Authorization'] = `Bearer ${credentials.token}`;
  } else if (authMethod === 'api_key_header' && credentials.token && credentials.headerName) {
    headers[credentials.headerName] = credentials.token;
  } else if (authMethod === 'basic_auth' && credentials.username && credentials.password) {
    const base64Credentials = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    headers['Authorization'] = `Basic ${base64Credentials}`;
  }

  const method = actionSlug === 'post_request' ? 'POST' : 'GET';
  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(10000) // Timeout sau 10s tránh treo Serverless/Thread Pool
  };

  if (method === 'POST') {
    let bodyData = null;
    if (input.body) {
      try {
        bodyData = typeof input.body === 'string' ? JSON.parse(input.body) : input.body;
      } catch (e) {
        throw new Error('Dữ liệu Body gửi lên không phải JSON hợp lệ.');
      }
    }
    if (bodyData) {
      fetchOptions.body = JSON.stringify(bodyData);
    }
  }

  const response = await fetch(fullUrl, fetchOptions);
  
  let responseData;
  const text = await response.text();
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (e) {
    responseData = { rawText: text };
  }

  if (!response.ok) {
    throw new Error(
      `API trả về lỗi HTTP ${response.status}: ${
        responseData.error || responseData.message || text || response.statusText
      }`
    );
  }

  return responseData;
}
