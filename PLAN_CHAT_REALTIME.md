# PLAN CHAT REALTIME (SWR Polling & Optimistic UI)
> Ngày tạo: 2026-06-10
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 1
> Ước tính: 15 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Triển khai tính năng "Chat Realtime" cho iSocial MVP bằng giải pháp SWR Polling kết hợp Optimistic UI Updates. Phương án này (Fake Realtime) thay thế cho `setInterval` thủ công, đảm bảo hoạt động hoàn hảo trên kiến trúc Serverless (Vercel/Neon) mà không cần phụ thuộc vào broker trung gian (Redis) hay Supabase Realtime SDK.

## BỐI CẢNH KIẾN TRÚC
- File UI chính là `messages-client.tsx`. Hiện đang dùng `setInterval(..., 4000)` để gọi Server Action `getChatMessages()`.
- Phương án: Thay thế toàn bộ logic state cục bộ `messages` và `setInterval` bằng `useSWR` từ thư viện `swr`.
- Sử dụng `mutate(key, optimisticData, false)` trong hàm `handleSend` để hiển thị tin nhắn ngay lập tức trước khi Server Action phản hồi.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: `social-chat-actions.ts` (các Server Actions đang hoạt động tốt).
- KHÔNG đổi tên: Cấu trúc trả về của `getChatMessages` và `sendChatMessageAction`.
- CSS: Giữ nguyên Tailwind classes của giao diện chat 3 cột.

## LESSONS CẦN NHỚ
- SWR với Server Actions trong App Router là chuẩn mực cho dữ liệu mutate nhanh mà không phá vỡ RSC.

---

## TASK 1: Refactor MessagesClient sang SWR & Optimistic UI

### 1.1. Mô tả
Thay thế luồng fetch/set messages thủ công bằng `useSWR`. Kết hợp `refreshInterval: 3000` (SWR Polling) để giả lập realtime. Sửa `handleSend` sử dụng Optimistic UI nhằm hiển thị tin nhắn ngay lập tức khi người dùng bấm gửi.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(social)/(main)/messages/messages-client.tsx` | MODIFY | ~40 dòng |

### 1.3. Code Snapshot tại điểm sửa
```typescript
import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getChatMessages, sendChatMessageAction } from '@/lib/db/social-chat-actions';
// ...
  const [activeConvId, setActiveConvId] = useState<number | null>(initialConvId || (conversations.length > 0 ? conversations[0].id : null));
  const [messages, setMessages] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      const interval = setInterval(() => fetchMessages(activeConvId), 4000);
      return () => clearInterval(interval);
    }
  }, [activeConvId]);
```

### 1.4. Thay đổi cần thực hiện
1. Bổ sung `import useSWR from 'swr';` ở đầu file.
2. Xóa state `messages` (`const [messages, setMessages] = useState...`).
3. Khai báo SWR:
   ```typescript
   const { data: messages = [], mutate } = useSWR(
     activeConvId ? `chat-messages-${activeConvId}` : null,
     () => getChatMessages(activeConvId as number),
     { refreshInterval: 3000, revalidateOnFocus: true }
   );
   ```
4. Xóa `useEffect` quản lý `setInterval` và hàm `fetchMessages`.
5. Sửa đổi logic `handleSend`:
   - Tạo biến `optimisticMsg = { id: Date.now(), content: tempInput, senderId: currentUserId, createdAt: new Date() };`
   - Gọi `mutate(activeConvId ? \`chat-messages-\${activeConvId}\` : null, [...messages, optimisticMsg], false)` trước khi gọi Server Action.
   - Bọc `await sendChatMessageAction(...)` trong `try-catch`.
   - Sau khi thành công, gọi lại `mutate()` một lần nữa (để revalidate với data thật).

### 1.5. Vùng CẤM (trong task này)
- KHÔNG thay đổi phần giao diện HTML/JSX của component `MessagesClient`. Chỉ sửa đổi logic React Hooks ở đầu component.
- KHÔNG thay đổi component `reels-client` hay layout khác.

### 1.6. Phụ thuộc
Không có. Độc lập triển khai.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Chạy npm run lint để chắc chắn không lỗi TypeScript.
- Flash tự đọc code logic SWR để đảm bảo `mutate` không đè lên undefined data.

### 1.8. Kết quả mong đợi
Ứng dụng nhắn tin hoạt động cực kỳ mượt mà. Khi nhấn Enter, tin nhắn xuất hiện ngay lập tức (không cần đợi Server). Tin nhắn mới từ người khác sẽ được fetch đều đặn mỗi 3 giây.

---

## THỨ TỰ THỰC HIỆN
Task 1 (Done).

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Ghi nhận hoàn thành tính năng "Chat Realtime (SWR Polling & Optimistic UI)".
- Cập nhật UI_MAP.md: Thêm thông tin `/messages` sử dụng SWR polling.
