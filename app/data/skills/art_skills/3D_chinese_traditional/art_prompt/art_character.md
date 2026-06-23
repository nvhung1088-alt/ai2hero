---
name: art_character
description: Tạo hình cơ bản nhân vật · Sổ tay ràng buộc
metaData: art_skills
---

# Tạo hình cơ bản nhân vật · Sổ tay ràng buộc

---

## Một, Nguyên tắc hình ảnh cơ bản

1. **Tạo hình là linh hồn** — Tạo hình nhân vật là điểm neo cốt lõi, phong cách 3D cổ trang, đường nét mượt mà
2. **Mô hình gốc là nền tảng** — Trang phục cơ bản + mặt mộc, trang phục và hóa trang sau này đều là lớp phủ
3. **Bốn góc nhìn nhất quán** — Khuôn mặt/hình thể/kiểu tóc/trang phục cơ bản đồng nhất cao qua các góc nhìn
4. **Khí chất cổ điển** — Trạng thái không trang điểm vẫn cần thể hiện khí chất nhân vật (thanh nhã/ôn nhu/anh khí)

---

## Hai, Ràng buộc diện mạo

> Không còn cố định các thông số đặc điểm ngũ quan, AI được điều khiển bởi mô tả nhân vật (giới tính/tuổi tác/tính cách/khí chất) tự do tạo ra ngũ quan, đảm bảo sự khác biệt ngoại hình giữa các nhân vật.

### Yêu cầu chung

| Hạng mục | Ràng buộc |
|---|---|
| Ngũ quan | Tự nhiên suy luận từ mô tả nhân vật, không định trước hình dáng khuôn mặt/mắt/lông mày/mũi/môi |
| Màu nền phong cách | Phong cách 3D cổ trang, mô hình hóa độ chính xác cao, vật liệu PBR, ánh sáng điện ảnh |
| Khí chất | Phải trích xuất từ mô tả nhân vật các từ khóa khí chất tổng thể (như thanh nhã ôn nhu/nho nhã anh khí/hiệp cốt nhu tình), và viết vào từ gợi ý |
| Biểu cảm | Biểu cảm trung tính, phù hợp khí chất nhân vật |

---

## Ba, Ràng buộc cảm giác da

### Nữ

| Hạng mục | Ràng buộc | Từ gợi ý |
|---|---|---|
| Màu da | Tông phấn trắng, toàn thân đồng đều, trắng sáng | Tông phấn trắng, trắng sáng, màu da mô hình 3D |
| Độ bóng | Vật liệu PBR, độ bóng tự nhiên, không mờ | Vật liệu PBR, độ bóng tự nhiên, chất cảm mềm mại |
| Chất cảm | Mô hình hóa độ chính xác cao, kết cấu rõ nét, viền mềm mại | Mô hình hóa độ chính xác cao, kết cấu rõ nét, viền mềm mại |
| Lộ da | Mặt/cổ/tay | Tay mịn màng, đường nét cổ mềm mại |

### Nam

| Hạng mục | Ràng buộc | Từ gợi ý |
|---|---|---|
| Màu da | Tông trắng, toàn thân đồng đều, chất cảm khỏe mạnh | Tông trắng, chất cảm khỏe mạnh, màu da mô hình 3D |
| Độ bóng | Vật liệu PBR, độ bóng tự nhiên | Vật liệu PBR, độ bóng tự nhiên, chất cảm mềm mại |
| Chất cảm | Mô hình hóa độ chính xác cao, sạch sẽ | Mô hình hóa độ chính xác cao, 3D render, mềm mại |

---

## Bốn, Ràng buộc hình thể

### Nữ

| Hạng mục | Ràng buộc | Từ gợi ý |
|---|---|---|
| Chiều cao | Được chỉ định bởi thiết lập nhân vật, phạm vi mặc định 160-170cm | {chiều cao}cm tall, {mô tả chiều cao như: tall elegant woman} |
| Tỉ lệ đầu/thân | Từ bảy đầu đến bảy đầu rưỡi, tỉ lệ cổ điển | 7 heads tall proportion, cổ điển |
| Vai/cổ | Cổ thiên nga, đường nét vai/cổ đẹp | Cổ thiên nga, vai/cổ đẹp |
| Tay | Dài mảnh, trắng, ngón tay tự nhiên | Dài mảnh, trắng, ngón tay tự nhiên |
| Tư thế | Khí chất cổ điển, thanh nhã thẳng đứng | Tư thế thanh nhã, dáng đứng thẳng |

### Nam

| Hạng mục | Ràng buộc | Từ gợi ý |
|---|---|---|
| Chiều cao | Được chỉ định bởi thiết lập nhân vật, phạm vi mặc định 175-185cm | {chiều cao}cm tall, {mô tả chiều cao như: tall imposing man} |
| Tỉ lệ đầu/thân | Từ bảy đầu đến bảy đầu rưỡi, tỉ lệ cổ điển | 7 heads tall proportion, cổ điển |
| Vai/cổ | Vai rộng, cổ lực lưỡng | Vai rộng, cổ lực lưỡng |
| Tay | Khớp xương rõ, ngón tay tự nhiên | Khớp xương rõ, ngón tay tự nhiên |
| Tư thế | Nho nhã anh khí, thẳng đứng | Tư thế anh khí, dáng đứng thẳng |

---

## Năm, Ràng buộc kiểu tóc cơ bản

> Chỉ định kiểu tóc tự nhiên, phụ kiện tóc sẽ được thêm vào giai đoạn trang phục và hóa trang.

### Nữ

| Hạng mục | Ràng buộc | Từ gợi ý |
|---|---|---|
| Màu tóc | Đen mực, cấm các màu khác | Tóc đen dài, mái tóc như thác |
| Độ dài tóc | Tóc dài đến eo | Tóc dài đến eo, tóc dài |
| Chất tóc | Mô hình hóa độ chính xác cao, sợi tóc rõ nét | Mô hình hóa độ chính xác cao, sợi tóc rõ nét |
| Tạo hình | Tóc xõa tự nhiên, không phụ kiện tóc | Tóc dài tự nhiên xõa, không phụ kiện tóc |

### Nam

| Hạng mục | Ràng buộc | Từ gợi ý |
|---|---|---|
| Màu tóc | Đen mực, cấm các màu khác | Tóc đen dài, mái tóc như mực |
| Độ dài tóc | Tóc dài đến vai hoặc cột tóc | Tóc dài đến vai, cột tóc |
| Chất tóc | Mô hình hóa độ chính xác cao, sợi tóc rõ nét | Mô hình hóa độ chính xác cao, sợi tóc rõ nét |
| Tạo hình | Tóc xõa tự nhiên hoặc buộc nửa, không vương miện | Tóc dài tự nhiên xõa, buộc nửa tóc |

---

## Sáu, Ràng buộc trang phục cơ bản

> Trang phục cơ bản không có ràng buộc đặc biệt, nữ là váy dài cổ trang màu trơn, nam là áo dài cổ trang màu trơn. Trang phục chính thức sẽ được thêm vào giai đoạn trang phục và hóa trang.

### Trang phục cơ bản nữ

Váy dài cổ trang màu trơn, màu chủ yếu là màu cơ bản, không có hoa văn trang trí.

### Trang phục cơ bản nam

Áo dài cổ trang màu trơn, màu chủ yếu là màu cơ bản, không có hoa văn trang trí.

### Quy tắc thống nhất trang phục

- Phong cách trang phục thống nhất, đảm bảo không có nhiễu màu sắc khi thêm trang phục sau này
- Che phủ cơ bản trừ khuôn mặt/tay/cổ
- Bốn góc nhìn trang phục đồng nhất hoàn toàn
- Trang phục cơ bản chỉ là nền an toàn, trọng tâm là khuôn mặt và hình thể

---

## Bảy, Quy chuẩn thiết lập hình bốn góc nhìn

### Định nghĩa góc nhìn

| Vị trí | Góc nhìn | Góc độ | Cảnh xa | Yêu cầu | Từ gợi ý |
|---|---|---|---|---|---|
| Trái một | Cận cảnh chân dung | Chính diện 0° | Từ đầu đến xương đòn | Hiển thị hoàn chỉnh từ đầu đến xương đòn, khuôn mặt chiếm 60%+, ngũ quan rõ nét | portrait closeup, face detail |
| Trái hai | Chính diện | Chính diện 0° | Dáng đứng toàn thân | Đối diện máy ảnh, tay tự nhiên, hiển thị hoàn chỉnh từ đầu đến chân | front view, full body |
| Phải hai | Góc nghiêng | Bên phải 90° | Dáng đứng toàn thân | Đường viền nghiêng rõ nét, hiển thị hoàn chỉnh từ đầu đến chân | side view, profile, full body |
| Phải một | Góc nhìn từ sau | Phía sau 180° | Dáng đứng toàn thân | Phần sau đầu/lưng/đuôi tóc/chân rõ nét, hiển thị hoàn chỉnh từ đầu đến chân | back view, rear view, full body |

### Quy chuẩn hình ảnh

| Hạng mục | Ràng buộc |
|---|---|
| Bố cục | Cùng trong một hình ảnh xếp hàng bốn góc nhìn từ trái sang phải |
| Nền | Màu xám đơn thuần #B8B8B8 |
| Tư thế đứng | Đứng tự nhiên, chân song song hơi cách nhau, tay thả tự nhiên |
| Hiển thị toàn thân | Dáng đứng toàn thân phải hiển thị hoàn chỉnh từ đầu đến chân, nghiêm cấm cắt xén |
| Hiển thị cận cảnh | Cận cảnh chân dung phải hiển thị hoàn chỉnh từ đầu đến xương đòn, nghiêm cấm cắt xén |
| Biểu cảm | Biểu cảm trung tính, phù hợp khí chất nhân vật |
| Ánh sáng | Ánh sáng dịu nhẹ đồng đều, ánh sáng chính phía trước + ánh sáng phụ hai bên, không có bóng cứng |
| Nhất quán | Bốn góc nhìn màu da/hình thể/kiểu tóc/khuôn mặt/trang phục cơ bản hoàn toàn nhất quán |
| Tỷ lệ hình ảnh | Khuyến nghị 4:1 hoặc 3:1 |

---

## Tám, Mẫu từ gợi ý

{giới tính}thiết lập hình bốn góc nhìn, phong cách 3D render, mô hình hóa độ chính xác cao, vật liệu PBR, phong cách 3D cổ trang, ánh sáng điện ảnh,
character design sheet, character turnaround,
{đặc điểm ngũ quan tương ứng với mô tả nhân vật - tự nhiên suy luận từ mô tả nhân vật}, {khí chất tổng thể}, trạng thái mặt mộc,
{màu da}, vật liệu PBR, 3D render chất cảm trong suốt, mô hình hóa độ chính xác cao, ánh sáng và bóng tối phong phú,
{mô tả chiều cao, như:165cm tall, tall elegant woman}, {tỉ lệ đầu/thân, như:7 heads tall proportion}, {mô tả hình thể}, {mô tả tư thế},
{màu tóc}{độ dài tóc}, sợi tóc rõ nét chính xác cao, {tạo hình cơ bản}, không phụ kiện tóc,
(nữ: váy dài cổ trang màu trơn / nam: áo dài cổ trang màu trơn), màu cơ bản, không trang trí hoa văn,
cùng trong một hình ảnh xếp hàng từ trái sang phải: cận cảnh chân dung+chính diện+góc nghiêng+góc nhìn từ sau,
cận cảnh chân dung hiển thị hoàn chỉnh từ đầu đến xương đòn, không cắt xén đầu, head to collarbone complete,
dáng đứng toàn thân hiển thị hoàn chỉnh từ đầu đến chân, full body head to toe, không cắt xén đầu và chân,
đứng tự nhiên, nền màu xám đơn thuần, ánh sáng dịu nhẹ đồng đều, không có bóng cứng,
nhất quán bốn góc nhìn, mô hình hóa 3D cổ trang rõ nét, mô hình hóa độ chính xác cao rõ nét,
không có bất kỳ chữ nào trong hình

---

## Chín, Quy tắc ràng buộc

### Bắt buộc tuân thủ

| Số | Quy tắc |
|---|---|
| R1 | Phải là "trạng thái mặt mộc" |
| R2 | Phải tuyên bố trang phục cơ bản (nữ: váy dài cổ trang màu trơn; nam: áo dài cổ trang màu trơn) |
| R3 | Phải tuyên bố "không phụ kiện tóc, không phụ kiện trang trí" |
| R4 | Phải chỉ định "nền màu xám đơn thuần" |
| R5 | Phải chỉ định "nhất quán bốn góc nhìn" |
| R6 | Dáng đứng toàn thân phải hiển thị hoàn chỉnh từ đầu đến chân, nghiêm cấm cắt xén |
| R7 | Phải tuyên bố chiều cao nhân vật và ràng buộc tỉ lệ toàn thân qua tỉ lệ đầu/thân (nữ mặc định 160-170cm/7 đầu, nam mặc định 175-185cm/7 đầu) |
| R8 | Cận cảnh chân dung phải hiển thị hoàn chỉnh từ đầu đến xương đòn, nghiêm cấm cắt xén đầu |

### Nghiêm cấm

| Số | Nghiêm cấm |
|---|---|
| X1 | Bất kỳ trang phục/phụ kiện/trang điểm nào ngoài trang phục cơ bản |
| X2 | Ánh sáng cứng đỉnh/ánh sáng dưới/ánh sáng lạnh |
| X3 | Làm trắng quá mức đến mức không có máu/màu da xám |
| X4 | Nền cảnh phức tạp (phải là màu đơn) |
| X5 | Biểu cảm phóng đại/tư thế động |
| X6 | Dáng đứng toàn thân cắt xén đầu hoặc chân, phải hiển thị hoàn chỉnh từ đầu đến chân |
| X7 | Cận cảnh chân dung cắt xén đầu, phải hiển thị hoàn chỉnh từ đầu đến xương đòn |
| X8 | Bỏ qua ràng buộc chiều cao và tỉ lệ đầu/thân, chiều cao phải được tuyên bố rõ ràng và thể hiện qua tỉ lệ đầu/thân |