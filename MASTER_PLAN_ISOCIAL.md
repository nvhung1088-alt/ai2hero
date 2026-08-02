# MASTER PLAN — Hệ Thống 3 MVP: iSocial + HeroMarketplace + HeroWeb

> **Mục đích**: Đây là tài liệu gốc (source of truth) cho TOÀN BỘ hệ thống 3 MVP. Bất kỳ AI/dev nào bắt đầu làm việc với 1 trong 3 MVP đều PHẢI đọc file này trước để hiểu: mục đích chung, tiêu chuẩn chung, ranh giới module, và quy tắc liên kết.

> **Quy tắc**: Nội dung chính = **read-only**. Chỉ admin mới được sửa. AI ghi lịch sử phiên bản ở cuối file khi `/up-close`.

---

## 1. TẦM NHÌN SẢN PHẨM

### Bài toán
Xây dựng một **Super App** cho người dùng Việt Nam, nơi:
- **Mạng xã hội** (iSocial) là nơi tạo nội dung và kết nối
- **Thương mại** (HeroMarketplace) là nơi mua bán
- **Website** (HeroWeb) là nơi hiện diện chuyên nghiệp

Ba MVP này **không phải 3 app độc lập** — chúng là **3 mặt của cùng một hệ thống**, chia sẻ:
- Cùng database schema
- Cùng hệ thống user/auth
- Cùng design system
- Cùng data (bài viết, sản phẩm, profile)

### Triết lý thiết kế
> **"Tách UI, chung Data"** — Mỗi MVP có giao diện và UX riêng phù hợp với use case, nhưng tất cả đọc/ghi cùng một nguồn dữ liệu.

### User Journey tổng thể
```
Người dùng đăng ký → Tạo profile iSocial → Đăng bài viết/video
                                          ↓
                        Mở shop trên Marketplace → Đăng sản phẩm
                                          ↓
                        Tạo website trên HeroWeb → Sync bài viết + sản phẩm
                                          ↓
                        Website công khai → Khách hàng truy cập → Mua hàng / Follow
```

---

## 2. KIẾN TRÚC KỸ THUẬT

### Mô hình: Shared Core + Independent Shells

```
┌─────────────────────────────────────────────────────┐
│                    SHARED CORE                      │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Database │  │ Auth &   │  │ Design System   │  │
│  │ Schema   │  │ Session  │  │ (globals.css +   │  │
│  │ (1 file) │  │ (JWT)    │  │  shadcn/ui)     │  │
│  └──────────┘  └──────────┘  └─────────────────┘  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Entity   │  │ Feed     │  │ Notification    │  │
│  │ Bridge   │  │Dispatcher│  │ System          │  │
│  │ (queries)│  │ (cross)  │  │                 │  │
│  └──────────┘  └──────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐   ┌──────────────┐   ┌────────────┐  │
│  │ iSocial │   │HeroMarketplace│   │  HeroWeb   │  │
│  │  Shell  │   │    Shell      │   │   Shell    │  │
│  │         │   │               │   │            │  │
│  │ Layout: │   │ Layout:       │   │ Layout:    │  │
│  │ 3-col   │   │ e-commerce    │   │ builder    │  │
│  │ sidebar │   │ header+grid   │   │ sidebar    │  │
│  │         │   │               │   │            │  │
│  │ Focus:  │   │ Focus:        │   │ Focus:     │  │
│  │ Content │   │ Commerce      │   │ Publishing │  │
│  │ & Social│   │ & Shopping    │   │ & Branding │  │
│  └─────────┘   └──────────────┘   └────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Tech Stack (chung cho cả 3 MVP)
> Phải đồng bộ với [CODE_STANDARDS.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/CODE_STANDARDS.md) §1.

| Layer | Technology | Ghi chú |
|---|---|---|
| Framework | Next.js 15.5.19 (Stable, App Router, RSC) | PPR disabled (canary-only feature) |
| Language | TypeScript 5.8.3 | Strict mode ON |
| Database | PostgreSQL 15+ (Neon/Supabase) + Drizzle ORM 0.43 | `prepare: false` cho serverless |
| Auth | JWT (jose 6.x) + bcryptjs | httpOnly cookie, 24h expiry |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york) | CSS-based config, không dùng tailwind.config |
| Fonts | Outfit (primary) + Manrope (fallback) | |
| Icons | Lucide React | |
| State | SWR (data fetching) + Zustand (client state, chat-store) | |
| Storage | Cloudflare R2 (@aws-sdk/client-s3) | Fallback local filesystem |
| Quality | ESLint 8.57 + Prettier 3.8 | Lint + format tự động |
| Monitoring | @sentry/nextjs 10.57 | Error tracking Client/Server/Edge |
| Deploy | Single app deployment (Vercel) | Serverless architecture |

### File Structure — Ranh Giới Module

```
app/
├── lib/                          ← SHARED CORE
│   ├── db/
│   │   ├── schema.ts             ← 1 FILE DUY NHẤT cho toàn bộ schema
│   │   ├── drizzle.ts            ← DB connection
│   │   ├── queries.ts            ← Core queries (users, teams)
│   │   ├── social-queries.ts     ← MVP1 queries
│   │   ├── social-actions.ts     ← MVP1 actions
│   │   ├── social-*.ts           ← MVP1 domain files
│   │   ├── marketplace-queries.ts← MVP2 queries (CẦN TẠO)
│   │   ├── marketplace-actions.ts← MVP2 actions (CẦN TẠO)
│   │   ├── website-queries.ts    ← MVP3 queries
│   │   ├── website-actions.ts    ← MVP3 actions
│   │   ├── entity-bridge.ts      ← CROSS-MODULE queries (CẦN TẠO)
│   │   ├── feed-dispatcher.ts    ← CROSS-MODULE: tất cả MVP → Social Feed
│   │   └── notification-actions.ts← CROSS-MODULE: notifications
│   └── auth/                     ← Shared auth (session, middleware)
│
├── app/
│   ├── (social)/(main)/          ← MVP1 SHELL: iSocial
│   ├── (marketplace)/            ← MVP2 SHELL: HeroMarketplace (CẦN TẠO)
│   ├── (dashboard)/heroweb/      ← MVP3 SHELL: HeroWeb
│   ├── (public)/sites/           ← MVP3 PUBLIC: Website preview
│   ├── (dashboard)/              ← Dashboard chung (SIM, ConnectHub, etc.)
│   ├── (login)/                  ← Auth pages
│   └── admin/                    ← Super Admin
│
└── components/
    ├── ui/                       ← SHARED: shadcn primitives
    ├── feed-post/                ← MVP1 ONLY: post card system
    ├── marketplace/              ← MVP2 ONLY: marketplace UI
    ├── website-templates/        ← MVP3 ONLY: website templates
    ├── shared/                   ← SHARED: cross-module components (CẦN TẠO)
    └── [top-level files]         ← SHARED: TopHeader, AuthModal, etc.
```

---

## 3. TIÊU CHUẨN CHUNG — Áp Dụng Cho Cả 3 MVP

### 3.1 Database Conventions
| Quy tắc | Chi tiết |
|---|---|
| Schema file | Tất cả tables trong 1 file `schema.ts`, phân nhóm bằng comment headers |
| Table naming | snake_case, plural: `feed_posts`, `marketplace_products` |
| Column naming | camelCase trong Drizzle: `userId`, `createdAt` |
| Timestamps | Mọi table phải có `createdAt` + `updatedAt` |
| Soft delete | Dùng `deletedAt` (nullable timestamp) thay vì xóa cứng |
| FK strategy | Dùng FK cho quan hệ trong cùng module. Dùng **soft reference** (integer column, không FK constraint) cho quan hệ cross-module |
| Team scoping | Mọi table nghiệp vụ phải có `teamId` references `teams.id` |

### 3.2 Query/Action File Conventions
| Quy tắc | Chi tiết |
|---|---|
| Naming | `{module}-queries.ts` (read), `{module}-actions.ts` (write) |
| Server Actions | Mọi action file phải có `'use server'` directive |
| Validation | Dùng `validatedActionWithUser()` wrapper cho auth + Zod validation |
| Error handling | Return `{ success: boolean, error?: string, data?: T }` |
| Cross-module | Gọi qua Entity Bridge (`entity-bridge.ts`), KHÔNG import trực tiếp query của module khác |

### 3.3 UI/UX Conventions
| Quy tắc | Chi tiết |
|---|---|
| Dark mode | Bắt buộc dark mode. KHÔNG có light mode |
| Brand gradient | `--hero-gradient` (orange→pink) cho CTA chính, active states |
| Animations | Dùng animations có sẵn trong globals.css. Tôn trọng `prefers-reduced-motion` |
| Loading states | Shimmer animation cho skeleton loading |
| Toast | Dùng `window.showToast({ type, message })` — KHÔNG tự tạo notification UI |
| Icons | Lucide React — consistent size `h-5 w-5` cho nav, `h-4 w-4` cho inline |
| Responsive | Mobile-first. Breakpoints: `sm` (640), `md` (768), `lg` (1024), `xl` (1280) |
| Typography | Headings: `font-semibold` hoặc `font-bold`. Body: `text-sm` (14px). Muted: `text-white/60` |

### 3.4 Component Conventions
| Quy tắc | Chi tiết |
|---|---|
| Shared components | Đặt trong `components/ui/` hoặc `components/shared/` |
| Module components | Đặt trong `components/{module}/` |
| Page components | Đặt inline trong route folder nếu chỉ dùng 1 chỗ |
| Client vs Server | Mặc định Server Component. Chỉ `'use client'` khi cần interactivity |
| Prop typing | Export interface cho mọi component props |

### 3.5 Auth & Access Control
| Quy tắc | Chi tiết |
|---|---|
| Session check | `getUser()` từ `lib/db/queries.ts` |
| Team check | `getTeamForUser()` hoặc `withTeam()` wrapper |
| Module access | Kiểm tra `teams.activatedApps` chứa module slug |
| Guest access | iSocial feed + Marketplace browsing = public. Tạo nội dung = cần login |
| Auth modal | Trigger bằng `window.dispatchEvent(new Event('open-auth-modal'))` |

---

## 4. CHI TIẾT TỪNG MVP

### 4.1 MVP1: iSocial (Social-Hero) — Ưu tiên #1

#### Mục đích
Mạng xã hội nội bộ/mở — nơi người dùng tạo nội dung (bài viết, video, stories), kết nối bạn bè, tạo nhóm/trang, nhắn tin. Là **hub trung tâm** tạo ra dữ liệu cho 2 MVP còn lại.

#### Trạng thái: 🟡 Beta
- ✅ Feed, Profile, Friends, Groups, Pages, Messages, Reels, Stories — có UI + DB
- ⚠️ Một số tính năng chưa hoàn thiện (edit profile, group settings)
- ⚠️ Chat chưa realtime (polling)

#### Vai trò trong hệ thống
| Vai trò | Chi tiết |
|---|---|
| **Content Creator** | Nơi tạo bài viết, video, stories → nguồn data cho HeroWeb |
| **Identity Hub** | Profile + Pages = danh tính người dùng → link tới Shop + Website |
| **Social Graph** | Bạn bè, follow, nhóm → cơ sở cho recommendation trên Marketplace |
| **Feed Aggregator** | Hiển thị nội dung từ bạn bè + pages + groups + **sản phẩm Marketplace** |

#### Database Tables (14 tables)
`feedPosts`, `feedComments`, `feedLikes`, `feedBookmarks`, `feedStories`, `feedCommentLikes`, `postMedia`, `socialProfiles`, `socialFriends`, `socialGroups`, `socialGroupMembers`, `socialPages`, `socialPageFollowers`, `socialReports`
+ 3 chat tables: `socialConversations`, `socialConversationMembers`, `socialMessages`

#### Key Files
| File | Chức năng |
|---|---|
| `social-layout.tsx` | Layout 3-column |
| `social-sidebar.tsx` | Navigation chính (9 items) |
| `social-rightbar.tsx` | Context-aware right panel |
| `social-top-nav.tsx` | Top nav + search + notifications |
| `social-queries.ts` | Read queries |
| `social-actions.ts` | Write actions (CRUD posts) |
| `feed-post-creator.tsx` | Rich post creation (42KB) |
| `feed-dispatcher.ts` | Cross-module post dispatcher |

---

### 4.2 MVP2: HeroMarketplace — Ưu tiên #2

#### Mục đích
Sàn thương mại điện tử — nơi người dùng mở shop, đăng sản phẩm, mua bán. Tích hợp chặt với iSocial (sản phẩm hiện trong feed, shop liên kết profile) và HeroWeb (sản phẩm hiển thị trên website).

#### Trạng thái: 🔴 Alpha (Mock)
- ✅ UI layout đầy đủ (home, product detail, shop)
- 🔴 Chưa có database tables (100% mock data)
- 🔴 Chưa có CRUD server actions
- 🔴 Chưa tách khỏi Social layout

#### Vai trò trong hệ thống
| Vai trò | Chi tiết |
|---|---|
| **Commerce Engine** | Quản lý sản phẩm, đơn hàng, thanh toán |
| **Product Source** | Cung cấp sản phẩm cho HeroWeb preview + iSocial feed |
| **Shop = Profile** | Mỗi shop gắn với 1 Social Profile → branding nhất quán |
| **Discovery** | Gợi ý sản phẩm dựa trên social graph (bạn bè bán gì) |

#### Database Tables CẦN TẠO
```sql
-- Shops (mỗi user có thể có 1+ shop)
marketplace_shops: id, userId, teamId, name, description, avatarUrl, coverUrl, rating, status, createdAt, updatedAt

-- Products
marketplace_products: id, shopId, teamId, name, description, price, comparePrice, images(jsonb), categoryId, stock, status, createdAt, updatedAt

-- Categories  
marketplace_categories: id, teamId, name, slug, parentId(self-ref), icon, sortOrder

-- Orders (tương lai)
marketplace_orders: id, buyerUserId, shopId, teamId, items(jsonb), totalAmount, status, createdAt

-- Cart (tương lai)
marketplace_cart_items: id, userId, productId, quantity
```

#### Key Files (hiện có + cần tạo)
| File | Status | Chức năng |
|---|---|---|
| `components/marketplace/*.tsx` (7 files) | ✅ Có | UI components |
| `components/marketplace/product/*.tsx` (5 files) | ✅ Có | Product detail UI |
| `components/marketplace/shop/*.tsx` (2 files) | ✅ Có | Shop UI |
| `(marketplace)/layout.tsx` | 🔴 Cần tạo | Layout riêng e-commerce |
| `marketplace-queries.ts` | 🔴 Cần tạo | Read queries |
| `marketplace-actions.ts` | 🔴 Cần tạo | CRUD actions |

#### Layout mới (khi tách)
- **Header**: Logo + Search (prominent) + Categories nav + Cart + User avatar
- **Không có social sidebar** — thay bằng horizontal category bar
- **Link quay về**: "← Bảng tin iSocial" ở header hoặc footer
- **Grid layout**: Product cards dạng grid (2-5 cột responsive)

---

### 4.3 MVP3: HeroWeb (Web Studio) — Ưu tiên #3

#### Mục đích
Website builder — cho phép người dùng tạo website chuyên nghiệp từ template, tự động sync nội dung từ iSocial (bài viết, reels) và HeroMarketplace (sản phẩm). Website chạy trên subdomain riêng.

#### Trạng thái: 🟡 Beta (Partial)
- ✅ Website CRUD + subdomain routing
- ✅ Template rendering (ecommerce-template)
- ✅ linkedPageId & linkedProfileId đã là soft references (integer columns, không FK constraint)
- ⚠️ Data hiện là mock (mockProducts, mockPosts, mockReels)
- 🔴 Kho giao diện chưa có
- 🔴 Cài đặt chung chưa có

#### Vai trò trong hệ thống
| Vai trò | Chi tiết |
|---|---|
| **Data Aggregator** | Thu thập + hiển thị nội dung từ iSocial + Marketplace |
| **Public Storefront** | Website công khai cho khách hàng truy cập |
| **Branding Tool** | Cho phép tùy chỉnh theme, domain, layout |
| **Consumer Only** | Không tạo data mới — chỉ hiển thị data từ 2 MVP kia |

#### Database Tables
```
websites: id, userId, name, subdomain, customDomain, templateId, themeConfig(jsonb), createdAt, updatedAt
```

**Quan trọng — `themeConfig` (jsonb) sẽ chứa:**
```json
{
  "colors": { "primary": "#...", "accent": "#..." },
  "layout": "ecommerce" | "blog" | "portfolio",
  "dataSources": {
    "socialProfile": 123,
    "socialPages": [456, 789],
    "marketplaceShop": 101,
    "syncPosts": true,
    "syncReels": true,
    "syncProducts": true
  },
  "sections": [...]
}
```

#### Key Files
| File | Chức năng |
|---|---|
| `heroweb/layout.tsx` | Builder layout (sidebar + main) |
| `heroweb/page.tsx` | Dashboard quản lý websites |
| `sites/[subdomain]/page.tsx` | Public website rendering |
| `website-queries.ts` | Read queries |
| `website-actions.ts` | CRUD actions |
| `ecommerce-template.tsx` | Template chính (12.7KB) |
| `entity-bridge.ts` | Cross-module data fetcher (CẦN TẠO) |

---

## 5. LIÊN KẾT GIỮA 3 MVP — Entity Bridge

### Nguyên tắc liên kết
1. **KHÔNG dùng Foreign Key constraint** cho quan hệ cross-module
2. Dùng **soft references** (integer column, không FK) + **Entity Bridge functions**
3. Mỗi module chỉ import từ `entity-bridge.ts`, KHÔNG import trực tiếp queries của module khác
4. Entity Bridge xử lý: validation, null-safety, caching

### Bảng liên kết

| Từ | Đến | Loại liên kết | Entity Bridge Function |
|---|---|---|---|
| iSocial Feed | HeroWeb Preview | Posts sync | `getPostsForWebsite(websiteId)` |
| iSocial Reels | HeroWeb Preview | Reels sync | `getReelsForWebsite(websiteId)` |
| iSocial Pages | HeroWeb Config | Page feed source | `getPageFeedForWebsite(websiteId)` |
| Marketplace Products | HeroWeb Preview | Products sync | `getProductsForWebsite(websiteId)` |
| Marketplace Products | iSocial Feed | Feed items | `getMarketplaceFeedItems(userId)` |
| Social Profile | Marketplace Shop | Identity link | `getShopByUserId(userId)` |
| Social Profile | HeroWeb Config | Profile source | `getProfileForWebsite(websiteId)` |

### Feed Dispatcher — Cross-Module Post Gateway
File `feed-dispatcher.ts` là gateway cho **tất cả module** muốn đăng activity lên Social Feed.

> **Lưu ý kỹ thuật**: Interface `DispatchFeedParams.type` phải được nới rộng để chấp nhận cả các loại cross-MVP: `'marketplace_product' | 'heroweb_publish' | 'mvp_result' | 'system_activity'`.

```typescript
// Bất kỳ MVP nào muốn post lên feed:
await dispatchMvpFeedPost({
  teamId, userId,
  type: 'marketplace_product', // hoặc 'heroweb_publish', 'mvp_result', etc.
  appId: 'hero-marketplace',
  message: 'Vừa đăng sản phẩm mới!',
  resultMetrics: [{ label: 'Giá', value: '299.000₫' }]
});
```

---

## 6. LỘ TRÌNH PHÁT TRIỂN

### Phase 1: Hoàn thiện iSocial (Sprint 1-3)
| Task | Ước lượng | Ghi chú |
|---|---|---|
| Polish Feed, Profile, Friends | 2-3 ngày | |
| Hoàn thiện Groups + Pages CRUD | 2-3 ngày | |
| Chat realtime (Supabase Realtime / SSE) | 2-3 ngày | ⚠️ WebSocket thuần KHÔNG khả thi trên serverless. Dùng Supabase Realtime (khuyên dùng) hoặc SSE |
| Notifications system | 2-3 ngày | |

### Phase 2: Tách + Xây Marketplace (Sprint 4-7)
| Task | Ước lượng |
|---|---|
| Tạo route group `(marketplace)/` + layout riêng | 1-2 ngày |
| Database: tạo tables (shops, products, categories) | 1-2 ngày |
| CRUD Server Actions cho sản phẩm | 2-3 ngày |
| Thay mock data → real data | 2-3 ngày |
| Cart + Order flow (basic) | 3-5 ngày |
| Marketplace → iSocial feed integration | 1-2 ngày |

### Phase 3: HeroWeb Data Integration (Sprint 8-9)
| Task | Ước lượng | Ghi chú |
|---|---|---|
| Tạo Entity Bridge (`entity-bridge.ts`) | 1-2 ngày | |
| ~~Migrate FK → soft references trong `websites`~~ | ~~1 ngày~~ | ✅ ĐÃ XONG — linkedPageId & linkedProfileId đã là soft ref |
| Thay mock arrays → Entity Bridge queries | 1-2 ngày | |
| Thêm templates (blog, portfolio) | 2-3 ngày | |
| Kho giao diện + Cài đặt chung | 2-3 ngày | |

### Phase 4: Cross-Module Polish (Sprint 10+)
| Task | Ước lượng |
|---|---|
| "Đăng lên Web" button trong iSocial | 1 ngày |
| "Chia sẻ sản phẩm" lên feed | 1 ngày |
| Unified search across 3 MVPs | 2-3 ngày |
| Analytics dashboard | 3-5 ngày |

---

## 7. QUY TẮC CHO AI/DEV

### Trước khi code bất kỳ MVP nào:
1. ĐỌC file này (MASTER_PLAN_ISOCIAL.md) để hiểu toàn cảnh
2. ĐỌC CODE_STANDARDS.md để tuân theo tiêu chuẩn kỹ thuật chung
3. ĐỌC UI_MAP.md để hiểu giao diện hiện tại
4. ĐỌC START.md để biết trạng thái + task đang làm

### Khi code trong 1 MVP:
1. **KHÔNG import trực tiếp** query/action file của MVP khác
2. Nếu cần data cross-module → dùng Entity Bridge
3. Nếu Entity Bridge chưa có function cần → TẠO function mới trong entity-bridge.ts
4. Cập nhật UI_MAP.md nếu thay đổi navigation/routes/components
5. Cập nhật START.md khi xong task

### Khi thêm database table:
1. Thêm vào `schema.ts` dưới đúng section header
2. Follow naming conventions (snake_case tables, camelCase columns)
3. Có `createdAt` + `updatedAt`
4. Có `teamId` references `teams.id`
5. Cross-module references = integer column, KHÔNG FK constraint

### Khi tạo component:
1. Dùng shared UI primitives từ `components/ui/`
2. Module-specific → `components/{module}/`
3. Shared across modules → `components/shared/`
4. Follow dark theme + brand gradient conventions

---

## LỊCH SỬ PHIÊN BẢN

| Ngày | Version | Thay đổi | Bởi |
|---|---|---|---|
| 2026-08-02 | v1.3 | **86x Traffic Optimization**: Tích hợp Global Polling Control, Extension `chrome.idle`, Exponential Backoff và `visibilityState` Auto-Pause cho 18 Dashboard components để khắc phục lỗi Vercel Quota 1.1M invocations. | AI |
| 2026-06-12 | v1.2 | **Fulfillment Scan Engine**: Tích hợp toàn bộ hệ thống xử lý kho (Pick, Pack, Export, Return) vào HeroMarketplace. | AI |
| 2026-06-10 | v1.1 | **Audit & Đồng bộ codebase**: Cập nhật Tech Stack (Next.js 15.5.19 Stable, Zustand, Sentry, ESLint/Prettier), đổi Chat Realtime từ WebSocket sang Supabase Realtime/SSE (serverless-ready), xác nhận soft references websites đã hoàn thành, nới rộng Feed Dispatcher types cho cross-MVP | AI (Audit session) |
| 2026-06-10 | v1.0 | Tạo Master Plan ban đầu — 3 MVP architecture | AI (Audit session) |

- **v0.5.2**: Hoàn thiện Settings (Quyền riêng tư), Pages Admin, và tối ưu hóa hiệu năng Turbopack (Local Dev).
