# CONNECT HUB — Hướng Dẫn Tích Hợp & Gọi API Chuẩn
> Cập nhật: 2026-06-04 | Phiên bản: 1.0
> Tài liệu bắt buộc đọc khi: Tích hợp nền tảng API mới, hoặc gọi API từ các MVP nội bộ.

---

## MỤC LỤC

| # | Nội dung | Đối tượng |
|---|---------|-----------|
| 1 | [Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan) | Tất cả |
| 2 | [Chuẩn 1: Tích hợp Nền tảng API mới](#2-chuẩn-1-tích-hợp-nền-tảng-api-mới) | Dev tích hợp KiotViet, Haravan... |
| 3 | [Chuẩn 2: Gọi API từ MVP nội bộ](#3-chuẩn-2-gọi-api-từ-mvp-nội-bộ) | Dev viết Hero Report, AI Chat... |
| 4 | [Bảo mật & PII Redaction](#4-bảo-mật--pii-redaction) | Tất cả |
| 5 | [Checklist nhanh](#5-checklist-nhanh) | Review / QA |
| 6 | [Ví dụ thực tế](#6-ví-dụ-thực-tế) | Dev mới |

---

## 1. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CÁC MVP NỘI BỘ                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Hero Report  │ │   AI Chat    │ │  Dashboard   │  ...           │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘                │
│         │                │                │                         │
│         ▼                ▼                ▼                         │
│  ╔═══════════════════════════════════════════════════╗              │
│  ║        connector-service.ts (CỔNG DUY NHẤT)      ║              │
│  ║  ┌──────────┐ ┌──────────┐ ┌──────────┐          ║              │
│  ║  │ Validate │→│ Decrypt  │→│ Execute  │          ║              │
│  ║  │ Team+Con │ │ AES-256  │ │ Engine   │          ║              │
│  ║  └──────────┘ └──────────┘ └────┬─────┘          ║              │
│  ║                                 │                 ║              │
│  ║  ┌──────────┐ ┌──────────┐ ┌────▼─────┐          ║              │
│  ║  │ Log+PII  │←│Normalize │←│ Response │          ║              │
│  ║  │ Redactor │ │ Mapping  │ │          │          ║              │
│  ║  └──────────┘ └──────────┘ └──────────┘          ║              │
│  ╚═══════════════════════════════════════════════════╝              │
│                          │                                          │
│         ┌────────────────┼────────────────┐                         │
│         ▼                ▼                ▼                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Pancake POS  │ │   KiotViet   │ │  Telegram    │  ...           │
│  │  (Runner)    │ │  (Runner)    │ │  (Runner)    │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│                   CÁC NỀN TẢNG BÊN NGOÀI                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Nguyên tắc cốt lõi
1. **Một Cửa (Single Gateway)**: Mọi lệnh gọi API ra bên ngoài đều đi qua `connector-service.ts`.
2. **SSOT (Single Source of Truth)**: Mọi metadata về năng lực API đều nằm tại `definitions/`.
3. **PII-Safe Logging**: Nhật ký sử dụng luôn được lọc thông tin cá nhân trước khi lưu DB.
4. **Test vs Real**: Cờ `isTest` bắt buộc truyền, phân biệt gọi thử và gọi thật.

### Cây thư mục quan trọng

```
app/lib/connect-hub/
├── connector-service.ts          ← 🔴 CỔNG DUY NHẤT — mọi MVP gọi qua đây
├── connectors/
│   ├── types.ts                  ← Interface chuẩn (ConnectorDefinition, ActionDefinition)
│   ├── registry.ts               ← Đăng ký danh sách nền tảng
│   ├── engine.ts                 ← Router phân phối xuống Runner
│   ├── definitions/              ← 📘 Khai báo năng lực (SSOT)
│   │   ├── pancake-pos.ts
│   │   ├── kiotviet.ts
│   │   ├── telegram.ts
│   │   └── ...                   (23 files)
│   └── runners/                  ← 🔧 Logic gọi API thực tế
│       ├── pancake-pos/
│       │   ├── index.ts          ← Router nội bộ
│       │   ├── client.ts         ← HTTP Client (retry, timeout, SSRF guard)
│       │   ├── data-actions.ts   ← CRUD actions
│       │   └── report-actions.ts ← Aggregation actions
│       ├── kiotviet.ts
│       └── ...
├── capabilities/
│   ├── index.ts                  ← getCapabilities(appSlug) helper
│   └── presets.ts                ← Default mapping configs
└── utils/
    ├── mapper.ts                 ← Chuẩn hóa dữ liệu (Normalization)
    ├── auto-suggest.ts           ← AI gợi ý mapping tự động
    └── log-redactor.ts           ← 🛡️ Bộ lọc PII
```

---

## 2. Chuẩn 1: Tích hợp Nền tảng API mới

> Áp dụng khi: Thêm KiotViet, Haravan, TiktokShop, Sapo, hoặc bất kỳ API bên thứ 3 nào.

### Bước 1: Tạo file Definition (BẮT BUỘC)

📍 Đường dẫn: `app/lib/connect-hub/connectors/definitions/[ten-nen-tang].ts`

```typescript
import { ConnectorDefinition } from '../types';

export const kiotvietConnector: ConnectorDefinition = {
  slug: 'kiotviet',                     // Định danh duy nhất, kebab-case
  name: 'KiotViet',                     // Tên hiển thị UI
  icon: 'ShoppingBag',                  // Lucide Icon name
  category: 'pos',                      // pos | chat | ai | storage | ...
  description: 'Quản lý bán hàng đa kênh KiotViet.',
  
  // --- Auth ---
  authType: 'api_key',                  // oauth2 | api_key | bearer_token | basic | none
  authFields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      secret: true,                     // 🔴 BẮT BUỘC true → mã hóa AES-256-GCM khi lưu DB
      placeholder: 'Nhập API Key KiotViet...',
      helpText: 'Lấy tại KiotViet Admin > Cài đặt > API'
    }
  ],

  // --- Capabilities (Năng lực) ---
  actions: [
    {
      slug: 'list_products',
      name: 'Danh sách sản phẩm',
      description: 'Lấy toàn bộ sản phẩm trong cửa hàng.',
      
      // Metadata UI & AI (BẮT BUỘC khai báo đủ)
      group: 'Sản phẩm & Kho',
      httpMethod: 'GET',
      endpoint: '/products',
      status: 'ready',                  // ready | planned
      outputFields: ['id', 'name', 'price', 'stock'],
      aiInstruction: 'Bước 1: Gọi Action list_products.\nBước 2: Hiển thị bảng sản phẩm.',
      
      // Input Schema — Tự động vẽ form trên UI
      inputSchema: [
        { name: 'page', label: 'Trang', type: 'text', required: false, placeholder: '1' },
        { name: 'limit', label: 'Số lượng', type: 'text', required: false, placeholder: '20' },
      ],
      
      // Test automation
      testStrategy: 'direct',          // direct = test ngay không cần tham số đặc biệt
    },
    // ... thêm actions khác
  ],

  // --- Optional ---
  popular: true,
  setupGuide: '<p>Hướng dẫn lấy API Key KiotViet...</p>',
  lifecycle: {
    updatePolicy: 'manual',
    documentationUrl: 'https://docs.kiotviet.vn/'
  }
};
```

> ⚠️ **KHÔNG ĐƯỢC** hardcode metadata năng lực trên file giao diện (client component). Giao diện tự đọc từ Definition này qua `getCapabilities(appSlug)`.

---

### Bước 2: Viết Runner (Logic gọi API thực tế)

📍 Đường dẫn: `app/lib/connect-hub/connectors/runners/[ten-nen-tang].ts`

```typescript
/**
 * Runner cho KiotViet — xử lý HTTP request thật.
 * 
 * QUY TẮC BẮT BUỘC:
 * 1. Timeout: AbortController(15_000ms) — tránh Thread Pool Leak
 * 2. Retry: Tối đa 2 lần khi gặp 429/5xx (Exponential Backoff)
 * 3. SSRF Guard: KHÔNG gọi URL localhost/10.x/169.x/192.168.x
 * 4. Che API Key: Không in credentials ra console.log/error message
 */

export async function runKiotViet(
  creds: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const apiKey = creds.apiKey;
  
  switch (actionSlug) {
    case 'list_products':
      return await fetchProducts(apiKey, input);
    case 'get_order':
      return await fetchOrder(apiKey, input);
    default:
      throw new Error(`Action "${actionSlug}" chưa được hỗ trợ cho KiotViet.`);
  }
}

async function fetchProducts(apiKey: string, input: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  
  try {
    const res = await fetch('https://api.kiotviet.vn/products', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`KiotViet API lỗi: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

### Bước 3: Đăng ký vào Registry & Engine

**registry.ts** — Thêm 2 dòng:
```diff
+ import { kiotvietConnector } from './definitions/kiotviet';

  const RAW_CONNECTORS: ConnectorDefinition[] = [
+   kiotvietConnector,
    // ...
  ];

  const READY_SLUGS = [
+   'kiotviet',
    // ...
  ];
```

**engine.ts** — Thêm 2 dòng:
```diff
+ import { runKiotViet } from './runners/kiotviet';

  const RUNNERS = {
+   'kiotviet': runKiotViet,
    // ...
  };
```

### Bước 4: Thêm Default Mapping (Tùy chọn)

📍 Đường dẫn: `app/lib/connect-hub/capabilities/presets.ts`

```typescript
'kiotviet': {
  'product_name': { selected: 'name', suggestions: ['title', 'product_name'] },
  'product_price': { selected: 'basePrice', suggestions: ['price', 'salePrice'] },
  // ...
}
```

### Bước 5: Verify

```bash
npx tsc --noEmit          # Type check 0 lỗi
npm run dev               # UI tự hiện thẻ KiotViet mới
```

---

## 3. Chuẩn 2: Gọi API từ MVP nội bộ

> Áp dụng khi: Hero Report, AI Chat, Dashboard tự động, hoặc bất kỳ module nào cần gọi API ra ngoài.

### 🔴 QUY TẮC VÀNG: CẤM GỌI TRỰC TIẾP

```
❌ SAI (Cửa sau — TUYỆT ĐỐI CẤM):
─────────────────────────────────
import { executeAction } from './connectors/engine';
import { decryptField } from '../sim-crypto';

const creds = JSON.parse(decryptField(connection.encryptedCredentials));
const data = await executeAction('pancake-pos', creds, 'get_orders', input);
// → Không log, không validate team, không PII redaction, không isTest!
```

```
✅ ĐÚNG (Cổng chính — BẮT BUỘC):
─────────────────────────────────
import { runConnectorAction } from '@/lib/connect-hub/connector-service';

const result = await runConnectorAction({
  teamId: 5,
  connectionId: 12,
  actionSlug: 'get_orders',
  input: { startDate: '2026-06-01', endDate: '2026-06-04' },
  callerModule: 'hero-report',     // BẮT BUỘC: định danh ai đang gọi
  normalize: true,                 // Tùy chọn: chuẩn hóa data theo Mapping
  isTest: false,                   // BẮT BUỘC: false = thật, true = test
});

if (result.success) {
  console.log('Data:', result.data);
  console.log('Thời gian:', result.meta?.durationMs, 'ms');
} else {
  console.error('Lỗi:', result.error);
}
```

### Tham số `callerModule` — Giá trị chuẩn

| Giá trị | Mô tả |
|---------|-------|
| `'connect-hub-ui'` | Người dùng bấm Test trên giao diện Connect Hub |
| `'hero-report'` | Module báo cáo tự động Hero Report |
| `'ai-chat'` | AI Chat gọi tool/action |
| `'api-gateway'` | API endpoint public |
| `'cron-job'` | Tác vụ cron chạy nền |
| `'capability-test'` | Test năng lực trên trang Mapping |

### Tham số `isTest` — Khi nào = true?

| Tình huống | isTest |
|-----------|--------|
| Cron job chạy tự động mỗi ngày | `false` |
| User bấm "Gửi thử ngay" trên Hero Report | `true` |
| User bấm "Chạy thử (Test)" trên Mapping | `true` |
| AI Chat thực thi lệnh cho user | `false` |
| Script dev test local | `true` |

### Kết quả trả về

```typescript
{
  success: boolean;
  data?: any;              // Dữ liệu thật (đã normalize nếu bật)
  error?: string;          // Message lỗi (nếu thất bại)
  meta?: {
    durationMs: number;    // Thời gian thực thi (ms)
    appSlug: string;       // Nền tảng API
    actionSlug: string;    // Action đã chạy
    callerModule: string;  // Ai đã gọi
  };
}
```

---

## 4. Bảo mật & PII Redaction

### Lớp bảo vệ tự động (Dev KHÔNG cần làm thêm gì)

| Lớp | File | Mô tả |
|-----|------|-------|
| SSRF Guard | `runners/custom-http.ts` | Chặn URL nội bộ (localhost, 10.x, 169.254.x, 192.168.x) |
| Timeout | Mỗi Runner | AbortController 15s — tránh Thread Pool Leak |
| AES-256-GCM | `sim-crypto.ts` | Mã hóa credentials khi lưu DB, giải mã khi chạy |
| PII Redaction | `utils/log-redactor.ts` | Che SĐT (`098***321`), Email (`a***b@gmail.com`), Địa chỉ |
| Team Isolation | `connector-service.ts` | Validate `teamId` khớp `connectionId` — chống IDOR |
| isTest Flag | `schema.ts` | Cờ phân biệt test/thật trong bảng `connect_hub_usage_logs` |

### Quy tắc bảo mật cho Dev

1. **KHÔNG BAO GIỜ** `console.log(credentials)` hay `console.log(apiKey)`.
2. **KHÔNG BAO GIỜ** trả `credentials` về phía Client (response, error message).
3. **KHÔNG BAO GIỜ** lưu plaintext credentials — luôn dùng `encryptField()` / `decryptField()`.
4. Error message trả về Client: chỉ ghi mã lỗi chung (VD: `"API lỗi: 401"`) — KHÔNG kèm token/key.

---

## 5. Checklist nhanh

### ✅ Thêm Nền tảng mới

- [ ] Tạo `definitions/[slug].ts` — đủ `authFields`, `actions` với metadata UI/AI
- [ ] Viết `runners/[slug].ts` — có timeout, retry, SSRF guard
- [ ] Đăng ký vào `registry.ts` (import + thêm vào `RAW_CONNECTORS` + `READY_SLUGS`)
- [ ] Đăng ký vào `engine.ts` (import + thêm vào `RUNNERS`)
- [ ] (Tùy chọn) Thêm Default Mapping vào `presets.ts`
- [ ] `npx tsc --noEmit` — 0 lỗi
- [ ] Test trên UI: Thẻ hiển thị đúng → Kết nối thành công → Test action trả data

### ✅ Gọi API từ MVP

- [ ] Import `runConnectorAction` từ `connector-service.ts`
- [ ] Truyền đủ: `teamId`, `connectionId`, `actionSlug`, `input`, `callerModule`, `isTest`
- [ ] **KHÔNG** import `executeAction` hoặc `decryptField` trực tiếp
- [ ] **KHÔNG** tự giải mã credentials
- [ ] Handle cả `result.success === true` và `false`

---

## 6. Ví dụ thực tế

### Ví dụ A: Hero Report gọi lấy đơn hàng POS

```typescript
// file: app/lib/hero-report/engine.ts

import { runConnectorAction } from '@/lib/connect-hub/connector-service';

async function fetchPosOrders(schedule: HeroReportSchedule) {
  const result = await runConnectorAction({
    teamId: schedule.teamId,
    connectionId: schedule.inputConnectionId,
    actionSlug: 'get_orders',
    input: {
      startDate: getYesterdayUTC(),
      endDate: getTodayUTC(),
    },
    callerModule: 'hero-report',
    normalize: true,          // Chuẩn hóa theo mapping config của team
    isTest: false,            // Cron chạy thật
  });

  if (!result.success) {
    throw new Error(`Lỗi lấy đơn hàng: ${result.error}`);
  }
  return result.data;
}
```

### Ví dụ B: AI Chat gọi kiểm tra tồn kho

```typescript
// file: app/lib/ai-chat/tools/inventory-check.ts

import { runConnectorAction } from '@/lib/connect-hub/connector-service';

async function checkInventory(teamId: number, connectionId: number, productId: string) {
  const result = await runConnectorAction({
    teamId,
    connectionId,
    actionSlug: 'get_inventory',
    input: { productId },
    callerModule: 'ai-chat',
    isTest: false,
  });

  return result.success
    ? `Sản phẩm ${productId}: còn ${result.data.quantity} trong kho.`
    : `Không thể kiểm tra tồn kho: ${result.error}`;
}
```

---

## LỊCH SỬ CẬP NHẬT

| Ngày | Phiên bản | Thay đổi |
|------|-----------|----------|
| 2026-06-04 | 1.0 | Khởi tạo tài liệu sau khi hoàn thành Phase 1-4 Connect Hub Refactoring |
