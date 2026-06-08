# AI2HERO — UI MAP
> Cập nhật: 2026-06-08
> 💡 **Quy tắc vàng**: Khi thiết kế hoặc thêm trang/giao diện mới cho một ứng dụng MVP, hãy xem hướng dẫn tích hợp chi tiết tại [MVP_INTEGRATION_GUIDE.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/MVP_INTEGRATION_GUIDE.md).

## KIẾN TRÚC TỔNG

```mermaid
graph TB
    subgraph Public["🌐 Public (không cần đăng nhập)"]
        LP[Landing Page<br>ai2hero.com/]
        PR[Pricing Page<br>/pricing]
        LG[Login/Register<br>/sign-in, /sign-up]
    end

    subgraph Protected["🔒 Protected (cần đăng nhập)"]
        DB[Bảng điều khiển<br>/dashboard]
        ST[Kho ứng dụng<br>/dashboard/store]
        HM[Trang chủ<br>/dashboard/home]
        MB[Thành viên<br>/dashboard/members]
        
        subgraph MVPs["📦 MVP Apps (App Registry)"]
            CHAT[AI Chat<br>/dashboard/chat]
            HUB[AI Hub<br>/dashboard/hub]
            API[API Hub<br>/dashboard/api]
            SIM[HeroSim<br>/sim/dashboard]
            POS[POS<br>/dashboard/pos]
            CONTENT[Content Hub<br>/dashboard/content]
            VIDEO[HeroVideo<br>/herovideodownload/dashboard]
            CONNECT[Connect Hub<br>/connect-hub/t/[teamId]/dashboard]
            REPORT[Hero Report<br>/hero-report/dashboard]
            CARE[Hero Care<br>/hero-care/t/[teamId]/dashboard]
        end
    end

    subgraph Admin["👑 Super Admin"]
        SA[Admin Panel<br>/admin]
        AN[Announcements<br>/admin/announcements]
    end

    LP --> LG
    LG --> DB
    DB --> MVPs
    DB --> MB
    SA --> DB
    AN --> DB
```

## DATA FLOW

```
User đăng ký → Auth (JWT Cookie) → PostgreSQL (Drizzle ORM)
                                         │
                                    ┌────┴────┐
                                    │         │
                               Teams/Org    App Registry
                               (RBAC)      (MVP Gating)
                                    │         │
                                    └────┬────┘
                                         │
                                    Dashboard
                               (Living Sidebar)
                                         │
                               ┌─────────┼─────────┐
                               │         │         │
                           AI Chat   AI Hub   SIM Mgr...
```

---

## CHI TIẾT TỪNG TRANG

### Landing Page (`/`)
- **Chức năng**: Giới thiệu AI2Hero, showcase các MVP miễn phí, CTA đăng ký
- **Vai trò**: Marketing page (public)
- **Đọc/Ghi data**: Không
- **Liên kết**: → /pricing, → /sign-in, → /sign-up

### Pricing Page (`/pricing`)
- **Chức năng**: Hiển thị bảng giá Free vs Pro vs Enterprise Việt hóa (đọc động từ DB), nút đăng ký, phần FAQ chi tiết
- **Vai trò**: Marketing page (public)
- **Đọc/Ghi data**: Đọc cấu hình các gói cước động từ database (`system_settings` table)
- **Liên kết**: → /sign-up, → Hỗ trợ Enterprise

### Sign In / Sign Up (`/sign-in`, `/sign-up`)
- **Chức năng**: Đăng nhập/đăng ký bằng Email + Password hoặc Google OAuth. Giao diện Dark Mode nền tối `#08080A` với card kính mờ glassmorphism và background orbs.
- **Vai trò**: Auth page
- **Đọc/Ghi data**: Đọc/Ghi bảng `users`, `teams`, `team_members`, `invitations` (PostgreSQL)
- **Liên kết**: → /dashboard, → /api/auth/google

### Bảng điều khiển (`/dashboard`)
- **Chức năng**: Trello-Style Board Overview hiển thị toàn bộ các Không gian làm việc (Workspaces/Teams) mà người dùng tham gia dưới dạng Board Cards tuyệt đẹp. Cho phép xem nhanh plan badge, các ứng dụng đang chạy, thành viên và link mở không gian làm việc. Có widget lịch sử hoạt động compact ở chân trang.
- **Vai trò**: Orchestrator — trung tâm điều hướng và bao quát toàn bộ hệ thống
- **Đọc/Ghi data**: Đọc từ database PostgreSQL thật (bảng `teams`, `activity_logs` thông qua `queries.ts`)
- **Liên kết**: → /dashboard/t/[teamId], → /dashboard/store, → /dashboard/home, → /dashboard/settings

### Kho ứng dụng (`/dashboard/store`)
- **Chức năng**: Nơi trưng bày toàn bộ MVP hệ thống (lấy cảm hứng từ Trello templates), nhóm theo categories (AI, Quản trị, Giao tiếp, Phân tích), hỗ trợ filter category pill, search thời gian thực và modal kích hoạt ứng dụng vào Team.
- **Vai trò**: MVP Store
- **Đọc/Ghi data**: Đọc `lib/apps-registry.ts` (APPS), đọc/ghi database PostgreSQL thật (Server Actions `activateAppAction`/`deactivateAppAction`)
- **Liên kết**: → /dashboard

### Trang chủ (`/dashboard/home`)
- **Chức năng**: Kênh giao tiếp nội bộ (Facebook Workplace Style) hiển thị 3 loại cập nhật (System Activity, MVP Result, Task Assignment) dạng timeline. 
  - **Banner Khẩn Cấp**: Hiển thị thông cáo khẩn cấp (warning/critical) chưa đọc của hệ thống ngay trên cùng, hỗ trợ đóng/dismiss banner riêng lẻ và cập nhật trạng thái đã đọc vào database thật.
  - **Tối ưu Post Creator UI**: Thu gọn dải Attachment Bar compact; ẩn 4 metrics của MVP Result dưới Accordion **"Chỉ số mở rộng ⚙️"** động; chuyển form Giao việc (Task Assignment) từ grid 3 cột sang layout hàng ngang flex mượt mà. Đính kèm ảnh cho phép nhập URL thực tế.
  - **Dữ liệu thật & Tenant Isolation (No Mockup) (CRITICAL)**: Cách ly dữ liệu 100% ở cả Backend (`getFeedPosts` filter `userTeamIds`) và Frontend (gợi ý `@mention` trong cả Post Creator & Comment scoped chặt chẽ theo Workspace đang chọn/chứa bài viết). Ngăn chặn hoàn toàn rò rỉ thông tin thành viên và bài đăng chéo giữa các tổ chức.
  - **Optimistic Rollback & UI Robustness**: Bổ sung snapshot state và rollback thông tin tức thời khi có lỗi API cho 5 hành động tương tác chính (like, comment, task update, pin).
  - **Thay thế Native Prompt**: Chuyển đổi popup `prompt()` nhập URL ảnh cũ sang inline modal mờ kính Glassmorphism, hỗ trợ phím Escape, Enter và đóng click-outside.
  - **Phân loại Post Card**: Phân bổ màu sắc viền mờ cao cấp dựa trên loại bài viết (viền vàng cho Task và tím cho MVP Result). Xem chi tiết MVP hiển thị dữ liệu thật từ DB.
  - **Chức năng cơ bản**: Ghim bài viết quan trọng lên đầu feed, phân trang tĩnh 3 bài đăng/trang với Pagination Footer Premium, hỗ trợ hash URL scroll (#post-{id}) và highlight bài đăng màu cam flash từ Notification.
- **Vai trò**: Social Feed & Internal Communication Hub
- **Đọc/Ghi data**: Đọc/Ghi database PostgreSQL thật (các bảng `feed_posts`, `feed_comments`, `feed_likes`, `system_announcements`, `user_announcement_reads`)
- **Liên kết**: → /dashboard

### Workspace Dashboard (`/dashboard/t/[teamId]`)
- **Chức năng**: Dashboard tổng quan đầy đủ của một Workspace cụ thể. Hiển thị 7 module: (1) Banner nhóm + Badge plan, (2) 4 Stats Cards tổng quan (AI usage, Apps, Members, Tasks), (3) AI Resource Progress Bar (Chưa kết nối dữ liệu), (4) Quick Launch Grid cho apps đã kích hoạt, (5) Task Board Kanban compact với bộ lọc trạng thái, (6) Biểu đồ Pure CSS Bar Chart lượt dùng AI 7 ngày (Chưa kết nối dữ liệu), (7) Timeline Activity Log thu gọn + Feed riêng nhóm. Dữ liệu cách ly hoàn toàn theo teamId.
- **Vai trò**: Workspace Dashboard — trung tâm vận hành riêng của từng nhóm
- **Đọc/Ghi data**: Đọc database PostgreSQL thật (các bảng `teams`, `users`, `feed_posts`, `activity_logs`), đọc `lib/apps-registry.ts` (APPS)
- **Liên kết**: → /dashboard, → /dashboard/store, → /dashboard/members, → /dashboard/settings, → /dashboard/home, → /dashboard/apps

### Cài đặt nhóm (`/dashboard/settings`)
- **Chức năng**: Quản lý gói đăng ký hiện hành của nhóm (tích hợp Stripe Portal), xem danh sách thành viên chi tiết và biểu mẫu gửi thư mời thành viên mới theo vai trò (Owner/Member).
- **Vai trò**: Team Administrator Page
- **Đọc/Ghi data**: Đọc/Ghi DB (`/api/team`, `/api/user`), DB Actions (`removeTeamMember`, `inviteTeamMember`)
- **Liên kết**: → /dashboard

### Thành viên (`/dashboard/members`)
- **Chức năng**: Quản lý danh sách thành viên trong nhóm, thay đổi vai trò (5 vai trò: Owner, Admin, Manager, Staff, Viewer), tạm khóa tài khoản, xóa khỏi nhóm. Xem ma trận quyền hạn chi tiết và quản lý các lời mời. Modal mời thành viên với Role Picker dạng Card cao cấp. **Tự động gửi thông báo in-app (Bell Notification) cho người được mời nếu đã có tài khoản, hỗ trợ phê duyệt nhanh.** Hỗ trợ cuộn ngang ma trận trên mobile và Trap Focus phím Escape để đóng nhanh Modal/Dropdown.
- **Vai trò**: Quản trị nhóm & phân quyền
- **Đọc/Ghi data**: Đọc/Ghi database PostgreSQL thật (các bảng `team_members`, `invitations`)
- **Liên kết**: → /dashboard/apps, → /dashboard

### AI Chat (`/dashboard/chat`) — MVP #1
- **Chức năng**: Trợ lý AI CSKH tự động (kế thừa từ UPCHAT SuperChat)
- **Vai trò**: MVP App
- **Đọc/Ghi data**: Đọc/Ghi conversations, messages, AI responses
- **Liên kết**: → /dashboard

### AI Hub (`/dashboard/hub`) — MVP #2
- **Chức năng**: Quản lý và điều phối các model AI
- **Vai trò**: MVP App
- **Đọc/Ghi data**: Đọc/Ghi AI models config, usage logs
- **Liên kết**: → /dashboard

### `/connect-hub/t/[teamId]/mapping`
- **Chức năng**: Giao diện chuẩn hóa trường dữ liệu (POS Field Mapping) giữa các hệ thống nguồn và chuẩn nội bộ Ai2Hero. Sử dụng cơ chế mapping chọn duy nhất với gợi ý `{ selected, suggestions }` được render dạng danh sách Radio Buttons trực quan. Bổ sung nút bấm "Phân tích dữ liệu mẫu" (AI Auto-Suggest) giúp tự động dò cấu trúc dữ liệu thô (đơn hàng, sản phẩm, khách hàng) từ cửa hàng thật (qua API `probe_sample_data`) và tự sinh đề xuất mapping tối ưu bằng thuật toán chấm điểm độ tương đồng ngữ nghĩa. Tích hợp Tab **"Năng lực API" (AI Capabilities)** hiển thị danh sách các năng lực API được phân loại chi tiết đi kèm cấu trúc hướng dẫn thực hiện cho AI (`aiInstruction`) và nút sao chép nhanh 1-click. Ngoài ra còn hỗ trợ **Modal Chạy thử (Test Run Modal)** trực quan cho phép lập trình viên chạy thử tức thời bất kỳ Năng lực API nào bằng cách nhập JSON payload mẫu và hiển thị log output trực tiếp từ API Gateway.
- **Vai trò**: UI Quản lý cấu hình mapping động và năng lực AI vận hành
- **Đọc/Ghi data**: Đọc/Ghi cấu hình mapping vào `connectHubMappingConfigs` (tự động chạy `migrateLegacyConfig` để nâng cấp cấu hình cũ), truy vấn danh mục năng lực thông qua Server Action `getConnectorDetailAction` (tab Năng lực API) để lazy-load động capabilities từ Detail Catalog kết hợp với capabilities tĩnh của registry, gọi Server Action thực thi test qua `runActionAction`.
- **Liên kết**: Sidebar -> Quản lý ánh xạ (hoặc Mapping)

### API Hub (`/dashboard/api`) — MVP #3
- **Chức năng**: Quản lý kết nối API bên thứ 3
- **Vai trò**: MVP App
- **Đọc/Ghi data**: Đọc/Ghi API providers, connection status
- **Liên kết**: → /dashboard

### HeroSim (`/sim/dashboard`) — MVP #4
- **Chức năng**: Giao diện quản trị SIM doanh nghiệp, hiển thị Stats, biểu đồ Donut rủi ro (CSS conic-gradient), danh sách top 5 SIM nguy cấp và các lối tắt nhanh.
- **Vai trò**: MVP App Home (Server Component + Sub-Sidebar dọc)
- **Đọc/Ghi data**: 
  - **Đọc**: Thống kê, SIM, cảnh báo từ DB qua `getCurrentTeamId()` & `sim-queries.ts`. Đọc live thông tin Workspace (Tên Team & Gói plan) trực tiếp từ database `teams` table.
  - **Đồng bộ API trực tiếp (Extension v4.0)**: Loại bỏ cơ chế Bridge API cũ kém an toàn (qua localStorage/postMessage). Extension v4.0 kết nối và đồng bộ mật khẩu trực tiếp 2 chiều với máy chủ qua giao thức HTTPS và Bearer Token JWT (90 ngày) bền vững, tăng độ bảo mật lên mức tối đa.
- **Liên kết**: → /sim/assets, → /sim/accounts, → /sim/alerts, → /sim/history, → /sim/settings, → Nút quay lại Workspace Dashboard nhanh (`/dashboard/t/team-[id]`)

### Quản lý SIM (`/sim/assets`)
- **Chức năng**: Bảng quản lý kho SIM. Cho phép tìm kiếm thời gian thực, lọc mở rộng (theo nhà mạng, rủi ro, loại SIM vật lý/eSIM, độ quan trọng), sắp xếp (Tên SIM, Số điện thoại, Rủi ro, Check gần nhất, Nhà mạng, Người phụ trách) và phân trang 10 dòng/trang với Premium Footer. Tích hợp slide-over Drawer chi tiết (thông tin đăng ký, tài khoản gắn liền, check logs), các modal thêm/sửa/xóa SIM (hỗ trợ đóng nhanh bằng phím Escape và click-outside), kiểm tra bảo mật (tính điểm rủi ro qua engine), và import CSV hàng loạt.
- **Vai trò**: MVP Asset Manager (Client Component)
- **Đọc/Ghi data**:
  - **Đọc**: Dữ liệu SIM, nhân viên, accounts, logs từ server loader.
  - **Ghi**: CRUD SIM qua server actions `createSimAsset`/`updateSimAsset`/`deleteSimAsset`; thêm check log qua `addSimCheckLog`; nhập lô qua `importSimAssetsBatch`.
- **Liên kết**: → /sim/dashboard, → chi tiết SIM Drawer

### Tài khoản liên kết (`/sim/accounts`)
- **Chức năng**: Bảng quản lý tài khoản phẳng (Table). Cho phép tìm kiếm thời gian thực, lọc theo nền tảng và độ quan trọng, sắp xếp linh hoạt các cột và phân trang 15 dòng/trang. Tích hợp tính năng Chọn nhiều (Bulk Select) để Xóa hàng loạt (Bulk Delete), nút giả lập "Nhập từ Chrome" cho Extension sau này. Hỗ trợ Drawer trượt xem chi tiết tài khoản (thông tin OTP, bảo mật, email/SIM khôi phục, ghi chú) và các modal thêm/sửa tài khoản. **Cơ chế bảo mật Vault 2.0 phân quyền: Chỉ Owner mới có thể giải mã và xem mật khẩu trong drawer (ẩn các nút xem/copy đối với các vai trò khác) và thêm/sửa mật khẩu trong các modal. Nâng cấp Bulk Delete sử dụng Premium Confirm Modal kính mờ thay thế confirm() native.**
- **Vai trò**: MVP Connection Manager (Client Component)
- **Đọc/Ghi data**:
  - **Đọc**: Tài khoản liên kết, SIM assets, nhân viên từ server loader. Mật khẩu được giải mã bằng `decryptField()` khi truy vấn nếu người xem là Owner.
  - **Ghi**: CRUD tài khoản qua actions `createSimLinkedAccount`/`updateSimLinkedAccount`/`deleteSimLinkedAccount` (Mật khẩu được mã hóa tự động bằng `encryptField()`). Xóa hàng loạt qua vòng lặp client-side tối ưu kết nối Server Actions.
- **Liên kết**: → /sim/dashboard, → /sim/assets, → Drawer chi tiết tài khoản

### Cảnh báo rủi ro (`/sim/alerts`)
- **Chức năng**: Quản trị danh sách sự cố bảo mật theo 3 Tab (Cần xử lý, Đã giải quyết, Đã bỏ qua). Tích hợp tìm kiếm theo loại/thiết bị/mô tả, lọc cấp độ rủi ro, lọc loại rủi ro động trích xuất từ events, sắp xếp linh hoạt (Thời gian, Độ nghiêm trọng theo trọng số, Tên thiết bị SIM) và phân trang Grid 6 items/trang có Premium Footer. Cho phép giải quyết (ghi chú cách xử lý qua modal có click-outside/Escape), bỏ qua rủi ro hoặc khôi phục sự cố cũ về Cần xử lý.
- **Vai trò**: MVP Threat Manager (Client Component)
- **Đọc/Ghi data**:
  - **Đọc**: Cảnh báo rủi ro từ server loader.
  - **Ghi**: Xử lý rủi ro qua actions `resolveSimRiskEvent`/`dismissSimRiskEvent`/`restoreSimRiskEvent`.
- **Liên kết**: → /sim/dashboard

### Lịch sử kiểm tra (`/sim/history`)
- **Chức năng**: Timeline audit logs dọc thể hiện toàn bộ lịch sử kiểm định bảo mật SIM. Hiển thị thông tin người check, loại check (Thủ công, Extension, API), ghi chú, và biến động điểm rủi ro (tăng/giảm/giữ nguyên).
- **Vai trò**: MVP Audit Trail (Client Component)
- **Đọc/Ghi data**:
  - **Đọc**: Logs từ server loader.
- **Liên kết**: → /sim/dashboard

### Cài đặt SIM (`/sim/settings`)
- **Chức năng**: Trang cài đặt HeroSim với **8 tabs cấu hình cao cấp** (Cấu hình chung, Quản lý nhân sự, Danh mục kênh, API & Tích hợp, Telegram Alerts, Chu kỳ kiểm tra, Quy tắc rủi ro, và **Sao lưu dữ liệu tự động** gửi email qua Resend). Tab Sao lưu dữ liệu chỉ hiển thị đối với Chủ sở hữu (Owner), hỗ trợ thiết lập email nhận, chu kỳ gửi (hàng tuần/hàng tháng) và kích hoạt sao lưu nhanh thủ công tức thời về email cá nhân.
- **Vai trò**: MVP Settings Manager (Server & Client Component)
- **Đọc/Ghi data**:
  - **Đọc**: Đọc danh sách nhân viên qua `getSimEmployees`, platforms qua `getSimPlatforms`, system settings qua Server Action `getSystemSetting`, và cấu hình backup qua `getBackupConfig`.
  - **Ghi**: Thêm/sửa nhân viên qua `createSimEmployee`/`updateSimEmployee`, platforms qua `createSimPlatformAction`/`deleteSimPlatformAction`, cấu hình hệ thống qua `saveSystemSetting`, lưu backup qua `saveBackupConfigAction`, và trigger gửi backup thủ công qua `triggerManualBackupAction`.

### HeroVideo Dashboard (`/herovideodownload/dashboard`)
- **Chức năng**: Giao diện bảng điều khiển tải video không logo. Hỗ trợ Zero-Cost Local Web Player để quét và phát trực tiếp các video đã tải xuống thông qua File System Access API.
  - **Nút Mở thư mục 1-Click thông minh**: Tự động sao chép đường dẫn thư mục `Downloads/herovideo/workspace-slug` vào Clipboard và phát đi tín hiệu `HERO_VIDEO_OPEN_FOLDER` qua `window.postMessage` giúp Extension mở thư mục của hệ thống ngay lập tức.
  - **Duyệt video offline 0s độ trễ**: Render danh sách video trực tiếp từ Folder local của người dùng mà không cần query cơ sở dữ liệu.
- **Vai trò**: MVP App (Offline-first & Local Storage)
- **Đọc/Ghi data**: Đọc/ghi các tệp video trực tiếp từ File System của máy tính cá nhân. Đồng bộ danh sách video lên máy chủ AI2Hero qua API của Extension.
- **Liên kết**: → /dashboard, nút "📂 Mở thư mục"

### Connect Hub Dashboard (`/connect-hub/t/[teamId]/dashboard`)
- **Chức năng**: Tổng quan trạng thái kết nối API, thống kê số lượng connection, số lượt thực thi trong tháng và lịch sử log mới nhất. Hiển thị 4 thẻ Stats Summary sắc nét.
- **Vai trò**: MVP App Dashboard
- **Đọc/Ghi data**: Đọc database PostgreSQL thật qua [connect-hub-queries.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/connect-hub-queries.ts).
- **Liên kết**: → /connect-hub/t/[teamId]/apps, → /connect-hub/t/[teamId]/connections, → /connect-hub/t/[teamId]/logs, → /dashboard

### Connect Hub App Store (`/connect-hub/t/[teamId]/apps`)
- **Chức năng**: Kho trưng bày các ứng dụng tích hợp, cho phép lọc theo danh mục pill (🔥 Phổ biến, 🤖 AI, 🛒 POS...) và tìm kiếm thời gian thực.
  - **Dynamic Connect Modal (Flex Column Fixed & API Capabilities)**: Popup thiết lập kết nối có bố cục Flex Column với chiều cao tối đa `max-h-[90vh]` và các phần Header, Body (cuộn độc lập), Footer phân chia rõ ràng để chống tràn layout. Hiển thị danh sách khả năng của API (`selectedApp.actions`) dưới dạng các ô grid card Dark Mode tinh xảo.
  - **Dynamic Detail Loading (Catalog Connectors)**: Khi click vào các app thuộc catalog (`runtimeType: 'catalog_only'`), giao diện sẽ tải động chi tiết API schema qua Server Action `getConnectorDetailAction` (đọc từ `catalog-detail.json`), hiển thị Warning Alert và khóa toàn bộ input/nút bấm để bảo mật.
  - **Meta Platform Connector**: Tích hợp gọi trực tiếp Graph API, Marketing API, Instagram Business API, và Threads API v25.0 (đọc từ env, default v25.0) xử lý 13 actions (gồm 2 Discovery, 4 Page/Inbox/Comments, 3 Ads, 2 Instagram, 2 Threads) và hiển thị 6 actions Write dưới dạng Planned (Phase 2).
- **Vai trò**: MVP Store & Client Integration
- **Đọc/Ghi data**: Ghi database qua Server Action `createConnectionAction` mã hóa AES-256-GCM, đọc chi tiết catalog qua Server Action `getConnectorDetailAction`.
- **Liên kết**: → /connect-hub/t/[teamId]/dashboard


### Connect Hub Connections Manager (`/connect-hub/t/[teamId]/connections`)
- **Chức năng**: Quản lý danh sách kết nối tích hợp API đang chạy. Hỗ trợ kiểm thử ping nhanh (`testConnectionAction`), ngắt kết nối (`deleteConnectionAction`) qua Premium Confirm Modal kính mờ, và xem chi tiết Drawer trượt (credentials masked).
- **Vai trò**: Connection Manager
- **Đọc/Ghi data**: Đọc/Ghi database Postgres thật qua Server Actions.
- **Liên kết**: → /connect-hub/t/[teamId]/apps, → /connect-hub/t/[teamId]/dashboard

### Connect Hub Usage Logs (`/connect-hub/t/[teamId]/logs`)
- **Chức năng**: Bảng nhật ký ghi nhận đầy đủ lịch sử chạy API tự động hoặc on-demand của Team, hiển thị chi tiết thời gian, action name, module gọi, trạng thái, duration (ms), và hiển thị tooltip báo lỗi chi tiết khi API lỗi. Phân trang 15 dòng/trang.
- **Vai trò**: MVP Audit Trail
- **Đọc/Ghi data**: Đọc từ bảng `connect_hub_usage_logs` PostgreSQL thật.
- **Liên kết**: → /connect-hub/t/[teamId]/dashboard

### Connect Hub Webhooks (`/connect-hub/t/[teamId]/webhooks`)
- **Chức năng**: Quản lý các Webhook Endpoints để nhận dữ liệu thời gian thực (POST/GET) từ các app bên ngoài. Hỗ trợ tạo webhook mới với giao diện hiển thị duy nhất 1 lần cho Secret Key, bật/tắt nhanh trạng thái, copy URL và Drawer trượt xem nhật ký payload (Headers & JSON body) trực quan. **Đặc biệt tích hợp luồng xử lý tự động (Webhook Flow): Cho phép cấu hình chuỗi các bước thực thi connector actions tuần tự (nội suy biến dynamic từ payload/headers) khi nhận webhook và theo dõi chi tiết lịch sử chạy (Flow Runs) trực quan qua Drawer.**
- **Vai trò**: Webhook Manager (Incoming gateway)
- **Đọc/Ghi data**: Đọc/Ghi bảng `connect_hub_webhooks` và `connect_hub_webhook_logs` qua Server Actions trong `connect-hub-actions.ts`.
- **Liên kết**: → /connect-hub/t/[teamId]/dashboard, → /connect-hub/t/[teamId]/connections

### Hero Report Dashboard (`/hero-report/dashboard`)
- **Chức năng**: Giao diện chính của Hero Report (MVP Báo cáo tự động đa nguồn). Hiển thị danh sách lịch báo cáo tự động đã thiết lập, trạng thái hoạt động, lịch chạy tiếp theo, lịch sử gửi gần nhất cùng lượng token AI tiêu thụ. Tích hợp Form tạo mới 5 bước thông minh: Bước 1: Chọn một hoặc nhiều nguồn dữ liệu tích hợp (Pancake POS, Pancake Chat...). Bước 2: Đánh dấu chọn động các Năng lực API theo từng nguồn, hỗ trợ bộ lọc thời gian nâng cao 2 hàng nút (Ngày và Kế toán) có cảnh báo thời gian tải dài, và có nút "Xem trước dữ liệu gốc" để test thử nội dung HTML trả về ngay trên giao diện. Bước 3: Chọn cổng AI và Model linh hoạt được load từ Connect Hub kèm custom prompt. Bước 4: Đặt lịch gửi tự động. Bước 5: Cấu hình cổng nhận báo cáo (Telegram Bot hoặc Zalo ZNS & OA). 
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi dữ liệu từ 2 bảng `hero_report_schedules` và `hero_report_runs` thông qua Server Actions trong `hero-report-actions.ts`. Đọc `connectHubConnections` để kết xuất AI động.
- **Liên kết**: → /dashboard, → /connect-hub/t/[teamId]/connections (để thêm kết nối nếu trống)

### Hero Care Dashboard (`/hero-care/t/[teamId]/dashboard`)
- **Chức năng**: Trang chủ của Hero Care. Hiển thị các chỉ số hiệu suất hôm nay (tin nhắn nhận, AI call, tỷ lệ chính xác, handoff) được nạp trực tiếp từ DB thực tế và các phím tắt nhanh sang hộp chat, kịch bản, khách hàng, và snapshots.
- **Vai trò**: MVP App Dashboard
- **Đọc/Ghi data**: Đọc từ database Postgres các tin nhắn và event logs.
- **Liên kết**: → /dashboard, → /hero-care/t/[teamId]/chat, → /hero-care/t/[teamId]/scripts, → /hero-care/t/[teamId]/snapshots, → /hero-care/t/[teamId]/customers, → /hero-care/t/[teamId]/settings

### Hộp thư Chat Hero Care (`/hero-care/t/[teamId]/chat`)
- **Chức năng**: Giao diện Chat 3 cột chuyên nghiệp. Cột trái: Tìm kiếm và lọc hội thoại theo tabs phân loại (Tất cả, Robot, Hybrid, Manual, Resolved). Cột giữa: Khung chat thời gian thực (polling 4s) với 3 chế độ chat (AI Auto, AI Assist/Hybrid, Manual). Tích hợp vùng kiểm duyệt (Draft Zone) để nhân viên duyệt/sửa/gửi câu trả lời gợi ý của AI. Cột phải: Thông tin khách hàng (notes, tags), tra cứu tồn kho sản phẩm trong Snapshot cache, và gợi ý kịch bản FAQ phù hợp.
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi qua Server Actions tin nhắn, cuộc hội thoại, và thông tin chi tiết khách hàng.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard

### Quản lý kịch bản FAQ (`/hero-care/t/[teamId]/scripts`)
- **Chức năng**: Quản lý các kịch bản trả lời FAQ mẫu với giao diện 3-Tab: **Chờ duyệt** (pending) / **Đã duyệt** (active/paused) / **Từ chối** (rejected). Cho phép thêm/sửa/xoá mẫu, duyệt nhanh/từ chối kịch bản pending từ AI Learning sinh ra, gán từ khóa, intent và cài đặt ngưỡng tin cậy.
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi bảng `hero_care_scripts` qua Server Actions.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard

### Quản lý đồng bộ Snapshots (`/hero-care/t/[teamId]/snapshots`)
- **Chức năng**: Thiết lập chu kỳ đồng bộ tồn kho, sản phẩm, đơn hàng từ Pancake/KiotViet POS. Nút trigger đồng bộ nóng gọi Server Action thực tế `triggerSnapshotSyncAction` hiển thị tiến trình, tốc độ nạp cache và logs thời gian thực.
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi bảng `hero_care_snapshots` và `hero_care_snapshot_items` qua Server Actions.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard

### Quản lý Khách hàng (`/hero-care/t/[teamId]/customers`) [NEW]
- **Chức năng**: Bảng quản lý thông tin khách hàng đa kênh. Hiển thị thông tin kênh, tags phân loại, ghi chú liên hệ. Hỗ trợ thanh tìm kiếm, bộ lọc theo kênh và Drawer trượt chỉnh sửa tags/notes tức thì.
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi bảng `hero_care_customers` qua Server Actions.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard, → /hero-care/t/[teamId]/chat

### Hero Care Settings (`/hero-care/t/[teamId]/settings`)
- **Chức năng**: Trang cài đặt tổng quan Hero Care với 4-Tab:
  - **Inboxes**: CRUD inboxes và link chúng tới API Connect Hub.
  - **Guardrails**: Thiết lập quy tắc an toàn (chặn từ khóa xấu, handoff intent, max turns, stale cache block).
  - **Quotas**: Biểu đồ thanh tiến trình giám sát giới hạn tin nhắn/AI call của inboxes trong ngày.
  - **Event Logs**: Nhật ký audit các sự kiện hệ thống kèm Modal xem chi tiết payload JSON.
- **Vai trò**: MVP Settings Page
- **Đọc/Ghi data**: Đọc/Ghi các bảng `hero_care_inboxes`, `hero_care_guardrails`, `hero_care_events` và `connect_hub_connections` qua Server Actions.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard, → /connect-hub/t/[teamId]/connections

### Super Admin Dashboard (`/admin`)
- **Chức năng**: Dashboard tổng quan hiển thị 6 chỉ số nền tảng (Người dùng, tổ chức, lượt dùng AI, doanh thu, uptime, hoạt động hôm nay, trong đó Doanh thu và Uptime hiển thị dạng '—' placeholder do chưa kết nối Stripe/monitoring) và 2 biểu đồ Pure CSS Bar Chart tăng trưởng kèm 5 logs hệ thống mới nhất. **Đồng bộ hóa giao diện nền tối Premium Dark Mode.**
- **Vai trò**: Super Admin dashboard
- **Đọc/Ghi data**: Đọc `lib/admin-mock-data.ts`
- **Liên kết**: → /admin/users, → /admin/teams, → /admin/settings, → /admin/logs, → /dashboard/apps

### Quản lý người dùng (`/admin/users`)
- **Chức năng**: Quản lý toàn bộ tài khoản người dùng trên nền tảng, cho phép thăng cấp/hạ cấp Super Admin và tạm khóa/mở khóa tài khoản động. **Hỗ trợ sắp xếp theo cột (Người dùng, Vai trò, Lượt dùng AI) và phân trang 5 dòng/trang với Premium Footer. Chống vỡ giao diện trên mobile.**
- **Vai trò**: Super Admin page
- **Đọc/Ghi data**: Đọc từ Database Postgres thật qua `getAdminUsers()`, chỉnh sửa qua Server Actions `toggleUserRoleAction` & `toggleUserStatusAction`.
- **Liên kết**: → /admin
 
### Quản lý tổ chức (`/admin/teams`)
- **Chức năng**: Quản lý các nhóm và workspace, nâng hạ cấp plan nhanh (Free, Pro, Enterprise), khóa/mở khóa hoạt động của tổ chức. **Tích hợp sắp xếp theo cột (Tổ chức, Thành viên, Lượt dùng AI) và phân trang 5 nhóm/trang. Sử dụng bảng cuộn ngang chống tràn mobile và hiệu ứng hover mượt mà.**
- **Vai trò**: Super Admin page
- **Đọc/Ghi data**: Đọc từ Database Postgres thật qua `getAdminTeams()`, nâng/hạ gói qua `changeTeamPlanAction`, khóa/mở khóa qua `toggleTeamStatusAction`.
- **Liên kết**: → /admin

### Cấu hình hệ thống (`/admin/settings`)
- **Chức năng**: Quản trị API Keys của OpenAI, Anthropic, Google (ẩn/hiện masked key, xoay vòng Key qua Premium Confirm Modal). Thiết lập và quản lý động cấu hình của 3 gói dịch vụ (Free, Pro, Enterprise) qua giao diện Tabs (giá, chu kỳ, thành viên tối đa, mô tả, tính năng hiển thị và phân quyền các ứng dụng được phép).
- **Vai trò**: Super Admin page
- **Đọc/Ghi data**: Đọc/Ghi cấu hình từ database (`system_settings` table) bằng Server Actions
- **Liên kết**: → /admin

### Nhật ký hệ thống (`/admin/logs`)
- **Chức năng**: Bảng audit trail logs ghi nhận toàn bộ các thao tác vĩ mô của hệ thống, hỗ trợ bộ lọc nhanh theo 4 mức độ Severity (Tất cả, Info, Warning, Error) và ô tìm kiếm nhanh. **Hỗ trợ sắp xếp theo Thời gian, Hành động, Mức độ nghiêm trọng (trọng số Info < Warning < Error) và phân trang 5 dòng/trang. Tích hợp bảng cuộn ngang chống tràn mobile và hover row mượt mà.**
- **Vai trò**: Super Admin page
- **Đọc/Ghi data**: Đọc `lib/admin-mock-data.ts`
- **Liên kết**: → /admin

### Quản lý thông cáo hệ thống (`/admin/announcements`)
- **Chức năng**: Giao diện Quản trị Loa Thông Báo Premium Dark Mode dành cho Super Admin, cho phép đăng thông cáo mới (tiêu đề, phiên bản, mức độ, nội dung Markdown) và xoá tin lịch sử (sử dụng Premium Delete Confirm Modal).
- **Vai trò**: Super Admin page
- **Đọc/Ghi data**: Đọc từ Database Postgres thật qua Drizzle, ghi/xoá thông cáo bằng Server Actions `createAnnouncementAction` và `deleteAnnouncementAction`.
- **Liên kết**: → /admin

### Hero Care Dashboard (`/hero-care/t/[teamId]/dashboard`)
- **Chức năng**: Trang chủ của Hero Care. Hiển thị các chỉ số hiệu suất hôm nay (tin nhắn nhận, AI call, tỷ lệ chính xác, handoff) và các phím tắt nhanh sang hộp chat, kịch bản, và snapshots.
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc từ database các tin nhắn và event logs.
- **Liên kết**: → /dashboard, → /hero-care/t/[teamId]/chat, → /hero-care/t/[teamId]/scripts, → /hero-care/t/[teamId]/snapshots

### Hộp thư Chat Hero Care (`/hero-care/t/[teamId]/chat`)
- **Chức năng**: Giao diện Chat 3 cột chuyên nghiệp. Cột trái: Tìm kiếm và lọc hội thoại theo tabs phân loại (Tất cả, Robot, Hybrid, Manual, Resolved). Cột giữa: Khung chat thời gian thực (polling 4s) với 3 chế độ chat (AI Auto, AI Assist/Hybrid, Manual). Tích hợp vùng kiểm duyệt (Draft Zone) để nhân viên duyệt/sửa/gửi câu trả lời gợi ý của AI. Cột phải: Thông tin khách hàng (notes, tags), tra cứu tồn kho sản phẩm trong Snapshot cache, và gợi ý kịch bản FAQ phù hợp.
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi qua Server Actions tin nhắn, cuộc hội thoại, và thông tin chi tiết khách hàng.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard

### Quản lý kịch bản FAQ (`/hero-care/t/[teamId]/scripts`)
- **Chức năng**: Quản lý các kịch bản trả lời FAQ mẫu. Cho phép thêm/sửa/xoá các mẫu câu hỏi, gán từ khóa bắt buộc và từ khóa phủ định, chọn inbox áp dụng, phân nhóm ý định (intent) và cài đặt ngưỡng tin cậy khớp.
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi bảng `hero_care_scripts` qua Server Actions.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard

### Quản lý đồng bộ Snapshots (`/hero-care/t/[teamId]/snapshots`)
- **Chức năng**: Quản lý cấu hình đồng bộ dữ liệu tồn kho, sản phẩm, hoặc thông tin khách hàng từ Pancake/KiotViet POS. Thiết lập chu kỳ đồng bộ tự động (phút) và thời hạn hết hạn (stale time) kèm chính sách fallback an toàn. Hỗ trợ kích hoạt/tạm dừng cấu hình và nút trigger đồng bộ nóng (nạp cache tức thì).
- **Vai trò**: MVP App UI
- **Đọc/Ghi data**: Đọc/Ghi bảng `hero_care_snapshots` qua Server Actions.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard
- **Vai trò**: MVP App Dashboard
- **Đọc/Ghi data**: Đọc thông tin inboxes, messages và event log từ database Postgres thật qua Drizzle.
- **Liên kết**: → /hero-care/t/[teamId]/chat, → /hero-care/t/[teamId]/scripts, → /hero-care/t/[teamId]/snapshots, → /hero-care/t/[teamId]/settings

### Hero Care Settings (`/hero-care/t/[teamId]/settings`)
- **Chức năng**: Quản lý các Inboxes Hero Care. Cho phép tạo mới, sửa prompt AI, đặt giới hạn quota ngày, bật/tắt hoạt động và gán Connection ID từ Connect Hub tương thích.
- **Vai trò**: MVP Settings Page
- **Đọc/Ghi data**: Đọc/Ghi các bảng `hero_care_inboxes` và `connect_hub_connections` qua Server Actions.
- **Liên kết**: → /hero-care/t/[teamId]/dashboard, → /connect-hub/t/[teamId]/connections

### API Routes thông báo & thông cáo (`/api/notifications`, `/api/announcements`)
- **Chức năng**: Cung cấp API endpoints dynamic cho client fetch bằng SWR để render chuông báo Bell và Loa Megaphone.
- **Vai trò**: Data API
- **Đọc/Ghi data**: Đọc bảng `notifications` (bổ sung trả về `type` và `invitationId` để hỗ trợ tương tác Duyệt/Từ chối lời mời tại chỗ) và `system_announcements` join chéo `user_announcement_reads` từ database PostgreSQL.

### API Route Tìm kiếm toàn cục (`/api/search`)
- **Chức năng**: API thực hiện truy vấn chuỗi tìm kiếm không phân biệt hoa thường đối với Ứng dụng, Thành viên và bài viết Social Feed thật.
- **Vai trò**: Data API
- **Đọc/Ghi data**: Truy cập PostgreSQL thông qua Drizzle ORM để tìm kiếm users, feed_posts và lọc PLATFORM_APPS.
- **Liên kết**: Được gọi tự động từ ô Tìm kiếm toàn cầu trên thanh Header.


---

## DESIGN SYSTEM (Đã triển khai)

| Token | Giá trị |
|---|---|
| **Font chính** | Manrope (Next.js `next/font/google` trong layout) |
| **Màu thương hiệu** | `--hero-orange: 24 95% 53%` (Cam ấm)<br>`--hero-pink: 330 81% 60%` (Hồng cánh sen)<br>`--hero-gradient: Cam → Hồng` |
| **Dark mode** | 100% Dark Mode cưỡng bức cho Dashboard và Admin Shell (nền `bg-gray-950`, text `text-white`), không toggle sáng/tối |
| **Layout** | Full-width 100% viewport, Sidebar cố định (fixed/sticky) bên trái, Content trải dài toàn bộ chiều rộng còn lại |
| **Component library** | shadcn/ui (Radix + Tailwind CSS) |
| **Icons** | Lucide React |
| **Animations** | Custom CSS animations (`float`, `gradient-shift`, `fade-in`, `fade-up`, `pulse-glow`, `shimmer`, `count-up`) |
| **Sidebar Theme** | Dark Premium (`bg-gradient-to-b from-gray-900 to-gray-950`), active gradient cam-hồng, User Card footer |


## COMPONENT CHUNG (Đã triển khai)

| Component | Vị trí | Mô tả |
|---|---|---|
| `Sidebar` | Layout protected | **Context-Aware Living Sidebar**: Menu tinh gọn bắt đầu từ `top-14` (Global Nav, dynamic team accordion đa nhóm tích hợp App Registry, nút "Tạo không gian mới" viền dashed). Không còn Logo Section và UserCard. |
| `TopHeader` | `app/components/top-header.tsx` | **Premium Sticky Top Header**: Thanh trên cùng dính toàn cục chứa Launcher nhanh, Logo Sparkles gradient, ô **Tìm kiếm Toàn cục thông minh (Ctrl+K) kết nối dữ liệu Postgres thật** hiển thị Popover kết quả kính mờ phân nhóm Apps, Members, Posts. Nút "Tạo mới" (4 hành động nhanh), Loa hệ thống (Drawer), Chuông thông báo (SWR + Bell actions), Help, và Avatar người dùng. Dùng chung cho Dashboard và SIM layout. |
| `AppCard` | Components | Card hiển thị MVP trên Dashboard grid, hỗ trợ `index` cho staggered animation |
| `WelcomeBanner` | apps/page.tsx | Banner chào mừng có gradient sang trọng + blobs trang trí |
| `StatsSummary` | apps/page.tsx | Bộ đếm thống kê động số lượng app theo trạng thái hoạt động |
| `AppRegistry` | lib/ | Danh sách MVP định nghĩa cứng (thêm MVP mới chỉ cần đăng ký tại đây) |

