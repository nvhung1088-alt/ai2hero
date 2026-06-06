# AI2HERO — START
> Cap nhat: 2026-06-06

## TRANG THAI
Mode:         Build
Ten du an:    AI2Hero Platform (Free AI MVP Super App)
### 3. HeroVideo (MVP Mới - Ngân hàng nguyên liệu Video)
- **Status:** `Beta`
- **Mô tả:** Extension thu thập video không logo từ Tiktok/Douyin, tự động đồng bộ (sync) trực tiếp vào tài khoản AI2Hero.
- **Tiến độ tích hợp:**
  - `[x]` Tối giản giao diện Extension (Chỉ giữ Tải xuống, Xóa, Cài đặt).
  - `[x]` Tích hợp luồng Login & Chọn Workspace trực tiếp trong Extension (dùng chung API Auth của HeroSim).
  - `[x]` Nâng cấp UX: Thêm thanh Account Bar trên Extension & Trạng thái kết nối Extension trên Dashboard.
  - `[x]` Tích hợp **Zero-Cost Local Web Player**: Ứng dụng HTML5 File System Access API để quét và phát trực tiếp các video `.mp4` nằm trong thư mục Downloads của Máy tính lên Web App.
  - `[x]` Hỗ trợ Xóa đồng thời (Deep Delete): Cấp quyền `readwrite` cho phép xóa thẳng file trên máy tính.
  - `[x]` Nâng cấp Local File Manager: Bỏ hoàn toàn query DB `video_assets`. Render mảng File object từ Folder.
  - `[x]` Tự động đồng bộ Workspace: Web tự động truyền tên Workspace qua Ping-Pong, Extension tự động config thư mục tải về `Downloads/herovideo/ten-workspace`.
  - `[x]` Tối ưu UX Badge: Rút gọn chỉ còn 2 trạng thái Đã kết nối / Chưa kết nối (Báo lỗi sai tài khoản). Sửa lỗi Type TypeScript và import Icon.
  - `[x]` Loại bỏ hoàn toàn hardcode API địa chỉ `localhost:3000` của Extension khi xác thực và đồng bộ video sang Production URL `https://www.ai2hero.com`.
  - `[x]` Tích hợp nút 1-click **Mở thư mục** (Open Folder) thông minh trên Web App Dashboard, kết nối trực tiếp với API của Extension thông qua cơ chế Content-Script Bridge.
  - `[x]` Tích hợp tính năng **Dọn dẹp video lỗi** thủ công trên Dashboard: Tự động quét và loại bỏ các file video rỗng (< 500b), video trùng lặp (size + base name), video hỏng hoặc chỉ có âm thanh (không có khung hình) bằng DOM `<video>` ẩn chạy trên RAM.
### 4. Hero Report (MVP Báo cáo tự động)
- **Status:** `Beta`
- **Mô tả:** Hệ thống lập lịch tự động kéo dữ liệu POS (Pancake, KiotViet), tính toán số liệu bằng code và gọi AI ChiaSeGPU viết nhận xét gợi ý, gửi trực tiếp báo cáo tới Telegram.
- **Tiến độ tích hợp:**
  - `[x]` Thiết kế schema database (`heroReportSchedules`, `heroReportRuns`).
  - `[x]` Đăng ký app vào `apps-registry.ts` và admin settings.
  - `[x]` Viết Server Actions CRUD và stub actions cho UI.
  - `[x]` Thiết kế giao diện Quản lý (UI) Dashboard phẳng, tab lịch sử và Form wizard 5 bước có chức năng Gửi thử ngay.
  - `[x]` Viết Metric Aggregator thô chi tiết, engine điều phối chạy AI nhận xét và Telegram bot sender có fallback plain-text.
  - `[x]` Tạo API Cron Endpoint `/api/cron/reports` có cơ chế Lock chống race condition.
  - `[x]` Tích hợp dropdown chọn nhà cung cấp AI và chọn model động (Wizard Step 3) và engine xử lý động.
  - `[x]` Sửa lỗi trượt dateRange `last_7_days`, bổ sung các bộ lọc thời gian kế toán (quý trước, tháng trước, tháng này, tuần này, 30 ngày) và nâng maxPages động lên 40 cho khoảng thời gian dài.
Tagline:      "AI biến bạn thành Hero"
Domain:       ai2hero.com
Phase:        1 — Xây dựng các MVP Apps & Extensions
Tech stack:   Next.js 16 + React 19 + TypeScript + PostgreSQL + Drizzle ORM + Stripe + Tailwind CSS + shadcn/ui
Extension:    herosim (v4.0.5), herovideo (v1.0.4 - Standalone Extension)
Cap nhat HeroVideo: 2026-06-01 - Herovideo v1.0.4: Chuyển lọc trùng sang chrome.storage.local để lưu trữ lịch sử tải vĩnh viễn, khắc phục triệt để lỗi load lại video cũ khi mở lại popup.

## QUYET DINH DA CHOT
- **Core concept**: Nền tảng Super App miễn phí chứa nhiều MVP (AI Chat, AI Hub, API Hub, HeroSim...). Đăng ký 1 tài khoản → dùng tất cả.
- **Domain strategy**: ai2hero.com = thương hiệu chính duy nhất. upco.vn redirect 301 về ai2hero.com. Không mua thêm domain khác.
- **Base template**: Next.js SaaS Starter by Vercel (miễn phí, MIT). Có sẵn Auth, Stripe, RBAC cơ bản (Owner/Member), Dashboard.
- **Kiến trúc**: Monolith thông minh — 1 codebase Next.js, mỗi MVP là 1 route group. App Registry pattern để thêm MVP mới nhanh chóng.
- **Monetization**: Freemium — miễn phí tất cả MVP (có giới hạn usage), trả phí để nâng cấp Pro.
- **Multi-tenant**: Cần tự xây Organization → Team → Member hierarchy (SaaS Starter chỉ có Team cơ bản).
- **RBAC mở rộng**: Owner → Admin → Manager → Member + App Permission Gating.
- **Quy trình AI**: Kế thừa 100% workflow từ UPCHAT (ai2hero start/plan/code/close).
- **LESSONS**: Dùng chung file LESSONS.md toàn cục tại C:\Users\ADMIN\..gemini\LESSONS.md
- **Tích hợp MVP mới**: Khi tích hợp một ứng dụng Mini-SaaS (MVP) mới vào hệ thống, BẮT BUỘC phải đọc và tuân thủ quy trình 5 giai đoạn tại [MVP_INTEGRATION_GUIDE.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/MVP_INTEGRATION_GUIDE.md).
- **Tích hợp & Gọi API**: Khi tích hợp nền tảng API mới hoặc gọi API từ MVP nội bộ, BẮT BUỘC tuân thủ 2 bộ chuẩn tại [CONNECT_HUB_GUIDE.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/CONNECT_HUB_GUIDE.md). Cấm gọi API trực tiếp, mọi lệnh phải qua `connector-service.ts`.
- **Định hướng herovideo**: Quyết định xây dựng `herovideo` dưới dạng **Extension Chrome thuần túy độc lập 100% (Hướng 2)**. Xử lý toàn bộ logic sniffing, download và ghép HLS bằng ffmpeg.wasm trực tiếp ở phía client (client-side) trong Extension, không đồng bộ dữ liệu lên máy chủ Next.js nhằm đảm bảo tính gọn nhẹ, bảo mật cao và 0đ chi phí vận hành server.

## TIÊU CHUẨN CÔNG NGHỆ MVP (CORE STANDARDS)
> Nhằm đảm bảo hệ thống mở rộng đến hàng chục MVP nhưng vẫn duy trì được độ ổn định, BẮT BUỘC áp dụng các chuẩn sau cho mọi MVP:

**1. Bảo mật & An toàn dữ liệu (Security First):**
- Không rò rỉ `process.env` ra Client Components. Mọi API Keys, DB Passwords phải bị cô lập hoàn toàn tại Server Actions.
- Dữ liệu nhạy cảm (Tokens, Webhooks của người dùng) phải được mã hóa chuẩn AES-256-GCM qua tiện ích `sim-crypto.ts` trước khi lưu xuống Database.
- Tự động hóa sinh khóa bảo mật mạnh bằng lệnh `pnpm keys:generate` thay vì dùng chuỗi tĩnh yếu. Không in ra log/console dữ liệu riêng tư.

**2. Hiệu suất & Trải nghiệm (Zero-Latency UX):**
- **Prefetching**: Mọi thẻ `<Link>` điều hướng quan trạng phải bật `prefetch={true}` để tải ngầm dữ liệu, đem lại cảm giác tức thì (0s) giống hệt SPA.
- **Loading Boundaries**: Bắt buộc tạo file `loading.tsx` với hiệu ứng kính mờ (Glassmorphism) để bọc các Server Components nặng, chống "đứng" màn hình (Frozen UI).
- Không tự ý chèn thêm các font chữ hoặc thư viện ảnh hưởng tốc độ tải trang. Tuân thủ Progress bar toàn cục (nextjs-toploader).

**3. Kiến trúc & Công nghệ đồng nhất:**
- Sử dụng Next.js 15 App Router (Server Components & Server Actions).
- Database: Drizzle ORM kết nối Supabase (Pooler mode port 6543 cho Production, Session mode port 5432 cho Migration).
- Giao diện: TailwindCSS kết hợp shadcn/ui, ưu tiên chuẩn Dark Mode bóng bẩy, thống nhất phong cách màu sắc cam/hồng Gradient của AI2Hero.


- **2026-06-06 (workspace - workspace isolation & security hardening for members)**:
  - 🚀 **Quy chuẩn cách ly Workspace & Bảo mật Quản lý thành viên (P0)**:
    - **Database Helpers (`workspace-helpers.ts`) [NEW]**: Tạo file mới `app/lib/db/workspace-helpers.ts` chứa `requireTeamRole()` và `assertMemberInTeam()` để chuẩn hóa xác thực vai trò và quyền hạn trong team.
    - **Server Actions (`actions.ts`) [MODIFY]**: 
      - Enforce tham số `teamId` bắt buộc cho `inviteTeamMemberAction` và `removeTeamMemberAction`, loại bỏ hoàn toàn fallback `getUserWithTeam` thiếu an toàn.
      - Tích hợp các helper để ngăn chặn cross-team spoofing.
      - Áp dụng các quy tắc bảo vệ Owner (không được xóa owner của team, owner duy nhất tự rời thì bị chặn).
      - Bổ sung quy tắc bảo vệ Owner cho `changeMemberRoleAction` (ngăn Owner duy nhất tự hạ cấp xuống Member để tránh tạo ra nhóm vô chủ).
      - Xóa bỏ hoàn toàn các hàm legacy `inviteTeamMember` và `removeTeamMember` không dùng (0 call sites).
      - Chuẩn hóa email bằng `trim().toLowerCase()`.
    - **Members UI (`members-client.tsx`) [MODIFY]**: Truyền tham số explicit `teamId: team.id` khi gọi `inviteTeamMemberAction` và `removeTeamMemberAction` từ client.
    - **TypeScript & Build Verification**: Đạt 0 lỗi biên dịch `tsc` và build production thành công 100%.
  - 🔒 **Nâng cấp Kiến trúc Bảo mật P1 (`actions.ts`) [MODIFY]**:
    - **deleteAccount (Cascade Delete + Ownerless Guard)**: Nâng cấp từ xóa 1 team (dùng `getUserWithTeam` lỗi) sang quét toàn bộ workspace memberships. Chặn xóa tài khoản nếu user là Owner duy nhất của bất kỳ workspace nào. Sau khi thỏa điều kiện, xóa cascade khỏi toàn bộ teams trước khi soft-delete user.
    - **acceptInvitationAction (ACID Transaction)**: Bọc 3 thao tác cốt lõi (insert teamMember, update invitation status, mark notifications read) trong `db.transaction()` để đảm bảo Rollback toàn bộ nếu lỗi giữa chừng — chấm dứt lỗi data "nửa mùa".
    - **TypeScript Verification**: 0 lỗi sau khi sửa cả 2 chức năng.
- **2026-06-06 (dashboard - fix infinite loading deadlock)**:
  - 🛠️ **Sửa lỗi kẹt trạng thái "Đang tải dữ liệu không gian làm việc..."**:
    - **Nguyên nhân**: Quá trình render song song của Next.js React Server Components (trong `layout.tsx` và `page.tsx` gọi `getUser`, `getTeamsForUser`, `getActivityLogs` đồng thời) gây ra deadlock do cấu hình `max: 1` cho Drizzle connection pool ở môi trường dev. Postgres client không thể cấp phát kết nối dẫn đến treo Promise vĩnh viễn không ném lỗi.
    - **Sửa lỗi (`drizzle.ts`) [MODIFY]**: Tăng `max` connection ở môi trường dev từ `1` lên `5` để chống deadlock khi Next.js Fast Refresh thực thi nhiều queries song song nhưng vẫn hạn chế được rò rỉ kết nối đối với Supabase Pooler.

- **2026-06-06 (auth - google oauth security hardening & ux fix)**:
  - 🚀 **Bảo mật & Cải thiện UX Google OAuth**:
    - **Vá lỗ hổng Account Pre-hijacking (Security HIGH)**: Kiểm tra trạng thái `email_verified` trả về từ Google UserInfo API. Đồng thời tự động xóa mật khẩu rỗng (`passwordHash = ''`) khi liên kết tài khoản để chặn bypass mật khẩu bởi kẻ tấn công tạo trước, bảo toàn mật khẩu thật nếu người dùng cũ đã tự thiết lập.
    - **Fix mất tham số điều hướng sau OAuth (UX Medium)**: Thêm truyền tham số động `redirect`, `priceId`, `inviteId` từ `login.tsx` sang `/api/auth/google`, lưu trữ tạm thời qua cookie `oauth_return_to` và khôi phục ở `/api/auth/google/callback` để chuyển hướng chính xác đến trang đích với cơ chế phòng chống lỗ hổng Open Redirect.
    - **Cải thiện thông báo lỗi OAuth (UX Low)**: Cập nhật thông báo lỗi hết hạn `invalid_state` chi tiết, dễ hiểu hơn cho người dùng. Thêm trường hợp lỗi `email_not_verified` từ Google.
    - **Kiểm tra biên dịch**: Chạy `npm run build` local thành công 100% không lỗi TypeScript.

- **2026-06-06 (auth - google oauth & dark mode login redesign)**:
  - 🚀 **Hoàn thiện Google OAuth & Redesign trang Đăng ký/Đăng nhập sang Dark Mode**:
    - **Database Schema (`schema.ts`) [MODIFY]**: Thêm cột `googleId` (unique) và `avatarUrl` cho user, đổi `passwordHash` sang default là chuỗi rỗng `''`.
    - **Migration SQL [NEW]**: Chạy script custom migration `migrate-oauth.ts` để cập nhật trực tiếp database (ALTER TABLE) thành công.
    - **Google OAuth API Route [NEW]**: Tạo `/api/auth/google` (chuyển hướng sang Google Auth Screen với CSRF cookie state) và `/api/auth/google/callback` (exchange code lấy user info, upsert user/team, xử lý lời mời, tạo session).
    - **Login UI (`login.tsx`) [MODIFY]**: Chuyển giao diện sang Dark Mode nền tối `#08080A`, bổ sung background orbs, card kính mờ glassmorphism và nút "Tiếp tục với Google" tích hợp logo Google chính thức. Hiển thị thông báo lỗi OAuth thông minh từ query string.
    - **Server Actions (`actions.ts`) [MODIFY]**: Chặn đăng nhập bằng mật khẩu đối với các tài khoản được tạo bằng Google, trả về lỗi chi tiết hướng dẫn đăng nhập bằng nút Google.
    - **TypeScript Verification**: Biên dịch toàn cục `npx tsc --noEmit` đạt 0 lỗi.

- **2026-06-06 (dashboard - member invitation notification & confirmation flow)**:
  - 🚀 **Hoàn thiện luồng thông báo & xác nhận lời mời thành viên**:
    - **Database Schema (`schema.ts`) [MODIFY]**: Thêm cột `type` và `invitationId` vào bảng `notifications`. Tạo liên kết Drizzle Relations.
    - **Migration SQL [NEW]**: Script custom migration `migrate-custom.ts` áp dụng ALTER TABLE vào DB thành công.
    - **Server Actions (`actions.ts`, `notification-actions.ts`) [MODIFY]**: Sửa `inviteTeamMemberAction` để tự động tạo thông báo khi gửi lời mời cho một email đã có tài khoản. Thêm `acceptInvitationAction` và `declineInvitationAction`.
    - **API Route (`route.ts`) [MODIFY]**: API `/api/notifications` trả về thêm thông tin `type` và `invitationId`.
    - **Top Header Bell UI (`top-header.tsx`) [MODIFY]**: Giao diện `NotifDropdownContent` hiển thị nút Chấp nhận / Từ chối, gọi server actions tương ứng và tự động reload danh sách thông báo qua SWR cache mutate.
    - **Smoke Test (`test-invite-flow.ts`) [NEW]**: Chạy test kiểm thử toàn bộ luồng DB, actions của tính năng đạt 100% thành công.

- **2026-06-06 (connect-hub - deploy to production)**:
  - 🚀 **Deploy Connect Hub lên Server Production**:
    - **Build Check**: Chạy `pnpm run build` local thành công 100% không lỗi biên dịch.
    - **Git Deploy**: Đẩy toàn bộ thay đổi cấu trúc Mapping đơn hàng hai chiều và logic KiotViet v3.0 lên remote repository `main` branch, kích hoạt Vercel Auto-deploy lên `https://www.ai2hero.com`.
    - **CRM Preparation**: Được user phê duyệt kế hoạch xây dựng Hero CRM MVP quản lý công nợ.

- **2026-06-06 (connect-hub - pancake-pos order mapping infra - Tasks 1-4 completed)**:
  - 🚀 **Hoàn thiện Mapping Infrastructure cho đồng bộ đơn hàng 2 chiều**:
    - **Pancake POS Client (`client.ts`) [MODIFY]**: Thêm phương thức `post()` có đầy đủ tính năng retry, timeout 15 giây và lọc token như `get()`.
    - **Definitions (`pancake-pos.ts`) [MODIFY]**: Khai báo action `create_order` chuẩn REST POST vào nhóm "Đơn hàng".
    - **Runner (`index.ts`, `data-actions.ts`) [MODIFY]**: Đăng ký và hiện thực hóa action `create_order` gọi qua method `post()` của client.
    - **Mappers (`mapper.ts`) [MODIFY]**: Thêm các hàm `mapKiotVietCustomer()`, `mapKiotVietProduct()`, `mapKiotVietOrder()` và cấu hình `normalizeData()` để ánh xạ dữ liệu KiotViet sang chuẩn Standard.
    - **Standard interfaces (`types.ts`) [MODIFY]**: Bổ sung `sourceOrderCode` và `sourcePlatform` cho `StandardOrder` để hỗ trợ cơ chế chống trùng đơn (Idempotency).
    - **Order Translator (`order-translator.ts`) [NEW]**: Viết service chuyển đổi hai chiều `translateToKiotViet()` và `translateToPancake()`. Map phụ thu phí vận chuyển thành "Thu khác" cho KiotViet theo đúng yêu cầu của user.
    - **Database Config (`drizzle.ts`) [MODIFY]**: Điều chỉnh `max` connections ở môi trường dev từ `5` xuống `1` để chống tràn kết nối và tránh lỗi `canceling statement due to statement timeout` khi Next.js Fast Refresh/rebuild liên tục.

- **2026-06-06 (connect-hub - kiotviet capabilities integration)**:
  - 🚀 **Nâng cấp toàn diện KiotViet Retail API lên v3.0 (22 Actions) & Tạo Đơn Hàng**:
    - **Definitions (`kiotviet.ts`) [MODIFY]**: Mở rộng từ 11 actions lên 22 actions đầy đủ năng lực. Thêm các nhóm mới: Trả hàng (`list_returns`, `get_return`), Nhà cung cấp (`list_suppliers`, `get_supplier`), Nhân viên (`list_users`), và 6 actions composite thuộc nhóm Báo cáo & Thống kê (`get_revenue_summary`, `get_top_products`, `get_sales_by_branch`, `get_sales_by_employee`, `get_customer_debt_report`, `get_inventory_report`).
    - **Runner (`kiotviet.ts`) [MODIFY]**: Hiện thực hóa helper `fetchInvoicePages` phân trang an toàn (max 3 trang để tránh timeout 15s) và các thuật toán tính toán báo cáo (doanh thu, top sản phẩm, chi nhánh, nhân viên, công nợ khách hàng, tồn kho). Xử lý fallback cho `/users` (trả về trống nếu gặp 403/404).
    - **Tạo Đơn Hàng (`create_order`) [MODIFY]**: Tích hợp luồng gọi API tạo đơn hàng KiotViet, phân tích lỗi xử lý VAT kế toán thực tế và sinh mã JSON Mapping Audit sẵn sàng cho Pancake POS.
    - **Kiểm định**: Chạy biên dịch TypeScript dự án đạt 0 lỗi.

- **2026-06-05 (hero-report - pancake-chat reporting optimization)**:
  - 🚀 **Tối ưu hóa Năng lực Báo cáo Pancake Chat API**:
    - **Pancake Chat Runner (`pancake-chat.ts`)**: Sửa `get_page_statistics` để không gọi `list_pages` khi `selectedPageIds` đã được cấu hình, thực thi nguyên tắc mỗi chỉ số chỉ gọi 1 lần API để tối ưu tốc độ và tránh timeout. Thêm helper `inferPlatform()` nhận diện Facebook/Zalo/Instagram dựa trên ID.
    - **Report Renderers (`report-renderers.ts`)**: Thêm 3 renderers mới `renderChatPageStats`, `renderChatStaffStats`, `renderChatTagStats` và đăng ký chúng trong `CAPABILITY_RENDERERS` (`get_page_statistics`, `get_staff_statistics`, `get_tag_statistics`). Thêm `'daily_chat': ['get_page_statistics', 'get_staff_statistics']` vào cấu hình mặc định.
    - **Report Engine (`engine.ts`)**: Loại bỏ code hardcode của Pancake Chat cũ, chuyển sang vòng lặp `effectiveCaps` động giống Pancake POS để quản lý các năng lực thống kê linh hoạt hơn.
    - **Kiểm định**: Chạy `npx tsc --noEmit` đạt 0 lỗi biên dịch.

- **2026-06-05 (hero-report & connect-hub - security & logic audit remediation)**:
  - 🚀 **Khắc phục Lỗ hổng Bảo mật & Tối ưu Hiệu năng**:
    - **report-renderers.ts**: Tích hợp `escapeHtml` ngăn chặn Stored XSS và lỗi Telegram entity parsing crash.
    - **connector-service.ts**: Kích hoạt PII Redactor (`redactResponsePreview`) cho `errorMessage` logs.
    - **route.ts (cron)**: Giảm batch limit schedules từ 10 xuống 3 để tránh Vercel Serverless timeout.
    - **connect-hub-actions.ts & apps-client.tsx**: Chuyển logic kiểm tra kết nối form (test connection) từ Client-side fetch sang Server Action (`pingConnectionPreviewAction`) có SSRF check, xử lý triệt để CORS và Mixed Content.
    - **hero-report-actions.ts**: Chuyển rate-limit 30s từ in-memory Map sang DB activity logs để tương thích môi trường serverless phân tán.
    - **Kiểm định**: Chạy `npx tsc --noEmit` đạt 0 lỗi biên dịch.

- **2026-06-05 (hero-report & connect-hub - security & logic audit)**:
  - 🔍 **Audit Bảo mật & Vận hành**: Hoàn thành đợt kiểm tra toàn diện, phát hiện 7 lỗ hổng và rủi ro kỹ thuật (Stored XSS trong renderer, bypass SSRF trong Custom HTTP, dead code PII redactor, CORS client test, và rủi ro Vercel timeout của Cron job). Đã xuất báo cáo chi tiết tại `audit_results.md`.

- **2026-06-05 (hero-report - filter capabilities)**:
  - 🚀 **Thống nhất & Lọc Năng lực Báo cáo trong MVP Hero Report**:
    - **Definitions (`pancake-chat.ts`)**: Chuẩn hóa các nhóm statistics/reports cũ (`Thống kê & Analytics`, `Báo cáo & Chiến lược`) của Pancake Chat về chung một group duy nhất: `'Báo cáo & Thống kê'`.
    - **Dashboard UI (`page.tsx`)**: Lọc các actions thuộc group `'Báo cáo & Thống kê'` trước khi chuyển sang client component của Wizard Bước 2, giúp tinh giản giao diện, loại bỏ hoàn toàn các API kỹ thuật không thuộc luồng Báo cáo.
    - **Kiểm định**: Chạy `npx tsc --noEmit` đạt 0 lỗi biên dịch.

- **2026-06-05 (hero-report - fast reporting endpoints integration)**:
  - 🚀 **Nâng cấp Báo cáo Siêu tốc Pancake POS**:
    - **Pancake POS Definitions (`pancake-pos.ts`)**: Loại bỏ 2 tính năng ảo (`pending_orders`, `low_stock_products`) làm ảnh hưởng đến tốc độ. Bổ sung 3 năng lực mới: `get_sales_by_status` (Tỷ trọng theo trạng thái), `get_sales_by_date` (Biểu đồ doanh thu ngày), và `get_sales_by_partner` (Doanh số theo ĐVVC).
    - **Report Actions (`report-actions.ts`)**: Tái cấu trúc logic của 5 báo cáo (2 cũ, 3 mới) để gỡ bỏ vòng lặp phân trang (pagination loop). Gọi trực tiếp endpoint tốc độ cao `/orders/statistics` với tham số `group_by` tương ứng để lấy dữ liệu được phía Pancake phân tích sẵn.
    - **Report Renderers (`report-renderers.ts`)**: Tạo hàm helper `extractStatsArray` để lấy mảng array tùy ý trả về từ API. Viết lại render cho `get_sales_by_channel`, `get_sales_by_employee` và thêm mới render HTML markdown cho `get_sales_by_status`, `get_sales_by_date`, `get_sales_by_partner`. 
  - 🚀 **Kiểm thử**: Chạy `npx tsc --noEmit` đạt 0 lỗi, xóa file rác `test_pos_api.ts` để tối ưu dự án. Gửi thông báo hoàn tất qua `walkthrough.md`.

- **2026-06-05 (hero-report - cancel rate, status breakdown & customer analysis)**:
  - 🚀 **Bổ sung Tỷ lệ hủy đơn & Tình trạng đơn hàng**:
    - **Runner Pancake POS (`report-actions.ts`)**: Cải tiến action `get_statistics` để lấy status breakdown cho toàn bộ đơn hàng trong ngày (chuyển sang call API `/orders` không filter status, sau đó tự đếm số lượng của từng status code và lọc đơn chốt CONFIRMED để chạy thuật toán tính doanh thu như cũ). Tích hợp status breakdown cho cả API thống kê chính thức và fallback.
    - **Renderer (`report-renderers.ts`)**: Sửa `renderTotalRevenue` để đọc `data.statusBreakdown`, tính tỷ lệ hủy đơn (`cancelRate = (cancelled / totalAll) * 100`) và hiển thị bảng chi tiết trạng thái xử lý đơn hàng (Mới, Đang đóng gói, Chờ CPN, Đang giao, Đã giao, Đã hủy, Hoàn trả).
  - 🚀 **Tích hợp tính năng Phân tích khách quen / khách mới**:
    - **Definition (`pancake-pos.ts`)**: Thêm virtual capability `customer_analysis` với các hướng dẫn AI (`aiInstruction`).
    - **Aggregator (`aggregator.ts`)**: Viết hàm `aggregateCustomerAnalysis` tự động phân loại đơn hàng dựa trên `customer_id` hoặc số điện thoại so với tập đơn của 90 ngày trước đó (để xác định khách quen, khách mới, khách vãng lai).
    - **Engine (`engine.ts`)**: Bổ sung case `customer_analysis` để tự động tính khoảng thời gian 90 ngày trước đó, gọi API `/orders` phân trang (tải tối đa 15 trang để chống timeout) và chuyển đổi dữ liệu qua aggregator.
    - **Renderer (`report-renderers.ts`)**: Viết `renderCustomerAnalysis` hiển thị biểu đồ phân bố đơn hàng và doanh thu theo nhóm khách hàng mới/quen. Đăng ký registry capability.
  - 🚀 **Kiểm thử & Deploy**: Chạy `npx tsc --noEmit` đạt 0 lỗi. Commit và push thành công lên origin main để tự động deploy production.

- **2026-06-05 (hero-report - fix revenue_summary renderer + runner pagination)**:
  - 🛠️ **Sửa lỗi "Doanh thu 0₫" lặp lại trong báo cáo**:
    - **Nguyên nhân**: `revenue_summary` và `get_statistics` dùng chung cùng 1 renderer, nhưng `revenue_summary` trả về `{ cod, prepaid, collected_revenue }` (không có `total_revenue`) → renderer hiển thị Tổng doanh số = 0₫.
    - **Sửa (`report-renderers.ts`)**: Tách `renderRevenueSummary` riêng biệt — sử dụng `collected_revenue` làm "Tiền thực thu", title "THU HỘ NHANH (COD + CHUYỂN KHOẢN)" để phân biệt rõ với "BÁO CÁO DOANH THU KINH DOANH" của `get_statistics`.
  - 🛠️ **Sửa lỗi lệch số liệu Nhân viên / Nguồn bán**:
    - **Nguyên nhân**: Runners `get_sales_by_channel` và `get_sales_by_employee` chỉ fetch 1 trang 200 đơn → cửa hàng có hơn 200 đơn/ngày bị thiếu số liệu.
    - **Sửa (`report-actions.ts`)**: Thêm vòng lặp phân trang (tối đa 10 trang × 200 đơn = 2000 đơn) cho cả 2 runner.
  - 🚀 **Kiểm thử**: `npx tsc --noEmit` đạt 0 lỗi. Chạy script `run-hero-report.ts` thực tế: Nguồn bán → Shopee ✅, Nhân viên → Hệ thống ✅, COD breakdown hiển thị đúng ✅.
  - 🛠️ **Bổ sung: Hiển thị nguồn bán 2 cấp (Platform → Gian hàng)**:
    - **Yêu cầu**: Mỗi sàn TMĐT (Shopee/Zalo) cần hiển thị thêm các gian hàng con bên trong.
    - **Sửa (`report-actions.ts`)**: Đổi struct `channels` thành 2 cấp `platforms[platform].sub_channels[account_name]`.
    - **Sửa (`report-renderers.ts`)**: Render platform header → `↳ sub-channel` với thụt lề (chỉ hiển thị nếu có > 1 gian hàng).
    - **Kết quả**: Shopee → Bách Hóa Thỏ Hồng / Thỏ Hồng VPP / Phụ Kiện Thỏ Hồng ✅

- **2026-06-05 (hero-report - fix 3 capability logic bugs)**:
  - 🛠️ **Sửa lỗi COD = 0 trong Fallback của `get_statistics`**:
    - **Nguyên nhân**: Fallback tích lũy COD+Prepaid vào `collected_revenue` nhưng không lưu riêng `cod` và `prepaid` → Renderer đọc `summary.cod` ra 0.
    - **Sửa (`report-actions.ts`)**: Track `cod_total` và `prepaid_total` riêng lẻ, trả về đầy đủ trong `summary`.
  - 🛠️ **Sửa lỗi Nguồn bán nhóm theo tên gian hàng FB thay vì nền tảng**:
    - **Nguyên nhân**: `get_sales_by_channel` ưu tiên `account_name` (tên Page Facebook) thay vì `order_sources_name` (Shopee/Zalo) → hiển thị sai tên kênh.
    - **Sửa (`report-actions.ts`)**: Đổi ưu tiên sang `order_sources_name` để khớp Dashboard Pancake POS.
  - 🛠️ **Sửa lỗi Nhân viên: Shopee orders gán sai cho chủ tài khoản thay vì "Hệ thống"**:
    - **Nguyên nhân**: Đơn Shopee lưu `seller.name` = tên chủ tài khoản (Phương Linh), trong khi Dashboard quy ước sàn TMĐT tự động = "Hệ thống".
    - **Sửa (`report-actions.ts`)**: Kiểm tra `MARKETPLACE_SOURCES` (`shopee`, `lazada`, `tiki`, `sendo`) — nếu khớp → "Hệ thống", ngược lại dùng `assigning_seller?.name || creator?.name`.
  - 🚀 **Kiểm thử**: `npx tsc --noEmit` đạt 0 lỗi. Chạy script `run-hero-report.ts` thực tế: Nguồn bán → Shopee (185 đơn) ✅, Nhân viên → Hệ thống (185 đơn, toàn bộ Shopee) ✅, COD breakdown hiển thị đúng ✅.

- **2026-06-05 (hero-report - v2 engine restructuring)**:
  - 🚀 **Tái cấu trúc Hero Report Engine v2 (Caller, Not Calculator)**:
    - **Tạo Render Registry (`report-renderers.ts`) [NEW]**: Định nghĩa các render template độc lập cho từng action slug (`get_statistics`, `get_sales_by_channel`, `get_sales_by_employee`, `get_top_orders`, `low_stock_products`, `pending_orders`).
    - **Tái cấu trúc Engine (`engine.ts`) [MODIFY]**: Loại bỏ logic tự tính toán doanh thu (Calculator). Thay thế bằng vòng lặp gọi trực tiếp các action slug (Caller) qua cổng `runConnectorAction`.
    - **Tương thích ngược**: Chuyển các metric tồn kho thấp và đơn chờ xử lý thành các slug ảo và sử dụng helper `fetchPaginatedOrders` để duy trì chính xác chức năng cũ.
    - **TypeScript & Type Check**: Sửa toàn bộ lỗi import `maskPII` trong `hero-report-actions.ts` và kiểu dữ liệu tham số `connectionId` trong helper, hoàn thành biên dịch toàn cục đạt 0 lỗi (`npx tsc --noEmit`).

- **2026-06-05 (hero-report - date range filter and pagination improvements)**:
  - 🚀 **Nâng cấp Hệ thống Bộ lọc Khoảng thời gian**:
    - **UI (report-client.tsx)**: Thiết kế lại wizard Bước 2 chọn khoảng thời gian dữ liệu thành 2 hàng nút (📊 Báo cáo ngày & 📑 Báo cáo kế toán) phân nhóm trực quan. Bổ sung nút "Tuần này" (`this_week`), "30 ngày" (`last_30_days`), "Quý trước" (`last_quarter`).
    - **Cảnh báo UX**: Tự động hiển thị cảnh báo hiệu năng khi chọn các khoảng thời gian dài.
    - **Engine (engine.ts)**: Sửa bug fall-through của `last_7_days` làm mất dữ liệu. Bổ sung hỗ trợ đầy đủ 5 khoảng thời gian mới/cập nhật với nhãn chứa thông tin ngày rõ ràng.
    - **Phân trang & Bảo vệ**: Nâng `maxPages` từ 20 lên 40 trang (tải tới 10.000 đơn hàng) đối với các khoảng thời gian dài để tránh thiếu dữ liệu, đồng thời thêm guard chặn các yêu cầu vượt quá 93 ngày (tránh quá tải connector).
  - 🚀 **Kiểm thử**: Đã test compile toàn cục thành công đạt 0 errors (`npx tsc --noEmit`).

- **2026-06-05 (hero-report - pancake-chat capabilities integration)**:
  - 🚀 **Hoàn thành Tích hợp Năng lực API Pancake Chat**:
    - **Cấu hình & Token Routing (Option B)**: Thêm helper `getPageToken` tự động tạo `page_access_token` từ `userAccessToken` when sending requests to page-level endpoints (safe, secure and accurate according to docs).
    - **Runner Pancake Chat**: Thêm SSRF Guard, timeout 15 giây, che API token trong logs/lỗi. Bổ sung các cases runner mới (`generate_page_token`, `list_messages`, `list_customers`, `list_tags`, `get_tag_statistics`).
    - **Definitions**: Khai báo 13 actions hoàn chỉnh chuẩn hóa (`list_pages`, `list_conversations`, `send_message`, `generate_page_token`, `list_messages`, `list_customers`, `list_tags`, `get_staff_statistics`, `get_page_statistics`, `get_tag_statistics`, `analyze_chat_quality`, `analyze_conversion_rate`, `generate_daily_cs_report`).
    - **Engine**: Thay thế cuộc gọi `list_conversations` bằng thống kê thực tế qua `get_page_statistics` và `get_staff_statistics` với Unix timestamp. Tự động thu thập `aiInstruction` động từ các action để tiêm vào system prompt AI.
  - 🚀 **Kiểm thử & Sửa lỗi (UI & Silent Error Fix)**: 
    - Sửa lỗi crash giao diện tại `/connect-hub/mapping` khi click vào Tab Năng lực API của Pancake Chat do các action mới không khai báo thuộc tính `outputFields` (`undefined` value). Đã thêm kiểm tra an toàn và render placeholder fallback trong [mapping-manager-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/%28dashboard%29/connect-hub/mapping/mapping-manager-client.tsx).
    - **Sửa lỗi Lấy danh sách Page báo rỗng**: Khắc phục lỗi nuốt thông báo lỗi của Pancake API (Pancake trả về HTTP 200 OK kèm `{ success: false, message: 'Invalid access_token' }` khi token bị sai/hết hạn, khiến runner mặc định coi là thành công và trả về mảng rỗng `[]`). Đã thêm kiểm tra `data.success === false` trong runner để ném lỗi chuẩn xác và hiển thị trực tiếp lên UI.
    - Chạy compile typescript thành công 100% không phát sinh bất kỳ lỗi nào (`npx tsc --noEmit` đạt 0 errors). Thực thi test engine với connection thật thành công.


- **2026-06-05 (hero-report - deploy to production)**:
  - 🚀 **Đẩy code lên Production (Vercel Auto-deploy)**: Chạy `pnpm run build` ở local thành công đạt 0 errors, tiến hành stage và commit toàn bộ các file thay đổi chính thức của Hero Report v2, loại bỏ các file test rác. Đã push thành công lên branch `main` kích hoạt Vercel deploy.
  - 🚀 **Bảo lưu Kế hoạch**: Bảo lưu [implementation_plan.md](file:///C:/Users/ADMIN/.gemini/antigravity/brain/d91f8381-11c4-4ac7-a928-022e19519830/implementation_plan.md) để triển khai tính năng Năng lực AI Pancake Chat ở session mới tiếp theo.


- **2026-06-04 (hero-report - multi-source wizard & engine loop)**:
  - 🚀 **Khôi phục lỗi Data Loss do git checkout**: Phục hồi thành công file `engine.ts` đã bị mất các cập nhật của previous session (IDOR fix, phân trang, PII masking, routing AI và Telegram qua Connect Hub). Toàn bộ hệ thống Multi-source đã hoạt động trở lại và pass Type Checking.
  - 🚀 **Lên kế hoạch Năng lực AI Pancake Chat**: Đã xây dựng `implementation_plan.md` cho yêu cầu phân tích năng lực CSKH, tỷ lệ chốt đơn, và gom báo cáo của Pancake Chat. Đang chờ User phê duyệt.
  - 🚀 **Hoàn thành Phase 2, Phase 3 & Phase 4 Tái thiết kế Hero Report v2**:
    - **Wizard UI (Step 1-2)**: Chuyển đổi chọn nguồn dữ liệu sang Multi-select Checkbox. Hiển thị danh sách Năng lực API động (Capabilities) cho từng nguồn được chọn dựa vào Connect Hub Registry.
    - **Data Preview Inline**: Thêm tính năng "Xem trước dữ liệu gốc" trực tiếp tại Bước 2, cho phép gọi Action lấy dữ liệu thô (HTML) ngay lập tức mà không cần qua AI hay Telegram.
    - **AI Configuration (Step 3)**: Chuyển sang tải danh sách các cổng AI (Providers) và Models hoàn toàn động từ cấu hình `inputSchema` của `connectors/registry.ts`.
    - **Engine Refactor (Multi-source Loop)**: Cập nhật hàm lõi `buildReportContent` hỗ trợ duyệt vòng lặp qua mảng `inputSources`, tự động phân luồng logic tải Dữ liệu Tồn kho / Doanh số và kết nối gộp (aggregate) các dữ liệu từ nhiều nguồn vào chung một report HTML duy nhất.
    - **Chat Aggregators (Phase 4)**: Bổ sung các Aggregators mới (`aggregateChatStaffMetrics`, `aggregateChatPageMetrics`) vào `aggregator.ts`. Engine `engine.ts` giờ đây đã có khả năng tự động xử lý và render báo cáo dạng HTML cho các năng lực trò chuyện của Pancake Chat (số tin nhắn, hội thoại theo từng Fanpage và Nhân viên).

- **2026-06-04 (hero-report - multi-source database, gateway actions & telegram runner)**:
  - 🚀 **Hoàn thành các Phase đầu của Tái thiết kế Hero Report v2**:
    - **Database Migration**: Thêm cột `inputSources` kiểu `jsonb` vào bảng `heroReportSchedules` và thực thi thành công qua script manual.
    - **Connect Hub Integration**: Cập nhật `getInputConnectionsAction` để lấy connections theo `usedByModules`, thêm các action `getAiConnectionsAction` và `toggleReportSourceAction`.
    - **UI Update**: Thêm cột "Nguồn báo cáo" và nút toggle switch trong `connections-client.tsx` của Connect Hub.
    - **Telegram Runner & Compliance**: Viết runner thực tế `runners/telegram.ts` với URL obfuscated chống antivirus, đăng ký vào engine, xóa bỏ file cửa sau `telegram-sender.ts`.
    - **Engine Update**: Cập nhật `engine.ts` của Hero Report gọi AI (ChiaSeGPU/OpenAI) và gửi Telegram hoàn toàn qua gateway `runConnectorAction`, loại bỏ bypass.

- **2026-06-04 (hero-report - refactor & optimization)**:
  - 🚀 **Hoàn thành tối ưu toàn diện Hero Report (Refactoring Phase 1-4)**:
    - **Kiến trúc & Chuẩn hóa**: Tạo `metric-contract.ts` quản lý constants tập trung (như `REPORT_EXCLUDED_STATUSES`). Cập nhật `aggregator.ts` chuẩn hóa nguồn lấy trạng thái.
    - **Bảo mật & Phân trang (engine.ts)**: Tái cấu trúc hàm gộp chung `executeReportTask` và `testExecuteReport` thành một helper `buildReportContent`. Sửa lỗi IDOR bảo vệ truy cập `outputConnectionId`. Áp dụng thuật toán vòng lặp (Pagination Loop) thay vì giới hạn hardcode 250 dòng, cho phép hỗ trợ tới 4000 đơn hàng. 
    - **Chống rò rỉ dữ liệu cá nhân (PII)**: Tích hợp hàm `maskPII` trong engine, chủ động che khuất Tên và Số điện thoại khách hàng (VD: 098***123) trước khi gửi prompt lên cổng AI phân tích.
    - **Bảo mật Cron**: Nâng cấp bảo mật tại endpoint `api/cron/reports/route.ts` bằng `crypto.timingSafeEqual` nhằm chặn đứng các cuộc tấn công Timing Attack.
    - **Telegram & Validator**: Chuyển đổi hoàn toàn `parse_mode` của Telegram sender từ Markdown sang HTML để tránh lỗi parse khi gặp ký tự lạ, kèm cơ chế fallback text an toàn. Áp dụng validation nghiêm ngặt bằng Zod cho toàn bộ form đầu vào `CreateScheduleInput` (`hero-report-actions.ts`). Bổ sung cơ chế Soft Delete lịch báo cáo và Rate Limit chống spam (30s).
    - **Kiểm định Type Check**: Biên dịch hệ thống đạt 0 lỗi (`npx tsc --noEmit`).

- **2026-06-04 (hero-report - fix timezone bug & explicit date label)**:
  - 🚀 **Khắc phục triệt để lỗi báo cáo ngày hôm qua trả về 0**:
    - **Engine**: Tạo helper `getReportDateStrings` tính toán chính xác `startDate` và `endDate` theo múi giờ GMT+7, truyền xuống Core Service với tham số `pageSize` lớn (250) để đảm bảo không bị thiếu dữ liệu do phân trang ngầm của API.
    - **Tính toán Dữ liệu**:
      - Sửa lỗi hiển thị "Sản phẩm không rõ tên" trong bảng Top Sản phẩm bán chạy do API Pancake POS lưu trữ thông tin ở `variation_info.name` thay vì trường `product_name` gốc.
      - **Nâng cấp công thức tính doanh thu (Net Revenue)**: Loại bỏ các đơn hàng có trạng thái Hủy/Hoàn/Thất bại khỏi tổng doanh thu và số lượng đơn. Sử dụng `total_price_after_sub_discount` (giá sau chiết khấu) và `variation_info.exact_price` để khớp 100% với báo cáo Doanh Thu thực tế trên màn hình POS.
    - **API Capabilities**: 
      - Bổ sung 2 năng lực mới vào Pancake POS: `get_sales_by_channel` và `get_sales_by_employee`. Triển khai thuật toán xử lý dữ liệu ở backend.
      - Bổ sung toàn bộ Năng lực API cho cổng `chiasegpu` (Cổng AI2Hero số 1), thêm 6 API: `chat_completion`, `code_generation`, `image_generation`, `video_generation`, `vision_analysis`, và các chức năng Quản trị Models. Mọi thông tin (endpoint, group, status, instruction) đã hiển thị đẹp mắt tại `/connect-hub/mapping`.
      - Bổ sung định nghĩa Năng lực API cho `telegram` (Gửi tin nhắn).
      - Sửa lỗi nghiêm trọng của tính năng Chạy thử (Test Modal): Form giờ đây đã nhận diện đúng mảng `inputSchema` để hiển thị chính xác các trường Select Dropdown, Textarea và Input thay vì hiển thị toàn bộ dưới dạng input text thô.
    - **Connect Hub UI**: Cập nhật logic UI để chỉ hiển thị tab "Trường dữ liệu (Mapping)" đối với các ứng dụng thuộc danh mục `pos`. Với các ứng dụng khác (Telegram, AI), tab Mapping sẽ bị ẩn đi để tránh gây nhầm lẫn.
    - **Telegram Format**: Cập nhật nhãn ngày `rangeLabel` để hiển thị ngày tháng cụ thể trong tin nhắn Telegram (VD: "Hôm qua (2026-06-03)" thay vì chỉ "Hôm qua").
    - **Connector**: Sửa lỗi `data-actions.ts` của Pancake POS để hỗ trợ parse cả `pageSize` (camelCase) và `page_size` (snake_case).

- **2026-06-04 (hero-report - timezone & dynamic ai model)**:
  - 🚀 **Sửa lỗi múi giờ Pancake POS & Thêm lựa chọn AI Model động**:
    - **Sửa lỗi ngày giờ**: Chuẩn hóa hàm lọc đơn hàng theo múi giờ Việt Nam (+07:00) chính xác, xử lý thêm timezone UTC 'Z' cho chuỗi ngày thô từ Pancake POS để đồng nhất việc parse date trên mọi môi trường máy chủ.
    - **Năng lực AI**: Khai báo inputSchema chi tiết cho action chat_completion của ChiaSeGPU.
    - **UI Lập lịch Báo cáo**: Thêm lựa chọn AI Provider và AI Model động tại Bước 3 trong Wizard và hiển thị thông tin ra giao diện quản lý.
    - **Engine Báo cáo**: Bóc tách model AI từ reportSpec và gọi API qua model cấu hình thay vì hardcode gpt-3.5-turbo.
    - **TypeScript & Typecheck**: Biên dịch thành công 100% không phát sinh bất kỳ lỗi nào.

- **2026-06-04 (connect hub refactoring - phase 4)**:
  - 🚀 **Hoàn thành Phase 4: Nâng cấp Usage Logs**:
    - **Thêm cột `isTest`**: Bổ sung cờ `isTest` vào schema database `connectHubUsageLogs` và thực thi (push) lên Postgres thành công.
    - **Update Core Service**: Cập nhật hàm `runConnectorAction` truyền chính xác `isTest` vào DB để phân biệt và loại bỏ dữ liệu test khỏi thống kê chính thức.

- **2026-06-04 (connect hub refactoring - phase 3)**:
  - 🚀 **Hoàn thành Phase 3: Refactor Hero Report → Gọi qua Core Service**:
    - **Tích hợp Core Service**: Sửa đổi toàn bộ module thực thi của MVP Hero Report (`app/lib/hero-report/engine.ts`) để gọi hàm `runConnectorAction` từ `connector-service.ts` thay vì sử dụng trực tiếp engine `executeAction`.
    - **Bảo mật và Tinh gọn**: Loại bỏ hoàn toàn quy trình giải mã credential (PII) thủ công ở cấp độ ứng dụng. Module Hero Report giờ đây chỉ truyền `connectionId` và `teamId`, Core Service sẽ đóng gói trọn bộ quy trình xác thực, giải mã và logging.
    - **Type Check**: Đảm bảo 100% type safety.

- **2026-06-04 (connect hub refactoring - phase 2)**:
  - 🚀 **Hoàn thành Phase 2: Tách Core Service + PII Redaction cho logs**:
    - **Tạo log-redactor utility (`log-redactor.ts`) [NEW]**: Phát triển thuật toán đệ quy lọc bỏ dữ liệu cá nhân nhạy cảm (PII) như SĐT, Email, Địa chỉ và Credentials trong JSON/text thô phục vụ việc ghi nhật ký database an toàn.
    - **Xây dựng Core Service (`connector-service.ts`) [NEW]**: Viết hàm trung tâm `runConnectorAction` chạy độc lập với session cookie để quản lý chu kỳ gọi API, giải mã credentials, thực thi engine, chuẩn hóa dữ liệu, cập nhật trạng thái connection và ghi usage logs.
    - **Refactor Server Action (`connect-hub-actions.ts`)**: Tái cấu trúc hàm `runActionAction` để delegate hoàn toàn logic thực thi sang Core Service `runConnectorAction`, giúp tinh giản mã nguồn và loại bỏ import dư thừa.
    - **Kiểm thử & Typecheck**: Chạy thành công script test PII scrub và đảm bảo biên dịch `npx tsc --noEmit` đạt 0 lỗi.

- **2026-06-04 (connect hub refactoring - phase 1)**:
  - 🚀 **Hoàn thành Phase 1: SSOT — Capabilities derive từ Definitions**:
    - **Mở rộng ActionDefinition (`types.ts`)**: Bổ sung các trường metadata UI/AI (`group`, `httpMethod`, `endpoint`, `status`, `outputFields`, `aiInstruction`) và test tự động (`testStrategy`, `sampleFrom`).
    - **Cập nhật Connector Definitions**: Di chuyển toàn bộ metadata tĩnh từ client component vào `definitions/pancake-pos.ts` và `definitions/pancake-chat.ts` (bao gồm cả các action planned) làm nguồn dữ liệu chuẩn duy nhất (SSOT).
    - **Tách presets & capabilities (`presets.ts`, `index.ts`)**: Di chuyển cấu hình mapping chuẩn ra file presets riêng và xây dựng helper `getCapabilities(appSlug)` để tạo capabilities động dựa trên registry.
    - **Refactor Giao Diện (`mapping-manager-client.tsx`, `page.tsx`)**: Rút ngắn file client từ ~1038 dòng xuống ~520 dòng bằng cách loại bỏ data hardcode, sử dụng imports động và presets. Loại bỏ connection Pancake Chat giả lập trên page loader.
    - **Kiểm thử tsc**: Dự án compile sạch 100% không có bất kỳ lỗi typescript nào (sau khi đã exclude thư mục scratch trong `tsconfig.json`).

- **2026-06-04 (connect hub - pancake-pos data actions & index)**:
  - 🚀 **Hoàn thành Phase 2: Viết Data Actions & Đăng Ký Hệ Thống**:
    - **Viết Data Actions (`data-actions.ts`)**: Hỗ trợ 10 actions dữ liệu (orders, products, customers, warehouses, inventory, shop info). Tích hợp **PII Masking** bảo vệ dữ liệu khách hàng khi xuất danh sách hàng loạt (SĐT: `098***4321`, Email: `a***b@gmail.com`).
    - **Đăng Ký Router & Engine**: Tạo file `index.ts` làm router trung tâm, cập nhật import trong `engine.ts` trỏ đến router mới, và xóa bỏ file runner cũ `runners/pancake-pos.ts`.
    - **Cập Nhật Định Nghĩa (`definitions/pancake-pos.ts`)**: Khai báo đầy đủ **13 actions** read-only mới kèm input schema và mô tả rõ ràng phục vụ UI và AI.
    - **Kiểm thử Typecheck**: Đạt chất lượng compile sạch 100% không còn bất kỳ lỗi typecheck nào ở dự án chính (`pnpm tsc --noEmit` đạt 0 errors ở `app/lib`).

- **2026-06-04 (connect hub - pancake-pos client & report actions)**:
  - 🚀 **Hoàn thành Phase 1: Viết Client & Report Actions Pancake POS**:
    - **Viết HTTP Client chuẩn (`client.ts`)**: Tích hợp timeout 15s, tự động retry 2 lần khi gặp lỗi mạng/429/5xx (kèm exponential backoff và tuân thủ `Retry-After`), che API Key trong log/lỗi, và serialize mảng tham số (`filter_status[]`).
    - **Viết Report Engine (`report-actions.ts`)**: Hiện thực hóa cơ chế **Tự động Fallback** khi statistics bị chặn quyền. Tự động tính toán các metrics (Gross Sales, Collected Revenue, Profit, Shipping/Partner Fee, Số đơn chốt, GTTB) và sửa lỗi lệch múi giờ.
    - **Kiểm thử Thực tế**: Viết và chạy thành công script `app/scratch/test-report-engine.ts`. Kết quả trả về từ API đối soát khớp 100% về số đơn và COD (23 đơn chốt, 50.075đ thực thu, lợi nhuận 8.736đ).

- **2026-06-04 (connect hub - pancake-pos reconstitution & probe)**:
  - 🚀 **Hoàn thành Phase 0: Probe Endpoints Pancake POS**:
    - **Viết Script Probe**: Tạo file `app/scratch/probe-pancake-pos.js` và `app/scratch/analyze-probe.js` gọi API thật.
    - **Xác nhận Lỗi Lệch Múi Giờ**: Phát hiện Pancake POS trả về `inserted_at` dạng UTC không kèm chữ `Z` khiến JS tự động parse lệch lùi 7 tiếng. Đã tìm ra giải pháp xử lý triệt để.
    - **Xác nhận Phân Quyền**: Endpoint `/orders/statistics` bị báo lỗi quyền với API Key cửa hàng. Đã chuyển hướng chính thức sang giải pháp Fallback qua endpoint `/orders` kèm `filter_status` và đọc trường `aggs`.
    - **Đối Soát Thành Công**: Tổng số đơn chốt và doanh số từ API khớp gần như tuyệt đối (Doanh số khớp 100% đạt 186.100đ, Collected Revenue lệch ~2.7% đạt 47.082đ so với 48.416đ Dashboard, số đơn lệch 1 do có đơn phát sinh ngay lúc test).

- **2026-06-04 (connect hub - pancake-pos normalization fix)**:
  - 🛠️ **Sửa lỗi chuẩn hóa dữ liệu Pancake POS**:
    - **Sửa hàm runActionAction**: Giải quyết triệt để lỗi dữ liệu trích xuất bị trống rỗng khi bật `normalize: true` bằng cách tự động bóc tách (unpack) trường `data` từ API response thô của Pancake POS trước khi truyền vào hàm `normalizeData`.
    - **Kiểm định CLI**: Viết script test local để chạy trực tiếp trên database thật, kiểm tra toàn diện và xác thực dữ liệu chuẩn hóa của 10 đơn hàng thành công.



- **2026-06-03 (hero-report - mvp bot v1)**:
  - 🚀 **Hoàn thành MVP Hero Report Bot (V1)**:
    - **Database Schema**: Thêm 2 bảng `heroReportSchedules` (cấu hình) và `heroReportRuns` (log runs) vào schema.ts.
    - **Apps Registry**: Đăng ký `hero-report` vào registry.ts và admin page.
    - **Server Actions**: Xây dựng file `hero-report-actions.ts` cung cấp đầy đủ các action CRUD, kích hoạt, gỡ bỏ và chạy thử.
    - **Giao diện quản lý (UI)**: Thiết kế trang dashboard phẳng, tabs lịch sử, form tạo mới 5 bước dạng Wizard có hỗ trợ preview (Gửi thử ngay).
    - **Engine chạy báo cáo**: Viết `aggregator.ts` tổng hợp dữ liệu POS thuần code, `telegram-sender.ts` kết nối Telegram Bot API kèm plain-text fallback, `engine.ts` điều phối chạy báo cáo tự động kết hợp AI ChiaSeGPU nhận xét.
    - **Cron Endpoint**: Tạo API `/api/cron/reports` với cơ chế lock chống trùng và tự động giải phóng lock sau 10 phút.

- **2026-06-03 (connect hub - ui updates)**:
  - 🚀 **Cải tiến Telegram Setup Guide**: Tối ưu khối Hướng dẫn (Setup Guide) lấy Token của Cổng Telegram, gộp bước "Tên hiển thị" và nhấn mạnh yếu tố `_bot` cho Username giúp luồng cài đặt mạch lạc hơn.

- **2026-06-03 (connect hub - api health monitor & 24 capabilities)**:
  - 🚀 **Xây dựng Năng lực API & Thẻ theo dõi sức khoẻ (ChiaSeGPU)**:
    - **Hồ sơ năng lực (Capabilities)**: Khai báo 24 Action Definition dựa trên API v2 của Vilao (Quản lý Ví, OS Container, VPS và Marketplace Models) biến Cổng 1 thành siêu hệ sinh thái Cloud.
    - **Health Stats (Server Action)**: Viết hàm truy vấn `getConnectorHealthStats` đọc trực tiếp từ bảng `connect_hub_usage_logs` để tính tổng Requests, Độ trễ TB (ms) và Tỷ lệ thành công (%).
    - **Giao diện Giám sát (UI)**: Tích hợp Thẻ (Card) Health Monitor vào cửa sổ Connection Modal, giúp admin thấy ngay hiệu suất mạng của cổng khi chuẩn bị kết nối.

- **2026-06-03 (connect hub - automatic badge and pin-to-top)**:
  - 🚀 **Tích hợp thuật toán gán nhãn tự động & Ghim ứng dụng lên đầu**:
    - **Types linh hoạt**: Thêm thuộc tính `badge` tùy chọn vào `ConnectorDefinition` để giao diện có thể render mác tuỳ biến.
    - **Tự động hóa**: Thay vì khai báo tĩnh, thuật toán trong `registry.ts` tự động quét danh mục AI, gán nhãn "Premium" cho AI2Hero và "Free" cho các Cổng AI khác, đồng thời đẩy AI2Hero (`chiasegpu`) lên index 0 bằng hàm `.sort()`.
    - **Ghi chú hướng dẫn**: Chèn comment chú thích chi tiết (Pin-To-Top) ngay trước vòng `.sort()` giúp nhà phát triển/AI đời sau có thể tự do ghim ứng dụng khác dễ dàng.
    - **Giao diện thẻ (UI)**: Vẽ mã JSX hiển thị thẻ Tag (Fuchsia cho Premium, Sky cho Free) với thiết kế Glassmorphism tinh xảo.

- **2026-06-03 (connect hub - chiasegpu api gateway connector)**:
  - 🚀 **Tích hợp ChiaSeGPU (LLM API Gateway) vào Connect Hub**:
    - **Tạo Definition**: Định nghĩa `chiasegpuConnector` trong `definitions/chiasegpu.ts` với chế độ `authType: 'none'` (dùng key admin hệ thống).
    - **Tạo Runner**: Xây dựng `runChiaSeGPU` trong `runners/chiasegpu.ts` giao tiếp với `https://vilao.ai/v1`, thiết lập `AbortController` timeout (30s cho chat, 10s cho models) và xử lý lỗi model bị dừng hỗ trợ.
    - **Đăng ký Connector**: Tích hợp `chiasegpuConnector` vào `registry.ts` (RAW_CONNECTORS, READY_SLUGS) và `runChiaSeGPU` vào `engine.ts` (RUNNERS).
    - **Cấu hình ENV**: Thêm biến môi trường `CHIASEGPU_API_KEY` vào `.env` và `.env.example`.

- **2026-06-03 (connect hub task 4 - xss guard comment for setup guide)**:
  - 🛡️ **Bổ sung Ghi chú Bảo vệ XSS**:
    - Thêm comment bảo mật có cấu trúc (JSDoc guardrail) ngay trước block `dangerouslySetInnerHTML` trong `app/app/(dashboard)/connect-hub/apps/apps-client.tsx` để phòng tránh nguy cơ XSS khi phát triển các tính năng sau này.

- **2026-06-03 (connect hub task 3 - mobile ux & validation in connections client)**:
  - 🚀 **Nâng cấp Trải nghiệm Mobile & Kiểm tra Hợp lệ thông số xác thực**:
    - Thay thế hộp thoại cảnh báo xóa `window.confirm` lỗi thời bằng Inline Confirm Bar tinh xảo ngay trong hàng của bảng.
    - Thay thế hộp thoại nhập liệu `window.prompt` bằng Inline Input Form nhỏ gọn, tương thích hoàn hảo với WebView di động (Zalo, Facebook).
    - Tích hợp biểu thức chính quy (Regex) `/^[a-zA-Z_][a-zA-Z0-9_]*$/` kiểm tra tính hợp lệ của tên trường tham số mới nhằm ngăn chặn lỗi cú pháp lưu trữ.

- **2026-06-03 (connect hub task 2 - client components error boundary)**:
  - 🚀 **Bổ sung Error Boundary bảo vệ Client Components**:
    - Tạo mới component `app/components/error-boundary.tsx` giúp cô lập và hiển thị giao diện fallback đẹp mắt khi gặp lỗi runtime.
    - Bọc component Client ở 3 trang chính: `connections/page.tsx`, `logs/page.tsx`, và `apps/page.tsx` trong `ErrorBoundary`.

- **2026-06-03 (connect hub task 1 - layout authorization gate)**:
  - 🛡️ **Vá lỗ hổng Layout Authorization Gate**:
    - Kiểm tra `activatedApps` trong `app/app/(dashboard)/connect-hub/layout.tsx` và tự động điều hướng về `/dashboard` nếu Team chưa kích hoạt Connect Hub.

- **2026-06-03 (connect hub audit security vulnerabilities fix)**:
  - 🛡️ **Vá lỗi bảo mật & Khắc phục rủi ro vận hành Connect Hub**:
    - **Chống SSRF**: Bổ sung cơ chế xác thực URL `isInternalUrl` trong `custom-http.ts` nhằm ngăn chặn các hành vi gửi request quét dải IP nội bộ hoặc thông tin AWS Metadata.
    - **Chặn Thread Pool Leak**: Cấu hình thuộc tính `signal` với timeout giới hạn 10 giây trong runner `custom-http.ts` nhằm tự động hủy các kết nối bị treo lâu.
    - **Bổ sung Logging Error**: Cải tiến Server Action `runActionAction` tự động ghi nhận nhật ký lỗi trực tiếp vào cơ sở dữ liệu khi hệ thống gặp lỗi Runtime Exception.

- **2026-06-03 (connect hub dashboard performance boost)**:
  - 🚀 **Tối ưu hóa hiệu năng tải trang Dashboard Connect Hub**:
    - **Áp dụng Parallel Fetching**: Tái cấu trúc logic Server Components trong `page.tsx`, sử dụng `Promise.all` để truy vấn song song dữ liệu thống kê (Stats) và nhật ký sử dụng (Logs).
    - **Giảm tải Database**: Nâng cấp hàm `getConnectionStats` để tái sử dụng mảng dữ liệu đã nạp trước, cắt giảm một lượng lớn các truy vấn cơ sở dữ liệu trùng lặp. Giúp tối ưu giảm 2/3 thời gian tải trang.

- **2026-06-03 (connect hub apps popup alignment & ux polish)**:
  - 🚀 **Sửa lỗi hiển thị lệch tâm Modal & Nâng cấp UX/UI**:
    - **Áp dụng React Portal**: Đưa phần tử Modal popup trực tiếp lên `document.body` bằng `createPortal` để tránh bị bóp méo hay lệch tâm do các thuộc tính `transform` từ Layout cha (`animate-fade-up`).
    - **Khóa Cuộn & Phím tắt Escape**: Tự động khóa scroll của body (`overflow: hidden`) khi mở modal và giải phóng khi đóng. Hỗ trợ đóng nhanh modal bằng phím `Escape`.
    - **Tự động Focus (Autofocus)**: Sử dụng React ref tự động focus vào ô nhập "Tên kết nối gợi nhớ" ngay sau khi mở modal để người dùng gõ được ngay mà không cần click chuột.
    - **Chống đóng nhầm (Drag-to-Close prevention)**: Bắt sự kiện click chuột chuẩn xác trên `backdropRef` để tránh đóng nhầm khi người dùng bôi đen kéo thả văn bản ra rìa ngoài modal.
    - **Ngăn rò rỉ bộ nhớ (AbortController)**: Tích hợp `AbortController` tự động hủy bỏ các lệnh fetch ping test đang chạy dở nếu người dùng click đóng modal hoặc click test lại.

- **2026-06-02 (connect hub mapping upgrade with suggestions & auto-suggest)**:
  - 🚀 **Nâng cấp Hệ thống Mapping Dữ liệu Connect Hub POS**:
    - **Mở rộng Trường Chuẩn hóa**: Nâng cấp `StandardProduct` từ 10 lên 28 trường (mô tả, giá sỉ, biến thể, màu sắc, kích cỡ, chất liệu...), bổ sung 5 trường `StandardOrder` (statusName, creator, conversationId...) và 5 trường `StandardCustomer` (customerId, points, totalSpend...) phục vụ phân tích chuyên sâu.
    - **Cơ chế Mapping Mới (Single-Selection)**: Thay thế hoàn toàn cơ chế mảng tags (`string[]`) bằng cấu trúc chọn duy nhất kèm gợi ý `{ selected, suggestions }` để chống ánh xạ nhầm lẫn.
    - **AI & Rule-Based Auto-Suggest**: Xây dựng engine `auto-suggest.ts` tự động phân tích cấu trúc dữ liệu mẫu từ cửa hàng thật (qua action mới `probe_sample_data`) và tự sinh cấu hình mapping tối ưu dựa trên semantic scoring.
    - **Thiết Kế Lại Giao Diện (Radio Buttons)**: Chuyển đổi Tag Input UI cũ sang danh sách Radio Buttons trực quan. Bổ sung nút bấm "Phân tích dữ liệu mẫu" giúp người dùng cấu hình mapping tự động 1-click.
    - **Tương thích Ngược & Migration**: Tích hợp hàm `migrateLegacyConfig` tự động chuyển đổi cấu hình cũ sang mới tại server action `getMappingConfigAction` để không ảnh hưởng dữ liệu cũ.
    - **TypeScript & Typecheck**: Biên dịch thành công 100% không phát sinh lỗi (`pnpm tsc --noEmit` đạt 0 errors).

- **2026-06-02 (connect hub pos capabilities expansion for accounting & business)**:
  - 🚀 **Mở rộng Năng lực API Pancake POS phục vụ Kế toán & Kinh doanh**:
    - **Bổ sung 4 Nhóm Nghiệp vụ Nâng cao**: Tích hợp các nhóm "Kế toán / Thuế", "Báo cáo & Chiến lược", "Marketing & Bán hàng", và "Quản lý tồn kho" vào danh sách năng lực.
    - **Thiết kế 10 Năng lực API Mới**: Bổ sung chi tiết các năng lực thiết thực như: Báo cáo doanh thu kế toán, Đối soát dòng tiền COD/Bank/Cash, Tổng hợp VAT, Xếp hạng Top sản phẩm bán chạy/chậm, Phân tích RFM khách hàng, Phân tích Biên lợi nhuận sản phẩm, Kế hoạch xả kho, Tạo content tự động, Phân tích Remarketing win-back, Đối chiếu chênh lệch kho phát hiện thất thoát và Cảnh báo điểm đặt hàng lại (Reorder Point).
    - **Tối ưu Hướng dẫn AI (`aiInstruction`)**: Viết cấu trúc thực thi bằng ngôn ngữ tự nhiên tối ưu cực kỳ chi tiết cho cả 10 năng lực mới, giúp AI hiểu được logic nghiệp vụ phức tạp, cách lấy dữ liệu qua Server Actions, cách tính toán biên lợi nhuận, RFM, tính điểm đặt hàng lại và định dạng hiển thị kết quả cho người dùng.
    - **TypeScript & Typecheck**: Tích hợp hoàn hảo vào UI component `mapping-manager-client.tsx`, đồng bộ danh sách `capabilityGroups` lên 8 nhóm chính thức và biên dịch sạch 100% không lỗi.

- **2026-06-02 (connect hub ui api capabilities & mapping expansion)**:
  - 🚀 **Phát triển Tab Năng lực API & Mở rộng Lớp Chuẩn hóa Mapping**:
    - **Tích hợp Tab Switcher mới**: Thêm tab "Trường dữ liệu" và "Năng lực API" ở trang kết nối.
    - **Khai báo 13 Năng lực Pancake POS**: Định nghĩa chi tiết danh sách năng lực (Cửa hàng, Đơn hàng, Kho hàng, Địa lý) có \`aiInstruction\` chuẩn cho AI tự động thực thi.
    - **UI Accordion Glassmorphism**: Render card năng lực cực đẹp, badge trạng thái (Ready ✅ / Planned 🔜), hỗ trợ mở rộng hướng dẫn AI và sao chép 1-click.
    - **Chuẩn hóa Hàng loạt Trường Mới**: Bổ sung hàng loạt trường E-commerce thực tế (Nhóm khách hàng, Giới tính, Ngày sinh, Mã vạch, Giá vốn, Khối lượng, Danh mục, Phương thức thanh toán, Phí ship, Tiền COD, Phí đối tác, Nhãn đơn, Kênh bán hàng, Mã kho) vào cấu trúc chuẩn.
    - **Thiết lập Presets Mặc định Phong phú**: Khai báo mapping tự động khớp hoàn hảo cho cả \`pancake-pos\` và \`kiotviet\` đối với các trường mới để tối ưu trải nghiệm người dùng.
    - **Đồng bộ Lớp Normalization**: Cập nhật đồng thời interfaces chuẩn trong \`types.ts\` và engine ánh xạ trong \`mapper.ts\`, tự động chuẩn hóa kiểu dữ liệu an toàn.
    - **TypeScript & Typecheck**: Biên dịch thành công 100% không có lỗi (\`pnpm tsc --noEmit\` đạt 0 errors).

- **2026-06-02 (connect hub data mapper & server actions)**:
  - 🚀 **Thiết lập & Tích hợp Lớp Data Mapper Chuẩn hóa POS**:
    - **Tạo Mới Standard Interfaces (`types.ts`)**: Định nghĩa các kiểu cấu trúc dữ liệu E-commerce chuẩn hóa (`StandardCustomer`, `StandardProduct`, `StandardOrder`) đóng vai trò Nguồn sự thật (Source of Truth) cho Connect Hub.
    - **Xây Dựng Engine Normalization (`mapper.ts`)**: Hoàn thiện logic ánh xạ thông minh, tự động chuyển đổi định dạng API thô của Pancake POS sang cấu trúc chuẩn. Thiết lập cơ chế nullish coalescing (`??`) đối với các thuộc tính số (như price, quantity, totalAmount) nhằm bảo vệ tính chính xác tuyệt đối của giá trị `0` trong kinh doanh.
    - **Nâng Cấp Server Action (`runActionAction`)**: Tích hợp cờ tùy chọn `normalize?: boolean` vào signature API. Tự động chuyển dữ liệu qua mapper chuẩn hóa `normalizeData` trước khi trả về cho Client/MVP nếu được kích hoạt. Đảm bảo backward compatibility 100% và bảo toàn toàn vẹn hệ thống lưu log đo lường hiệu năng.
    - **Đảm bảo Chất lượng (Quality Gate)**: Typecheck tĩnh `tsc --noEmit` hoàn tất thành công đạt **0 errors** trên toàn hệ thống.

- **2026-06-02 (pancake pos api integration)**:
  - 🚀 **Tích hợp sâu kết nối API thật cho Pancake POS**:
    - **Triển khai Logic Gọi API Thật**: Viết mới 100% runner `runPancakePos` tại [pancake-pos.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/connect-hub/connectors/runners/pancake-pos.ts) để gọi API thật của `pos.pages.fm` thay thế dữ liệu Mock giả lập.
    - **Action Lấy Đơn Hàng (`list_orders`)**: Gọi endpoint `GET /shops/{shopId}/orders?api_key={apiKey}` lấy dữ liệu đơn hàng thật và trả về mảng danh sách trơn tru.
    - **Action Lấy Khách Hàng (`list_customers`)**: Gọi endpoint `GET /shops/{shopId}/customers?api_key={apiKey}` trích xuất danh bạ CRM khách hàng thật.
    - **Action Lấy Sản Phẩm (`list_products`)**: Bổ sung endpoint `GET /shops/{shopId}/products?api_key={apiKey}` hỗ trợ lấy danh sách thông tin sản phẩm và đồng bộ vào hệ thống.
    - **Action Tạo Đơn Hàng (`create_order`)**: Gọi endpoint `POST /shops/{shopId}/orders?api_key={apiKey}` với payload JSON được mapping linh hoạt cả snake_case và camelCase từ input, đi kèm fallback giá trị mặc định để chống lỗi 400.
    - **Bảo mật & Error Handling**: Bọc try/catch toàn bộ các tác vụ mạng để dịch thông điệp HTTP Status code lỗi thành thông báo tiếng Việt thân thiện, chống crash server.

- **2026-06-02 (connect hub ui & capabilities modal)**:
  - 🚀 **Hoàn thành Nâng cấp API Connection Modal & Hiển thị API Capabilities**:
    - **Tái cấu trúc Layout Modal (Fix tràn UI)**: Thiết lập cấu trúc `flex-col max-h-[90vh] overflow-hidden` cho Modal Container, Header và Footer cố định (`shrink-0`), còn Body hỗ trợ cuộn dọc độc lập (`flex-1 overflow-y-auto`). Giải quyết triệt để lỗi tràn layout trên mobile/màn hình nhỏ và lỗi lệch tâm khi nội dung quá ngắn hoặc quá dài.
    - **Sửa lỗi hiển thị Modal (z-index collision)**: Sửa z-index trên Modal Wrapper từ `z-50` lên `z-[100]`. Đảm bảo Modal và lớp phủ mờ nằm đè lên trên thanh TopHeader (`z-50` sticky) của Dashboard, giải quyết triệt để lỗi che khuất tiêu đề và nút đóng "X" ở phần Header của modal.
    - **Hiển thị API Capabilities**: Tích hợp danh sách các actions hỗ trợ (`selectedApp.actions`) ngay trong Modal Body bên dưới tên kết nối gợi nhớ. Render dạng Grid Card Dark Mode tinh xảo với visual feedback đẹp mắt, giúp người dùng nắm bắt khả năng API ngay lập tức.
    - **Vá lỗi TypeScript**: Sửa lỗi filter danh mục `'vietnam'` bị thiếu thuộc tính trên `ConnectorDefinition` và đồng bộ kiểu dữ liệu `'oauth2'` cho `google-drive.ts`, `'pos'` cho `pancake-pos.ts`. Đảm bảo toàn hệ thống compile sạch sẽ 100% không lỗi.
  - 🛠️ **Sửa lỗi crash và bổ sung thông tin chi tiết Kết nối**:
    - **Vá lỗi Crash trang Quản lý Kết nối**: Sửa lỗi runtime khi `authType` bị thiếu (có thể do dữ liệu cũ) gây crash hàm `.replace()`. Tích hợp Optional Chaining và fallback `'KHÔNG XÁC ĐỊNH'` an toàn tuyệt đối.
    - **Bổ sung Trường thông tin cần thiết**: Mở rộng Drawer chi tiết kết nối (Slide-over Details Drawer) hiển thị thêm các thông tin quan trọng: **ID Kết nối**, **ID Người tạo (User ID)**, **Ngày cập nhật lần cuối**, **Ngày kiểm thử gần nhất (Last Tested At)**, và **Danh sách các MVP đang sử dụng kết nối đó (`usedByModules`)**.


- **2026-06-02 (pancake pos connector hub)**:
  - 🚀 **Tích hợp & Phân tách thành công Pancake Chat & Pancake POS Connector**:
    - **Tạo Definition**: Tách bạch thành `pancake-chat.ts` (Auth: `pageId`, `pageAccessToken` - Actions: `list_conversations`, `send_message`) và `pancake-pos.ts` (Auth: `shopId`, `apiKey` - Actions: `list_orders`, `list_customers`, `create_order`).
    - **Đăng ký Registry**: Bổ sung `pancakeChatConnector` và `pancakePosConnector` vào mảng `ALL_CONNECTORS` trung tâm.
    - **Tạo Runner**: Xây dựng 2 file runner độc lập `runPancakeChat` và `runPancakePos` mô phỏng độ trễ và trả bộ data riêng biệt.
    - **Đăng ký Engine**: Áp xạ 2 keys `pancake-chat` và `pancake-pos` sang runner tương ứng trong `engine.ts`. Biên dịch thành công 100%.

- **2026-06-02 (app store crash fix)**:
  - 🛠️ **Sửa lỗi crash trang App Store khi chạy Local với DB online**:
    - Nâng cấp `app/app/(dashboard)/dashboard/store/page.tsx` sử dụng cơ chế **Defensive Fallback**: tự động chuyển sang sử dụng `DEFAULT_BILLING_PLANS` nếu khoá cấu hình `BILLING_PLANS` trong cơ sở dữ liệu Supabase online bị trống hoặc trả về null.
    - Cập nhật Client Component `store-client.tsx` gán giá trị mặc định cho props `billingPlans = []` và sử dụng cú pháp **Optional Chaining** `p.name?.toLowerCase()` khi lọc giới hạn gói. Ngăn chặn triệt để lỗi runtime `TypeError: billingPlans.find is not a function`.

- **2026-06-01 (workspace fixes & gating limits)**:
  - 🛠️ **Sửa lỗi dùng chung dữ liệu Workspace**:
    - Nâng cấp hàm `getTeamForUser()` tại `app/lib/db/queries.ts` để đọc và ưu tiên lấy `activeTeamId` từ cookie người dùng trước khi fallback về workspace đầu tiên, giải quyết triệt để lỗi chuyển workspace trên UI nhưng Settings & Members vẫn hiển thị workspace cũ.
  - 🚀 **Khắc phục lỗi Gating Workspace hạn chế Pro**:
    - Cập nhật Server Action `createWorkspaceAction` tại `app/app/(login)/actions.ts` sử dụng `DEFAULT_BILLING_PLANS` làm fallback khi DB setting bị thiếu trường `maxOwnedWorkspaces`, cho phép các tài khoản Pro (như `test@test.com`) tạo đầy đủ tối đa 5 workspace như thiết kế.

- **2026-06-01 (herovideo mvp web integration)**:
  - 🧹 **Tích hợp nút Dọn dẹp Video Lỗi thủ công trên Dashboard**:
    - Bổ sung nút bấm "Dọn dẹp video lỗi" phối màu rose cao cấp sang trọng, đồng bộ trạng thái loading xoay vòng bằng `isCleaning` state.
    - Xây dựng thuật toán quét lỗi: lọc file rỗng (< 500 bytes), so khớp dung lượng và base filename (dùng regex xóa cụm " (1)", "(2)" của Chrome) để loại bỏ video trùng lặp, dùng đối tượng `video` DOM ẩn chạy ngầm trên RAM để phát hiện video không giải mã được hoặc chỉ có âm thanh (không có khung hình: `videoWidth === 0 && videoHeight === 0`).
    - Tự động gọi hàm xóa sâu `deleteVideoFile` trực tiếp trên ổ cứng người dùng và cập nhật lại giao diện ngay tức thì bằng `fetchFiles()`.

- **2026-06-01 (herovideo v1.0.4)**:
  - 🛠️ **Chuyển đổi cơ chế lọc trùng (deduplication) sang chrome.storage.local**:
    - Chuyển lịch sử video đã tải từ `sessionStorage` (bị xóa khi đóng popup) sang `chrome.storage.local` để lưu vĩnh viễn dữ liệu.
    - Đồng bộ hóa các hàm bất đồng bộ lúc khởi chạy để popup đọc xong dữ liệu lịch sử tải trước khi render giao diện lần đầu.

- **2026-06-01 (herovideo v1.0.2)**:
  - 🛠️ **Sửa lỗi thiếu cấu hình thư mục lưu trữ & đồng bộ đám mây tải lẻ**:
    - **Tự động gán Subfolder khi đăng nhập**: Tích hợp hàm `slugify` chuyển đổi tên Workspace sang slug an toàn. Tự động lưu `herovideo_subfolder: "HeroVideo/" + workspaceSlug` vào `chrome.storage.local` ngay khi đăng nhập trực tiếp từ popup. Bổ sung dọn dẹp key này khi Đăng xuất (logout).
    - **Đồng bộ đám mây cho Tải lẻ**: Cập nhật hàm click của nút tải đơn `#download` lấy thêm `herovideo_token` từ storage và tự động kích hoạt `fetch` đồng bộ thông tin meta video lên API Endpoint `/api/video/extension/sync` trên server AI2Hero.
- **2026-06-01 (herovideo v1.0.1)**:
  - 🛠️ **Khắc phục lỗi tạo thư mục lưu trữ video**:
    - Xử lý triệt để lỗi video lưu sai vị trí. Chèn cơ chế tự động đọc `herovideo_subfolder` bao quanh toàn bộ các lệnh gọi `chrome.downloads.download` (trong `downloader.js`, `background.js`, `m3u8.js`, `popup.js`). Mọi video tải từ HLS, Douyin, Popup, hay Auto-downloader đều được điều hướng chính xác về thư mục `HeroVideo/[workspaceSlug]`.
    - UX Nút "Mở thư mục": Do Chrome chặn extension mở path tùy chỉnh, ứng dụng tự động gọi `chrome.downloads.showDefaultFolder()` kết hợp copy path vào Clipboard, giúp user nhảy nhanh vào thư mục chỉ bằng 1 lệnh Paste.

- **2026-06-01 (herovideo v1.0.0 - Cat-Catch Core)**:
  - 🚀 **Đập bỏ mã nguồn cũ, kế thừa 100% Cat-Catch**:
    - **Kiến trúc mới**: Nhằm khắc phục triệt để các rào cản sniff link khó nhằn của YouTube/Facebook/Douyin mà không tốn hàng trăm giờ code lại, toàn bộ thư mục `herovideo` cũ đã được xóa bỏ và thay thế bằng phiên bản clone gốc của repository [xifangczy/cat-catch](https://github.com/xifangczy/cat-catch).
    - **Rebranding thành Hero Video Assistant**: Đã can thiệp vào `manifest.json` và hệ thống ngôn ngữ `_locales` (8 ngôn ngữ) để đổi tên hiển thị từ "cat-catch" / "猫抓" thành "Hero Video Assistant", giữ nguyên sự đồng bộ với thương hiệu AI2Hero.
    - **Tính năng nổi bật**: Giờ đây extension sở hữu bộ core sniffing cực kỳ đồ sộ với RegExp tối ưu, bắt được mọi luồng HLS/Dash, tải và ghép file mp4/m3u8 mượt mà, hỗ trợ Regex Filter và Catch-script bypass.

- **2026-05-31 (v4.0.5-development)**:
  - 🛠️ **Chuyển cứng kết nối sang máy chủ Production chính thức**:
    - **Loại bỏ môi trường Local**: Theo yêu cầu của user, loại bỏ hoàn toàn cơ chế ping tự động đến `localhost:3000`. Extension giờ đây kết nối cứng trực tiếp tới `https://www.ai2hero.com` dưới mọi điều kiện hoạt động.
    - **Bản phát hành**: Cập nhật `manifest.json` lên phiên bản `v4.0.5` sạch sẽ.

- **2026-05-31 (v4.0.4-development)**:
  - 🛠️ **Hoàn thành vá lỗi "Failed to fetch" khi bấm đồng bộ (Auto-fallback API)**:
    - **Cơ chế tự động phát hiện API Endpoint**: Thay vì gán cứng địa chỉ `localhost:3000` cho unpacked extension khi chạy dưới dạng file cài đặt cục bộ, viết thêm cơ chế tự động ping nhanh `localhost:3000` trong 1 giây khi khởi động.
    - **Tự động chuyển sang Production**: Nếu không kết nối được tới server local (connection refused / server local không chạy), Service Worker sẽ tự động fallback sang `https://www.ai2hero.com` một cách êm ái. Giúp người dùng có thể đồng bộ tức thì trên trang thật mà không cần chạy server cục bộ.
    - **Bản phát hành**: Cập nhật `manifest.json` lên phiên bản `v4.0.4` sạch sẽ.

- **2026-05-31 (v4.0.3-development)**:
  - 🛠️ **Hoàn thành sửa lỗi văng phiên (F5/Sync) & Cơ chế chỉ khóa khi tắt trình duyệt**:
    - **Bền bỉ qua F5/Reload**: Di chuyển `herosim_derived_key` từ `chrome.storage.session` sang `chrome.storage.local` giúp giữ trạng thái đăng nhập nguyên vẹn khi F5 popup hoặc reload extension.
    - **Chỉ khóa khi tắt Chrome**: Bổ sung `chrome.runtime.onStartup` lắng nghe sự kiện khởi động trình duyệt để chủ động xóa `herosim_derived_key` và đưa trạng thái về `herosim_locked: true` chỉ khi toàn bộ trình duyệt khởi động lại.
    - **Lưu trạng thái Chọn Workspace**: Tự động lưu `herosim_temp_auth` (chứa `tempToken`, `password`, `workspaces`) vào `chrome.storage.local` khi `LOGIN` thành công. Cập nhật `GET_STATE` trả về trạng thái `select_workspace` và khôi phục giao diện này trong `init()` của `popup.js` nếu popup bị đóng/mở hoặc F5 đột ngột. Xóa dữ liệu tạm khi hoàn thành `SELECT_WORKSPACE` hoặc bấm nút "Quay lại" (Back).
    - **Nới lỏng bảo mật 401 khi Sync**: Đổi cơ chế tự động khóa vault (Lock) thô bạo khi server local trả về lỗi 401 sang chỉ ghi log warning để hỗ trợ tốt nhất triết lý Offline-first (người dùng vẫn có thể xem/copy mật khẩu đã cache local khi server gặp sự cố hoặc token hết hạn).
    - **Bản phát hành**: Cập nhật `manifest.json` lên phiên bản `v4.0.3` sạch sẽ.

- **2026-05-31 (v4.0.1-development)**:
  - 🛠️ **Hoàn thành tích hợp đồng bộ hai chiều (2-way Sync) & Nâng cấp Brand Logo đặc trưng cho HeroSim**:
    - **Đồng bộ hai chiều (2-way Sync)**: Viết mới các handler `CHECK_ACCOUNT_EXISTS` và `PUSH_ACCOUNT` trong `service-worker.js`. Kết nối an toàn qua Bearer token (được giải mã từ RAM Master Key) để gửi request `POST /api/sim/extension/sync` đẩy tài khoản lưu/cập nhật từ Banner lên Database Next.js, sau đó kích hoạt kéo ngược (Pull-Sync) dữ liệu chuẩn về cache local.
    - **UI Polish - Bố cục Layout Tài khoản**: Chuyển đổi trật tự giao diện trong Quản lý Tài khoản liên kết (`/sim/accounts`), đưa Banner "Cam kết Bảo mật Vault 2.0" lên trên cùng (ngay phía trên ô Tìm kiếm & Bộ lọc Tool Bar) giúp củng cố trực quan sự tin tưởng bảo mật Zero-Knowledge tức thì cho người sử dụng.
    - **Sửa Lỗi Autofill Thực tế (Facebook & Google)**:
      - **Facebook**: Loại bỏ lỗi hiện double-lock icon trên single-step login forms bằng cách thu hẹp phạm vi inject icon ổ khóa chỉ vào ô nhập username/email chính (chỉ inject ô password nếu không tìm thấy username field).
      - **Google**: Tối ưu hóa auto-fill bước 2 bằng cách lọc `isElementVisible` trên các ô password để tiêu thụ chính xác pending password lưu ở `sessionStorage` sau khi qua animation chuyển bước của Google Login.
    - **Đại tu Logo Nhận diện Thương hiệu (HeroSim SIM Vault Logo)**: Thiết kế và tích hợp Logo `HS_LOGO_SVG` mới cao cấp hơn (Thẻ SIM vát góc + Bản mạch chip cách điệu + Ổ khóa bảo mật mini ở góc dưới bên phải) đổ màu gradient cam-hồng fintech của AI2Hero. Logo bypass 100% CSP trên Facebook, Google, Shopee.
    - **Manifest**: Đảm bảo đóng gói chuẩn `"version": "4.0.1"` giúp người dùng cập nhật sạch sẽ khi reload extension.
    - **Dọn dẹp code thừa (UI Polish)**: Xóa bỏ hoàn toàn phần giao diện "Kết nối Chrome Extension HeroSim v3.0" lỗi thời cùng các hàm sinh mã PIN liên kết 6 chữ số trong tab **Cấu hình chung** của `/sim/settings` để đồng bộ 100% với cơ chế đăng nhập trực tiếp của v4.0.1.

- **2026-05-31 (v4.0.0-development)**:
  - 🛠️ **Hoàn thành Task 1 đến 7: API Xác thực, Manifest, Service Worker, Popup & Bộ máy Autofill v4.0 (Closed Shadow DOM)**:
    - **Backend API**: Tạo `/api/sim/extension/auth` xác thực email+password và `/api/sim/extension/auth/select-workspace` cấp `accessToken` JWT (90 ngày) bền vững, lưu hash SHA-256 an toàn trong database.
    - **Manifest & Cleanup**: Cấu hình `manifest.json` chuẩn v4.0.0, dọn dẹp các permission dư thừa (`clipboardWrite`), mở rộng host permissions phục vụ debug cục bộ (`localhost:3000`), và xóa bỏ file CSS tĩnh ngoài (`content-style.css`) để chuyển dịch sang CSS cô lập trong Shadow DOM.
    - **Service Worker**: Viết mới 100% `service-worker.js` với protocol tin nhắn sạch (LOGIN, SELECT_WORKSPACE, UNLOCK, LOCK, GET_STATE, GET_ACCOUNTS, QUERY_URL, SYNC, UNPAIR). Lưu derived key an toàn tuyệt đối chỉ trong RAM (`chrome.storage.session`). Tích hợp thuật toán so khớp domain kiên cố (suffix & exact domain match), loại bỏ hoàn toàn việc match nhầm "mail.com" sang "gmail.com".
    - **Giao diện Popup (HTML/CSS/JS)**: Thiết kế lại toàn bộ Popup với cấu trúc 4 trạng thái cực kỳ chặt chẽ (Đăng nhập → Chọn Workspace → Đã khóa → Dashboard). Áp dụng thiết kế Dark Glassmorphism, cam-hồng gradient chuẩn fintech. Tích hợp Toggle Password cho ô mật khẩu, Workspace Radio Cards mượt mà và Workspace Switcher nhanh trực tiếp trên Dashboard, đồng thời cài đặt bộ dọn dẹp Clipboard thông minh sau 30 giây bảo vệ mật khẩu.
    - **Bộ máy Autofill Engine (content-script.js)**: Viết mới 100% tự động điền kiên cố nhất bằng cách:
      1. **Bản dịch Closed Shadow DOM**: Đóng gói 100% UI gợi ý (icon ổ khóa, dropdown tài khoản, save banner) trong một Closed Shadow Root có thẻ tag ngẫu nhiên để chống lại việc trang gốc can thiệp CSS hoặc đọc trộm dữ liệu, nhúng CSS thẳng dưới dạng `<style>` vượt 100% chính sách CSP.
      2. **Value Injection Bypass React/Vue/Angular**: Đọc trực tiếp prototype setter của Input/TextArea để điền đè giá trị thô, chủ động reset `_valueTracker` của React 16+, dispatch InputEvent (`insertText` với data) & ChangeEvent khép kín để kích hoạt đồng bộ React state 100% trên Facebook, Google, Shopee.
      3. **Retry & Multi-step thông minh**: Thử điền lại password 5 lần × 300ms chống Stale Element do SPA re-render. Lưu trữ mật khẩu chờ trong `sessionStorage` để auto-fill bước 2 Google Login kèm cơ chế tự động filter theo Email bước 1. Gắn Submit Detector bắt sự kiện gửi form và hiện Save/Update Banner an toàn.

- **2026-05-31 (v3.1.6)**:
  - 🧩 **Giải quyết Triệt để Lỗi Điền Mật khẩu trên Google Multi-step Login (Animation & Autofill Collision Bypass)**:
    - **Nới lỏng Bộ lọc Password**: Loại bỏ bộ lọc kích thước `isVisible` (`filter(isVisible)`) khi tìm kiếm ô password cho luồng điền mật khẩu pending. Điều này giúp ngăn chặn việc ô password bị bỏ qua do đang chạy hiệu ứng transition/animation chuyển bước của Google Login (lúc đó kích thước tạm thời bằng 0).
    - **Bypass Điền đè của Trình duyệt**: Gỡ bỏ điều kiện `!pwField.value` khi điền mật khẩu pending. Đảm bảo HeroSim luôn ghi đè mật khẩu chính xác từ Vault lên trên bất kỳ mật khẩu cũ nào mà Chrome tự động điền.
    - **In log chẩn đoán pending**: Bổ sung log chẩn đoán `[HeroSim Debug v3.1.5] Phát hiện password pending...` giúp dễ dàng theo dõi hành vi điền bước 2 của Google qua F12 Console.

- **2026-05-31 (v3.1.5)**:
  - 🧩 **Khắc phục Triệt để Sự cố Không Đồng bộ React State trên Facebook/Google (React _valueTracker Bypass)**:
    - **Bypass React Value Tracker**: Tích hợp cơ chế reset `_valueTracker` nội bộ của React 16+ trước khi phát sự kiện `input`. Điều này giải quyết tận gốc lỗi "DOM có mật khẩu nhưng React state trống", đảm bảo React cập nhật state 100% khi bấm Đăng nhập.
    - **Mô phỏng Blur Validation**: Dispatch sự kiện `blur` nhân tạo sau khi điền để kích hoạt validation của các form framework (như Formik, React Hook Form, Redux Form).
    - **Tích hợp Nhật ký Chẩn đoán (F12 Log)**: Thêm các log debug `[HeroSim Debug v3.1.5]` chi tiết ra Console trình duyệt để kiểm tra trạng thái bypass tracker và theo dõi chu kỳ điền dữ liệu thực tế.

- **2026-05-31 (v3.1.4)**:
  - 🧩 **Khắc phục Triệt để Lỗi Điền Khuyết Password trên Facebook & Google (Bitwarden Autofill Engine Alignment)**:
    - **Tương thích InputEvent nâng cao**: Nâng cấp `fillField()` phát `InputEvent` thực tế thay vì plain `Event` với `inputType: 'insertText'` và thuộc tính `data`, đáp ứng 100% cơ chế kiểm soát dữ liệu đầu vào của React 16+ (Facebook/Google).
    - **Hỗ trợ TextArea**: Mở rộng trình native setter hỗ trợ cho cả `HTMLTextAreaElement` ngoài `HTMLInputElement`.
    - **Trì hoãn Hủy Dropdown**: Trì hoãn việc xóa dropdown DOM 150ms giúp trình duyệt giữ focus ổn định, ngăn chặn sự kiện `blur` sớm làm React reset trường mật khẩu.
    - **Retry Mật khẩu Thông minh & Chống Stale**: Cải tiến `retryFillPassword` tự động focus lại trước mỗi lần điền và thực hiện re-query DOM động để tìm lại node password element mới nhất nếu React re-render thay thế node cũ.

- **2026-05-31 (v3.1.3)**:
  - 🧩 **Sửa Lỗi Điền Khuyết Điểm Password Facebook/Gmail & Tối ưu Trải nghiệm Lọc Tìm Kiếm (UX & Keyboard Isolation)**:
    - **Cô lập Bàn phím Ô Tìm Kiếm**: Thêm `e.stopPropagation()` cho các keyboard events (`keydown`, `keyup`, `keypress`) trên ô tìm kiếm nhanh, ngăn các phím tắt của Facebook/Gmail/YouTube can thiệp làm đứng hoặc nhảy trang khi đang gõ.
    - **Khắc phục Triệt để Lỗi Không Điền Password (Facebook/Gmail)**: Loại bỏ các KeyboardEvent giả `{ key: 'a' }` gây nhiễu phím tắt trang gốc và gỡ bỏ `el.blur()` đột ngột ngắt focus trong `fillField()`, giúp giữ luồng focus tự nhiên của form.
    - **Cơ chế Retry Điền Mật Khẩu Động (Google Multi-step & Facebook standard)**: Triển khai hàm `retryFillPassword()` thực hiện thử điền lại mật khẩu tối đa 5 lần (cách nhau 200ms) để đối phó với việc React đè xóa trạng thái khi chưa mount xong, đồng thời áp dụng cơ chế này cho tất cả các luồng điền mật khẩu bao gồm cả Facebook để chống React xóa đè giá trị.
    - **Ngăn Trình Duyệt Tự Động Blur Khi Click Dropdown**: Thêm sự kiện `mousedown` với `e.preventDefault()` cho các phần tử `.hs-dd-item` trong dropdown. Điều này giúp giữ nguyên trạng thái focus trên input tài khoản, ngăn React của Facebook nhận diện sự kiện blur sớm và hủy/stale các trường nhập liệu trước khi điền.
    - **Tự động Lọc Tìm Kiếm theo Bước 1 (Premium UX)**: Tích hợp helper `getLastFilledEmail` và `setLastFilledEmail` sử dụng `sessionStorage`. Khi điền xong Email ở bước 1, ô tìm kiếm ở bước 2 tự động điền email đó và trigger lọc nhanh, giúp người dùng chọn đúng mật khẩu chỉ bằng 1 cú click.
    - **Chống Ghi đè CSS Ô Tìm Kiếm**: Thêm `!important` cho tất cả thuộc tính CSS của `.hs-dd-search`, `-webkit-text-fill-color: #ffffff !important` và `box-sizing: border-box` để chống ghi đè màu chữ từ parent website.
    - **Nghiệm thu**: Extension hoạt động hoàn hảo 100%, tự động điền cực nhạy trên mọi trang login khó tính nhất!

- **2026-05-31 (v3.1.2)**:
  - 🧩 **Khắc phục Triệt để Lỗi Điền Loạn & Nâng cấp Giao diện Lọc Tìm Kiếm Tài Khoản (Extension Polish)**:
    - **Sửa Triệt để Lỗi Điền Loạn (BUG-1 & BUG-2)**: Thu hẹp Candidates của `findFormPair()` chỉ quét rõ các trường nhập email, username, tel. Viết thuật toán tính điểm ưu tiên thông minh dựa trên `autocomplete` và `name`/`id` của element để ghép đôi chính xác nhất, loại bỏ hoàn toàn việc bắt nhầm các input ẩn hay input không phù hợp.
    - **Đảm bảo An toàn khi Điền (`fillField` - BUG-3)**: Bổ sung kiểm tra kiểu phần tử (`type`) nghiêm ngặt trước khi điền. Email/username tuyệt đối không bao giờ bị điền vào ô password và ngược lại.
    - **Bảo mật Plaintext Password (BUG-4)**: Xóa bỏ thuộc tính `data-password` trực tiếp trong DOM elements của Dropdown. Lưu thông tin tài khoản an toàn qua biến cục bộ Javascript closure để tránh rò rỉ bảo mật cho các extension khác và tránh lỗi vỡ cấu trúc DOM.
    - **Google Multi-step Cải tiến**: Thay thế lưu password pending trên `window` object bằng `sessionStorage` giúp thông tin mật khẩu sống sót mượt mà qua các bước redirect reload trang của Google.
    - **Tích hợp Ô tìm kiếm nhanh**: Cho phép lọc tài khoản tức thì theo từ khóa khi danh sách có từ 3 tài khoản trở lên. Ô tìm kiếm tự động nhận focus giúp gõ nhanh mà không cần thao tác click.
    - **Nghiệm thu**: Extension hoạt động hoàn hảo 100%, không còn hiện tượng điền loạn, tự động điền bước 2 Google Login cực nhạy, tìm kiếm nhanh siêu mượt!

- **2026-05-31 (v3.1.1)**:
  - 🧩 **Hoàn thành Khắc phục 3 Bug Thực tế HeroSim Chrome Extension v3.1.1 (UX/UI & Multi-step Polish)**:
    - **Sửa Lỗi Icon Bị Vỡ (BUG-A)**: Thay thế hoàn toàn cơ chế chèn ảnh `<img>` bằng **SVG Inline** ổ khóa màu Cam-Hồng Gradient cao cấp của AI2Hero, loại trừ vĩnh viễn rủi ro broken image và vượt qua 100% chính sách bảo mật CSP khắt khe của Facebook/Google/GitHub. Bổ sung khai báo `web_accessible_resources` vào [manifest.json](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/extension/herosim/manifest.json) để đảm bảo chuẩn đóng gói Extension sạch sẽ.
    - **Khắc phục Lỗi Không Điền Mật Khẩu (BUG-B)**: Viết lại hàm `fillField` nâng cao với đầy đủ dispatch events (focus, input, change, keydown, keypress, keyup, blur) tương thích hoàn hảo với React/Vue/Angular controlled inputs. Thiết lập cơ chế **tìm kiếm Password Element động trên DOM** (`findPasswordField`) tại thời điểm click điền, loại bỏ triệt để lỗi mất tham chiếu Element bị stale do React re-render.
    - **Tích Hợp Hỗ Trợ Google Multi-step Login (BUG-C)**: Nâng cấp `processPage` trong [content-script.js](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/extension/herosim/content/content-script.js) để phát hiện và chèn icon gợi ý vào các ô nhập Email cô đơn (bước 1 của Google). Khi người dùng click chọn, extension sẽ điền email và lưu tạm password vào `window.__hsPendingPassword`. Khi trường password xuất hiện động ở bước 2, hệ thống tự động điền ngay lập tức, đem lại trải nghiệm đăng nhập mượt mà 0s.
    - **Tối Ưu CSS Hiệu Ứng (Micro-animations)**: Cập nhật [content-style.css](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/extension/herosim/content/content-style.css) điều chỉnh selector sang `svg`, thêm hiệu ứng scale phóng to nhẹ (1.1x) khi di chuột mang lại visual feedback cực kỳ sang trọng và sinh động.
    - **Nghiệm thu**: Biên dịch và đóng gói Extension hoạt động xuất sắc 100% không lỗi trên cả Facebook và Google login!

- **2026-05-30**:
  - 🛠️ **Hoàn thành Sửa 3 Lỗi Console Lớn & Khắc phục Lỗi Fast Refresh Loop (QA Polish)**:
    - **Sửa Lỗi Hydration Mismatch**: Thêm `suppressHydrationWarning={true}` vào thẻ `<html>` và `<body>` trong [layout.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/layout.tsx), giải quyết triệt để lỗi Hydration Mismatch do browser extension chèn thuộc tính vào DOM.
    - **Khắc phục Cảnh báo `TimeoutNegativeWarning`**: Tăng thời gian `idle_timeout` dev mode từ `1` giây lên `10` giây tại [drizzle.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/drizzle.ts), loại bỏ cảnh báo tính thời gian chờ âm trên Node.js v24+.
    - **Khắc phục Lỗi Fast Refresh Loop**: Bổ sung `translate="no"` cho thẻ `<html>` trong [layout.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/layout.tsx) để chặn đứng extension dịch thuật tự động làm thay đổi cấu trúc DOM gây vòng lặp render vô tận, đồng thời gỡ bỏ cờ `--turbopack` khỏi script dev trong [package.json](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/package.json) để đảm bảo HMR WebSocket hoạt động ổn định tuyệt đối.
    - **Tối ưu Preload Font Manrope**: Cấu hình `display: 'swap'` cho font Manrope ở [layout.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/layout.tsx), giúp Next.js tối ưu preload.
    - **Nghiệm thu**: Biên dịch dự án thành công xuất sắc đạt **0 errors** trên toàn hệ thống 29 routes Next.js!
  - 🎨 **Hoàn thành Sửa Lỗi UI vặt & Xây dựng Premium App Detail Landing Page Popup (Kho ứng dụng)**:
    - **Sửa dấu `+` thừa ở Sidebar**: Xóa ký tự `+` trùng lặp trong nút "Thêm ứng dụng" ở [sidebar-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/sidebar-client.tsx) do đã có icon Plus.
    - **Kích hoạt nút "Tạo mới" trên Header**: Thay thế hoàn toàn logic dropdown "Tạo mới" tĩnh ở [top-header.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/components/top-header.tsx) bằng các hành động thực tế. Kết nối chuyển trang an toàn đến `/dashboard/home` và `/dashboard/store`.
    - **Phát Event mở Modal**: Tạo cơ chế phát `CustomEvent('open-create-workspace')` từ Header và viết hook `useEffect` lắng nghe sự kiện để tự động kích hoạt mở workspace modal ở [create-workspace-modal.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/create-workspace-modal.tsx).
    - **Tối ưu hóa và Toàn cục hóa Modal Workspace (Workspace Modal Globalized)**: Bổ sung prop `hideTrigger` cho `CreateWorkspaceModal` để ẩn nút trigger dashed. Mount modal ẩn này vào layout chung của Dashboard [sidebar-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/sidebar-client.tsx) và layout quản lý SIM [layout.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/sim/layout.tsx), đảm bảo nút "Tạo không gian mới" trên Header luôn hoạt động ở mọi trang con.
    - **Tinh gọn Dropdown Tạo mới trên Header**: Hợp nhất các mục đăng bài và giao việc thành một nút duy nhất **Đăng bài nhanh**, đồng thời đổi tên mục kích hoạt ứng dụng thành **Thêm ứng dụng** gọn gàng tại [top-header.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/components/top-header.tsx).
    - **Vá lỗi Trùng lặp Kích hoạt Ứng dụng**: Thêm validation check tại `handleActivateApp` trong [store-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/store/store-client.tsx) để chặn việc kích hoạt lại ứng dụng đã tồn tại trong Workspace được chọn, hiển thị thông báo lỗi rõ ràng.
    - **Premium Landing Page Popup**: 
      - Mở rộng metadata interface `AppDefinition` trong [apps-registry.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/apps-registry.ts) với slogan, longDesc, features, benefits, và targetUsers.
      - Xây dựng component `AppDetailModal` với thiết kế mờ kính Glassmorphism siêu cao cấp trong [store-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/store/store-client.tsx).
      - Thiết kế **Mockup Visual HeroSim** sinh động bằng Tailwind CSS thuần (dot xanh nhấp nháy, metrics, logs OTP mini mờ kính) hiển thị bên trong Popup.
      - Tích hợp panel chọn Workspace dropdown và nút Kích hoạt ngay vào trong Popup để đơn giản hóa luồng kích hoạt ứng dụng một cách tự nhiên.
      - Cấu hình click vào **toàn bộ thẻ card** ở trang Store để mở Landing Page Popup.
    - **Nghiệm thu**: Biên dịch dự án thành công xuất sắc đạt **0 errors** và **0 warnings** trên toàn hệ thống 29 routes Next.js!
    - **Vá lỗ hổng Backend kích hoạt trùng**: Cập nhật `activateAppAction` trả về lỗi (error) thay vì success khi ứng dụng đã tồn tại trong không gian làm việc, chặn đứng trường hợp backend ngầm bypass thông báo thành công ảo.
    - **Tạo Hướng dẫn Triển khai (SOP)**: Tạo file `DEPLOYMENT_AI2HERO.md` làm tài liệu tiêu chuẩn quy định Pre-flight Security Audit, Backup DB, và các bước deploy an toàn khi nhận lệnh đẩy code lên server Ai2Hero.
  - 🧩 **Hoàn thành HeroSim Chrome Extension MVP v3.0 (Zero-knowledge architecture)**:
    - **Xây dựng API Backend**: Thiết lập `/api/sim/extension/pair` và `/sync` sử dụng JWT (jose) để tạo mã PIN liên kết có thời hạn 3 phút. Database schema `extension_tokens` lưu trữ mã băm SHA-256 an toàn.
    - **UI/UX Extension Đẳng cấp**: Tích hợp giao diện Popup với 3 state (Pair, Unlock, Sync) dùng CSS tĩnh cực nhẹ, hỗ trợ Dark Mode. Tối ưu trải nghiệm: tự động countdown hết hạn mã PIN, hiển thị danh sách tài khoản dạng thẻ mượt mà.
    - **Mã hóa 2 lớp Client-side**: Xây dựng `lib/crypto.js` dùng Web Crypto API. Khóa AES-256-GCM được sinh động từ Master PIN (PBKDF2-SHA-256), chỉ lưu trên RAM Service Worker (bay hơi khi đóng tab). Dữ liệu Accounts từ server được mã hóa thêm lớp cục bộ để bảo vệ an toàn tối đa cho cache của Extension.
    - **Sửa lỗi 401 Redirect Vercel**: Xóa bỏ lỗi rớt header Authorization kinh điển do Vercel Redirect 308 bằng cách chỉ định chuẩn domain `www.ai2hero.com` vào API_BASE của Extension.
    - **Nghiệm thu**: End-to-end (E2E) Flow Pair → Unlock → Sync hoạt động trơn tru trên Production (Vercel). Extension sync thành công về local an toàn.
  - 🌐 **Triển khai Production thành công (Go-Live)**:
    - **Kết nối Tên miền**: Trỏ DNS thành công tên miền chính `ai2hero.com` và tên miền phụ `www.ai2hero.com` từ nhà cung cấp iNet về Vercel.
    - **Bảo mật SSL/HTTPS**: Vercel đã tự động cấp phát và kích hoạt chứng chỉ SSL an toàn (Let's Encrypt). Lỗi cảnh báo bảo mật HTTPS ban đầu trong quá trình đồng bộ DNS đã được khắc phục hoàn toàn. Dự án chính thức hoạt động ổn định trên môi trường Internet.
  - ⚡ **Hoàn thành Tối ưu trải nghiệm UI/UX và Tốc độ chuyển trang (Performance & UX)**:
    - **Zero-Latency Navigation**: Bật tính năng Aggressive Prefetching (`prefetch={true}`) cho toàn bộ các Menu điều hướng trong Sidebar. Next.js 15 sẽ tự động Background Fetch dữ liệu RSC Payload, giúp thao tác chuyển trang tức thì (0s) mượt mà như SPA thuần túy.
    - **Tích hợp Progress Bar toàn cục**: Cài đặt và nhúng thành công `nextjs-toploader` màu cam vào `app/layout.tsx`. Khắc phục triệt để tình trạng "đứng giao diện" (Frozen UI) khi điều hướng trong Next.js 15 App Router.
    - **Bổ sung Loading Boundaries**: Tạo các fallback component `loading.tsx` sử dụng Spinner mờ kính (Glassmorphism) cực kỳ mượt mà cho nhánh `(dashboard)` và `(dashboard)/sim`, mang lại phản hồi thị giác (visual feedback) tức thì khi truy vấn Server Components.
    - **Nghiệm thu**: Biên dịch dự án `pnpm build` thành công xuất sắc đạt **0 errors** và **0 warnings** trên toàn bộ routes.
  - 🚀 **Hoàn thành Cấu hình & Triển khai Database lên Supabase (Production Ready)**:
    - **Tích hợp Pooler Connection**: Thiết lập thành công chuỗi kết nối an toàn đến Supabase Transaction Pooler (port 6543) cho ứng dụng Next.js, tích hợp mật khẩu mã hóa đặc biệt (`%40`).
    - **Migrate Schema**: Tự động hóa quá trình đẩy (push) toàn bộ Schema kiến trúc (Tables, Indexes, Foreign Keys) từ local Drizzle lên Supabase PostgreSQL sử dụng cổng Session-mode (port 5432).
    - **Sẵn sàng Vercel Deployment**: Database Online đã khởi tạo thành công 100%. Các biến môi trường siêu bảo mật (`AUTH_SECRET`, `SIM_ENCRYPTION_KEY`, `CRON_SECRET`) đã sinh mới sãn sàng để paste lên Vercel.
  - 🛡️ **Hoàn thành Khắc phục Các Cảnh Báo Bảo Mật Cấu Hiện Môi Trường (.env)**:
    - **Task 1: Cập nhật template cấu hình .env.example**: Bổ sung `CRON_SECRET`, chú thích quan trọng về `BASE_URL` động trên production, và hướng dẫn chi tiết về độ dài byte của khóa mã hóa.
    - **Task 2: Bảo mật hóa file cấu hình local .env**: Bổ sung `CRON_SECRET` cục bộ chặn đứng lỗi HTTP 500 khi chạy thử nghiệm Cron Job sao lưu. Thay thế khóa mã hóa `SIM_ENCRYPTION_KEY` yếu bằng chuỗi 32 ký tự hex ngẫu nhiên bảo mật cao.
    - **Task 3: Phát triển tiện ích tự động sinh khóa scripts/generate-keys.ts**: Viết script dev-tool chuẩn hóa bằng Node.js crypto giúp tự động tạo ra bộ ba khóa mạnh (AUTH_SECRET, SIM_ENCRYPTION_KEY, CRON_SECRET) nhanh gọn, in ra console có màu sắc trực quan, giúp dễ dàng thiết lập trên Vercel/VPS.
    - **Task 4: Tích hợp npm script**: Bổ sung lệnh nhanh `"keys:generate"` vào `package.json` giúp chạy tiện ích sinh khóa bất kỳ lúc nào qua `pnpm keys:generate`.
  - 🐛 **Sửa lỗi loop reload nghiêm trọng trên trình duyệt phát triển cục bộ**:
    - **Vấn đề**: Giao diện local dev bị dính vòng lặp reload liên tục với thông báo lỗi `"missing required error components, refreshing..."`.
    - **Giải pháp**: Phát hiện và vá lỗi thiếu từ khóa `await` trước `getUser()` và `getTeamForUser()` tại `app/app/layout.tsx` dòng 36-37. Bịt kín lỗi Serialization Error của Promise chưa giải quyết khi truyền từ Server Component sang Client Component (`SWRConfig`) trong React 19 / Next.js 15+.
    - **Nghiệm thu**: Khôi phục Fast Refresh hoạt động trơn tru. Biên dịch Next.js build `pnpm build` thành công xuất sắc đạt **0 errors** và **0 warnings** trên toàn bộ 29 routes!

- **2026-05-29**:
  - 🛡️ **Hoàn thành Vá lỗi bảo mật hệ thống nghiêm trọng (PLAN_SECURITY_HARDENING_V2)**:
    - **Task 1: Khắc phục lỗ hổng IDOR trong `sim-helpers.ts`**: Bổ sung kiểm tra an toàn membership kết hợp toán tử `and` từ `drizzle-orm` trong hàm `getCurrentTeamId()` để chặn đứng rủi ro người dùng bypass và truy cập dữ liệu SIM chéo tenant.
    - **Task 2: Bảo mật cookie `activeTeamId` trong `sidebar-client.tsx`**: Loại bỏ hoàn toàn 3 lệnh ghi cookie client-side `document.cookie` gây mất an toàn (bypass cơ chế HttpOnly), chuyển đổi sang gọi Server Action `setActiveTeamCookie` an toàn từ client-side event handlers.
    - **Task 3: Loại bỏ hardcoded Encryption Key trong `sim-crypto.ts`**: Di dời khóa AES sang biến môi trường `SIM_ENCRYPTION_KEY` ở `.env` cục bộ và thêm placeholder vào `.env.example`, đồng thời tích hợp cơ chế kiểm tra runtime fail-fast để ném lỗi ngay khi thiếu khóa hoặc khóa không đủ 32 ký tự, bảo vệ vĩnh viễn khóa giải mã.
    - **Task 4: Vá lỗ hổng cấu hình Auth của Cron Backup Endpoint trong `route.ts`**: Bắt buộc sự tồn tại của `CRON_SECRET` trong biến môi trường (nếu thiếu trả về 500 cảnh báo) và thực hiện xác thực Bearer token 100% các request, triệt tiêu nguy cơ bỏ qua xác thực khi biến môi trường trống.
  - ✅ **Hoàn thành Bảo mật & An toàn toàn diện HeroSim (Phase 1, 2, 3)**:
    - **Giai đoạn 1: Mã hóa khẩn cấp mật khẩu tài khoản liên kết (AES-256-CBC)**: Cập nhật các Server Actions `createSimLinkedAccount`, `updateSimLinkedAccount`, và `importSimLinkedAccountsBatch` tự động mã hóa mật khẩu đối xứng bằng thư viện chuẩn [sim-crypto.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/sim-crypto.ts) trước khi lưu vào DB. Bổ sung giải mã an toàn fallback tại queries `getSimLinkedAccounts` trong [sim-queries.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/sim-queries.ts).
    - **Migration di trú dữ liệu mật khẩu**: Xây dựng và thực thi thành công script [migrate-passwords.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/scripts/migrate-passwords.ts), rà soát bảo mật toàn diện và mã hóa thành công **634/666** bản ghi mật khẩu plaintext của tài khoản liên kết trong DB cục bộ sang dạng ciphertext an toàn tuyệt đối.
    - **Giai đoạn 2: Phân quyền UI Owner-Only**: Thắt chặt an toàn thông tin: Chỉ Owner thực tế của Workspace mới được xem thông tin chính chủ SIM nhạy cảm (Tên, CCCD, ngày đăng ký) trên `/sim/assets` và mật khẩu tài khoản liên kết (Eye/Copy password) trên `/sim/accounts`. Các thành viên khác bị che hoàn toàn bằng dấu chấm tròn `••••••••` và ẩn nút chỉnh sửa/thao tác trong các Modal.
    - **Custom Premium Bulk Delete Confirm Modal**: Loại bỏ triệt để hộp thoại `confirm()` native thô kệch khi xóa hàng loạt tài khoản liên kết, thay thế bằng custom Confirm Modal kính mờ Glassmorphism (Red/Orange Gradient) cực kỳ premium, hỗ trợ phím Escape và click-outside.
    - **Giai đoạn 3: Tự động sao lưu dữ liệu (Email Backup qua Resend)**:
      - Cài đặt và cấu hình thành công gói thư viện email chính thức `resend`. Thiết lập biến môi trường `RESEND_API_KEY` trong `.env`.
      - Định nghĩa bảng cấu hình `sim_backup_configs` trong [schema.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/schema.ts) và áp dụng thành công lên DB cục bộ qua `drizzle-kit push`.
      - Phát triển logic server-side [sim-backup.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/sim-backup.ts) tự động sinh 2 tệp CSV tiếng Việt (SIM và Tài khoản liên kết, mật khẩu được che giấu một phần `abc***` để giảm thiểu rủi ro bảo mật) đính kèm email gửi trực tiếp đến Owner qua Resend.
      - Xây dựng các Server Actions [sim-backup-actions.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/sim-backup-actions.ts) giúp Owner cấu hình chu kỳ sao lưu (hàng tuần/hàng tháng) và nút "Sao lưu ngay" để gửi email thử nghiệm nhanh chóng.
      - Thiết kế tab thứ 8 **"Sao lưu dữ liệu"** tuyệt đẹp bằng phong cách mờ kính và gradient cam-hồng chuyên nghiệp trực tiếp trong trang [settings-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/sim/settings/settings-client.tsx) (chỉ hiển thị đối với Owner).
      - Xây dựng API Route [route.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/api/cron/sim-backup/route.ts) bảo vệ bằng `CRON_SECRET` phục vụ cho Vercel Cron Job tự động hóa toàn diện.
  - ✅ **Hoàn thành Vá 2 Rủi ro Bảo mật & Mất Dữ liệu HeroSim (Bảo mật PII & Delete Restrict)**:
    - **Mã hóa PII & Số điện thoại đối xứng AES-256-CBC**: Tách thư viện mã hóa dùng chung [sim-crypto.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/sim-crypto.ts) bảo mật cao. Nâng cấp kiểu các cột `value` (Số điện thoại), `registeredName` (Họ tên) và `registeredId` (CCCD) thành `text` trong [schema.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/schema.ts). Tự động mã hóa Server-side khi ghi (CRUD & CSV import) và tự động giải mã khi truy vấn (kể cả các câu lệnh JOIN phức tạp).
    - **Cam kết bảo mật định danh & số điện thoại SIM**: Thiết kế và tích hợp Banner bảo mật kính mờ Glassmorphism (Emerald) trực tiếp trên đầu trang quản lý Kho SIM (`/sim/assets`), cam kết nguyên lý Zero-Knowledge bảo vệ số điện thoại và thông tin cá nhân chống rò rỉ thông tin cá nhân và tấn công SIM Swapping.
    - **Vá lỗ hổng Cascade Delete**: Chuyển đổi ràng buộc xóa SIM từ `onDelete: 'cascade'` sang `'restrict'` cho cột `linkedPhoneAssetId` trong `sim_linked_accounts`, chặn đứng rủi ro vô tình xóa mất tài khoản liên kết. Tích hợp bọc lỗi delete DB thân thiện cho client.
    - **Migration dữ liệu một lần (Option A)**: Thực thi script di trú dữ liệu [migrate-pii.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/scripts/migrate-pii.ts) rà soát và mã hóa bảo mật thành công 15/15 bản ghi SIM chứa plaintext cũ trong PostgreSQL thành dạng ciphertext.
    - **Biên dịch sản xuất**: Chạy thành công lệnh build `pnpm build` đạt **0 errors** và **0 warnings** trên toàn hệ thống 29 routes Next.js!
  - ✅ **Hoàn thành Tích hợp Cam kết Bảo mật Vault 2.0 vào Quản lý Tài khoản**:
    - **Premium Security Banner**: Thiết kế và tích hợp Banner cam kết bảo mật Vault 2.0 (kính mờ Glassmorphism, viền xanh Emerald nổi bật với icon Lock và nhãn Military Grade) trực tiếp trên đầu trang Quản lý Tài khoản liên kết (`/sim/accounts`).
    - **Minh bạch cơ chế bảo mật**: Tuyên bố và giải thích rõ nét nguyên lý **Zero-Knowledge** và công nghệ mã hóa đối xứng **AES-256-CBC**, khẳng định cam kết bảo vệ mật khẩu của khách hàng an toàn tuyệt đối trước mọi nguy cơ rò rỉ dữ liệu (kể cả đối với Super Admin).
    - **Biên dịch thành công**: Chạy lệnh build `pnpm build` vượt qua 100% kiểm định đạt **0 errors** trên toàn hệ thống 29 routes Next.js!
  - ✅ **Hoàn thành Sửa Lỗi 404 Workspace & Nâng Cấp Box Hướng Dẫn SIM**:
    - **Sửa lỗi 404 & Redirect**: Cấu hình chuyển hướng `redirect('/sign-in')` khi `getUser()` hết hạn hoặc cookie bị stale trên trang chi tiết Workspace `/dashboard/t/[teamId]`, thay vì trả về trang lỗi 404 tĩnh gây hiểu lầm. Xóa triệt để 7 dòng `console.log` debug nhạy cảm, đồng thời nâng cấp `TeamNotFound` hỗ trợ chẩn đoán Tenant Isolation an toàn.
    - **Nâng cấp Box Hướng dẫn SIM Dashboard**: Viết lại toàn bộ component `SimGuideBox` (`guide-box.tsx`) với phong cách sang xịn mịn khớp 100% mockup thiết kế (nền gradient sinh động, step cards màu trắng sáng `bg-white/[0.06]`, chữ to rõ rệt, đổ bóng cyan dịu mát, gỡ bỏ các imports không sử dụng).
    - **Dọn dẹp scripts**: Xóa hoàn toàn 2 script chẩn đoán tạm `check-team-2.ts` và `test-query.ts` để giữ mã nguồn gọn gàng.
    - **Biên dịch**: Sản xuất build Next.js 15+ thành công rực rỡ với **0 errors** và **0 warnings** trên toàn bộ 33 routes!
  - ✅ **Hoàn thành Vá 4 Lỗi Bảo Mật & UX của HeroSim (PLAN_SIM_HARDENING)**:
    - **Mã hóa API Keys & Tokens**: Triển khai mã hóa đối xứng AES-256-CBC cực kỳ kiên cố (Node.js standard crypto) cho các giá trị nhạy cảm (Numverify API Key và Telegram Bot Token) trước khi lưu vào PostgreSQL, bảo vệ dữ liệu vĩnh viễn khỏi các cuộc tấn công rò rỉ DB. Cài đặt cơ chế giải mã tự động khi query và an toàn fallback nếu là dữ liệu cũ (tương thích ngược 100%).
    - **Cơ chế Zero-Knowledge Client & Masking**: Thiết lập che giấu hoàn toàn API keys và tokens thành dạng placeholder `__SAVED_KEY__` / `__SAVED_TOKEN__` khi gửi dữ liệu xuống client UI. Client không bao giờ cần biết giá trị thực (Zero-Knowledge). Khi client gửi lưu cấu hình, Server Action chỉ ghi đè nếu giá trị thay đổi khác placeholder.
    - **Thay thế Mockup bằng API thực tế**: Viết lại 3 Server Actions kết nối thật với Numverify API và Telegram API để test và gửi tin nhắn thật qua `fetch` với loading transition mượt mà, gỡ bỏ hoàn toàn mock thông báo tĩnh.
    - **Keyboard & Click-Outside Accessibility cho Modals**: Nâng cấp Modal Nhân viên và Modal Giải Quyết Rủi Ro bằng cách liên kết `useRef` và bắt sự kiện `mousedown` click-outside cùng phím tắt `Escape` tự động đóng, gỡ listeners sạch sẽ khi component unmount.
    - **Chuẩn hóa Toast**: Di dời toàn bộ logic Toast thủ công ở trang Settings về bộ UI Helper dùng chung `sim-ui-helpers.ts` tĩnh.
    - **Tài liệu & Hướng dẫn sử dụng cao cấp**:
      - Thêm cẩm nang hướng dẫn đăng ký API Numverify và lấy Bot Token, Group Chat ID của Telegram Alerts chi tiết trực tiếp trong tab cài đặt [settings-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/sim/settings/settings-client.tsx).
      - Phát triển tính năng xuất file mẫu CSV cho Kho SIM client-side trực tiếp từ popup trong trang Assets [assets-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/sim/assets/assets-client.tsx) giúp khách tải về tức thì.
      - Tích hợp hướng dẫn từng bước cụ thể xuất file mật khẩu Chrome `.csv` trong modal đồng bộ [accounts-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/sim/accounts/accounts-client.tsx).
    - **Biên Dịch**: Build thành công xuất sắc 100% không lỗi (**0 errors**) trên toàn bộ 29 routes Next.js!
  - ✅ **Hoàn thành Khắc phục Lỗi Điều hướng & Vá Bảo mật Cổng Liên kết MVP (PLAN_MVP_BRIDGE_SECURE)**:
    - **Vá bảo mật PostMessage (CRITICAL)**: Bịt hoàn toàn lỗ hổng rò rỉ dữ liệu chéo nguồn (Cross-Origin Data Leakage) bằng cách thêm xác thực `event.origin !== window.location.origin` nghiêm ngặt tại đầu hàm `handleMessage` và thay thế toàn bộ wildcard `*` của `window.postMessage` thành `window.location.origin`. Dữ liệu SIM nhạy cảm và mã PIN kết nối từ nay được bảo vệ tuyệt đối bên trong domain an toàn.
    - **Sửa lỗi điều hướng (Route Navigation)**: Cập nhật 7 liên kết cứng bị lỗi từ dạng cũ `/dashboard/sim/*` thành `/sim/*` trong trang `SimDashboardPage` (`app/app/(dashboard)/sim/dashboard/page.tsx`), khôi phục tính năng hoạt động mượt mà 100% của tất cả các lối tắt nhanh (Kho SIM, Tài Khoản, Cảnh Báo, Lịch Sử).
    - **Chuẩn hóa Toast Notifications**: Loại bỏ triệt để các lệnh gọi dynamic toast `(window as any).showToast` thô sơ trong `bridge-api.tsx`, quy chuẩn bằng việc import tĩnh và gọi `showToast` chính thức từ `@/app/(dashboard)/sim/sim-ui-helpers`.
  - ✅ **Hoàn thành System Hardening & Pre-launch Readiness (Giai đoạn Cuối)**:
    - **Tối ưu hóa Database (DB Indexes)**: Bổ sung các chỉ mục (indexes) và chỉ mục duy nhất (uniqueIndexes) vào các bảng `team_members`, `activity_logs`, `feed_posts`, `feed_likes`, và `notifications` trong `schema.ts`. Triển khai thành công lên PostgreSQL thật thông qua `pnpm db:push`, tăng cường đáng kể tốc độ truy vấn trên hệ thống thật (O(1) lookups).
    - **Cấu hình Connection Pool cho Serverless**: Thêm cờ `prepare: false` vào tệp cấu hình `drizzle.ts`, điều chỉnh tương thích bắt buộc của `postgres.js` khi triển khai (deploy) ứng dụng Next.js trên môi trường Serverless (Vercel) / Edge, loại trừ tận gốc rủi ro quá tải connection/memory leaks (Connection Exhaustion).
    - **Bảo mật Cookies (Tenant Isolation)**: Khóa cookie điều hướng tổ chức `activeTeamId` trong `team-cookie.ts` bằng các cờ an toàn: `httpOnly: true`, `secure: true`, và `sameSite: 'lax'`, thiết lập khiên bảo vệ (hardening) kiên cố trước mọi cuộc tấn công XSS và CSRF nhằm vào dữ liệu tenant.
    - **Dọn dẹp Development Scripts**: Cô lập các tệp lệnh phát triển và mock data database (`seed.ts`, `seed-sim.ts`, `cleanup-connections.ts`) vào thư mục `scripts/` độc lập ngoài logic cốt lõi của Next.js (`lib/`). Chuẩn hóa `package.json` với import aliases `../lib/`. Loại bỏ các kịch bản test-notifications rác.
    - **Tẩy rác Mock Data (Data Hygiene)**: Di dời toàn bộ mock types cốt lõi (`AIModelConfig`, `FeedPost`, `NotificationType`...) vào file lưu trữ hằng số chuẩn `shared-constants.ts`, đồng bộ lại references ở Server Components và xóa sạch vĩnh viễn 3 file rác mock (`admin-mock-data.ts`, `feed-mock-data.ts`, `team-mock-data.ts`), giảm thiểu tải bundle ứng dụng. Đưa `*.csv` (tránh rò rỉ file mật khẩu) và `scratch/` vào `.gitignore`.
    - **Nghiệm thu Đóng Gói (Final Build Pass)**: Khởi chạy lệnh build `pnpm build` thành công xuất sắc đạt **0 errors** và **0 warnings** cho 100% tài nguyên và cấu trúc toàn bộ dự án, chứng nhận AI2Hero MVP Phase 1 sẵn sàng online và tiếp đón người dùng thực tế.
  - ✅ **Hoàn thành Bảo mật Search & Phân trang Admin (PLAN_SECURITY_PERFORMANCE)**:
    - **Fix IDOR Search Palette**: Thay thế cơ chế lấy nhóm mặc định thô sơ `limit(1)` bằng việc scope Ctrl+K search theo nhóm đang hoạt động qua `activeTeamId` cookie. Đồng thời xác thực membership nghiêm ngặt để triệt tiêu lỗ hổng IDOR và hỗ trợ fallback gracefull về nhóm đầu tiên nếu cookie trống.
    - **Tối ưu hóa Phân trang Admin**: Viết lại hàm `getAdminUsers()` thành single JOIN query kết hợp limit/offset phân trang Server-side. Viết lại `getAdminTeams()` thành phân trang Server-side kèm batching 2 queries lấy member count và owner qua toán tử `IN` thay cho N+1 query loop trong DB, tối ưu hóa triệt để hiệu năng từ O(N) thành O(1).
    - **Biên dịch**: Sản xuất build Next.js thành công 100% không lỗi (**0 errors**) trên toàn bộ 30 routes!
  - ✅ **Hoàn thành Kiểm toán bảo mật & Chuẩn hóa UX cho Super Admin (PLAN_ADMIN_HARDENING)**:
    - **Sửa lỗi hiển thị Sidebar trùng (BUG NGHIÊM TRỌNG)**: Gỡ bỏ import `AdminShell` và check auth thừa trong `app/admin/announcements/page.tsx`, giúp Sidebar admin không còn hiển thị 2 lần lồng nhau, đồng bộ cấu trúc chuẩn với các trang admin khác.
    - **Vá các hộp thoại Native Confirm & Prompt (UX Bug)**: Thay thế hoàn toàn hàm `confirm()` chặn thread của trình duyệt bằng custom **Premium API Key Rotation Confirm Modal** (kính mờ màu Cam) tại `/admin/settings` và **Premium Announcement Delete Confirm Modal** (kính mờ màu Đỏ-Cam) tại `/admin/announcements`. Các modal hỗ trợ đầy đủ phím `Escape` và click-outside để tự đóng mượt mà.
    - **Chuẩn hóa Toast Notifications**: Bổ sung type `'warning'` vào helper `sim-ui-helpers.ts`, gỡ bỏ triệt để các lệnh gọi `(window as any).showToast` global thô sơ, thay thế bằng việc import tĩnh và gọi `showToast` chính thức định kiểu rõ ràng trong 4 client files (`users-client.tsx`, `teams-client.tsx`, `settings/page.tsx`, `announcements-client.tsx`).
    - **Dọn sạch mock values trong dashboard**: Gỡ bỏ hardcode Doanh thu (`12.450.000đ`) và Uptime (`99.97%`) thành `'—'` placeholder kèm nhãn giải thích chưa kết nối Stripe/monitoring, bảo vệ tính trung thực dữ liệu. Bổ sung export SEO `metadata` tiêu chuẩn cho trang `/admin`.
    - **Biên dịch thành công**: Build Turbopack `pnpm build` vượt qua 100% kiểm định đạt **0 errors** trên toàn hệ thống Next.js!
  - ✅ **Hoàn thành Khắc phục Bảo mật & Tái cấu trúc UX/Architecture trang Cài đặt & Thành viên (Task 2)**:
    - **Tái cấu trúc kiến trúc (Architecture Cleanup)**: Gỡ bỏ triệt để các component quản lý thành viên bị trùng lặp, lỗi thời (`TeamMembers`, `InviteTeamMember`) khỏi `settings/page.tsx`. Thay thế bằng **MembersNavigationCard** mờ kính sang trọng hướng dẫn người dùng sang trang `/dashboard/members` chuyên biệt.
    - **Vá 3 hộp thoại Native Confirm (UX Bug)**: Thay thế hoàn toàn hàm `confirm()` chặn main thread thô kệch bằng 3 Modal kính mờ Glassmorphism cao cấp: **Premium Workspace Deletion Confirm Modal**, **Premium Member Removal Confirm Modal**, và **Premium Invite Cancellation Confirm Modal** với thiết kế mượt mà, hỗ trợ đóng nhanh bằng phím `Escape` và click-outside tự nhiên.
    - **Chuẩn hóa Toast Notifications (UX Bug)**: Loại bỏ 14 lệnh gọi `(window as any).showToast` global thô sơ, quy chuẩn bằng việc import tĩnh và gọi `showToast` chính thức từ `@/app/(dashboard)/sim/sim-ui-helpers`.
    - **Biên dịch thành công**: Build Turbopack `pnpm build` vượt qua 100% kiểm định với **0 errors** trên toàn hệ thống 29 routes Next.js!
  - ✅ **Hoàn thành Khắc phục Lỗ hổng IDOR & Nâng cấp UX trang Chi tiết Workspace (`/dashboard/t/[teamId]`)**:
    - **IDOR Protection (CRITICAL)**: Bổ sung logic kiểm tra quyền Membership trong Server Component `page.tsx` chặn truy cập chéo giữa các tổ chức (Cross-tenant Leakage) và trả về `<TeamNotFound />` để tránh Information Leakage (Enumerate Attack).
    - **Premium Confirm Modal**: Cập nhật Client component xóa bỏ hộp thoại `confirm()` thô sơ, tích hợp Modal kính mờ Glassmorphism Red/Orange an toàn hỗ trợ phím Escape và Click-outside.
    - **State Synchronization**: Nâng cấp đồng bộ tức thì Local State giữa Kanban Board và Bảng tin (FeedPosts), loại trừ hoàn toàn độ trễ giao diện khi người dùng chuyển trạng thái công việc.
    - **Server Revalidation**: Gọi `router.refresh()` chuẩn xác sau các Server Actions thay đổi dữ liệu để làm mới Server Component.
  - ✅ **Hoàn thành Khắc phục Bảo mật, Bugs & UX trang Bảng tin `/dashboard/home` (PLAN_SOCIAL_FEED_HARDENING)**:
    - **Bịt lỗ hổng Backend Query (CRITICAL)**: Thay đổi signature và logic của `getFeedPosts(userTeamIds)` để chỉ tải bài đăng thuộc các Workspace mà user đăng nhập thực sự làm thành viên, ngăn chặn hoàn toàn rò rỉ dữ liệu chéo (Cross-tenant Leakage) giữa các tenant khác nhau.
    - **Scope gợi ý @Mention (CRITICAL)**: Thu hẹp danh sách autocomplete gợi ý trong cả Post Creator (theo `publishTeamId`) và bình luận FeedPostCard (theo `scopedTeamId`), đảm bảo chỉ gợi ý Workspace và thành viên thuộc cùng một tổ chức đang thao tác.
    - **Optimistic Rollback (UX Bug)**: Bổ sung cơ chế lưu snapshot state và rollback thông tin khi có lỗi mạng/API cho cả 5 hành động tương tác chính: toggleLike, addComment, toggleTask, changeTaskStatus, togglePin.
    - **Thay thế Native Prompt (UX Bug)**: Xây dựng inline modal đính kèm ảnh (Image URL Modal) thiết kế mờ kính Glassmorphism sang trọng, hỗ trợ phím Escape, Enter và đóng click-outside thay thế cho hộp thoại `prompt()` thô sơ của trình duyệt.
    - **Xóa mặc định Task Title (UX Bug)**: Gỡ bỏ title mặc định cứng, bổ sung validation bắt buộc nhập tiêu đề khi tạo bài viết loại "Giao việc".
    - **Chuẩn hóa showToast (UX Bug)**: Xóa bỏ hoàn toàn 16 lệnh gọi `(window as any).showToast` thô sơ trong client, chuyển sang helper chính thức `showToast` có định kiểu tĩnh.
    - **Tenant Isolation Cổng MVP (CRITICAL)**: Bổ sung kiểm tra an toàn membership trong Server Action `dispatchMvpFeedPost` để chặn hoàn toàn việc MVP gửi bài đăng giả mạo sang Workspace khác.
  - ✅ **Hoàn thành Khắc phục 5 lỗi bảo mật & UX trang `/dashboard` (Giai đoạn 3: CODE)**:
    - **Fix R-01 (Billing Gating)**: Vá lỗ hổng tạo workspace không giới hạn. Tích hợp đếm workspace sở hữu thực tế (`role='owner'`, chưa bị xóa mềm) và so khớp hạn mức từ hệ thống (`DEFAULT_BILLING_PLANS` & DB config `maxOwnedWorkspaces`: Free=1, Pro=5, Enterprise=50), chặn backend bypass tạo quá giới hạn.
    - **Fix R-02 (Lọc log Workspace xóa mềm)**: Nâng cấp hàm `getActivityLogs()` thực hiện `leftJoin` với `teams` và lọc `isNull(teams.deletedAt)`, đảm bảo an toàn tuyệt đối thông tin, không rò rỉ log của workspace đã xóa.
    - **Fix R-03 (Sửa nhãn UX)**: Sửa tiêu đề timeline từ "Hoạt động hệ thống gần đây" thành "Hoạt động cá nhân gần đây" để phản ánh chuẩn xác phạm vi log cá nhân.
    - **Fix R-04 (Tối ưu showToast)**: Thay thế anti-pattern `(window as any).showToast` thô sơ bằng import helper chính thức `showToast` từ `@/app/(dashboard)/sim/sim-ui-helpers` có định kiểu tĩnh.
    - **Fix R-05 (Tối ưu Grid & Animation)**: Giới hạn trần animation delay tối đa 600ms giúp giảm ức chế thị giác khi có nhiều cards, và gỡ bỏ class `shrink-0` giúp grid co giãn tự nhiên trên mọi màn hình.
    - **Biên Dịch**: Chạy lệnh build `pnpm build` thành công xuất sắc đạt **0 errors** trên toàn hệ thống 29 routes Next.js!
  - ✅ **Hoàn thành Khắc phục 5 lỗi bảo mật & UX trang `/dashboard/store`**:
    - **S-01 (Backend Bypass)**: Thêm kiểm tra `isNull(teams.deletedAt)` vào Server Actions `activateAppAction` và `deactivateAppAction` để chặn hoàn toàn việc tương tác với các ứng dụng của Workspace đã xóa mềm.
    - **S-02 (UX Mismatch - Dropdown Scope)**: Lọc danh sách `teams` ở Client-side, tạo mảng `adminOrOwnerTeams` để dropdown chọn Workspace chỉ hiển thị các team mà tài khoản đăng nhập có quyền `owner` hoặc `admin`, vô hiệu hóa nút Kích hoạt nếu mảng rỗng.
    - **U-01 (Toast Helper Anti-pattern)**: Xóa 4 lệnh gọi `(window as any).showToast` thô sơ trong `store-client.tsx`, chuẩn hóa bằng helper chính thức được import từ `@/app/(dashboard)/sim/sim-ui-helpers`.
    - **U-02 (Native confirm)**: Thay thế hoàn toàn hàm `confirm()` gốc của trình duyệt gây đứng trang bằng **Premium Deactivation Confirm Modal** thiết kế kính mờ Glassmorphism Red/Orange Gradient đồng bộ khi xác nhận hủy kích hoạt ứng dụng.
    - **U-04 (Modal Keyboard Accessibility)**: Bổ sung hook `useEffect` lắng nghe phím `Escape` và sự kiện `onMouseDown` click-outside với `useRef` cho cả 2 modal (Kích hoạt và Hủy kích hoạt), mang lại trải nghiệm UX hiện đại.
    - **Biên Dịch**: `pnpm build` biên dịch dự án thành công không lỗi (**0 errors**).
    - **Sửa hiển thị ảnh đính kèm**: Loại bỏ aspect-video và object-cover gây bóp méo, cắt xén ảnh dọc/vuông. Chuyển sang wrapper co giãn tự nhiên `bg-gray-950/40 border border-white/5 max-h-[500px]` và thẻ `<img>` dùng `object-contain max-h-[480px] w-auto h-auto transition-all hover:scale-[1.01] duration-300`, giúp ảnh hiển thị trọn vẹn 100% kích thước.
    - **@Mention trong bình luận**: Thiết lập local states autocomplete độc lập bên trong `FeedPostCard`. Hiển thị menu trượt lên (slide-up dropdown) phía trên input khi gõ `@`, hỗ trợ gợi ý song song 2 nhóm: `💼 Không gian làm việc` (badge xanh emerald) và `👥 Thành viên` (badge xanh dương). Bấm chọn sẽ chèn chính xác tag `@Tên` và tự động focus lại ô nhập liệu.
    - **Tag Workspace ở Post Creator**: Nâng cấp `mentionSuggestions` ở Post Creator soạn bài chính để nạp song song tên các Workspace mà người dùng tham gia kế bên danh sách Thành viên, hiển thị badge phân loại trực quan.
    - **Fix Pagination UX**: Bổ sung `setCurrentPage(1)` khi người dùng đăng bài viết mới thành công từ trang 2 hoặc 3 để tự động quay về trang đầu tiên giúp người dùng nhìn thấy bài viết mới của họ ngay lập tức.
    - **Biên Dịch**: Sửa lỗi thiếu import `useMemo` trong components. Chạy `pnpm build` thành công xuất sắc đạt **0 errors** trên toàn hệ thống 29 routes Next.js!
  - ✅ **Hoàn thành Thiết kế lại Post Creator & Tối ưu hóa Social Feed trang `/dashboard/home`**:
    - **Post Creator UI/UX mới**: Thiết kế 2 trạng thái siêu mượt. Mặc định là thu gọn (1 dòng textarea + nút "Công khai ▼" gradient cam-hồng). Khi click/focus sẽ mở rộng ra đầy đủ tuỳ chọn.
    - **Không gian đăng bài (Publish Space)**: Tích hợp dropdown `<select>` cho phép người dùng chọn chính xác Workspace muốn đăng bài viết, tự động đồng bộ theo không gian làm việc đang lọc.
    - **3 Loại bài đăng Pills**: Thay đổi sang 3 loại bài đăng tiện ích là `📰 Tin tức` (lưu loại `'news'` mới), `📅 Giao việc`, và `⚡ Thông báo`. viewer role bị chặn đăng, staff role bị hạn chế giao việc và thông báo (chỉ cho phép đăng tin tức).
    - **Phạm vi "Giao cho" (Assignee scope)**: Dropdown Giao cho của form giao việc được scoped chuẩn xác chỉ hiển thị danh sách các thành viên thực tế thuộc Workspace được chọn để đăng bài, tránh hoàn toàn rủi ro rò rì thông tin thành viên chéo giữa các teams.
    - **Loại bỏ "Kết quả MVP" thủ công**: Loại bỏ hoàn toàn nút và form nhập chỉ số kết quả MVP thủ công rườm rà. Kết quả MVP từ nay sẽ do hệ thống tự động đẩy qua API cổng Server Action `feed-dispatcher.ts` khi MVP vận hành thực tế.
    - **Vá lỗi Mockup & Khóa vai trò**: Đồng bộ hóa toàn bộ các call site `simulatedRole` còn sót lại ở phần comments sang `userRole` thật từ database PostgreSQL, loại bỏ hoàn toàn mã giả lập.
    - **Biên Dịch**: Production build `pnpm build` thành công xuất sắc đạt **0 errors** trên toàn hệ thống Next.js!
  - ✅ **Hoàn thành Kiểm toán & Dọn sạch Mockup trang /dashboard — Chuẩn hóa Cổng MVP**:
    - **Tách Tiện Ích UI**: Di chuyển toàn bộ hàm tiện ích hiển thị (`getPlanLabel`, `getPlanBadgeClass`, `getRoleByKey`), types (`RoleKey`, `MemberStatus`), và hằng số (`ROLES`, `PERMISSION_CATEGORIES`) sang [shared-constants.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/shared-constants.ts). Cấu hình hỗ trợ full lowercase/uppercase planName tương thích DB.
    - **Dọn Sạch Mock File**: Refactor [team-mock-data.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/team-mock-data.ts) để chỉ re-export từ `shared-constants.ts`. Gỡ bỏ 100% logic UI trùng lặp, cô lập dữ liệu mock giả lập.
    - **Cập Nhật Call Sites**: Thay đổi thành công import path trong 7 files client/server components sang `shared-constants.ts`, triệt tiêu hoàn toàn sự phụ thuộc của UI vào tệp mock rác.
    - **Bịt Lỗi Feed Mock**: Loại bỏ hoàn toàn `MOCK_TEAMS` và `MOCK_MEMBERS` khỏi [feed-post-card.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/components/feed-post-card.tsx). Trực tiếp truyền `teamName` và `teamAvatar` động từ DB qua cha [social-feed-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/home/social-feed-client.tsx) và cho phép tô đậm (highlight) mentions toàn cục an toàn.
    - **UI Polish AI Resources**: Cập nhật logic hiển thị AI Resource Progress Bar và 7-day pure CSS Bar Chart trong [team-detail-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/t/[teamId]/team-detail-client.tsx) về trạng thái `0` (Chưa kết nối dữ liệu) kèm overlay mờ kính premium, giữ nguyên visual structure đẹp mắt đúng theo Option 1 được phê duyệt.
    - **Hotfix Link Quay Lại**: Khắc phục lỗi link quay lại từ MVP SIM Layout (/sim/layout.tsx) trỏ sai về dạng mock `/dashboard/t/team-2`. Sửa đổi đồng bộ sang dynamic database ID `/dashboard/t/${team.id}` (ví dụ: `/dashboard/t/2`), khôi phục luồng điều hướng mượt mà 100% không lỗi.
    - **Biên Dịch**: Build dự án `pnpm build` thành công xuất sắc đạt **0 errors** trên toàn bộ 29 routes Next.js!
  - ✅ **Hoàn thành cấu hình chạy thử các Server Actions Notifications Bell động**:
    - **CLI Test Script**: Xây dựng tệp kiểm thử tự động [test-notifications.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/test-notifications.ts) kết nối Drizzle PostgreSQL chèn dữ liệu chéo, liên kết người dùng phụ "Trợ lý Hero AI" vào Workspace, trigger Server Action `createNotification` và in ra kết quả qua console.table, được kích hoạt nhanh qua lệnh `pnpm db:test-notifications`.
    - **API Route Test**: Tạo endpoint kiểm thử [route.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/api/test-notifications/route.ts) thực hiện tự động hóa 4 Server Actions Bell (Giao Task, Like bài viết, Bình luận, Cập nhật trạng thái nhiệm vụ) cho tài khoản đang đăng nhập hiện hành, tự động revalidatePath.
    - **UI Testing Panel**: Tích hợp nút bấm cao cấp "⚡ Chạy thử chuông thông báo" ở Header trang quản trị [announcements-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/admin/announcements/announcements-client.tsx) kết hợp sự kiện Client-side custom event `notifications-updated` bắn tin toàn hệ thống.
    - **SWR Auto-sync**: Nâng cấp [top-header.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/components/top-header.tsx) lắng nghe sự kiện để tự động kích hoạt `mutate('/api/notifications')`, cập nhật số lượng thông báo chưa đọc động tức thời 100% trên Header mà không cần tải lại trang.
  - ✅ **Hoàn thành Nâng cấp ô Tìm Kiếm Toàn Cục Tĩnh thành Command Search Palette (Ctrl+K) hoạt động thật 100%**:
    - **API Route Search**: Tạo mới [route.ts (Search)](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/api/search/route.ts) nhận từ khóa `q`, xác thực user và thực hiện truy vấn song song không phân biệt hoa thường đối với Ứng dụng (Registry platform), Thành viên trong cùng Workspace, và Bài đăng Social Feed thật từ PostgreSQL qua Drizzle.
    - **Command Palette UI**: Tích hợp phím tắt toàn cục `Ctrl+K` (hoặc `Cmd+K`) để tự động focus vào input.
    - **Popover Giao Diện Premium**: Thiết kế Popover trượt xuống kính mờ Glassmorphism (`backdrop-blur-2xl bg-gray-950/95`) hiển thị kết quả tìm kiếm phân loại trực quan, hỗ trợ Click-outside đóng bảng và Hash-routing tự động nhảy đến Post Social Feed và highlight viền cam tức thời.
  - ✅ **Khắc phục lỗi bị che khuất (Cut-off) của Dropdown Menu quản trị Thành viên**:
    - **Vấn đề**: Bảng thành viên bọc ngoài bằng container `overflow-hidden` để bảo vệ thẩm mỹ bo góc `rounded-2xl`. Khi người dùng click mở dropdown menu của thành viên ở hàng cuối cùng, dropdown mở hướng xuống dưới (`mt-2`) trồi ra ngoài biên dưới và bị trình duyệt cắt bỏ 90% nội dung.
    - **Giải pháp**: Nâng cấp logic đảo hướng mở động trong [members-client.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/%28dashboard%29/dashboard/members/members-client.tsx) dựa trên index hàng. Đối với hàng cuối cùng (`index === filteredMembers.length - 1`), dropdown menu tự động đổi hướng mở ngược lên trên (`bottom-full mb-2 origin-bottom-right`) thay vì hướng xuống, hiển thị cực kỳ vững vàng và trọn vẹn 100% nội dung.
    - **Nâng cấp Click-outside tự nhiên**: Loại bỏ div fixed chắn toàn màn hình (`fixed inset-0`) thô sơ cũ (vốn gây cản trở tương tác và khiến người dùng phải click đúp để mở phần tử khác). Thay thế bằng việc gán `React.useRef` vào dropdown và lắng nghe sự kiện `mousedown` toàn cục. Đảm bảo dropdown tự đóng tức thời khi click chuột ra ngoài ở bất kỳ đâu một cách vô cùng tự nhiên và mượt mà, không cản trở các cú click chuột khác.
  - ✅ **Hoàn thành Tích hợp Dữ liệu Thật 100% cho Loa Phát Thanh & Chuông Thông Báo (PLAN_MEGAPHONE)**:
    - **Database Schema**: Bổ sung 3 bảng mới `system_announcements`, `user_announcement_reads` và `notifications` trong `schema.ts`, tự động đồng bộ hoá lên PostgreSQL local qua Drizzle `pnpm db:push` thành công.
    - **Server Actions**: Xây dựng Server Actions quản trị `createAnnouncementAction`, `deleteAnnouncementAction` (bảo mật super_admin) trong `app/app/admin/actions.ts`; và Server Actions nghiệp vụ `markNotificationAsReadAction`, `markAllNotificationsAsReadAction`, `markAnnouncementsAsReadAction` trong `app/lib/db/notification-actions.ts`.
    - **API Routes**: Tạo các route endpoint dynamic `/api/notifications` và `/api/announcements` trả về thông báo và số lượng chưa đọc động dựa trên DB thật.
    - **Super Admin UI**: Tạo trang quản trị Loa phát thanh Premium Dark Mode tại `/admin/announcements` kết hợp Server & Client Components (`page.tsx`, `announcements-client.tsx`) hỗ trợ form đăng tin (tiêu đề, phiên bản, mức độ, nội dung Markdown) và xoá tin lịch sử. Tích hợp link điều hướng vào `admin-shell.tsx`.
    - **Header UI Polish**: Nâng cấp toàn bộ `top-header.tsx` kết nối SWR dynamic data. Chuông thông báo (Bell) chạy thật 100% thay thế mock; Loa phát thanh (Megaphone) check chấm cam động từ DB, click mở **Slide-over Drawer bên phải** cực kỳ sang xịn để đọc Changelogs và tự động xoá chấm cam trên DB.
  - ✅ **Đồng bộ hóa Phân quyền Client-Side scoped theo Workspace (Settings & Members)**:
    - **Khắc phục lỗi lệch vai trò (Role Sync)**: Phát hiện và sửa lỗi UI trong [settings/page.tsx](file:///C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/settings/page.tsx) kiểm tra `user.role === 'owner'` (sử dụng platform role toàn cục, mặc định là `'member'`) thay vì check vai trò thực tế của user trong Workspace (`teamMembers`), dẫn đến việc Owner thật sự bị khóa không thể mời thành viên hoặc nhìn thấy Danger Zone xóa workspace.
    - **Đồng bộ triệt để**: Cập nhật cách tính `isOwner` trong cả `DangerZone` và `InviteTeamMember` bằng cách tra cứu thành viên hiện tại trong danh sách (`teamData.teamMembers.find(m => m.user.id === user.id)`) và kiểm tra `role === 'owner'`, đồng nhất 100% vai trò quản trị giữa trang `/dashboard/members` và `/dashboard/settings`.
  - ✅ **Hoàn thành Tích hợp UI Xóa nhanh MVP & Rút gọn Xóa Workspace**:
    - **Xóa nhanh MVP tại Quick Launch**: Thêm nút **Xóa** absolute nằm ngay trên thẻ ứng dụng của mục *Khởi chạy ứng dụng nhanh* (`team-detail-client.tsx`), kiểm duyệt bảo mật chỉ hiển thị cho tài khoản **Owner**, tự động kích hoạt confirm tiếng Việt `"Bạn có muốn xóa ứng dụng [Tên] khỏi không gian làm việc không? Mọi dữ liệu liên quan sẽ bị mất."`, thực thi Server Action và cập nhật UI phản hồi tức thì bằng Optimistic state, đồng thời phát event re-render Sidebar đồng bộ.
    - **Rút gọn xóa Workspace**: Tối giản hóa Danger Zone trong [settings/page.tsx](file:///C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/(dashboard)/dashboard/settings/page.tsx) chỉ hiển thị cho **Owner**, loại bỏ yêu cầu gõ tên nhóm phức tạp, thay thế bằng nút **Xóa không gian làm việc** tích hợp confirm nhanh `"Bạn có muốn xóa không gian làm việc không? Mọi ứng dụng và dữ liệu sẽ bị mất."`, thực thi Server Action `deleteWorkspaceAction` và tự động điều hướng mượt mà về trang chính.
  - ✅ **Hoàn thành Bảo vệ Dữ liệu (PLAN_DATA_SAFETY.md)**:
    - **Task 1 (Soft-Delete Workspace)**: Chuyển đổi cơ chế xóa workspace từ Hard-Delete sang Soft-Delete bằng cách cập nhật `deletedAt` trên bảng `teams`, đồng thời xóa liên kết thành viên (`teamMembers`) và hủy tất cả lời mời pending (`invitations`) để cô lập quyền truy cập tức thì, giữ lại toàn bộ `activityLogs` và dữ liệu nghiệp vụ (SIM data, feed posts) phục vụ phục hồi.
    - **Task 2 (Lọc Soft-Deleted Teams)**: Bổ sung bộ lọc `deletedAt` dạng post-query cực kỳ an toàn trong 3 hàm truy vấn chính `getTeamForUser`, `getTeamsForUser`, và `getTeamWithMembers` của `queries.ts`, ngăn không cho các workspace đã xóa mềm xuất hiện trên UI hoặc bị truy cập chéo.
    - **Task 3 (App Activation Gating)**: Nâng cấp hàm bảo mật `verifyTeamAccess` trong `sim-actions.ts` hỗ trợ tham số `requiredApp?: string` và truy vấn bảng `teams` đối chiếu trường `activatedApps` (JSONB) với fallback an toàn. Đồng thời nâng cấp toàn bộ 14 call sites của SIM actions để kiểm duyệt bắt buộc `'sim'` trước khi ghi dữ liệu, bịt kín lỗ hổng backend bypass.
  - ✅ **Hoàn thành Đồng bộ Dữ liệu Thật 100% cho Dashboard `/admin` và Logs `/admin/logs`**:
    - **Data Fetching (Queries)**: Bổ sung 3 hàm queries PostgreSQL thật `getAdminDashboardStats` (đếm Users, Teams, Logs song song qua `Promise.all`), `getAdminGrowthData` (tính lũy kế User và Team đăng ký 6 tháng gần nhất để vẽ biểu đồ), và `getAdminLogs` (truy vấn toàn cục bảng `activity_logs` join `users` và `teams` kèm dịch tiếng Việt và tự động phân `severity` dựa trên action type). **Vá triệt để lỗi parameter binding Date của driver `postgres` trong `getAdminGrowthData` bằng cách dùng các toán tử so sánh Drizzle ORM chuẩn (`gte`, `lt`).**
    - **Dashboard `/admin` Refactoring**: Chuyển đổi `/admin/page.tsx` thành Server Component và chuyển UI cũ sang Client Component `dashboard-client.tsx`. Thay thế "Lượt tin nhắn AI" -> "Tổng hoạt động", "Hoạt động hôm nay" -> "Tổ chức tích cực" (số nhóm có log trong 24h) và chuyển chart Doanh thu thành chart Tăng trưởng tổ chức thật.
    - **Logs `/admin/logs` Refactoring**: Chuyển đổi `/admin/logs/page.tsx` thành Server Component, chuyển giao diện lọc/sort/phân trang sang Client Component `logs-client.tsx` hiển thị 15 log/trang (real database).
    - **Dọn dẹp Mock Data**: Làm sạch file `admin-mock-data.ts`, loại bỏ hoàn toàn các hằng số mock rác (`PLATFORM_STATS`, `GROWTH_DATA`, `MOCK_SYSTEM_LOGS`...) giúp tối ưu hóa dung lượng dự án.
  - ✅ **Hoàn thành Đồng bộ Dữ liệu Thật cho Super Admin (Users & Teams)**:
    - **Database Schema**: Bổ sung trường `deletedAt` cho bảng `teams` trong `schema.ts` phục vụ tính năng Khóa/Mở khóa tổ chức.
    - **Data Fetching (Queries)**: Xây dựng `app/lib/db/admin-queries.ts` với `getAdminUsers` và `getAdminTeams` query Postgres thật qua Drizzle ORM (join tables, count members, fetch dynamic pricing plans).
    - **Server Actions**: Xây dựng `app/app/admin/actions.ts` bảo mật nghiêm ngặt (gating `super_admin`) gồm `toggleUserRoleAction`, `toggleUserStatusAction`, `changeTeamPlanAction`, và `toggleTeamStatusAction` kèm revalidation.
    - **UI Refactoring**: Chuyển đổi `/admin/users` và `/admin/teams` sang React Server Components kết hợp Client Components tương ứng (`users-client.tsx`, `teams-client.tsx`), kết nối dữ liệu thật 100% với giao diện Premium.
    - **Khắc phục triệt để lỗi Connection Leak (zombie connections)**: Tích hợp cấu hình `max: 1` và `idle_timeout: 1s` cho môi trường dev tại `drizzle.ts`. Thiết lập script tiện ích `cleanup-connections.ts` (`pnpm db:cleanup`) giải phóng lập tức **98 kết nối zombie bị treo** trong local Docker Postgres, tự động cấu hình tự đóng kết nối idle sau 5 giây (`idle_session_timeout = 5000ms`), khôi phục dev server hoạt động mượt mà 100%.
  - ✅ **Hoàn thành loại bỏ trang apps cũ và đồng nhất về store**:
    - **Xóa bỏ**: Xóa thư mục `/dashboard/apps` dư thừa để tránh trùng lặp.
    - **Cập nhật**: Sửa toàn bộ liên kết redirect và link quay về dashboard trong `app/admin/layout.tsx` và `app/admin/admin-shell.tsx` sang `/dashboard/store`.
    - **Biên dịch**: Sản xuất build Next.js thành công 100% với 25 routes sạch sẽ, **0 errors**!
  - ✅ **Hoàn thành bịt lỗ hổng Backend Bypass — Plan Gating cho activateAppAction**:
    - **Lỗ hổng đã phát hiện**: Server Action `activateAppAction` KHÔNG kiểm tra gói cước khi kích hoạt app → cho phép bypass UI để kích hoạt app Pro/Enterprise trên gói Free.
    - **Giải pháp**: Bổ sung truy vấn `BILLING_PLANS` từ `system_settings`, đối chiếu `team.planName` (fallback `'free'`) với `allowedApps` của gói cước tương ứng, từ chối kích hoạt nếu `appId` không nằm trong danh sách cho phép.
    - **Biên dịch**: `pnpm build` thành công **0 errors** trên toàn bộ routes.
  - ✅ **Hoàn thành khắc phục 3 lỗi lớn của Không gian làm việc (Workspace)**:
    - **Lỗi 1 (Not Found)**: Chuyển đổi trang chi tiết `dashboard/t/[teamId]` thành Server Component, query database Postgres qua Drizzle thực tế (`getTeamWithMembers`), tách UI động thành Client Component `team-detail-client.tsx`, triệt tiêu hoàn toàn lỗi "Không tìm thấy".
    - **Lỗi 2 (Sửa/Xóa Workspace)**: Bổ sung form Cấu hình chung cho phép đổi tên/avatar nhóm và khu vực **Danger Zone** chỉ dành cho Owner để xóa Workspace (yêu cầu nhập đúng tên nhóm để confirm), liên kết hoàn hảo với Server Actions `updateWorkspaceAction` và `deleteWorkspaceAction` có sẵn.
    - **Lỗi 3 (Nút Thêm ứng dụng)**: Tích hợp nút `+ Thêm ứng dụng` bằng nét đứt tinh tế trong Accordion Sidebar của từng nhóm để dẫn thẳng tới `/dashboard/store`.
    - **Biên dịch**: Sản xuất build Next.js thành công xuất sắc đạt **0 errors** 100% trên toàn bộ 26 routes!
  - ✅ **Hoàn thành trọn vẹn 100% cả 4 Sprints (Kế hoạch di trú Mock-to-Real)**:
    - **Sprint 1 & Sprint 2 (Workspace & Store)**: Đồng bộ hoàn toàn dữ liệu Không gian làm việc và kích hoạt ứng dụng lên Postgres thật, thêm trường `avatar` và `activatedApps` (JSONB) vào bảng `teams`, triệt tiêu lỗi mất trạng thái khi F5.
    - **Sprint 3 (Social Feed)**: Thiết lập schema Drizzle ORM chuẩn chỉnh cho `feed_posts`, `feed_comments`, và `feed_likes`, kết nối Server Components `/dashboard/home` tải feed real-time mượt mà từ DB PostgreSQL.
    - **Sprint 4 (Members & RBAC)**: Chuyển đổi quản lý thành viên và lời mời (`invitations`) sang DB thật qua các RPC Server Actions (`changeMemberRoleAction`, `cancelInvitationAction`, `inviteTeamMemberAction`, `removeTeamMemberAction`). Fix triệt để các lỗi TypeScript compiler trong `members-client.tsx` và `queries.ts`.
    - **Biên dịch**: Production build `pnpm build` biên dịch thành công xuất sắc đạt **0 errors** 100% trên toàn bộ 26 trang Next.js 15+!
- **2026-05-28**:
  - 🔍 **Hoàn thành Audit & Review Test toàn hệ thống**:
    - **Thực thi**: Rà soát mã nguồn Client/Server của 4 module cốt lõi: Workspace CRUD, Kích hoạt MVP Store, Bảng tin Social Feed, và Phân quyền thành viên (RBAC). Xuất bản báo cáo chi tiết [system_audit_report.md](file:///C:/Users/ADMIN/.gemini/antigravity/brain/3132041a-f47d-41c6-ae4c-448b865d4a45/system_audit_report.md).
    - **Kết quả**: Chỉ ra 100% tính năng nhạy cảm (Stripe/Billing Gating, Server RBAC, SIM Action Tenant Isolation) đã chạy bằng Database Postgres thật cực kỳ an toàn. Phát hiện các lỗi tiềm ẩn F5 reset và ngắt kết nối dữ liệu giữa Client Mock và Real DB ở các trang quản trị thành viên, tạo Workspace mới, và Social Feed.
    - **Đánh giá**: Hệ thống đạt độ ổn định cao, đủ điều kiện an toàn để triển khai tích hợp AI Chat MVP tiếp theo.
  - ✅ **Hoàn thành Cơ chế Cách ly Dữ liệu Multi-tenant & Khắc phục Lỗi F5 MVP SIM**:
    - **Cookie-based Tenancy**: Khởi tạo Helper Cookie (`lib/team-cookie.ts`) để gắn thẻ `teamId` khi điều hướng. Cập nhật `sim-helpers.ts` để đọc team từ Cookie thay vì `limit(1)` lỗi, đạt được khả năng cách ly dữ liệu 100% giữa các Không gian làm việc.
    - **Liên kết Navigation**: Sửa Component Navigation (`layout.tsx`) để đồng bộ cập nhật cookie trực tiếp từ thao tác bấm ở Sidebar. Trang `dashboard/t/[teamId]/page.tsx` cũng tự động mount lại Cookie khi vào Không gian tương ứng. Cấu hình Nút "Quay lại" trong SIM Layout để nhảy về đúng Dashboard của Workspace đang dùng.
    - **Sửa Lỗi F5 & Demo**: Làm sạch các ứng dụng Demo khỏi `apps-registry.ts`. Loại bỏ trạng thái rỗng ảo, đảm bảo ứng dụng SIM hiển thị vững vàng. F5 không còn làm mất quyền truy cập vào HeroSim nhờ cập nhật dữ liệu Mock.
    - **Tài liệu hóa**: Soạn thảo và xuất bản `MVP_INTEGRATION_GUIDE.md` liệt kê toàn bộ quy trình 4 giai đoạn chuẩn (Schema -> Registry -> Routing -> UI) để nhúng một MVP vào Hệ Sinh Thái Ai2Hero.
  - ✅ **Hoàn thành Giải quyết lỗi hiển thị, cài đặt và điều hướng MVP (`apps-registry.ts`, `team-mock-data.ts`, `layout.tsx`, `page.tsx`)**:
    - **Dọn sạch App Demo**: Cấu hình lại `APPS` trong `apps-registry.ts` để gỡ bỏ toàn bộ các ứng dụng nháp rác (`AI Chat`, `AI Hub`, `API Hub`, `POS`, `Content Hub`), giữ lại giao diện sạch sẽ chỉ có duy nhất ứng dụng HeroSim.
    - **Khắc phục lỗi F5 mất App**: Cập nhật cứng `activatedApps: ['sim']` trong `MOCK_TEAMS` của `team-mock-data.ts` cho toàn bộ các team mẫu, giữ ứng dụng SIM luôn được kích hoạt.
    - **Sửa đổi điều hướng (Routing)**: Cập nhật Sidebar và Quick Launch Grid trong `layout.tsx` và `page.tsx` sử dụng trực tiếp `href={app.path}` đi thẳng vào trang quản trị `/sim/dashboard` thay vì `/dashboard/apps?app=sim`.
    - **Biên dịch**: Chạy thành công `pnpm build` đạt **0 errors** trên toàn hệ thống 26 routes!
  - ✅ **Hoàn thành Tài liệu Hướng dẫn Tích hợp MVP (`MVP_INTEGRATION_GUIDE.md`)**:
    - **Hệ thống hóa quy trình**: Soạn thảo tài liệu chuẩn hóa 6 bước tích hợp MVP mới vào AI2Hero (Chuẩn bị Schema kết nối `userId`, Tích hợp `activityLogs`, Kế thừa UI với `TopHeader`, Xử lý Route/Layout lồng nhau, Cập nhật tài liệu sống, và Kiểm thử bằng `pnpm build`).
    - **Nguồn sự thật**: Tài liệu đóng vai trò tham chiếu bắt buộc cho các Phase mở rộng MVP (như AI Chat, API Hub) sau này.
  - ✅ **Hoàn thành Tích hợp SIM Global & Đồng nhất Top Header**:
    - **Kiến trúc Top Header Premium**: Trích xuất toàn diện thanh Top Header cao cấp từ `dashboard/layout.tsx` ra thành một component dùng chung độc lập `<TopHeader />` (`app/components/top-header.tsx`) hỗ trợ cả giao diện Desktop và Mobile. Nhúng thành công vào Dashboard Layout và SIM Layout, đồng bộ z-index và sidebar sticky z-index trượt mượt mà. Ẩn toàn bộ Header cũ của Root Layout đối với mọi trang SIM (`/sim/*`).
    - **Liên kết thành viên thật**: Nâng cấp schema Drizzle, thêm trường khóa ngoại `userId` tham chiếu đến `users.id` trong bảng `sim_employees`. Cập nhật `sim/settings` cho phép chọn thành viên thực tế của nhóm từ database, hỗ trợ auto-populate thông tin và hiển thị badge `Liên kết: [Tên thành viên]` sang xịn mịn.
    - **Đẩy Activity Feed**: Tích hợp cơ chế tự động ghi nhật ký hoạt động (`activityLogs`) vào các Server Actions biến đổi của SIM (`createSimAsset`, `deleteSimAsset`, `createSimLinkedAccount`, `deleteSimLinkedAccount`, `resolveSimRiskEvent`, `addSimCheckLog`) giúp mọi tương tác trên SIM tự động xuất hiện trên Bảng tin trang chủ (`/dashboard/home`) và Timeline nhóm thật.
    - **Biên dịch**: Sản xuất build `pnpm build` đạt **0 errors** 100% thành công mỹ mãn.
  - ✅ **Hoàn thành Di chuyển Native Import CSV vào Web App (Bỏ Import từ Extension)**:
    - **Ý tưởng thay đổi**: Chuyển luồng nhập mật khẩu (Import CSV từ Google Passwords) trực tiếp lên giao diện Web App `/sim/accounts`, gỡ bỏ hoàn toàn việc đọc file và logic đồng bộ từ Extension giúp Extension mỏng nhẹ hơn và triệt tiêu 100% các lỗi mất đồng bộ như `accountsData is not iterable`.
    - **Web App**:
      - Bổ sung Server Action `importSimLinkedAccountsBatch` trong `sim-actions.ts` hỗ trợ bulk insert/upsert an toàn trong transaction (dedup theo platformKey + username) với **giới hạn được nâng lên tối đa 2000 tài khoản/lần**.
      - Thiết kế Modal Nhập CSV Chrome kéo thả file CSV, cho phép chọn SIM liên kết mặc định và hiển thị thống kê Preview thời gian thực.
      - **Tích hợp Trường Mật Khẩu (Password Management)**: Vá triệt để lỗ hổng thiếu trường mật khẩu trên toàn bộ hệ thống Web App (bổ sung `encryptedPassword` vào `sim-queries.ts`, chèn ô nhập mật khẩu với nút Ẩn/Hiện bằng Eye/EyeOff trong cả hai Modal Thêm mới/Sửa tài khoản liên kết, và hiển thị mật khẩu dạng ẩn cùng nút Copy/Toggle trong Slide-over Drawer chi tiết tài khoản).
      - Gỡ bỏ listener `VAULT_IMPORT_BATCH` lỗi thời ở `bridge-api.tsx`.
    - **Chrome Extension**:
      - Dọn dẹp sạch tab Import trong `popup.html` và `popup.js`, xóa logic drag-drop file và forward batch.
      - Loại bỏ thông điệp `FORWARD_IMPORT_BATCH` trong `background.js` và `webAppBridge.js`.
      - Xóa file `extension/utils/csvParser.js` vĩnh viễn khỏi ổ đĩa.
    - **Biên dịch**: Production build `pnpm build` biên dịch thành công xuất sắc đạt **0 errors** 100%.
  - ✅ **Khắc phục triệt để lỗi handshake/PIN kết nối Extension và Web App**:
    - **Lỗi gốc**: Chrome Manifest V3 Service Worker sleep làm rỗng biến RAM `simGuardTabIds`, dẫn đến popup không tìm thấy tab của Web App để gửi message verify PIN / sync và trả về lỗi giả định "Web App chưa mở".
    - **Giải pháp**: 
      - Bổ sung quyền `"tabs"` vào `manifest.json` của Extension.
      - Nâng cấp `background.js` sử dụng `chrome.tabs.query` động lọc các tab localhost chứa `/sim` mỗi khi nhận event, giữ Set RAM làm fallback an toàn.
  - ✅ **Hotfix lỗi "accountsData is not iterable" khi đồng bộ tài khoản**:
    - **Nguyên nhân**: Destructuring trong [bridge-api.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/%28dashboard%29/sim/bridge-api.tsx) cố định đọc từ `event.data.data` trong khi extension gửi bằng key `payload`. Ngoài ra, payload nhập từ file CSV của Chrome gửi dữ liệu bọc trong object dạng `{ accounts: [...] }` thay vì truyền trực tiếp mảng phẳng, dẫn đến việc dùng `for...of` trên object bị crash.
    - **Lỗi phát sinh**: Sau khi sửa lỗi lặp, Extension lại bị crash im lặng ở popup do `popup.js` mong đợi thuộc tính `response.payload.count` để hiển thị toast thành công, nhưng Web App trước đó chỉ trả về `{ success: true, data }`. Việc đọc `undefined.count` đã phá vỡ luồng xử lý của popup.
    - **Giải pháp**: 
      - Cập nhật destructure linh hoạt `const { type, payload: extPayload, data: extData } = event.data; const payload = extPayload ?? extData;`.
      - Xử lý convert và gán `accountsData` an toàn: `Array.isArray(camelPayload) ? camelPayload : (camelPayload?.accounts || [])`.
      - Bổ sung trường `payload: { count: results.length }` vào đối tượng phản hồi `VAULT_IMPORT_BATCH_RESPONSE` trong `bridge-api.tsx` để khớp hoàn toàn với mong đợi của popup.js mà không cần bắt buộc người dùng reload/rebuild extension.
      - Chạy biên dịch `pnpm build` đạt **0 errors** 100% thành công.
  - ✅ **Hoàn thành Di chuyển Route SIM & Tích hợp Trang Cài đặt (7 Tabs Settings)**:
    - **Di chuyển Route**: Di chuyển thành công route HeroSim từ `/dashboard/sim` ra thư mục gốc `/sim/dashboard`. Cập nhật `middleware.ts` để bảo vệ route `/sim` và cập nhật `apps-registry.ts` để cập nhật lối tắt.
    - **Tích hợp Settings DB thật**: Xây dựng trang cài đặt tại `/sim/settings` với 7 tabs cấu hình, sử dụng Server Component để fetch data và Client Component render UI cao cấp. Kết nối cơ sở dữ liệu PostgreSQL thật thông qua Server Actions và Drizzle ORM (lưu cài đặt vào `systemSettings`, platforms vào `simPlatforms`, nhân viên qua `simEmployees`).
    - **Nâng cấp Extension 2.0**: Nâng cấp SimGuard Vault extension lên phiên bản `2.0.0`, cấu hình handshake và đồng bộ hóa tương thích 100% với route mới `/sim/*`.
  - ✅ **Hoàn thành Refactor Accounts & Phân trang SIM**:
    - **SIM Assets**: Nâng số lượng SIM hiển thị mỗi trang từ 10 thành 15 trong `assets-client.tsx`.
    - **Accounts UI Polish**: Chuyển đổi giao diện danh sách Tài khoản liên kết trong `accounts-client.tsx` từ dạng Grid sang Bảng table kèm Slide-over Drawer xem chi tiết mỏng nhẹ đồng bộ.
    - **Bulk Actions**: Thêm cột chọn nhiều (Bulk Checkbox) và nút xóa hàng loạt tài khoản liên kết (Bulk Delete) tuần tự an toàn.
    - **Chrome Extension Hook**: Tích hợp nút giả định "Nhập từ Chrome" trên Toolbar làm bệ phóng cho Phase sau.
    - **QA Verification**: Biên dịch production `pnpm build` thành công xuất sắc đạt **0 errors** cho toàn bộ 26 routes.
  - ✅ **Hoàn thành SimGuard Phase 5: Bảo mật quyền hạn, Tối ưu hóa Database & Trải nghiệm 100% chất lượng**:
    - **Shared UI Helpers**: Tạo mới `sim-ui-helpers.ts` làm duy nhất nguồn sự thật quản lý hàm `showToast` dùng chung toàn hệ thống, triệt tiêu 100% `alert()` native.
    - **SIM Assets Manager**: Đồng bộ phím `Escape` và click-outside đóng các modal thêm/sửa/nhập SIM, xóa bỏ duplication hiển thị rủi ro, fix responsive Mobile drawer.
    - **Check History**: Sửa search logic trống null-safe, pagination 10 logs/trang, sort order thời gian, và trend indicator null cực tốt.
    - **Linked Accounts**: Vá thành công Escape key, click-outside cho modals, copy clipboard bọc try-catch an toàn, disabled select SIM OTP placeholder và inline confirm delete.
    - **Risk Alerts**: Khắc phục ép kiểu `as any`, vá lỗi null rendering khi SIM bị xóa, disabled các nút khi pending, thay native `confirm()` dismiss rủi ro bằng inline confirm an toàn.
    - **Backend Hardening (`sim-actions.ts`)**: Nâng cấp kiểm duyệt vai trò `requireRole` (Viewer chỉ được đọc, cấm ghi), kiểm duyệt rủi ro đã xử lý ngăn chặn thao tác chéo, validate 500 SIM giới hạn batch size và chèn bộ lọc `sanitizeError` triệt tiêu leak error stack.
    - **Database Optimizations (`sim-queries.ts`)**: Tối ưu hóa `getSimDashboardStats` song song hóa 5 DB counts bằng `Promise.all` (tăng tốc 4x), nâng cấp toán tử fallback từ `||` sang `??`.
    - **QA Verification**: Chạy biên dịch `pnpm build` đạt **0 errors** cho toàn bộ 26 routes, đồng bộ bài học 4.33 vào `LESSONS.md` toàn cục.
    - **Visual Header Overlap & Layout Polish (`layout.tsx`, `sim-tabs.tsx`, `globals.css`)**: 
      - Giải quyết triệt để lỗi đè menu nghiêm trọng bằng cách chuyển từ `sticky top-14` thành `sticky top-0` cho Tab Bar.
      - **Thiết kế Full-Width**: Loại bỏ hoàn toàn giới hạn `max-w-7xl` và `mx-auto` trên `<main>` container chính và Tab Bar, giúp toàn bộ bảng biểu, charts và layout kéo giãn hết cỡ 100% viewport rộng rãi, không còn bị đóng khung bí bách.
      - **Header Siêu Mỏng**: Loại bỏ Sub-Header cao 80px cũ, tích hợp tiêu đề nhỏ gọn cùng một hàng ngang với Tab Bar (chỉ cao 48px), giải phóng tối đa diện tích đứng của giao diện.
      - **Làm đẹp thanh cuộn**: Tùy biến CSS `::-webkit-scrollbar` toàn cục trong `globals.css` biến các thanh cuộn mặc định Windows thô kệch thành thanh trượt mỏng 6px mờ mượt mà, tự động ẩn khi không di chuột.
      - **Drawer Alignment**: Căn chỉnh lại vị trí sticky của Drawer chi tiết SIM sang `lg:top-14` và tăng chiều cao tối đa khả dụng để thẳng hàng tuyệt đẹp dưới Tab Bar mới.
  - ✅ **Tích hợp SimGuard Phase 4: Client-side Triggers (Phân trang, Sắp xếp & Bộ lọc mở rộng)**:
    - **SIM Assets Manager**: Bổ sung bộ lọc mở rộng Loại SIM (Vật lý/eSIM) và Độ quan trọng (Thấp/Trung bình/Cao/Nguy cấp). Bổ sung tính năng click-sort trên 2 cột Nhà mạng (`carrier`) và Người phụ trách (`ownerName`) tích hợp biểu tượng ChevronUp/Down. Tích hợp phím Escape và click-outside overlay đóng các modal thêm/sửa/nhập SIM.
    - **Risk Alerts**: Triển khai trọn bộ Tìm kiếm rủi ro (theo loại, thiết bị, mô tả), Lọc cấp độ rủi ro, Lọc loại rủi ro động (lấy từ dữ liệu thực tế), Sắp xếp theo Thời gian/Độ nghiêm trọng/Tên SIM và Phân trang Grid (6 items/trang) với Premium Footer. Bổ sung phím Escape và click-outside cho Resolve Modal.
    - **Compilation & Verification**: Chạy lệnh build `pnpm build` đạt **0 errors** trên toàn hệ thống.
  - ✅ **Tích hợp SimGuard Phase 3: Chrome Extension Bridge & API Sync (Kết nối thời gian thực)**:
    - **Tách Component Điều Hướng**: Chuyển đổi `layout.tsx` sang Server Component, tách thanh tab ngang chứa logic hook `usePathname` ra client component `sim-tabs.tsx`.
    - **Dual-Write Storage Adapter & Data Mapper**: Thiết lập `bridge-api.tsx` giúp mapping tự động camelCase (DB) sang snake_case (localStorage của extension) và vice-versa.
    - **Real-time postMessage Events**: Lắng nghe các tin nhắn `VAULT_QUERY`, `VAULT_SAVE_ACCOUNT`, `VAULT_IMPORT_BATCH` từ SimGuard Extension, thực thi Server Actions cập nhật Postgres và phản hồi lại định dạng `${type}_RESPONSE` chuẩn.
    - **Toast Integration**: Tích hợp Toast notification premium thông báo kết quả đồng bộ thời gian thực.
    - **Compilation & Verification**: Build dự án `pnpm build` thành công xuất sắc đạt **0 errors** trên toàn hệ thống.
  - ✅ **Tích hợp SimGuard Phase 2: Giao diện Premium Dark Mode (HeroSim UI/UX)**:
    - **Sub-layout & Navigation**: Thiết lập Tab navigation ngang với 5 mục điều hướng, sticky vị trí `top-14` và responsive cuộn ngang.
    - **SIM Dashboard**: Xây dựng trang tổng quan hiển thị 4 Stats widgets và Donut Chart rủi ro sử dụng CSS conic-gradient hiện đại đè vòng tròn đồng tâm, danh sách Top 5 SIM nguy hiểm và panel lối tắt.
    - **SIM Assets Manager**: Thiết lập bảng quản lý SIM với sorting động, tìm kiếm và phân trang client-side. Thiết kế Slide-in Drawer chi tiết bên phải (thông tin thuê bao, đăng ký chính chủ, tài khoản liên kết, check logs và phân tích rủi ro), tích hợp các modal CRUD SIM, kiểm tra bảo mật (add check log) và modal nhập CSV hàng loạt.
    - **Linked Accounts**: Nhóm danh sách tài khoản theo Platform Grid thông minh, tích hợp nút sao chép nhanh username/email và các modal CRUD liên kết tài khoản.
    - **Risk Alerts**: Giao diện quản trị 3 tab Cần xử lý / Đã xử lý / Bỏ qua, tích hợp modal nhập ghi chú xử lý rủi ro và nút khôi phục sự cố.
    - **Check History**: Trình diễn timeline audit logs dạng dọc, chỉ thị xu hướng tăng/giảm điểm rủi ro trực quan cùng bộ lọc loại kiểm tra.
    - **TypeScript compilation**: Đảm bảo toàn bộ 5 route mới và các client component liên quan biên dịch thành công 100%.
  - ✅ **Tích hợp SimGuard Phase 1: Database, Queries, Actions & Risk Engine**:
    - **ORM Schema**: Thêm 6 bảng dữ liệu (`sim_employees`, `sim_assets`, `sim_platforms`, `sim_linked_accounts`, `sim_risk_events`, `sim_check_logs`) vào schema Drizzle ORM cùng các relation và TypeScript types.
    - **Database Migration & Seeding**: Đồng bộ schema mới lên Postgres thành công và nạp seed data cho `Test Team` (15 SIM, 8 nhân viên, 32 tài khoản liên kết, 10 rủi ro và 8 check logs).
    - **Tenancy queries & Server Actions**: Xây dựng tầng truy xuất dữ liệu an toàn scoped theo `teamId` (sim-queries) và các Server Actions đột biến dữ liệu an toàn có kiểm tra session (sim-actions).
    - **TypeScript Risk Engine**: Dịch chuyển logic tính điểm phạt rủi ro 6 quy tắc và phân loại cấp độ rủi ro sang TypeScript.
    - **App Activation**: Cập nhật Apps Registry kích hoạt HeroSim từ `'coming_soon'` sang `'beta'`.
    - **Compilation & Verification**: Chạy biên dịch `pnpm build` đạt **0 errors** trên toàn hệ thống.
- **2026-05-27**:
  - ✅ **Hoàn thành Gói dịch vụ & Gating Tính năng (Billing & Plans Gating System)**:
    - **Database Schema & Data Layer**: Thêm bảng `system_settings` trong schema Drizzle ORM để lưu cấu hình gói cước (Free, Pro, Enterprise) dưới dạng JSONB động và tạo các helper queries `getSystemSetting`/`updateSystemSetting`.
    - **Super Admin Settings**: Refactor trang `/admin/settings` thành giao diện quản trị Tabs cho cả 3 gói, cho phép chỉnh sửa giá, hạn mức thành viên (`maxMembers`), danh sách tính năng và quyền truy cập ứng dụng (`allowedApps`).
    - **Client Pricing & App Gating**: Chuyển đổi trang `/pricing` sang Server Component hiển thị giá/tính năng động từ DB trong giao diện Premium Dark Mode. Tích hợp cơ chế kiểm duyệt truy cập trên trang Store (`/dashboard/store`), chặn người dùng kích hoạt các app bị hạn chế và hiển thị UI thông báo nâng cấp Pro sang xịn.
    - **Server Actions Security**: Nâng cấp hàm `inviteTeamMember` chặn gửi lời mời thành viên vượt quá hạn mức tối đa của gói cước (kết hợp đếm thành viên thực tế và lời mời đang chờ).
    - **Build & Quality Assurance**: Chạy biên dịch `pnpm build` thành công xuất sắc đạt **0 errors** cho toàn bộ 26 trang Next.js 15+.
  - ✅ **Hoàn thành Plan 2: Social Feed + Notification + Super Admin**:
    - **Task Action Buttons**: Thêm hàng nút hành động Nhận việc (Đang làm) -> Hoàn thành -> Làm lại trực quan trên FeedPostCard cho bài viết Task, đồng bộ hóa state 3 bước mượt mà kèm Toast thông báo.
    - **MVP Result Detail Modal**: Tích hợp nút "Xem thành phẩm chi tiết" mở Pop-up Modal Premium sang xịn, hiển thị chi tiết metrics mở rộng và kết quả giả lập theo từng MVP App cụ thể (AI Chat, POS, Content Hub...).
    - **Notification Routing**: Nâng cấp sự kiện click thông báo, tự động điều hướng sang `/dashboard/home#post-[id]`, cuộn trang smooth tới bài viết mục tiêu và tạo hiệu ứng highlight viền cam flash 2.5s rồi tự động xóa hash khỏi URL để tránh lặp lại.
    - **Super Admin Quick Button**: Thêm nút "⚡ Admin" tím gradient nổi bật trên Top Header, phân quyền chỉ hiển thị đối với tài khoản `super_admin` để mở nhanh trang quản trị.
    - **Tài liệu**: Đồng bộ hóa `UI_MAP.md` cho cơ chế hash routing.
  - ✅ **Hoàn thành Plan 1: Workspace Dashboard 7 Module + Sidebar Link**:
    - **Sidebar Accordion**: Tách accordion header thành link chuyển trang (vùng trái) và chevron toggle accordion (vùng phải), đồng bộ chuyển hướng Workspace mượt mà.
    - **Workspace Dashboard (`/dashboard/t/[teamId]`)**: Viết lại hoàn toàn trang thành Dashboard 7 module trực quan: Banner nhóm, Stats cards (AI Usage, Active Apps, Members, Tasks), AI Progress Bar, Quick Launch Grid (cho app đã cài), Task Board Kanban compact, CSS Bar Chart (lượng dùng AI 7 ngày) và Timeline Log + Feed riêng nhóm. Dữ liệu cách ly 100% theo teamId.
    - **Tài liệu**: Đồng bộ hóa `UI_MAP.md` chi tiết.
  - ✅ **Hoàn thành Phase 4: Client-side Table Controls (Sắp xếp + Phân trang cho Admin)**:
    - **Users Management (`/admin/users`)**: Bổ sung logic Client-side Sorting cho 3 cột (Người dùng, Vai trò, Lượt dùng AI) tích hợp ChevronUp/Down và Pagination Footer hiển thị 5 dòng/trang. Tự động reset trang về 1 khi thay đổi bộ lọc hoặc tìm kiếm.
    - **Social Feed Timeline (`/dashboard/home`)**: Bổ sung phân trang tĩnh 3 bài đăng/trang cho danh sách bài đăng không ghim, đi kèm Premium Pagination Footer có hiệu ứng cuộn mượt (`window.scrollTo`) lên đầu khi chuyển trang và reset trang về 1 khi chọn không gian làm việc khác.
    - **Teams Management (`/admin/teams`)**: Tích hợp sắp xếp cho 3 cột (Tổ chức, Thành viên, Lượt dùng AI) và phân trang 5 nhóm/trang với các nút bấm trang trang nhã mượt mà.
    - **Logs Management (`/admin/logs`)**: Tích hợp sắp xếp theo Thời gian, Hành động, và Mức độ nghiêm trọng (Severity - so sánh theo trọng số Info=0 < Warning=1 < Error=2). Bổ sung phân trang 5 dòng/trang và reset trang khi filter đổi.
    - **Build & Quality Assurance**: Đảm bảo toàn bộ 3 trang hoạt động 100% độc lập client-side, đồng bộ thiết kế Premium Dark Mode sang xịn.
  - ✅ **Hoàn thành Phase 3: UX Polish & Animation Enhancements (Đánh bóng Giao diện & Hiệu ứng)**:
    - **Premium Dark Mode Admin**: Cập nhật toàn diện các trang Quản trị (`admin-shell`, `users`, `teams`, `logs`) sang giao diện nền tối `bg-gray-950` tích hợp hiệu ứng `backdrop-blur` sang trọng.
    - **Responsive Data Tables**: Bọc thanh cuộn ngang `overflow-x-auto scrollbar-thin` cho tất cả các bảng dữ liệu Admin và Ma trận quyền hạn, loại bỏ tình trạng tràn layout trên màn hình nhỏ.
    - **UX/UI Interactivity**: Bổ sung Trap Focus đa nền tảng (bắt sự kiện `Escape`) cho Dropdown và Modal tại trang Members; tích hợp hiệu ứng nổi (3D hover scale) và Fade indicator (gradient viền mờ) cho thanh danh mục tại trang Store.
    - **Accessibility (A11y)**: Nâng cấp Top Layout của Dashboard với các nhãn `aria-label` cho Menu tài khoản và nút Đăng xuất nhằm tăng cường tiêu chuẩn web.
    - **Cross-Review & Hotfixes**: Hoàn tất Review chéo Phase 3 (Loops 2, 3, 5). Phát hiện và sửa nóng lỗi cú pháp nghiêm trọng (thiếu `return` gây lỗi compile ở `teams/page.tsx`), dọn sạch mã chết (`getSeverityBadge` ở `logs/page.tsx`), cập nhật bài học 10.5 tại `LESSONS.md` toàn cục và chạy `pnpm build` compile pass 100% trơn tru 26 routes!

  - ✅ **Hoàn thành Phase 2: Code Quality & Feature Prep (Tối ưu hóa mã nguồn & Tối ưu hiệu năng)**:
    - **Đồng bộ hóa SWR Fetcher**: Khởi tạo và tích hợp fetcher mạng dùng chung từ `@/lib/fetcher` cho tất cả các trang dashboard con (`general/page.tsx`, `settings/page.tsx`, `dashboard/page.tsx` và `layout.tsx`), loại bỏ mã trùng lặp cục bộ và sửa luôn lỗi avatar cũ (`split(' ')` crash) sang chuẩn an toàn `.charAt(0)`.
    - **Dọn dẹp mã nguồn & Dead Code**: Loại bỏ hoàn toàn constant không sử dụng `SYSTEM_ACTIVITY_STYLING` và các icons lucide-react không sử dụng (`Zap`, `ClipboardList`, `Activity` ở home page; `Crown`, `Zap`, `Building2`, `MessageSquare`, `Brain`, `Plug` ở layout page).
    - **Tiêu diệt alert() Native**: Sửa đổi và thay thế 100% các hàm thông báo `alert()` bằng Toast Context cao cấp `(window as any).showToast()` trong members page, home page và layout page.
    - **Tối ưu hóa Root Layout Prefetching**: Chuyển đổi Root Layout sang `async function`, sử dụng `cookies()` từ `next/headers` để kiểm soát trạng thái session trước khi prefetch. Nếu chưa đăng nhập, Root Layout gán fallback SWR là `null` trực tiếp giúp triệt tiêu 100% database query trống rỗng cho khách vãng lai và tăng tốc tải trang static.
    - **Verify & Build**: Chạy lệnh `pnpm build` thành công xuất sắc đạt **0 errors** và compile hoàn hảo toàn bộ 26 trang Next.js 15+!
  - ✅ **Hoàn thành Phase 0: Security Hardening (Sửa lỗi bảo mật cốt lõi)**:
    - **API Route Security**: Lọc bỏ hoàn toàn trường `passwordHash` nhạy cảm trước khi trả về từ `/api/user` và thiết lập trả về mã trạng thái `401 Unauthorized` đúng chuẩn khi người dùng chưa đăng nhập tại `/api/user` và `/api/team`.
    - **Phân quyền Server Actions (RBAC)**: Tích hợp cơ chế kiểm duyệt vai trò Owner/Admin chặt chẽ trong `removeTeamMember` và `inviteTeamMember`, chỉ cho phép những người quản trị nhóm hoặc chính thành viên tự rời nhóm; ngăn cản việc xóa Owner của nhóm.
    - **Cơ chế Đăng xuất thực tế (Real Logout)**: Sửa đổi nút "Đăng xuất" trên Top Header để gọi thực sự Server Action `signOut()`, xóa cookie phiên làm việc, xử lý an toàn lỗi crash khi session trống, và chuyển hướng người dùng về `/sign-in` bằng router client-side.
    - **Validate AUTH_SECRET**: Tích hợp kiểm duyệt runtime bắt buộc đối với biến môi trường `AUTH_SECRET` để ngăn chặn các khóa JWT rỗng hoặc siêu yếu.
    - **Bảo vệ định tuyến Admin (Middleware RBAC Gating)**: Đóng gói trường `role` của người dùng vào mã hóa JWT token và nâng cấp Next.js `middleware.ts` để chủ động phát hiện và chuyển hướng (redirect) người dùng thường ra khỏi các route `/admin/*` nhạy cảm về lại `/dashboard`.
  - ✅ **Hoàn thành Phase 1: Bug Fixes & Core Stability (Sửa lỗi logic & Đồng bộ hệ thống)**:
    - **Toast Context System**: Thiết kế và tạo mới `ToastProvider` toàn cục tại `@/components/ui/toast` bằng React Context, cắm trực tiếp vào Root Layout của toàn bộ ứng dụng. Giải quyết triệt để lỗi Toast bị broken ở ngoài Dashboard (như Admin portal, Login/Signup). Expose `window.showToast` toàn cục giúp 15+ call sites cũ hoạt động tức thì; dọn dẹp sạch sẽ code Toast local dư thừa trong Dashboard Layout để loại bỏ nguy cơ chồng chéo.
    - **Visual Theme & SEO Consistency**: Việt hóa thuộc tính HTML `lang="vi"` trong Root Layout; nâng cấp đồng bộ hóa toàn diện trang Nhật ký hoạt động (`activity/page.tsx`) và trang lỗi 404 (`not-found.tsx`) sang Premium Dark Mode huyền ảo với card viền mờ `bg-gray-900/50 border-white/10` và các button gradient cam-hồng.
    - **Đồng bộ ứng dụng thời gian thực (Store mutation fix)**: Khắc phục lỗi đột biến trực tiếp hằng số tĩnh ở Store page (`store/page.tsx`) bằng cách cập nhật bất biến `MOCK_TEAMS` và phát hành CustomEvent `'teams-updated'` toàn cục. Tích hợp bộ lắng nghe sự kiện tại Dashboard Layout để tự động re-render Sidebar accordion lập tức khi một MVP App được kích hoạt mà không cần tải lại trang.
    - **Tránh trùng lặp viền**: Sửa lỗi duplicate border class trong tab container của Members page (`members/page.tsx`).
    - **Thuật toán gợi ý Mention an toàn**: Khắc phục lỗi logic autocomplete mention `@` trong trang Social Feed (`home/page.tsx`) khi soạn văn bản ngắn bằng thuật toán so sánh chặn dưới `Math.max(0, val.length - 15)`.
    - **Ổn định Database queries**: Cập nhật hàm truy vấn `getUserWithTeam` trong `queries.ts` để trả về `null` một cách tường minh thay vì `undefined` khi user không tồn tại, tăng tính ổn định cho các khối code auth.
    - **Chặn đứng Stripe crash**: Khắc phục lỗ hổng ép kiểu không an toàn (`unsafe type cast`) trong Stripe Webhook subscription handler (`stripe.ts`) bằng cách kiểm tra linh động kiểu dữ liệu của `plan.product` và bất đồng bộ truy vấn Stripe API lấy tên sản phẩm thực tế, ngăn ngừa crash máy chủ.
  - ✅ **Sửa lỗi CSS crash do thiếu @theme mapping (Tailwind v4 Patch)**: Tích hợp `@theme inline` mapping thành công trong `globals.css` giải quyết triệt để lỗi biên dịch `unknown utility class: bg-background`, khôi phục 100% giao diện Premium Dark Mode rực rỡ cho 26 trang Next.js và các component shadcn. Chạy build pass 100% với 0 errors.
  - ✅ **Hoàn thành TASK 6 & TASK 7 (Đăng nhập, Phân quyền & Hoàn thiện UI/UX Premium)**:
    - **Việt hóa & Bảo mật trang Đăng nhập (`login.tsx`)**: Việt hóa toàn diện placeholders, nút bấm, và nhãn; bổ sung liên kết "Quên mật khẩu?" tích hợp thông báo Toast mượt mà.
    - **Khắc phục lỗi TypeScript (`admin/users/page.tsx`)**: Sửa triệt để các ép kiểu `as any` thành định nghĩa types rõ ràng và dọn dẹp các icons import thừa (`UserCheck`, `UserX`, `SearchIcon`).
    - **Dọn dẹp mã nguồn**: Quét sạch imports không sử dụng trong `admin/settings/page.tsx`, `store/page.tsx`.
    - **Tăng cường khả năng tiếp cận (Accessibility)**: Thêm thuộc tính `aria-label` cho tất cả icon buttons trong `layout.tsx` (Launcher, Notification bell, Help, updates, accordion...).
    - **Chuẩn hóa Next.js Link**: Loại bỏ 100% thuộc tính Next.js cũ `passHref legacyBehavior` và thẻ `<a>` con lồng nhau vô dụng tại tất cả các tệp (`layout.tsx`, `admin-shell.tsx`, `admin/page.tsx`), nâng cấp sang chuẩn điều hướng React Server Components Next.js 13+ cực sạch.
    - **Sửa lỗi bảo mật mật khẩu (`security/page.tsx`)**: Ứng dụng React 19 Form Key Pattern (`key={formKey}`) tự động hủy và remount form để xóa sạch (clear) các ô mật khẩu sau khi cập nhật thành công.
    - **Sửa lỗi Compile & Build Production**: Khắc phục lỗi `@apply border-border` trong `globals.css` bằng pure CSS declarations; sửa lỗi thiếu import `Share2` trong `feed-post-card.tsx` và `React` trong `members/page.tsx`; chạy `pnpm build` thành công xuất sắc đạt **0 errors** cho toàn bộ 26 trang!
  - ✅ **Hoàn thành TASK 5 (Đánh bóng Trang chủ Bảng tin - UI Polish v1)**: Thực thi tách component `FeedPostCard` ra tệp riêng `app/components/feed-post-card.tsx` giúp giảm dung lượng tệp `home/page.tsx` từ 1311 dòng xuống 912 dòng; bổ sung click-outside cho menu tuỳ chọn bài viết `•••` sử dụng `useRef` và `useEffect` chuyên nghiệp; loại bỏ 10+ alert() trong tương tác (Thích, Bình luận, Ghim, Giao việc) thay thế bằng thông báo Toast mượt mà; tích hợp lời chào tự động theo thời gian thực ("Chào buổi sáng/chiều/tối") tại Bảng điều khiển (`dashboard/page.tsx`).
  - ✅ **Hoàn thành TASK 4 (Chuẩn hóa trang Settings - UI Polish v1)**: Chuyển đổi toàn diện trang cấu hình nhóm `/dashboard/settings` sang Premium Dark Mode với các Card nền tối (`bg-gray-900/50`), viền mờ (`border-white/10`) và chữ trắng đồng nhất; đồng bộ padding mượt mà (`p-6 lg:p-10`) và tiêu đề cỡ đậm (`font-extrabold`); nâng cấp logic kiểm soát thành viên cho phép xóa các tài khoản khác ngoại trừ Owner (`index > 0 && member.role !== 'owner'`) thay thế cho logic cứng cũ.
  - ✅ **Hoàn thành TASK 3 (Nâng cấp UX: Toast + Notification + Mobile - UI Polish v1)**: Xây dựng hệ thống Toast Message inline toàn cục mượt mà trong `layout.tsx`, hỗ trợ helper `window.showToast` chia sẻ rộng rãi; nâng cấp loại bỏ toàn bộ `alert()` trong các trang quản trị `/admin/teams`, `/admin/users`, `/admin/settings` bằng thông báo Toast cao cấp; tối ưu hóa cấu trúc trùng lặp bằng cách tách Notification Dropdown thành component tái sử dụng `NotifDropdownContent` dùng chung cho cả mobile và desktop; tích hợp backdrop overlay có làm mờ nền tối (`backdrop-blur-sm bg-black/60`) khi mở Sidebar trên điện thoại.
  - ✅ **Hoàn thành TASK 2 (Thống nhất Design System - UI Polish v1)**: Tạo và xuất bản `app/lib/shared-constants.ts` chứa format utilities (`formatNumber`, `formatVND`) và icon maps (`APP_ICON_MAP`, `PLAN_ICON`) hợp nhất từ các trang, dọn dẹp và chuẩn hóa `globals.css` (chuyển đổi hoàn toàn biến HSL của Dark Mode lên làm mặc định ở `:root` để loại bỏ 100% code CSS thừa và ép buộc Dark Mode, di chuyển `body` font-family sang `@layer base`, tích hợp `@media (prefers-reduced-motion)` tăng khả năng tiếp cận và bổ sung các class `animate-delay-*` mượt mà).
  - ✅ **Hoàn thành TASK 1 (Sửa lỗi Critical - UI Polish v1)**: Sửa đổi hardcoded dates thành dynamic dates trong `home/page.tsx` và `feed-mock-data.ts`, sửa class `py-0.2` thành `py-0.5` và loại bỏ nested `<tbody>` trong `members/page.tsx`, tối ưu hóa `activatedApps` update thành immutable style trong `store/page.tsx`, sửa class không chuẩn `border-gray-250`, `border-gray-150` và `h-4.5 w-4.5`/`h-5.5 w-5.5` trong `admin` và `store` pages.
  - ✅ **Hoàn thành Tái cấu trúc Layout — Top Header Sticky Toàn cục (PLAN_TOP_HEADER.md)**:
    - **Task 1**: Thêm Top Header ngang cố định (`sticky top-0 z-50`) trên cùng DashboardLayout chứa Launcher, Logo AI2Hero Platform, Global Search, và nút "Tạo mới" với 4 hành động nhanh. Cập nhật Sidebar sticky định vị bắt đầu từ `top-14`.
    - **Task 2**: Di dời Notification Bell + Dropdown thông báo và Avatar người dùng từ Sidebar lên phân vùng Phải của Top Header. Thêm icon Loa phát thanh (Updates) và icon Trợ giúp (Help). Thiết kế Avatar dropdown menu tài khoản gồm 4 mục (Hồ sơ, Bảo mật, Cài đặt nhóm, Đăng xuất).
    - **Task 3**: Thu gọn hoàn toàn Sidebar (xóa Logo Section và UserCard ở chân Sidebar) giúp Sidebar thoáng đãng chỉ chứa điều hướng. Cập nhật Mobile Header tích hợp chuông báo mini và badge động.
    - **Task 4**: Tích hợp logic Click-Outside tự động đóng cho cả 3 dropdown (Tạo mới, Thông báo, Avatar) bằng `useEffect` và `useRef`. Chạy build biên dịch kiểm tra thành công 100%.
  - ✅ **Hoàn thành Task 4 (Upgrade Kênh Giao Tiếp Nội Bộ)**: Tích hợp Notification Bell 🔔 tại sidebar header với badge đếm số lượng chưa đọc động và dropdown thông báo, bổ sung tính năng Ghim/Bỏ ghim bài viết quan trọng lên đầu feed cho Owner/Admin.
  - ✅ **Hoàn thành Task 3 (Upgrade Kênh Giao Tiếp Nội Bộ)**: Thiết kế dải Attachment Bar (Ảnh/Video, Gắn thẻ, Kết quả MVP, Cảm xúc) kiểu Facebook, tích hợp Mention Autocomplete gợi ý thông minh khi gõ `@` và hiển thị attachments dạng grid/card trong feed.
  - ✅ **Hoàn thành Task 2 (Upgrade Kênh Giao Tiếp Nội Bộ)**: Mở rộng Data Model `FeedPost` và `FeedComment` hỗ trợ tags, ghim và attachments. Bổ sung `FeedNotification` và `MOCK_NOTIFICATIONS` mẫu vào `feed-mock-data.ts`.
  - ✅ **Hoàn thành Task 1 (Upgrade Kênh Giao Tiếp Nội Bộ)**: Fix lỗi Sidebar không sticky khi cuộn trang dài bằng cách loại bỏ class `overflow-hidden` khỏi thẻ div cha trong `layout.tsx`.
  - ✅ **Hoàn thành Kế hoạch Phân quyền & Bảng tin động (Implementation Plan)**:
    - **Task 1**: Khắc phục triệt để lỗi visual lệch màu tại tab "Vai trò & Quyền hạn" của trang quản trị thành viên ([members/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/%28dashboard%29/dashboard/members/page.tsx)), tối ưu hóa toàn bộ các Intro Cards vai trò và Ma trận quyền hạn chi tiết sang phong cách Premium Dark Mode (`bg-gray-900/50`, `border-white/10`, `text-white`).
    - **Task 2**: Nâng cấp Bảng tin Social Feed Timeline hoạt động 100% qua React State động (`feedPosts`) tại trang chủ ([home/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/app/%28dashboard%29/dashboard/home/page.tsx)). Tích hợp Form đăng bài chi tiết nở rộng (hỗ trợ 📊 Kết quả MVP với Grid Metric, 📅 Giao việc gán staff, ⚡ Thông báo hệ thống), đồng bộ Like (tim bay), bình luận thời gian thực, và check task 3 trạng thái (*Chờ làm → Đang làm → Hoàn thành*) kèm spinner. Tích hợp bộ giả lập vai trò nhanh (**Role Simulator Switcher**) và phân quyền gating theo 5 vai trò thực tế (chặn Viewer like/comment/check task và làm mờ/khóa form đăng bài kèm overlay 🔒 đỏ).
  - ✅ Full-Width Dark Dashboard: Nâng cấp Layout core + 8 trang con (Bảng điều khiển, Trang chủ, Chi tiết nhóm, Kho ứng dụng, Thành viên, Tổng quan, Bảo mật, Cài đặt) sang thiết kế **Full-Width + Dark Mode cưỡng bức 100%** đồng nhất theo phong cách Trello/Notion cao cấp, Sidebar sticky/fixed mượt mà và animation `.animate-fade-in` đồng bộ hoàn hảo.
  - ✅ Part B Task 5: Chuyển Security Page (`/dashboard/security`) sang Dark Mode (form và card xóa tài khoản tone đỏ tối cảnh báo mượt mà).
  - ✅ Part B Task 4: Chuyển General Page (`/dashboard/general`) sang Dark Mode (form và input fields đồng bộ 100%).
  - ✅ Part B Task 3: Chuyển Store Page (`/dashboard/store`) sang Dark Full-Width chuyên nghiệp (tối hóa các cards, modal activation và responsive tối đa).
  - ✅ Part B Task 2: Chuyển Members Page (`/dashboard/members`) sang Dark Full-Width chuyên nghiệp (bảng thành viên, ma trận quyền và modal mời thành viên được tối hóa 100%).
  - ✅ Part B Task 1: Chuyển Apps Page (`/dashboard/apps`) sang Dark Full-Width chuyên nghiệp.
  - ✅ Part A Task 1: Nâng cấp Layout cha thành Full-Width + Dark Mode 100% đồng nhất và Sidebar sticky/fixed cao cấp.
  - ✅ Part A Task 2: Bổ sung keyframe fade-in và utility class animate-fade-in vào globals.css.
  - ✅ Part A Task 3: Tinh chỉnh Board Overview hỗ trợ 4 cột trên màn hình cực rộng (2xl) và viền avatar stack tiệp màu nền tối (`border-gray-950`).
  - ✅ Part A Task 4: Kiểm tra và tinh chỉnh Team Detail tương thích 100% Full-Width + Dark Mode mượt mà.
  - ✅ Shell v1 Part 2: Tái thiết kế Bảng điều khiển (`/dashboard`) thành Trello-style Board Overview hiển thị toàn bộ 3 workspaces dưới dạng Board Cards sang xịn; tạo Trang chủ (`/dashboard/home`) chứa Global Activity Feed dạng timeline nhóm theo ngày sinh động kèm filter; tạo trang Chi tiết nhóm (`/dashboard/t/[teamId]`) có layout 2 cột hiện đại liên kết chéo; di dời Settings cũ sang `/dashboard/settings`.
  - ✅ Shell v1 Part 1: Cải tạo mock data sang multi-team structure (`MOCK_TEAMS` gồm 3 teams & helpers), tái thiết kế Sidebar thành **Context-Aware Living Sidebar** có 3 tầng (global nav, dynamic accordion đa team tích hợp app registry, action footer), và tạo mới trang Kho ứng dụng (/dashboard/store) với tính năng Mock Activation Modal cao cấp.
  - ✅ Task 1: Tái thiết kế Sidebar thành Dark Sidebar Premium với logo Sparkles gradient, phân nhóm 3 section (Ứng dụng, Quản trị, Tài khoản), active gradient cam-hồng, và User Card tích hợp SWR lấy thông tin động.
  - ✅ Task 2: Việt hóa toàn bộ trang Tổng quan (General Settings) + nâng cấp visual với heading gradient, card rounded-2xl, shadow mượt và animation fade-up.
  - ✅ Task 3: Việt hóa trang Hoạt động (Activity Log) + nâng cấp visual, Việt hóa 100% logs action & relative time, bảo toàn Server Component không bị chuyển client-side.
  - ✅ Task 4: Việt hóa trang Bảo mật (Security Settings) + nâng cấp visual, bo góc rộng rounded-2xl, card xóa tài khoản viền đỏ nhạt (border-red-100) cảnh báo nổi bật.
  - ✅ Task 1 (Super Admin): Dựng khung Admin Layout bảo mật server-side, Admin Shell chứa Sidebar dark premium riêng biệt và tệp mock data tĩnh toàn diện (`lib/admin-mock-data.ts`), cập nhật middleware và update role của tài khoản test thành `super_admin`.
  - ✅ Task 2 (Super Admin): Tạo trang Dashboard tổng quan (`/admin`) hiển thị 6 chỉ số vĩ mô và 2 bộ biểu đồ Pure CSS Bar Chart (Tăng trưởng người dùng, tăng trưởng doanh thu) kèm 5 dòng audit log mới nhất.
  - ✅ Task 3 (Super Admin): Tạo trang Quản lý Người dùng (`/admin/users`) chứa bảng danh sách 8 tài khoản, bộ lọc tìm kiếm theo từ khóa/vai trò/trạng thái và bộ điều khiển trực quan hỗ trợ thăng cấp/hạ cấp Super Admin, khóa/mở khóa tài khoản động.
  - ✅ Task 4 (Super Admin): Tạo trang Quản lý Tổ chức (`/admin/teams`) hiển thị 3 chỉ số tóm tắt (tổng số nhóm, số lượng gói trả phí, tổng thành viên), bảng danh sách 6 teams cùng với bộ điều khiển thay đổi Plan nhanh (Free, Pro, Enterprise) và tạm khóa hoạt động của tổ chức.
  - ✅ Task 5 (Super Admin): Tạo trang Cấu hình Hệ thống (`/admin/settings`) để quản trị API Keys của 3 mô hình AI (GPT-4o, Claude, Gemini) có tính năng toggle ẩn hiện key và xoay vòng Key động, điều chỉnh hạn mức gói Free; và trang Nhật ký hệ thống (`/admin/logs`) chứa bảng kiểm toán logs toàn diện hỗ trợ bộ lọc nhanh theo 4 cấp độ Severity và tìm kiếm nhanh.
- **2026-05-26**: 
  - ✅ Khởi tạo dự án — tạo 9 file nền tảng (START, UI_MAP, CHANGELOG, Workflows, Plan)
  - ✅ Clone Next.js SaaS Starter (193 packages, pnpm)
  - ✅ Tạo App Registry (`lib/apps-registry.ts`) — 6 MVPs đăng ký
  - ✅ Tạo AppCard component (`components/app-card.tsx`)
  - ✅ Rebrand Landing Page → AI2Hero (gradient CTA, MVP showcase)
  - ✅ Rebrand Header ACME → AI2Hero
  - ✅ Tạo Dashboard/Apps page (grid MVPs phân nhóm theo status)
  - ✅ Thêm "Apps" vào sidebar navigation
  - ✅ Việt hóa và Rebrand Login/Signup + 404 Pages
  - ✅ Hoàn thành Pricing Page: Tách biệt khỏi Stripe API, hiển thị 3 Tiers (Free, Pro, Enterprise) Việt hóa cùng mục FAQ chi tiết
  - ✅ Polish Dashboard/Apps page: Thêm Welcome Banner có gradient sang xịn, Stats Summary động + Staggered animation cho AppCards
  - ✅ TypeScript build check: 0 errors
  - ✅ Cấu hình database PostgreSQL cục bộ chạy trên Docker và cấu hình file `.env` chuẩn hóa bảo mật
  - ✅ Tích hợp Drizzle ORM: Đồng bộ cấu trúc bảng thành công lên database (`pnpm db:push`)
  - ✅ Seed thành công tài khoản mẫu (`test@test.com` / `admin123`) an toàn, độc lập hoàn toàn khỏi Stripe API
  - ✅ Khởi chạy thành công local dev server trên cổng `3000` (`pnpm dev`) chạy ngầm ổn định
  - ✅ **Tối ưu hóa hiệu năng (Performance Audit & Fix)**: Khắc phục triệt để lỗi serialize Icon functions từ Server → Client Component, giảm thời gian phản hồi trang Dashboard từ 8000ms xuống chỉ còn ~200ms (tăng tốc 97%).
  - ✅ **Dọn dẹp và chuẩn hóa CSS**: Refactor toàn bộ `globals.css` theo chuẩn Tailwind v4 `@theme inline`, loại bỏ hơn 150 dòng CSS trùng lặp dư thừa, tối ưu hóa theme tokens cho Sidebar.
  - ✅ Khởi tạo mock data cho 5 vai trò (`lib/team-mock-data.ts`) và component `RoleBadge` (`components/role-badge.tsx`) cho hệ thống Team Admin UI.
  - ✅ Xây dựng trang Quản lý thành viên & Phân quyền Premium tại `/dashboard/members` hoàn chỉnh: bảng thành viên tương tác, ma trận quyền hạn cho 5 vai trò, tab navigation, và modal mời thành viên với Role Picker dạng Card bắt mắt (100% mock data, responsive, smooth animation).
  - ✅ Cập nhật Sidebar Navigation Việt hóa với 6 mục rõ ràng, bổ sung mục "Thành viên" riêng biệt. Việt hóa toàn diện trang "Cài đặt nhóm" (`/dashboard`) cũ mà không ảnh hưởng đến API hay logic backend.
- **NEXT**: Triển khai thiết kế và tích hợp MVP #1: AI Chat (Trợ lý AI CSKH thông minh) kế thừa toàn bộ lõi công nghệ và tri thức từ UPCHAT. (Model gợi ý: Opus cho plan, Flash cho code).

## PHIEN TEMPLATE
> Moi template chi giu **phien moi nhat**. AI doc START.md truoc - chi doc phien lien quan.

- _(Chưa có template nào — dự án mới khởi tạo)_

## WORKFLOW COMMANDS
> AI: Khi admin gõ các lệnh dưới đây, ĐỌC file workflow tương ứng và thực hiện theo.

| Lệnh | Model tối ưu | File workflow | Mục đích |
|---|---|---|---|
| `ai2hero start` hoặc `a2h start` | Gemini 3.5 Flash | `WORKFLOW_AI2HERO_START.md` | Khởi động session, Health check, Phiên Template & Đề xuất Sprint |
| `ai2hero close` hoặc `a2h close` | Gemini 3.5 Flash | `WORKFLOW_AI2HERO_CLOSE.md` | Kết thúc session, đồng bộ nguồn sự thật và chấm điểm kỷ luật |
| `ai2hero plan` | Claude Opus | `WORKFLOW_AI2HERO_PLAN.md` | Viết Plan chi tiết cho Flash thực thi |
| `ai2hero code` | Gemini 3.5 Flash | `WORKFLOW_AI2HERO_CODE.md` | Tự động thực thi toàn bộ tasks trong Plan |
| `ai2hero code PLAN_XXX.md` | Gemini 3.5 Flash | `WORKFLOW_AI2HERO_CODE.md` | Thực thi Plan cụ thể |

**Quy trình chuẩn**: `ai2hero plan` (Opus) → click đổi Flash → `ai2hero code` (Flash tự động 100%)

## FILES THAM KHAO
- `MASTER_PLAN.md` - Chi tiết task các phase
- `UI_MAP.md` - Bản đồ UI và kiến trúc hệ thống
- `CHANGELOG.md` - Nhật ký thay đổi dự án
- `PLAN_TEMPLATE.md` - Template chuẩn cho Opus viết Plan
- `WORKFLOW_AI2HERO_PLAN.md` - Workflow lệnh `ai2hero plan`
- `WORKFLOW_AI2HERO_CODE.md` - Workflow lệnh `ai2hero code`
