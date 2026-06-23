---
name: art_character_derivative
description: Nhân vật tài sản phái sinh · Sổ tay giới hạn
metaData: art_skills
---

# Nhân vật tài sản phái sinh · Sổ tay giới hạn

---

## Một, Nguyên tắc chồng lớp

1. **Mặt không đổi** — Sau khi chồng lớp, ngũ quan phải hoàn toàn giống với mô hình nền, cấm lệch mặt
2. **Tư thế không đổi** — Giữ tư thế đứng tự nhiên của mô hình nền, cấm mọi thay đổi tư thế/động tác/thể thái
3. **Kiểm soát từng lớp** — Mỗi lớp mô tả độc lập, thuận tiện thay thế theo lớp (thay đồ không thay trang điểm)
4. **Phong cách thống nhất** — Tất cả các yếu tố trang phục và hóa trang tuân theo cùng một hệ thống thẩm mỹ
5. **Chất lượng không giảm** — Sau khi chồng lớp, tiêu chuẩn chất lượng không thấp hơn mô hình nền
6. **Phạm vi thuần túy trang phục hóa trang** — Chỉ chồng lớp trang điểm/tóc/trang phục/phụ kiện, cấm đưa vào đạo cụ, cảnh vật, môi trường, động tác

---

## Hai, Cấp độ chồng lớp

| Cấp độ | Nội dung | Giải thích |
|---|---|---|
| L0 | Mô hình nền | Hình ảnh cơ bản không thay đổi |
| L1 | Trang điểm (lớp quyết định) | Phân tích manh mối của người dùng trước, sau đó quyết định cường độ "trang điểm cơ bản / trang điểm nhẹ / trang điểm chính thức" |
| L2 | Kiểu tóc | Kiểu tóc búi/cột tóc/bện tóc + trang sức tóc |
| L3 | Áo trong/lót | Thay áo lót trắng cơ bản |
| L4 | Áo ngoài/chính | Trang phục cổ trang/lễ phục/phục trang thường |
| L5 | Phụ kiện | Trang sức đầu/khuyên tai/vòng cổ/thắt lưng/vòng tay |

> **Giới hạn phạm vi**: Tài sản phái sinh nhân vật chỉ bao gồm cấp độ L0–L5 (trang phục hóa trang), không bao gồm đạo cụ (ô/kiếm/quạt/sách/đèn lồng và các vật dụng cầm tay), cảnh vật môi trường (trong nhà/ngoài trời/thời tiết), tư thế động tác (đi bộ/quay đầu/nâng tay). Những thứ này thuộc phạm vi loại tài sản khác.

---

## Ba, Giới hạn trang điểm (L1)

### Chiến lược từ mô hình nền đến trang điểm phái sinh (quan trọng)

> Mặc dù mô hình nền không trang điểm, nhưng tài sản phái sinh mặc định vào quy trình trang điểm. Hệ thống nên phân tích nhu cầu trang điểm dựa trên manh mối do người dùng cung cấp và quyết định cường độ giữa trang điểm cơ bản, trang điểm nhẹ và trang điểm chính thức, chứ không giữ nguyên không trang điểm.

### Phân tích manh mối L1 và quyết định trang điểm

| Bước | Nội dung xử lý | Kết quả quyết định |
|---|---|---|
| S1 | Trích xuất manh mối của người dùng: từ trạng thái khuôn mặt, từ cảm xúc, từ cường độ | Tạo tóm tắt nhu cầu trang điểm |
| S2 | Lọc manh mối không liên quan đến trang điểm: từ đạo cụ/cảnh vật/động tác/tư thế không làm cơ sở trang điểm | Ngăn ngừa sai lầm |
| S3 | Ghép nối ma trận phong cách trang điểm và đưa ra cường độ | Trang điểm cơ bản / trang điểm nhẹ / trang điểm chính thức |
| S4 | Tạo từ khóa L1 cuối cùng | Chỉ xuất kết luận, không xuất quá trình phân tích |

### Ánh xạ từ manh mối đến trang điểm (thực hiện tiêu chuẩn)

| Loại manh mối | Manh mối điển hình | Quyết định L1 |
|---|---|---|
| Không có manh mối nhấn mạnh khuôn mặt rõ ràng | Chỉ thay đổi trang phục/kiểu tóc, không nhấn mạnh cảm xúc và trạng thái | Trang điểm cơ bản |
| Manh mối khuôn mặt nhẹ nhàng | Nhẹ nhàng, cười mỉm, mi nhắm nhẹ, sắc khí nhẹ nhõm | Trang điểm nhẹ (rất nhạt) |
| Manh mối hàng ngày rõ ràng | Hàng ngày, đi ra ngoài, nghỉ ngơi | Trang điểm cơ bản (tự nhiên, trong suốt) |
| Manh mối lễ nghi chính thức rõ ràng | Đám cưới lớn, lễ hội, dịp quan trọng | Trang điểm chính thức (tinh tế, quý phái) |

> Nguyên tắc phán đoán: Tất cả tài sản phái sinh đều cần có trang điểm; trước tiên xem xét manh mối khuôn mặt để quyết định cường độ và phong cách, đạo cụ, cảnh vật, thay đổi tư thế không được nâng cao cường độ trang điểm một cách đơn lẻ.

### Ma trận phong cách trang điểm nữ

| Phong cách | Cảnh sử dụng | Từ khóa cốt lõi |
|---|---|---|
| Trang điểm nhẹ nhàng | Hàng ngày, gặp gỡ lần đầu, trong phòng | Trang điểm nhẹ nhàng, lông mày nhẹ nhàng, khuôn mặt tự nhiên |
| Trang điểm quý phái cung đình | Cung đình, chính thức, quyền lực | Trang điểm tinh tế, lông mày sắc nét, màu môi đỏ tươi |
| Trang điểm đào hoa lãng mạn | Hẹn hò, rung động, ngọt ngào | Trang điểm đào hoa, đuôi mắt đỏ nhẹ, màu môi tươi |
| Trang điểm đám cưới lớn | Đám cưới lớn, lễ hội | Trang điểm đậm, đẹp mắt, môi hồng phượng |
| Trang điểm lễ hội | Lễ hội, tiệc tùng | Màu sắc tươi sáng, trang điểm pastel |

### Da nền chung (chia sẻ cho mọi kiểu trang điểm)

| Hạng mục | Giới hạn | Từ khóa |
|---|---|---|
| Chất liệu | Kết xuất vật liệu PBR, tự nhiên, trong sáng | Vật liệu PBR, ánh sáng tự nhiên, chất liệu mềm mại |
| Độ trắng | Tông màu trắng hồng, trong suốt không nhợt nhạt | Tông màu trắng hồng, trắng sáng tự nhiên |
| Ánh sáng từ bên trong | Cảm giác ánh sáng mềm mại từ trong ra ngoài | Ánh sáng từ bên trong, da sáng bóng |
| Cấm | Mờ/ trắng nhợt nhạt/ cảm giác sáp/ bóng dầu/ phơi sáng quá mức | — |

### Chi tiết trang điểm cơ bản (mức độ mặc định)

| Hạng mục | Giới hạn | Từ khóa |
|---|---|---|
| Lông mày | Chỉnh nhẹ theo hình dạng lông mày mô hình nền, không thay đổi hình dạng | Chỉnh lông mày tự nhiên, hình dạng lông mày sạch sẽ |
| Mắt | Trang điểm mắt rất nhạt, nhấn mạnh sự trong suốt và có thần | Mắt trong sáng, bóng mắt rất nhạt |
| Má | Nâng nhẹ sắc khí, má hồng nhạt | Má tự nhiên, má hồng nhạt |
| Môi | Màu hồng nhạt hoặc đỏ tươi, duy trì kiềm chế | Màu môi tự nhiên, màu hồng nhạt |
| Tổng thể | Có thể thấy có trang điểm, nhưng cảm giác trang điểm rất nhẹ | Trang điểm cơ bản, cảm giác tự nhiên, chất liệu mềm mại |

### Trang điểm nam

| Hạng mục | Giới hạn | Từ khóa |
|---|---|---|
| Da nền | Kết xuất vật liệu PBR, trắng sáng, mịn màng tự nhiên | Vật liệu PBR, trắng sáng, ánh sáng tự nhiên |
| Nguyên tắc | Trang điểm giả — Nhìn như không trang điểm nhưng da rất tốt | Trang điểm giả, da tốt tự nhiên |
| Lông mày | Lông mày tự nhiên dày, không vẽ lông mày | Lông mày kiếm tự nhiên, hình dạng lông mày mạnh mẽ |
| Màu môi | Màu tự nhiên, hơi ẩm | Màu môi tự nhiên, sắc máu |

---

## Bốn, Giới hạn kiểu tóc (L2)

### Loại hình kiểu tóc nữ

| Kiểu dáng | Mô tả | Phù hợp | Từ khóa |
|---|---|---|---|
| Cao búi mây | Búi cao + trang sức tóc | Cung đình, chính thức | Cao búi mây, búi tóc tinh tế |
| Búi đôi | Đối xứng, thiếu nữ | Nhân vật trẻ | Búi đôi, phong cách thiếu nữ |
| Búi xõa thấp | Búi lệch thấp, lười biếng | Hàng ngày, nghỉ ngơi | Búi xõa thấp, búi lệch lười biếng |
| Tóc xõa | Tóc dài hoàn toàn xõa, tự nhiên | Trong phòng, riêng tư | Tóc dài xõa, rơi tự nhiên |
| Búi đuôi ngựa cao | Búi cao gọn gàng | Tập võ, hành động | Búi đuôi ngựa cao, gọn gàng mạnh mẽ |
| Búi nửa | Nửa búi trên đầu + tóc xõa phía sau | Hàng ngày, đi ra ngoài | Búi mây nửa, tóc xõa tự nhiên |

### Trang sức tóc nữ

| Hạng mục | Giới hạn | Từ khóa |
|---|---|---|
| Phong cách | Lộng lẫy tinh tế, phù hợp với trang phục | Trang sức tóc lộng lẫy, thủ công tinh tế |
| Chất liệu | Vàng bạc + ngọc trai + tua rua | Cài tóc vàng bạc, ngọc trai đầy đầu |
| Công nghệ | Mô hình hóa độ phân giải cao, chi tiết rõ ràng | Công nghệ tinh vi, điêu khắc tinh xảo |

### Loại hình kiểu tóc nam

| Kiểu dáng | Phù hợp | Từ khóa |
|---|---|---|
| Búi nửa vương miện | Hàng ngày, văn nhân | Búi nửa vương miện, cài tóc ngọc |
| Búi cao vương miện | Chính thức, triều đình | Búi cao vương miện, vương miện ngọc |
| Tóc xõa chạm vai | Riêng tư, bị thương | Tóc xõa chạm vai, tóc dài như mực |
| Búi đuôi ngựa cao | Chiến đấu, tập võ | Búi đuôi ngựa cao, gọn gàng mạnh mẽ |

---

## Năm, Giới hạn trang phục (L3+L4)

### Ma trận trang phục nữ

| Phong cách | Kiểu dáng | Phù hợp | Từ khóa |
|---|---|---|---|
| Váy dài cổ trang | Váy dài, bay bổng | Hàng ngày, trong phòng | Váy dài cổ trang, váy bay bổng |
| Lễ phục cung đình | Lễ phục, lộng lẫy | Cung đình, chính thức | Lễ phục cung đình, váy lộng lẫy |
| Trang phục thường tiện lợi | Áo ngắn, tiện lợi | Hành động, tập võ | Trang phục thường tiện lợi, áo ngắn |
| Đồ ngủ | Áo lót mỏng, màu nhạt | Trong nhà, ban đêm | Đồ ngủ, rộng rãi thoải mái |
| Trang phục cưới lớn | Mũ phượng, áo đỏ xếp lớp | Đám cưới | Mũ phượng, áo đỏ xếp lớp |

### Giới hạn chung về trang phục nữ

| Hạng mục | Giới hạn | Từ khóa |
|---|---|---|
| Màu chủ đạo | Màu sắc truyền thống Trung Quốc làm mặc định | Trang phục màu truyền thống Trung Quốc, trang phục tinh tế |
| Chất liệu | Lụa + thêu + vải ngọc trai | Chất liệu lụa, chi tiết thêu |
| Chất lượng | Kết cấu phải siêu rõ ràng | Chất lượng trang phục rõ ràng, kết cấu siêu rõ |
| Vai | Áo choàng/vai mây/trang trí | Vai mây lộng lẫy, vai có trang trí |
| Tầng lớp | Nhiều lớp mặc xếp chồng, tầng lớp rõ ràng | Nhiều lớp mặc xếp chồng, tầng lớp rõ ràng |

### Ma trận trang phục nam

| Phong cách | Phù hợp | Từ khóa |
|---|---|---|
| Trang phục văn nhân sĩ tử | Hàng ngày, thư phòng | Trang phục văn nhân sĩ tử, áo dài |
| Trang phục tướng quân | Chiến đấu, tập võ | Trang phục tướng quân, áo giáp |
| Trang phục triều đình | Triều đình, lễ hội | Trang phục triều đình, lễ phục chính thức |
| Trang phục thường | Nghỉ ngơi, riêng tư | Trang phục thường, phong cách đơn giản |
| Lễ phục | Chính thức, lễ hội | Lễ phục, lộng lẫy tinh tế |

---

## Sáu, Giới hạn phụ kiện (L5)

### Phụ kiện nữ

| Loại | Giới hạn | Từ khóa |
|---|---|---|
| Trang sức đầu | Lộng lẫy tinh tế, không đơn giản | Trang sức đầu lộng lẫy, ngọc trai đầy đầu |
| Khuyên tai | Tua rua dài/ngọc trai | Khuyên tai tua rua, ngọc trai dài |
| Vòng cổ | Yên lạc/vòng cổ | Yên lạc lộng lẫy, vòng cổ tinh tế |
| Thắt lưng | Dây thắt cung/đá ngọc | Dây thắt cung bay bổng, thắt lưng đá ngọc |
| Vòng tay | Vòng ngọc/vòng tay | Vòng ngọc trong suốt, vòng tay tinh tế |

### Phụ kiện nam

| Loại | Giới hạn | Từ khóa |
|---|---|---|
| Vương miện | Vương miện ngọc/vàng, tinh tế | Vương miện ngọc |
| Thắt lưng | Thắt lưng rộng/dây da | Thắt lưng rộng, chất liệu rõ ràng |
| Đá ngọc | Trong suốt, mịn màng | Đá ngọc thắt lưng |
| Vũ khí | Kiếm/quạt/sáo (tùy chọn) | Kiếm dài bên cạnh, quạt gấp che nửa |

---

## Bảy, Tra cứu nhanh kết hợp trang phục hóa trang

| Cảnh | Trang điểm | Kiểu tóc | Trang phục | Phụ kiện |
|---|---|---|---|---|
| Hàng ngày trong phòng | Trang điểm nhẹ nhàng | Tóc xõa/búi nửa | Váy dài cổ trang | Trung bình |
| Gặp gỡ lần đầu | Trang điểm nhẹ nhàng | Búi nửa/búi xõa thấp | Váy dài cổ trang | Nhiều trung bình |
| Tương tác lãng mạn | Trang điểm đào hoa lãng mạn | Búi nửa/búi xõa thấp | Váy dài cổ trang/tiện lợi | Trung bình |
| Xuất hiện chính thức | Trang điểm quý phái cung đình | Cao búi mây | Lễ phục cung đình | Cực kỳ phong phú |
| Đêm riêng tư | Trang điểm nhẹ nhàng/đào hoa | Tóc xõa/búi xõa thấp | Đồ ngủ | Cực kỳ đơn giản |
| Lễ cưới lớn | Trang điểm đám cưới lớn | Cao búi mây | Trang phục cưới | Cực kỳ phong phú |
| Hành động tập võ | Trang điểm nhẹ (rất nhạt) | Búi đuôi ngựa | Trang phục thường tiện lợi | Đơn giản |

---

> **🔍 Quy tắc suy diễn khi không có kịch bản phủ sóng**
>
> Khi kịch bản/tình huống do người dùng mô tả không có trong bảng trên, suy diễn theo gen cốt lõi phong cách này:
>
> | Dựa vào suy diễn | Gen render 3D phong cách quốc phong |
> |---|---|
> | Cường độ trang điểm | Mặc định trang điểm nhẹ nhàng; cung đình/quyền lực/chính thức→trang điểm quý phái cung đình; rung động/ngọt ngào→trang điểm đào hoa lãng mạn; đám cưới/lễ hội→trang điểm đám cưới lớn; lễ hội tụ tập→trang điểm lễ hội |
> | Kiểu tóc | Hàng ngày/trong phòng→búi nửa hoặc búi xõa thấp; cung đình/chính thức→cao búi mây; riêng tư/ban đêm→tóc xõa; tập võ/hành động→búi đuôi ngựa |
> | Trang phục | Cổ trang làm cơ bản; cảnh tình cảm→váy dài bay bổng; quyền lực/chính thức→lễ phục cung đình; hành động→trang phục thường tiện lợi; vật liệu PBR luôn giữ |
> | Phụ kiện phong phú | Hàng ngày→trung bình; chính thức/cung đình→cực kỳ phong phú (trang sức vàng bạc+yên lạc+đá ngọc); riêng tư→cực kỳ đơn giản; hành động→đơn giản |
> | Tiêu chuẩn chất lượng | Vật liệu PBR + ánh sáng phim cấp luôn khóa; ưu tiên độ dày và độ bóng trước cảm giác trang trí bề mặt |

## Tám, Quy định thiết lập bốn tầm nhìn

> Sau khi chồng lớp trang phục hóa trang, vẫn cần xuất bốn tầm nhìn thiết lập để đảm bảo sự nhất quán của trang phục hóa trang ở các góc độ.

### Định nghĩa tầm nhìn

| Vị trí | Tầm nhìn | Góc độ | Cảnh | Yêu cầu | Từ khóa |
|---|---|---|---|---|---|
| Trái một | Cận cảnh chân dung | Trước mặt 0° | Khuôn mặt đến xương đòn | Khuôn mặt chiếm 60%+, ngũ quan/trang điểm rõ ràng | portrait closeup, face detail, makeup detail |
| Trái hai | Hình ảnh chính diện | Trước mặt 0° | Hình ảnh toàn thân | Đối diện máy ảnh, trang phục toàn cảnh chính diện | front view, height mark |
| Phải hai | Hình ảnh bên cạnh | Bên phải 90° | Hình ảnh toàn thân | Đường viền bên hoàn toàn, tầng lớp trang phục bên | side view, profile, height mark |
| Phải một | Hình ảnh phía sau | Phía sau 180° | Hình ảnh toàn thân | Trang sức tóc sau đầu/trang phục phía sau/đuôi tóc rõ ràng | back view, rear view, height mark |

### Quy định hình ảnh

| Hạng mục | Giới hạn |
|---|---|
| Bố cục | Cùng một hình ảnh từ trái sang phải xếp hàng bốn tầm nhìn |
| Nền | Màu xám nhạt #B8B8B8 |
| Tư thế đứng | Đứng tự nhiên, đôi chân song song hơi chia, tay tự nhiên thả xuống hoặc hơi mở ( **cấm mọi thay đổi tư thế** ) |
| Biểu cảm | Biểu cảm nhỏ phù hợp với phong cách trang điểm (như trang điểm nhẹ nhàng→thản nhiên, trang điểm đào hoa→cười mỉm), chỉ giới hạn biểu cảm khuôn mặt, không liên quan đến động tác cơ thể |
| Ánh sáng | Ánh sáng mềm đều, ánh sáng chính phía trước + ánh sáng phụ hai bên, không có bóng cứng |
| Nhất quán | Ngũ quan/trang điểm/kiểu tóc/trang sức tóc/trang phục/phụ kiện hoàn toàn nhất quán ở bốn tầm nhìn |
| Tỷ lệ hình ảnh | Khuyến nghị 4:1 hoặc 3:1 |

---

## Chín, Mẫu từ khóa

### Giới hạn định dạng đầu ra

| Hạng mục | Giới hạn |
|---|---|
| Nội dung đầu ra | **Chỉ xuất văn bản từ khóa**, không xuất bất kỳ nội dung nào khác |
| Cấm xuất | Bảng kiểm tra nhanh, kế hoạch xây dựng theo lớp, bảng giới hạn hình ảnh, bảng cấm, kế hoạch phái sinh, đề xuất đầu ra, bảng yếu tố cốt lõi và mọi nội dung không phải từ khóa khác |
| Cấm kịch bản | Tài sản phái sinh nhân vật **không bao gồm mô tả cảnh vật/môi trường**, không xuất bất kỳ nội dung nào liên quan đến cảnh vật/môi trường/thời tiết/bối cảnh (cảnh vật thuộc phạm vi tài sản cảnh vật) |
| Cấm đạo cụ | **Không bao gồm bất kỳ tương tác đạo cụ nào**, không xuất ô/kiếm/quạt/sách/đèn lồng/ly rượu và các vật dụng cầm tay hoặc tương tác (đạo cụ thuộc phạm vi tài sản đạo cụ) |
| Cấm thay đổi tư thế | **Không thay đổi tư thế mô hình nền**, không xuất đi bộ/quay đầu/nâng tay/nghiêng người/chạy và bất kỳ thay đổi động tác hoặc thể thái nào, giữ tư thế đứng tự nhiên |
| Định dạng | Trực tiếp xuất mã từ khóa có thể sử dụng mà không cần tiêu đề, bảng, giải thích, so sánh kế hoạch |

### Chồng lớp trang phục hóa trang hoàn chỉnh (bốn tầm nhìn)

Dựa trên hình ảnh cơ bản của nhân vật, chồng lớp trang phục hóa trang img2img,
Phong cách render 3D, mô hình hóa độ phân giải cao, vật liệu PBR, 3D phong cách quốc phong, ánh sáng phim cấp,
Thiết lập bốn tầm nhìn nhân vật cổ trang {giới tính}, render 3D, mô hình hóa độ phân giải cao, 8K, siêu chân thực
character design sheet, character turnaround,
Giữ nguyên khuôn mặt cơ bản của hình ảnh, {khí chất tổng thể},
【L1·Trang điểm】Quyết định dựa trên manh mối của người dùng: {trang điểm cơ bản/trang điểm nhẹ/trang điểm chính thức}; sử dụng {phong cách trang điểm}, kết xuất vật liệu PBR, {lông mày}, {trang điểm mắt}, {trang điểm môi},
【L2·Kiểu tóc】{loại kiểu dáng}, sợi tóc rõ ràng độ phân giải cao, {mô tả trang sức tóc},
【L3+L4·Trang phục】{màu chủ đạo}{kiểu dáng}, {chất liệu}, {công nghệ trang trí}, chất lượng trang phục rõ ràng, kết xuất vật liệu PBR,
【L5·Phụ kiện】{trang sức đầu}, {khuyên tai}, {vòng cổ}, {thắt lưng},
Trong cùng một hình ảnh từ trái sang phải xếp hàng: cận cảnh chân dung+hình ảnh chính diện+hình ảnh bên cạnh+hình ảnh phía sau,
Đứng tự nhiên, nền màu xám nhạt, ánh sáng mềm đều, không có bóng cứng,
Nhất quán bốn tầm nhìn, mô hình hóa 3D cổ phong rõ ràng, mô hình hóa độ phân giải cao rõ ràng,
Không có văn bản nào trong hình

---

## Mười, Quy tắc ràng buộc

### Cần tuân thủ

| Số | Quy tắc |
|---|---|
| R1 | Sau khi chồng lớp, khuôn mặt phải giống với mô hình nền |
| R2 | Trang phục phải sử dụng "chất lượng trang phục rõ ràng + kết xuất vật liệu PBR" |
| R3 | Phụ kiện nữ phải "lộng lẫy tinh tế + thủ công tinh xảo" |
| R4 | Phong cách trang điểm/kiểu tóc/trang phục/phụ kiện thống nhất |
| R5 | Phải xuất bốn tầm nhìn thiết lập (cận cảnh chân dung+hình ảnh chính diện+hình ảnh bên cạnh+hình ảnh phía sau) |
| R6 | Phải chỉ định "nền màu xám nhạt" |
| R7 | Phải chỉ định "nhất quán bốn tầm nhìn" |
| R8 | **Chỉ xuất từ khóa** — Cấm xuất bảng kiểm tra nhanh/kế hoạch xây dựng theo lớp/hình ảnh giới hạn/nội dung cấm/kế hoạch phái sinh/đề xuất đầu ra và mọi nội dung không phải từ khóa khác |
| R9 | **Cấm bao gồm mô tả cảnh vật** — Tài sản phái sinh nhân vật không liên quan đến cảnh vật/môi trường/thời tiết/bối cảnh, cảnh vật thuộc loại tài sản độc lập |
| R10 | **Cấm tương tác đạo cụ** — Không bao gồm bất kỳ vật dụng cầm tay/tương tác nào (ô/kiếm/quạt/sách và các vật dụng khác), đạo cụ thuộc loại tài sản độc lập |
| R11 | **Tư thế giữ nguyên** — Phải giữ tư thế đứng tự nhiên của mô hình nền, cấm mọi thay đổi động tác/thể thái/tư thế |
| R12 | **L1 Phải phân tích trước khi quyết định** — Trước tiên phân tích manh mối khuôn mặt của người dùng, sau đó quyết định trang điểm cơ bản/trang điểm nhẹ/trang điểm chính thức |
| R13 | **Tất cả tài sản phái sinh đều cần trang điểm** — Không giữ nguyên không trang điểm trong tình huống bình thường, ít nhất phải sử dụng trang điểm cơ bản |
| R14 | **Cường độ trang điểm được kiểm soát** — Ngay cả khi trang điểm cũng cần kiềm chế, không xuất hiện trang điểm hiện đại đậm/trang điểm phóng đại |
| R15 | **Đạo cụ/cảnh vật/động tác không làm cơ sở nâng cao cường độ** — Chỉ dựa vào thông tin đạo cụ, môi trường, động tác không được nâng cao trang điểm cơ bản thành trang điểm mạnh hơn |

### Nghiêm cấm

| Số | Nghiêm cấm |
|---|---|
| X1 | Sau khi chồng lớp, khuôn mặt lệch |
| X2 | Phụ kiện quá đơn giản/hiện đại (nữ) |
| X3 | Phong cách trang điểm/trang phục xung đột nhau |
| X4 | Nền cảnh phức tạp (phải là màu đơn) |
| X5 | Bốn tầm nhìn không nhất quán về trang phục hóa trang |
| X6 | Xuất mọi nội dung ngoài từ khóa (bảng/kế hoạch/đề xuất/giải thích/biến thể, v.v.) |
| X7 | Thêm mô tả cảnh vật vào tài sản phái sinh nhân vật (cảnh phố/cảnh mưa/trong nhà/đường phố/thời tiết và các yếu tố môi trường khác) |
| X8 | Xuất "kiểm tra nhanh yếu tố cốt lõi", "kế hoạch xây dựng theo lớp", "hình ảnh giới hạn", "nội dung cấm", "kế hoạch phái sinh" và các chương khác |
| X9 | Thêm bất kỳ tương tác đạo cụ nào (cầm ô/kiếm/quạt/sách/đèn lồng/ly rượu và các vật dụng khác) |
| X10 | Thay đổi tư thế mô hình nền (đi bộ/quay đầu/nâng tay/nghiêng người/chạy/ngẩng đầu/cúi đầu và các mô tả động tác khác) |
| X11 | Thêm mô tả liên kết biểu cảm và tư thế (như "nghiêng người 45° đi bộ môi mỉm cười" và các mô tả có tính tự sự khác) |
| X12 | Áp dụng trực tiếp trang điểm cố định mà không phân tích manh mối của người dùng |
| X13 | Giữ nguyên không trang điểm sai lầm, dẫn đến tài sản phái sinh thiếu trang điểm cần có |
| X14 | Nâng cấp trang điểm sai lầm chỉ vì từ đạo cụ/cảnh vật/động tác dẫn đến quyết định cường độ trang điểm sai lầm |