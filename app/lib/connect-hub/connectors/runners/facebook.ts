// ═══ CONSTANTS ═══
const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || 'v25.0';
const GRAPH_API = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const ALLOWED_HOSTS = ['graph.facebook.com'];

// ═══ MAIN EXPORT ═══
export async function runFacebook(
  creds: Record<string, string>,
  action: string,
  input: Record<string, any>
): Promise<any> {
  const { accessToken } = creds;

  if (!accessToken) {
    throw new Error('Thiếu cấu hình Facebook Access Token.');
  }



  // ═══ Action Router ═══
  switch (action) {
    // === Discovery Actions ===
    case 'list_user_pages': {
      const path = `/me/accounts?fields=id,name,access_token,category&limit=100`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData?.data || [],
        _meta: { total: (rawData?.data || []).length }
      };
    }

    case 'list_ad_accounts': {
      const path = `/me/adaccounts?fields=id,name,account_status,currency,balance&limit=100`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData?.data || [],
        _meta: { total: (rawData?.data || []).length }
      };
    }

    // === Page Actions ===
    case 'get_page_info': {
      const pageId = input?.pageId;
      if (!pageId) {
        throw new Error('Thiếu pageId. Vui lòng gọi list_user_pages trước để lấy Page ID.');
      }
      const data = await fetchFB(
        `/${pageId}?fields=id,name,fan_count,followers_count,category,picture{url}`,
        accessToken
      );
      return {
        status: 'success',
        data
      };
    }

    case 'get_page_insights': {
      const { pageId, datePreset } = input || {};
      if (!pageId) {
        throw new Error('Thiếu tham số pageId.');
      }
      const preset = datePreset || 'last_7d';
      const path = `/${pageId}/insights?metric=page_impressions,page_post_engagements&date_preset=${encodeURIComponent(preset)}`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData?.data || [],
        _meta: { found: !!rawData?.data?.length }
      };
    }

    case 'list_conversations': {
      const pageId = input?.pageId;
      if (!pageId) {
        throw new Error('Thiếu pageId. Vui lòng gọi list_user_pages trước để lấy Page ID.');
      }
      let path = `/${pageId}/conversations?fields=id,snippet,updated_time,participants&limit=25`;
      if (input?.after) {
        path += `&after=${encodeURIComponent(input.after)}`;
      }
      const rawData = await fetchFB(path, accessToken);
      const parsed = parsePaging(rawData);
      return {
        status: 'success',
        data: parsed.items,
        paging: parsed.paging,
        _meta: { total: parsed.items.length }
      };
    }

    case 'list_messages': {
      const { conversationId } = input || {};
      if (!conversationId) {
        throw new Error('Thiếu tham số conversationId.');
      }
      const path = `/${conversationId}/messages?fields=id,message,from,created_time,attachments{mime_type,name,size,url}&limit=50`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData?.data || [],
        _meta: { total: (rawData?.data || []).length }
      };
    }

    case 'list_post_comments': {
      const { postId, after } = input || {};
      if (!postId) {
        throw new Error('Thiếu tham số postId.');
      }
      let path = `/${postId}/comments?fields=id,message,from,created_time,like_count&limit=50`;
      if (after) {
        path += `&after=${encodeURIComponent(after)}`;
      }
      const rawData = await fetchFB(path, accessToken);
      const parsed = parsePaging(rawData);
      return {
        status: 'success',
        data: parsed.items,
        paging: parsed.paging,
        _meta: { total: parsed.items.length }
      };
    }

    // === Ads Actions ===
    case 'list_campaigns': {
      let activeAdAccountId = input?.adAccountId;
      if (!activeAdAccountId) {
        throw new Error('Thiếu adAccountId (định dạng act_XXXXXXX) để xem danh sách chiến dịch.');
      }
      if (!activeAdAccountId.startsWith('act_')) {
        activeAdAccountId = `act_${activeAdAccountId}`;
      }
      const path = `/${activeAdAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time&limit=50`;
      const rawData = await fetchFB(path, accessToken);
      
      let campaigns = rawData?.data || [];
      
      // Lọc theo trạng thái campaign nếu có
      if (input?.status && input.status !== 'ALL') {
        campaigns = campaigns.filter((c: any) => c.status === input.status);
      }
      
      const parsed = parsePaging({ ...rawData, data: campaigns });
      return {
        status: 'success',
        data: parsed.items,
        paging: parsed.paging,
        _meta: { total: parsed.items.length }
      };
    }

    case 'list_adsets': {
      let activeAdAccountId = input?.adAccountId;
      if (!activeAdAccountId) {
        throw new Error('Thiếu adAccountId (định dạng act_XXXXXXX) để xem danh sách nhóm quảng cáo.');
      }
      if (!activeAdAccountId.startsWith('act_')) {
        activeAdAccountId = `act_${activeAdAccountId}`;
      }
      let path = `/${activeAdAccountId}/adsets?fields=id,name,status,daily_budget,campaign_id,targeting&limit=50`;
      if (input?.after) {
        path += `&after=${encodeURIComponent(input.after)}`;
      }
      const rawData = await fetchFB(path, accessToken);
      
      let adsets = rawData?.data || [];
      
      // Lọc theo Campaign ID nếu có
      if (input?.campaignId) {
        adsets = adsets.filter(
          (a: any) => a.campaign_id === input.campaignId || (a.campaign && a.campaign.id === input.campaignId)
        );
      }
      
      const parsed = parsePaging({ ...rawData, data: adsets });
      return {
        status: 'success',
        data: parsed.items,
        paging: parsed.paging,
        _meta: { total: parsed.items.length }
      };
    }

    case 'get_campaign_insights': {
      const { campaignId, datePreset } = input || {};
      if (!campaignId) {
        throw new Error('Thiếu tham số campaignId.');
      }
      const preset = datePreset || 'last_7d';
      const path = `/${campaignId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,actions&date_preset=${encodeURIComponent(preset)}`;
      const rawData = await fetchFB(path, accessToken);
      
      // Lấy bản ghi insight đầu tiên nếu có
      const insight = rawData?.data?.[0] || null;
      return {
        status: 'success',
        data: insight,
        _meta: { found: !!insight }
      };
    }

    case 'get_ad_account_insights': {
      let { adAccountId, datePreset } = input || {};
      if (!adAccountId) {
        throw new Error('Thiếu tham số adAccountId.');
      }
      adAccountId = String(adAccountId);
      if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
      const preset = datePreset || 'last_7d';
      const path = `/${adAccountId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach&date_preset=${encodeURIComponent(preset)}`;
      const rawData = await fetchFB(path, accessToken);
      
      const insight = rawData?.data?.[0] || null;
      return {
        status: 'success',
        data: insight,
        _meta: { found: !!insight }
      };
    }

    // === Instagram Actions ===
    case 'list_ig_accounts': {
      const pageId = input?.pageId;
      if (!pageId) {
        throw new Error('Thiếu pageId để xem danh sách Instagram Business liên kết.');
      }
      const path = `/${pageId}?fields=instagram_business_account`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData?.instagram_business_account ? [rawData.instagram_business_account] : [],
        _meta: { found: !!rawData?.instagram_business_account }
      };
    }

    case 'list_ig_media': {
      const igUserId = input?.igUserId;
      if (!igUserId) {
        throw new Error('Thiếu igUserId để xem danh sách bài đăng Instagram.');
      }
      const path = `/${igUserId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count&limit=50`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData?.data || [],
        _meta: { total: (rawData?.data || []).length }
      };
    }

    // === Threads Actions ===
    case 'list_threads_posts': {
      const threadsUserId = input?.threadsUserId;
      if (!threadsUserId) {
        throw new Error('Thiếu threadsUserId để xem danh sách bài đăng Threads.');
      }
      const path = `/${threadsUserId}/threads?fields=id,text,timestamp,media_type&limit=50`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData?.data || [],
        _meta: { total: (rawData?.data || []).length }
      };
    }

    case 'get_threads_profile': {
      const threadsUserId = input?.threadsUserId;
      if (!threadsUserId) {
        throw new Error('Thiếu threadsUserId để lấy profile Threads.');
      }
      const path = `/${threadsUserId}/threads_profile?fields=id,username,threads_biography,threads_profile_picture_url`;
      const rawData = await fetchFB(path, accessToken);
      return {
        status: 'success',
        data: rawData,
        _meta: { found: !!rawData }
      };
    }

    // === Write Actions ===
    case 'send_message': {
      const { conversationId, message } = input || {};
      if (!conversationId || !message) {
        throw new Error('Thiếu conversationId hoặc message.');
      }
      const data = await fetchFB(`/${conversationId}/messages`, accessToken, 'POST', { message });
      return { status: 'success', data };
    }

    case 'reply_comment': {
      const { commentId, message } = input || {};
      if (!commentId || !message) {
        throw new Error('Thiếu commentId hoặc message.');
      }
      const data = await fetchFB(`/${commentId}/comments`, accessToken, 'POST', { message });
      return { status: 'success', data };
    }

    case 'post_feed': {
      const { pageId, message, imageUrl } = input || {};
      if (!pageId || !message) {
        throw new Error('Thiếu pageId hoặc message.');
      }
      let endpoint = `/${pageId}/feed`;
      let payload: any = { message };
      
      if (imageUrl) {
        endpoint = `/${pageId}/photos`;
        payload.url = imageUrl;
      }
      
      const data = await fetchFB(endpoint, accessToken, 'POST', payload);
      return { status: 'success', data };
    }

    case 'create_campaign': {
      let { adAccountId, name, objective, dailyBudget } = input || {};
      if (!adAccountId || !name || !objective) {
        throw new Error('Thiếu adAccountId, name hoặc objective.');
      }
      // Định dạng lại adAccountId nếu chưa có 'act_'
      adAccountId = String(adAccountId);
      if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
      }
      
      const payload: any = {
        name,
        objective,
        status: 'PAUSED',
        special_ad_categories: ['NONE']
      };
      
      if (dailyBudget) {
        payload.daily_budget = dailyBudget;
      }
      
      const data = await fetchFB(`/${adAccountId}/campaigns`, accessToken, 'POST', payload);
      return { status: 'success', data };
    }

    case 'update_campaign': {
      const { campaignId, name, status: campaignStatus } = input || {};
      if (!campaignId) {
        throw new Error('Thiếu campaignId.');
      }
      
      const payload: any = {};
      if (name) payload.name = name;
      if (campaignStatus) payload.status = campaignStatus;
      
      const data = await fetchFB(`/${campaignId}`, accessToken, 'POST', payload);
      return { status: 'success', data };
    }

    case 'delete_campaign': {
      const { campaignId } = input || {};
      if (!campaignId) {
        throw new Error('Thiếu campaignId.');
      }
      const data = await fetchFB(`/${campaignId}`, accessToken, 'DELETE');
      return { status: 'success', data };
    }

    default:
      throw new Error(`Action "${action}" không được hỗ trợ bởi Meta Platform connector.`);
  }
}

// ═══ HELPER: fetchFB ═══
async function fetchFB(
  path: string,
  accessToken: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = new URL(`${GRAPH_API}${path}`);

  // SSRF Guard
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    throw new Error(`SSRF blocked: Hostname "${url.hostname}" không được phép gọi.`);
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`, // Bearer token header, không truyền qua query string
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.error) {
      const fbErr = data?.error || {};
      let msg = fbErr.message || res.statusText || 'Facebook API Error';
      
      // Che token nhạy cảm trong log lỗi
      if (accessToken) {
        msg = msg.replaceAll(accessToken, '***TOKEN***');
      }

      throw new Error(
        `Facebook API Error [${fbErr.code || res.status}] (${fbErr.type || 'unknown'}): ${msg}` +
        (fbErr.fbtrace_id ? ` | trace: ${fbErr.fbtrace_id}` : '')
      );
    }

    return data;
  } catch (error: any) {
    let msg = error.message || 'Unknown network error';
    if (accessToken) {
      msg = msg.replaceAll(accessToken, '***TOKEN***');
    }
    
    if (error.name === 'AbortError') {
      throw new Error('Yêu cầu đến Facebook API bị quá hạn (Timeout 15s).');
    }
    
    throw new Error(msg);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ═══ HELPER: parsePaging ═══
function parsePaging(data: any): { items: any[]; paging: { nextCursor: string | null; hasMore: boolean } } {
  const items = data?.data || [];
  const cursors = data?.paging?.cursors;
  const hasNext = !!data?.paging?.next;

  return {
    items,
    paging: {
      nextCursor: hasNext ? (cursors?.after || null) : null,
      hasMore: hasNext
    }
  };
}
