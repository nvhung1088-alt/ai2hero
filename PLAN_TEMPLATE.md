# PLAN TEMPLATE — Chuẩn cho Opus viết Plan
> AI Opus: ĐỌC FILE NÀY TRƯỚC khi viết bất kỳ Plan nào.
> Mục đích: Tạo bản Plan đủ chi tiết để Gemini Flash 3.5 có thể tự động thực thi 100% mà không cần hỏi lại.

---

## NGUYÊN TẮC VIẾT PLAN

### 1. Plan phải TỰ CHỨA (Self-contained)
- Flash đọc PLAN là hiểu hết — không cần đọc thêm file nào khác để bắt đầu.
- Mọi thông tin cần thiết (tên hàm, dòng code, vùng cấm) phải nằm trong Plan.

### 2. Mỗi Task phải có đủ 8 MỤC BẮT BUỘC
- Thiếu 1 mục = Flash không đủ thông tin → dễ code sai → lỗi domino.

### 3. Ghi thứ tự Task theo dependency
- Task phụ thuộc nhau → ghi rõ "Task 3 phải làm SAU Task 1".
- Task độc lập → ghi rõ "Có thể làm song song với Task X".

### 4. Giới hạn mỗi Task
- Tối đa 1-2 file thay đổi
- Tối đa ~200 dòng code thay đổi
- Nếu lớn hơn → tách thành 2 task

---

## FORMAT PLAN

```markdown
# [TÊN PLAN]
> Ngày tạo: [ngày]
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: [N]
> Ước tính: [X phút cho Flash thực thi]

## MỤC TIÊU TỔNG
[1-3 câu mô tả mục tiêu cuối cùng của plan này]

## BỐI CẢNH KIẾN TRÚC
[Mô tả ngắn về module nào liên quan, data flow giữa chúng]
[Tham chiếu đến UI_MAP.md nếu cần]

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: [danh sách file/hàm cấm đụng xuyên suốt plan]
- KHÔNG đổi tên: [danh sách biến/hàm đang chạy tốt]
- CSS: [conventions]
- Data: [nguồn sự thật data là file nào]

## LESSONS CẦN NHỚ
[Liệt kê mã lesson liên quan từ LESSONS.md]

---

## TASK 1: [Tên task ngắn gọn]

### 1.1. Mô tả
[Task này làm gì, tại sao cần làm]

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `path/to/file` | MODIFY/NEW/DELETE | ~X dòng |

### 1.3. Code Snapshot tại điểm sửa
[Trích 5-10 dòng code CHÍNH XÁC tại vị trí cần sửa]

### 1.4. Thay đổi cần thực hiện
[Mô tả CỤ THỂ code cần thêm/sửa/xóa]

### 1.5. Vùng CẤM (trong task này)
[Hàm/biến KHÔNG được đụng]

### 1.6. Phụ thuộc
[Task nào phải làm trước]

### 1.7. Verification (Cách kiểm tra đúng/sai)
[Flash tự verify sau khi code]

### 1.8. Kết quả mong đợi
[Trạng thái SAU khi task hoàn thành]

---

## THỨ TỰ THỰC HIỆN
[Sơ đồ dependency]

## SAU KHI HOÀN TẤT
- Cập nhật START.md: [ghi gì]
- Cập nhật UI_MAP.md: [nếu UI thay đổi]
- Cập nhật LESSONS.md: [nếu phát hiện pattern mới]
```

---

## CHECKLIST QUALITY GATE

- [ ] Mỗi task có đủ 8 mục (1.1 → 1.8)?
- [ ] Mỗi task có CODE SNAPSHOT chính xác?
- [ ] Vùng CẤM đã liệt kê đầy đủ?
- [ ] Thứ tự dependency rõ ràng?
- [ ] Mỗi task ≤ 2 file, ≤ 200 dòng thay đổi?
- [ ] LESSONS liên quan đã liệt kê?
- [ ] Verification có thể tự động kiểm tra?
