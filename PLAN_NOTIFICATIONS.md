# PLAN HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
> Ngày tạo: 2026-06-10
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 3
> Ước tính: 30 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Hoàn thiện Hệ thống Thông báo (Notifications) thời gian thực cho iSocial MVP.
Giải quyết lỗi bất đồng bộ dữ liệu giữa API và UI (biến `message` vs `content`), bổ sung hiển thị Avatar người tương tác trong Dropdown, giảm độ trễ SWR Polling và thiết kế một trang `/notifications` chuyên biệt chuẩn Facebook Layout.

## BỐI CẢNH KIẾN TRÚC
- API hiện tại là `app/api/notifications/route.ts` trả về mảng `notifications` có trường `message`, nhưng UI `social-top-nav.tsx` đang cố đọc `notif.content` dẫn đến hiển thị trống.
- UI Dropdown chưa tận dụng trường `fromAvatar` trả về từ API.
- Cần một trang xem toàn bộ thông báo độc lập, tương tự như các route `/messages`, `/friends`.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa DB Schema `notifications` trong `schema.ts`.
- CSS: Tuân thủ Dark Glassmorphism (`bg-[#161618]`, `text-white/80`).

## LESSONS CẦN NHỚ
- Luôn kiểm tra mapping properties giữa JSON response và Client model để tránh lỗi `undefined`.

---

## TASK 1: Sửa API Route Notifications

### 1.1. Mô tả
Cập nhật API trả về để cung cấp trường `url` (dùng để chuyển hướng khi click) và đổi `message` thành `content` để khớp với kỳ vọng của Client hiện tại.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/api/notifications/route.ts` | MODIFY | ~10 dòng |

### 1.3. Code Snapshot tại điểm sửa
```typescript
      notifications: userNotifications.map(n => ({
        id: n.id,
        fromUser: n.fromUserName || 'Hệ thống',
        fromAvatar: n.fromUserAvatar || '👤',
        message: n.message,
        timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        read: n.read === 1,
        postId: n.postId,
        type: n.type || null,
        invitationId: n.invitationId || null,
      })),
```

### 1.4. Thay đổi cần thực hiện
Thay trường `message: n.message,` bằng `content: n.message,`.
Bổ sung logic tạo `url`: 
`url: n.postId ? \`/post/\${n.postId}\` : n.invitationId ? \`/groups\` : '#',`

### 1.5. Vùng CẤM (trong task này)
- KHÔNG thay đổi logic truy vấn Drizzle DB.

### 1.6. Phụ thuộc
Không.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- API Endpoint chạy không lỗi cú pháp.

### 1.8. Kết quả mong đợi
Dữ liệu trả về đúng model UI mong muốn. Khi click thông báo sẽ redirect đúng URL.

---

## TASK 2: Nâng cấp Top Nav Dropdown UI

### 1.1. Mô tả
Hiển thị thêm Avatar của người gửi trong Dropdown. Giảm `refreshInterval` SWR từ 15000 xuống 5000.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(social)/(main)/social-top-nav.tsx` | MODIFY | ~30 dòng |

### 1.3. Code Snapshot tại điểm sửa
```typescript
  // Dynamic Data Fetching (polling 15s)
  const { data: notifData } = useSWR('/api/notifications', fetcher, { refreshInterval: 15000 });
// ... (skip lines)
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif.id)}
                      className={`w-full text-left p-3 hover:bg-white/5 transition-all flex gap-3 items-start border-b border-white/5 last:border-0 ${!notif.read ? 'bg-pink-500/5' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs text-white/80 ${!notif.read ? 'font-semibold' : ''}`}>
                          {notif.content}
                        </p>
                        <span className="text-[10px] text-white/30 block mt-1">
                          {new Date(notif.timestamp).toLocaleDateString()}
                        </span>
                      </div>
```

### 1.4. Thay đổi cần thực hiện
1. Đổi `{ refreshInterval: 15000 }` thành `{ refreshInterval: 5000 }`.
2. Trong thẻ `<button>` danh sách thông báo, chèn Avatar HTML snippet vào trước thẻ `<div className="flex-1 min-w-0">`:
```tsx
                      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/10 relative">
                         {notif.fromAvatar !== '👤' ? (
                           <img src={notif.fromAvatar} alt="Avatar" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs">👤</div>
                         )}
                      </div>
```
3. Đổi `{new Date(notif.createdAt).toLocaleDateString()}` thành `{notif.timestamp}` vì API đã trả về string timestamp đẹp.

### 1.5. Vùng CẤM (trong task này)
- KHÔNG sửa phần Search logic hay AppSwitcher trong Top Nav.

### 1.6. Phụ thuộc
Phải làm SAU Task 1.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Render chuẩn Avatar. TypeScript không báo lỗi thiếu field.

### 1.8. Kết quả mong đợi
Menu chuông hiển thị thông báo mượt mà, đầy đủ Avatar, hiển thị thời gian chính xác, polling nhanh hơn.

---

## TASK 3: Tạo trang /notifications chuyên biệt

### 1.1. Mô tả
Tạo trang `/notifications` với giao diện hiển thị toàn bộ thông báo (tương tự chức năng trang notifications của Facebook).

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(social)/(main)/notifications/page.tsx` | NEW | ~15 dòng |
| `app/app/(social)/(main)/notifications/notifications-client.tsx` | NEW | ~100 dòng |

### 1.3. Code Snapshot tại điểm sửa
(File mới hoàn toàn)

### 1.4. Thay đổi cần thực hiện
1. **`page.tsx`**: Khai báo Server Component gọi `<NotificationsClient />`.
2. **`notifications-client.tsx`**: 
- Import `useSWR` lấy API `/api/notifications`.
- Layout 2 cột:
  - Cột chính (trái - 70%): Bảng thông báo chi tiết, liệt kê `notif.content`, hiển thị icon hoặc avatar.
  - Cột phụ (phải - 30%): Khung tùy chỉnh ("Cài đặt thông báo", "Đánh dấu tất cả đã đọc").

### 1.5. Vùng CẤM (trong task này)
N/A

### 1.6. Phụ thuộc
Có thể làm song song với Task 2.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Truy cập URL `/notifications` không bị 404, hiển thị list đẹp.

### 1.8. Kết quả mong đợi
Người dùng có một trang riêng để quản lý thông báo, không bị gò bó trong Dropdown hẹp.

---

## THỨ TỰ THỰC HIỆN
Task 1 ➔ Task 2 ➔ Task 3

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Tính năng Notifications system hoàn thành.
- Cập nhật UI_MAP.md: Thêm route `/notifications`.
