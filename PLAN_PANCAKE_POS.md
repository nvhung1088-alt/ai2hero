# PLAN_PANCAKE_POS — Thêm Connector Pancake POS
> Ngày tạo: 2026-06-02
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 4
> Ước tính: ~10 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Phát triển và đăng ký connector Pancake POS vào API Hub, cho phép người dùng nhập API Key (Page Access Token) và Page ID để lấy danh sách hội thoại, khách hàng và đơn hàng từ nền tảng Pancake.

## BỐI CẢNH KIẾN TRÚC
Connector mới sẽ được định nghĩa theo cấu trúc của `ConnectorDefinition` và được thêm vào mảng `ALL_CONNECTORS` tại `registry.ts`. Logic runtime sẽ nằm trong `runners/pancake.ts` và được đăng ký trong `engine.ts`.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: Cấu trúc của các file định nghĩa khác (`kiotviet.ts`, vv).
- CSS: Không liên quan.
- Data: `app/lib/connect-hub/connectors` là thư mục chứa logic.

## LESSONS CẦN NHỚ
- `1.1` Lỗi domino: Tuân thủ làm từng task, test sau mỗi task.

---

## TASK 1: Tạo Definition cho Pancake POS

### 1.1. Mô tả
Khai báo cấu hình giao diện nhập thông tin auth (Page Access Token, Page ID) và danh sách actions cho Pancake POS.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/definitions/pancake.ts` | NEW | ~35 dòng |

### 1.3. Code Snapshot tại điểm sửa
(Đây là file mới, sẽ tạo từ đầu)

### 1.4. Thay đổi cần thực hiện
Tạo file mới `app/lib/connect-hub/connectors/definitions/pancake.ts` với nội dung sau:
```typescript
import { ConnectorDefinition } from '../types';

export const pancakeConnector: ConnectorDefinition = {
  slug: 'pancake',
  name: 'Pancake',
  icon: 'MessageCircle', // Icon chat
  category: 'chat',
  description: 'Đồng bộ hội thoại, khách hàng và đơn hàng từ Pancake POS.',
  authType: 'api_key',
  authFields: [
    { name: 'pageId', label: 'Page ID', type: 'text', required: true, placeholder: 'vd: 123456789' },
    { name: 'accessToken', label: 'Page Access Token (API Key)', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'list_conversations', name: 'Lấy hội thoại', description: 'Truy vấn danh sách hội thoại mới nhất', inputSchema: [] },
    { slug: 'list_customers', name: 'Lấy khách hàng', description: 'Truy vấn danh sách khách hàng', inputSchema: [] },
    { slug: 'list_orders', name: 'Lấy đơn hàng', description: 'Truy vấn danh sách đơn hàng', inputSchema: [] },
  ],
  vietnam: true,
};
```

### 1.5. Vùng CẤM (trong task này)
- Không có vùng cấm (file mới hoàn toàn).

### 1.6. Phụ thuộc
Không

### 1.7. Verification (Cách kiểm tra đúng/sai)
- File `pancake.ts` tồn tại và compile không lỗi.

### 1.8. Kết quả mong đợi
Định nghĩa Pancake POS sẵn sàng để import vào registry.

---

## TASK 2: Đăng ký Pancake vào Registry

### 1.1. Mô tả
Đưa `pancakeConnector` vào mảng hiển thị tổng `ALL_CONNECTORS` để giao diện App Store có thể render.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/registry.ts` | MODIFY | ~4 dòng |

### 1.3. Code Snapshot tại điểm sửa
```typescript
import { kiotvietConnector } from './definitions/kiotviet';
import { googleSheetsConnector } from './definitions/google-sheets';
import { gmailConnector } from './definitions/gmail';
import { telegramConnector } from './definitions/telegram';

export const ALL_CONNECTORS: ConnectorDefinition[] = [
  customHttpConnector,
```

### 1.4. Thay đổi cần thực hiện
Thêm lệnh import `pancakeConnector` và bổ sung vào mảng `ALL_CONNECTORS`:
```typescript
import { customHttpConnector } from './definitions/custom-http';
import { kiotvietConnector } from './definitions/kiotviet';
import { googleSheetsConnector } from './definitions/google-sheets';
import { gmailConnector } from './definitions/gmail';
import { telegramConnector } from './definitions/telegram';
import { pancakeConnector } from './definitions/pancake';

export const ALL_CONNECTORS: ConnectorDefinition[] = [
  customHttpConnector,
  kiotvietConnector,
  pancakeConnector,
  googleSheetsConnector,
  gmailConnector,
  telegramConnector
];
```

### 1.5. Vùng CẤM (trong task này)
- KHÔNG xóa bất kỳ connector nào khác đang có trong mảng `ALL_CONNECTORS`.

### 1.6. Phụ thuộc
Task 1

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Array `ALL_CONNECTORS` có 6 phần tử.

### 1.8. Kết quả mong đợi
Pancake POS hiện diện trên giao diện Web UI (App Store).

---

## TASK 3: Tạo Runner cho Pancake

### 1.1. Mô tả
Tạo logic gọi API thực tế hoặc Mock cho connector Pancake khi action được trigger.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/runners/pancake.ts` | NEW | ~50 dòng |

### 1.3. Code Snapshot tại điểm sửa
(Đây là file mới, sẽ tạo từ đầu)

### 1.4. Thay đổi cần thực hiện
Tạo file mới `app/lib/connect-hub/connectors/runners/pancake.ts` với nội dung Mock/Thực tế:
```typescript
export async function runPancake(
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const { pageId, accessToken } = credentials;
  if (!pageId || !accessToken) {
    throw new Error('Thiếu cấu hình Page ID hoặc Access Token cho Pancake');
  }

  // Giả lập độ trễ mạng
  await new Promise(resolve => setTimeout(resolve, 800));

  if (actionSlug === 'list_conversations') {
    return {
      status: 'success',
      data: [
        { id: 'conv_1', customer_name: 'Nguyễn Văn A', message: 'Tư vấn sản phẩm', unread: true },
        { id: 'conv_2', customer_name: 'Trần Thị B', message: 'Đã nhận được hàng', unread: false }
      ]
    };
  }

  if (actionSlug === 'list_orders') {
    return {
      status: 'success',
      data: [
        { order_id: '1001', customer_name: 'Nguyễn Văn A', total: 500000, status: 'Mới' }
      ]
    };
  }

  if (actionSlug === 'list_customers') {
    return {
      status: 'success',
      data: [
        { phone: '0912345678', name: 'Nguyễn Văn A', total_spent: 1500000 }
      ]
    };
  }

  throw new Error(`Action ${actionSlug} chưa được hỗ trợ trên Pancake`);
}
```

### 1.5. Vùng CẤM (trong task này)
- Không có.

### 1.6. Phụ thuộc
Không

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Hàm `runPancake` export thành công và không lỗi biên dịch.

### 1.8. Kết quả mong đợi
Logic xử lý API (Mock) của Pancake đã được xây dựng sẵn sàng.

---

## TASK 4: Đăng ký Runner vào Engine

### 1.1. Mô tả
Cập nhật Dispatcher trung tâm để nhận diện connector `pancake` và liên kết với `runPancake`.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/connectors/engine.ts` | MODIFY | ~4 dòng |

### 1.3. Code Snapshot tại điểm sửa
```typescript
import { runCustomHttp } from './runners/custom-http';
import { runKiotViet } from './runners/kiotviet';

const RUNNERS: Record<string, (creds: any, action: string, input: any) => Promise<any>> = {
  'custom-http': runCustomHttp,
  'kiotviet': runKiotViet,
};
```

### 1.4. Thay đổi cần thực hiện
Import `runPancake` và thêm vào đối tượng `RUNNERS`:
```typescript
import { runCustomHttp } from './runners/custom-http';
import { runKiotViet } from './runners/kiotviet';
import { runPancake } from './runners/pancake';

const RUNNERS: Record<string, (creds: any, action: string, input: any) => Promise<any>> = {
  'custom-http': runCustomHttp,
  'kiotviet': runKiotViet,
  'pancake': runPancake,
};
```

### 1.5. Vùng CẤM (trong task này)
- KHÔNG làm hỏng logic của `runCustomHttp` hay `runKiotViet`.

### 1.6. Phụ thuộc
Task 3

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Module engine export bình thường, `executeAction` có thể chạy `pancake`.

### 1.8. Kết quả mong đợi
Pancake connector hoàn tất tích hợp End-to-End từ giao diện tới runtime Engine.

---

## THỨ TỰ THỰC HIỆN
Task 1 → Task 2
Task 3 → Task 4

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Thêm ghi chú đã hoàn tất connector Pancake.
- Cập nhật UI_MAP.md: (Không thay đổi)
- Cập nhật LESSONS.md: (Không thay đổi)
