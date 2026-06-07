# API HUB MASTER GUIDE — AI2Hero Connect Hub
> Cập nhật: 2026-06-07 | Phiên bản: 2.0 (Phase 8 Complete)
> **Tài liệu tất tần tật**: Kiến trúc · Tiêu chuẩn · Quy trình tích hợp · Bảo mật · Webhook Flow · Lộ trình

---

## MỤC LỤC NHANH

| # | Phần | Đối tượng đọc |
|---|------|--------------|
| 1 | [Tổng quan & Kiến trúc](#1-tổng-quan--kiến-trúc) | Tất cả |
| 2 | [Danh sách Connectors hiện tại](#2-danh-sách-connectors-hiện-tại) | Dev / PM |
| 3 | [Tiêu chuẩn: Tích hợp Connector mới](#3-tiêu-chuẩn-tích-hợp-connector-mới) | Dev tích hợp API |
| 4 | [Tiêu chuẩn: Gọi API từ MVP nội bộ](#4-tiêu-chuẩn-gọi-api-từ-mvp-nội-bộ) | Dev viết Hero Report, AI Chat |
| 5 | [Webhook Gateway & Flow Engine](#5-webhook-gateway--flow-engine) | Dev tích hợp webhook |
| 6 | [Core Logic Blocks (Built-in)](#6-core-logic-blocks-built-in) | Dev config automation |
| 7 | [Bảo mật & Tiêu chuẩn an toàn](#7-bảo-mật--tiêu-chuẩn-an-toàn) | Tất cả |
| 8 | [Lộ trình triển khai (Roadmap)](#8-lộ-trình-triển-khai-roadmap) | PM / Dev |
| 9 | [Checklist nhanh](#9-checklist-nhanh) | Review / QA |
| 10 | [Ví dụ code thực tế](#10-ví-dụ-code-thực-tế) | Dev mới |

---

## 1. Tổng quan & Kiến trúc

### 1.1 Connect Hub là gì?

Connect Hub là **cổng API trung tâm** của AI2Hero — một lớp abstraction thống nhất giúp mọi MVP trong hệ thống (Hero Report, AI Chat, Webhook Automation...) giao tiếp với API của bên thứ 3 một cách an toàn, có audit trail và nhất quán.

**Tại sao cần Connect Hub?**
- Không muốn mỗi MVP tự viết HTTP client riêng → không nhất quán, không bảo mật
- Cần mã hóa toàn bộ API Keys/Tokens trước khi lưu DB (AES-256-GCM)
- Cần ghi nhật ký usage tập trung, phân biệt test/thật
- Cần PII Redaction tự động trước khi lưu log
- Cần SSRF guard chặn gọi URL nội bộ

### 1.2 Kiến trúc hệ thống đầy đủ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI2HERO PLATFORM                                   │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │ Hero Report │  │  Webhook    │  │  AI Chat    │  │  Other MVPs...  │    │
│  │  (Cron AI)  │  │  Trigger    │  │  (Planned)  │  │  (CRM, Video)   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘    │
│         │                │                │                   │             │
│         └────────────────┴────────────────┴───────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│  ╔═════════════════════════════════════════════════════════════════════╗      │
│  ║              CONNECTOR SERVICE (Cổng duy nhất)                    ║      │
│  ║  connector-service.ts                                             ║      │
│  ║                                                                   ║      │
│  ║  1. Validate teamId + connectionId       (chống IDOR)             ║      │
│  ║  2. Check app đã kích hoạt cho workspace (chống bypass)           ║      │
│  ║  3. Decrypt credentials                  (AES-256-GCM)            ║      │
│  ║  4. Execute → Engine → Runner            (logic thực)             ║      │
│  ║  5. Normalize data (tùy chọn)            (chuẩn hóa mapping)      ║      │
│  ║  6. PII Redact → Write usage log         (audit trail)            ║      │
│  ║  7. Update connection lastUsedAt         (health tracking)        ║      │
│  ╚════════════════════════════╤════════════════════════════════════════╝      │
│                               │                                              │
│                               ▼                                              │
│  ╔═════════════════════════════════════════════════════════════════════╗      │
│  ║              ENGINE (Router phân phối)                            ║      │
│  ║  engine.ts     RUNNERS map { slug → runnerFn }                   ║      │
│  ╚═══════════╤═════════════╤══════════════╤═════════════╤═════════════╝      │
│              │             │              │             │                    │
│              ▼             ▼              ▼             ▼                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────┐        │
│  │ Custom Runner│ │ Custom Runner│ │ Core     │ │ Generic HTTP     │        │
│  │ (KiotViet,   │ │ (Zalo ZNS,  │ │ Logic    │ │ (700+ Activepieces│        │
│  │  Pancake,    │ │  Telegram,  │ │ (Built-in│ │  catalog apps)   │        │
│  │  OpenAI...)  │ │  OpenAI...) │ │ no creds)│ │                  │        │
│  └──────┬───────┘ └──────┬───────┘ └────┬─────┘ └───────┬──────────┘        │
│         │                │              │               │                   │
│    API thật         API thật       Server-side     API thật (generic)       │
│    (Runners)       (Runners)       logic only      (Activepieces format)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Cây thư mục quan trọng

```
app/lib/connect-hub/
├── connector-service.ts          ← 🔴 CỔNG DUY NHẤT — mọi MVP gọi qua đây
├── flow-engine.ts                ← Bộ máy thực thi Webhook Flow (Phase 7+)
│
├── connectors/
│   ├── types.ts                  ← Interface TypeScript chuẩn
│   ├── registry.ts               ← Đăng ký toàn bộ connectors (Manual + Generated)
│   ├── engine.ts                 ← Router phân phối xuống Runner theo slug
│   │
│   ├── definitions/              ← 📘 SSOT: Khai báo năng lực (metadata UI/AI)
│   │   ├── core-logic.ts         ← Built-in logic blocks (Phase 8)
│   │   ├── zalo-zns.ts           ← Zalo ZNS Official API (Phase 8)
│   │   ├── kiotviet.ts           ← KiotViet POS Vietnam
│   │   ├── pancake-pos.ts        ← Pancake POS (TMĐT)
│   │   ├── pancake-chat.ts       ← Pancake Chat (CS)
│   │   ├── telegram.ts           ← Telegram Bot
│   │   ├── openai.ts             ← OpenAI GPT
│   │   ├── chiasegpu.ts          ← ChiaSeGPU (Premium AI)
│   │   ├── gmail.ts              ← Gmail (mock, Phase 9 full)
│   │   ├── google-sheets.ts      ← Google Sheets (mock, Phase 9 full)
│   │   └── ...25 files total
│   │
│   ├── runners/                  ← 🔧 Logic gọi API thực tế
│   │   ├── core-logic.ts         ← Built-in: filter, delay, transform, format
│   │   ├── zalo-zns.ts           ← Zalo ZNS + auto-refresh token
│   │   ├── kiotviet.ts           ← KiotViet OAuth client credentials
│   │   ├── pancake-pos/          ← Pancake POS (phân thư mục con)
│   │   │   ├── index.ts          ← Router nội bộ
│   │   │   ├── client.ts         ← HTTP Client (retry, timeout)
│   │   │   ├── data-actions.ts   ← CRUD actions
│   │   │   └── report-actions.ts ← Aggregation / báo cáo
│   │   ├── pancake-chat.ts
│   │   ├── telegram.ts
│   │   ├── openai.ts
│   │   ├── chiasegpu.ts
│   │   ├── generic-http.ts       ← Runner chung cho 700+ Activepieces catalog
│   │   └── custom-http.ts        ← Custom API tự do của user
│   │
│   └── generated/                ← Catalog từ Activepieces (tự động sinh)
│       ├── catalog-lite.json     ← 287KB — dữ liệu nhẹ hiển thị UI
│       └── catalog-detail.json   ← 1.7MB — schema chi tiết on-demand
│
├── capabilities/
│   ├── index.ts                  ← getCapabilities(appSlug) helper
│   └── presets.ts                ← Default mapping configs
│
└── utils/
    ├── mapper.ts                 ← Chuẩn hóa dữ liệu (Normalization)
    ├── auto-suggest.ts           ← AI gợi ý mapping tự động
    └── log-redactor.ts           ← 🛡️ Bộ lọc PII tự động
```

---

## 2. Danh sách Connectors hiện tại

### 2.1 Custom Runners (Tích hợp thực tế, chạy được ngay)

| Slug | Tên | Loại | Số Action | Trạng thái |
|------|-----|------|-----------|-----------|
| `core-logic` | Logic & Điều khiển | Built-in (no API) | 4 | ✅ Ready |
| `zalo-zns` | Zalo ZNS Official | Custom Runner | 3 | ✅ Ready |
| `kiotviet` | KiotViet Retail | Custom Runner | 22 | ✅ Ready |
| `pancake-pos` | Pancake POS | Custom Runner | 15+ | ✅ Ready |
| `pancake-chat` | Pancake Chat | Custom Runner | 8+ | ✅ Ready |
| `telegram` | Telegram Bot | Custom Runner | 4 | ✅ Ready |
| `openai` | OpenAI GPT | Custom Runner | 3 | ✅ Ready |
| `chiasegpu` | ChiaSeGPU AI | Custom Runner | 8+ | ✅ Ready (Premium) |
| `custom-http` | Custom API tự do | Custom Runner | Unlimited | ✅ Ready |

### 2.2 Generic HTTP Runners (Tích hợp theo Activepieces format)

| Slug | Tên | Batch | Trạng thái |
|------|-----|-------|-----------|
| `telegram-bot`, `discord` | Messaging | 1A | ✅ Ready |
| `airtable`, `sendgrid`, `github` | Productivity | 1A | ✅ Ready |
| `trello`, `twilio`, `mailgun`, `clickup` | PM / SMS | 1A | ✅ Ready |
| `asana`, `notion`, `slack`, `hubspot` | CRM / PM | 1B | ✅ Ready |
| `shopify`, `stripe`, `jira` | Commerce | 1B | ✅ Ready |
| `gmail`, `google-sheets` | Google Workspace | Mock (Phase 9) | ⚠️ Mock |
| 700+ apps | Activepieces Catalog | Generated | 📦 Catalog |

### 2.3 Mock Connectors (Hiển thị UI, chưa chạy thật)

| Slug | Ghi chú |
|------|---------|
| `gmail` | Phase 9 — cần OAuth2 hoặc App Password |
| `google-sheets` | Phase 9 — cần Service Account JSON |
| `google-drive` | Phase 9/10 |
| `facebook`, `zalo` | Phase 10 — cần Business API approval |
| `tiktok` | Phase 10 |
| `gemini`, `grok`, `deepseek`, `qwen` | Mock — cần key thật |
| `runway`, `luma` | Phase 11 — Video generation |
| `sapo`, `payos`, `momo` | Phase 10 — VN Fintech |

---

## 3. Tiêu chuẩn: Tích hợp Connector mới

> Áp dụng khi: Muốn thêm bất kỳ API bên thứ 3 nào vào Connect Hub (Haravan, TiktokShop, Sapo, Google Sheets thật, v.v.)

### Bước 0: Xác định loại Runner

Trước khi code, xác định loại runner phù hợp:

| Loại | Khi nào dùng | Ví dụ |
|------|-------------|-------|
| **Custom Runner** | API có logic phức tạp (OAuth, auto-refresh token, phân trang, aggregation) | KiotViet, Zalo ZNS, Pancake |
| **Generic HTTP** | API đơn giản theo Activepieces format (Bearer/API Key + REST standard) | GitHub, Slack, Airtable |
| **Built-in** | Không cần API, logic xử lý server-side | Core Logic (filter, delay, transform) |
| **Mock** | Placeholder UI, chưa triển khai | Gmail, Google Sheets (tạm thời) |

---

### Bước 1: Tạo Definition (BẮT BUỘC — SSOT)

**Đường dẫn:** `app/lib/connect-hub/connectors/definitions/[ten-nen-tang].ts`

Definition là **nguồn sự thật duy nhất** về metadata của connector. Giao diện, AI mapping và test runner đều đọc từ đây.

```typescript
// definitions/example-api.ts
import { ConnectorDefinition } from '../types';

export const exampleApiConnector: ConnectorDefinition = {
  // === Định danh ===
  slug: 'example-api',          // kebab-case, duy nhất trong toàn hệ thống
  name: 'Example API',          // Tên hiển thị trên UI
  icon: 'Globe',                // Lucide React icon name
  category: 'crm',             // pos | storage | email | chat | crm | developer | management | ai | payment | social
  description: 'Mô tả ngắn gọn chức năng chính của connector.',
  
  // === Auth ===
  authType: 'api_key',          // oauth2 | api_key | client_credentials | bearer_token | basic | custom_http | none
  authFields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      secret: true,             // 🔴 BẮT BUỘC = true → mã hóa AES-256-GCM khi lưu DB
      placeholder: 'sk-xxxx...',
      helpText: 'Lấy tại: https://example.com/api-settings'
    },
    // Có thể có nhiều trường: clientId + clientSecret, username + password...
  ],

  // === Actions (Năng lực) ===
  actions: [
    {
      slug: 'list_contacts',
      name: 'Danh sách khách hàng',
      description: 'Lấy toàn bộ danh sách khách hàng trong CRM.',
      
      // Metadata bắt buộc khai báo đầy đủ
      group: 'Khách hàng',         // Nhóm nghiệp vụ để phân loại trên UI
      httpMethod: 'GET',           // GET | POST | PUT | DELETE
      endpoint: '/contacts',       // Endpoint tham chiếu (hiển thị developer docs)
      status: 'ready',             // ready | planned
      outputFields: ['id', 'name', 'email', 'phone'], // Các field đầu ra chính
      aiInstruction: [             // Hướng dẫn AI dùng action này để báo cáo/phân tích
        'Bước 1: Gọi action list_contacts.',
        'Bước 2: Thống kê tổng số khách hàng theo trạng thái.'
      ].join('\n'),
      
      // Form input tự động vẽ trên UI
      inputSchema: [
        { name: 'page', label: 'Trang', type: 'text', required: false, placeholder: '1' },
        { name: 'limit', label: 'Số lượng', type: 'text', required: false, placeholder: '50' },
        { name: 'status', label: 'Trạng thái', type: 'select', required: false, options: ['active', 'inactive'] },
      ],
      
      testStrategy: 'direct',      // direct = test ngay không cần params đặc biệt
    },
    {
      slug: 'create_contact',
      name: 'Tạo khách hàng mới',
      description: 'Tạo một bản ghi khách hàng mới trong CRM.',
      group: 'Khách hàng',
      httpMethod: 'POST',
      endpoint: '/contacts',
      status: 'ready',
      outputFields: ['id', 'createdAt'],
      aiInstruction: 'Gọi action create_contact với đầy đủ name, email, phone.',
      inputSchema: [
        { name: 'name', label: 'Họ tên', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'text', required: true },
        { name: 'phone', label: 'Điện thoại', type: 'text', required: false },
      ],
      testStrategy: 'requires_sample',
    },
  ],

  // === Optional ===
  popular: false,
  setupGuide: `<p><strong>Hướng dẫn lấy API Key Example:</strong></p>
    <ol>
      <li>Đăng nhập vào <a href="https://example.com" target="_blank">example.com</a></li>
      <li>Vào Settings → API → Generate Key</li>
      <li>Copy và dán vào ô API Key bên dưới</li>
    </ol>`,
  lifecycle: {
    updatePolicy: 'manual',
    documentationUrl: 'https://docs.example.com/api',
  },
  status: 'ready',
};
```

> ⚠️ **KHÔNG ĐƯỢC** hardcode metadata trên file giao diện (client component). UI tự đọc từ Definition này.

---

### Bước 2: Viết Runner (Logic gọi API thực)

**Đường dẫn:** `app/lib/connect-hub/connectors/runners/[ten-nen-tang].ts`

```typescript
// runners/example-api.ts

/**
 * Runner cho Example API.
 * 
 * BẮT BUỘC tuân thủ:
 * 1. Timeout: AbortSignal.timeout(15_000) — tránh Thread Pool Leak
 * 2. SSRF Guard: KHÔNG gọi URL localhost/10.x/169.x/192.168.x
 * 3. Không log credentials ra console.log
 * 4. Error message KHÔNG kèm token/key
 * 5. Retry với Exponential Backoff khi gặp 429/5xx
 */

const BASE_URL = 'https://api.example.com/v1';

export async function runExampleApi(
  creds: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const { apiKey } = creds;
  
  if (!apiKey) {
    throw new Error('Thiếu API Key cho Example API.');
  }

  switch (actionSlug) {
    case 'list_contacts':
      return fetchContacts(apiKey, input);
    case 'create_contact':
      return createContact(apiKey, input);
    default:
      throw new Error(`Action "${actionSlug}" chưa được hỗ trợ cho Example API.`);
  }
}

async function fetchContacts(apiKey: string, input: any) {
  const params = new URLSearchParams({
    page: String(input.page || 1),
    limit: String(input.limit || 50),
    ...(input.status ? { status: input.status } : {}),
  });

  const res = await fetch(`${BASE_URL}/contacts?${params}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15_000), // 15 giây timeout
  });

  if (!res.ok) {
    throw new Error(`Example API lỗi ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

async function createContact(apiKey: string, input: any) {
  const res = await fetch(`${BASE_URL}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      phone: input.phone || '',
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Tạo khách hàng thất bại: ${err.message || res.statusText}`);
  }

  return res.json();
}
```

**Trường hợp đặc biệt: API có OAuth auto-refresh token (như Zalo ZNS)**

```typescript
// Xem mẫu tại: app/lib/connect-hub/connectors/runners/zalo-zns.ts
// Cơ chế: Thử với access_token hiện tại → nếu lỗi -216 → refresh → retry một lần
async function callApiWithAutoRefresh(token: string, appId: string, secretKey: string, refreshToken: string, endpoint: string, body: object) {
  const result = await callApi(token, endpoint, body);
  
  if (result.error === -216) { // Token expired
    const refreshed = await refreshToken(appId, secretKey, refreshToken);
    return callApi(refreshed.access_token, endpoint, body); // Retry once
  }
  
  return result;
}
```

**Trường hợp API cần phân trang (Pagination)**

```typescript
// Pattern an toàn cho phân trang — giới hạn max pages để tránh timeout Vercel
async function fetchAllPages(apiKey: string, endpoint: string, maxPages = 10) {
  const allResults = [];
  let page = 1;

  while (page <= maxPages) {
    const res = await fetch(`${BASE_URL}/${endpoint}?page=${page}&limit=200`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    
    if (!res.ok) break;
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.data || data.items || []);
    
    allResults.push(...items);
    
    if (items.length < 200) break; // Không còn dữ liệu
    page++;
  }

  return allResults;
}
```

---

### Bước 3: Đăng ký vào Engine & Registry

**`engine.ts`** — Thêm 2 dòng:

```diff
  // runners/example-api.ts
+ import { runExampleApi } from './runners/example-api';

  const RUNNERS = {
    // ... các runners hiện có
+   'example-api': runExampleApi,
  };
```

**`registry.ts`** — Thêm 3 dòng:

```diff
+ import { exampleApiConnector } from './definitions/example-api';

  const RAW_CONNECTORS: ConnectorDefinition[] = [
    coreLogicConnector, // built-in luôn đặt đầu
    // ... các connectors khác
+   exampleApiConnector,
  ];

  const READY_SLUGS = [
    'core-logic', 'zalo-zns', // ...
+   'example-api',
  ];
```

---

### Bước 4: Thêm Default Mapping (Tùy chọn)

Nếu connector có data structure chuẩn hóa được, thêm vào `capabilities/presets.ts`:

```typescript
// capabilities/presets.ts
'example-api': {
  'customer_name': { selected: 'name', suggestions: ['full_name', 'contact_name'] },
  'customer_email': { selected: 'email', suggestions: ['mail', 'contact_email'] },
  'customer_phone': { selected: 'phone', suggestions: ['mobile', 'phone_number'] },
},
```

---

### Bước 5: Thêm Verify Connection (Tùy chọn nhưng nên có)

Trong `runners/generic-http.ts`, thêm block verify cho connector:

```typescript
// generic-http.ts — hàm verifyGenericHttpConnection
case 'example-api': {
  const res = await fetch('https://api.example.com/v1/me', {
    headers: { 'Authorization': `Bearer ${creds.apiKey}` },
    signal: AbortSignal.timeout(8_000),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error('API Key không hợp lệ.');
  return { success: true, data: { userId: data.id, name: data.name } };
}
```

---

### Bước 6: Verify & Test

```bash
# 1. TypeScript check — bắt buộc 0 lỗi trước khi commit
npx tsc --noEmit

# 2. Dev server — UI tự hiện thẻ connector mới
npm run dev

# Kiểm tra thủ công:
# ✅ Vào Connect Hub → Apps → tìm "Example API" → thấy thẻ với status Ready
# ✅ Click Kết nối → điền API Key → bấm Kiểm thử → thành công
# ✅ Vào Capabilities → chọn action → chạy Test → có dữ liệu trả về
```

---

## 4. Tiêu chuẩn: Gọi API từ MVP nội bộ

> Áp dụng khi: Hero Report, Webhook Flow, AI Chat, Dashboard, hoặc bất kỳ module nào cần gọi API ra ngoài.

### 🔴 QUY TẮC VÀNG: CẤM GỌI TRỰC TIẾP

```typescript
// ❌ SAI — Tuyệt đối cấm
import { executeAction } from './connectors/engine';
import { decryptField } from '../sim-crypto';
const creds = JSON.parse(decryptField(connection.encryptedCredentials));
const data = await executeAction('kiotviet', creds, 'list_products', {});
// → Không log, không SSRF guard, không PII redaction, không validate team!
```

```typescript
// ✅ ĐÚNG — Luôn dùng connector-service
import { runConnectorAction } from '@/lib/connect-hub/connector-service';

const result = await runConnectorAction({
  teamId: 5,               // Workspace ID (BẮT BUỘC)
  connectionId: 12,        // ID kết nối trong DB (BẮT BUỘC)
  actionSlug: 'list_products', // Action muốn thực thi
  input: { page: 1, limit: 50 },
  callerModule: 'hero-report', // Ai đang gọi (BẮT BUỘC)
  normalize: true,         // Chuẩn hóa data theo Mapping của team (tùy chọn)
  isTest: false,           // false = gọi thật, true = gọi thử
});

if (result.success) {
  console.log('Dữ liệu:', result.data);
  console.log('Thời gian:', result.meta?.durationMs, 'ms');
} else {
  throw new Error(`Gọi API thất bại: ${result.error}`);
}
```

### Tham số `callerModule` — Giá trị chuẩn

| Giá trị | Mô tả |
|---------|-------|
| `'hero-report'` | Module báo cáo tự động Hero Report |
| `'webhook-flow'` | Webhook Flow Engine (Phase 7+) |
| `'ai-chat'` | AI Chat khi gọi tool |
| `'connect-hub-ui'` | Người dùng bấm Test trên UI Connect Hub |
| `'capability-test'` | Test năng lực trên trang Mapping |
| `'cron-job'` | Tác vụ chạy tự động định kỳ |
| `'api-gateway'` | API endpoint public được gọi từ ngoài |
| `'hero-crm'` | CRM MVP (sắp ra) |

### Tham số `isTest`

| Tình huống | isTest |
|-----------|--------|
| Cron job chạy tự động mỗi ngày | `false` |
| User bấm "Gửi thử ngay" trên Hero Report | `true` |
| Webhook Flow trigger từ production | `false` |
| Dev test nội bộ | `true` |
| AI Chat xử lý yêu cầu user thật | `false` |

### Kết quả trả về (Return type)

```typescript
{
  success: boolean;         // true | false
  data?: any;               // Dữ liệu (đã normalize nếu bật)
  error?: string;           // Message lỗi (đã PII-redacted)
  meta?: {
    durationMs: number;     // Thời gian thực thi (ms)
    appSlug: string;        // Tên connector đã gọi
    actionSlug: string;     // Action đã thực thi
    callerModule: string;   // Module gọi API
  };
}
```

---

## 5. Webhook Gateway & Flow Engine

### 5.1 Webhook Gateway (Phase 6)

```
Bên ngoài → POST https://ai2hero.com/api/webhook/[webhookId]
                         │
                    route.ts
                         │
                    1. Lookup webhook trong DB → kiểm tra active
                    2. Verify chữ ký HMAC-SHA256 hoặc query token
                    3. Ghi log vào connect_hub_webhook_logs
                    4. await executeWebhookFlows() → chạy flows
                    5. Trả về 200 OK
```

**Cách tạo Webhook:**
1. Vào Connect Hub → Webhooks
2. Click "Tạo Webhook mới" → đặt tên
3. Nhận Secret Key (chỉ hiển thị 1 lần duy nhất)
4. URL webhook: `https://ai2hero.com/api/webhook/{id}`
5. Cấu hình Flow cho webhook đó

### 5.2 Flow Engine (Phase 7+)

```
Webhook nhận payload
        │
        ▼
executeWebhookFlows()
        │
        ├── Lấy danh sách active flows của webhook
        ├── Chạy song song (Promise.all) các flows
        │
        └── Mỗi flow:
            ├── Tạo FlowRun record (status = 'running')
            ├── Lấy danh sách steps (sort theo thứ tự)
            └── Chạy tuần tự từng step (Fail-Fast):
                ├── interpolateTemplate() — nội suy {{payload.field}}
                ├── Nếu appSlug = 'core-logic' → runCoreLogic() trực tiếp
                ├── Ngược lại → runConnectorAction()
                ├── Lưu kết quả step vào stepResults[]
                └── Nếu step thất bại → dừng ngay, cập nhật FlowRun = 'failed'
```

**Input Mapping Template:**

```json
{
  "phone": "{{payload.customer.phone}}",
  "template_id": "123456",
  "template_data": {
    "customer_name": "{{payload.customer.name}}",
    "order_code": "{{payload.order.code}}",
    "amount": "{{payload.order.total}}"
  }
}
```

**Placeholders hỗ trợ:**

| Placeholder | Ví dụ | Mô tả |
|------------|-------|-------|
| `{{payload.field}}` | `{{payload.status}}` | Truy cập field trực tiếp |
| `{{payload.nested.field}}` | `{{payload.order.code}}` | Nested object |
| `{{payload.array[0].id}}` | `{{payload.items[0].id}}` | Phần tử mảng |
| `{{headers.field}}` | `{{headers.x-api-key}}` | HTTP headers |

### 5.3 Cơ chế Fail-Fast

Khi 1 step trong flow thất bại, toàn bộ flow dừng ngay và ghi lại lý do lỗi. Không bỏ qua step lỗi để chạy tiếp.

Ngoại lệ: Dùng `filter_condition` (Core Logic) để chủ động dừng flow theo điều kiện business logic.

---

## 6. Core Logic Blocks (Built-in)

Connector đặc biệt `core-logic` — không cần kết nối, chạy hoàn toàn server-side, không cần `connectionId` (dùng `0`).

### Danh sách Actions

#### `filter_condition` — Lọc điều kiện

```json
{
  "appSlug": "core-logic",
  "actionSlug": "filter_condition",
  "inputMapping": {
    "field": "{{payload.status}}",
    "operator": "eq",
    "value": "confirmed"
  }
}
```

| Operator | Mô tả | Ví dụ |
|----------|-------|-------|
| `eq` | Bằng | status = "confirmed" |
| `ne` | Không bằng | status ≠ "cancelled" |
| `contains` | Chứa chuỗi | name chứa "Hero" |
| `not_contains` | Không chứa | tag không chứa "spam" |
| `gt` | Lớn hơn | amount > 100000 |
| `lt` | Nhỏ hơn | quantity < 5 |
| `gte` | Lớn hơn hoặc bằng | score >= 80 |
| `lte` | Nhỏ hơn hoặc bằng | price <= 500000 |

> Nếu điều kiện **không thỏa mãn** → flow fail-fast dừng ngay (thiết kế chủ ý).

#### `delay` — Tạm dừng

```json
{
  "actionSlug": "delay",
  "inputMapping": { "seconds": "5" }
}
```
Max 25 giây (giới hạn Vercel Serverless timeout an toàn).

#### `transform_text` — Biến đổi văn bản

```json
{
  "actionSlug": "transform_text",
  "inputMapping": {
    "input": "{{payload.customer_name}}",
    "operation": "uppercase"
  }
}
```

| Operation | Mô tả | Ví dụ |
|-----------|-------|-------|
| `uppercase` | Viết hoa | "nguyễn văn a" → "NGUYỄN VĂN A" |
| `lowercase` | Viết thường | "HERO" → "hero" |
| `trim` | Cắt khoảng trắng 2 đầu | "  hello  " → "hello" |
| `title_case` | Viết hoa chữ cái đầu | "hello world" → "Hello World" |
| `replace` | Thay thế chuỗi | Cần `search` và `replacement` |

#### `format_number` — Định dạng số/tiền

```json
{
  "actionSlug": "format_number",
  "inputMapping": {
    "number": "{{payload.amount}}",
    "format": "vnd",
    "decimals": "0"
  }
}
```

| Format | Ví dụ đầu ra |
|--------|-------------|
| `vnd` | 1.500.000 ₫ |
| `usd` | $1,500.00 |
| `percent` | 15.5% |
| `plain` | 1500000 |

---

## 7. Bảo mật & Tiêu chuẩn an toàn

### 7.1 Các lớp bảo vệ tự động

| Lớp bảo vệ | File | Mô tả |
|-----------|------|-------|
| **IDOR Guard** | `connector-service.ts` | Validate `connectionId` thuộc `teamId` — chống xem credentials của workspace khác |
| **App Activation Check** | `connector-service.ts` | Kiểm tra workspace đã kích hoạt `connect-hub` app mới cho phép gọi |
| **AES-256-GCM** | `sim-crypto.ts` | Mã hóa toàn bộ credentials khi lưu DB. Không bao giờ lưu plaintext |
| **PII Redaction** | `utils/log-redactor.ts` | Tự động che SĐT, Email, Địa chỉ trước khi ghi vào usage logs |
| **SSRF Guard** | `runners/custom-http.ts` | Chặn gọi URL nội bộ: localhost, 127.x, 10.x, 169.254.x, 192.168.x |
| **Timeout** | Mỗi Runner | `AbortSignal.timeout(15_000)` — chặn Thread Pool Leak |
| **isTest Flag** | `schema.ts` | Phân biệt usage log test/thật, không tính vào quota billing |
| **Stack Guard** | `flow-engine.ts` | `interpolateTemplate` giới hạn depth <= 50 chống recursive bombing |

### 7.2 Quy tắc bắt buộc cho Developer

```typescript
// ❌ Vi phạm bảo mật
console.log('API Key:', apiKey);               // Lộ key trong logs
return { error: `Invalid token: ${apiKey}` };  // Lộ token qua response
const creds = decryptField(encryptedCreds);    // Tự giải mã — bypass gateway

// ✅ Đúng chuẩn
// Không log credentials
throw new Error(`Xác thực thất bại. Mã lỗi: 401`); // Error message chung
const result = await runConnectorAction({...});        // Qua gateway
```

### 7.3 Quy tắc AuthField

```typescript
// authFields trong Definition:
{
  name: 'apiKey',
  secret: true,    // 🔴 BẮT BUỘC = true cho mọi field credentials nhạy cảm
  type: 'password', // Ẩn input trên UI
}
```

Khi `secret: true`:
- UI hiển thị input dạng `type="password"` (*****)
- Server Action mã hóa field đó bằng AES-256-GCM trước khi lưu DB
- Khi trả về Client, che mờ thành `"__SAVED_KEY__"` (không bao giờ gửi plaintext về client)
- Khi Runner chạy, giải mã bằng `decryptField()` chỉ trong server context

---

## 8. Lộ trình triển khai (Roadmap)

### ✅ Phase 1-5: Catalog & Core Infrastructure (HOÀN THÀNH)
- [x] Quét 708 API Activepieces → tạo catalog-lite.json (287KB) + catalog-detail.json (1.7MB)
- [x] Giao diện App Catalog với 700+ ứng dụng, filter, search, phân trang
- [x] Generic HTTP Runner cho 35+ apps Ready (Batch 1A & 1B)
- [x] AI Capabilities mapping UI

### ✅ Phase 6: Webhook Gateway (HOÀN THÀNH)
- [x] Dynamic route `/api/webhook/[webhookId]` nhận POST/GET payload
- [x] HMAC-SHA256 signature verification + query token
- [x] Webhook Logs viewer (20 gần nhất)
- [x] UI quản lý Webhooks (bật/tắt, copy URL, xem secret key)

### ✅ Phase 7: Webhook Flow Engine (HOÀN THÀNH)
- [x] 3 bảng DB: `connectHubFlows`, `connectHubFlowSteps`, `connectHubFlowRuns`
- [x] Template interpolation engine `{{payload.field}}`
- [x] Cơ chế Fail-Fast (dừng ngay khi 1 step thất bại)
- [x] Chạy song song nhiều flows (Promise.all)
- [x] Lịch sử thực thi Flow với preview kết quả từng step

### ✅ Phase 8: Core Logic Blocks & Zalo ZNS (HOÀN THÀNH 2026-06-07)
- [x] Core Logic: `filter_condition`, `delay`, `transform_text`, `format_number`
- [x] Zalo ZNS: `send_zns_template`, `send_oa_broadcast`, `get_oa_info`
- [x] Auto-refresh Zalo token (bắt lỗi -216, refresh, retry)
- [x] Flow Engine bypass cho built-in steps (không cần DB credentials check)
- [x] Security: Stack Overflow Guard (depth <= 50)
- [x] Fix Serverless: `await executeWebhookFlows()` (không fire-and-forget)

### 🔲 Phase 9: Google Workspace Connectors (KẾ HOẠCH)
**Thời gian dự kiến:** Tuần tới

#### 9A: Google Sheets (thật)
- [ ] Service Account JSON authentication
- [ ] Action `read_spreadsheet_rows`: Đọc dữ liệu từ spreadsheet
- [ ] Action `add_spreadsheet_row`: Ghi thêm hàng mới
- [ ] Action `update_cell`: Cập nhật ô đơn lẻ
- [ ] Verify: Kiểm tra quyền truy cập Sheet

#### 9B: Gmail (thật)
- [ ] OAuth2 App Password hoặc Service Account
- [ ] Action `send_email`: Gửi thư (HTML + text)
- [ ] Action `send_template_email`: Gửi theo template có placeholder
- [ ] Rate limit: 100 email/ngày (Gmail API quota)

### 🔲 Phase 10: Vietnamese Fintech & Social (KẾ HOẠCH)
| Connector | Priority | Ghi chú |
|-----------|---------|--------|
| Sapo POS | High | OAuth2 client credentials |
| MoMo | High | Chữ ký HMAC, test sandbox |
| PayOS | High | Webhook payment gateway |
| Facebook Graph API | Medium | cần Business Verification |
| Zalo OpenAPI (chat) | Medium | Phân biệt với ZNS |
| TikTok Seller | Low | cần partnership |

### 🔲 Phase 11: AI Model Runners (KẾ HOẠCH)
| Connector | Priority | Ghi chú |
|-----------|---------|--------|
| Gemini (Google AI) | High | Cần `GEMINI_API_KEY` |
| Grok (xAI) | Medium | Beta API |
| DeepSeek | Medium | Openai-compatible API |
| Runway ML | Low | Video generation |
| Luma AI | Low | Video generation |

### 🔲 Phase 12: Hero CRM MVP (KẾ HOẠCH)
- [ ] DB: `crm_customers` + `crm_debts` tables
- [ ] Server Actions CRUD scoped theo teamId
- [ ] Dashboard: Thống kê tổng nợ, khách hàng đang nợ
- [ ] Khách hàng: Danh sách, thêm/sửa/xóa
- [ ] Công nợ: Ghi nợ, ghi thanh toán, quá hạn
- [ ] Tích hợp Connect Hub: Nhắc nợ tự động qua Zalo ZNS / Telegram

---

## 9. Checklist nhanh

### ✅ Thêm Custom Runner mới

- [ ] Tạo `definitions/[slug].ts` — đủ `authType`, `authFields` (secret=true), `actions` với metadata UI/AI
- [ ] Viết `runners/[slug].ts` — có `AbortSignal.timeout(15_000)`, SSRF guard (nếu dùng URL động)
- [ ] Đăng ký `engine.ts`: import + thêm vào `RUNNERS`
- [ ] Đăng ký `registry.ts`: import + thêm `RAW_CONNECTORS` + `READY_SLUGS`
- [ ] (Tùy chọn) Verify block trong `generic-http.ts`
- [ ] (Tùy chọn) Default Mapping trong `capabilities/presets.ts`
- [ ] `npx tsc --noEmit` — 0 lỗi
- [ ] Test trên UI: thấy thẻ → kết nối thành công → action trả data

### ✅ Gọi API từ MVP nội bộ

- [ ] Import `runConnectorAction` từ `@/lib/connect-hub/connector-service`
- [ ] Truyền đủ: `teamId`, `connectionId`, `actionSlug`, `input`, `callerModule`, `isTest`
- [ ] KHÔNG import `executeAction` hoặc `decryptField` trực tiếp
- [ ] KHÔNG tự giải mã credentials
- [ ] Handle cả `result.success === true` và `false`
- [ ] KHÔNG log `result.data` nếu chứa thông tin nhạy cảm

### ✅ Cấu hình Flow Webhook

- [ ] Tạo webhook → lấy URL + Secret Key (lưu lại, chỉ thấy 1 lần)
- [ ] Cài đặt Webhook trên platform bên ngoài (Pancake, KiotViet...)
- [ ] Vào "Cấu hình Flow" → Thêm step
- [ ] Mỗi step: chọn Connection + Action + điền Input Mapping JSON
- [ ] Kiểm tra syntax JSON trước khi lưu
- [ ] Bắn thử payload → kiểm tra History tab
- [ ] Đảm bảo step `filter_condition` đầu tiên để chặn payload không hợp lệ

---

## 10. Ví dụ code thực tế

### Ví dụ 1: Hero Report gọi lấy đơn hàng Pancake POS

```typescript
// file: app/lib/hero-report/engine.ts
import { runConnectorAction } from '@/lib/connect-hub/connector-service';

async function fetchDailyOrders(schedule: HeroReportSchedule) {
  const result = await runConnectorAction({
    teamId: schedule.teamId,
    connectionId: schedule.inputConnectionId,
    actionSlug: 'get_orders',
    input: {
      startDate: getYesterdayUTC(),
      endDate: getTodayUTC(),
    },
    callerModule: 'hero-report',
    normalize: true,      // Chuẩn hóa theo mapping config của team
    isTest: false,        // Cron chạy thật
  });

  if (!result.success) {
    throw new Error(`Lỗi lấy đơn hàng POS: ${result.error}`);
  }

  console.log(`✅ Lấy được ${result.data?.length || 0} đơn trong ${result.meta?.durationMs}ms`);
  return result.data;
}
```

### Ví dụ 2: Gửi ZNS khi đơn hàng xác nhận

**Flow Config (JSON input mapping):**
```json
[
  {
    "connectionId": 0,
    "appSlug": "core-logic",
    "actionSlug": "filter_condition",
    "inputMapping": {
      "field": "{{payload.status}}",
      "operator": "eq",
      "value": "confirmed"
    }
  },
  {
    "connectionId": 15,
    "appSlug": "zalo-zns",
    "actionSlug": "send_zns_template",
    "inputMapping": {
      "phone": "{{payload.customer.phone}}",
      "template_id": "320451",
      "template_data": {
        "customer_name": "{{payload.customer.name}}",
        "order_code": "{{payload.code}}",
        "total_amount": "{{payload.total_price}}"
      }
    }
  }
]
```

### Ví dụ 3: Hero CRM tự động ghi nợ + gửi ZNS nhắc nợ

```typescript
// file: app/lib/db/crm-actions.ts (Phase 12)
import { runConnectorAction } from '@/lib/connect-hub/connector-service';

export async function createDebtAndNotify(params: {
  teamId: number;
  customerId: number;
  amount: number;
  dueDate: Date;
  znsConnectionId: number;
}) {
  // 1. Ghi nợ vào DB
  const [debt] = await db.insert(crmDebts).values({
    teamId: params.teamId,
    customerId: params.customerId,
    amount: params.amount,
    dueDate: params.dueDate,
    status: 'unpaid',
  }).returning();

  // 2. Lấy thông tin khách hàng
  const customer = await getCustomer(params.teamId, params.customerId);

  // 3. Gửi ZNS thông báo công nợ (nếu có SĐT)
  if (customer?.phone && params.znsConnectionId) {
    await runConnectorAction({
      teamId: params.teamId,
      connectionId: params.znsConnectionId,
      actionSlug: 'send_zns_template',
      input: {
        phone: customer.phone,
        template_id: process.env.ZNS_DEBT_TEMPLATE_ID,
        template_data: {
          customer_name: customer.name,
          amount: debt.amount.toLocaleString('vi-VN'),
          due_date: format(debt.dueDate, 'dd/MM/yyyy'),
        },
      },
      callerModule: 'hero-crm',
      isTest: false,
    });
  }

  return debt;
}
```

### Ví dụ 4: Cron Job nhắc nợ quá hạn tự động

```typescript
// file: app/app/api/cron/debt-reminder/route.ts (Phase 12)
import { runConnectorAction } from '@/lib/connect-hub/connector-service';

export async function GET() {
  // Lấy 3 khoản nợ quá hạn chưa nhắc trong 24h (tránh spam)
  const overdueDebts = await getOverdueUnnotifiedDebts(3);

  await Promise.all(overdueDebts.map(async (debt) => {
    await runConnectorAction({
      teamId: debt.teamId,
      connectionId: debt.znsConnectionId,
      actionSlug: 'send_zns_template',
      input: {
        phone: debt.customerPhone,
        template_id: process.env.ZNS_OVERDUE_TEMPLATE_ID,
        template_data: {
          days_overdue: String(debt.daysOverdue),
          amount_due: debt.amount.toLocaleString('vi-VN'),
        },
      },
      callerModule: 'cron-job',
      isTest: false,
    });

    await markDebtAsNotified(debt.id);
  }));

  return Response.json({ reminded: overdueDebts.length });
}
```

---

## LỊCH SỬ CẬP NHẬT

| Ngày | Phiên bản | Thay đổi |
|------|-----------|----------|
| 2026-06-04 | 1.0 | Khởi tạo sau Phase 1-4 |
| 2026-06-06 | 1.5 | Thêm Webhook Gateway (Phase 6) và Flow Engine (Phase 7) |
| 2026-06-07 | 2.0 | Thêm Core Logic Blocks, Zalo ZNS (Phase 8). Mở rộng Roadmap Phase 9-12. Viết lại toàn bộ thành Master Guide |

---

> 📌 **Nguồn sự thật liên quan:**
> - [START.md](file:///C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/START.md) — Trạng thái dự án + Phase history
> - [CONNECT_HUB_GUIDE.md](file:///C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/CONNECT_HUB_GUIDE.md) — Bản rút gọn v1.0 (archived)
> - [MVP_INTEGRATION_GUIDE.md](file:///C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/MVP_INTEGRATION_GUIDE.md) — Quy trình tích hợp MVP mới
> - [connector-service.ts](file:///C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/connect-hub/connector-service.ts) — Code cổng chính
> - [flow-engine.ts](file:///C:/Users/ADMIN/OneDrive/Desktop/Ai2Hero/app/lib/connect-hub/flow-engine.ts) — Code Flow Engine
