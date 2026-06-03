# Pancake POS API V1 - Knowledge Base

## Tổng quan
Tài liệu này lưu trữ các phân tích kỹ thuật và hiểu biết về Pancake POS API V1 được trích xuất từ `openapi.json` nhằm phục vụ cho hệ thống `Ai2Hero Connect Hub`. 
Tránh phải fetch lại hoặc đọc dữ liệu thô nhiều lần.

## Capabilities (Những gì Ai2Hero có thể khai thác được từ API)

Qua việc phân tích `openapi.json`, API của Pancake khá đồ sộ, có khả năng quản lý toàn diện luồng nghiệp vụ. Ai2Hero có thể tích hợp các Module sau:

1. **Quản lý Cửa hàng & Facebook Page (`GET /shops`)**
   - Lấy danh sách các trang Facebook (Pages) đang liên kết với Shop.
   - Hỗ trợ xây dựng luồng Auto-create orders (Tự động tạo đơn từ Chat).

2. **Quản lý Đơn hàng (Orders)**
   - API `GET /shops/{SHOP_ID}/orders` là xương sống.
   - **Bộ lọc mạnh mẽ:** Cho phép lọc đơn hàng bằng các tham số `startDateTime` và `endDateTime` dưới định dạng **Unix Timestamp (seconds)** kết hợp `updateStatus` (ví dụ `updateStatus=inserted_at`). (Rất quan trọng, không dùng format `YYYY-MM-DD`).
   - Hỗ trợ tìm kiếm bằng SĐT, tên khách hàng (`search`), trạng thái đơn (`filter_status`).
   - **Thống kê:** Khi gọi danh sách đơn, Pancake trả kèm khối `aggs` chứa các thống kê quan trọng (Doanh thu `totalRevenue`, COD `cod`, Prepaid `prepaid`, Phí ship `shippingFee`, v.v.). Đây chính là dữ liệu để vẽ **Dashboard** mà không cần lấy chi tiết từng đơn.

3. **Kho hàng & Lịch sử tồn kho (Warehouses & Inventory)**
   - `GET /shops/{SHOP_ID}/warehouses`: Quản lý, thêm, sửa kho hàng (có hỗ trợ địa chỉ, hàng kệ).
   - `GET /shops/{SHOP_ID}/inventory_histories`: Xem lịch sử biến động kho (Import / Export). Hữu dụng cho các tính năng "Báo cáo tồn kho", "Cảnh báo hết hàng" của hệ thống quản lý.

4. **Dữ liệu Địa lý (Geography)**
   - `GET /geo/provinces`, `/geo/districts`, `/geo/communes`: Lấy danh sách hành chính Việt Nam (rất cần thiết để chuẩn hóa địa chỉ khách hàng trước khi đẩy cho bên Vận chuyển - Shipping Partner).

5. **Sản phẩm (Products / Variations)**
   - API cho phép lấy mã SKU (`variation_id`), `retail_price`, khối lượng `weight` từ danh sách Order. Rất hữu ích khi phân tích nhóm Hàng bán chạy (Best Sellers).

## Bài học kỹ thuật (Lessons Learned)
- **Time Filtering (Vấn đề lớn nhất từng gặp):** Endpoint `/orders` của Pancake không xử lý String Date (như `inserted_at_min=2026-06-02`). Khi truy vấn dữ liệu báo cáo, bắt buộc phải đổi Start/End Date thành `Unix Epoch Seconds` và truyền vào `startDateTime` & `endDateTime`, đi kèm param `updateStatus`. Nếu sai cú pháp, hệ thống sẽ trả về doanh số của **TOÀN THỜI GIAN** lịch sử thay vì báo lỗi.
- **Aggregations:** Thay vì viết hàm lặp (Loop) qua từng trang dữ liệu để tính tổng doanh thu, chỉ cần lấy Object `aggs` trả về ở Wrapper JSON ngoài cùng là có toàn bộ Dashboard báo cáo theo ngày. Rất tiết kiệm tài nguyên hệ thống.
- **Cấu trúc JSON Schema:** Tên biến thể (Products) luôn đi chung với ID trong `items` của 1 Đơn hàng. Nếu làm Mapping cần chú ý cấu trúc lồng nhau (Nested fields) của `items`.

## Hướng phát triển cho Ai2Hero trong tương lai
- **Báo cáo nâng cao:** Sử dụng `aggs.orderStatusBuckets` để tính toán chính xác "Tỷ lệ đơn hoàn", "Tỷ lệ giao thành công" cho tính năng Cảnh báo Đơn Hoàn/Bom Hàng.
- **Auto Mapping Địa chỉ:** Dùng `/geo/*` để tự động đối chiếu, gom địa chỉ Tỉnh/Thành về định dạng chuẩn của Shopee/TikTok/GHN nhằm đồng bộ Data Pipeline đa kênh.
