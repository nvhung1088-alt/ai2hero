# PLAN: Tích hợp ChiaSeGPU (LLM API Gateway) vào Connect Hub
> Ngày tạo: 2026-06-03
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 4
> Ước tính: ~30 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Tích hợp API của ChiaSeGPU (vilao.ai) làm connector mới trong Connect Hub với slug `chiasegpu`. 
API Key admin (`sk-85ab...`) lưu trong `.env`, runner proxy request LLM (chat completion) qua endpoint OpenAI-compatible của ChiaSeGPU. Hệ thống trừ token admin, tính năng tính phí cho end-user sẽ xây dựng sau.

## BỐI CẢNH KIẾN TRÚC
```
Connect Hub Architecture:
  definitions/ → Khai báo metadata, auth fields, actions (ConnectorDefinition)
  runners/     → Logic gọi API thực tế (fetch + error handling)  
  registry.ts  → Danh sách ALL_CONNECTORS + READY_SLUGS
  engine.ts    → Map appSlug → runner function
```

**Data flow**: 
User chọn connector `chiasegpu` → Nhập tên kết nối (không cần auth fields vì dùng key admin) → Runner đọc `CHIASEGPU_API_KEY` từ `process.env` → Gọi `https://vilao.ai/v1/chat/completions` (OpenAI-compatible) → Trả kết quả.

**Khác biệt so với OpenAI connector**: 
- OpenAI connector: Mỗi user dùng API Key riêng (lưu trong DB encrypted).
- ChiaSeGPU connector: Tất cả user dùng chung 1 Admin API Key (lưu ENV server-side), user KHÔNG nhập key.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: `types.ts`, bất kỳ file runner/definition nào đã có
- KHÔNG đổi tên: `RUNNERS`, `RAW_CONNECTORS`, `READY_SLUGS`, `ALL_CONNECTORS`, `executeAction`
- CSS: Không ảnh hưởng (backend only)
- Data: Connector dữ liệu chuẩn theo interface `ConnectorDefinition` trong `types.ts`
- BẢO MẬT: API Key `sk-85ab...` CHỈ lưu trong `.env`, ĐỌC qua `process.env.CHIASEGPU_API_KEY` tại server-side runner. TUYỆT ĐỐI không hardcode trong source.

## LESSONS CẦN NHỚ
- **4.24**: Khai báo secret bảo mật nhưng không dùng → PHẢI viết logic verify ngay
- **4.39**: Logical OR (||) ghi đè giá trị 0 → dùng `??` cho số
- **5.12**: Direct API Bypass khi middleware lỗi → thiết kế fallback
- **17.1**: KHÔNG hardcode model AI → đọc từ input.model, fallback default
- **17.3**: Xử lý lỗi model bị khai tử → message rõ ràng
- **17.4**: Vòng đời Provider → kèm `lifecycle` object trong definition

---

## TASK 1: Tạo file Definition connector ChiaSeGPU

### 1.1. Mô tả
Tạo file khai báo metadata cho connector ChiaSeGPU. Đặc biệt: `authType: 'none'` vì API Key admin lưu ENV, user không cần nhập gì.
2 Actions: `chat_completion` (hội thoại LLM) và `list_models` (xem danh sách model khả dụng).

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/definitions/chiasegpu.ts` | NEW | ~50 dòng |

### 1.3. Code Snapshot tại điểm sửa
Tham chiếu pattern từ `openai.ts` (dòng 1-26):
```typescript
import { ConnectorDefinition } from '../types';

export const openaiConnector: ConnectorDefinition = {
  slug: 'openai',
  name: 'OpenAI (ChatGPT)',
  icon: 'Bot',
  category: 'ai',
  description: 'Tích hợp mô hình GPT-4o, GPT-3.5 và DALL-E của OpenAI vào ứng dụng của bạn.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'OpenAI API Key', type: 'password', required: true, secret: true },
    { name: 'organizationId', label: 'Organization ID (Tùy chọn)', type: 'text', required: false },
  ],
  actions: [
    { slug: 'chat_completion', name: 'Chat Completion', description: 'Gửi hội thoại và nhận câu trả lời từ GPT', inputSchema: [] },
    { slug: 'generate_image', name: 'Tạo ảnh (DALL-E)', description: 'Tạo ảnh AI từ văn bản mô tả', inputSchema: [] },
  ],
  // ...
};
```

### 1.4. Thay đổi cần thực hiện
Tạo file mới `chiasegpu.ts` với nội dung:
```typescript
import { ConnectorDefinition } from '../types';

export const chiasegpuConnector: ConnectorDefinition = {
  slug: 'chiasegpu',
  name: 'ChiaSeGPU (AI Gateway)',
  icon: 'Cpu',
  category: 'ai',
  description: 'Cổng API AI tích hợp sẵn của AI2Hero. Hỗ trợ hàng trăm mô hình AI (GPT, Claude, Gemini, Llama...) qua một API duy nhất. Không cần API Key — hệ thống tự động xử lý.',
  authType: 'none',
  authFields: [],
  actions: [
    {
      slug: 'chat_completion',
      name: 'Chat Completion',
      description: 'Gửi hội thoại và nhận câu trả lời từ mô hình AI',
      inputSchema: [
        { name: 'model', label: 'Tên Model', type: 'text', required: false, placeholder: 'gpt-3.5-turbo', helpText: 'Để trống sẽ dùng model mặc định' },
        { name: 'prompt', label: 'Tin nhắn', type: 'textarea', required: true, placeholder: 'Xin chào...' },
      ]
    },
    {
      slug: 'list_models',
      name: 'Danh sách Model',
      description: 'Xem danh sách các mô hình AI khả dụng trên hệ thống',
      inputSchema: []
    },
  ],
  popular: true,
  setupGuide: '<p><b>✅ Cổng API AI tích hợp sẵn</b></p><p>Connector này sử dụng API Key hệ thống của AI2Hero. Bạn chỉ cần tạo kết nối và bắt đầu sử dụng — không cần nhập API Key.</p><p><b>Lưu ý:</b> Mỗi lần gọi API sẽ trừ token từ tài khoản AI2Hero của bạn.</p>',
  lifecycle: {
    updatePolicy: 'manual',
    healthCheckEndpoint: 'https://vilao.ai/api/v2/llm/marketplace/models',
    documentationUrl: 'https://vilao.ai'
  }
};
```

### 1.5. Vùng CẤM (trong task này)
- Tất cả file `.ts` khác trong `definitions/` — KHÔNG đụng
- Interface `ConnectorDefinition` trong `types.ts` — KHÔNG sửa

### 1.6. Phụ thuộc
Không có — Task 1 có thể làm đầu tiên.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- `grep_search` file mới: phải export `chiasegpuConnector`
- Kiểm tra `slug: 'chiasegpu'`, `authType: 'none'`, `authFields: []`
- Không có import sai (chỉ import từ `../types`)

### 1.8. Kết quả mong đợi
File `definitions/chiasegpu.ts` tồn tại, export `chiasegpuConnector` với đầy đủ metadata theo interface `ConnectorDefinition`.

---

## TASK 2: Tạo file Runner xử lý logic gọi API ChiaSeGPU

### 2.1. Mô tả
Viết runner gọi API thật tới `https://vilao.ai/v1` (OpenAI-compatible endpoint). 
Đọc `CHIASEGPU_API_KEY` từ `process.env`. 
Hỗ trợ 2 actions: `chat_completion` và `list_models`.
Có timeout 30s, error handling tiếng Việt.

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/runners/chiasegpu.ts` | NEW | ~90 dòng |

### 2.3. Code Snapshot tại điểm sửa
Tham chiếu pattern từ `runners/openai.ts` (dòng 1-41):
```typescript
export async function runOpenAI(
  creds: Record<string, string>,
  action: string,
  input: any
): Promise<any> {
  const apiKey = creds.apiKey;
  const orgId = creds.organizationId;
  
  if (!apiKey) throw new Error('Thiếu OpenAI API Key trong thông tin xác thực.');
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  if (orgId) headers['OpenAI-Organization'] = orgId;

  if (action === 'chat_completion') {
    const prompt = input.prompt || 'Xin chào';
    const messages = input.messages || [{ role: 'user', content: prompt }];
    
    const body = {
      model: input.model || 'gpt-3.5-turbo',
      messages,
      temperature: input.temperature ?? 0.7,
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${err.error?.message || response.statusText}`);
    }
    
    return response.json();
  }
  // ...
}
```

### 2.4. Thay đổi cần thực hiện
Tạo file mới `runners/chiasegpu.ts`:
```typescript
const CHIASEGPU_BASE_URL = 'https://vilao.ai/v1';

export async function runChiaSeGPU(
  _creds: Record<string, string>, // Không dùng creds, key từ ENV
  action: string,
  input: any
): Promise<any> {
  const apiKey = process.env.CHIASEGPU_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình CHIASEGPU_API_KEY trong biến môi trường server. Vui lòng liên hệ quản trị viên.');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  if (action === 'chat_completion') {
    const prompt = input.prompt || 'Xin chào';
    const messages = input.messages || [{ role: 'user', content: prompt }];
    
    const body = {
      model: input.model || 'gpt-3.5-turbo',
      messages,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.max_tokens ?? undefined,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${CHIASEGPU_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.error?.message || response.statusText;
        if (msg.includes('model_not_found') || msg.includes('deprecated')) {
          throw new Error(`Model "${input.model}" đã bị dừng hỗ trợ. Vui lòng chọn model khác.`);
        }
        throw new Error(`ChiaSeGPU API Error (${response.status}): ${msg}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  if (action === 'list_models') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${CHIASEGPU_BASE_URL}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`ChiaSeGPU API Error (${response.status}): ${err.error?.message || response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Action "${action}" chưa được hỗ trợ trên ChiaSeGPU runner.`);
}
```

**Điểm khác biệt so với OpenAI runner:**
1. `_creds` không dùng → API Key lấy từ `process.env.CHIASEGPU_API_KEY`
2. Base URL = `https://vilao.ai/v1` thay vì `https://api.openai.com/v1`
3. Thêm `AbortController` timeout 30s (LESSON 4.24 — bảo mật runtime)
4. Xử lý lỗi model deprecated (LESSON 17.3)

### 2.5. Vùng CẤM (trong task này)
- Tất cả file `.ts` khác trong `runners/` — KHÔNG đụng
- KHÔNG hardcode API Key (phải đọc từ `process.env`)

### 2.6. Phụ thuộc
Không có — Task 2 có thể làm song song với Task 1.

### 2.7. Verification (Cách kiểm tra đúng/sai)
- `grep_search` file mới: phải export `runChiaSeGPU`
- Kiểm tra có `process.env.CHIASEGPU_API_KEY` (không hardcode key)
- Kiểm tra có `AbortController` + `clearTimeout`
- Kiểm tra xử lý `model_not_found` / `deprecated`

### 2.8. Kết quả mong đợi
File `runners/chiasegpu.ts` tồn tại, export function `runChiaSeGPU` xử lý 2 actions `chat_completion` và `list_models` qua API thật.

---

## TASK 3: Đăng ký connector vào Registry + Engine

### 3.1. Mô tả
Import connector definition mới vào `registry.ts` (để hiện trên UI) và import runner vào `engine.ts` (để chạy action thật). Thêm slug `chiasegpu` vào `READY_SLUGS`.

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/registry.ts` | MODIFY | ~5 dòng thêm |
| `app/lib/connect-hub/connectors/engine.ts` | MODIFY | ~3 dòng thêm |

### 3.3. Code Snapshot tại điểm sửa

**registry.ts — Import section (dòng 1-24):**
```typescript
import { ConnectorDefinition } from './types';
import { customHttpConnector } from './definitions/custom-http';
import { kiotvietConnector } from './definitions/kiotviet';
// ... (nhiều import khác)
import { tiktokConnector } from './definitions/tiktok';
```

**registry.ts — RAW_CONNECTORS array (dòng 25-48):**
```typescript
const RAW_CONNECTORS: ConnectorDefinition[] = [
  openaiConnector,
  anthropicConnector,
  // ... (nhiều connector khác)
  customHttpConnector
];
```

**registry.ts — READY_SLUGS (dòng 50-59):**
```typescript
const READY_SLUGS = [
  'custom-http',
  'kiotviet',
  'pancake-pos',
  'pancake-chat',
  'google-sheets',
  'gmail',
  'telegram',
  'openai'
];
```

**engine.ts — Import + RUNNERS (dòng 1-13):**
```typescript
import { runCustomHttp } from './runners/custom-http';
import { runKiotViet } from './runners/kiotviet';
import { runPancakeChat } from './runners/pancake-chat';
import { runPancakePos } from './runners/pancake-pos';
import { runOpenAI } from './runners/openai';

const RUNNERS: Record<string, (creds: any, action: string, input: any) => Promise<any>> = {
  'custom-http': runCustomHttp,
  'kiotviet': runKiotViet,
  'pancake-chat': runPancakeChat,
  'pancake-pos': runPancakePos,
  'openai': runOpenAI,
};
```

### 3.4. Thay đổi cần thực hiện

**registry.ts — 3 chỗ sửa:**

1. Thêm import cuối danh sách import (sau dòng `import { tiktokConnector }`, trước dòng trống):
```typescript
import { chiasegpuConnector } from './definitions/chiasegpu';
```

2. Thêm `chiasegpuConnector` vào mảng `RAW_CONNECTORS` — đặt ngay SAU `qwenConnector` (nhóm AI):
```typescript
  qwenConnector,
  chiasegpuConnector,   // ← THÊM DÒNG NÀY
  runwayConnector,
```

3. Thêm `'chiasegpu'` vào `READY_SLUGS`:
```typescript
  'openai',
  'chiasegpu'   // ← THÊM DÒNG NÀY
];
```

**engine.ts — 2 chỗ sửa:**

1. Thêm import (sau dòng `import { runOpenAI }`):
```typescript
import { runChiaSeGPU } from './runners/chiasegpu';
```

2. Thêm vào object `RUNNERS` (sau `'openai': runOpenAI,`):
```typescript
  'openai': runOpenAI,
  'chiasegpu': runChiaSeGPU,   // ← THÊM DÒNG NÀY
```

### 3.5. Vùng CẤM (trong task này)
- KHÔNG xóa/sửa bất kỳ import hoặc entry nào đã có trong `RUNNERS`, `RAW_CONNECTORS`, `READY_SLUGS`
- KHÔNG sửa hàm `executeAction`, `simulateMockConnector`, `getConnectorBySlug`
- KHÔNG sửa logic map `status` trong `ALL_CONNECTORS`

### 3.6. Phụ thuộc
Task 1 + Task 2 phải hoàn thành trước (cần file được import tồn tại).

### 3.7. Verification (Cách kiểm tra đúng/sai)
- `grep_search 'chiasegpu' registry.ts` → phải thấy 3 chỗ (import, RAW_CONNECTORS, READY_SLUGS)
- `grep_search 'chiasegpu' engine.ts` → phải thấy 2 chỗ (import, RUNNERS)
- Chạy `pnpm tsc --noEmit` → 0 errors

### 3.8. Kết quả mong đợi
Connector `chiasegpu` xuất hiện trong danh sách App Store trên UI với status `ready`. Khi user tạo connection và chạy action, hệ thống gọi `runChiaSeGPU`.

---

## TASK 4: Thêm API Key vào `.env` và `.env.example`

### 4.1. Mô tả
Thêm biến môi trường `CHIASEGPU_API_KEY` vào `.env` (giá trị thật) và `.env.example` (placeholder).

### 4.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/.env` | MODIFY | ~2 dòng thêm |
| `app/.env.example` | MODIFY | ~2 dòng thêm |

### 4.3. Code Snapshot tại điểm sửa
Không cần snapshot — chỉ append cuối file.

### 4.4. Thay đổi cần thực hiện

**`.env` — Thêm cuối file:**
```env
# ChiaSeGPU - Cổng API AI (Admin Key)
CHIASEGPU_API_KEY=sk-85ab4cf3cf86c3ed380f5b9f3f27d24647e2fd3330a3b0b50ec85afd522b12e4
```

**`.env.example` — Thêm cuối file:**
```env
# ChiaSeGPU - Cổng API AI (Admin Key)
CHIASEGPU_API_KEY=sk-your-chiasegpu-api-key
```

### 4.5. Vùng CẤM (trong task này)
- KHÔNG xóa/sửa bất kỳ biến nào đã có trong `.env`
- KHÔNG commit file `.env` lên git (đảm bảo đã có trong `.gitignore`)

### 4.6. Phụ thuộc
Không có — Task 4 có thể làm song song với Task 1, 2.

### 4.7. Verification (Cách kiểm tra đúng/sai)
- `grep_search 'CHIASEGPU_API_KEY' .env` → phải tìm thấy
- `grep_search 'CHIASEGPU_API_KEY' .env.example` → phải tìm thấy
- `grep_search '.env' .gitignore` → đảm bảo `.env` không bị commit

### 4.8. Kết quả mong đợi
Server Next.js có thể đọc `process.env.CHIASEGPU_API_KEY` khi khởi động.

---

## THỨ TỰ THỰC HIỆN
```
Task 1 (Definition) ─┐
                      ├──→ Task 3 (Registry + Engine) → Verify (tsc)
Task 2 (Runner) ──────┘
Task 4 (.env) ────────────→ (Song song, bất kỳ lúc nào)
```

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Ghi thêm entry `chiasegpu connector` vào mục tiến trình Connect Hub
- Cập nhật UI_MAP.md: Không cần (không thêm trang UI mới)
- Cập nhật LESSONS.md: Nếu phát hiện pattern mới khi gọi API vilao.ai
- Restart dev server: `pnpm dev` để load `.env` mới
