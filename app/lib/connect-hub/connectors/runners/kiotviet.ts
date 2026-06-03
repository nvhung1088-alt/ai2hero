interface KiotVietCredentials {
  retailer: string;
  clientId: string;
  clientSecret: string;
}

async function getKiotVietAccessToken(creds: KiotVietCredentials): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', creds.clientId);
  params.append('client_secret', creds.clientSecret);
  params.append('scopes', 'PublicApi.Access');

  const response = await fetch('https://id.kiotviet.vn/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Lỗi xác thực KiotViet (OAuth): ${data.error_description || data.error || 'Unknown error'}`);
  }

  if (!data.access_token) {
    throw new Error('Không nhận được access_token từ máy chủ KiotViet.');
  }

  return data.access_token;
}

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

  // 1. Lấy Access Token
  const accessToken = await getKiotVietAccessToken({ retailer, clientId, clientSecret });

  // 2. Định cấu hình headers gọi API công khai của KiotViet
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Retailer': retailer,
    'Accept': 'application/json'
  };

  // 3. Thực thi action tương ứng
  let url = '';
  if (actionSlug === 'list_products') {
    url = 'https://public.kiotapi.com/products';
  } else if (actionSlug === 'list_orders') {
    const pageSize = input.pageSize || '20';
    url = `https://public.kiotapi.com/orders?pageSize=${pageSize}`;
  } else if (actionSlug === 'list_customers') {
    url = 'https://public.kiotapi.com/customers';
  } else {
    throw new Error(`Action "${actionSlug}" không được hỗ trợ bởi connector KiotViet.`);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers
  });

  const text = await response.text();
  let responseData;
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (e) {
    responseData = { rawText: text };
  }

  if (!response.ok) {
    throw new Error(
      `Lỗi kết nối KiotViet API: ${
        responseData.responseStatus?.message || responseData.message || text || response.statusText
      }`
    );
  }

  return responseData;
}
