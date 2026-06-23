# 3D hoạt hình kết xuất đạo cụ đô thị trạng thái phát sinh · Sổ tay quy tắc

---

## Một, Nguyên tắc phát sinh

1. **Định hình chốt** — Hình dáng/lược đồ cốt lõi của đạo cụ có thể nhận diện trong tất cả các trạng thái
2. **Trạng thái dễ đọc** — Sự khác biệt trạng thái phải rõ ràng, khán giả có thể nhận ra ngay lập tức
3. **Phục vụ tường thuật** — Mỗi biến thể trạng thái phục vụ cho các điểm nút của cốt truyện
4. **Thoái hóa dần** — Trạng thái tổn hại/lão hóa phải có logic vật lý hợp lý (trình bày cel-shaded)
5. **Trưng bày độc lập đạo cụ thuần túy** — Trong hình ảnh chỉ có thể xuất hiện đạo cụ, nghiêm cấm xuất hiện bất cứ nhân vật, tay, chi, đạo cụ không thể ở trạng thái được giữ/đeo/nắm, phải trình bày độc lập dưới dạng tĩnh vật

---

## Hai, Loại trạng thái

### 2.1 Trạng thái sử dụng

| Trạng thái | Mô tả | Đạo cụ áp dụng | Từ gợi ý |
|---|---|---|---|
| Mới tinh | Không hư hại, sáng bóng như mới | Tất cả đạo cụ | Mới tinh, không hư hại, sáng bóng như mới |
| Sử dụng hàng ngày | Trầy xước nhẹ, dấu sử dụng tự nhiên (trình bày cel-shaded) | Tất cả đạo cụ | Dấu vết sử dụng hàng ngày, trầy xước nhẹ |
| Cũ kỹ | Cảm giác đã sử dụng rõ ràng, màu sắc tối (trình bày cel-shaded) | Dụng cụ/phụ kiện/điện tử | Dấu vết sử dụng, cảm giác thời gian, màu sắc tối |

### 2.2 Trạng thái tổn hại

| Trạng thái | Mô tả | Đạo cụ áp dụng | Từ gợi ý |
|---|---|---|---|
| Hư hại nhẹ | Vết nứt nhỏ/khe nhỏ/trầy xước nhẹ (trình bày cel-shaded) | Kính/gốm/thiết bị điện tử | Vết nứt nhỏ, khe nhỏ nhẹ |
| Hư hại nặng | Vết nứt rõ ràng/gãy/vỡ (trình bày cel-shaded) | Kính/gốm/thiết bị điện tử | Vết nứt rõ ràng, vỡ, gãy |
| Mảnh vỡ | Chỉ còn lại phần/mảnh vỡ (trình bày cel-shaded) | Kính/gốm/thiết bị điện tử | Mảnh vỡ, chỉ còn lại một nửa |

### 2.3 Trạng thái đặc biệt

| Trạng thái | Mô tả | Đạo cụ áp dụng | Từ gợi ý |
|---|---|---|---|
| Sạc/làm việc | Màn hình sáng/đèn báo (trình bày cel-shaded) | Thiết bị điện tử | Màn hình sáng, đèn báo làm việc |
| Bị ngấm nước/ẩm ướt | Vết nước, phản xạ ẩm ướt (trình bày cel-shaded) | Thiết bị điện tử/giấy | Bị ngấm nước, bề mặt ẩm ướt, phản xạ |
| Màn hình hư hại | Vết nứt màn hình/hiển thị bất thường | Thiết bị điện tử | Vết nứt màn hình, hiển thị bất thường |
| Hết pin | Đèn báo tắt/biểu tượng pin | Thiết bị điện tử | Hết pin, đèn báo tắt |
| Lưu trữ/mang theo | Túi lưu trữ/hộp lưu trữ | Phụ kiện/thiết bị điện tử | Túi lưu trữ, hộp lưu trữ |

---

## Ba, Quy chuẩn hình ảnh biến thể trạng thái

### Hình trạng thái đơn

| Hạng mục | Quy chuẩn |
|---|---|
| Nền | Xám trung tính sạch #E8E8E8 (giống với hình thiết lập) |
| Ánh sáng | Chiếu sáng đều, không có bóng cứng |
| Góc độ | Giống với góc độ mặt trước của hình thiết lập ban đầu |
| Tỷ lệ | Đạo cụ chiếm phần lớn hình ảnh 70%+ |

### Hình so sánh trạng thái

| Hạng mục | Quy chuẩn |
|---|---|
| Bố cục | Hiển thị cùng một hình 2-3 trạng thái |
| Ghi chú | Ghi chú tên trạng thái dưới mỗi trạng thái |
| Sự nhất quán | Góc độ/ánh sáng/nền hoàn toàn nhất quán, chỉ khác trạng thái |

---

## Bốn, Quy tắc thay đổi trạng thái chất liệu

| Chất liệu | Mới tinh → Hàng ngày | Hàng ngày → Cũ kỹ | Biểu hiện tổn hại (trình bày cel-shaded) |
|---|---|---|---|
| Kim loại | Sáng bóng → Trầy xước nhẹ | Trầy xước → Màu sắc tối | Khe nhỏ/gãy/bể (xử lý cel-shaded) |
| Kính | Trong suốt → Trầy xước nhẹ | Trầy xước → Bề mặt trầy xước | Vết nứt/vỡ/khe nhỏ (xử lý cel-shaded) |
| Nhựa | Mịn → Trầy xước nhẹ | Trầy xước → Màu sắc tối | Nứt/gãy/trầy xước (xử lý cel-shaded) |
| Da | Mịn → Nếp nhăn tự nhiên | Nếp nhăn → Màu sắc tối | Trầy xước/vết nứt/phai màu (xử lý cel-shaded) |
| Giấy | Phẳng → Nếp nhăn nhẹ | Nếp nhăn → Ố vàng | Rách/trầy xước/mực lan (xử lý cel-shaded) |

---

## Năm, Mẫu từ gợi ý

### Biến thể trạng thái đơn

```
Dựa trên hình thiết lập {tên đạo cụ}, kết xuất hoạt hình 3D, ánh sáng cấp điện ảnh, chất liệu cel-shaded sống động, chất liệu chi tiết cao, bầu không khí chữa lành dễ chịu, phong cách đô thị hoạt hình, chất liệu hoạt hình chi tiết cao, tỷ lệ hoạt hình vừa phải, phối màu tông ấm, 8K siêu HD, bố cục cấp điện ảnh, lớp ánh sáng bóng mềm, phong cách kết xuất hoạt hình sáng sủa, ấm áp chữa lành,
anime style, cel-shaded, 3D animation render,
{loại đạo cụ}, {mô tả chất liệu},
Trạng thái hiện tại: {tên trạng thái}, {mô tả hình ảnh trạng thái},
{mô tả thay đổi bề mặt chất liệu} (xử lý cel-shaded)
Trình bày tĩnh vật đạo cụ thuần túy, đạo cụ trưng bày độc lập, không ai giữ, không ai đeo,
Cùng một hình bốn ô (2×2): góc nhìn chính diện trên trái+góc nhìn bên trên phải+góc nhìn phía sau dưới trái+cận cảnh chi tiết dưới phải,
Nền xám trung tính sạch, ánh sáng mềm đều, không có bóng cứng,
Kết cấu chất liệu rõ nét, kết xuất cel-shaded, chi tiết trạng thái rõ ràng, xử lý cel-shaded,
8K siêu HD, bố cục cấp điện ảnh,
Không có bất kỳ chữ nào trong hình,
Không có bất kỳ nhân vật, tay, ngón tay, chi, đạo cụ không thể ở trạng thái được nắm hoặc đeo
```

---

## Sáu, Quy tắc ràng buộc

### Phải tuân thủ

| Số | Quy tắc |
|---|---|
| R1 | Hình dáng/lược đồ cốt lõi của đạo cụ có thể nhận diện trong tất cả các trạng thái |
| R2 | Thay đổi trạng thái phải tuân theo logic vật lý (trình bày cel-shaded) |
| R3 | Phải sử dụng bố cục bốn ô (2×2): góc nhìn chính diện trên trái+góc nhìn bên trên phải+góc nhìn phía sau dưới trái+cận cảnh chi tiết dưới phải |
| R4 | Phải quy định "nền xám trung tính sạch", ánh sáng mềm đều, không có bóng cứng |
| R5 | Phải bao gồm từ khóa kết xuất hoạt hình 3D (cel-shaded, 3D animation render, anime style) |
| R6 | Phải bao gồm từ khóa 8K siêu HD, bố cục cấp điện ảnh |

### Nghiêm cấm

| Số | Nghiêm cấm |
|---|---|
| X1 | Thay đổi trạng thái sau không thể nhận diện đạo cụ |
| X2 | Tổn hại vi phạm logic vật lý (sản phẩm điện tử bị rỉ sét, v.v.) |
| X3 | Miêu tả tổn hại quá đẫm máu/kinh dị (trong phạm vi cel-shaded) |
| X4 | Xuất hiện bất kỳ hình ảnh nhân vật nào, bao gồm toàn thân, nửa thân, một phần (tay, ngón tay, cánh tay, v.v.) |
| X5 | Đạo cụ ở trạng thái được giữ, nắm, đeo, sử dụng |
| X6 | Xuất hiện các yếu tố ngụ ý sự tồn tại của nhân vật (như dấu tay cầm, góc nhìn đeo, tư thế sử dụng) |
| X7 | Sử dụng thuật ngữ nhiếp ảnh thực tế (như real photography, photorealistic, RAW photo, v.v.) |
| X8 | Kết cấu tổn hại quá thực, phá vỡ sự nhất quán phong cách cel-shaded |
| X9 | Yếu tố cổ đại/tương lai, không phong cách đô thị hiện đại |