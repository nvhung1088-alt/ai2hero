# art_character_3d.md
# Tạo Hình Dáng Cơ Bản Nhân Vật 3D Hoạt Hình · Sổ Tay Ràng Buộc

---

## I. Nguyên Tắc Hình Dáng Cơ Bản

1. **Khuôn mặt là linh hồn** — Ngũ quan là điểm neo duy nhất của nhân vật, render chi tiết cấp cao
2. **Lấy nhân vật làm gốc** — Trang phục cơ bản được quyết định bởi miêu tả nhân vật (thân phận/nghề nghiệp/giới tính/bối cảnh); trang phục đặc biệt sau đó là lớp bổ sung
3. **Bốn góc nhìn nhất quán** — Khuôn mặt/hình thể/kiểu tóc/trang phục cơ bản thống nhất cao độ qua các góc nhìn
4. **Ấm áp và chữa lành** — Trạng thái không trang điểm vẫn cần thể hiện khí chất nhân vật (vui tươi/nhẹ nhàng/năng động)

---

## II. Ràng Buộc Khuôn Mặt

> Không còn cố định các thông số đặc điểm ngũ quan, do miêu tả nhân vật (giới tính/tuổi tác/tính cách/khí chất) dẫn dắt AI tự do tạo ngũ quan, đảm bảo sự khác biệt về ngoại hình giữa các nhân vật.

### Yêu Cầu Chung

| Hạng mục | Ràng buộc |
|---|---|
| Ngũ quan | Tự nhiên suy diễn từ miêu tả nhân vật, không định trước hình dáng khuôn mặt/mắt/lông mày/mũi/môi |
| Tông màu nền | Render hoạt hình 3D, phối màu tông ấm, tỷ lệ hoạt hình, bầu không khí vui tươi chữa lành |
| Khí chất | Phải trích xuất từ miêu tả nhân vật các từ khóa khí chất tổng thể (như ấm áp/năng động/chữa lành/nắng), và viết vào từ khóa gợi ý |
| Biểu cảm | Biểu cảm trung tính, phù hợp với khí chất nhân vật |

---

## III. Ràng Buộc Cảm Giác Da

### Nữ

| Hạng mục | Ràng buộc | Từ khóa gợi ý |
|---|---|---|
| Màu da | Da trắng ấm, đều toàn thân, cảm giác trong suốt | Da trắng ấm, da đào, peach skin |
| Độ bóng | Da ánh sáng mềm mại, ánh sáng xuyên thấu, không mờ | Da ánh sáng mềm mại, inner glow, soft glow |
| Chất cảm | Mịn màng, render chất cảm | Da mịn màng, chất cảm |
| Lộ da | Mặt/cổ/xương quai xanh/tay | Đường nét vai cổ đẹp, da trắng ấm trong suốt |

### Nam

| Hạng mục | Ràng buộc | Từ khóa gợi ý |
|---|---|---|
| Màu da | Be ấm, cảm giác khỏe mạnh, đều toàn thân | Be ấm, da khỏe mạnh |
| Độ bóng | Ánh sáng mềm mại mát, ánh sáng tự nhiên | Da ánh sáng mềm mại, da trong sáng mát |
| Chất cảm | Sạch sẽ mịn màng, ánh sáng | Da mịn màng, mặt mát |

---

## IV. Ràng Buộc Hình Thể

### Nữ

| Hạng mục | Ràng buộc | Từ khóa gợi ý |
|---|---|---|
| Chiều cao | Do thiết lập nhân vật xác định, phạm vi mặc định 155-165cm | {Chiều cao}cm tall, {miêu tả chiều cao như: petite girl} |
| Tỷ lệ đầu-thân | Sáu đầu đến bảy đầu, tỷ lệ đầu-thân = Chiều cao ÷ Chiều dài đầu | 6-7 heads tall proportion, thân hình nhỏ nhắn |
| Chuyển đổi chiều cao | Chiều dài đầu = Chiều cao ÷ Tỷ lệ đầu-thân (như 160cm ÷ 6.5 = 24.6cm chiều dài đầu) | Tỷ lệ dễ thương, tỷ lệ đầu-thân hài hòa |
| Vai cổ | Vai cổ mềm mượt, đường nét mượt mà | Đường nét vai mềm mượt, cổ đẹp |
| Tay | Nhỏ nhắn tròn trịa, khớp tay mềm mại | Tay nhỏ tròn, khớp tay rõ ràng |
| Tư thế | Thiếu nữ năng động, tư thế nhẹ nhàng | Tư thế nhẹ nhàng, dáng điệu linh hoạt |

### Nam

| Hạng mục | Ràng buộc | Từ khóa gợi ý |
|---|---|---|
| Chiều cao | Do thiết lập nhân vật xác định, phạm vi mặc định 170-180cm | {Chiều cao}cm tall, {miêu tả chiều cao như: tall cute boy} |
| Tỷ lệ đầu-thân | Sáu đầu rưỡi đến bảy đầu rưỡi, tỷ lệ đầu-thân = Chiều cao ÷ Chiều dài đầu | 6.5-7.5 heads tall proportion, thân hình cân đối |
| Chuyển đổi chiều cao | Chiều dài đầu = Chiều cao ÷ Tỷ lệ đầu-thân (như 175cm ÷ 7 = 25cm chiều dài đầu) | Tỷ lệ dễ thương, tỷ lệ đầu-thân hài hòa |
| Vai cổ | Vai tròn, cổ tự nhiên | Vai tròn, đường nét cổ tự nhiên |
| Tay | Lòng bàn tay tròn trịa, khớp tay mềm mại | Lòng bàn tay tròn trịa, khớp tay rõ ràng |
| Tư thế | Thiếu niên tươi sáng/anh trai nhẹ nhàng (theo nhân vật) | Dáng điệu vững chắc, tư thế tươi sáng |

### Tham Khảo Chuyển Đổi Chiều Cao-Tỷ Lệ Đầu-Thân

| Chiều cao(cm) | Tỷ lệ đầu-thân | Chiều dài đầu(cm) | Miêu tả phù hợp |
|---|---|---|---|
| 150-155 | 6.0 | ~25cm | Nhỏ nhắn dễ thương |
| 155-160 | 6.0-6.5 | ~25cm | Ngọt ngào nhỏ nhắn |
| 160-165 | 6.5 | ~24.6cm | Thiếu nữ trong sáng (nữ mặc định) |
| 165-170 | 6.5-7.0 | ~25cm | Thiếu nữ cao |
| 170-175 | 7.0 | ~25cm | Thiếu niên thanh tú |
| 175-180 | 7.0-7.5 | ~25cm | Chàng trai tươi sáng (nam mặc định) |
| 180-185 | 7.5 | ~25cm | Cao lớn đẹp trai |

---

## V. Ràng Buộc Kiểu Tóc Cơ Bản

> Chỉ định nghĩa tóc xõa tự nhiên/buộc đơn giản, phụ kiện tóc sẽ được bổ sung trong giai đoạn phát sinh phục trang.

### Nữ

| Hạng mục | Ràng buộc | Từ khóa gợi ý |
|---|---|---|
| Màu tóc | Màu nâu ấm/màu hạt dẻ nhạt/màu socola | Tóc dài nâu ấm, màu hạt dẻ như vàng |
| Độ dài tóc | Tóc ngang vai hoặc dài | Tóc dài ngang vai |
| Chất tóc | Từng sợi tóc rõ ràng, chi tiết rõ nét, chất cảm | Từng sợi tóc rõ ràng, render tóc mịn màng |
| Kiểu dáng | Tóc xõa tự nhiên, rẽ ngôi giữa/nghiêng, không phụ kiện tóc | Tóc dài xõa tự nhiên, mềm mại như thác |

### Nam

| Hạng mục | Ràng buộc | Từ khóa gợi ý |
|---|---|---|
| Màu tóc | Màu nâu ấm/màu cà phê đậm | Tóc ngắn nâu đậm, tóc màu cà phê |
| Độ dài tóc | Tóc ngắn đến trung bình | Tóc ngắn, tóc ngắn ngang tai |
| Chất tóc | Từng sợi tóc rõ ràng, chất cảm rõ nét | Từng sợi tóc rõ ràng, render tóc mịn màng |
| Kiểu dáng | Tóc xõa tự nhiên hoặc rẽ ngôi, không phụ kiện tóc | Tóc ngắn xõa tự nhiên, kiểu tóc rẽ ngôi |

---

## VI. Ràng Buộc Trang Phục Cơ Bản

> Trang phục cơ bản được quyết định bởi miêu tả nhân vật (thân phận/nghề nghiệp/giới tính/bối cảnh) để quyết định trang phục thường ngày tự nhiên nhất của nhân vật đó, là "trạng thái mặc định hàng ngày" của nhân vật đó; trang phục chính thức/biến thể đặc biệt sẽ được bổ sung trong giai đoạn phát sinh phục trang. **Cấm lót đồ lót**.

### Nguyên Tắc Lựa Chọn Trang Phục

| Thân phận nhân vật | Hướng trang phục mặc định |
|---|---|
| Học sinh | Đồng phục / Đồ học viện |
| Nhân viên văn phòng | Trang phục công sở (áo sơ mi + quần/váy, vest nhẹ) |
| Ở nhà/thư giãn | Trang phục thư giãn đô thị (áo hoodie/áo thun + quần/váy liền) |
| Năng động/vui tươi | Bộ đồ thể thao / Cải tiến đồng phục |
| Nghề nghiệp đặc biệt | Trang phục phù hợp với thân phận (bác sĩ/cảnh sát/giáo viên, v.v.) |
| Miêu tả nhân vật không rõ ràng | Trang phục thường ngày đô thị, phối màu tông ấm |

### Quy Tắc Thống Nhất Trang Phục

- Phong cách trang phục phải nhất quán với mỹ học render hoạt hình 3D (phối màu tông ấm, tỷ lệ hoạt hình)
- Màu sắc chủ đạo tông ấm, không có hoa văn/hoa tiết phức tạp, tiện cho việc bổ sung phát sinh sau này
- Kiểu dáng trang phục qua bốn góc nhìn hoàn toàn nhất quán
- Trang phục cơ bản là "trạng thái mặc định hàng ngày", trọng tâm vẫn là khuôn mặt và hình thể
- Cấm lót đồ lót/tiết lộ/tình dục hóa

---

## VII. Quy Định Về Hình Đặt Bốn Góc Nhìn

### Định Nghĩa Góc Nhìn

| Vị trí | Góc nhìn | Góc độ | Cảnh vật | Yêu cầu | Từ khóa gợi ý |
|---|---|---|---|---|---|
| Bên trái một | Chân dung cận cảnh | Chính diện ngang tầm mắt | Từ đỉnh đầu đến xương quai xanh | Hiển thị đầy đủ từ đỉnh đầu đến xương quai xanh không cắt, khuôn mặt chiếm 60%+, ngũ quan rõ ràng | portrait closeup, face detail, head to collarbone complete, no crop |
| Bên trái hai | Chính diện | Chính diện 0° | Toàn thân đứng | Đối diện máy ảnh, hai tay tự nhiên, hiển thị đầy đủ từ đỉnh đầu đến chân | front view, full body head to toe, height mark |
| Bên phải hai | Cạnh bên | Bên phải 90° | Toàn thân đứng | Đường nét bên rõ ràng, hiển thị đầy đủ từ đỉnh đầu đến chân | side view, profile, full body head to toe, height mark |
| Bên phải một | Mặt sau | Mặt sau 180° | Toàn thân đứng | Phần sau đầu/lưng/đuôi tóc/chân rõ ràng, hiển thị đầy đủ từ đỉnh đầu đến chân | back view, rear view, full body head to toe, height mark |

### Quy Chuẩn Hình Ảnh

| Hạng mục | Ràng buộc |
|---|---|
| Bố cục | Trong cùng một hình từ trái sang phải xếp bốn góc nhìn |
| Nền | Xám trung tính tinh khiết #E8E8E8 |
| Tư thế đứng | Đứng tự nhiên, hai chân song song hơi tách, hai tay tự nhiên thả lỏng hoặc hơi dang |
| Hiển thị toàn thân | Hình đứng toàn thân phải hiển thị đầy đủ từ đỉnh đầu đến chân, cấm cắt đỉnh đầu hoặc chân |
| Hiển thị cận cảnh | Chân dung cận cảnh phải hiển thị đầy đủ từ đỉnh đầu đến xương quai xanh, cấm cắt đỉnh đầu, tóc, trán, cằm đều phải đầy đủ |
| Biểu cảm | Biểu cảm trung tính, phù hợp với khí chất nhân vật |
| Ánh sáng | Ánh sáng mềm đều, ánh sáng chính phía trước + hai bên bổ sung, không có bóng cứng |
| Tính nhất quán | Bốn góc nhìn đồng nhất về màu da/hình thể/kiểu tóc/khuôn mặt/trang phục cơ bản |
| Tỷ lệ hình ảnh | Đề nghị 4:1 hoặc 3:1 |

---

## VIII. Mẫu Từ Khóa Gợi Ý

```
{Giới tính} nhân vật bốn góc nhìn, render hoạt hình 3D, ánh sáng cấp phim điện ảnh, chất cảm hoạt hình, chất liệu chi tiết cao, bầu không khí vui tươi chữa lành, phong cách đô thị hoạt hình, chất liệu hoạt hình chi tiết cao, tỷ lệ hoạt hình vừa phải, phối màu tông ấm, 8K siêu nét, bố cục cấp phim điện ảnh, ánh sáng mềm mại, phong cách render hoạt hình sáng, ấm áp chữa lành,
character design sheet, character turnaround,
{đặc điểm ngũ quan của nhân vật miêu tả - tự nhiên suy diễn từ miêu tả nhân vật}, {khí chất tổng thể}, không trang điểm,
{màu da}, da ánh sáng mềm, da sáng, da mịn màng, chất cảm,
{miêu tả chiều cao, như: 165cm tall, petite cute girl}, {tỷ lệ đầu-thân như: 6.5 heads tall proportion}, {miêu tả hình thể}, {miêu tả tư thế},
{màu tóc}{độ dài tóc}, tóc rõ ràng, {kiểu dáng cơ bản}, không phụ kiện tóc,
{trang phục thường ngày phù hợp với thân phận nhân vật, như: đồng phục/trang phục công sở/trang phục thư giãn đô thị}, tông màu ấm, không có hoa văn phức tạp,
Trong cùng một hình từ trái sang phải xếp: chân dung cận cảnh + chính diện + cạnh bên + mặt sau,
Chân dung cận cảnh hiển thị đầy đủ từ đỉnh đầu đến xương quai xanh, không cắt đỉnh đầu, head to collarbone complete,
Hình đứng toàn thân hiển thị đầy đủ từ đỉnh đầu đến chân, full body head to toe, không cắt đỉnh đầu và chân,
Đứng tự nhiên, nền xám trung tính tinh khiết, ánh sáng mềm đều, không có bóng cứng,
Tính nhất quán bốn góc nhìn, render khuôn mặt chi tiết, render tóc chi tiết
Đừng có bất kỳ văn bản nào trong hình
```

---

## IX. Quy Tắc Ràng Buộc

### Bắt Buộc

| Số | Quy tắc |
|---|---|
| R1 | Phải ở trạng thái "không trang điểm" |
| R2 | Phải tuyên bố trang phục thường ngày phù hợp với miêu tả nhân vật làm trang phục cơ bản (như học sinh→đồng phục, nhân viên văn phòng→trang phục công sở, ở nhà→trang phục thư giãn đô thị); cấm lót đồ lót |
| R3 | Phải tuyên bố "không phụ kiện tóc, không phụ kiện" |
| R4 | Phải chỉ định "nền xám trung tính tinh khiết" |
| R5 | Phải chỉ định "tính nhất quán bốn góc nhìn" |
| R6 | Hình đứng toàn thân phải hiển thị đầy đủ từ đỉnh đầu đến chân, cấm cắt |
| R7 | Phải tuyên bố chiều cao nhân vật và thông qua chuyển đổi tỷ lệ đầu-thân để ràng buộc tỷ lệ toàn thân (nữ mặc định 155-165cm/6-7 đầu, nam mặc định 170-180cm/6.5-7.5 đầu) |
| R8 | Chân dung cận cảnh phải hiển thị đầy đủ từ đỉnh đầu đến xương quai xanh, cấm cắt đỉnh đầu |

### Nghiêm Cấm

| Số | Nghiêm cấm |
|---|---|
| X1 | Lót đồ lót/tiết lộ/hóa tình dục; trang phục không phù hợp rõ ràng với miêu tả nhân vật; hoa văn/hoa tiết phức tạp quá mức gây cản trở bổ sung phục trang sau này |
| X2 | Ánh sáng cứng từ trên đỉnh/ánh sáng từ dưới/ánh sáng màu sắc |
| X3 | Làm trắng quá mức đến mức không có sắc đỏ / da xám xịt |
| X4 | Nền cảnh phức tạp (phải nền xám tinh khiết) |
| X5 | Biểu cảm thái quá/tư thế động |
| X6 | Cắt đỉnh đầu hoặc chân trong hình đứng toàn thân, phải hiển thị đầy đủ từ đầu đến chân |
| X7 | Cắt đỉnh đầu trong chân dung cận cảnh, phải hiển thị đầy đủ từ đỉnh đầu đến xương quai xanh |
| X8 | Bỏ qua ràng buộc chiều cao và tỷ lệ đầu-thân, chiều cao phải được tuyên bố rõ ràng và thể hiện tỷ lệ toàn thân thông qua chuyển đổi tỷ lệ đầu-thân |