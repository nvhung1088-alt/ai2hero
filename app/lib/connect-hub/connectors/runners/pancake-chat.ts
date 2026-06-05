export async function runPancakeChat(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const { userAccessToken, selectedPageIds } = credentials;
  if (!userAccessToken) {
    throw new Error('Thiếu cấu hình User Access Token cho Pancake Chat');
  }

  const BASE_URL = 'https://pages.fm/api/v1';
  const PUBLIC_API = 'https://pages.fm/api/public_api/v1';

  // Helper để sinh Page Access Token động (Option B)
  const getPageToken = async (pageId: string): Promise<string> => {
    try {
      const url = `${BASE_URL}/pages/${pageId}/generate_page_access_token`;
      const urlObj = new URL(url);
      urlObj.searchParams.append('access_token', userAccessToken);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      try {
        const res = await fetch(urlObj.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.page_access_token) {
          return data.page_access_token;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (e) {
      console.warn(`[Pancake Chat] generate_page_access_token failed for page ${pageId}, falling back to userAccessToken`, e);
    }
    // Fallback về userAccessToken nếu không tạo được page token
    return userAccessToken;
  };

  // Helper để fetch các API của Pancake với đầy đủ bảo mật & timeout
  const fetchPancake = async (url: string, method: string = 'GET', body?: any) => {
    const urlObj = new URL(url);

    // SSRF Guard
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(urlObj.hostname) ||
        urlObj.hostname.startsWith('10.') || 
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('169.254.')) {
      throw new Error('SSRF blocked: URL nội bộ không được phép');
    }

    let activeToken = userAccessToken;
    const isPublicApi = url.includes('/api/public_api/v1');
    const pageIdMatch = url.match(/\/pages\/([^/]+)/);

    // Định tuyến Token (Token Routing):
    // Nếu là Page-level Public API và có pageId trong endpoint, sử dụng page_access_token
    if (isPublicApi && pageIdMatch) {
      const pageId = pageIdMatch[1];
      activeToken = await getPageToken(pageId);
      urlObj.searchParams.append('page_access_token', activeToken);
    } else {
      urlObj.searchParams.append('access_token', activeToken);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(urlObj.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(`Pancake API Error: ${res.status} - ${data?.message || res.statusText}`);
      }

      if (data && data.success === false) {
        throw new Error(`Pancake API Error: ${data.message || 'Yêu cầu thất bại'} (code: ${data.error_code || 'unknown'})`);
      }

      return data;
    } catch (error: any) {
      let msg = error.message || '';
      // Che token nhạy cảm trong log lỗi
      if (userAccessToken) {
        msg = msg.replaceAll(userAccessToken, '***TOKEN***');
      }
      if (activeToken && activeToken !== userAccessToken) {
        msg = msg.replaceAll(activeToken, '***TOKEN***');
      }
      throw new Error(msg);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Helper bóc tách danh sách pages từ cấu trúc phản hồi dạng categorized
  const extractPages = (data: any): any[] => {
    if (!data) return [];
    if (data.categorized) {
      const activated = data.categorized.activated || [];
      const inactivated = data.categorized.inactivated || [];
      return [...activated, ...inactivated];
    }
    return data.pages || data.data || (Array.isArray(data) ? data : []);
  };

  // 1. ACTION: Lấy danh sách Pages
  if (actionSlug === 'list_pages') {
    try {
      const data = await fetchPancake(`${BASE_URL}/pages`);
      const pages = extractPages(data);
      return {
        status: 'success',
        data: pages
      };
    } catch (error: any) {
      throw new Error(`Không thể lấy danh sách Pages: ${error.message}`);
    }
  }

  // 2. ACTION: Lấy toàn bộ hội thoại từ một hoặc tất cả các Pages
  if (actionSlug === 'list_conversations') {
    const { pageId } = input;
    try {
      let targetPages: any[] = [];
      if (pageId) {
        targetPages = [{ id: pageId, name: `Page ${pageId}` }];
      } else if (selectedPageIds) {
        const ids = selectedPageIds.split(',').map(id => id.trim()).filter(id => id);
        targetPages = ids.map(id => ({ id, name: `Page ${id}` }));
      } else {
        const pagesRes = await fetchPancake(`${BASE_URL}/pages`);
        const pages = extractPages(pagesRes);

        if (!Array.isArray(pages) || pages.length === 0) {
          return { status: 'success', data: [], message: 'Không tìm thấy Fanpage nào.' };
        }
        // Giới hạn max 20 pages để tránh quá tải
        targetPages = pages.slice(0, 20);
      }

      let allConversations: any[] = [];

      const promises = targetPages.map(async (page: any) => {
        try {
          const pId = page.id || page.page_id;
          if (!pId) return [];

          const convData = await fetchPancake(`${BASE_URL}/pages/${pId}/conversations`);
          const convs = convData?.data || [];
          return convs.map((c: any) => ({
            ...c,
            _page_id: pId,
            _page_name: page.name || `Page ${pId}`
          }));
        } catch (err) {
          console.warn(`Lỗi fetch hội thoại cho page ${page.id}:`, err);
          return [];
        }
      });

      const results = await Promise.allSettled(promises);
      results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          allConversations = [...allConversations, ...res.value];
        }
      });

      return {
        status: 'success',
        total_pages_scanned: targetPages.length,
        total_conversations: allConversations.length,
        data: allConversations
      };
    } catch (error: any) {
      throw new Error(`Lỗi gộp hội thoại: ${error.message}`);
    }
  }

  // 3. ACTION: Gửi tin nhắn
  if (actionSlug === 'send_message') {
    const { page_id, conversation_id, message } = input;
    if (!page_id || !conversation_id || !message) {
      throw new Error('Thiếu page_id, conversation_id hoặc message để gửi tin nhắn.');
    }

    try {
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

  // 4. ACTION: Tạo Page Access Token thủ công
  if (actionSlug === 'generate_page_token') {
    const { pageId } = input;
    if (!pageId) throw new Error('Thiếu pageId để tạo token');
    try {
      const pageAccessToken = await getPageToken(pageId);
      return {
        status: 'success',
        page_access_token: pageAccessToken
      };
    } catch (error: any) {
      throw new Error(`Tạo Page Token thất bại: ${error.message}`);
    }
  }

  // 5. ACTION: Lấy danh sách tin nhắn của 1 hội thoại
  if (actionSlug === 'list_messages') {
    const { pageId, conversationId } = input;
    if (!pageId || !conversationId) throw new Error('Thiếu pageId hoặc conversationId');
    try {
      const data = await fetchPancake(`${BASE_URL}/pages/${pageId}/conversations/${conversationId}/messages`);
      return {
        status: 'success',
        data: data?.data || data || []
      };
    } catch (error: any) {
      throw new Error(`Lấy danh sách tin nhắn thất bại: ${error.message}`);
    }
  }

  // 6. ACTION: Lấy danh sách khách hàng CRM
  if (actionSlug === 'list_customers') {
    const { pageId } = input;
    if (!pageId) throw new Error('Thiếu pageId');
    try {
      const data = await fetchPancake(`${BASE_URL}/pages/${pageId}/customers`);
      return {
        status: 'success',
        data: data?.data || data || []
      };
    } catch (error: any) {
      throw new Error(`Lấy danh sách khách hàng thất bại: ${error.message}`);
    }
  }

  // 7. ACTION: Lấy danh sách tags hội thoại
  if (actionSlug === 'list_tags') {
    const { pageId } = input;
    if (!pageId) throw new Error('Thiếu pageId');
    try {
      const data = await fetchPancake(`${BASE_URL}/pages/${pageId}/tags`);
      return {
        status: 'success',
        data: data?.data || data || []
      };
    } catch (error: any) {
      throw new Error(`Lấy danh sách tags thất bại: ${error.message}`);
    }
  }

  // 8. ACTION: Thống kê Nhân viên
  if (actionSlug === 'get_staff_statistics') {
    const { since, until, pageId } = input;
    if (!since || !until) throw new Error('Thiếu tham số since hoặc until');

    try {
      let targetPages: any[] = [];
      if (pageId) {
        targetPages = [{ id: pageId, name: `Page ${pageId}` }];
      } else if (selectedPageIds) {
        const ids = selectedPageIds.split(',').map(id => id.trim()).filter(id => id);
        targetPages = ids.map(id => ({ id, name: `Page ${id}` }));
      } else {
        const pagesRes = await fetchPancake(`${BASE_URL}/pages`);
        const pages = extractPages(pagesRes);
        if (!Array.isArray(pages) || pages.length === 0) return { status: 'success', data: [] };
        targetPages = pages.slice(0, 20);
      }

      let allStats: any[] = [];

      const promises = targetPages.map(async (page: any) => {
        try {
          const pId = page.id || page.page_id;
          if (!pId) return [];
          const statData = await fetchPancake(`${PUBLIC_API}/pages/${pId}/statistics/users?since=${since}&until=${until}`);
          
          const staffArray: any[] = [];
          const statistics = statData?.data?.statistics || {};
          const users = statData?.data?.users || {};
          
          for (const userId of Object.keys(statistics)) {
            const userHourlyMetrics = statistics[userId] || [];
            const userObj = users[userId] || {};
            const userName = userObj.user_name || userObj.name || `Nhân viên ${userId}`;
            
            let totalMessages = 0;
            let totalConversations = 0;
            
            for (const metric of userHourlyMetrics) {
              const inbox = Number(metric.inbox_count || 0);
              const comment = Number(metric.comment_count || 0);
              const newConvs = Number(metric.new_conversations || 0);
              
              totalMessages += (inbox + comment);
              totalConversations += (newConvs || inbox);
            }
            
            staffArray.push({
              name: userName,
              messages: totalMessages,
              conversations: totalConversations,
              _page_id: pId,
              _page_name: page.name || `Page ${pId}`
            });
          }
          return staffArray;
        } catch (err) {
          console.warn(`Lỗi get_staff_statistics cho page ${page.id}:`, err);
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

  // 9. ACTION: Thống kê Tổng quan Page
  if (actionSlug === 'get_page_statistics') {
    const { since, until, pageId } = input;
    if (!since || !until) throw new Error('Thiếu tham số since hoặc until');

    // Helper suy ra platform từ prefix ID (không cần gọi thêm list_pages)
    const inferPlatform = (id: string): string => {
      if (id.startsWith('pzl_')) return 'zalo';
      if (id.startsWith('spo_')) return 'shopee';
      if (id.startsWith('ig_')) return 'instagram';
      if (id.startsWith('tiktok_')) return 'tiktok';
      return 'facebook';
    };

    try {
      let targetPages: any[] = [];

      if (pageId) {
        // User chỉ định 1 page cụ thể → không cần gọi list_pages
        targetPages = [{ id: pageId, name: `Page ${pageId}`, platform: inferPlatform(String(pageId)) }];
      } else if (selectedPageIds) {
        // User đã cấu hình danh sách page → dùng trực tiếp, KHÔNG gọi list_pages
        const ids = selectedPageIds.split(',').map((id: string) => id.trim()).filter((id: string) => id);
        targetPages = ids.map((id: string) => ({ id, name: `Page ${id}`, platform: inferPlatform(id) }));
      } else {
        // Không có cấu hình → gọi list_pages 1 lần duy nhất để lấy danh sách + tên
        const pagesRes = await fetchPancake(`${BASE_URL}/pages`);
        const allPages = extractPages(pagesRes) || [];
        targetPages = allPages.slice(0, 20).map((p: any) => {
          const pId = String(p.id || p.page_id || '');
          return {
            id: pId,
            name: p.name || `Page ${pId}`,
            platform: p.platform || inferPlatform(pId)
          };
        });
      }

      if (targetPages.length === 0) {
        return { status: 'success', total_pages: 0, data: [] };
      }

      let allStats: any[] = [];

      const promises = targetPages.map(async (page: any) => {
        try {
          const pId = page.id || page.page_id;
          if (!pId) return null;
          const statData = await fetchPancake(`${PUBLIC_API}/pages/${pId}/statistics/pages?since=${since}&until=${until}`);

          const hourlyMetrics = Array.isArray(statData) ? statData : (statData?.data || []);

          let totalMessages = 0;
          let totalConversations = 0;
          let totalComments = 0;
          let totalNewCustomers = 0;

          for (const metric of hourlyMetrics) {
            const custInbox = Number(metric.customer_inbox_count || 0);
            const pageInbox = Number(metric.page_inbox_count || 0);
            const custComment = Number(metric.customer_comment_count || 0);
            const pageComment = Number(metric.page_comment_count || 0);
            const newCust = Number(metric.new_customer_count || metric.new_inbox_count || 0);

            totalMessages += (custInbox + pageInbox);
            totalConversations += custInbox;
            totalComments += (custComment + pageComment);
            totalNewCustomers += newCust;
          }

          return {
            _page_id: pId,
            _page_name: page.name,
            platform: page.platform,
            messages: totalMessages,
            conversations: totalConversations,
            comments: totalComments,
            new_customers: totalNewCustomers
          };
        } catch (err) {
          console.warn(`Lỗi get_page_statistics cho page ${page.id}:`, err);
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

  // 10. ACTION: Thống kê theo Tag
  if (actionSlug === 'get_tag_statistics') {
    const { pageId, since, until } = input;
    if (!since || !until) throw new Error('Thiếu since hoặc until');
    try {
      let targetPages: any[] = [];
      if (pageId) {
        targetPages = [{ id: pageId, name: `Page ${pageId}` }];
      } else if (selectedPageIds) {
        const ids = selectedPageIds.split(',').map(id => id.trim()).filter(id => id);
        targetPages = ids.map(id => ({ id, name: `Page ${id}` }));
      } else {
        const pagesRes = await fetchPancake(`${BASE_URL}/pages`);
        const pages = extractPages(pagesRes);
        if (!Array.isArray(pages) || pages.length === 0) return { status: 'success', data: [] };
        targetPages = pages.slice(0, 20);
      }

      let allStats: any[] = [];

      const promises = targetPages.map(async (page: any) => {
        try {
          const pId = page.id || page.page_id;
          if (!pId) return [];
          const statData = await fetchPancake(`${BASE_URL}/pages/${pId}/tags/statistics?since=${since}&until=${until}`);
          const stats = statData?.data || [];
          return stats.map((s: any) => ({ ...s, _page_id: pId, _page_name: page.name || `Page ${pId}` }));
        } catch (err) {
          console.warn(`Lỗi get_tag_statistics cho page ${page.id}:`, err);
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
      throw new Error(`Lỗi lấy thống kê tag: ${error.message}`);
    }
  }

  // 11. 12. 13. AI-Powered actions (Đăng ký mock sẵn sàng cho LLM call, runner trả về metadata hướng dẫn cho AI)
  if (['analyze_chat_quality', 'analyze_conversion_rate', 'generate_daily_cs_report'].includes(actionSlug)) {
    return {
      status: 'success',
      message: 'LLM processed capability. Dữ liệu cần phân tích nên được lấy trực tiếp thông qua các Action dữ liệu thô (list_messages, get_page_statistics, v.v.).',
      data: input
    };
  }

  throw new Error(`Action ${actionSlug} chưa được hỗ trợ trên Pancake Chat`);
}
