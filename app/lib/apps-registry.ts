export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Tên icon lucide-react (string để serialize qua Server→Client)
  path: string;
  status: 'live' | 'beta' | 'coming_soon';
  tier: 'free' | 'pro';
  category: 'ai' | 'management' | 'communication' | 'analytics';
  color: string; // Tailwind gradient class for card accent
  slogan?: string;        // Tagline ngắn gọn, thu hút
  longDesc?: string;      // Mô tả chi tiết 2-3 câu
  features?: string[];    // Danh sách tính năng nổi bật (3-5 mục)
  benefits?: string[];    // Lợi ích cho doanh nghiệp (2-3 mục)
  targetUsers?: string;   // Đối tượng sử dụng phù hợp
}

export const APPS: AppDefinition[] = [
  {
    id: 'sim',
    name: 'HeroSim',
    description: 'Quản lý SIM doanh nghiệp — bảo vệ tài khoản liên kết, cảnh báo rủi ro, kiểm tra tự động.',
    icon: 'Smartphone',
    path: '/sim/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-orange-500 to-amber-400',
    slogan: 'Lá chắn bảo mật tối cao cho hệ thống SIM & OTP',
    longDesc: 'Quản lý SIM doanh nghiệp an toàn tuyệt đối với công nghệ mã hóa AES-256-CBC và nguyên lý Zero-Knowledge. Tự động đồng bộ hóa tài khoản liên kết, cảnh báo rủi ro bảo mật tức thì, và kiểm tra trạng thái hoạt động thiết bị thông minh.',
    features: [
      'Giám sát trạng thái SIM thời gian thực',
      'Mã hóa bảo mật thông tin cá nhân PII & Mật khẩu',
      'Đồng bộ hóa tài khoản liên kết cực nhanh qua Extension',
      'Hệ thống Telegram Alerts cảnh báo rủi ro tức thời',
      'Phân tích & tự động chấm điểm an toàn thiết bị'
    ],
    benefits: [
      'Tiết kiệm 95% thời gian quản trị và kiểm tra SIM thủ công',
      'Ngăn chặn 100% rủi ro chiếm đoạt tài khoản do mất SIM/OTP',
      'Tập trung dữ liệu an toàn tuyệt đối theo nguyên lý Zero-Knowledge'
    ],
    targetUsers: 'Doanh nghiệp Retail, MMO, Ads Teams, Fintech, và các đội nhóm quản lý số lượng lớn tài khoản liên kết SIM.'
  },
  {
    id: 'herovideo',
    name: 'HeroVideoDownload',
    description: 'Quản lý tài nguyên video, tự động đồng bộ từ Extension. Thu thập hàng ngàn video sạch không logo.',
    icon: 'Video',
    path: '/herovideodownload/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-pink-500 to-rose-400',
    slogan: 'Ngân hàng nguyên liệu Video Tiktok/Douyin không giới hạn',
    longDesc: 'Quản lý và tổ chức hàng ngàn video nguyên liệu chất lượng cao tải về từ TikTok, Douyin. Tự động đồng bộ với HeroVideo Extension, không còn rác, không còn watermark.',
    features: [
      'Đồng bộ hóa trực tiếp video từ Extension',
      'Lọc video rác, video âm thanh ngay trên trình duyệt',
      'Quản lý danh sách video nguyên liệu trực quan'
    ],
    benefits: [
      'Tiết kiệm 80% thời gian tìm kiếm và tải nguyên liệu',
      'Kho video sạch sẽ, quản lý tập trung, dễ dàng tái sử dụng'
    ],
    targetUsers: 'Content Creators, TikTokers, Affiliate Marketers, Video Editors.'
  },
  {
    id: 'connect-hub',
    name: 'Connect Hub',
    description: 'Cổng kết nối ứng dụng — Google Drive, Sheets, KiotViet, Pancake và hàng trăm ứng dụng khác.',
    icon: 'Plug',
    path: '/connect-hub/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-purple-500 to-indigo-500',
    slogan: 'Kết nối mọi ứng dụng chỉ trong 1 click',
    longDesc: 'Kết nối tài khoản Google Drive, KiotViet, Pancake, Gmail, Telegram và bất kỳ API nào. Các MVP của AI2Hero sẽ tự động sử dụng kết nối để đồng bộ dữ liệu theo yêu cầu.',
    features: [
      'Kết nối 1 lần — tất cả MVP đều dùng được',
      'Test connection tức thì trước khi lưu',
      'Custom HTTP API — tự thêm bất kỳ API nào',
      'Mã hóa credential AES-256 an toàn tuyệt đối',
      'Connector Việt Nam: KiotViet, Pancake, Nhanh.vn'
    ],
    benefits: [
      'Không cần kỹ thuật — chỉ nhập API key hoặc đăng nhập',
      '0đ chi phí — chạy hoàn toàn trên cloud miễn phí'
    ],
    targetUsers: 'Mọi doanh nghiệp cần kết nối dữ liệu từ nhiều ứng dụng và tự động hóa báo cáo AI.'
  },
  {
    id: 'hero-report',
    name: 'Hero Report',
    description: 'Báo cáo tự động — kéo dữ liệu từ POS, AI viết nhận xét, gửi Telegram theo giờ.',
    icon: 'BarChart3',
    path: '/hero-report/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'analytics',
    color: 'from-emerald-500 to-teal-500',
    slogan: 'Báo cáo kinh doanh tự động, gửi thẳng vào nhóm',
    longDesc: 'Kết nối với nguồn dữ liệu POS (Pancake, KiotViet), hệ thống tự tính toán số liệu chuẩn xác rồi dùng AI viết nhận xét thông minh. Tự động gửi báo cáo vào nhóm Telegram theo lịch bạn đặt.',
    features: [
      'Tự tính doanh thu, top sản phẩm, tồn kho thấp',
      'AI viết nhận xét & gợi ý hành động',
      'Gửi Telegram tự động theo giờ đặt lịch',
      'Gửi thử ngay 1 click trước khi lưu lịch',
      'Lịch sử chạy báo cáo chi tiết'
    ],
    benefits: [
      'Không cần mở dashboard — báo cáo tự đến nhóm chat',
      'Số liệu chính xác 100% do code tính (không AI đoán)'
    ],
    targetUsers: 'Chủ shop, Quản lý kinh doanh, Kế toán cần báo cáo tự động hàng ngày.'
  },
  {
    id: 'hero-care',
    name: 'Hero Care',
    description: 'Trợ lý CSKH đa kênh AI — tự động trả lời, quản lý hội thoại, kịch bản FAQ và dữ liệu snapshot đồng bộ.',
    icon: 'MessageSquare',
    path: '/hero-care/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'communication',
    color: 'from-blue-600 to-cyan-500',
    slogan: 'AI chăm sóc khách hàng có kiểm soát và dữ liệu riêng',
    longDesc: 'Hộp thư hỗ trợ đa kênh (Zalo, Pancake, Telegram) tích hợp AI tự động trả lời thông minh dựa trên kịch bản FAQ và dữ liệu snapshot được đồng bộ liên tục.',
    features: [
      'Nhận tin nhắn đa kênh thời gian thực',
      '3 chế độ chat linh hoạt: AI Auto, Hybrid và Thủ công',
      'Hệ thống khớp kịch bản FAQ 3 tầng thông minh',
      'Smart Snapshots lưu trữ và cập nhật dữ liệu tồn kho, giá cả',
      'Draft Zone giúp nhân viên kiểm duyệt câu trả lời của AI'
    ],
    benefits: [
      'Tăng 80% tốc độ phản hồi và chăm sóc khách hàng',
      'Giảm thiểu sai lệch dữ liệu nhờ cơ chế đồng bộ snapshot',
      'Bảo vệ uy tín thương hiệu với bộ lọc guardrails ngăn AI trả lời sai lệch'
    ],
    targetUsers: 'Chủ doanh nghiệp, Quản lý CSKH, các shop bán hàng đa kênh có lượng tin nhắn lớn cần tối ưu quy trình phản hồi.'
  },
  {
    id: 'hero-social',
    name: 'Hero Social',
    description: 'Quản lý Pages/Groups, Đặt lịch đăng bài & Đăng chéo tự động đa nền tảng.',
    icon: 'Share2',
    path: '/hero-social/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-pink-500 to-rose-400',
    slogan: 'Trạm điều khiển & Tự động hóa Mạng xã hội',
    longDesc: 'Biến iSocial thành một cỗ máy tự động hóa. Đặt lịch bài đăng, quản lý trang doanh nghiệp, nhóm cộng đồng, và tự động chuyển tiếp (cross-post) lên Facebook, Zalo, Tiktok chỉ với 1 cú click.',
    features: [
      'Quản lý tất cả Trang & Nhóm tại một nơi',
      'Đặt lịch đăng bài (Scheduler) thông minh',
      'Đăng chéo (Cross-post) tự động qua HeroConnect',
      'Thống kê tương tác thời gian thực',
      'Đóng vai trò là MVP mặc định của hệ thống'
    ],
    benefits: [
      'Tiết kiệm hàng giờ đồng hồ mỗi ngày nhờ lên lịch đăng bài',
      'Quản lý tập trung không bị phân tâm bởi bảng tin giải trí'
    ],
    targetUsers: 'Chủ shop, Creator, Marketing Team cần một trung tâm điều khiển MXH chuyên nghiệp.'
  },
  {
    id: 'hero-marketplace',
    name: 'Hero Marketplace',
    description: 'Quản lý cửa hàng đa kênh, đồng bộ sản phẩm từ POS, Shopee, TikTok Shop.',
    icon: 'Store',
    path: '/hero-marketplace/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-orange-500 to-red-500',
    slogan: 'Trạm điều khiển thương mại điện tử đa kênh',
    longDesc: 'Quản lý toàn diện cửa hàng đa kênh của bạn. Tự động đồng bộ sản phẩm từ KiotViet, Pancake POS, Shopee, TikTok Shop. Quản lý kho, đơn hàng, vận chuyển và dòng tiền ngay tại một nơi.',
    features: [
      'Đồng bộ sản phẩm tự động qua Connect Hub & Extension',
      'Quản lý kho hàng tập trung đa nền tảng',
      'Đẩy sản phẩm lên iSocial và HeroWeb tự động',
      'Quản lý ví thanh toán và đối soát',
      'Tích hợp vận chuyển GHN, GHTK, ViettelPost'
    ],
    benefits: [
      'Không còn sai sót tồn kho khi bán đa kênh',
      'Mở rộng kênh bán hàng mà không phát sinh thêm nhân sự quản lý'
    ],
    targetUsers: 'Nhà bán lẻ, Chủ doanh nghiệp e-commerce, MMO cần công cụ quản lý bán hàng đa kênh mạnh mẽ.'
  },
  {
    id: 'hero-agent',
    name: 'Hero Agent',
    description: 'AI Edge Worker — Cào và phân tích dữ liệu web thông minh từ máy tính của bạn.',
    icon: 'Bot',
    path: '/hero-agent/dashboard',
    status: 'beta',
    tier: 'pro',
    category: 'ai',
    color: 'from-cyan-500 to-blue-500',
    slogan: 'Biến trình duyệt thành trợ lý nghiên cứu AI',
    longDesc: 'Chrome Extension chạy trên máy tính khách hàng, cào dữ liệu web bằng session trình duyệt local để bypass anti-bot, gọi AI phân tích sâu và đẩy kết quả về dashboard.',
    features: [
      'Cào dữ liệu web bằng session trình duyệt local',
      'Phân tích nội dung bằng AI tự động',
      'Hỗ trợ Facebook, Xiaohongshu, Reddit và mọi website',
      'Kết quả đẩy thẳng về Dashboard AI2Hero'
    ],
    benefits: [
      'Bypass 100% anti-bot chặn IP Cloud của các nền tảng lớn',
      'Tự động phân tích, trích xuất từ khóa và góc viết chuẩn SEO',
      'Đồng bộ tức thì, sẵn sàng làm nguyên liệu viết bài'
    ],
    targetUsers: 'Marketers, Content Creators, SEO Researchers.'
  },
  {
    id: 'hero-video-maker',
    name: 'HeroVideoMaker',
    description: 'Tạo video ngắn bằng AI — soạn kịch bản, sinh ảnh, render tự động.',
    icon: 'Clapperboard',
    path: '/hero-video-maker/dashboard',
    status: 'beta',
    tier: 'pro',
    category: 'ai',
    color: 'from-violet-500 to-fuchsia-500',
    slogan: 'Biến ý tưởng thành video chỉ bằng 1 câu lệnh',
    longDesc: 'Tạo video ngắn bằng AI chuyên nghiệp. Bạn chỉ cần nhập ý tưởng, AI sẽ tự động soạn kịch bản và sinh hình ảnh minh họa cho từng cảnh. Render video được thực hiện local giúp tiết kiệm 100% chi phí server và bảo mật dữ liệu tuyệt đối.',
    features: [
      'Soạn kịch bản video bằng AI thông minh',
      'Sinh ảnh minh họa từng cảnh tự động',
      'Render video local — 0đ server cost',
      'Đồng bộ hóa Google Drive hoặc lưu máy khách'
    ],
    benefits: [
      'Tiết kiệm 90% chi phí làm video ngắn marketing',
      'Quy trình tự động hóa hoàn toàn từ kịch bản tới video thành phẩm',
      'Lưu trữ linh hoạt trên Google Drive cá nhân để giảm tải server'
    ],
    targetUsers: 'Content Creators, TikTokers, Affiliate Marketers, Video Editors muốn sản xuất video số lượng lớn.'
  },
  {
    id: 'hero-film',
    name: 'HeroFilm',
    description: 'Nền tảng phim ngắn dọc — xem phim bộ nhiều tập kiểu ReelShort/DramaBox.',
    icon: 'Film',
    path: '/hero-film/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'ai',
    color: 'from-rose-500 to-red-500',
    slogan: 'Xem phim ngắn dọc, nghiện không dứt',
    longDesc: 'Nền tảng phim ngắn dạng cuộn dọc (vertical drama) với hàng trăm series nhiều tập. Trải nghiệm lướt phim mượt mà kiểu TikTok, quản lý series bằng Admin CMS, sẵn sàng tích hợp hệ thống bán phim và VIP.',
    features: [
      'Xem phim dạng cuộn dọc full-screen mượt mà',
      'Hệ thống Series nhiều tập (Phim bộ)',
      'Admin CMS quản lý nội dung phim',
      'Lịch sử xem và tiếp tục xem',
      'Sẵn sàng tích hợp Coin/VIP/Paywall'
    ],
    benefits: [
      'Trải nghiệm xem phim nghiện như ReelShort/DramaBox',
      'Quản lý nội dung tập trung, dễ dàng mở rộng thêm series mới'
    ],
    targetUsers: 'Nhà sản xuất phim ngắn, Creator nội dung video dọc, Doanh nghiệp giải trí số.'
  },
  {
    id: 'hero-dub',
    name: 'HeroDub',
    description: 'Tự động dịch phụ đề phim Trung Quốc sang Tiếng Việt bằng AI.',
    icon: 'Languages',
    path: '/hero-dub/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'ai',
    color: 'from-amber-500 to-orange-500',
    slogan: 'Phim Trung → Phụ đề Việt, 1 click',
    longDesc: 'Tự động dịch phụ đề phim Trung Quốc sang Tiếng Việt bằng AI. Dán link video, local worker tự động tải, ASR (Whisper), dịch thuật chất lượng cao và burn phụ đề vào video thành phẩm.',
    features: [
      'Hỗ trợ link video Douyin, Bilibili, YouTube',
      'Nhận dạng giọng nói (ASR) bằng faster-whisper cực nhanh',
      'Tự động dịch thuật phụ đề thông minh',
      'Đóng gói và burn trực tiếp phụ đề tiếng Việt vào video',
      'Quản lý hàng đợi tác vụ dịch thuật trực quan'
    ],
    benefits: [
      'Tiết kiệm 90% thời gian dịch và làm phụ đề phim',
      'Không tốn chi phí GPU server nhờ tận dụng máy local của user',
      'Giao diện trực quan dễ sử dụng cho mọi biên dịch viên'
    ],
    targetUsers: 'Các nhóm dịch phim Trung Quốc, các nhà sáng tạo nội dung re-up, các kênh phim ngắn.'
  },
  {
    id: 'hero-downloader',
    name: 'Hero Downloader',
    description: 'Dự án quét tải video qua worker cục bộ với cookie trình duyệt.',
    icon: 'DownloadCloud',
    path: '/hero-downloader/dashboard',
    status: 'beta',
    tier: 'pro',
    category: 'management',
    color: 'from-teal-500 to-cyan-500',
    slogan: 'Tải hàng loạt video từ bất kỳ nguồn nào',
    longDesc: 'Dự án MVP cho phép quét và tải video thông qua worker trực tiếp trên máy tính của bạn, tận dụng cookie từ Chrome Extension để định danh.',
    features: [
      'Quản lý dự án tải video trực quan',
      'Worker chạy trên máy cục bộ',
      'Đồng bộ cookie qua Extension Chrome'
    ],
    benefits: [
      'Không giới hạn tốc độ và số lượng',
      'Tránh bị chặn do sử dụng cookie thật'
    ],
    targetUsers: 'Content Creators, Video Editors, Data Miners.'
  }
];

// === Helper Functions ===

export function getAppsByStatus(status: AppDefinition['status']): AppDefinition[] {
  return APPS.filter((app) => app.status === status);
}

export function getAppsByTier(tier: AppDefinition['tier']): AppDefinition[] {
  return APPS.filter((app) => app.tier === tier);
}

export function getAppsByCategory(category: AppDefinition['category']): AppDefinition[] {
  return APPS.filter((app) => app.category === category);
}

export function getAppById(id: string): AppDefinition | undefined {
  return APPS.find((app) => app.id === id);
}

export function getLiveApps(): AppDefinition[] {
  return APPS.filter((app) => app.status === 'live');
}

export function getAllAppsCount(): number {
  return APPS.length;
}

export function getAppDynamicPath(appId: string, teamId: number): string {
  const app = getAppById(appId);
  if (!app) return '/dashboard';
  const parts = app.path.split('/').filter(Boolean);
  if (parts.length < 2) return app.path;
  return `/${parts[0]}/t/${teamId}/${parts.slice(1).join('/')}`;
}

