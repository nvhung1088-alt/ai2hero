/**
 * Runner cho Postiz - Xử lý gọi API thật sang Postiz Backend
 * Tuân thủ quy tắc bảo mật và timeout của Connect Hub.
 */

export async function runPostiz(
  creds: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const apiUrl = creds.apiUrl?.replace(/\/$/, '') || 'http://localhost:5000';
  const apiKey = creds.apiKey;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };

    let url = '';
    let method = 'GET';
    let body: string | undefined;

    switch (actionSlug) {
      case 'list_accounts':
        url = `${apiUrl}/public/v1/integrations`;
        method = 'GET';
        break;

      case 'create_post':
        url = `${apiUrl}/public/v1/posts`;
        method = 'POST';
        body = JSON.stringify({
          content: input.content,
          publishDate: input.publishDate,
          integrationId: input.integrationId,
        });
        break;

      case 'get_analytics':
        const integration = input.integration || 'twitter';
        url = `${apiUrl}/public/v1/analytics/${integration}`;
        method = 'GET';
        break;

      default:
        throw new Error(`Action "${actionSlug}" chưa được hỗ trợ bởi Runner Postiz.`);
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Postiz API trả về lỗi (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
