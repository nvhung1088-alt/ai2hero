# WORKFLOW: AI2HERO PLAN
> **Kích hoạt**: Khi admin gõ `ai2hero plan` hoặc `viết plan ai2hero`
> **Model**: Claude Opus (hoặc model tư duy mạnh nhất đang chọn trên UI)
> **Mục đích**: Viết Plan chi tiết cho Gemini Flash thực thi tự động

---

## TRIGGER
Khi nhận được lệnh `ai2hero plan`, AI thực hiện các bước sau THEO THỨ TỰ:

---

## BƯỚC 1: THU THẬP THÔNG TIN

1. **Đọc START.md** — Nắm trạng thái dự án, quyết định đã chốt
2. **Đọc UI_MAP.md** — Nắm kiến trúc giao diện, data flow
3. **Đọc LESSONS.md** (INDEX only) — Tìm bài học liên quan
4. **Đọc PLAN_TEMPLATE.md** — Nắm format chuẩn
5. **Hỏi admin** (nếu chưa nêu rõ trong lệnh):
   ```
   📋 AI2HERO PLAN — Cần thông tin:
   1. Bạn muốn làm gì? (mô tả ngắn)
   2. Module/trang nào liên quan?
   3. Có ưu tiên đặc biệt gì không?
   ```

---

## BƯỚC 2: AUDIT CÁC FILE LIÊN QUAN

1. **Quét file code** liên quan đến yêu cầu:
   - `view_file` các file cần sửa
   - `grep_search` tìm hàm, biến, call sites
2. **Ghi chép**:
   - Tên hàm chính xác + dòng số
   - Cấu trúc code hiện tại (snapshot 5-10 dòng tại mỗi điểm sửa)
   - Danh sách call sites
   - Vùng cấm (hàm/biến đang chạy tốt, KHÔNG được đụng)

---

## BƯỚC 3: VIẾT PLAN THEO TEMPLATE

Viết plan tuân thủ 100% format trong `PLAN_TEMPLATE.md`. Checklist:

### Mỗi Task PHẢI có đủ 8 mục:
- [ ] `1.1` Mô tả — Task này làm gì, tại sao
- [ ] `1.2` Files cần sửa — Đường dẫn + hành động (MODIFY/NEW/DELETE)
- [ ] `1.3` Code Snapshot — 5-10 dòng code THẬT tại điểm sửa (copy từ Bước 2)
- [ ] `1.4` Thay đổi cần thực hiện — Cụ thể: thêm gì, sửa gì thành gì
- [ ] `1.5` Vùng CẤM — Hàm/biến không được đụng trong task này
- [ ] `1.6` Phụ thuộc — Task nào phải làm trước
- [ ] `1.7` Verification — Flash tự kiểm tra bằng cách nào
- [ ] `1.8` Kết quả mong đợi — Trạng thái sau khi task xong

### Ràng buộc:
- **TỐI ĐA 5 TASKS / PLAN** — Nếu sprint có > 5 tasks → tách thành nhiều plan
- Mỗi task ≤ 2 file, ≤ 200 dòng thay đổi
- Code Snapshot PHẢI copy từ file thật, KHÔNG viết từ trí nhớ

---

## BƯỚC 4: LƯU FILE PLAN

1. Lưu plan vào thư mục gốc: `PLAN_[TÊN_NGẮN].md`
2. Nếu đã có file plan cùng tên → hỏi admin trước khi ghi đè

---

## BƯỚC 5: QUALITY GATE — TỰ KIỂM TRA

```
📋 QUALITY GATE — PLAN SELF-CHECK:
- [ ] Mỗi task có đủ 8 mục?
- [ ] Code Snapshot lấy từ file thật?
- [ ] Vùng CẤM đầy đủ?
- [ ] Thứ tự dependency rõ ràng?
- [ ] Mỗi task ≤ 2 file, ≤ 200 dòng?
- [ ] LESSONS liên quan đã liệt kê?
- [ ] Verification tự kiểm tra được?
```

---

## BƯỚC 6: BÁO CÁO CHO ADMIN

```
══════════════════════════════════════
✅ AI2HERO PLAN — HOÀN TẤT
══════════════════════════════════════

📄 File Plan: PLAN_[TÊN].md
📌 Số tasks: N
📌 Thứ tự: Task 1 → Task 2 → ...
📌 Files ảnh hưởng: [danh sách]
📌 LESSONS áp dụng: [mã]

🎯 Bước tiếp:
1. Review Plan → chỉnh sửa nếu cần
2. Đổi sang Gemini 3.5 Flash
3. Gõ: ai2hero code PLAN_[TÊN].md
══════════════════════════════════════
```
