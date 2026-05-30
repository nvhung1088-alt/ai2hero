# WORKFLOW: AI2HERO START
> **Kích hoạt**: Khi admin gõ `ai2hero start` hoặc `a2h start`
> **Model**: Gemini 3.5 Flash (hoặc model đang chạy hiện hành)
> **Mục đích**: Tự động hóa quá trình khởi động session mới, kiểm tra sức khỏe hệ thống, kiểm toán chi phí/context, báo cáo các phiên bản template hiện hành và đề xuất bước làm việc tiếp theo.

---

## TRIGGER
Khi nhận được lệnh `ai2hero start` hoặc `a2h start`, AI tự động thực hiện 6 bước kiểm tra và kết xuất báo cáo:

---

## BƯỚC 1: QUÉT HỆ THỐNG VÀ HEALTH CHECK

1. **Đọc START.md**: Xác định trạng thái Phase hiện tại, các quyết định lớn đã chốt và danh sách các file trong hệ thống.
2. **Kiểm tra trạng thái Dev Server**: Gửi yêu cầu HTTP Ping tới `http://localhost:3000` (Next.js dev server) để xác định trạng thái Online / Offline.
3. **Quét các File Plan dở dang**: Tìm kiếm trong thư mục gốc các file có tiền tố `PLAN_*.md` để xác định xem có kế hoạch nào đang chờ thực thi hay không.

---

## BƯỚC 2: KIỂM TOÁN PHIÊN BẢN TEMPLATE (PHIÊN TEMPLATE)

1. **Đọc mục ## PHIEN TEMPLATE** trong `START.md`.
2. **Liệt kê danh sách các file template** cốt lõi kèm theo ngày cập nhật và mô tả ngắn gọn.
3. **Đánh giá tính đồng bộ**: Đảm bảo tất cả các file đều đang hoạt động ổn định và có phiên bản khớp với nguồn sự thật.

---

## BƯỚC 3: CONTEXT & COST CHECK (KIỂM TOÁN LƯỢT TRAO ĐỔI)

1. **Đọc tệp log transcript vật lý**: Truy cập đường dẫn `<appDataDir>\brain\<conversation-id>\.system_generated\logs\transcript.jsonl`.
2. **Đếm số lượt tương tác**: Đếm chính xác số lượng dòng chứa `"type":"USER_INPUT"`.
3. **Tính toán chi phí**: Dựa trên số lượt trao đổi, tính token ước tính và chi phí tích lũy (VNĐ).
4. **Cảnh báo Context**: Nếu vượt mốc 15, 20, 25, 30... → kích hoạt banner cảnh báo.

---

## BƯỚC 4: CHIẾT XUẤT ĐỀ XUẤT VIỆC LÀM TIẾP THEO

1. **Đọc MASTER_PLAN.md** (nếu có): Xác định các sprint và đầu việc chưa hoàn thiện.
2. **Phân tích độ ưu tiên**: Trích xuất các task ưu tiên cao nhất.
3. **Đề xuất Sprint tối ưu**: Khuyên dùng Sprint kế tiếp kèm phân bổ model AI tối ưu.

---

## BƯỚC 5: KẾT XUẤT BÁO CÁO START

AI xuất báo cáo khởi động:
- **Header**: Tiêu đề, trạng thái session.
- **Section 1: Health Monitor**: Dev server status, Active Plan.
- **Section 2: Phiên Template**: Bảng thống kê các file template lõi.
- **Section 3: Đề xuất Sprint**: Danh sách 3-4 đầu việc ưu tiên, kèm phân vai model.
- **Section 4: Context & Budget Audit**: Lượt trao đổi, Token, Chi phí VNĐ.

---

## BƯỚC 6: ĐỀ XUẤT 3 LỰA CHỌN NHANH

Bắt buộc kết thúc báo cáo bằng **3 lựa chọn đánh số**:
1. **Lựa chọn 1**: Bắt đầu viết Plan cho Sprint đề xuất tiếp theo.
2. **Lựa chọn 2**: Thực hiện Health check / kiểm tra hệ thống.
3. **Lựa chọn 3**: Nhập chỉ thị tùy chỉnh khác.
