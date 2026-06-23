# PLAN CHỈNH SỬA TRANG CÁ NHÂN (EDIT PROFILE UI)
> Ngày tạo: 2026-06-10
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 1
> Ước tính: 15 phút cho Flash/Pro thực thi

## MỤC TIÊU TỔNG
Nâng cấp giao diện Modal "Chỉnh sửa trang cá nhân" (`edit-profile-modal.tsx`) của iSocial từ một Form nhập liệu khô khan thành một giao diện Modal cao cấp chuẩn Facebook. Giao diện mới sẽ chia thành các khối rõ ràng, hiển thị trực quan thông tin hiện tại kèm các nút Edit chuyên biệt.

## BỐI CẢNH KIẾN TRÚC
- File chính cần sửa: `app/app/(social)/(main)/profile/edit-profile-modal.tsx`
- Các trường dữ liệu hỗ trợ sẵn trong DB (`socialProfiles` và `users`): `name, bio, location, birthday, website, relationship`. (Phần upload Avatar và Cover hiện tại đang được xử lý riêng ngoài trang Header, task này sẽ tập trung vào Bio và Chi tiết).
- Nền tảng UI: Tailwind CSS, Dark Mode (`bg-[#161618]`).

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG thay đổi Server Actions (`updateSocialProfileAction`) hay Database Schema.
- KHÔNG làm mất logic gửi form hiện hành (vẫn phải có thể submit thông tin hợp lệ).

## LESSONS CẦN NHỚ
- Layout scroll cho Modal không được vượt quá chiều cao màn hình (`max-h-[90vh]`, `overflow-y-auto`).

---

## TASK 1: Tái cấu trúc Edit Profile Modal

### 1.1. Mô tả
Thay đổi form nhập liệu hiện hành thành cấu trúc danh sách theo từng khối.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(social)/(main)/profile/edit-profile-modal.tsx` | MODIFY | ~200 dòng |

### 1.3. Code Snapshot tại điểm sửa
- Toàn bộ file `edit-profile-modal.tsx` sẽ được viết lại phần Return (UI). Phần logic States (`name, bio, location...`) và hàm `handleSubmit` giữ nguyên.

### 1.4. Thay đổi cần thực hiện
Thay vì đặt toàn bộ input phơi bày ra một lượt, thiết kế UI thành các khối (Sections) xếp dọc:
1. **Khối Ảnh đại diện & Bìa**: (Chỉ hiển thị placeholder hoặc thông báo "Vui lòng bấm vào ảnh ở ngoài trang cá nhân để đổi").
2. **Khối Tiểu sử (Bio)**: Tiêu đề "Tiểu sử", phía dưới là textarea.
3. **Khối Chi tiết**: Chứa các input: `location` (Nơi sống), `birthday` (Ngày sinh), `relationship` (Tình trạng quan hệ).
4. **Khối Liên kết**: Chứa input `website`.

Dưới cùng là Sticky Footer chứa nút "Hủy" và "Lưu thay đổi".
Sử dụng các class chia khối như `border-b border-white/10 pb-6 mb-6`.

### 1.5. Vùng CẤM (trong task này)
- Không chạm vào các tính năng upload ảnh, vì Upload Ảnh đang sử dụng Component riêng.

### 1.6. Phụ thuộc
Không.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- Modal hiển thị cuộn mượt mà, layout chuyên nghiệp hơn. Save dữ liệu thành công.

### 1.8. Kết quả mong đợi
Trải nghiệm UX Edit Profile nâng cao rõ rệt, không còn giống một cái Form quản trị admin đơn giản nữa.
