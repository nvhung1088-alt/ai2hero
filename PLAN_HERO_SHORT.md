# PLAN_HERO_SHORT — MVP Nền tảng Phim ngắn dọc (HeroShort)
> Ngày tạo: 2026-06-20
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 5
> Ước tính: 30 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Tích hợp MVP mới **HeroShort** (nền tảng phim ngắn dọc kiểu ReelShort/DramaBox) vào hệ sinh thái AI2Hero. MVP Phase 1 bao gồm: đăng ký app, database schema (series + episodes + watch_history), layout cô lập, trang Dashboard khám phá phim, trình phát video dọc full-screen với snap scroll, và trang Admin CMS quản lý series/tập.

**HỖ TRỢ NHÚNG VIDEO TỪ 3 NGUỒN**: Direct URL (self-hosted/CDN), YouTube (iframe embed), Facebook Video (iframe embed). Giúp tiết kiệm 100% chi phí bandwidth hosting video.

**KHÔNG LÀM** trong plan này: Ví Coin, Paywall, Subscription, Quảng cáo (sẽ tách thành Phase 2 riêng sau).

## BỐI CẢNH KIẾN TRÚC
- Hệ thống AI2Hero có 9 MVPs đã tích hợp, mỗi MVP đăng ký vào `apps-registry.ts` và có cấu trúc route: `app/(dashboard)/[tên-app]/t/[teamId]/...`
- Layout cha `(dashboard)/layout.tsx` dùng `usePathname()` để ẩn Header khi vào route MVP (dòng 100). Cần bổ sung prefix `/hero-short`.
- UI lướt video dọc đã có pattern chuẩn tại `reels/reel-player.tsx` dùng IntersectionObserver + snap scroll. **TÁI SỬ DỤNG** logic này cho HeroShort.
- Schema DB theo chuẩn Drizzle, thêm bảng cuối file `schema.ts` (sau dòng 2106), luôn có `teamId` + timestamps.
- Admin settings page (`admin/settings/page.tsx`) có mảng `AVAILABLE_APPS` (dòng 24-39) cần bổ sung entry.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: `reels/reel-player.tsx`, `reels/reels-client.tsx` (chỉ tham khảo pattern, KHÔNG import)
- KHÔNG sửa: các file hero-care, hero-report, hero-video-maker (không liên quan)
- KHÔNG đổi tên: `APPS`, `AVAILABLE_APPS`, `getAppById`, `getAppDynamicPath`
- CSS: Dùng dark theme forced, gradient `from-rose-500 to-red-500` cho brand color HeroShort
- Data: Mock data tĩnh cho Phase 1 (series, episodes), database thật schema sẵn sàng cho Phase 2

## LESSONS CẦN NHỚ
- **1.1**: Sửa 1 file → test → mới qua file tiếp
- **2.2**: Thêm trang mới = cập nhật sidebar + UI_MAP
- **3.7**: Hai Header cha-con đè nhau → check isDashboardOrSim
- **3.9**: Lỗi `Unexpected eof` do escape string sai trong JSX
- **4.31**: Serialize icon → lưu tên string, resolve tại client
- **4.35**: Ép `force-dynamic` cho trang admin/dynamic tránh quá tải PostgreSQL khi build
- **4.45**: `'use server'` cấm export non-async-function
- **5.4**: Kiến trúc phẳng — 1 file 500 dòng > 5 file 100 dòng

---

## TASK 1: Đăng ký App `hero-short` vào Registry & Admin Settings

### 1.1. Mô tả
Thêm entry `hero-short` vào mảng `APPS` trong `apps-registry.ts` và `AVAILABLE_APPS` trong `admin/settings/page.tsx` để app xuất hiện trên Dashboard, App Store và Admin Panel. Đồng thời bổ sung prefix `/hero-short` vào điều kiện `isDashboardOrSim` trong `(dashboard)/layout.tsx` để ẩn Header cha khi vào route HeroShort.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/apps-registry.ts` | MODIFY | ~25 dòng thêm |
| `app/app/(dashboard)/layout.tsx` | MODIFY | ~1 dòng sửa |
| `app/app/admin/settings/page.tsx` | MODIFY | ~1 dòng thêm |

### 1.3. Code Snapshot tại điểm sửa

**File 1 — `apps-registry.ts` (dòng 241-244):**
```typescript
    targetUsers: 'Content Creators, TikTokers, Affiliate Marketers, Video Editors muốn sản xuất video số lượng lớn.'
  }
];
```

**File 2 — `(dashboard)/layout.tsx` (dòng 100):**
```typescript
  const isDashboardOrSim = pathname.startsWith('/dashboard') || pathname.startsWith('/sim') || pathname.startsWith('/herovideodownload') || pathname.startsWith('/connect-hub') || pathname.startsWith('/hero-report') || pathname.startsWith('/hero-care') || pathname.startsWith('/heroweb') || pathname.startsWith('/hero-social') || pathname.startsWith('/hero-video-maker');
```

**File 3 — `admin/settings/page.tsx` (dòng 38-39):**
```typescript
  { id: 'hero-video-maker', name: 'HeroVideoMaker' },
];
```

### 1.4. Thay đổi cần thực hiện

**File 1 — `apps-registry.ts`:** Thêm object mới vào cuối mảng `APPS` (trước dấu `];` dòng 244):
```typescript
  {
    id: 'hero-short',
    name: 'HeroShort',
    description: 'Nền tảng phim ngắn dọc — xem phim bộ nhiều tập kiểu ReelShort/DramaBox.',
    icon: 'Film',
    path: '/hero-short/dashboard',
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
  }
```

**File 2 — `(dashboard)/layout.tsx`:** Thêm `|| pathname.startsWith('/hero-short')` vào cuối biểu thức `isDashboardOrSim` (dòng 100).

**File 3 — `admin/settings/page.tsx`:** Thêm dòng `{ id: 'hero-short', name: 'HeroShort' },` vào cuối mảng `AVAILABLE_APPS` (sau dòng 38, trước `];`).

### 1.5. Vùng CẤM (trong task này)
- KHÔNG sửa bất kỳ entry nào khác trong mảng `APPS`
- KHÔNG sửa các helper functions (`getAppsByStatus`, `getAppById`, v.v.)
- KHÔNG sửa logic `UserMenu`, `Header` trong layout.tsx

### 1.6. Phụ thuộc
Không có — Task này độc lập, làm đầu tiên.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Chạy `npx tsc --noEmit` — không có lỗi TypeScript mới
- Truy cập `http://localhost:3000/dashboard/store` — thấy card HeroShort với icon Film và gradient đỏ hồng

### 1.8. Kết quả mong đợi
- App `hero-short` xuất hiện trong Kho ứng dụng (`/dashboard/store`)
- TopHeader ẩn khi vào route `/hero-short/*`
- Admin Settings hiển thị toggle bật/tắt HeroShort cho workspace

---

## TASK 2: Tạo Database Schema cho HeroShort (3 bảng + Relations + Types)

### 2.1. Mô tả
Thêm 3 bảng Drizzle ORM vào cuối `schema.ts`: `short_series` (phim/series), `short_episodes` (tập phim), và `short_watch_history` (lịch sử xem). Kèm relations và inferred types. KHÔNG tạo bảng coin/wallet/subscription (Phase 2).

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/schema.ts` | MODIFY | ~120 dòng thêm cuối file |

### 2.3. Code Snapshot tại điểm sửa

**Cuối file `schema.ts` (dòng 2104-2106):**
```typescript
export type VideoTask = typeof videoTasks.$inferSelect;
export type NewVideoTask = typeof videoTasks.$inferInsert;

```

### 2.4. Thay đổi cần thực hiện

Thêm sau dòng 2106 (cuối file):
```typescript
// ═══════════════════════════════════════════════════════
// HERO SHORT — Nền tảng phim ngắn dọc (ReelShort/DramaBox style)
// ═══════════════════════════════════════════════════════

export const shortSeries = pgTable('short_series', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),           // Ảnh bìa dọc 9:16
  bannerUrl: text('banner_url'),         // Ảnh banner ngang (cho trang khám phá)
  trailerUrl: text('trailer_url'),       // URL video trailer (nếu có)
  
  genre: varchar('genre', { length: 100 }),  // 'romance' | 'drama' | 'action' | 'comedy' | 'thriller'
  tags: jsonb('tags'),                       // ["tình cảm", "ngôn tình", "tổng tài"]
  totalEpisodes: integer('total_episodes').notNull().default(0),
  
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  // status: 'draft' | 'publishing' | 'completed' | 'archived'
  
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  
  // Sorting & Discovery
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shortEpisodes = pgTable('short_episodes', {
  id: serial('id').primaryKey(),
  seriesId: integer('series_id').notNull().references(() => shortSeries.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  episodeNumber: integer('episode_number').notNull(),
  title: varchar('title', { length: 255 }),
  videoUrl: text('video_url').notNull(),     // URL video hoặc YouTube/Facebook URL gốc
  videoSource: varchar('video_source', { length: 20 }).notNull().default('direct'),
  // videoSource: 'direct' (mp4/CDN) | 'youtube' (nhúng iframe) | 'facebook' (nhúng iframe)
  thumbnailUrl: text('thumbnail_url'),       // Ảnh thu nhỏ tập
  duration: integer('duration'),             // Thời lượng (giây)
  
  isFree: boolean('is_free').notNull().default(true),
  // Phase 2: coinPrice, unlockMethod sẽ thêm sau
  
  viewCount: integer('view_count').notNull().default(0),
  
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  // status: 'draft' | 'published' | 'hidden'
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  seriesEpIdx: uniqueIndex('short_ep_series_ep_idx').on(table.seriesId, table.episodeNumber),
}));

export const shortWatchHistory = pgTable('short_watch_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').notNull().references(() => shortEpisodes.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => shortSeries.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  watchProgress: integer('watch_progress').notNull().default(0), // Phần trăm đã xem (0-100)
  lastWatchedAt: timestamp('last_watched_at').notNull().defaultNow(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userEpIdx: uniqueIndex('short_watch_user_ep_idx').on(table.userId, table.episodeId),
}));

// Relations
export const shortSeriesRelations = relations(shortSeries, ({ one, many }) => ({
  team: one(teams, { fields: [shortSeries.teamId], references: [teams.id] }),
  episodes: many(shortEpisodes),
}));

export const shortEpisodesRelations = relations(shortEpisodes, ({ one }) => ({
  series: one(shortSeries, { fields: [shortEpisodes.seriesId], references: [shortSeries.id] }),
  team: one(teams, { fields: [shortEpisodes.teamId], references: [teams.id] }),
}));

export const shortWatchHistoryRelations = relations(shortWatchHistory, ({ one }) => ({
  user: one(users, { fields: [shortWatchHistory.userId], references: [users.id] }),
  episode: one(shortEpisodes, { fields: [shortWatchHistory.episodeId], references: [shortEpisodes.id] }),
  series: one(shortSeries, { fields: [shortWatchHistory.seriesId], references: [shortSeries.id] }),
  team: one(teams, { fields: [shortWatchHistory.teamId], references: [teams.id] }),
}));

// Types
export type ShortSeries = typeof shortSeries.$inferSelect;
export type NewShortSeries = typeof shortSeries.$inferInsert;

export type ShortEpisode = typeof shortEpisodes.$inferSelect;
export type NewShortEpisode = typeof shortEpisodes.$inferInsert;

export type ShortWatchHistory = typeof shortWatchHistory.$inferSelect;
export type NewShortWatchHistory = typeof shortWatchHistory.$inferInsert;
```

### 2.5. Vùng CẤM (trong task này)
- KHÔNG sửa bất kỳ bảng nào đã có trong schema.ts
- KHÔNG thêm bảng coin/wallet/subscription (Phase 2)

### 2.6. Phụ thuộc
Không có — Task này độc lập, có thể làm song song với Task 1.

### 2.7. Verification (Cách kiểm tra đúng/sai)
- Chạy `npx tsc --noEmit` — không có lỗi TypeScript mới
- Chạy `npx drizzle-kit push` — đồng bộ 3 bảng mới lên database thành công

### 2.8. Kết quả mong đợi
- 3 bảng `short_series`, `short_episodes`, `short_watch_history` tồn tại trong DB
- TypeScript types `ShortSeries`, `ShortEpisode`, `ShortWatchHistory` export được

---

## TASK 3: Tạo Layout cô lập + Redirect page + Sidebar menu cho HeroShort

### 3.1. Mô tả
Tạo cấu trúc route chuẩn cho HeroShort theo pattern các MVP đã có: redirect page (`/hero-short/dashboard` → `/hero-short/t/[teamId]/dashboard`), layout cô lập dạng sidebar + main content, sidebar menu riêng cho HeroShort. Tham khảo cấu trúc `hero-care` (layout IDOR check + sidebar menu component).

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-short/layout.tsx` | NEW | ~8 dòng |
| `app/app/(dashboard)/hero-short/dashboard/page.tsx` | NEW | ~11 dòng |
| `app/app/(dashboard)/hero-short/hero-short-sidebar-menu.tsx` | NEW | ~60 dòng |
| `app/app/(dashboard)/hero-short/t/[teamId]/layout.tsx` | NEW | ~130 dòng |

### 3.3. Code Snapshot tại điểm sửa
Không có (tất cả là file mới). Tham khảo pattern từ:

**hero-care/layout.tsx (dòng 1-8):**
```typescript
export default function HeroCareLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

**hero-care/dashboard/page.tsx (dòng 1-11):**
```typescript
import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function RedirectPage() {
  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');
  redirect(`/hero-care/t/${team.id}/dashboard`);
}
```

**hero-care/t/[teamId]/layout.tsx (dòng 1-14, 74-128):** Layout với IDOR check, TopHeader, Sidebar, main content area. (Xem file gốc cho chi tiết đầy đủ).

### 3.4. Thay đổi cần thực hiện

**File 1 — `hero-short/layout.tsx`:** Copy chính xác pattern `hero-care/layout.tsx` — fragment wrapper đơn giản.

**File 2 — `hero-short/dashboard/page.tsx`:** Copy pattern `hero-care/dashboard/page.tsx`, đổi redirect target thành `/hero-short/t/${team.id}/dashboard`.

**File 3 — `hero-short/hero-short-sidebar-menu.tsx`:** Component client `'use client'` hiển thị các menu items dọc, dùng `usePathname()` để highlight active. Menu items:
- 🏠 Khám phá (`/hero-short/t/[teamId]/dashboard`)
- 📺 Xem phim (`/hero-short/t/[teamId]/watch`)
- 📋 Quản lý Series (`/hero-short/t/[teamId]/admin`)

Import Lucide icons: `Home`, `Tv`, `ListVideo`. Gradient accent: `from-rose-500 to-red-500`.

**File 4 — `hero-short/t/[teamId]/layout.tsx`:** Copy **toàn bộ** logic IDOR check từ `hero-care/t/[teamId]/layout.tsx` (dòng 1-72 kiểm tra auth + membership + activatedApps + preview). Thay thế:
- `'hero-care'` → `'hero-short'` (3 chỗ: isPreviewMode, activatedApps check, PreviewBanner)
- Import `HeroShortSidebarMenu` thay vì `HeroCareSidebarMenu`
- Gradient sidebar: `from-rose-500 to-red-500` thay vì `from-blue-500 to-cyan-500`
- Footer: `HeroShort v1.0`
- Href back link: `/dashboard/t/${team.id}` (giữ nguyên)

### 3.5. Vùng CẤM (trong task này)
- KHÔNG sửa `hero-care/t/[teamId]/layout.tsx` (chỉ copy pattern)
- KHÔNG sửa `top-header.tsx`

### 3.6. Phụ thuộc
Task 1 phải hoàn tất trước (vì layout check `activatedApps.includes('hero-short')`).

### 3.7. Verification (Cách kiểm tra đúng/sai)
- Chạy `npx tsc --noEmit` — không có lỗi TypeScript mới
- Truy cập `/hero-short/dashboard` → redirect đúng sang `/hero-short/t/[teamId]/dashboard`
- Sidebar hiển thị 3 menu items với gradient đỏ hồng

### 3.8. Kết quả mong đợi
- Route `/hero-short/t/[teamId]/*` hoạt động với IDOR protection
- Sidebar dọc hiển thị chính xác 3 menu
- TopHeader xuất hiện phía trên, Header cha ẩn

---

## TASK 4: Xây dựng trang Dashboard khám phá phim (Discover Page)

### 4.1. Mô tả
Tạo trang Dashboard chính của HeroShort (`/hero-short/t/[teamId]/dashboard`) hiển thị: Welcome Banner, grid danh sách Series (mock data tĩnh ban đầu), và shortcut quản lý. Thiết kế "thẻ phim" dọc aspect-[9/16] có ảnh bìa, tên phim, số tập, thể loại, nút "Xem ngay". Giao diện cảm hứng từ DramaBox/ReelShort home screen.

### 4.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-short/t/[teamId]/dashboard/page.tsx` | NEW | ~200 dòng |

### 4.3. Code Snapshot tại điểm sửa
Không có (file mới). Tham khảo pattern dashboard từ `hero-care/t/[teamId]/dashboard/page.tsx` (Welcome Banner + Grid cards + Metrics).

### 4.4. Thay đổi cần thực hiện
Tạo Server Component `page.tsx` với:

1. **Mock Data tĩnh** (5-6 series phim ngắn tiếng Việt): Mỗi series có `id`, `title`, `description`, `genre`, `coverUrl` (dùng placeholder gradient div thay ảnh thật), `totalEpisodes`, `viewCount`, `status`.

2. **Welcome Banner** (gradient `from-rose-900/20 via-red-900/10`): Badge "PHIM NGẮN DỌC", tiêu đề "Chào mừng đến HeroShort", mô tả ngắn.

3. **Section "Phim nổi bật"**: Grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` hiển thị thẻ phim:
   - Mỗi thẻ: aspect-[9/16] rounded-xl overflow-hidden, gradient background làm placeholder ảnh bìa
   - Overlay gradient bottom → hiển thị tên phim (font-bold), số tập (badge nhỏ), thể loại
   - Hover: scale-105, ring-2 ring-rose-500/50
   - Link đến `/hero-short/t/[teamId]/watch?series=[id]` (Phase 2)

4. **Section "Tiếp tục xem"**: Placeholder text "Bạn chưa xem phim nào" (sẽ kết nối watch_history ở Phase 2).

5. **Shortcut Cards** (2-3 cards): "Quản lý Series" → admin, "Xem phim" → watch.

### 4.5. Vùng CẤM (trong task này)
- KHÔNG import từ `reels/` (trang khám phá không cần video player)
- KHÔNG gọi database (dùng mock data cho Phase 1)

### 4.6. Phụ thuộc
Task 3 phải hoàn tất trước (cần layout + sidebar đã tạo).

### 4.7. Verification (Cách kiểm tra đúng/sai)
- Chạy `npx tsc --noEmit` — không có lỗi TypeScript mới
- Truy cập `/hero-short/t/[teamId]/dashboard` — thấy Welcome Banner + grid thẻ phim dọc
- Hover vào thẻ phim → có hiệu ứng scale + ring

### 4.8. Kết quả mong đợi
- Trang Dashboard hiển thị đẹp mắt với ít nhất 5 thẻ phim dọc
- Giao diện Dark theme, gradient đỏ hồng, animation mượt
- Responsive: 2 cột mobile → 5 cột desktop

---

## TASK 5: Xây dựng trang Xem phim dọc full-screen (Watch Page)

### 5.1. Mô tả
Tạo trang xem phim `/hero-short/t/[teamId]/watch` với trải nghiệm lướt dọc full-screen. Hỗ trợ **3 nguồn video**: Direct (mp4 self-hosted), YouTube (iframe embed), Facebook Video (iframe embed). Dùng IntersectionObserver + snap-y scroll (tham khảo pattern `reels-client.tsx` + `reel-player.tsx`). Mock data 8-10 tập phim trộn lẫn cả 3 nguồn. **BỎ** sidebar khi vào chế độ xem phim.

### 5.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-short/t/[teamId]/watch/page.tsx` | NEW | ~250 dòng (client component, kiến trúc phẳng) |

### 5.3. Code Snapshot tại điểm sửa
Không có (file mới). Tham khảo logic từ:

**reels-client.tsx (dòng 22-39):**
```tsx
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#08080c] overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide flex flex-col items-center outline-none"
      tabIndex={0}
    >
      {reels.map((reel, index) => (
        <div 
          key={reel.id} 
          className="w-full h-full shrink-0 flex items-center justify-center snap-center snap-always pb-4 pt-4 md:pt-6 md:pb-6"
        >
          <div className="relative h-full w-full max-w-[450px] md:rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
            <ReelPlayer reel={reel} currentUser={currentUser} />
          </div>
        </div>
      ))}
    </div>
```

**reel-player.tsx (dòng 21-51):** IntersectionObserver auto play/pause logic.

### 5.4. Thay đổi cần thực hiện
Tạo file `page.tsx` dạng `'use client'` (kiến trúc phẳng — tất cả trong 1 file):

1. **Hàm helper `parseVideoEmbed(url, source)`** (inline trong file):
   - `source === 'youtube'`: Trích xuất videoId từ URL YouTube (hỗ trợ `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`). Trả về iframe src: `https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1`
   - `source === 'facebook'`: Trả về iframe src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&muted=true`
   - `source === 'direct'`: Trả về URL gốc (dùng `<video>` tag)

2. **Mock Data tập phim** (8-10 episodes) trộn lẫn 3 nguồn:
   - Tập 1-3: `videoSource: 'youtube'`, `videoUrl` = URL YouTube thật (VD: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` hoặc video ngắn dọc công khai khác)
   - Tập 4-5: `videoSource: 'facebook'`, `videoUrl` = URL Facebook Video công khai
   - Tập 6-8: `videoSource: 'direct'`, `videoUrl` = URL mp4 test (VD: `https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4`)
   - Mỗi episode có `id`, `seriesTitle`, `episodeNumber`, `title`, `videoUrl`, `videoSource`, `isFree`

3. **Container lướt dọc**: `snap-y snap-mandatory` + `h-[calc(100vh-3.5rem)]` (trừ TopHeader 56px). `scrollbar-hide overflow-y-auto`.

4. **Episode Player Component (inline)** — render theo `videoSource`:
   - **`direct`**: `<video>` tag với `loop playsInline muted`, ref + IntersectionObserver (threshold 0.6) để auto play/pause. Click toggle play/pause.
   - **`youtube`**: `<iframe>` tag với `allow="autoplay; encrypted-media"`, `allowFullScreen`, chiều cao/rộng 100%. Bọc trong div aspect-[9/16]. IntersectionObserver chỉ dùng để lazy-load (set src khi vào viewport, xóa src khi ra).
   - **`facebook`**: `<iframe>` tag tương tự YouTube, dùng Facebook Video Plugin URL. Bọc trong div aspect-[9/16].
   - Overlay bottom-left: Tên series (font-bold), `Tập X`, badge nguồn video (🎬 YouTube / 📘 Facebook / 🎥 Direct)
   - Overlay bottom-right: Nút Like (Heart), Comment (MessageCircle), Share (Share2) — chỉ UI mock
   - **Paywall Indicator**: Nếu `isFree === false`, hiển thị lớp phủ mờ + icon Lock + text "Tập này bị khóa" (chỉ hiển thị, chưa có logic)

5. **Nút quay lại**: Button absolute top-left "← Khám phá" link về dashboard.

6. **Layout override**: Ẩn sidebar khi ở trang watch (conditional check `pathname.includes('/watch')` trong layout).

### 5.5. Vùng CẤM (trong task này)
- KHÔNG import trực tiếp từ `reels/reel-player.tsx` (viết logic riêng, chỉ tham khảo pattern)
- KHÔNG kết nối database (Phase 1 dùng mock data)
- KHÔNG viết logic Coin/Unlock thật (chỉ UI placeholder lock)
- KHÔNG dùng thư viện ngoài cho YouTube/Facebook embed (dùng iframe thuần)

### 5.6. Phụ thuộc
Task 3 phải hoàn tất trước (cần layout cô lập đã tạo).

### 5.7. Verification (Cách kiểm tra đúng/sai)
- Chạy `npx tsc --noEmit` — không có lỗi TypeScript mới
- Truy cập `/hero-short/t/[teamId]/watch`:
  - Tập YouTube: iframe hiển thị đúng, autoplay khi cuộn vào
  - Tập Facebook: iframe hiển thị đúng video Facebook
  - Tập Direct: `<video>` tag tự động play/pause khi cuộn
- Lướt dọc → snap bắt dính chính xác từng tập phim
- Tập bị khóa hiển thị overlay Lock mờ
- Badge nguồn video (YouTube/Facebook/Direct) hiển thị đúng

### 5.8. Kết quả mong đợi
- Trải nghiệm xem phim full-screen dọc mượt mà với cả 3 nguồn video
- YouTube/Facebook iframe nhúng không cần hosting = 0đ bandwidth
- Direct video auto play/pause hoạt động chính xác
- Các tập "khóa" hiển thị giao diện paywall placeholder
- Responsive: hoạt động tốt trên cả desktop (max-w-[450px] centered) và mobile

---

## THỨ TỰ THỰC HIỆN

```
Task 1 (Registry + Layout check) ─┐
                                   ├──→ Task 3 (Layout + Sidebar + Redirect) ──→ Task 4 (Dashboard) ──→ Task 5 (Watch Page)
Task 2 (Database Schema)  ────────┘
```

- Task 1 và Task 2 có thể làm **song song**
- Task 3 phụ thuộc Task 1 (cần `hero-short` trong registry)
- Task 4 và 5 phụ thuộc Task 3 (cần layout đã tạo)
- Task 4 và 5 **phải làm tuần tự** (4 trước, 5 sau — vì Dashboard link đến Watch)

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Thêm entry `### 8. HeroShort (MVP Mới - Phim ngắn dọc)` với status `Beta` và danh sách các task đã hoàn thành
- Cập nhật UI_MAP.md: Thêm subgraph `MVP5: HeroShort` với 3 routes (dashboard, watch, admin) và data flow
- Cập nhật LESSONS.md: Ghi nhận pattern "Vertical Video Snap Scroll" nếu phát hiện trick mới
