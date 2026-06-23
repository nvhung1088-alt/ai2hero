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
      const { pageId, pageToken, datePreset } = input;
      if (!pageId) {
        throw new Error('Thiếu tham số pageId.');
      }
      const preset = datePreset || 'last_7d';
      const tokenToUse = pageToken || accessToken;
      
      // 1. Lấy thông tin cơ bản của Page
      let pageInfo = null;
      try {
        const infoPath = `/${pageId}?fields=id,name,fan_count,followers_count`;
        pageInfo = await fetchFB(infoPath, tokenToUse);
      } catch (e) {
        console.warn('Failed to fetch page info', e);
      }

      // 2. Lấy Insights an toàn (bỏ qua nếu metric bị deprecated cho NPE)
      let insightsData: any[] = [];
      try {
        const path = `/${pageId}/insights?metric=page_views_total,page_fan_adds_unique&date_preset=${encodeURIComponent(preset)}`;
        const rawData = await fetchFB(path, tokenToUse);
        if (rawData?.data) insightsData = rawData.data;
      } catch (e) {
        console.warn('Failed to fetch page insights metrics', e);
      }
      
      return {
        status: 'success',
        data: {
          info: pageInfo,
          insights: insightsData
        },
        _meta: { found: true }
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
      const { campaignId, adAccountId, datePreset } = input;
      if (!campaignId) throw new Error('Thiếu campaignId');

      const preset = datePreset || 'last_7d';
      const fields = 'campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,reach,actions,cost_per_action_type';
      let path = '';
      if (campaignId === 'ALL' && adAccountId) {
         path = `/${adAccountId}/insights?level=campaign&fields=${fields}&date_preset=${encodeURIComponent(preset)}`;
      } else {
         path = `/${campaignId}/insights?fields=${fields}&date_preset=${encodeURIComponent(preset)}`;
      }
      const rawData = await fetchFB(path, accessToken);
      
      // Nếu ALL, trả về nguyên array. Nếu cụ thể, lấy bản ghi đầu tiên
      const insight = (campaignId === 'ALL') ? (rawData?.data || []) : (rawData?.data?.[0] || null);
      return {
        status: 'success',
        data: insight,
        _meta: { found: campaignId === 'ALL' ? (insight.length > 0) : !!insight }
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
      const fields = 'impressions,clicks,spend,cpc,cpm,ctr,reach,actions,cost_per_action_type';
      const path = `/${adAccountId}/insights?fields=${fields}&date_preset=${encodeURIComponent(preset)}`;
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

    case 'publish_photo': {
      const { pageId, pageToken, imageUrl, caption } = input || {};
      if (!pageId || !imageUrl) {
        throw new Error('Thiếu pageId hoặc imageUrl để đăng ảnh.');
      }
      const tokenToUse = pageToken || accessToken;
      try {
        const data = await fetchFB(`/${pageId}/photos`, tokenToUse, 'POST', {
          url: imageUrl,
          message: caption || ''
        });
        return { status: 'success', data };
      } catch (error: any) {
        throw new Error(parseFBError(error));
      }
    }

    case 'publish_photos': {
      const { pageId, pageToken, imageUrls, message } = input || {};
      if (!pageId || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        throw new Error('Thiếu pageId hoặc danh sách imageUrls.');
      }
      const tokenToUse = pageToken || accessToken;
      try {
        const mediaFbIds: string[] = [];
        for (const url of imageUrls) {
          const photoData = await fetchFB(`/${pageId}/photos`, tokenToUse, 'POST', {
            url,
            published: false
          });
          if (photoData?.id) {
            mediaFbIds.push(photoData.id);
          }
        }
        if (mediaFbIds.length === 0) {
          throw new Error('Không upload được ảnh nào lên Facebook.');
        }
        const attachedMedia = mediaFbIds.map(id => ({ media_fbid: id }));
        const data = await fetchFB(`/${pageId}/feed`, tokenToUse, 'POST', {
          message: message || '',
          attached_media: attachedMedia
        });
        return { status: 'success', data };
      } catch (error: any) {
        throw new Error(parseFBError(error));
      }
    }

    case 'publish_video': {
      const { pageId, pageToken, videoUrl, title, description } = input || {};
      if (!pageId || !videoUrl) {
        throw new Error('Thiếu pageId hoặc videoUrl để đăng video.');
      }
      const tokenToUse = pageToken || accessToken;
      try {
        const data = await fetchFB(`/${pageId}/videos`, tokenToUse, 'POST', {
          file_url: videoUrl,
          title: title || '',
          description: description || ''
        });
        return { status: 'success', data };
      } catch (error: any) {
        throw new Error(parseFBError(error));
      }
    }

    case 'publish_reel': {
      const { pageId, pageToken, videoUrl, description } = input || {};
      if (!pageId || !videoUrl) {
        throw new Error('Thiếu pageId hoặc videoUrl để đăng Reel.');
      }
      const tokenToUse = pageToken || accessToken;
      try {
        // Bước 1: Khởi tạo upload Reel
        const startData = await fetchFB(`/${pageId}/video_reels`, tokenToUse, 'POST', {
          upload_phase: 'start'
        });
        const videoId = startData?.video_id;
        const uploadUrl = startData?.upload_url;
        if (!videoId || !uploadUrl) {
          throw new Error('Không thể khởi tạo tiến trình đăng Reel từ Facebook API.');
        }

        // Bước 2: Download video và PUT binary tới upload_url
        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) {
          throw new Error(`Không thể tải video từ URL: ${videoUrl}`);
        }
        const arrayBuffer = await videoRes.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        const fileSize = videoBuffer.length;

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `OAuth ${tokenToUse}`,
            'offset': '0',
            'file_size': fileSize.toString(),
            'Content-Type': 'application/octet-stream'
          },
          body: videoBuffer
        });

        if (!uploadRes.ok) {
          const uploadErrText = await uploadRes.text().catch(() => 'Unknown upload error');
          throw new Error(`Lỗi upload video Reel lên Facebook storage: ${uploadErrText}`);
        }

        // Bước 3: Hoàn tất tiến trình upload (finish)
        const finishData = await fetchFB(`/${pageId}/video_reels`, tokenToUse, 'POST', {
          upload_phase: 'finish',
          video_id: videoId,
          video_state: 'PUBLISHED',
          description: description || ''
        });

        return { status: 'success', data: { video_id: videoId, finish: finishData } };
      } catch (error: any) {
        throw new Error(parseFBError(error));
      }
    }

    default:
      throw new Error(`Action "${action}" không được hỗ trợ bởi Meta Platform connector.`);
  }
}

// ═══ HELPER: parseFBError ═══
function parseFBError(error: any): string {
  const message = error.message || '';
  if (message.includes('1366046')) return 'Lỗi Facebook (1366046): Ảnh quá lớn hoặc định dạng không hợp lệ.';
  if (message.includes('1390008')) return 'Lỗi Facebook (1390008): Bạn đang đăng bài quá nhanh. Vui lòng thử lại sau.';
  if (message.includes('1346003')) return 'Lỗi Facebook (1346003): Nội dung bài viết vi phạm chính sách cộng đồng của Facebook.';
  if (message.includes('1404006')) return 'Lỗi Facebook (1404006): Yêu cầu kiểm tra bảo mật từ Facebook.';
  if (message.includes('2069019')) return 'Lỗi Facebook (2069019): File video/ảnh không hợp lệ hoặc bị hỏng.';
  if (message.includes('1404078')) return 'Lỗi Facebook (1404078): Yêu cầu xác thực lại quyền quản lý trang Facebook.';
  if (message.includes('190') || message.includes('Error validating access token')) return 'Lỗi Facebook (190): Token Facebook đã hết hạn hoặc bị thu hồi.';
  return message;
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
