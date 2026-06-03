# PLAN_CONNECT_HUB — AI2Hero Connect Hub Lite
> Ngày tạo: 2026-06-02
> Tác giả: Claude Opus (CTO/Architect)
> Tổng hợp từ: Audit MVP Integration Guide + Audit Activepieces + Plan ChatGPT (v1 Docker + v2 Lite)
> Số phases: 5
> Ước tính: ~12-16h chia nhiều session Flash
> Chi phí hạ tầng thêm: **0đ** (chạy trên Vercel + Supabase hiện tại)

---

## MỤC TIÊU TỔNG

Xây dựng **AI2Hero Connect Hub Lite** — cổng kết nối ứng dụng trung tâm chạy **100% trên stack hiện tại** (Next.js + Vercel + Supabase) mà không cần Docker, Redis, VPS hay bất kỳ chi phí hạ tầng nào.

**Triết lý**: Không bê cả nhà máy Activepieces về chạy. Chỉ bê **bản vẽ + linh kiện cần thiết** (cấu trúc auth, cách gọi API từng app, schema connector). AI2Hero tự viết các connector nhẹ chạy on-demand qua Serverless API Routes.

```
Gói Free:  Connect Hub Lite → On-demand API call → 0đ chi phí
Gói Pro:   (Tương lai) Bật Activepieces/n8n full trên VPS → Workflow tự động
```

---

## BỐI CẢNH KIẾN TRÚC

### Hiện trạng AI2Hero (Audit #1)
- **Stack**: Next.js 16 + React 19 + TypeScript + PostgreSQL (Supabase) + Drizzle ORM + Tailwind CSS + shadcn/ui
- **Deploy**: Vercel (Serverless) + Supabase PostgreSQL
- **Bảo mật đã có**: AES-256-GCM encryption ([sim-crypto.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/sim-crypto.ts)), JWT Token ([extension-actions.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/extension-actions.ts))
- **Cổng MVP đã có**: [feed-dispatcher.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/db/feed-dispatcher.ts) — đẩy bài viết lên Social Feed
- **Multi-tenant**: Cookie `activeTeamId` → `teamId` scoped toàn bộ queries

### Activepieces (Audit #2) — Vai trò mới: KHO THAM KHẢO
- **License core**: MIT ✅ → An toàn copy schema/code connector
- **Pieces**: ~280+ connectors viết TypeScript → Tham khảo cách auth, cách gọi API
- **Không chạy engine/Docker/Redis** — Chỉ đọc source code để học cấu trúc

### Kiến trúc Connect Hub Lite

```
┌──────────────────────────────────────────────────────┐
│              AI2HERO FRONTEND (Vercel)                │
│         Next.js 16 — Dark Mode Premium               │
│                                                       │
│  /connect-hub/dashboard     Tổng quan                 │
│  /connect-hub/apps          Catalog ứng dụng          │
│  /connect-hub/connections   Quản lý kết nối           │
│  /connect-hub/logs          Nhật ký sử dụng           │
└──────────────────┬───────────────────────────────────┘
                   │ Server Actions / API Routes
                   ▼
┌──────────────────────────────────────────────────────┐
│          AI2HERO BACKEND (Vercel Serverless)          │
│                                                       │
│  Auth ✓  │  Workspace ✓  │  RBAC ✓  │  Billing ✓    │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │           CONNECTION REGISTRY                    │ │
│  │  Lưu credential mã hóa AES-256-GCM             │ │
│  │  Scoped 100% theo teamId                        │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │           CONNECTOR ENGINE (Lightweight)         │ │
│  │  Mỗi connector = 1 file TypeScript              │ │
│  │  Chạy on-demand khi user bấm / MVP gọi          │ │
│  │                                                   │ │
│  │  ├─ google-drive.ts                              │ │
│  │  ├─ google-sheets.ts                             │ │
│  │  ├─ gmail.ts                                     │ │
│  │  ├─ telegram.ts                                  │ │
│  │  ├─ openai.ts                                    │ │
│  │  ├─ kiotviet.ts       ← Custom VN               │ │
│  │  ├─ pancake.ts        ← Custom VN               │ │
│  │  └─ custom-http.ts   ← Tự thêm API bất kỳ      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  POST /api/connect-hub/run-action                    │
│  → Check quyền → Giải mã cred → Gọi API → Log      │
└──────────────────┬───────────────────────────────────┘
                   │ fetch() on-demand
                   ▼
        ┌──────────────────────┐
        │    External Apps     │
        │  Google │ KiotViet   │
        │  Pancake │ Telegram  │
        │  Slack │ Notion │ …  │
        └──────────────────────┘
```

> [!IMPORTANT]
> **Zero infrastructure cost**: Không Docker, không Redis, không Worker, không VPS riêng. Chạy 100% trên Vercel Serverless + Supabase PostgreSQL đang có.

---

## RÀNG BUỘC TOÀN CỤC (Global Constraints)

- **KHÔNG chạy Activepieces Docker** — chỉ tham khảo source code MIT
- **KHÔNG cần Redis/Worker/Queue** — mọi thứ chạy on-demand
- **KHÔNG show API key/secret đầy đủ ra frontend** — luôn mask `••••abcd`
- **PHẢI mã hóa credential** bằng AES-256-GCM (tái sử dụng `sim-crypto.ts` đã có)
- **PHẢI tuân thủ** [MVP_INTEGRATION_GUIDE.md](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/MVP_INTEGRATION_GUIDE.md) đủ 9 giai đoạn
- **PHẢI cách ly dữ liệu** theo `teamId` (Multi-tenant)
- CSS: Dark Mode Premium, gradient cam-hồng, Glassmorphism
- Mỗi connector = 1 file TypeScript đặt trong `app/lib/connect-hub/connectors/`

---

## TÍNH NĂNG GIỮ LẠI vs BỎ KHỎI MVP FREE

### ✅ Giữ lại (MVP Free)
```
Kết nối app (nhập API key / OAuth)
Test connection tức thì
Gọi action on-demand (khi user bấm hoặc MVP gọi)
Custom HTTP API connector (tự thêm API bất kỳ)
Usage log cơ bản
Dùng connection cho MVP khác
Mã hóa credential an toàn tuyệt đối
```

### ❌ Bỏ tạm (Gói Pro tương lai)
```
Workflow builder kéo thả
Trigger tự động real-time
Polling định kỳ (mỗi 5 phút)
Queue retry phức tạp
Execution history chi tiết
Automation chạy nền 24/7
```

---

## CONNECTOR REGISTRY — Cấu trúc chuẩn

Mỗi connector được định nghĩa bằng 1 file config + 1 file runtime. Cấu trúc học từ Activepieces pieces nhưng đơn giản hóa triệt để:

```typescript
// app/lib/connect-hub/connectors/registry.ts
// Danh sách khai báo tĩnh tất cả connectors

export interface ConnectorDefinition {
  slug: string;           // "kiotviet", "google-drive"
  name: string;           // "KiotViet"
  icon: string;           // Lucide icon name
  category: string;       // "pos", "storage", "email", "chat", "crm", "developer"
  description: string;
  authType: 'oauth2' | 'api_key' | 'client_credentials' | 'bearer_token' | 'basic' | 'custom_http';
  authFields: AuthField[];
  actions: ActionDefinition[];
  popular?: boolean;      // Hiển thị trong tab "Phổ biến"
  vietnam?: boolean;      // Hiển thị trong tab "App Việt Nam"
}

export interface AuthField {
  name: string;       // "clientId"
  label: string;      // "Client ID"
  type: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  secret?: boolean;   // true → mã hóa khi lưu DB, mask khi hiển thị
  placeholder?: string;
  helpText?: string;
}

export interface ActionDefinition {
  slug: string;       // "list_orders"
  name: string;       // "Lấy danh sách đơn hàng"
  description: string;
  inputSchema: InputField[];  // Các tham số đầu vào
}
```

**Ví dụ connector KiotViet**:
```typescript
// app/lib/connect-hub/connectors/definitions/kiotviet.ts
export const kiotvietConnector: ConnectorDefinition = {
  slug: 'kiotviet',
  name: 'KiotViet',
  icon: 'ShoppingCart',
  category: 'pos',
  description: 'Đồng bộ sản phẩm, tồn kho, đơn hàng, khách hàng từ KiotViet.',
  authType: 'client_credentials',
  authFields: [
    { name: 'retailer', label: 'Tên gian hàng (Retailer)', type: 'text', required: true, placeholder: 'vd: shopthohong' },
    { name: 'clientId', label: 'Client ID', type: 'text', required: true },
    { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'list_products', name: 'Lấy danh sách sản phẩm', description: 'Truy vấn toàn bộ sản phẩm', inputSchema: [] },
    { slug: 'list_orders', name: 'Lấy đơn hàng', description: 'Lấy đơn hàng theo khoảng thời gian', inputSchema: [
      { name: 'fromDate', label: 'Từ ngày', type: 'date', required: false },
      { name: 'toDate', label: 'Đến ngày', type: 'date', required: false },
    ]},
    { slug: 'list_customers', name: 'Lấy khách hàng', description: 'Danh sách khách hàng', inputSchema: [] },
    { slug: 'get_inventory', name: 'Lấy tồn kho', description: 'Kiểm tra số lượng tồn kho', inputSchema: [] },
  ],
  vietnam: true,
};
```

**Ví dụ connector Custom HTTP API** (QUAN TRỌNG nhất — cho phép khách tự thêm API bất kỳ):
```typescript
export const customHttpConnector: ConnectorDefinition = {
  slug: 'custom-http',
  name: 'Custom HTTP API',
  icon: 'Globe',
  category: 'developer',
  description: 'Kết nối với bất kỳ API nào bằng URL và xác thực tùy chỉnh.',
  authType: 'custom_http',
  authFields: [
    { name: 'baseUrl', label: 'Base URL', type: 'url', required: true, placeholder: 'https://api.example.com' },
    { name: 'authMethod', label: 'Kiểu xác thực', type: 'select', required: true,
      options: ['none', 'bearer_token', 'api_key_header', 'basic_auth'] },
    { name: 'token', label: 'Token / API Key', type: 'password', required: false, secret: true },
    { name: 'headerName', label: 'Tên Header (nếu dùng API Key)', type: 'text', required: false, placeholder: 'X-API-Key' },
    { name: 'username', label: 'Username (Basic Auth)', type: 'text', required: false },
    { name: 'password', label: 'Password (Basic Auth)', type: 'password', required: false, secret: true },
  ],
  actions: [
    { slug: 'get_request', name: 'GET Request', description: 'Gửi GET request', inputSchema: [
      { name: 'path', label: 'Đường dẫn API', type: 'text', required: true, placeholder: '/api/v1/orders' },
    ]},
    { slug: 'post_request', name: 'POST Request', description: 'Gửi POST request với body JSON', inputSchema: [
      { name: 'path', label: 'Đường dẫn API', type: 'text', required: true },
      { name: 'body', label: 'Body (JSON)', type: 'textarea', required: false },
    ]},
  ],
  popular: true,
};
```

---

## PHASE 1: DATABASE & CONNECTOR ENGINE (~3-4h Flash)

### Mục tiêu
Tạo schema DB, tầng mã hóa credential, cấu trúc connector registry, và connector engine chạy on-demand.

---

### TASK 1: Schema Drizzle ORM (connect_hub_connections + usage_logs)

#### 1.1. Mô tả
Thêm 2 bảng vào schema AI2Hero: bảng lưu connection (credential mã hóa) và bảng log sử dụng. Tuân thủ Giai đoạn 1 MVP Integration Guide (trường `teamId` bắt buộc, cách ly dữ liệu).

#### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/schema.ts` | MODIFY | ~50 dòng thêm cuối file |

#### 1.3. Code Snapshot tại điểm sửa
Thêm sau khối cuối cùng của schema hiện tại (sau các bảng `video_assets`, `extension_tokens`...), trước dòng cuối file.

#### 1.4. Thay đổi cần thực hiện
```typescript
// === CONNECT HUB ===

export const connectHubConnections = pgTable('connect_hub_connections', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  appSlug: varchar('app_slug', { length: 100 }).notNull(),
  appName: varchar('app_name', { length: 255 }).notNull(),
  connectionName: varchar('connection_name', { length: 255 }).notNull(),
  authType: varchar('auth_type', { length: 50 }).notNull(),
  // Credential mã hóa AES-256-GCM — KHÔNG BAO GIỜ lưu plaintext
  encryptedCredentials: text('encrypted_credentials').notNull(),
  status: varchar('status', { length: 50 }).default('connected').notNull(),
  usedByModules: jsonb('used_by_modules').default([]),
  lastTestedAt: timestamp('last_tested_at'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const connectHubUsageLogs = pgTable('connect_hub_usage_logs', {
  id: serial('id').primaryKey(),
  connectionId: integer('connection_id').notNull().references(() => connectHubConnections.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  callerModule: varchar('caller_module', { length: 100 }),
  appSlug: varchar('app_slug', { length: 100 }),
  actionName: varchar('action_name', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### 1.5. Vùng CẤM
- KHÔNG sửa các bảng schema hiện có (`teams`, `users`, `sim_*`, `feed_*`, `video_*`, `extension_*`)
- KHÔNG thêm relation vào bảng `teams` hoặc `users` hiện tại

#### 1.6. Phụ thuộc
Không

#### 1.7. Verification
- `pnpm db:push` chạy thành công
- Kiểm tra Supabase dashboard thấy 2 bảng mới

#### 1.8. Kết quả mong đợi
2 bảng `connect_hub_connections` và `connect_hub_usage_logs` tồn tại trong PostgreSQL, sẵn sàng cho queries.

---

### TASK 2: Connector Registry + 5 connectors ban đầu

#### 1.1. Mô tả
Tạo cấu trúc thư mục connector và đăng ký 5 connectors ban đầu: Custom HTTP API, Google Sheets, Gmail, KiotViet, Telegram. Tham khảo cấu trúc auth/action từ Activepieces pieces MIT nhưng viết schema riêng.

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/types.ts` | NEW | ~50 dòng |
| `app/lib/connect-hub/connectors/registry.ts` | NEW | ~30 dòng |
| `app/lib/connect-hub/connectors/definitions/custom-http.ts` | NEW | ~40 dòng |
| `app/lib/connect-hub/connectors/definitions/google-sheets.ts` | NEW | ~40 dòng |
| `app/lib/connect-hub/connectors/definitions/gmail.ts` | NEW | ~35 dòng |
| `app/lib/connect-hub/connectors/definitions/kiotviet.ts` | NEW | ~45 dòng |
| `app/lib/connect-hub/connectors/definitions/telegram.ts` | NEW | ~35 dòng |

#### 1.4. Thay đổi cần thực hiện
- `types.ts`: Định nghĩa interface `ConnectorDefinition`, `AuthField`, `ActionDefinition`, `InputField` (như mẫu ở phần CONNECTOR REGISTRY ở trên)
- `registry.ts`: Import tất cả definitions, export mảng `ALL_CONNECTORS` và helper `getConnectorBySlug(slug)`
- Mỗi file definition: Export 1 object `ConnectorDefinition` theo schema chuẩn

#### 1.5. Vùng CẤM
- KHÔNG import bất kỳ runtime code nào từ Activepieces npm packages
- KHÔNG copy code có license header Enterprise/Commercial

#### 1.6. Phụ thuộc
Không

#### 1.7. Verification
- Import `ALL_CONNECTORS` trong test → trả về mảng 5 connectors
- `pnpm build` không lỗi TypeScript

#### 1.8. Kết quả mong đợi
Thư mục `app/lib/connect-hub/connectors/` có cấu trúc sạch với 5 connector definitions.

---

### TASK 3: Connector Runners (Logic gọi API thực tế)

#### 1.1. Mô tả
Viết logic runtime thực tế cho mỗi connector — hàm `authenticate()` (lấy access token) và `runAction()` (gọi API). Bắt đầu với 2 connector quan trọng nhất: **Custom HTTP** và **KiotViet**.

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/runners/custom-http.ts` | NEW | ~80 dòng |
| `app/lib/connect-hub/connectors/runners/kiotviet.ts` | NEW | ~120 dòng |
| `app/lib/connect-hub/connectors/engine.ts` | NEW | ~60 dòng |

#### 1.4. Thay đổi cần thực hiện

**engine.ts** — Dispatcher trung tâm:
```typescript
// app/lib/connect-hub/connectors/engine.ts
import { runCustomHttp } from './runners/custom-http';
import { runKiotViet } from './runners/kiotviet';

const RUNNERS: Record<string, (creds: any, action: string, input: any) => Promise<any>> = {
  'custom-http': runCustomHttp,
  'kiotviet': runKiotViet,
  // Thêm runner mới ở đây
};

export async function executeAction(
  appSlug: string,
  decryptedCredentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const runner = RUNNERS[appSlug];
  if (!runner) {
    return { success: false, error: `Connector "${appSlug}" chưa có runtime. Vui lòng dùng Custom HTTP API.` };
  }
  try {
    const data = await runner(decryptedCredentials, actionSlug, input);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi khi gọi API bên ngoài' };
  }
}
```

**kiotviet.ts** — Ví dụ runner KiotViet (tham khảo Activepieces MIT pieces):
```typescript
// Bước 1: Lấy access_token từ client_credentials
// POST https://id.kiotviet.vn/connect/token
// grant_type=client_credentials&client_id=...&client_secret=...&scopes=PublicApi.Access

// Bước 2: Gọi API với Bearer token
// GET https://public.kiotapi.com/products?retailer=...
// Header: Authorization: Bearer <token>, Retailer: <retailer>
```

**custom-http.ts** — Runner Custom HTTP (quan trọng nhất cho độ linh hoạt):
```typescript
// Đọc authMethod từ credentials
// Tạo headers tương ứng (Bearer, API Key, Basic Auth, hoặc None)
// Gọi fetch() với method GET/POST theo action slug
// Trả raw JSON response
```

#### 1.5. Vùng CẤM
- KHÔNG lưu access_token vĩnh viễn — sinh mới mỗi lần gọi (token ngắn hạn)
- KHÔNG log credential ra console

#### 1.6. Phụ thuộc
Task 2 (cần types.ts)

#### 1.7. Verification
- Gọi `executeAction('custom-http', creds, 'get_request', { path: '/test' })` → nhận response
- `pnpm build` không lỗi TypeScript

#### 1.8. Kết quả mong đợi
2 connector runners hoạt động, engine dispatcher sẵn sàng.

---

### TASK 4: Queries & Server Actions (CRUD Connection)

#### 1.1. Mô tả
Viết tầng truy xuất dữ liệu scoped theo `teamId` và Server Actions cho CRUD connection. **Tái sử dụng `encryptField()`/`decryptField()` từ `sim-crypto.ts`** để mã hóa credential.

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/connect-hub-queries.ts` | NEW | ~60 dòng |
| `app/lib/db/connect-hub-actions.ts` | NEW | ~180 dòng |

#### 1.4. Thay đổi cần thực hiện

**connect-hub-queries.ts**:
```typescript
export async function getConnectionsByTeam(teamId: number) { ... }
export async function getConnectionById(teamId: number, connId: number) { ... }
export async function getUsageLogs(teamId: number, limit?: number) { ... }
export async function getConnectionStats(teamId: number) { ... }
// → Tất cả đều có .where(eq(table.teamId, teamId))
```

**connect-hub-actions.ts**:
```typescript
'use server';
import { encryptField, decryptField } from '@/lib/sim-crypto';
import { executeAction } from '@/lib/connect-hub/connectors/engine';

// Tạo connection mới (mã hóa credential trước khi lưu)
export async function createConnectionAction(data: {
  appSlug: string; appName: string; connectionName: string;
  authType: string; credentials: Record<string, string>;
}) { ... }

// Test connection (giải mã cred → gọi action test → trả kết quả)
export async function testConnectionAction(connectionId: number) { ... }

// Xóa connection
export async function deleteConnectionAction(connectionId: number) { ... }

// Chạy action on-demand (MVP khác gọi)
export async function runActionAction(data: {
  connectionId: number; actionSlug: string;
  input: Record<string, any>; callerModule?: string;
}) {
  // 1. Kiểm tra session + quyền workspace
  // 2. Lấy connection từ DB (check teamId)
  // 3. Giải mã credential bằng decryptField()
  // 4. Gọi executeAction(appSlug, creds, action, input)
  // 5. Ghi usage log
  // 6. Trả kết quả (KHÔNG trả credential)
}
```

#### 1.5. Vùng CẤM
- KHÔNG trả `encryptedCredentials` raw ra client
- KHÔNG log credential giải mã ra console production
- KHÔNG import schema `sim_*`

#### 1.6. Phụ thuộc
Task 1 (schema) + Task 3 (engine)

#### 1.7. Verification
- Tạo connection test → kiểm tra DB thấy `encrypted_credentials` là ciphertext
- Gọi `testConnectionAction` → trả `{ success: true }` hoặc lỗi cụ thể
- `pnpm build` không lỗi

#### 1.8. Kết quả mong đợi
Tầng data layer hoàn chỉnh, mã hóa credential an toàn, sẵn sàng cho UI và API.

---

## PHASE 2: ĐĂNG KÝ MVP & API GATEWAY (~1-2h Flash)

### TASK 5: Đăng ký Apps Registry + Admin Settings

#### 1.1. Mô tả
Tuân thủ Giai đoạn 2 & 8 của MVP Integration Guide.

#### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| [apps-registry.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/apps-registry.ts) | MODIFY | ~25 dòng thêm vào mảng APPS |
| `app/app/admin/settings/page.tsx` | MODIFY | ~2 dòng thêm vào AVAILABLE_APPS |

#### 1.3. Code Snapshot tại điểm sửa
```typescript
// apps-registry.ts dòng 68 — sau entry herovideo, trước dấu ];
  },
];
```

#### 1.4. Thay đổi cần thực hiện
Thêm entry mới vào mảng `APPS`:
```typescript
{
  id: 'connect-hub',
  name: 'Connect Hub',
  description: 'Cổng kết nối ứng dụng — Google Drive, Sheets, KiotViet, Pancake và hàng trăm app khác.',
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
    'Connector Việt Nam: KiotViet, Pancake, Nhanh.vn',
  ],
  benefits: [
    'Không cần kỹ thuật — chỉ nhập API key hoặc đăng nhập',
    '0đ chi phí — chạy hoàn toàn trên cloud miễn phí',
  ],
  targetUsers: 'Mọi doanh nghiệp cần kết nối dữ liệu từ nhiều ứng dụng.',
}
```

Thêm vào `AVAILABLE_APPS` trong Admin Settings:
```typescript
{ id: 'connect-hub', name: 'Connect Hub' },
```

#### 1.5. Vùng CẤM
Không sửa entry `sim` hoặc `herovideo` hiện có

#### 1.6. Phụ thuộc
Không

#### 1.7. Verification
- Vào `/dashboard/store` thấy card Connect Hub
- Admin Settings thấy checkbox Connect Hub trong danh sách app

#### 1.8. Kết quả mong đợi
Connect Hub xuất hiện trong hệ sinh thái AI2Hero, có thể kích hoạt từ Store.

---

### TASK 6: API Route — run-action endpoint

#### 1.1. Mô tả
Tạo API endpoint chính để các MVP khác gọi connection on-demand. Tuân thủ Giai đoạn 9 MVP Integration Guide (xác thực Bearer Token cho external client nếu cần, hoặc session auth cho internal).

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/api/connect-hub/run-action/route.ts` | NEW | ~90 dòng |
| `app/app/api/connect-hub/connections/route.ts` | NEW | ~50 dòng |

#### 1.4. Thay đổi cần thực hiện

**POST `/api/connect-hub/run-action`**:
```typescript
// Body mẫu từ MVP Thư viện tri thức:
// { "connection_id": 42, "action": "list_files", "input": { "folder_id": "abc" }, "caller": "knowledge_base" }

// Xử lý:
// 1. Xác thực session (getUser)
// 2. Lấy teamId từ cookie
// 3. Lấy connection từ DB (check teamId → tenant isolation)
// 4. Kiểm tra gói cước cho phép app này không (billing gating)
// 5. Giải mã credential
// 6. Gọi executeAction()
// 7. Ghi usage log
// 8. Trả kết quả JSON (KHÔNG trả credential)
```

**GET `/api/connect-hub/connections`**:
```typescript
// Trả danh sách connections của workspace hiện tại
// Mask tất cả secret fields → "••••abcd"
```

#### 1.5. Vùng CẤM
- KHÔNG trả `encryptedCredentials` trong response
- KHÔNG cho phép gọi cross-workspace

#### 1.6. Phụ thuộc
Task 1, 3, 4

#### 1.7. Verification
- Gọi `POST /api/connect-hub/run-action` với connection hợp lệ → nhận data từ API ngoài
- Gọi với `connection_id` sai workspace → trả 403

#### 1.8. Kết quả mong đợi
API Gateway hoàn chỉnh, an toàn, các MVP khác gọi được.

---

## PHASE 3: GIAO DIỆN UI (~5-6h Flash)

### TASK 7: Route Group & Layout + Dashboard

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/connect-hub/layout.tsx` | NEW | ~25 dòng (Server Component) |
| `app/app/(dashboard)/connect-hub/connect-hub-tabs.tsx` | NEW | ~45 dòng (Client Component, usePathname) |
| `app/app/(dashboard)/connect-hub/loading.tsx` | NEW | ~15 dòng (Glassmorphism spinner) |
| `app/app/(dashboard)/connect-hub/dashboard/page.tsx` | NEW | ~200 dòng |

**Dashboard hiển thị**:
- 4 Stats Cards: Tổng kết nối | Đang hoạt động | Lỗi | Lượt dùng tháng này
- Bảng "Kết nối gần đây" (5 dòng mới nhất) với status badge
- Panel "Lối tắt" → Thêm kết nối mới, Xem tất cả app

---

### TASK 8: App Catalog (`/connect-hub/apps`)

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/connect-hub/apps/page.tsx` | NEW | ~40 dòng (Server loader) |
| `app/app/(dashboard)/connect-hub/apps/apps-client.tsx` | NEW | ~350 dòng |

**Giao diện**:
- Thanh tìm kiếm: "Tìm ứng dụng cần kết nối..."
- Pill filter: **Phổ biến** | App Việt Nam | Lưu trữ | Email | Bán hàng/POS | Chat | Developer | Tất cả
- Grid cards: Icon app + Tên + Mô tả ngắn + Badge trạng thái (Đã/Chưa kết nối)
- **Click card → Mở Connect Modal** (slide-over hoặc modal):
  - Hiển thị form auth fields động theo `connectorDefinition.authFields`
  - Trường `secret: true` → input type password
  - Nút "Test kết nối" → gọi `testConnectionAction`
  - Nút "Lưu kết nối" → gọi `createConnectionAction`

> [!IMPORTANT]
> **Lọc thông minh**: Tab "Phổ biến" mặc định (~5 app: Custom HTTP, Google Sheets, Gmail, Telegram, KiotViet). Khách bấm "Tất cả" mới thấy hết. Không show cả rừng app ngay từ đầu.

---

### TASK 9: My Connections (`/connect-hub/connections`)

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/connect-hub/connections/page.tsx` | NEW | ~40 dòng |
| `app/app/(dashboard)/connect-hub/connections/connections-client.tsx` | NEW | ~280 dòng |

**Giao diện**:
- Bảng/Grid: App icon | Tên kết nối | Trạng thái (badge xanh `Đã kết nối` / đỏ `Lỗi` / vàng `Hết hạn`) | MVP đang dùng | Lần test gần nhất
- Nút hành động mỗi dòng: 🔄 Test | ✏️ Cập nhật | 🔌 Ngắt kết nối
- Drawer chi tiết connection (slide-over bên phải):
  - Thông tin app + auth type
  - Credential masked: `Client ID: abc***789`, `Secret: ••••••••efgh`
  - MVP đang sử dụng connection này (chips)
  - Lịch sử lỗi gần nhất
  - Nút Cập nhật API key / Nút Ngắt kết nối (đỏ)

---

### TASK 10: Usage Logs (`/connect-hub/logs`)

#### 1.2. Files cần tạo
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/connect-hub/logs/page.tsx` | NEW | ~30 dòng |
| `app/app/(dashboard)/connect-hub/logs/logs-client.tsx` | NEW | ~180 dòng |

**Giao diện**: Bảng nhật ký — Thời gian | App | Action | Module gọi | Trạng thái (✅/❌) | Thời gian xử lý (ms)
Hỗ trợ: Tìm kiếm, lọc theo trạng thái, phân trang 10 dòng/trang.

---

## PHASE 4: CONNECTOR VIỆT NAM & MỞ RỘNG (~3-4h Flash)

### TASK 11: Pancake POS/Chat Runner
**Auth**: API Key/Access Token + Page ID
**Actions**: Lấy hội thoại, khách hàng, đơn hàng, tạo ghi chú

### TASK 12: Thêm connectors phổ biến
Viết thêm definitions + runners cho: Google Drive, Google Sheets, Notion, Slack (tham khảo Activepieces pieces MIT).

### TASK 13: Feed Dispatcher Integration
Đẩy thông báo lên Social Feed khi: Connection mới được tạo, connection bị lỗi, action quan trọng thực thi. Tuân thủ Giai đoạn 7 MVP Integration Guide (gọi `dispatchMvpFeedPost`).

---

## PHASE 5: HOÀN THIỆN & TÀI LIỆU (~2h Flash)

### TASK 14: Billing Gating
Tích hợp kiểm tra gói cước trong `runActionAction`:
| Gói | Connections | Lượt action/tháng | Custom HTTP |
|---|---|---|---|
| Free | 3 | 500 | ✅ |
| Pro | 20 | 50.000 | ✅ |
| Enterprise | ∞ | ∞ | ✅ |

### TASK 15: Bảo mật audit final
- Kiểm tra không có credential plaintext trong log/response
- Kiểm tra tenant isolation trên tất cả queries
- Kiểm tra mask credential trên tất cả UI

### TASK 16: Cập nhật tài liệu
- **START.md**: Thêm "### 4. Connect Hub Lite (MVP Mới)" trong TRANG THAI
- **UI_MAP.md**: Thêm 4 trang Connect Hub đủ 4 mục chuẩn + cập nhật sơ đồ Mermaid
- **CHANGELOG.md**: Ghi nhật ký tích hợp kỹ thuật

---

## THỨ TỰ THỰC HIỆN

```
Task 1 (Schema)──┐
Task 2 (Registry) ├──→ Task 4 (Actions)──→ Task 6 (API Route)──→ Task 7-10 (UI)
Task 3 (Runners)──┘         │
                              └──→ Task 5 (App Registry) ──→ Task 7 (Layout)
                                                                    │
                                                               Task 11-13 (VN + Feed)
                                                                    │
                                                               Task 14-16 (Polish)
```

**Có thể làm song song**: Task 1 + 2 + 3 (không phụ thuộc nhau). Task 5 độc lập.

---

## PHÂN BỔ MODEL AI

| Task | Model | Lý do |
|---|---|---|
| Task 1-4 (DB + Engine) | Flash | Code logic rõ, theo pattern `sim-*` có sẵn |
| Task 5 (Registry) | Flash | Thay đổi nhỏ ~30 dòng |
| Task 6 (API Route) | Flash | Pattern giống `/api/video/extension/sync` |
| Task 7-10 (UI 4 trang) | Flash | Code UI nhiều, theo pattern SIM có sẵn |
| Task 11-13 (VN connectors) | Flash | Viết TypeScript đơn giản |
| Task 14-16 (Polish) | Flash | Thay đổi nhỏ, tài liệu |

> [!TIP]
> **Toàn bộ plan chạy được bằng Flash** vì không có quyết định kiến trúc phức tạp. Opus chỉ cần khi mở rộng lên bản Pro (thêm Activepieces engine).

---

## LỘ TRÌNH TƯƠNG LAI (Khi có khách trả tiền)

```
Giai đoạn hiện tại (Free):
  Connect Hub Lite → On-demand API call → 0đ

Giai đoạn Pro (Tương lai):
  Deploy Activepieces CE trên VPS riêng
  → Kết nối với Connect Hub Lite sẵn có
  → Thêm workflow builder kéo thả
  → Thêm trigger tự động / polling / webhook
  → Thêm queue retry
  → Tính tiền theo số execution
```

---

## DEMO SCENARIOS

### Demo 1: Custom HTTP → Bất kỳ API nào
```
Khách nhập Base URL + Bearer Token → Test → Lưu → MVP khác gọi GET/POST tùy ý
```

### Demo 2: KiotViet → Báo cáo bán hàng AI
```
Khách kết nối KiotViet → Bấm "Lấy đơn hàng" → AI phân tích doanh thu → Gợi ý nhập hàng
```

### Demo 3: Pancake → CSKH AI
```
Khách kết nối Pancake → Lấy hội thoại → AI phân loại khách nóng/lạnh → Gợi ý chăm sóc
```
