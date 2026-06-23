### 3. Client Components & UX (`app/components/feed-post-card.tsx` & Feeds)
- **Reaction Picker**:
    - Thay thế nút "Thích" đơn thuần bằng một Hover Container hoạt động bằng CSS transitions. Khi di chuột vào nút Thích, một popup mờ kính chứa 6 biểu tượng cảm xúc động (Like 👍, Love ❤️, Haha 😆, Wow 😮, Sad 😢, Angry 😡) sẽ hiện lên.
- **Reactions Summary**:
    - Hiển thị danh sách các emoji tương ứng kèm theo tổng số lượt thả của từng loại cảm xúc phía dưới bài viết và bình luận.
- **Recursive Nested Comments**:
    - Tái cấu trúc vùng hiển thị bình luận thành component đệ quy `CommentItem`.
    - Thêm nút "Trả lời" dưới mỗi bình luận. Khi nhấp vào, sẽ hiển thị một ô nhập văn bản thụt lề ngay dưới bình luận cha để gửi phản hồi cấp con.
    - Hỗ trợ gập/mở (Collapse/Expand) luồng phản hồi để giao diện gọn gàng hơn.

## Kiểm thử & Xác minh

### 1. TypeScript compilation
Chạy thành công kiểm tra kiểu dữ liệu tĩnh:
```bash
npx tsc --noEmit
```
Kết quả: 0 lỗi biên dịch.

### 2. Manual Verification
- Hover vào nút thích bài viết hoạt động mượt mà, hiển thị popup chọn cảm xúc.
- Thả cảm xúc "Haha" hoạt động chính xác, biểu tượng "😆" được cập nhật lên giao diện.
- Viết phản hồi cho bình luận tạo ra cấu trúc cây thụt lề chính xác.
- Thả cảm xúc trên bình luận lưu trữ thành công vào bảng `feed_comment_likes`.