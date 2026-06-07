import { ConnectorDefinition } from '../types';

export const facebookConnector: ConnectorDefinition = {
  slug: 'facebook',
  name: 'Meta Platform',
  icon: 'Share2',
  category: 'social',
  description: 'Facebook Page, Instagram Business, Threads — dùng chung 1 Token. Quản lý Inbox, Comments, Ads, đăng bài đa nền tảng.',
  authType: 'bearer_token',
  popular: true,
  runtimeType: 'custom_runner',
  runtimeConfidence: 'high',
  lifecycle: {
    updatePolicy: 'manual',
    documentationUrl: 'https://developers.facebook.com/docs/graph-api/changelog'
  },
  authFields: [
    {
      name: 'accessToken',
      label: 'Mã Truy Cập (Access Token)',
      type: 'password',
      required: true,
      secret: true,
      helpText: 'Lấy từ Graph API Explorer. Token này chứa quyền truy cập vào tất cả Pages, Ad Accounts, Instagram và Threads của bạn.'
    },
    {
      name: 'appSecret',
      label: 'App Secret (Tùy chọn - cho Webhook)',
      type: 'password',
      required: false,
      secret: true,
      helpText: 'Chỉ cần khi sử dụng Webhook để nhận tin nhắn tự động.'
    }
  ],
  actions: [
    // === Discovery Actions (Khám phá tài nguyên) ===
    {
      slug: 'list_user_pages',
      name: 'Danh sách Fanpage của tôi',
      description: 'Quét tất cả Fanpage mà Token này có quyền quản lý.',
      group: 'Discovery',
      httpMethod: 'GET',
      endpoint: '/me/accounts',
      status: 'ready',
      inputSchema: [],
      outputFields: ['data[].id', 'data[].name', 'data[].access_token', 'data[].category'],
      aiInstruction: 'GỌI ACTION NÀY ĐẦU TIÊN khi người dùng hỏi bất cứ gì về Fanpage. Nó trả về danh sách tất cả Pages kèm Page ID. Dùng Page ID từ kết quả này để truyền vào các action khác (get_page_info, list_conversations, post_feed...).'
    },
    {
      slug: 'list_ad_accounts',
      name: 'Danh sách Tài khoản Quảng cáo',
      description: 'Quét tất cả Ad Account mà Token này có quyền truy cập.',
      group: 'Discovery',
      httpMethod: 'GET',
      endpoint: '/me/adaccounts',
      status: 'ready',
      inputSchema: [],
      outputFields: ['data[].id', 'data[].name', 'data[].account_status', 'data[].currency', 'data[].balance'],
      aiInstruction: 'GỌI ACTION NÀY ĐẦU TIÊN khi người dùng hỏi về quảng cáo hoặc chiến dịch. Nó trả về danh sách tất cả Ad Accounts kèm ID (dạng act_XXXXX). Dùng ID từ kết quả này để truyền vào list_campaigns, list_adsets, get_campaign_insights.'
    },

    // === Page Actions (Read-only) ===
    {
      slug: 'get_page_info',
      name: 'Thông tin Page',
      description: 'Lấy thông tin cơ bản của Trang (Tên, Số lượt thích, Lượt theo dõi, Category...).',
      group: 'Page',
      httpMethod: 'GET',
      endpoint: '/{pageId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageId',
          label: 'Page ID',
          type: 'text',
          required: true,
          helpText: 'Lấy từ action "Danh sách Fanpage của tôi".'
        }
      ],
      outputFields: ['id', 'name', 'fan_count', 'followers_count', 'category', 'picture.url'],
      aiInstruction: 'Sử dụng action này khi người dùng hỏi về thông tin tổng quan của một Facebook Page cụ thể. Yêu cầu tham số pageId (lấy từ list_user_pages).'
    },
    {
      slug: 'get_page_insights',
      name: 'Báo cáo thống kê Page',
      description: 'Lấy báo cáo thống kê đơn giản của Fanpage (Lượt tiếp cận, tương tác).',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/{pageId}/insights',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageId',
          label: 'Page ID',
          type: 'text',
          required: true,
          helpText: 'ID của Fanpage.'
        },
        {
          name: 'datePreset',
          label: 'Khoảng thời gian báo cáo',
          type: 'select',
          required: false,
          options: ['today', 'yesterday', 'last_7d', 'last_30d', 'this_month'],
          helpText: 'Khoảng thời gian (mặc định: last_7d).'
        }
      ],
      outputFields: ['data[].name', 'data[].title', 'data[].description', 'data[].values[].value'],
      aiInstruction: 'Action dùng để lấy báo cáo thống kê Page tổng quan (page_impressions, page_post_engagements). Truyền pageId. Mặc định 7 ngày qua.'
    },
    {
      slug: 'list_conversations',
      name: 'Danh sách hội thoại Inbox',
      description: 'Lấy danh sách các cuộc hội thoại trong hộp thư đến (Inbox) của Page.',
      group: 'Inbox',
      httpMethod: 'GET',
      endpoint: '/{pageId}/conversations',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageId',
          label: 'Page ID',
          type: 'text',
          required: true,
          helpText: 'Lấy từ action "Danh sách Fanpage của tôi".'
        },
        {
          name: 'after',
          label: 'Cursor phân trang',
          type: 'text',
          required: false,
          helpText: 'Token cursor "after" lấy từ phản hồi trước để tải trang tiếp theo.'
        }
      ],
      outputFields: ['data[].id', 'data[].snippet', 'data[].updated_time', 'data[].participants.data[].name', 'paging.nextCursor', 'paging.hasMore'],
      aiInstruction: 'Sử dụng action này khi người dùng hỏi về danh sách hội thoại / tin nhắn trong Inbox của Page. Yêu cầu tham số pageId. Mặc định lấy 25 hội thoại gần nhất. Để tải thêm, truyền paging.nextCursor từ phản hồi trước vào tham số after.'
    },
    {
      slug: 'list_messages',
      name: 'Tin nhắn của hội thoại',
      description: 'Lấy danh sách tin nhắn trong một cuộc hội thoại cụ thể.',
      group: 'Inbox',
      httpMethod: 'GET',
      endpoint: '/{conversationId}/messages',
      status: 'ready',
      inputSchema: [
        {
          name: 'conversationId',
          label: 'Conversation ID',
          type: 'text',
          required: true,
          helpText: 'ID của cuộc hội thoại.'
        }
      ],
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_conversations',
        path: 'data[0].id',
        inputKey: 'conversationId'
      },
      outputFields: ['data[].id', 'data[].message', 'data[].from.name', 'data[].from.id', 'data[].created_time', 'data[].attachments'],
      aiInstruction: 'Sử dụng action này khi người dùng muốn đọc nội dung chi tiết của một cuộc hội thoại cụ thể. Tham số bắt buộc: conversationId — lấy từ kết quả của action list_conversations.'
    },
    {
      slug: 'list_post_comments',
      name: 'Comments bài viết',
      description: 'Lấy danh sách bình luận (comments) của một bài viết cụ thể trên Page.',
      group: 'Comments',
      httpMethod: 'GET',
      endpoint: '/{postId}/comments',
      status: 'ready',
      inputSchema: [
        {
          name: 'postId',
          label: 'Post ID',
          type: 'text',
          required: true,
          helpText: 'ID của bài viết (Post ID).'
        },
        {
          name: 'after',
          label: 'Cursor phân trang',
          type: 'text',
          required: false,
          helpText: 'Token cursor "after" lấy từ phản hồi trước.'
        }
      ],
      testStrategy: 'direct',
      outputFields: ['data[].id', 'data[].message', 'data[].from.name', 'data[].created_time', 'data[].like_count', 'paging.nextCursor', 'paging.hasMore'],
      aiInstruction: 'Sử dụng action này khi người dùng muốn xem danh sách bình luận của một bài viết. Tham số bắt buộc: postId.'
    },

    // === Ads Actions (Read-only) ===
    {
      slug: 'list_campaigns',
      name: 'Danh sách Campaigns',
      description: 'Lấy danh sách các chiến dịch quảng cáo từ tài khoản quảng cáo.',
      group: 'Ads',
      httpMethod: 'GET',
      endpoint: '/act_{adAccountId}/campaigns',
      status: 'ready',
      inputSchema: [
        {
          name: 'adAccountId',
          label: 'Ad Account ID',
          type: 'text',
          required: true,
          helpText: 'Lấy từ action "Danh sách Tài khoản Quảng cáo". Định dạng: act_XXXXXXX.'
        },
        {
          name: 'status',
          label: 'Trạng thái Campaign',
          type: 'select',
          required: false,
          options: ['ALL', 'ACTIVE', 'PAUSED', 'ARCHIVED'],
          helpText: 'Lọc chiến dịch theo trạng thái hoạt động.'
        }
      ],
      outputFields: ['data[].id', 'data[].name', 'data[].status', 'data[].objective', 'data[].daily_budget', 'data[].lifetime_budget', 'data[].created_time', 'paging.nextCursor'],
      aiInstruction: 'Sử dụng action này khi người dùng hỏi về danh sách chiến dịch quảng cáo. Yêu cầu adAccountId (định dạng act_XXXXXXX).'
    },
    {
      slug: 'list_adsets',
      name: 'Danh sách Ad Sets',
      description: 'Lấy danh sách các nhóm quảng cáo (Ad Sets) thuộc tài khoản quảng cáo.',
      group: 'Ads',
      httpMethod: 'GET',
      endpoint: '/act_{adAccountId}/adsets',
      status: 'ready',
      inputSchema: [
        {
          name: 'adAccountId',
          label: 'Ad Account ID',
          type: 'text',
          required: true,
          helpText: 'Lấy từ action "Danh sách Tài khoản Quảng cáo". Định dạng: act_XXXXXXX.'
        },
        {
          name: 'campaignId',
          label: 'Campaign ID',
          type: 'text',
          required: false,
          helpText: 'Lọc nhóm quảng cáo thuộc chiến dịch cụ thể.'
        },
        {
          name: 'after',
          label: 'Cursor phân trang',
          type: 'text',
          required: false,
          helpText: 'Token cursor "after" lấy từ phản hồi trước.'
        }
      ],
      outputFields: ['data[].id', 'data[].name', 'data[].status', 'data[].daily_budget', 'data[].campaign_id', 'paging.nextCursor'],
      aiInstruction: 'Sử dụng action này khi người dùng hỏi về các nhóm quảng cáo (Ad Sets) trong tài khoản. Yêu cầu adAccountId.'
    },
    {
      slug: 'get_campaign_insights',
      name: 'Báo cáo chiến dịch',
      description: 'Lấy báo cáo hiệu suất (Impressions, Clicks, Spend, CPC, CTR...) của chiến dịch.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/{campaignId}/insights',
      status: 'ready',
      inputSchema: [
        {
          name: 'campaignId',
          label: 'Campaign ID',
          type: 'text',
          required: true,
          helpText: 'ID của chiến dịch quảng cáo.'
        },
        {
          name: 'datePreset',
          label: 'Khoảng thời gian báo cáo',
          type: 'select',
          required: false,
          options: ['today', 'yesterday', 'last_7d', 'last_30d', 'this_month'],
          helpText: 'Khoảng thời gian lấy dữ liệu báo cáo (mặc định: last_7d).'
        }
      ],
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_campaigns',
        path: 'data[0].id',
        inputKey: 'campaignId'
      },
      outputFields: ['data.impressions', 'data.clicks', 'data.spend', 'data.cpc', 'data.cpm', 'data.ctr', 'data.reach', 'data.actions'],
      aiInstruction: 'Sử dụng action này khi người dùng muốn xem báo cáo hiệu suất (KPIs) của một chiến dịch. Tham số bắt buộc: campaignId.'
    },
    {
      slug: 'get_ad_account_insights',
      name: 'Báo cáo Tài khoản Ads',
      description: 'Lấy báo cáo thống kê tổng quan toàn bộ Tài khoản quảng cáo (Tiêu tiền, lượt hiển thị, click...).',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/act_{adAccountId}/insights',
      status: 'ready',
      inputSchema: [
        {
          name: 'adAccountId',
          label: 'Ad Account ID',
          type: 'text',
          required: true,
          helpText: 'ID của tài khoản (VD: act_XXXXX).'
        },
        {
          name: 'datePreset',
          label: 'Khoảng thời gian báo cáo',
          type: 'select',
          required: false,
          options: ['today', 'yesterday', 'last_7d', 'last_30d', 'this_month'],
          helpText: 'Khoảng thời gian (mặc định: last_7d).'
        }
      ],
      outputFields: ['data.impressions', 'data.clicks', 'data.spend', 'data.cpc', 'data.cpm', 'data.ctr', 'data.reach'],
      aiInstruction: 'Dùng action này để lấy báo cáo thống kê tổng quát của TOÀN BỘ tài khoản quảng cáo. Yêu cầu adAccountId. Trả về tổng tiền đã tiêu (spend), lượt tiếp cận...'
    },

    // === Instagram Actions ===
    {
      slug: 'list_ig_accounts',
      name: 'Danh sách Instagram Business',
      description: 'Quét danh sách tài khoản Instagram Business liên kết với Fanpage.',
      group: 'Instagram',
      httpMethod: 'GET',
      endpoint: '/{pageId}?fields=instagram_business_account',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageId',
          label: 'Page ID',
          type: 'text',
          required: true,
          helpText: 'Lấy từ action "Danh sách Fanpage của tôi".'
        }
      ],
      outputFields: ['instagram_business_account.id'],
      aiInstruction: 'Gọi action này để lấy ID tài khoản Instagram Business đang liên kết với một Fanpage. Cần pageId (lấy từ list_user_pages). Instagram Business Account ID dùng cho các action đăng bài/đọc media trên Instagram.'
    },
    {
      slug: 'list_ig_media',
      name: 'Bài đăng Instagram',
      description: 'Lấy danh sách bài đăng (media) trên Instagram Business.',
      group: 'Instagram',
      httpMethod: 'GET',
      endpoint: '/{igUserId}/media',
      status: 'ready',
      inputSchema: [
        {
          name: 'igUserId',
          label: 'Instagram User ID',
          type: 'text',
          required: true,
          helpText: 'Instagram Business Account ID lấy từ action "Danh sách Instagram Business".'
        }
      ],
      outputFields: ['data[].id', 'data[].caption', 'data[].media_type', 'data[].timestamp', 'data[].like_count', 'data[].comments_count'],
      aiInstruction: 'Lấy danh sách bài đăng Instagram. Cần igUserId (lấy từ list_ig_accounts).'
    },

    // === Threads Actions ===
    {
      slug: 'list_threads_posts',
      name: 'Bài đăng Threads',
      description: 'Lấy danh sách bài đăng trên Threads.',
      group: 'Threads',
      httpMethod: 'GET',
      endpoint: '/{threadsUserId}/threads',
      status: 'ready',
      inputSchema: [
        {
          name: 'threadsUserId',
          label: 'Threads User ID',
          type: 'text',
          required: true,
          helpText: 'Threads User ID (thường trùng với Instagram User ID).'
        }
      ],
      outputFields: ['data[].id', 'data[].text', 'data[].timestamp', 'data[].media_type'],
      aiInstruction: 'Lấy danh sách bài đăng Threads. Cần threadsUserId.'
    },
    {
      slug: 'get_threads_profile',
      name: 'Thông tin Threads Profile',
      description: 'Lấy thông tin profile Threads (tên, bio, followers).',
      group: 'Threads',
      httpMethod: 'GET',
      endpoint: '/{threadsUserId}/threads_profile',
      status: 'ready',
      inputSchema: [
        {
          name: 'threadsUserId',
          label: 'Threads User ID',
          type: 'text',
          required: true,
          helpText: 'Threads User ID.'
        }
      ],
      outputFields: ['id', 'username', 'threads_biography', 'threads_profile_picture_url'],
      aiInstruction: 'Lấy thông tin profile Threads. Cần threadsUserId.'
    },

    // === Write Actions ===
    {
      slug: 'send_message',
      name: 'Gửi tin nhắn',
      description: 'Gửi tin nhắn phản hồi hội thoại của Page.',
      group: 'Inbox',
      httpMethod: 'POST',
      endpoint: '/{conversationId}/messages',
      status: 'ready',
      inputSchema: [
        {
          name: 'conversationId',
          label: 'Conversation ID',
          type: 'text',
          required: true,
          helpText: 'Lấy từ kết quả list_conversations.'
        },
        {
          name: 'message',
          label: 'Nội dung tin nhắn',
          type: 'textarea',
          required: true
        }
      ],
      outputFields: ['id', 'message_id'],
      aiInstruction: 'Gửi tin nhắn phản hồi vào một cuộc hội thoại (trong 24h). Tham số bắt buộc: conversationId và message (nội dung text thuần). Yêu cầu quyền: pages_messaging.'
    },
    {
      slug: 'reply_comment',
      name: 'Trả lời comment',
      description: 'Trả lời bình luận của khách hàng trên bài viết Page.',
      group: 'Comments',
      httpMethod: 'POST',
      endpoint: '/{commentId}/comments',
      status: 'ready',
      inputSchema: [
        {
          name: 'commentId',
          label: 'Comment ID',
          type: 'text',
          required: true
        },
        {
          name: 'message',
          label: 'Nội dung phản hồi',
          type: 'textarea',
          required: true
        }
      ],
      outputFields: ['id'],
      aiInstruction: 'Trả lời một comment cụ thể trên bài viết của Page. Tham số bắt buộc: commentId và message.'
    },
    {
      slug: 'post_feed',
      name: 'Đăng bài viết',
      description: 'Đăng bài viết (text hoặc ảnh) lên tường của Page.',
      group: 'Page',
      httpMethod: 'POST',
      endpoint: '/{pageId}/feed',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageId',
          label: 'Page ID',
          type: 'text',
          required: true
        },
        {
          name: 'message',
          label: 'Nội dung bài viết',
          type: 'textarea',
          required: true
        },
        {
          name: 'imageUrl',
          label: 'URL Hình ảnh đính kèm',
          type: 'text',
          required: false,
          helpText: 'Nếu có hình ảnh, nhập URL ảnh công khai vào đây.'
        }
      ],
      outputFields: ['id', 'post_id'],
      aiInstruction: 'Action này cho phép đăng bài viết mới lên tường của Page. Cần truyền pageId, message. Nếu muốn đăng ảnh, truyền link ảnh công khai vào trường imageUrl.'
    },
    {
      slug: 'create_campaign',
      name: 'Tạo Campaign Ads',
      description: 'Tạo mới chiến dịch quảng cáo (Mặc định: PAUSED).',
      group: 'Ads',
      httpMethod: 'POST',
      endpoint: '/act_{adAccountId}/campaigns',
      status: 'ready',
      inputSchema: [
        {
          name: 'adAccountId',
          label: 'Ad Account ID',
          type: 'text',
          required: true,
          helpText: 'Định dạng: act_XXXXXX'
        },
        {
          name: 'name',
          label: 'Tên Campaign',
          type: 'text',
          required: true
        },
        {
          name: 'objective',
          label: 'Mục tiêu chiến dịch',
          type: 'select',
          required: true,
          options: ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION']
        },
        {
          name: 'dailyBudget',
          label: 'Ngân sách ngày (VND)',
          type: 'text',
          required: false
        }
      ],
      outputFields: ['id'],
      aiInstruction: 'Tạo mới chiến dịch quảng cáo trong tài khoản Ads. Bắt buộc: name và objective. Hệ thống tự động thêm tham số special_ad_categories=["NONE"] và status="PAUSED" (bản nháp). dailyBudget tính bằng VND.'
    },
    {
      slug: 'update_campaign',
      name: 'Cập nhật Campaign Ads',
      description: 'Sửa thông tin hoặc trạng thái (Bật/Tắt) chiến dịch quảng cáo.',
      group: 'Ads',
      httpMethod: 'POST',
      endpoint: '/{campaignId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'campaignId',
          label: 'Campaign ID',
          type: 'text',
          required: true
        },
        {
          name: 'name',
          label: 'Tên mới',
          type: 'text',
          required: false
        },
        {
          name: 'status',
          label: 'Trạng thái',
          type: 'select',
          required: false,
          options: ['ACTIVE', 'PAUSED']
        }
      ],
      outputFields: ['success'],
      aiInstruction: 'Cập nhật tên hoặc bật/tắt chiến dịch (ACTIVE/PAUSED). Bắt buộc: campaignId.'
    },
    {
      slug: 'delete_campaign',
      name: 'Xóa Campaign Ads',
      description: 'Xóa vĩnh viễn chiến dịch quảng cáo khỏi tài khoản.',
      group: 'Ads',
      httpMethod: 'DELETE',
      endpoint: '/{campaignId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'campaignId',
          label: 'Campaign ID',
          type: 'text',
          required: true
        }
      ],
      outputFields: ['success'],
      aiInstruction: 'Xóa vĩnh viễn một chiến dịch quảng cáo. Cần xác nhận rõ ràng từ người dùng trước khi gọi.'
    }
  ],
  setupGuide: `
<div class="space-y-4 text-sm text-gray-300">
  <h3 class="text-base font-semibold text-white">📋 HƯỚNG DẪN KẾT NỐI META PLATFORM (CẬP NHẬT MỚI)</h3>
  
  <div>
    <h4 class="font-medium text-blue-400">🔵 Bước 1: Tạo Facebook App (Loại Doanh Nghiệp)</h4>
    <ul class="list-disc pl-5 mt-1 space-y-1">
      <li>Truy cập <a href="https://developers.facebook.com" target="_blank" class="text-blue-400 underline">developers.facebook.com</a> → <strong>Bảng điều khiển (My Apps)</strong> → <strong>Tạo ứng dụng (Create App)</strong>.</li>
      <li>Chọn loại ứng dụng: <strong>Doanh nghiệp (Business)</strong>. Đừng chọn các loại khác hoặc "Không có trường hợp sử dụng" để tránh bị Meta hạn chế quyền.</li>
      <li>Đặt tên cho ứng dụng và hoàn tất tạo.</li>
    </ul>
  </div>

  <div>
    <h4 class="font-medium text-blue-400">🔵 Bước 2: BẮT BUỘC - Điền URL Chính sách quyền riêng tư</h4>
    <ul class="list-disc pl-5 mt-1 space-y-1 text-yellow-400/90">
      <li>Trong Bảng điều khiển App, vào <strong>Cài đặt (Settings)</strong> → <strong>Thông tin cơ bản (Basic)</strong>.</li>
      <li>Tại ô <strong>URL chính sách quyền riêng tư (Privacy Policy URL)</strong>, bắt buộc phải điền một link hợp lệ (nhập tạm: <code>https://google.com</code> nếu chưa chạy thật).</li>
      <li>Cuộn xuống dưới cùng và bấm <strong>Lưu thay đổi</strong>. <strong class="text-red-400">Không có bước này, popup đăng nhập OAuth sẽ báo lỗi!</strong></li>
    </ul>
  </div>

  <div>
    <h4 class="font-medium text-blue-400">🔵 Bước 3: Lấy Mã Truy Cập (Access Token) từ Graph API Explorer</h4>
    <ul class="list-disc pl-5 mt-1 space-y-1">
      <li>Truy cập công cụ <a href="https://developers.facebook.com/tools/explorer" target="_blank" class="text-blue-400 underline">Graph API Explorer</a>.</li>
      <li>Ở góc phải, ô <strong>Ứng dụng trên Meta</strong>: Chọn App Doanh Nghiệp bạn vừa tạo.</li>
      <li>Tại phần <strong>Thêm Quyền (Permissions)</strong> bên phải, chọn các quyền sau để hỗ trợ đầy đủ các nền tảng:
        <ul class="list-circle pl-5 mt-1 text-gray-400">
          <li><strong>Facebook Page:</strong> <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>, <code>pages_messaging</code></li>
          <li><strong>Facebook Ads:</strong> <code>ads_read</code>, <code>ads_management</code></li>
          <li><strong>Instagram:</strong> <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>instagram_manage_comments</code></li>
          <li><strong>Threads:</strong> <code>threads_basic</code>, <code>threads_content_publish</code></li>
        </ul>
      </li>
      <li>Nhấn <strong>Generate Access Token</strong> → Đăng nhập và chọn các Trang/Tài khoản quảng cáo mà bạn muốn cấp quyền. Đây là mã ngắn hạn (1-2 giờ).</li>
    </ul>
  </div>

  <div>
    <h4 class="font-medium text-blue-400">🔵 Bước 4: Kéo dài Token lên 60 ngày hoặc Vĩnh viễn (Quan Trọng cho Cron Job)</h4>
    <ul class="list-disc pl-5 mt-1 space-y-1">
      <li>Truy cập công cụ <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" class="text-blue-400 underline">Access Token Tool (Trình gỡ lỗi mã truy cập)</a>.</li>
      <li>Dán mã Token ngắn hạn vừa lấy ở Bước 3 vào ô tìm kiếm và nhấn <strong>Debug</strong>.</li>
      <li>Cuộn xuống dưới cùng, bấm nút <strong>Extend Access Token (Kéo dài mã truy cập)</strong>. Meta sẽ cấp cho bạn một Token mới có hạn <strong>60 ngày</strong>.</li>
      <li>💡 <strong>Cách lấy Token VĨNH VIỄN cho Fanpage (Không bao giờ hết hạn):</strong>
        <ul class="list-circle pl-5 mt-1 text-gray-400">
          <li>Quay lại trang <a href="https://developers.facebook.com/tools/explorer" target="_blank" class="text-blue-400 underline">Graph API Explorer</a>.</li>
          <li>Dán mã Token 60 ngày vừa tạo ở trên vào ô <strong>Access Token</strong>.</li>
          <li>Nhập endpoint <code>me/accounts</code> ở thanh địa chỉ API và nhấn <strong>Submit</strong>.</li>
          <li>Kết quả JSON trả về sẽ chứa danh sách các Page của bạn. Copy chuỗi <code>access_token</code> của Page tương ứng. Đây là Token vĩnh viễn.</li>
        </ul>
      </li>
      <li>Copy mã Token 60 ngày (nếu chạy Ads) hoặc Token vĩnh viễn (nếu chỉ làm Page/Instagram) dán vào trường <strong>Access Token</strong> trên AI2Hero.</li>
    </ul>
  </div>
</div>
`
};
