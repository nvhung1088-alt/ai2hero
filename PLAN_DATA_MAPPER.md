# PLAN_DATA_MAPPER — Data Mapper cho POS Connectors
> Ngày tạo: 2026-06-02
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 3
> Ước tính: ~45 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Xây dựng một lớp dữ liệu trung gian (Data Mapper) nhằm chuẩn hóa dữ liệu thô từ các nền tảng POS (như Pancake POS, KiotViet) thành một định dạng chung duy nhất (Standard Order, Standard Product, Standard Customer). Việc này giúp các MVP nội bộ trong hệ thống AI2Hero có thể sử dụng dữ liệu một cách đồng nhất, không phụ thuộc vào thiết kế API của nền tảng nguồn.

## BỐI CẢNH KIẾN TRÚC
- Nằm tại module: `connect-hub` (`app/lib/connect-hub/utils`).
- Thay vì để các MVP khác (như AI Chat, AI Báo Cáo) phải tự xử lý dữ liệu đặc thù của `pancake-pos` hay `kiotviet`, Connect Hub sẽ cung cấp chức năng chuẩn hóa (Normalization) tự động (tùy chọn) qua cờ `normalize: true` khi gọi Server Action `runActionAction`.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: Lõi của `connect-hub/connectors/engine.ts` và logic xác thực (auth).
- KHÔNG đổi tên: Các hàm hiện tại trong `runActionAction` (chỉ bổ sung tham số không bắt buộc).
- Data: Cấu trúc Standard Interface sẽ đóng vai trò Nguồn sự thật (Source of Truth) cho cấu trúc E-commerce nội bộ của AI2Hero.

## LESSONS CẦN NHỚ
- Tách biệt tầng định nghĩa Type/Interface (`types.ts`) và tầng Logic (`mapper.ts`).
- Thiết kế theo nguyên lý Open-Closed Principle (Dễ dàng thêm Adapter cho KiotViet, Nhanh.vn sau này mà không sửa lõi của Mapper chính).

---

## TASK 1: Định nghĩa các Standard Interfaces

### 1.1. Mô tả
Thiết lập file Types chung cho E-commerce/POS gồm StandardProduct, StandardCustomer, StandardOrder để tất cả các Data Mapper đều cam kết trả về định dạng này.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/utils/types.ts` | NEW | ~40 dòng |

### 1.3. Code Snapshot tại điểm sửa
N/A (File tạo mới 100%)

### 1.4. Thay đổi cần thực hiện
Tạo file mới export các interface:
- `StandardCustomer`: `id` (string), `name`, `phone`, `address`, `email`, `createdAt`.
- `StandardProduct`: `id` (string), `name`, `sku`, `price`, `quantity`, `imageUrl`.
- `StandardOrder`: `id` (string), `orderCode`, `customer` (StandardCustomer), `products` (StandardProduct[]), `totalAmount`, `discount`, `status` (pending/completed/cancelled), `createdAt`, `notes`.

### 1.5. Vùng CẤM (trong task này)
N/A

### 1.6. Phụ thuộc
Không

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Compile Typecheck không có lỗi. `import { StandardOrder } from '@/lib/connect-hub/utils/types'` hợp lệ trên toàn dự án.

### 1.8. Kết quả mong đợi
Có một cấu trúc dữ liệu chung duy nhất cho toàn bộ hệ sinh thái POS tại AI2Hero.

---

## TASK 2: Viết lớp Data Mapper Pattern

### 1.1. Mô tả
Tạo file `mapper.ts` chứa logic ánh xạ (mapping) từ dữ liệu raw sang Standard format, hỗ trợ mở rộng theo cấu trúc Adapter của `appSlug`.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/connect-hub/utils/mapper.ts` | NEW | ~100 dòng |

### 1.3. Code Snapshot tại điểm sửa
N/A (File tạo mới)

### 1.4. Thay đổi cần thực hiện
- Import các interfaces từ `types.ts`.
- Xây dựng hàm lõi: `export function normalizeData(appSlug: string, actionSlug: string, rawData: any): any`.
- Xây dựng Switch-case chuyển hướng xử lý:
  - Cho `appSlug === 'pancake-pos'`:
    - `actionSlug === 'list_orders'`: Dùng helper `mapPancakeOrder(rawOrder)` chuyển danh sách thành `StandardOrder[]`.
    - `actionSlug === 'list_products'`: Dùng helper `mapPancakeProduct(rawProduct)` chuyển thành `StandardProduct[]`.
    - `actionSlug === 'list_customers'`: Dùng helper `mapPancakeCustomer(rawCustomer)` chuyển thành `StandardCustomer[]`.
- Fallback: Trả về `rawData` (nguyên bản) nếu không tìm thấy mapper phù hợp.

### 1.5. Vùng CẤM (trong task này)
KHÔNG gọi hay phụ thuộc bất kỳ external package nào khác. 

### 1.6. Phụ thuộc
Phải làm SAU Task 1.

### 1.7. Verification (Cách kiểm tra đúng/sai)
Hàm `normalizeData('pancake-pos', 'list_orders', [{ id: 1, ... }])` trả về object có khóa `orderCode` và `totalAmount` chuẩn.

### 1.8. Kết quả mong đợi
Có hệ thống switch-case sẵn sàng chuẩn hóa dữ liệu tự động On-the-fly.

---

## TASK 3: Tích hợp Normalization vào Server Action

### 1.1. Mô tả
Sửa đổi cổng gọi API `runActionAction` để chấp nhận tham số `normalize?: boolean`. Cổng này tự động chạy kết quả thô qua Data Mapper trước khi trả về Client/MVP nếu nhận được cờ `normalize = true`.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/connect-hub-actions.ts` | MODIFY | ~10 dòng |

### 1.3. Code Snapshot tại điểm sửa
```typescript
    // Thực thi action qua connector engine
    const executionResult = await executeAction(
      connection.appSlug,
      credentials,
      data.actionSlug,
      data.input
    );
```

### 1.4. Thay đổi cần thực hiện
- Thay đổi interface đầu vào của `runActionAction`: thêm tham số `normalize?: boolean` vào đối tượng `data`.
- Bổ sung logic sau khi có `executionResult`:
  ```typescript
  import { normalizeData } from '../connect-hub/utils/mapper';
  // ...
  if (data.normalize && executionResult.success) {
      executionResult.data = normalizeData(
          connection.appSlug, 
          data.actionSlug, 
          executionResult.data
      );
  }
  ```

### 1.5. Vùng CẤM (trong task này)
KHÔNG sửa phần lưu log `connectHubUsageLogs` (đảm bảo performance tracking không bị ảnh hưởng).

### 1.6. Phụ thuộc
Phải làm SAU Task 1 & 2.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Chạy `pnpm build` hoặc TypeScript checker thành công với **0 errors**.

### 1.8. Kết quả mong đợi
Các MVP có thể chọn gọi `runActionAction({ ... , normalize: true })` và nhận lại mảng `StandardOrder` thay vì mảng dữ liệu rối rắm từ Pancake POS.
