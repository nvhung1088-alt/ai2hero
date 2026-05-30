# PLAN_PRE_LAUNCH — Hoàn thiện Hệ thống Trước khi Online
> Ngày tạo: 2026-05-29
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 7
> Ước tính: ~40 phút cho Flash thực thi
> Nguồn: Tổng hợp từ 2 vòng audit (phiên 5efe18dd + phiên hiện tại 9d23b453)

## MỤC TIÊU TỔNG
Vá toàn bộ lỗ hổng bảo mật, loại bỏ file nhạy cảm, tối ưu database, dọn sạch artifacts dev-only, và chuẩn hóa production config — đưa hệ thống AI2Hero từ trạng thái "phát triển hoàn tất" sang "sẵn sàng triển khai Internet".

## BỐI CẢNH KIẾN TRÚC
- **Monolith Next.js 16 App Router** với PostgreSQL qua Drizzle ORM
- Multi-tenant qua `teamId` scope trên mọi bảng nghiệp vụ
- Auth: JWT (HS256) qua jose, session cookie httpOnly
- Middleware: Bảo vệ `/dashboard`, `/admin`, `/sim`; BYPASS `/api/*`
- Cookie `activeTeamId` dùng để scope workspace hiện hành (thiếu cờ bảo mật)
- Xem chi tiết: [UI_MAP.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/UI_MAP.md)

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: Logic nghiệp vụ MVP SIM (sim-actions.ts, sim-queries.ts, các trang /sim/*)
- KHÔNG đổi tên: Các hàm public API đang được import ở nhiều nơi (getUser, getTeamsForUser, verifyTeamAccess)
- KHÔNG phá vỡ: Build production hiện tại (0 errors trên 30 routes)
- CSS: Giữ nguyên Dark Mode / Glassmorphism conventions
- Data: schema.ts = nguồn sự thật database schema

## LESSONS CẦN NHỚ
- **1.1**: Sửa 1 file → test → mới qua file tiếp (tránh domino)
- **1.2**: KHÔNG đổi tên biến/hàm đang chạy tốt
- **1.3**: Giữ nguyên comment cũ, chỉ sửa code

---

## TASK 1: Xóa file mật khẩu nhạy cảm & Cập nhật .gitignore

### 1.1. Mô tả
File `Mật khẩu Chrome.csv` (150KB) chứa mật khẩu thực nằm trong thư mục gốc dự án. `.gitignore` KHÔNG loại trừ file này. Nếu push lên Git → rò rỉ toàn bộ credentials. Đây là lỗ hổng **CRITICAL** cần xử lý đầu tiên.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/.gitignore` | MODIFY | ~5 dòng |
| `app/Mật khẩu Chrome.csv` | DELETE | xóa file |

### 1.3. Code Snapshot tại điểm sửa
```gitignore
# Docker
postgres_data/
.env*.local
```
(Cuối file .gitignore, dòng 39-42)

### 1.4. Thay đổi cần thực hiện
1. **Xóa file**: `app/Mật khẩu Chrome.csv` khỏi thư mục dự án (di chuyển ra ngoài workspace)
2. **Thêm vào cuối `.gitignore`**:
```gitignore

# Sensitive files
*.csv
scratch/
```

### 1.5. Vùng CẤM (trong task này)
- KHÔNG xóa bất kỳ quy tắc gitignore hiện có nào

### 1.6. Phụ thuộc
- Không phụ thuộc task khác. Làm ĐẦU TIÊN.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- File CSV không còn tồn tại trong `app/`
- `*.csv` xuất hiện trong `.gitignore`

### 1.8. Kết quả mong đợi
- File mật khẩu được di chuyển an toàn ra ngoài workspace
- `.gitignore` chặn mọi file CSV và thư mục scratch

---

## TASK 2: Bảo mật cookie `activeTeamId`

### 2.1. Mô tả
Cookie `activeTeamId` hiện chỉ được set với `{ path: '/' }`, thiếu hoàn toàn các cờ bảo mật `httpOnly`, `secure`, `sameSite`. Cookie có thể bị đọc bởi XSS attack và gửi trong cross-site requests. Tuy nhiên, vì cookie này cần được đọc từ cả Server Actions (`'use server'`) và có thể từ client-side navigation, ta cần cân nhắc: giữ `httpOnly: false` (vì nó chỉ chứa team ID, không phải secret) nhưng BẮT BUỘC thêm `secure` + `sameSite`.

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/team-cookie.ts` | MODIFY | ~5 dòng |

### 2.3. Code Snapshot tại điểm sửa
```typescript
export async function setActiveTeamCookie(teamId: string | number) {
  const cookieStore = await cookies();
  cookieStore.set('activeTeamId', teamId.toString(), { path: '/' });
}
```
(Dòng 5-8 trong team-cookie.ts)

### 2.4. Thay đổi cần thực hiện
Thay dòng `cookieStore.set(...)` bằng:
```typescript
  cookieStore.set('activeTeamId', teamId.toString(), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
```

### 2.5. Vùng CẤM (trong task này)
- KHÔNG sửa hàm `getActiveTeamCookie()` (logic regex parse đang hoạt động tốt)
- KHÔNG đổi tên cookie key `'activeTeamId'`

### 2.6. Phụ thuộc
- Không phụ thuộc task khác. Có thể làm song song với Task 1.

### 2.7. Verification (Cách kiểm tra đúng/sai)
- `pnpm build` thành công 0 errors
- Kiểm tra DevTools → Application → Cookies: cookie `activeTeamId` phải có flags `HttpOnly`, `SameSite=Lax`

### 2.8. Kết quả mong đợi
- Cookie workspace không bị XSS đọc được, không bị gửi cross-site

---

## TASK 3: Xóa API route test-notifications khỏi production

### 3.1. Mô tả
API route `/api/test-notifications/route.ts` cho phép tạo notification giả mạo cho user đang đăng nhập. Dù có kiểm tra auth, route này KHÔNG NÊN tồn tại trên production vì kẻ tấn công có thể spam notification liên tục.

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/api/test-notifications/route.ts` | DELETE | xóa file |
| `app/lib/db/test-notifications.ts` | DELETE | xóa file |

### 3.3. Code Snapshot tại điểm sửa
Không cần snapshot — xóa toàn bộ 2 file.

### 3.4. Thay đổi cần thực hiện
1. Xóa thư mục `app/app/api/test-notifications/` (chứa route.ts)
2. Xóa file `app/lib/db/test-notifications.ts`
3. Kiểm tra xem nút "⚡ Chạy thử chuông thông báo" trong `announcements-client.tsx` có gọi route này không → nếu có, gỡ bỏ nút đó hoặc wrap trong điều kiện `process.env.NODE_ENV !== 'production'`

### 3.5. Vùng CẤM (trong task này)
- KHÔNG xóa route `/api/notifications/` (route thật) hoặc `/api/announcements/`
- KHÔNG sửa logic trong `notification-actions.ts`

### 3.6. Phụ thuộc
- Không phụ thuộc task khác. Có thể làm song song với Task 1, 2.

### 3.7. Verification (Cách kiểm tra đúng/sai)
- Thư mục `app/app/api/test-notifications/` không còn tồn tại
- `pnpm build` thành công 0 errors (không có import lỗi)
- Grep `test-notifications` trong codebase: không còn reference nào

### 3.8. Kết quả mong đợi
- Endpoint test bị loại bỏ hoàn toàn, kẻ tấn công không thể spam notification

---

## TASK 4: Thêm Database Indexes cho hiệu năng truy vấn

### 4.1. Mô tả
Schema hiện tại chỉ có primary keys và unique constraints, KHÔNG có index trên bất kỳ cột foreign key nào. Khi dữ liệu tăng lên (hàng ngàn users, hàng chục ngàn feed posts), các câu truy vấn JOIN và WHERE sẽ chậm đi đáng kể. Cần bổ sung indexes trên các cột truy vấn thường xuyên.

### 4.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/schema.ts` | MODIFY | ~30 dòng |

### 4.3. Code Snapshot tại điểm sửa
```typescript
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
```
(Dòng 1-9 trong schema.ts — cần thêm `index` vào import)

Và cuối bảng `teamMembers` (dòng 38-48):
```typescript
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});
```

### 4.4. Thay đổi cần thực hiện
1. Thêm `index, uniqueIndex` vào import từ `drizzle-orm/pg-core`
2. Chuyển đổi các bảng cần index sang cú pháp có callback `(table) => ({...})` để khai báo indexes:

**Bảng `teamMembers`** — thêm composite unique index:
```typescript
export const teamMembers = pgTable('team_members', {
  ...columns...
}, (table) => ({
  userTeamIdx: uniqueIndex('team_members_user_team_idx').on(table.userId, table.teamId),
}));
```

**Bảng `feedPosts`** — thêm index trên `teamId`:
```typescript
}, (table) => ({
  teamIdx: index('feed_posts_team_idx').on(table.teamId),
  createdAtIdx: index('feed_posts_created_at_idx').on(table.createdAt),
}));
```

**Bảng `activityLogs`** — thêm index trên `userId` và `teamId`:
```typescript
}, (table) => ({
  userIdx: index('activity_logs_user_idx').on(table.userId),
  teamIdx: index('activity_logs_team_idx').on(table.teamId),
}));
```

**Bảng `notifications`** — thêm index trên `userId`:
```typescript
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
}));
```

**Bảng `feedLikes`** — thêm composite unique index:
```typescript
}, (table) => ({
  postUserIdx: uniqueIndex('feed_likes_post_user_idx').on(table.postId, table.userId),
}));
```

### 4.5. Vùng CẤM (trong task này)
- KHÔNG thay đổi tên cột, kiểu dữ liệu, hoặc default values
- KHÔNG sửa relations definitions
- KHÔNG sửa các bảng SIM module (simAssets, simEmployees, etc.)

### 4.6. Phụ thuộc
- Không phụ thuộc task khác. Có thể làm song song.
- SAU KHI sửa schema, cần chạy `pnpm db:push` để đồng bộ indexes lên PostgreSQL.

### 4.7. Verification (Cách kiểm tra đúng/sai)
- `pnpm build` thành công 0 errors
- `pnpm db:push` thành công, in ra danh sách indexes được tạo mới
- Chạy SQL kiểm tra: `SELECT indexname FROM pg_indexes WHERE tablename = 'team_members';` phải thấy `team_members_user_team_idx`

### 4.8. Kết quả mong đợi
- 8 indexes mới được tạo trên các bảng cốt lõi
- Tốc độ truy vấn JOIN tăng 5-10x khi dữ liệu lớn

---

## TASK 5: Cấu hình Connection Pool cho Production

### 5.1. Mô tả
File `drizzle.ts` hiện đã tách biệt dev/prod config (`max: 1` cho dev, `max: 10` cho prod). Tuy nhiên cần bổ sung thêm các tham số production-grade: `prepare: false` (tương thích serverless), và connection logging.

### 5.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/drizzle.ts` | MODIFY | ~10 dòng |

### 5.3. Code Snapshot tại điểm sửa
```typescript
export const client =
  globalForDb.client ??
  postgres(process.env.POSTGRES_URL, {
    max: isProd ? 10 : 1, // Only 1 connection in dev mode to completely prevent connection leaks through hot-reloads
    idle_timeout: isProd ? 20 : 1, // Automatically terminate idle connections after 1s in dev mode to free socket resources
    connect_timeout: 10,
  });
```
(Dòng 19-25 trong drizzle.ts)

### 5.4. Thay đổi cần thực hiện
Thay block postgres config bằng:
```typescript
export const client =
  globalForDb.client ??
  postgres(process.env.POSTGRES_URL, {
    max: isProd ? 10 : 1,
    idle_timeout: isProd ? 20 : 1,
    connect_timeout: 10,
    prepare: false, // Required for serverless environments (Vercel, Neon)
  });
```

### 5.5. Vùng CẤM (trong task này)
- KHÔNG thay đổi logic globalForDb (singleton pattern đang đúng)
- KHÔNG xóa comment giải thích

### 5.6. Phụ thuộc
- Có thể làm song song với các task khác.

### 5.7. Verification (Cách kiểm tra đúng/sai)
- `pnpm build` thành công 0 errors
- Dev server chạy bình thường, không lỗi connection

### 5.8. Kết quả mong đợi
- Connection pool sẵn sàng cho serverless deployment

---

## TASK 6: Di chuyển scripts dev-only ra khỏi lib/db

### 6.1. Mô tả
Các file utility/seed/test nằm trong `lib/db/` sẽ được bundle vào production build dù không được import ở runtime. Cần di chuyển chúng vào thư mục `scripts/` riêng biệt để tách biệt rõ ràng code production và code phát triển.

### 6.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/seed.ts` | MOVE → `app/scripts/seed.ts` | 0 dòng thay đổi |
| `app/lib/db/seed-sim.ts` | MOVE → `app/scripts/seed-sim.ts` | 0 dòng thay đổi |
| `app/lib/db/cleanup-connections.ts` | MOVE → `app/scripts/cleanup-connections.ts` | 0 dòng thay đổi |
| `app/lib/db/update-admin.ts` | MOVE → `app/scripts/update-admin.ts` | 0 dòng thay đổi |
| `app/package.json` | MODIFY — cập nhật đường dẫn scripts | ~5 dòng |

### 6.3. Code Snapshot tại điểm sửa
Cần kiểm tra `package.json` để tìm các npm scripts tham chiếu đến file cũ (ví dụ `"db:seed"`, `"db:cleanup"`, `"db:test-notifications"`).

### 6.4. Thay đổi cần thực hiện
1. Tạo thư mục `app/scripts/`
2. Di chuyển 4 file vào `app/scripts/`
3. Cập nhật import paths trong `package.json` scripts
4. Kiểm tra không có file nào trong `lib/db/` import từ các file bị di chuyển

### 6.5. Vùng CẤM (trong task này)
- KHÔNG di chuyển `drizzle.ts`, `schema.ts`, `queries.ts`, `admin-queries.ts`
- KHÔNG di chuyển `sim-actions.ts`, `sim-queries.ts`
- KHÔNG di chuyển `notification-actions.ts`, `feed-dispatcher.ts`

### 6.6. Phụ thuộc
- Phải làm SAU Task 3 (vì Task 3 xóa `test-notifications.ts`)

### 6.7. Verification (Cách kiểm tra đúng/sai)
- `pnpm build` thành công 0 errors
- `pnpm db:seed` (nếu có) vẫn chạy được từ đường dẫn mới
- Thư mục `lib/db/` chỉ chứa runtime code

### 6.8. Kết quả mong đợi
- Production bundle không chứa code seed/test/cleanup
- Cấu trúc thư mục sạch sẽ, phân tách rõ runtime vs dev-tools

---

## TASK 7: Dọn sạch mock data files còn sót

### 7.1. Mô tả
3 file mock data vẫn còn tồn tại trong `lib/`:
- `admin-mock-data.ts` (1.4KB) — đã được dọn nhưng vẫn còn file
- `feed-mock-data.ts` (15KB) — chứa dữ liệu mẫu cũ
- `team-mock-data.ts` (8KB) — đã refactor thành re-export từ `shared-constants.ts`

Cần kiểm tra các file này có còn được import ở đâu không. Nếu không → xóa hoàn toàn. Nếu có → chuyển imports sang `shared-constants.ts`.

### 7.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/admin-mock-data.ts` | DELETE (nếu không import) | 0 |
| `app/lib/feed-mock-data.ts` | DELETE hoặc KEEP (nếu có import) | TBD |
| `app/lib/team-mock-data.ts` | DELETE hoặc KEEP (nếu có import) | TBD |

### 7.3. Code Snapshot tại điểm sửa
Cần grep codebase:
```bash
grep -r "admin-mock-data" app/app/ app/components/
grep -r "feed-mock-data" app/app/ app/components/
grep -r "team-mock-data" app/app/ app/components/
```

### 7.4. Thay đổi cần thực hiện
1. Grep toàn bộ imports
2. Nếu file được import:
   - Chuyển data cần thiết vào `shared-constants.ts`
   - Cập nhật import paths trong consumer files
   - Xóa file mock
3. Nếu file KHÔNG được import → xóa trực tiếp

### 7.5. Vùng CẤM (trong task này)
- KHÔNG sửa `shared-constants.ts` nếu không cần thiết
- KHÔNG xóa data/types đang được sử dụng thực tế

### 7.6. Phụ thuộc
- Có thể làm song song với các task khác, nhưng nên làm CUỐI (sau khi các task khác đã ổn định)

### 7.7. Verification (Cách kiểm tra đúng/sai)
- `pnpm build` thành công 0 errors
- Grep `mock-data` trong `app/lib/` trả về 0 kết quả (hoặc chỉ còn file cần thiết)

### 7.8. Kết quả mong đợi
- Loại bỏ dữ liệu giả lập không cần thiết khỏi production bundle
- Codebase sạch sẽ, dễ bảo trì

---

## THỨ TỰ THỰC HIỆN

```
Task 1 (File nhạy cảm) ─┐
Task 2 (Cookie bảo mật)  ├─ Song song (độc lập)
Task 4 (DB Indexes)      ├─ Song song
Task 5 (Connection Pool) ─┘
         │
         ▼
Task 3 (Xóa test route) → Task 6 (Di chuyển scripts)
         │
         ▼
Task 7 (Dọn mock data) — Làm cuối cùng
         │
         ▼
    pnpm build → Verification
```

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Ghi nhận "✅ Hoàn thành Pre-launch Hardening (PLAN_PRE_LAUNCH)" với danh sách 7 tasks
- Cập nhật UI_MAP.md: Không cần (không thay đổi UI)
- Cập nhật LESSONS.md: Thêm lesson mới về "File nhạy cảm trong workspace" nếu cần
- Chạy `pnpm build` lần cuối: Kiểm tra 0 errors trên toàn bộ routes
- Chạy `pnpm db:push`: Đồng bộ indexes mới lên PostgreSQL
