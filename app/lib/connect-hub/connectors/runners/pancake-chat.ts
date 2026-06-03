export async function runPancakeChat(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const { userAccessToken } = credentials;
  if (!userAccessToken) {
    throw new Error('Thiếu cấu hình User Access Token cho Pancake Chat');
  }

  const BASE_URL = 'https://pages.fm/api/v1';
  const PUBLIC_API = 'https://pages.fm/api/public_api/v1';

  // Helper để fetch các API của Pancake
  const fetchPancake = async (url: string, method: string = 'GET', body?: any) => {
    // Với Pancake, token thường được nhét vào query param access_token
    const urlObj = new URL(url);
    urlObj.searchParams.append('access_token', userAccessToken);

    const res = await fetch(urlObj.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`Pancake API Error: ${res.status} - ${data?.message || res.statusText}`);
    }
    return data;
  };

  // 1. ACTION: Lấy danh sách Pages
  if (actionSlug === 'list_pages') {
    try {
      const data = await fetchPancake(`${BASE_URL}/pages`);
      // Pancake API trả về { pages: [...] }
      const pages = data?.pages || data?.data || (Array.isArray(data) ? data : []);
      return {
        status: 'success',
        data: pages
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy danh sách Pages: ${error.message}`);
    }
  }

  // 2. ACTION: Lấy toàn bộ hội thoại từ tất cả các Pages
  if (actionSlug === 'list_conversations') {
    try {
      // 2.1: Fetch list pages trước
      const pagesRes = await fetchPancake(`${BASE_URL}/pages`);
      const pages = pagesRes?.pages || pagesRes?.data || (Array.isArray(pagesRes) ? pagesRes : []);

      if (!Array.isArray(pages) || pages.length === 0) {
        return { status: 'success', data: [], message: 'Không tìm thấy Fanpage nào.' };
      }

      // Giới hạn max 20 pages để tránh quá tải
      const targetPages = pages.slice(0, 20);
      let allConversations: any[] = [];

      // 2.2: Gọi API lấy hội thoại cho từng Page chạy song song
      const promises = targetPages.map(async (page: any) => {
        try {
          const pageId = page.id || page.page_id;
          if (!pageId) return [];

          // Sử dụng endpoint conversations của page (có thể tùy API version)
          // Đôi khi là: /pages/{page_id}/conversations
          const convData = await fetchPancake(`${BASE_URL}/pages/${pageId}/conversations`);
          
          const convs = convData?.data || [];
          // Gắn thêm page_id và page_name vào mỗi conversation để dễ phân biệt
          return convs.map((c: any) => ({
            ...c,
            _page_id: pageId,
            _page_name: page.name
          }));
        } catch (err) {
          console.warn(`Lỗi fetch hội thoại cho page:`, err);
          return []; // Bỏ qua page lỗi
        }
      });

      const results = await Promise.allSettled(promises);
      results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          allConversations = [...allConversations, ...res.value];
        }
      });

      // Trả về danh sách hội thoại đã được gộp từ các trang
      return {
        status: 'success',
        total_pages_scanned: targetPages.length,
        total_conversations: allConversations.length,
        data: allConversations
      };

    } catch (error: any) {
      throw new Error(`Lỗi gộp hội thoại Đa-Page: ${error.message}`);
    }
  }

  // 3. ACTION: Gửi tin nhắn
  if (actionSlug === 'send_message') {
    const { page_id, conversation_id, message } = input;
    if (!page_id || !conversation_id || !message) {
      throw new Error('Thiếu page_id, conversation_id hoặc message để gửi tin nhắn.');
    }

    try {
      // Endpoint gửi tin nhắn của Pancake
      const resData = await fetchPancake(`${BASE_URL}/pages/${page_id}/conversations/${conversation_id}/messages`, 'POST', {
        message: message
      });

      return {
        status: 'success',
        data: resData
      };
    } catch (error: any) {
      throw new Error(`Gửi tin nhắn thất bại: ${error.message}`);
    }
  }
  // 4. ACTION: Thống kê Nhân viên
  if (actionSlug === 'get_staff_statistics') {
    const { since, until } = input;
    if (!since || !until) throw new Error('Thiếu tham số since hoặc until');

    try {
      const pagesRes = await fetchPancake(`${BASE_URL}/pages`);
      const pages = pagesRes?.pages || pagesRes?.data || (Array.isArray(pagesRes) ? pagesRes : []);
      if (!Array.isArray(pages) || pages.length === 0) return { status: 'success', data: [] };

      const targetPages = pages.slice(0, 20);
      let allStats: any[] = [];

      const promises = targetPages.map(async (page: any) => {
        try {
          const pageId = page.id || page.page_id;
          if (!pageId) return [];
          const statData = await fetchPancake(`${PUBLIC_API}/pages/${pageId}/statistics/users?since=${since}&until=${until}`);
          const stats = statData?.data || [];
          return stats.map((s: any) => ({ ...s, _page_id: pageId, _page_name: page.name }));
        } catch (err) {
          return [];
        }
      });

      const results = await Promise.allSettled(promises);
      results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          allStats = [...allStats, ...res.value];
        }
      });

      return { status: 'success', total_pages: targetPages.length, data: allStats };
    } catch (error: any) {
      throw new Error(`Lỗi lấy thống kê nhân viên: ${error.message}`);
    }
  }

  // 5. ACTION: Thống kê Tổng quan
  if (actionSlug === 'get_page_statistics') {
    const { since, until } = input;
    if (!since || !until) throw new Error('Thiếu tham số since hoặc until');

    try {
      const pagesRes = await fetchPancake(`${BASE_URL}/pages`);
      const pages = pagesRes?.pages || pagesRes?.data || (Array.isArray(pagesRes) ? pagesRes : []);
      if (!Array.isArray(pages) || pages.length === 0) return { status: 'success', data: [] };

      const targetPages = pages.slice(0, 20);
      let allStats: any[] = [];

      const promises = targetPages.map(async (page: any) => {
        try {
          const pageId = page.id || page.page_id;
          if (!pageId) return [];
          const statData = await fetchPancake(`${PUBLIC_API}/pages/${pageId}/statistics/pages?since=${since}&until=${until}`);
          // statData có thể là object chứa các thông số tổng (inbox, comment, message)
          return { _page_id: pageId, _page_name: page.name, ...statData };
        } catch (err) {
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value) {
          allStats.push(res.value);
        }
      });

      return { status: 'success', total_pages: targetPages.length, data: allStats };
    } catch (error: any) {
      throw new Error(`Lỗi lấy thống kê page: ${error.message}`);
    }
  }

  throw new Error(`Action ${actionSlug} chưa được hỗ trợ trên Pancake Chat`);
}
