# Hướng Dẫn Tích Hợp MVP (Mini-SaaS) vào Hệ Thống Ai2Hero

Tài liệu này quy định các bước chuẩn mực để khởi tạo và tích hợp một ứng dụng MVP mới vào hệ sinh thái Ai2Hero. Hệ thống Ai2Hero sử dụng kiến trúc Multi-Tenant, nghĩa là một ứng dụng duy nhất phải có khả năng phục vụ nhiều Không gian làm việc (Workspace/Team) và dữ liệu phải được cách ly hoàn toàn dựa trên `teamId`.

## Giai đoạn 1: Khởi tạo Database & Schema

1. **Thêm trường `teamId` bắt buộc:** 
   Mọi bảng dữ liệu thuộc về MVP (ví dụ: `sim_assets`, `sim_logs`) ĐỀU PHẢI có cột `teamId` liên kết với bảng `teams`.
   
   ```typescript
   export const myMvpTable = pgTable('my_mvp_table', {
     id: serial('id').primaryKey(),
     teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
     // ... các trường khác
   });
   ```

2. **Cách ly dữ liệu (Data Isolation):**
   Mọi Query Select/Update/Delete đều phải đi kèm với `.where(eq(table.teamId, currentTeamId))`. Không bao giờ được phép Query toàn bộ bảng mà thiếu `teamId`.

## Giai đoạn 2: Đăng ký MVP vào hệ thống

1. **Mở tệp `app/lib/apps-registry.ts`:**
   Khai báo thông tin ứng dụng mới vào mảng `APPS`.
   
   ```typescript
   {
     id: 'my-mvp',
     name: 'Tên Ứng Dụng',
     description: 'Mô tả ngắn gọn',
     icon: 'LucideIconName',
     path: '/my-mvp/dashboard', // Thường là thư mục ngoài dashboard core
     status: 'beta',
     tier: 'free',
     category: 'management',
     color: 'from-blue-500 to-indigo-500',
   }
   ```

2. **Cập nhật dữ liệu Mock (nếu chưa có DB):**
   Nếu hệ thống đang chạy bằng mock data, hãy thêm `id` của ứng dụng vào trường `activatedApps` trong mảng `MOCK_TEAMS` tại `app/lib/team-mock-data.ts`.

## Giai đoạn 3: Cơ chế Routing và Navigation

1. **Cấu trúc thư mục:**
   Mỗi MVP nên có một thư mục Route Group riêng trong `app/app/(dashboard)/` (ví dụ: `app/app/(dashboard)/sim/`). Tránh trộn lẫn mã nguồn của MVP vào mã nguồn lõi của Dashboard.

2. **Cơ chế nhận diện Không gian làm việc (Cookie-based):**
   Hệ thống sử dụng Cookie `activeTeamId` để biết người dùng đang ở trong Không gian làm việc nào. 
   Khi người dùng click chọn ứng dụng từ Sidebar, `dashboard/layout.tsx` sẽ tự động cập nhật `activeTeamId` vào Cookie.

3. **Truy xuất Team ID trong MVP:**
   Trong mã nguồn của MVP, khi cần lấy ID của Không gian làm việc hiện tại, hãy sử dụng Cookie Helper thay vì Query lại database:
   
   ```typescript
   import { getActiveTeamCookie } from '@/lib/team-cookie';
   
   export async function getMyMvpData() {
     const teamId = await getActiveTeamCookie();
     if (!teamId) throw new Error("Chưa chọn không gian làm việc");
     
     // Truy vấn DB với teamId
     return db.select().from(myMvpTable).where(eq(myMvpTable.teamId, teamId));
   }
   ```

## Giai đoạn 4: Giao diện và Thẩm mỹ (UI/UX)

1. **Kế thừa Layout:**
   MVP có thể có Layout riêng với thanh TopHeader và Sidebar riêng (để chứa các menu con của ứng dụng). 
   
2. **Nút Quay lại Không gian:**
   Luôn phải có đường dẫn rõ ràng giúp người dùng thoát khỏi MVP và quay lại Bảng điều khiển (Dashboard) của Không gian làm việc.

## Giai đoạn 5: Cập nhật Tài Liệu & Đồng Bộ Hệ Thống (Nguồn Sự Thật)

Tích hợp code là chưa đủ. Để hệ thống luôn nhất quán và các AI/Developers làm việc sau dễ dàng nắm bắt cấu trúc, việc cập nhật tài liệu dự án là **bắt buộc**:

1. **Cập nhật [UI_MAP.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/UI_MAP.md) (Quy định bắt buộc):**
   - Đăng ký MVP mới và các route con vào **Sơ đồ Mermaid** tổng quan ở đầu file.
   - Viết tài liệu chi tiết cho từng sub-page của MVP (ví dụ: `/my-mvp/dashboard`, `/my-mvp/settings`) chứa đủ 4 mục chuẩn:
     - **Chức năng**: Trang này làm nhiệm vụ gì cụ thể.
     - **Vai trò trong hệ thống**: Định vị là `MVP App`, `Data module`, hay `UI thuần`.
     - **Đọc/Ghi data từ đâu**: Liệt kê rõ table Postgres hoặc file mock data dùng để tương tác.
     - **Liên kết**: Danh sách các liên kết đi và đến trang này (bao gồm nút quay lại Dashboard).
   - Cập nhật sơ đồ luồng dữ liệu (Data flow) ở cuối file thể hiện luồng dữ liệu từ DB scoped theo `teamId` đến MVP.

2. **Cập nhật [START.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/START.md) (Bắt buộc sau mỗi task hoàn thành):**
   - Ghi nhận chi tiết kết quả tích hợp MVP mới tại mục `## TIEN DO GAN NHAT` cùng ngày tháng hoàn thành.
   - Cập nhật trạng thái Phase nếu MVP mới là mục tiêu của Phase hiện tại.
   - Thêm các quyết định kiến trúc đã thống nhất vào mục `## QUYET DINH DA CHOT` (ví dụ: cách ly qua Cookie, đồng bộ Header...).

3. **Cập nhật [CHANGELOG.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/CHANGELOG.md):**
   - Ghi lại nhật ký thay đổi kỹ thuật của MVP khi kết thúc phiên làm việc (`/up-close`).

## Giai đoạn 6: Quy tắc Kỹ thuật & Sửa lỗi Compile TypeScript

Để đảm bảo dự án luôn biên dịch thành công 100% với `pnpm build` (đạt **0 errors**), khi viết code cần tuân thủ các quy tắc sau:

1. **Phân biệt Server Actions và RPC JSON Actions**:
   - **Validated Actions (`validatedActionWithUser`)**: Mong muốn nhận tham số `(prevState, formData)`. Đây là chuẩn của các Form Next.js 15.
   - **RPC JSON Actions**: Nếu Client Component gọi trực tiếp từ JS handler (ví dụ: `onClick={async () => { await action({ id }) }}`), **BẮT BUỘC** phải viết Server Action dạng JSON RPC sạch, nhận tham số JSON phẳng dạng `async function action(data: { id: number })` và tự kiểm tra session qua `getUser()`. Tránh gọi trực tiếp Validated Actions từ JS event handler để không bị lỗi TypeScript mismatch tham số (*Expected 2 arguments, but got 1*).

2. **Quy tắc Import & Compile tĩnh**:
   - Khi chỉnh sửa hoặc viết các hàm truy vấn dữ liệu mới trong `queries.ts`, luôn rà soát kỹ phần import ở đầu file. Đảm bảo mọi thực thể Drizzle ORM (như `invitations`, `feedPosts`...) đều được import đầy đủ từ tệp schema.
   - Khi sử dụng các Icon từ `lucide-react`, hãy kiểm tra kỹ để tránh trường hợp sử dụng Icon trong JSX (ví dụ `<MoreVertical />`) nhưng lại import nhầm Icon khác (ví dụ `MoreHorizontal`), gây lỗi compile nghiêm trọng.

## Giai đoạn 7: Kết nối Social Feed qua Dispatcher

Để mọi cập nhật quan trọng từ MVP (ví dụ: HeroSim phát hiện 3 sự cố bảo mật mới, AI Chat tự động xử lý 50 hội thoại) được xuất bản tự động lên Bảng tin chung một cách an toàn và nhất quán, **BẮT BUỘC** các MVP phải gọi qua cổng kết nối duy nhất **`Feed Dispatcher Engine`** thay vì tự ý chèn trực tiếp vào database.

1. **Import Dispatcher Engine:**
   ```typescript
   import { dispatchMvpFeedPost } from '@/lib/db/feed-dispatcher';
   ```

2. **Cách gọi từ Server Action / Worker của MVP:**
   ```typescript
   const result = await dispatchMvpFeedPost({
     teamId: currentTeamId,
     userId: currentUser.id,
     type: 'mvp_result', // hoặc 'system_activity'
     appId: 'sim', // Tên ID của MVP đăng ký trong apps-registry.ts
     message: 'Hệ thống SimGuard vừa phát hiện và tự động chặn đứng 3 SIM có dấu hiệu spam tin nhắn vượt hạn mức.',
     resultPreview: 'Chặn đứng hành vi spam SIM #0987654321, bảo vệ an toàn cho hạn mức tổng của tổ chức.',
     resultMetrics: [
       { label: 'SIM đã chặn', value: '3 SIM' },
       { label: 'Mức độ rủi ro', value: 'Cao 🚨' },
       { label: 'Thời gian xử lý', value: '0.4s' }
     ]
   });
   
   if (result.success) {
     console.log('Đã đẩy tin lên Social Feed thành công, postId:', result.postId);
   } else {
     console.error('Lỗi khi đẩy tin lên Social Feed:', result.error);
   }
   ```

3. **Cơ chế tự động hóa:**
   - Hàm `dispatchMvpFeedPost` sẽ tự động chuẩn hóa dữ liệu an toàn để tránh crash trang Social Feed client-side.
   - Hàm sẽ tự động tạo thông báo chuông (Bell Notification) thời gian thực gửi tới toàn bộ thành viên khác trong cùng Workspace.

---

> [!TIP]
> Việc sử dụng Cookie để lưu trạng thái Không gian làm việc giúp giải quyết bài toán "URL rác" (không cần nhồi `[teamId]` vào mọi URL của MVP), đồng thời giữ cho liên kết Sidebar luôn sạch và đẹp.
