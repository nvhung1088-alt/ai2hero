const DEFAULT_SERVER = 'https://www.ai2hero.com';

export async function apiCall(endpoint, method = 'GET', body = null) {
  const { token, serverUrl } = await chrome.storage.local.get(['token', 'serverUrl']);
  const url = `${serverUrl || DEFAULT_SERVER}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (response.status === 401) {
      await chrome.storage.local.remove(['token', 'paired', 'teamId', 'teamName']);
      // Thông báo cho popup session đã hết hạn
      chrome.runtime.sendMessage({ type: 'SESSION_EXPIRED' }).catch(() => {});
      throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Lỗi HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[apiCall Error]:', error);
    throw error;
  }
}
