# CODE_STANDARDS — Tiêu Chuẩn Kỹ Thuật Hệ Thống AI2Hero

> **Mục đích**: Đây là "hiến pháp" kỹ thuật cho toàn bộ hệ thống AI2Hero. Mọi AI/dev khi code bất kỳ MVP nào (iSocial, HeroMarketplace, HeroWeb, hoặc các module Dashboard) đều PHẢI tuân theo tài liệu này.
>
> **Phạm vi**: Áp dụng cho cả 3 MVP + Dashboard modules (SIM, ConnectHub, HeroCare, HeroReport, HeroVideo).
>
> **Quy tắc**: Read-only. Chỉ admin sửa. Đề xuất thay đổi → ghi vào LESSONS.md.

---

## 📌 MỤC LỤC NHANH

| Cần tra cứu gì | Đọc section |
|---|---|
| Dùng thư viện nào, version nào | → §1 Technology Stack |
| Đặt tên file, biến, hàm | → §2 Naming Conventions |
| Viết Server Action | → §3 Server Actions |
| Viết API Route | → §4 API Routes |
| Thiết kế database table | → §5 Database |
| Validate input | → §6 Validation |
| Xử lý lỗi | → §7 Error Handling |
| Viết component UI | → §8 UI Components |
| Bảo mật | → §9 Security |
| Performance | → §10 Performance |
| Test | → §11 Testing |
| Tổ chức file | → §12 File Structure |

---

## §1. TECHNOLOGY STACK — Phiên Bản Chính Thức

### Core Stack (KHÔNG được thay đổi nếu không có approval admin)

| Layer | Package | Version | Ghi chú |
|---|---|---|---|
| **Framework** | `next` | `15.5.19 (stable)`| App Router, RSC (PPR disabled do yêu cầu bản stable) |
| **Runtime** | `react` / `react-dom` | `19.1.0` | Server Components, `use()` hook |
| **Language** | `typescript` | `5.8.3` | Strict mode ON |
| **ORM** | `drizzle-orm` | `0.43.1` | Relational queries, schema-first |
| **DB Driver** | `postgres` (postgres.js) | `3.4.5` | Serverless-ready (`prepare: false`) |
| **Database** | PostgreSQL | 15+ | Via Neon/Vercel Postgres |
| **CSS** | `tailwindcss` | `4.1.7` | Configured via CSS (`@theme inline`), KHÔNG có tailwind.config |
| **UI Primitives** | `@radix-ui` | `1.4.2` | Via shadcn/ui (new-york style) |
| **Icons** | `lucide-react` | `0.511.0` | Consistent icon library |
| **Auth** | `jose` + `bcryptjs` | `6.0.11` / `3.0.2` | JWT sessions, cookie-based |
| **Validation** | `zod` | `3.24.4` | Schema validation |
| **Data Fetching** | `swr` | `2.3.3` | Client-side caching + revalidation |
| **Package Manager** | `pnpm` | `10.33.0` | Lock file: `pnpm-lock.yaml` |
| **Testing** | `vitest` | `4.1.8` | Integration tests with real DB |
| **Linter & Formatter**| `eslint` + `prettier`| `8.57.1` / `3.8.4`| ESLint + Prettier tích hợp sẵn |
| **Error Tracking** | `@sentry/nextjs` | `10.57.0` | Sentry Error Monitoring |

### Thư Viện Bổ Trợ (đã approve)

| Package | Dùng cho |
|---|---|
| `stripe` | Payments & billing |
| `resend` | Transactional email |
| `class-variance-authority` | Component variants (cva) |
| `clsx` + `tailwind-merge` | Class name merging |
| `tw-animate-css` | Animation utilities |
| `nextjs-toploader` | Route loading bar |
| `dotenv` | Environment variables |
| `server-only` | Prevent client import of server code |
| `@aws-sdk/client-s3` | AWS S3 / Cloudflare R2 storage integration |
| `zustand` | State management (cho social chat-store) |

### ⛔ KHÔNG ĐƯỢC DÙNG (Banned)

| Thư viện | Lý do | Dùng thay thế |
|---|---|---|
| `axios` | Không cần — dùng native `fetch` | `fetch()` |
| `moment` / `dayjs` | Quá nặng | `Intl.DateTimeFormat` hoặc native `Date` |
| `lodash` (full) | Quá nặng | Viết utility function riêng |
| `styled-components` / `emotion` | Conflict với Tailwind + RSC | Tailwind CSS |
| `prisma` | Đã chọn Drizzle | `drizzle-orm` |
| `next-auth` / `auth.js` | Đã có auth custom | `jose` + custom session |
| `mongoose` | Đã chọn PostgreSQL | `drizzle-orm` + `postgres` |
| `redux` / `jotai` | Overkill — dùng SWR + React state | `swr` + `useState` |
| `tailwindcss` v3 plugins | Dự án dùng v4 | Tailwind v4 CSS config |

### 📦 Thêm Dependency Mới — Quy Trình

1. **Hỏi**: Có thể dùng thứ đã có không? (native API, utility function nhỏ)
2. **Đánh giá**: Bundle size? Maintenance? Last publish < 6 tháng?
3. **Đề xuất**: Ghi vào PR/task description lý do cần thêm
4. **Approval**: Admin phải đồng ý trước khi `pnpm add`

---

## §2. NAMING CONVENTIONS — Quy Tắc Đặt Tên

### Files & Folders

| Loại | Convention | Ví dụ |
|---|---|---|
| Route pages | `page.tsx` (Next.js convention) | `app/(social)/(main)/page.tsx` |
| Layouts | `layout.tsx` hoặc `{context}-layout.tsx` | `social-layout.tsx` |
| Components | `kebab-case.tsx` | `feed-post-card.tsx`, `marketplace-header.tsx` |
| Server Actions | `{module}-actions.ts` | `social-actions.ts`, `marketplace-actions.ts` |
| Queries | `{module}-queries.ts` | `social-queries.ts`, `website-queries.ts` |
| API Routes | `route.ts` trong folder path | `api/notifications/route.ts` |
| Test files | `{module}.test.ts` trong `__tests__/` | `__tests__/hero-care-actions.test.ts` |
| Types/Interfaces | Inline hoặc trong file actions/queries | KHÔNG tạo file `.d.ts` riêng |

### Variables & Functions

| Loại | Convention | Ví dụ |
|---|---|---|
| Variables | `camelCase` | `const activeTeamId = ...` |
| Functions | `camelCase`, verb-first | `getUser()`, `createPost()`, `deleteProduct()` |
| Server Actions | `camelCase`, verb-first | `updateSocialProfile()`, `toggleLike()` |
| React Components | `PascalCase` | `FeedPostCard`, `MarketplaceHeader` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE` |
| Boolean vars | `is/has/can/should` prefix | `isLoading`, `hasPermission`, `canEdit` |
| Event handlers | `handle` prefix | `handleSubmit`, `handleDelete` |
| Callbacks (props) | `on` prefix | `onClose`, `onChange`, `onSubmit` |

### Database

| Loại | Convention | Ví dụ |
|---|---|---|
| Table names | `snake_case`, plural | `feed_posts`, `marketplace_products` |
| Column names (Drizzle) | `camelCase` | `userId`, `createdAt`, `linkedPageId` |
| Column names (SQL) | `snake_case` (Drizzle auto-maps) | `user_id`, `created_at` |
| Foreign keys | `{entity}Id` | `teamId`, `shopId`, `postId` |
| Junction tables | `{entityA}_{entityB}` | `social_group_members` |
| Index names | `idx_{table}_{column}` | `idx_feed_posts_user_id` |

### CSS

| Loại | Convention | Ví dụ |
|---|---|---|
| CSS custom properties | `--hero-{name}` cho brand, `--{semantic}` cho theme | `--hero-orange`, `--background` |
| Utility classes | Tailwind classes (no custom CSS classes) | `bg-white/5`, `text-pink-500` |
| Animation names | `kebab-case` | `fade-in`, `pulse-glow`, `gradient-shift` |

---

## §3. SERVER ACTIONS — Pattern Chuẩn

### Template Bắt Buộc

```typescript
'use server';

import { db } from '@/lib/db/drizzle';
import { someTable } from '@/lib/db/schema';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// 1. Schema validation ở đầu file
const CreateItemSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['active', 'draft']).default('active'),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;

// 2. Action function
export async function createItem(teamId: number, data: CreateItemInput) {
  try {
    // 2a. Auth & access check
    const user = await verifyAccess(teamId, ['owner', 'admin', 'member']);

    // 2b. Validate input
    const parsed = CreateItemSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    // 2c. Business logic
    const [result] = await db
      .insert(someTable)
      .values({
        teamId,
        userId: user.id,
        ...parsed.data,
      })
      .returning();

    // 2d. Revalidate cache
    revalidatePath('/relevant-path');

    // 2e. Return success
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error creating item:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// 3. Error sanitizer (1 per file)
function sanitizeError(error: any): string {
  return error?.message || 'Đã xảy ra sự cố kỹ thuật';
}
```

### Quy Tắc Server Actions

| Quy tắc | Chi tiết |
|---|---|
| File header | `'use server'` — dòng đầu tiên |
| Return type | LUÔN return `{ success: boolean, data?: T, error?: string }` |
| KHÔNG throw | Catch mọi error, return `{ success: false }` — KHÔNG để exception leak ra client |
| Auth check | PHẢI có `verifyAccess()` hoặc `getUser()` — KHÔNG có action nào chạy anonymous |
| Validation | Dùng Zod `safeParse()` — KHÔNG trust client input |
| Revalidation | `revalidatePath()` sau khi write — KHÔNG quên |
| Logging | `console.error()` với context message — KHÔNG log raw user data |
| Error message | Tiếng Việt, user-friendly — KHÔNG expose stack trace |

### Form Actions (cho `<form action={...}>`)

```typescript
// Dùng validatedAction wrapper cho form submissions
export const signIn = validatedAction(signInSchema, async (data, formData) => {
  // data đã được validate bởi Zod
  // ...
});

// Hoặc validatedActionWithUser cho authenticated forms
export const updateProfile = validatedActionWithUser(profileSchema, async (data, formData, user) => {
  // user đã được inject
  // ...
});
```

---

## §4. API ROUTES — Pattern Chuẩn

### Khi Nào Dùng API Route vs Server Action?

| Dùng Server Action | Dùng API Route |
|---|---|
| Form submissions | Webhook receivers |
| CRUD từ UI | Cron jobs (`api/cron/*`) |
| Client-side mutations | External API callbacks (Stripe, OAuth) |
| Mọi thứ internal | Browser extension sync |
| | File upload |
| | SWR polling endpoints (`api/user`, `api/team`) |

### Template API Route

```typescript
import { NextRequest } from 'next/server';
import { getUser } from '@/lib/db/queries';

// Next.js 15: params là Promise!
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;  // await params!
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await fetchSomething(id);
    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error('GET /api/xxx error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Quy Tắc API Routes

| Quy tắc | Chi tiết |
|---|---|
| Response | Dùng `Response.json()` (native) — KHÔNG dùng `NextResponse.json()` trừ khi cần redirect |
| Params | Next.js 15: `params` là `Promise` → phải `await params` |
| Auth | Check `getUser()` cho authenticated routes |
| Webhook | Verify HMAC signature trước khi process |
| Cron | Check `CRON_SECRET` header |
| Error codes | 400 (bad input), 401 (no auth), 403 (no permission), 404 (not found), 500 (server error) |

---

## §5. DATABASE — Tiêu Chuẩn Schema & Queries

### Schema Design Rules

```typescript
// TEMPLATE cho mọi table mới
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),                          // Auto-increment PK
  teamId: integer('team_id').notNull()
    .references(() => teams.id),                           // Team scoping BẮT BUỘC
  userId: integer('user_id').notNull()
    .references(() => users.id),                           // Creator reference
  // ... business columns ...
  status: varchar('status', { length: 20 })
    .notNull().default('active'),                          // Soft state management
  createdAt: timestamp('created_at').defaultNow(),         // BẮT BUỘC
  updatedAt: timestamp('updated_at').defaultNow(),         // BẮT BUỘC
});
```

### Database Rules

| Quy tắc | Chi tiết |
|---|---|
| Schema file | `lib/db/schema.ts` — 1 FILE DUY NHẤT, phân nhóm bằng comment headers |
| Team scoping | MỌI table nghiệp vụ phải có `teamId` |
| Timestamps | `createdAt` + `updatedAt` bắt buộc trên mọi table |
| Soft delete | Dùng `deletedAt` (nullable timestamp), KHÔNG xóa cứng records quan trọng |
| Primary key | `serial('id').primaryKey()` — auto-increment integer |
| FK trong module | Dùng `.references()` constraint — Drizzle enforce |
| FK cross-module | Dùng integer column KHÔNG CÓ `.references()` — soft reference |
| JSONB | Dùng cho config linh hoạt (`themeConfig`, `activatedApps`). KHÔNG dùng cho data cần query |
| Indexes | Thêm index cho columns hay query: `teamId`, `userId`, `status`, `createdAt` |
| Migrations | `pnpm drizzle-kit generate` → review SQL → `pnpm drizzle-kit push` |
| Encryption | Data nhạy cảm (credentials, API keys) → AES-256-GCM encrypt trước khi lưu |

### Query Patterns

```typescript
// READ — Relational query (preferred cho nested data)
const posts = await db.query.feedPosts.findMany({
  where: and(
    eq(feedPosts.teamId, teamId),
    isNull(feedPosts.deletedAt),
  ),
  with: {
    user: true,
    media: true,
    comments: { limit: 3 },
  },
  orderBy: [desc(feedPosts.createdAt)],
  limit: 20,
  offset: page * 20,
});

// WRITE — Insert
const [newPost] = await db.insert(feedPosts).values({ ... }).returning();

// WRITE — Update
await db.update(feedPosts)
  .set({ content: newContent, updatedAt: new Date() })
  .where(eq(feedPosts.id, postId));

// WRITE — Soft delete
await db.update(feedPosts)
  .set({ deletedAt: new Date() })
  .where(eq(feedPosts.id, postId));
```

### Connection Pool

```typescript
// lib/db/drizzle.ts — KHÔNG SỬA
// Singleton pattern, serverless-ready
// prod: max 10 connections, dev: max 5
// prepare: false (for Neon/serverless)
```

---

## §6. VALIDATION — Zod Patterns

### Nơi Đặt Schema

| Context | Đặt ở đâu |
|---|---|
| Server Action | Đầu file `{module}-actions.ts`, trước functions |
| API Route | Đầu file `route.ts` |
| Shared schema | `lib/validations/{module}.ts` (nếu dùng ở nhiều nơi) |

### Conventions

```typescript
// Schema naming: {Action}{Entity}Schema
const CreateProductSchema = z.object({ ... });
const UpdateProductSchema = CreateProductSchema.partial().required({ id: true });

// Export type từ schema
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// Luôn dùng safeParse (KHÔNG dùng parse — nó throw)
const parsed = CreateProductSchema.safeParse(data);
if (!parsed.success) {
  return { success: false, error: parsed.error.errors[0].message };
}
// Dùng parsed.data (typed + sanitized)
```

### Validation Rules Thường Dùng

```typescript
// Strings
z.string().min(1, 'Không được để trống').max(255)
z.string().email('Email không hợp lệ')
z.string().url('URL không hợp lệ')

// Numbers
z.number().int().positive('Phải là số dương')
z.number().nonnegative()
z.coerce.number()  // Tự convert string → number (cho form data)

// Enums
z.enum(['active', 'draft', 'archived'])

// Optional with default
z.string().optional().default('')
z.number().optional().default(0)

// Arrays
z.array(z.string()).min(1).max(10)

// JSONB config
z.object({}).passthrough()  // Cho flexible config
```

---

## §7. ERROR HANDLING — Xử Lý Lỗi

### Nguyên Tắc Vàng

| ❌ KHÔNG | ✅ LÀM |
|---|---|
| Throw error từ Server Action | Return `{ success: false, error }` |
| Expose stack trace cho client | Dùng `sanitizeError()` |
| Swallow error im lặng | `console.error()` với context |
| Log thông tin nhạy cảm (password, token) | Log action + userId + error message |
| Dùng error message tiếng Anh cho user | Viết tiếng Việt, user-friendly |

### Error Flow

```
Client → Server Action → try/catch → {
  success → return { success: true, data }
  validation fail → return { success: false, error: "Tên không hợp lệ" }
  auth fail → return { success: false, error: "Không có quyền" }
  DB error → console.error() + return { success: false, error: "Đã xảy ra sự cố" }
}

Client → API Route → try/catch → {
  success → Response.json({ success: true, data }, { status: 200 })
  auth fail → Response.json({ error: "Unauthorized" }, { status: 401 })
  not found → Response.json({ error: "Not found" }, { status: 404 })
  server error → console.error() + Response.json({ error: "..." }, { status: 500 })
}
```

### SanitizeError Helper (copy vào mỗi action file)

```typescript
function sanitizeError(error: any): string {
  // Drizzle unique constraint
  if (error?.code === '23505') return 'Dữ liệu đã tồn tại';
  // Drizzle FK constraint
  if (error?.code === '23503') return 'Dữ liệu liên quan không tồn tại';
  // Generic
  return error?.message || 'Đã xảy ra sự cố kỹ thuật';
}
```

### Client-Side Error Display

```typescript
// Dùng Toast system (global)
const result = await createProduct(teamId, data);
if (result.success) {
  window.showToast({ type: 'success', message: 'Tạo sản phẩm thành công!' });
} else {
  window.showToast({ type: 'error', message: result.error || 'Có lỗi xảy ra' });
}
```

---

## §8. UI COMPONENTS — Tiêu Chuẩn Giao Diện

### Nguyên Tắc Thiết Kế

| Quy tắc | Chi tiết |
|---|---|
| **Dark mode only** | KHÔNG code light mode. Background: `#08080c`, text: `white/90` |
| **Brand gradient** | `--hero-gradient` (orange→pink) cho CTA chính, active states |
| **Glassmorphism** | `bg-white/5 border border-white/10 backdrop-blur-xl` cho cards, panels |
| **Transparency levels** | Text: `/90` (primary), `/60` (secondary), `/45` (muted), `/30` (disabled) |
| **Hover effects** | LUÔN có hover state: `hover:bg-white/5`, `hover:border-white/10` |
| **Transitions** | `transition-all` hoặc `transition-colors` — mọi interactive element |
| **Reduced motion** | Respect `prefers-reduced-motion` — animations có sẵn support |

### Component Architecture

```
Server Component (default)
  └── Fetch data, render HTML
  └── 'use client' CHỈ KHI cần:
      ├── useState / useEffect
      ├── Event handlers (onClick, onChange)
      ├── Browser APIs (window, navigator)
      └── SWR / client-side fetching
```

### Component Template

```tsx
// components/marketplace/product-card.tsx
'use client';  // Chỉ khi cần interactivity

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
  };
  onAddToCart?: (productId: number) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all group">
      <CardContent className="p-0">
        {/* Image */}
        <div className="aspect-square overflow-hidden rounded-t-lg">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={300}
            height={300}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        {/* Info */}
        <div className="p-3 space-y-2">
          <h3 className="text-sm font-medium text-white/90 truncate">
            {product.name}
          </h3>
          <p className="text-sm font-bold text-orange-500">
            {product.price.toLocaleString('vi-VN')}₫
          </p>
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:opacity-90"
            onClick={() => onAddToCart?.(product.id)}
          >
            Thêm vào giỏ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Quy Tắc Component

| Quy tắc | Chi tiết |
|---|---|
| Props | PHẢI có interface/type. Export nếu component được dùng ở ngoài |
| Default Server | Mặc định Server Component. Chỉ `'use client'` khi CẦN |
| shadcn/ui | Dùng primitives có sẵn (`Button`, `Card`, `Input`...). KHÔNG tự viết |
| Naming | `PascalCase` cho component, `kebab-case.tsx` cho file |
| Size limits | 1 file component KHÔNG quá 500 dòng. Nếu quá → tách thành sub-components |
| Icons | Lucide React. Size: `h-5 w-5` (nav), `h-4 w-4` (inline), `h-6 w-6` (header) |
| Images | Dùng `next/image` với `width`/`height` hoặc `fill`. KHÔNG dùng `<img>` |
| Links | Dùng `next/link`. KHÔNG dùng `<a>` cho internal navigation |
| Loading | Skeleton shimmer pattern. KHÔNG dùng spinner |
| Empty states | PHẢI có empty state UI (icon + text + action button) |

### Responsive Breakpoints

```
Mobile first: base styles (< 640px)
sm:  640px+   (landscape phone)
md:  768px+   (tablet)
lg:  1024px+  (laptop — sidebar appears)
xl:  1280px+  (desktop — right sidebar appears)
2xl: 1536px+  (wide desktop)
```

### Color Cheat Sheet

```
// Backgrounds
bg-[#08080c]         ← Page background
bg-white/5           ← Card, panel, hover
bg-white/10          ← Active, selected
bg-gradient-to-r from-pink-500/20 to-orange-500/20  ← Active nav item

// Text
text-white/90        ← Primary text
text-white/60        ← Secondary text
text-white/45        ← Muted text, icons
text-white/30        ← Disabled
text-pink-500        ← Active icon, accent
text-orange-500      ← Price, CTA

// Borders
border-white/5       ← Subtle
border-white/10      ← Default
border-white/20      ← Hover / focus
border-pink-500/30   ← Active state

// Gradient (brand)
bg-gradient-to-r from-pink-500 to-orange-500  ← CTA button
bg-gradient-to-r from-pink-500/10 to-orange-500/10  ← Subtle highlight
```

---

## §9. SECURITY — Bảo Mật

### Authentication

| Quy tắc | Chi tiết |
|---|---|
| Session | JWT (HS256) via `jose`, 24h expiry, httpOnly cookie |
| Password | `bcryptjs` hash, KHÔNG lưu plaintext |
| OAuth | Google OAuth via API route callback |
| Middleware | `middleware.ts` protect routes: `/dashboard`, `/admin`, `/profile`, `/messages` |
| RBAC | `role` field: `member` → `admin` → `owner` → `super_admin` |

### Authorization — Access Check Pattern

```typescript
// MỌI server action PHẢI check:
// 1. User đã login (session valid)
// 2. User thuộc team đang thao tác
// 3. User có role đủ quyền

async function verifyAccess(teamId: number, allowedRoles: string[]) {
  const user = await getUser();
  if (!user) throw new Error('Chưa đăng nhập');

  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.userId, user.id),
      eq(teamMembers.teamId, teamId),
    ),
  });
  if (!member) throw new Error('Không có quyền truy cập');
  if (!allowedRoles.includes(member.role)) {
    throw new Error('Không đủ quyền thực hiện');
  }

  return user;
}
```

### Security Rules

| Quy tắc | Chi tiết |
|---|---|
| **IDOR Prevention** | MỌI query phải filter theo `teamId` + `userId`. KHÔNG bao giờ query chỉ theo `id` |
| **Input Validation** | Zod validate MỌI input. KHÔNG trust client data |
| **SQL Injection** | Drizzle ORM parameterized queries. KHÔNG dùng raw SQL |
| **XSS** | React auto-escapes. KHÔNG dùng `dangerouslySetInnerHTML` trừ khi sanitize |
| **Sensitive Data** | Encrypt (AES-256-GCM) trước khi lưu DB: API keys, passwords, tokens |
| **Webhook** | Verify HMAC-SHA256 signature trước khi process |
| **Cron** | Check `CRON_SECRET` header |
| **Error Leaking** | KHÔNG expose DB errors, stack traces, internal paths cho client |
| **Env vars** | KHÔNG commit `.env`. Dùng `.env.example` làm template |

---

## §10. PERFORMANCE — Tối Ưu

### Server-Side

| Kỹ thuật | Cách dùng |
|---|---|
| **PPR** (Partial Pre-Rendering) | Disabled (Canary-only. Do đã chuyển sang Next.js stable nên PPR bị tắt) |
| **RSC** (Server Components) | Mặc định. Fetch data trên server, stream HTML |
| **Revalidation** | `revalidatePath()` sau mutations. KHÔNG `revalidateTag()` trừ khi cần fine-grained |
| **DB Connection Pool** | Singleton, max 10 prod / 5 dev. KHÔNG tạo connection mới per-request |
| **Query Optimization** | Dùng `select` chỉ columns cần. `limit` + `offset` cho pagination |

### Client-Side

| Kỹ thuật | Cách dùng |
|---|---|
| **SWR** | `useSWR()` cho polling data (notifications: 15s). Auto-dedupe + cache |
| **Client Segment Cache** | Enabled trong `next.config.ts`. Cache route segments client-side |
| **Image Optimization** | `next/image` với width/height. WebP auto-convert |
| **Code Splitting** | `dynamic()` import cho heavy components (modals, editors) |
| **Debounce** | Search inputs: 300ms debounce. KHÔNG gọi API on every keystroke |

### Pagination Standard

```typescript
// Server Action
export async function getItems(teamId: number, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const items = await db.query.someTable.findMany({
    where: eq(someTable.teamId, teamId),
    limit: limit + 1,  // Fetch 1 extra to check if more exists
    offset,
    orderBy: [desc(someTable.createdAt)],
  });

  const hasMore = items.length > limit;
  return {
    items: items.slice(0, limit),
    hasMore,
    page,
  };
}
```

---

## §11. TESTING — Tiêu Chuẩn Test

### Framework: Vitest

```typescript
// vitest.config.ts — ĐÃ CẤU HÌNH
// globals: true, environment: 'node', alias: @/ → ./
```

### Khi Nào PHẢI Có Test?

| Bắt buộc test | Không bắt buộc |
|---|---|
| Server Actions có business logic phức tạp | Pure UI components |
| Cross-module Entity Bridge functions | Simple CRUD (1 table, no logic) |
| Auth/permission logic | Styling changes |
| Financial calculations (pricing, orders) | Static pages |
| Webhook handlers | |

### Test File Structure

```typescript
// lib/db/__tests__/marketplace-actions.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock auth
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 1, role: 'owner' }),
}));

describe('Marketplace Actions', () => {
  // Setup test data
  beforeAll(async () => {
    // Insert test team, user, etc. into REAL DB
  });

  afterAll(async () => {
    // Clean up test data
  });

  describe('createProduct', () => {
    it('should create product with valid data', async () => {
      const result = await createProduct(testTeamId, {
        name: 'Test Product',
        price: 100000,
      });
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Product');
    });

    it('should reject if user has no access', async () => {
      // Test IDOR prevention
    });

    it('should reject invalid price', async () => {
      const result = await createProduct(testTeamId, {
        name: 'Test',
        price: -1,
      });
      expect(result.success).toBe(false);
    });
  });
});
```

### Run Tests

```bash
pnpm test              # Run all tests
pnpm vitest run        # Run once (CI)
pnpm vitest            # Watch mode (dev)
```

---

## §12. FILE STRUCTURE — Tổ Chức Code

### Nguyên Tắc Tổ Chức

| Quy tắc | Chi tiết |
|---|---|
| **Flat > Nested** | 1 file 500 dòng tốt hơn 5 file 100 dòng import lồng nhau |
| **Colocation** | Component chỉ dùng ở 1 page → đặt cùng folder với page đó |
| **Module isolation** | KHÔNG import trực tiếp giữa MVP shells. Dùng Entity Bridge |
| **Barrel exports** | KHÔNG dùng `index.ts` barrel files — gây circular imports |
| **Import order** | (1) React/Next → (2) External libs → (3) `@/lib/*` → (4) `@/components/*` → (5) Local imports |

### Import Path Conventions

```typescript
// ✅ Correct — dùng @ alias
import { db } from '@/lib/db/drizzle';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/db/queries';

// ❌ Wrong — relative path xuyên module
import { something } from '../../../lib/db/queries';
import { SocialSidebar } from '../../(social)/(main)/social-sidebar';
```

### Khi Nào Tạo File Mới vs Thêm Vào File Hiện Có?

| Tạo file mới | Thêm vào file hiện có |
|---|---|
| Module mới (marketplace-actions.ts) | Thêm function cùng module (thêm vào social-actions.ts) |
| Component mới > 100 dòng | Helper function < 50 dòng |
| API route mới | Thêm Zod schema cùng module |
| Test file cho module | Thêm test case |

---

## §13. GIT & WORKFLOW

### Commit Messages (Tiếng Việt OK)

```
feat: Thêm tạo sản phẩm marketplace
fix: Sửa lỗi không load được profile
refactor: Tách marketplace layout riêng
chore: Update dependencies
docs: Cập nhật UI_MAP
```

### Branch Strategy

```
main              ← Production (stable)
├── dev           ← Development (integration)
│   ├── feat/marketplace-shell    ← Feature branch
│   ├── fix/profile-loading       ← Bug fix
│   └── refactor/entity-bridge    ← Refactor
```

### Pre-commit Checklist (cho AI/dev)

- [ ] `pnpm build` — không lỗi TypeScript
- [ ] `pnpm test` — tests pass
- [ ] Cập nhật START.md nếu task xong
- [ ] Cập nhật UI_MAP.md nếu UI thay đổi
- [ ] Không có `console.log()` debug còn sót (chỉ giữ `console.error()`)
- [ ] Không có `// TODO` mới mà không ghi task

---

## LỊCH SỬ PHIÊN BẢN

| Ngày | Version | Thay đổi |
|---|---|---|
| 2025-06-10 | v1.0 | Tạo CODE_STANDARDS ban đầu — dựa trên audit codebase thực tế |
