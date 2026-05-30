# WORKFLOW: AI2HERO CLOSE
> **Kích hoạt**: Khi admin gõ `ai2hero close` hoặc `a2h close`
> **Model**: Gemini 3.5 Flash (hoặc model đang chạy hiện hành)
> **Mục đích**: Tự động hóa quá trình kết thúc session, đồng bộ nguồn sự thật và chấm điểm kỷ luật.

---

## TRIGGER
Khi nhận được lệnh `ai2hero close` hoặc `a2h close`, AI tự động thực hiện 8 bước:

---

## BƯỚC 0: KIỂM TRA MODEL VÀ CHI PHÍ
1. Xác định Model hiện tại — khuyên đổi sang Flash nếu đang dùng model đắt.
2. Ước tính Token & Chi phí quy VNĐ.

---

## BƯỚC 1: TÓM TẮT SESSION
1. Liệt kê tối đa 10 dòng các file đã thêm/sửa/xóa và quyết định lớn.

---

## BƯỚC 2: CẬP NHẬT START.md
1. Ghi tóm tắt công việc vào **Tiến độ gần nhất** kèm ngày tháng.
2. Đề xuất task ưu tiên tiếp theo kèm phân bổ model AI.
3. Thêm quyết định mới (nếu có).

---

## BƯỚC 3: CẬP NHẬT UI_MAP.md
1. Nếu UI thay đổi: Thêm/sửa module, ghi đủ 4 mục bắt buộc.

---

## BƯỚC 3B: CẬP NHẬT PHIÊN TEMPLATE
1. Nếu có sửa đổi file template → cập nhật ngày và nội dung trong `## PHIEN TEMPLATE`.

---

## BƯỚC 4: GHI CHANGELOG.md
1. Thêm entry mới vào đầu file gồm: Ngày, Tiêu đề, Files thêm/cập nhật, Lỗi chưa fix.

---

## BƯỚC 5: ĐỀ XUẤT ARCHIVE & CẬP NHẬT MASTER PLAN
1. Đề xuất chuyển file plan cũ vào `_archive/`.
2. Cập nhật MASTER_PLAN.md (nếu có).

---

## BƯỚC 6: REVIEW BÀI HỌC (LESSONS.md)
1. Phát hiện lỗi/pattern hay → đề xuất lưu vào `C:\Users\ADMIN\.gemini\LESSONS.md`.

---

## BƯỚC 6B: WORKFLOW COMPLIANCE AUDIT
1. Chấm điểm kỷ luật 8 checkpoint.
2. Xuất bảng điểm (X/8).

---

## BƯỚC 7: KẾT THÚC VÀ ĐỀ XUẤT
1. **3 lựa chọn nhanh**:
   - 1: Mở chat mới → `a2h start`
   - 2: Tiếp tục phiên hiện tại
   - 3: Nhập chỉ thị khác
