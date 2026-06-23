# PLAN: Nâng cấp Giao diện Trang Cá Nhân theo chuẩn Facebook
> Ngày tạo: 2026-06-09
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 2
> Ước tính: 15 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Sao chép cấu trúc layout của Facebook Profile sang trang cá nhân Ai2Hero. Bao gồm: tinh chỉnh lại Header, bổ sung thanh Tabs chuẩn Facebook, và chuyển đổi layout hiển thị Bài viết/Giới thiệu sang dạng Grid 2 cột (Cột trái: Thông tin cá nhân, Cột phải: Đăng bài & Feed).

## BỐI CẢNH KIẾN TRÚC
- Trang cá nhân đang nằm ở module `app/(social)/(main)/profile/`.
- Bao gồm 2 file chính là `profile-header.tsx` và `profile-tabs.tsx`.
- Giao diện cũ là 1 cột. Giao diện mới là 2 cột (chỉ áp dụng ở Desktop, màn Mobile vẫn cuộn dọc xếp chồng).

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: Logic xử lý file upload, Server Actions (`updateAvatarAction`, `updateCoverAction`, `toggleFeedLikeAction`, `addFeedCommentAction`, v.v.).
- KHÔNG đổi tên: Các biến props của Component như `currentUser`, `targetUser`, `profile`, `initialPosts`, `isOwnProfile`.
- CSS: Tiếp tục dùng Tailwind, Dark Mode. Không được phá vỡ padding gốc của Layout tổng.
- Data: Sử dụng data nội bộ truyền vào.

## LESSONS CẦN NHỚ
- `3.4`: Lệch CSS sidebar giữa các module gây nhảy layout. (Lưu ý grid gap và padding).
- `3.8`: Tranh chấp z-index.
- `10.1`: Thiếu Empty state cho UI động.
- `4.38`: Lỗi rò rỉ thông tin (Information Leakage). (Không được render info nếu người dùng không công khai, nhưng ở đây dùng data mockup trước).

---

## TASK 1: Cập nhật Profile Header và Thêm Box Gợi ý bạn bè

### 1.1. Mô tả
Cải tiến `profile-header.tsx` để hiển thị Action Buttons chuẩn phong cách Facebook, thêm các Tab Navigation ở dưới, và nhúng component `SuggestedFriendsBox` vào chân Header.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(social)/(main)/profile/profile-header.tsx` | MODIFY | ~40 dòng |

### 1.3. Code Snapshot tại điểm sửa
```tsx
        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-center md:justify-end">
          {isOwnProfile ? (
            <Button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold text-xs rounded-xl px-4 py-2"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Chỉnh sửa hồ sơ
            </Button>
          ) : (
```
Và phần kết thúc `ProfileHeader`:
```tsx
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={targetProfile}
        />
      )}
    </div>
  );
}
```

### 1.4. Thay đổi cần thực hiện
1. Import `SuggestedFriendsBox` từ `@/components/suggested-friends-box`.
2. Thay đổi nút "Chỉnh sửa hồ sơ" sang nút "Thêm vào tin" (Màu xanh chủ đạo `bg-pink-500` hoặc Hero primary) và nút "Chỉnh sửa trang cá nhân" (màu xám `bg-white/10`).
3. Dưới cùng của Component `ProfileHeader` (ngay trước thẻ đóng `</div>` cha), chèn thêm `SuggestedFriendsBox` (có bọc margin-top `mt-6 border-t border-white/5 pt-4` để tạo vách ngăn cách).

### 1.5. Vùng CẤM (trong task này)
- KHÔNG ĐỤNG vào logic `handleFileChange` và state `uploadingAvatar`/`uploadingCover`.

### 1.6. Phụ thuộc
Không phụ thuộc. Làm đầu tiên.

### 1.7. Verification (Cách kiểm tra đúng/sai)
Mở trang cá nhân sẽ thấy có Box gợi ý bạn bè và các nút Action mới.

### 1.8. Kết quả mong đợi
Header chuẩn hơn, có Box cuộn ngang gợi ý kết bạn.

---

## TASK 2: Chuyển đổi Profile Tabs sang Layout 2 Cột (Facebook Layout)

### 2.1. Mô tả
Tái cấu trúc `profile-tabs.tsx` để sử dụng Layout Grid 2 cột khi ở Tab "Bài viết". Di chuyển nội dung "Giới thiệu" (About) sang làm Sidebar Cột trái. Cột phải hiển thị khung tạo bài viết và danh sách Feed.

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(social)/(main)/profile/profile-tabs.tsx` | MODIFY | ~100 dòng |

### 2.3. Code Snapshot tại điểm sửa
```tsx
      {/* Tab Contents */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {isOwnProfile && (
            <FeedPostCreator
              user={currentUser}
```
Và:
```tsx
      {activeTab === 'about' && (
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

### 2.4. Thay đổi cần thực hiện
1. Sửa khối render `{activeTab === 'posts' && ...}` thành một layout cha dạng `grid grid-cols-1 lg:grid-cols-12 gap-6`.
2. **Cột trái (`lg:col-span-5` hoặc `lg:col-span-4`)**: Đưa phần nội dung hiển thị "Thông tin cá nhân" và "Tiểu sử" (đang nằm trong `activeTab === 'about'`) vào đây. Xóa bỏ lớp bọc `grid-cols-2` bên trong, chuyển về xếp dọc `flex-col` và `space-y-4`. Thêm một mock Box "Ảnh" và Box "Bạn bè" (Grid 3x3) với các khối màu xám placeholder để UI nhìn đủ chân thực.
3. **Cột phải (`lg:col-span-7` hoặc `lg:col-span-8`)**: Giữ nguyên `FeedPostCreator` và danh sách `feedPosts` vào đây.
4. Xóa phần code `activeTab === 'about'` riêng biệt ở dưới vì toàn bộ thông tin đã được tích hợp vào Cột Trái của màn hình Bài viết. 

### 2.5. Vùng CẤM (trong task này)
- KHÔNG ĐỤNG vào các hàm `handleLike`, `handleCommentAdded`, `handlePinToggle`, `handleTaskStatusChange`.

### 2.6. Phụ thuộc
Task 1 (có thể thực hiện song song).

### 2.7. Verification (Cách kiểm tra đúng/sai)
Giao diện sẽ chia làm 2 cột rõ rệt trên Desktop, cột trái hiển thị thông tin About, cột phải hiển thị Feed. Mobile sẽ xếp chồng cột trái lên trên cột phải.

### 2.8. Kết quả mong đợi
Layout đạt chuẩn Facebook 2 cột 35/65, thông tin cá nhân hiển thị trực quan ở mọi trang bài đăng.

---

## THỨ TỰ THỰC HIỆN
Task 1 -> Task 2

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Thêm "Nâng cấp giao diện Profile chuẩn Facebook (2 cột)" vào phần Social Hero MVP.
- Cập nhật UI_MAP.md: Ghi nhận layout 2 cột ở Profile page.
- Cập nhật LESSONS.md: Nếu có lỗi về Grid CSS.
