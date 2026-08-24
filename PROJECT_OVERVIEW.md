# 🚀 BÁO CÁO AUDIT CHI TIẾT & TỔNG HỢP DỰ ÁN DANG HÀNG TIẾT KIỆM (ĐHTK) & THỎ HỒNG

> **Ngày cập nhật**: 12/08/2026  
> **Trạng thái hệ thống**: ✅ Hoạt động ổn định trên Production Vercel  
> **Tên miền sản xuất**: 
> - Web 1: `https://www.donghangtietkiem.com` (Repo `DHTK`)
> - Web 2: `https://thohong.top` (Repo `thohong`)

---

## 📌 1. KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ

- **Backend**: Express.js (`server.js`) chạy trên Vercel Serverless Functions.
- **Frontend**: Single Page Application (SPA) thuần HTML5 + Vanilla JS + CSS3 (`public/index.html`).
- **Database**: Turso Cloud Database (LibSQL / SQLite) đồng bộ realtime.
- **Tích hợp bên ngoài**:
  - **Pancake POS**: Tự động đồng bộ tồn kho theo mã SKU sản phẩm.
  - **Telegram Bot**: Thông báo đơn hàng mới realtime qua Telegram.
  - **Imgur API**: Tải ảnh bài viết Blog & ảnh sản phẩm trực tiếp.

---

## 🔐 2. THÔNG TIN QUẢN TRỊ & CẤU HÌNH CƠ BẢN

| Thông tin | Giá trị mặc định / Cấu hình |
|---|---|
| **Tài khoản Admin** | `admin` |
| **Mật khẩu Admin** | `dhtk2024` (Đã băm SHA-256 mã hóa bảo mật) |
| **Hotline chính** | `0382003755` / `0968988636` |
| **Zalo chính** | `0382003755` / `0968988636` |
| **Địa chỉ kho hàng** | `33b ngõ 357 Tam Trinh, Tương Mai, Hà Nội` |
| **Giờ mở cửa** | `08:00 - 21:00 (Tất cả các ngày trong tuần)` |

---

## 🌐 3. HƯỚNG DẪN DEPLOY VERCEL CHO 2 WEBSITE (`DHTK` & `thohong`)

### 📦 Bước 1: Chuẩn bị 2 Repositories GitHub
Hệ thống duy trì 2 Repository song song:
1. `nvhung1088-alt/DHTK` -> Chạy cho `donghangtietkiem.com`
2. `nvhung1088-alt/thohong` -> Chạy cho `thohong.top`

Mọi thay đổi code trên `thohong/public/index.html` hoặc `server.js` đều được tự động đồng bộ sang `DHTK/public/index.html` trước khi `git push origin main`.

### ⚡ Bước 2: Thiết lập Vercel Projects
1. Đăng nhập vào [Vercel Dashboard](https://vercel.com).
2. Tạo **Project 1** (`dhtk-web`): Link với repo `nvhung1088-alt/DHTK`.
   - Domain: `donghangtietkiem.com` & `www.donghangtietkiem.com`
3. Tạo **Project 2** (`thohong-web`): Link với repo `nvhung1088-alt/thohong`.
   - Domain: `thohong.top`

### 🔑 Bước 3: Đặt Environment Variables trên Vercel
Cả 2 project đều cài đặt các biến môi trường sau trong **Project Settings -> Environment Variables**:
- `TURSO_DATABASE_URL`: URL kết nối Turso Database (VD: `libsql://dhtk-db-nvhung1088.turso.io`)
- `TURSO_AUTH_TOKEN`: Token xác thực Turso Database
- `JWT_SECRET`: Chuỗi bí mật mã hóa phiên đăng nhập Admin
- `TELEGRAM_BOT_TOKEN`: Token Bot gửi thông báo đơn hàng
- `TELEGRAM_CHAT_ID`: ID group / chat nhận thông báo đơn hàng
- `PANCAKE_API_KEY`: API key đồng bộ tồn kho Pancake POS

### ⚙️ Bước 4: Cấu hình `vercel.json` Chuyển Hướng SPA Route
Cả 2 repo đều chứa file `vercel.json` như sau để đảm bảo nạp đúng SPA HTML cho các đường dẫn sạch:
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "/api/sitemap" },
    { "source": "/dia-chi", "destination": "/public/index.html" },
    { "source": "/lien-he", "destination": "/public/index.html" },
    { "source": "/danh-muc/(.*)", "destination": "/public/index.html" },
    { "source": "/san-pham/(.*)", "destination": "/public/index.html" },
    { "source": "/blog", "destination": "/public/index.html" },
    { "source": "/blog/(.*)", "destination": "/public/index.html" },
    { "source": "/(.*)", "destination": "/public/index.html" }
  ]
}
```

---

## 🛠️ 4. TỔNG HỢP CÁC FIX QUAN TRỌNG VỪA HOÀN THÀNH

| Sự cố ban đầu | Nguyên nhân gốc rễ (Root Cause) | Giải pháp đã xử lý & Kiểm chứng |
|---|---|---|
| **Nút Zalo & Hotline bị ẩn/không bấm được** | Thẻ `<div id="adminPanelModal">` ở dòng 592 bị **thiếu 1 thẻ đóng `</div>`** ở dòng 1170. Trình duyệt ép toàn bộ phần phía dưới thành con của Modal ẩn (`display: none`) khiến kích thước nút bị ép về `0 x 0`. | Bổ sung thẻ `</div>` đóng chuẩn tại dòng 1170. Giải phóng `#floatingContact` đứng độc lập trực tiếp dưới `<body>`. Kiểm tra Node.js parser tag balance = 0. |
| **Crash JS khi load dữ liệu số** | `contact_hotline` và `contact_zalo` trả về dạng Số (Number) từ DB khiến `.startsWith()` ném `TypeError`. | Ép kiểu `String(...)` tuyệt đối an toàn cho tất cả thuộc tính trước khi xử lý chuỗi. |
| **Nút bị che sản phẩm trên Mobile** | Nhãn chữ *"Chat Zalo"* và *"Hotline"* chiếm diện tích lớn trên màn hình di động (< 768px). | Thêm `@media (max-width: 768px)` ẩn nhãn chữ `.fc-label { display: none !important; }`, thu nhỏ icon về `48px x 48px` góc màn hình. |
| **Đường dẫn SEO & Trang Liên Hệ** | Cần đường dẫn sạch `/dia-chi` và `/lien-he` cho nút bấm Header. | Thêm route rewrites trong `vercel.json`, cập nhật `navigateTo` SPA router & tạo view `#addressView` động nạp dữ liệu từ Admin. |

---

## 📋 5. NGUỒN SỰ THẬT & FILE TRONG DỰ ÁN

1. `START.md`: Nguồn sự thật quản lý trạng thái dự án, lưu trữ quyết định kỹ thuật & lịch sử chỉnh sửa.
2. `UI_MAP.md`: Sơ đồ giao diện, luồng dữ liệu giữa các module (Trang chủ, Chi tiết SP, Giỏ hàng, POS Sync, Blog, Trang Liên Hệ / Địa chỉ).
3. `public/index.html`: File Monolithic SPA duy nhất chứa toàn bộ HTML, CSS và Logic Frontend.
4. `server.js`: Express Backend API cung cấp các endpoints `/api/settings`, `/api/products`, `/api/login`, `/api/pos-sync`, `/api/sitemap`.

---

## 💡 6. HƯỚNG DẪN KHI MỞ CHAT MỚI
Khi sang chat mới, bạn chỉ cần gõ:
> *"Tôi muốn tiếp tục phát triển dự án ĐHTK & Thỏ Hồng. Hãy đọc `PROJECT_OVERVIEW.md` và `START.md` để nắm trạng thái dự án."*
AI sẽ lập tức đọc 2 file này và tiếp tục công việc mượt mà không bị lặp lại bất kỳ câu hỏi nào!
