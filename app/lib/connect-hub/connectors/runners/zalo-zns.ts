const ZALO_OA_API = 'https://openapi.zalo.me/v2.0/oa';

async function refreshZaloToken(appId: string, secretKey: string, refreshToken: string) {
  const res = await fetch(`https://oauth.zaloapp.com/v4/oa/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'secret_key': secretKey },
    body: new URLSearchParams({ app_id: appId, grant_type: 'refresh_token', refresh_token: refreshToken }),
    signal: AbortSignal.timeout(8000)
  });
  
  if (!res.ok) {
    throw new Error('Không thể refresh Zalo OA token.');
  }
  
  const data = await res.json();
  if (data.error && data.error !== 0) {
    throw new Error(`Refresh Zalo OA token lỗi ${data.error}: ${data.error_description || data.message}`);
  }
  
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

export async function runZaloZns(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const { access_token, app_id, secret_key, refresh_token } = credentials;

  // Auto-refresh nếu cần (thử với token hiện tại, nếu 401/lỗi token thì refresh)
  let token = access_token;

  const callApi = async (endpoint: string, body: object = {}, method: string = 'POST') => {
    const isGet = method === 'GET';
    const fetchOptions: RequestInit = {
      method,
      headers: isGet
        ? { 'access_token': token }
        : { 'access_token': token, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    };
    
    if (!isGet) {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(`${ZALO_OA_API}${endpoint}`, fetchOptions);
    const data = await res.json();
    
    // error -216 is Access token expired
    if (data.error === -216) {
      const refreshed = await refreshZaloToken(app_id, secret_key, refresh_token);
      token = refreshed.access_token;
      
      // Retry once with new token
      if (fetchOptions.headers) {
        (fetchOptions.headers as any)['access_token'] = token;
      }
      
      const retry = await fetch(`${ZALO_OA_API}${endpoint}`, fetchOptions);
      const retryData = await retry.json();
      if (retryData.error && retryData.error !== 0) {
        throw new Error(`Zalo API lỗi ${retryData.error}: ${retryData.message}`);
      }
      return retryData;
    }
    
    if (data.error && data.error !== 0) {
      throw new Error(`Zalo API lỗi ${data.error}: ${data.message}`);
    }
    
    return data;
  };

  switch (actionSlug) {
    case 'send_zns_template': {
      let templateData = input.template_data;
      if (typeof templateData === 'string') {
        try {
          templateData = JSON.parse(templateData);
        } catch {
          throw new Error('Dữ liệu template_data không phải là JSON hợp lệ.');
        }
      }
      
      // Đảm bảo số điện thoại bắt đầu bằng 84
      let phone = String(input.phone || '').replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '84' + phone.substring(1);
      }
      
      return callApi('/message/template', {
        phone,
        template_id: input.template_id,
        template_data: templateData || {},
        tracking_id: `flow_${Date.now()}`
      });
    }
    case 'send_oa_broadcast': {
      return callApi('/message/cs', {
        recipient: { user_id: input.user_id },
        message: { text: input.message }
      });
    }
    case 'get_oa_info': {
      return callApi('/getoa', {}, 'GET');
    }
    default:
      throw new Error(`Zalo ZNS action "${actionSlug}" chưa được hỗ trợ.`);
  }
}
