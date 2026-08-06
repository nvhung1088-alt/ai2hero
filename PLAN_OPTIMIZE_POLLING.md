# PLAN: Tối ưu hoá Polling & Giảm 90% Edge Requests (Global Traffic System)
> Ngày tạo: 2026-08-06
> Tác giả: Gemini (CTO/Architect)
> Số tasks: 5
> Ước tính: ~60 phút cho Flash thực thi

## MỤC TIÊU TỔNG
1. **Giảm thiểu tối đa lãng phí Edge Requests** trên Vercel do các tiến trình Background (Worker, Extension) liên tục poll máy chủ (mục tiêu giảm >90% từ 100k xuống dưới 10k/ngày).
2. Tích hợp với **Hệ thống cấu hình Traffic toàn cục (Global Traffic Manager)** đã có sẵn tại `/admin/traffic` và `app/admin/actions.ts`.
3. Áp dụng cơ chế **Adaptive Polling (Backoff)** ở Client (Python Workers, Chrome Extension) nhưng lấy tham số chu kỳ gốc (`pollIntervalMs`) từ cấu hình trên Server.

## BỐI CẢNH KIẾN TRÚC
- Nguồn cấu hình gốc nằm ở DB `systemSettings` (được fetch qua `getGlobalPollingModeAction()`).
- Server API Routes (Next.js) hiện chưa nhúng giá trị `pollIntervalMs` từ global config vào kết quả JSON trả về (cho các worker).
- Client (Worker, Extension) đang hardcode `setInterval(3000)` hoặc `time.sleep(10)` vô tình tạo ra hàng nghìn request spam liên tục.
- Web UI (React) cần sử dụng `shared-polling-config.ts` (kiểm tra `document.visibilityState`) để dừng fetch khi tab bị giấu (background).

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- Tránh gọi DB liên tục `getGlobalPollingModeAction()` trong mỗi API route polling để chống sập Database (Connection Exhaustion). Cần dùng RAM Cache cục bộ (Map/đơn giản) với TTL ~60s trên server để giới hạn số lần gọi DB.

---

## TASK 1: Tạo Cache Helper cho Global Config trên Server

### 1.1. Mô tả
Tạo một cache helper nhẹ trong `app/admin/actions.ts` (hoặc file utils) để lưu trữ RAM giá trị `TrafficConfig` tối đa 60 giây, giúp các API Route có thể gọi hàng ngàn lần mỗi phút mà không làm nghẽn DB PostgreSQL.

### 1.2. Files cần sửa
| File | Hành động |
|---|---|
| `app/app/admin/actions.ts` | MODIFY |

### 1.4. Thay đổi cần thực hiện
Thêm biến toàn cục `let cachedTrafficConfig: TrafficConfig | null = null; let cacheExpiry = 0;`. Tạo hàm `getCachedGlobalPollingMode()` gọi `getGlobalPollingModeAction()` nhưng có logic kiểm tra `Date.now() > cacheExpiry`.

---

## TASK 2: Nhúng `pollIntervalMs` vào 4 API Routes lõi

### 2.1. Mô tả
Cập nhật các API Routes để trả thêm `pollIntervalMs` lấy từ `getCachedGlobalPollingMode()`.

### 2.2. Files cần sửa
| File | Hành động |
|---|---|
| `app/app/api/connect-hub/bridge/route.ts` | MODIFY |
| `app/app/api/hero-dub/tasks/route.ts` | MODIFY |
| `app/app/api/hero-downloader/worker/tasks/route.ts` | MODIFY |
| `app/app/api/hero-drive/worker/route.ts` | MODIFY |

### 2.4. Thay đổi cần thực hiện
- Import `getCachedGlobalPollingMode` từ `actions.ts`.
- Trong JSON Response của phương thức GET (khi trả về `job: null` hoặc `task: null`), đính kèm `pollIntervalMs: config.pollIntervalMs`.

---

## TASK 3: Tối ưu Polling trên Bridge Extension (Cắt giảm 80% lãng phí)

### 3.1. Mô tả
Sửa vòng lặp cứng nhắc `setInterval(..., 3000)` trong file `background.js` của `ai2hero-bridge-ext`.

### 3.2. Files cần sửa
| File | Hành động |
|---|---|
| `apps/ai2hero-bridge-ext/background.js` | MODIFY |

### 3.4. Thay đổi cần thực hiện
- Thay `setInterval` bằng `setTimeout(pollLoop, currentInterval)`.
- Đọc `data.pollIntervalMs` từ Server API response. Nếu không có job, `currentInterval = data.pollIntervalMs || 15000`. Nếu có job xử lý, gán về `3000` (nhanh chóng xử lý task tiếp).

---

## TASK 4: Tối ưu Python Workers (Hero Dub & Downloader)

### 4.1. Mô tả
Cải thiện `worker.py` để sử dụng Adaptive Backoff kết hợp với `pollIntervalMs` từ server.

### 4.2. Files cần sửa
| File | Hành động |
|---|---|
| `herodub-worker/worker.py` | MODIFY |
| `herodub-worker/herodub_worker.py` | MODIFY |
| `hero-downloader-worker/worker.py` | MODIFY |

### 4.4. Thay đổi cần thực hiện
- Khi `task: null` hoặc `downloadTasks` rỗng, lấy `pollIntervalMs` từ API response.
- Tính luỹ tiến: `poll_interval = min(poll_interval * 1.5, max_backoff)` (ví dụ từ 15s lên 30s lên 60s). Đổi `time.sleep(10)` thành `time.sleep(poll_interval)`.

---

## TASK 5: Tối ưu Hero Drive Worker (Bỏ Sync Rỗng)

### 5.1. Mô tả
Chỉ bắn `POST action=sync` (Empty items) khi thực sự cần Heartbeat định kỳ 10 phút, tránh spam mỗi 30s.

### 5.2. Files cần sửa
| File | Hành động |
|---|---|
| `scripts/herodrive_worker.py` | MODIFY |

### 5.4. Thay đổi cần thực hiện
- Trong `scripts/herodrive_worker.py`, thêm biến lưu `last_empty_sync_time`. Chỉ gửi `items: []` nếu quá 10 phút chưa sync.

---

## THỨ TỰ THỰC HIỆN
Task 1 -> Task 2 -> Task 3, 4, 5 (song song).

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Thêm "Đã tích hợp Hệ thống Traffic Control toàn cục và cắt giảm 90% Edge Requests".
