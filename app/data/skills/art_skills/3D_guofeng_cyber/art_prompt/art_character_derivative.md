---
name: art_character_derivative
description: Tạo tài sản nhân vật 3D phong cách quốc phong và cyber · Cẩm nang quy định
metaData: art_skills
---

# Tạo tài sản nhân vật 3D phong cách quốc phong và cyber · Cẩm nang quy định
## （Phiên bản thích ứng kép cho cảnh truyền thống cổ phong + cảnh đô thị hiện đại cyber）

---

## Một, Nguyên tắc chồng lớp (Quy tắc cốt lõi chung cho hai cảnh)

1. **Khuôn mặt không đổi** — Sau khi chồng lớp, ngũ quan phải hoàn toàn giống với mô hình gốc, cấm lệch khuôn mặt, biến dạng, thay đổi phong cách hóa
2. **Tư thế không đổi** — Duy trì tư thế đứng tự nhiên của mô hình gốc, cấm thay đổi bất kỳ tư thế, động tác, trạng thái cơ thể nào
3. **Có thể kiểm soát từng lớp** — Mỗi lớp mô tả độc lập, các yếu tố cổ phong/cyber phân lớp độc lập, thuận tiện thay đổi theo lớp (thay trang phục không thay trang điểm, thay yếu tố cyber không thay nền tảng quốc phong)
4. **Phong cách thống nhất** — Tất cả các yếu tố trang phục và hóa trang tuân theo cùng một hệ thẩm mỹ, **cảnh cổ phong lấy mỹ học truyền thống phương Đông làm cốt lõi, yếu tố cyber là sự hòa nhập nhẹ nhàng có thể lựa chọn; cảnh đô thị lấy hình thức quốc phong làm nền tảng, chức năng cyber là biểu đạt cốt lõi**, cấm hoàn toàn sự đối lập giữa yếu tố quốc phong và cyber
5. **Chất cảm không giảm** — Sau khi chồng lớp, tiêu chuẩn chất cảm không thấp hơn mô hình gốc, chất liệu 3D PBR, ánh sáng và bóng độ điện ảnh là nền tảng chung cho toàn cảnh
6. **Phạm vi chỉ thuộc trang phục và hóa trang** — Chỉ chồng lớp trang điểm, kiểu tóc, trang phục, phụ kiện, cấm đưa vào đạo cụ, cảnh, môi trường, động tác
7. **Thích ứng một chạm cho hai cảnh** — Khi không có dấu hiệu rõ ràng về cyber/đô thị, mặc định tương thích với tạo dựng thuần cổ phong; khi có dấu hiệu rõ ràng về cyber/đô thị, tự động phù hợp với hệ thống đô thị quốc phong cyber, không cần tái cấu trúc logic nền tảng

---

## Hai, Cấp độ chồng lớp (Cấu trúc phân lớp toàn diện cho hai cảnh)

| Cấp độ | Nội dung | Mô tả thích ứng hai cảnh |
|---|---|---|
| L0 | Mô hình gốc | Mô hình hình ảnh cơ bản, khuôn mặt, trạng thái cơ thể, tư thế đứng hoàn toàn khóa, thích ứng chung cho cảnh cổ phong/đô thị, không thay đổi bất kỳ điều gì |
| L1 | Trang điểm (Lớp quyết định) | Trước tiên phân tích dấu hiệu người dùng, sau đó quyết định cường độ và phong cách của "trang điểm cơ bản / trang điểm nhẹ / trang điểm chính thức / trang điểm chức năng cyber / trang điểm đi làm đô thị", bao gồm hai hệ thống trang điểm truyền thống độc quyền cổ phong và trang điểm ánh sáng độc quyền cyber đô thị |
| L2 | Kiểu tóc | Búi tóc quốc phong/cột tóc/bện tóc + phụ kiện tóc truyền thống/phụ kiện tóc chức năng cyber, bao gồm hai hệ thống tạo kiểu truyền thống cổ phong và tạo kiểu nhẹ nhàng cyber đô thị, tiêu chuẩn tóc mịn độ chính xác cao áp dụng cho toàn cảnh |
| L3 | Áo trong/lớp lót | Thay áo trong cơ bản màu trắng, cảnh cổ phong sử dụng áo trong lụa truyền thống, cảnh đô thị sử dụng vải chức năng quốc phong, có thể gắn mạch điện kiểm soát, dải ánh sáng nhỏ neon |
| L4 | Áo ngoài/trang phục chính | Lớp thích ứng kép cốt lõi: cảnh cổ phong sử dụng trang phục truyền thống Trung Hoa/lễ phục/trang phục thường; cảnh đô thị sử dụng **trang phục chức năng cyber với hình thức quốc phong là cốt lõi** (phải giữ lại các cấu trúc cốt lõi Trung Hoa như cổ áo đứng/lệch/trang phục kiểu áo dài/áo dài), cấm trang phục chức năng thuần phương Tây không có lõi quốc phong |
| L5 | Phụ kiện | Phụ kiện đầu/khuyên tai/vòng cổ/thắt lưng/phụ kiện tay truyền thống + phụ kiện chức năng quốc phong cyber/phụ kiện ánh sáng, cảnh cổ phong sử dụng phụ kiện truyền thống là chủ đạo, điểm xuyết nhẹ nhàng cyber; cảnh đô thị sử dụng phụ kiện kết hợp quốc phong + cyber, cấm hoàn toàn phụ kiện cyber thuần phương Tây |

> **Giới hạn phạm vi**: Tài sản phát sinh nhân vật chỉ bao gồm cấp độ L0–L5 (trang phục và hóa trang), không bao gồm đạo cụ (ô/kiếm/quạt/sách/đèn lồng và các vật dụng cầm tay khác), môi trường cảnh (trong nhà/ngoài trời/thời tiết), động tác tư thế (đi bộ/quay đầu/nâng tay). Những thứ này thuộc phạm vi các loại tài sản khác; yếu tố chức năng cyber chỉ giới hạn trong phạm vi L1-L5 của trang phục và hóa trang, không được sửa đổi cấu trúc cơ thể mô hình gốc ra ngoài ranh giới.

---

## Ba, Ràng buộc trang điểm (L1·Hệ đôi cổ phong + đô thị)

### Chiến lược trang điểm từ mô hình gốc đến phát sinh (Chìa khóa)

> Mô hình nhân vật gốc dù là mặt mộc, nhưng tài sản phát sinh mặc định đi vào quy trình trang điểm. Hệ thống nên phân tích nhu cầu trang điểm dựa trên dấu hiệu cung cấp bởi người dùng, ưu tiên phù hợp với thuộc tính cảnh cổ phong/đô thị, sau đó quyết định cường độ trong hệ thống trang điểm tương ứng, khi không có dấu hiệu cảnh rõ ràng, mặc định hệ thống cổ phong, không được tự ý chuyển đổi.

### Phân tích dấu hiệu L1 và quyết định trang điểm

| Bước | Nội dung xử lý | Kết quả quyết định |
|---|---|---|
| S1 | Trích xuất dấu hiệu người dùng: từ trạng thái khuôn mặt, từ cảm xúc, từ cường độ, từ phong cách, từ cảnh (cổ phong/đô thị) | Tạo ra bản tóm tắt nhu cầu hai chiều "cảnh + trang điểm" |
| S2 | Lọc các dấu hiệu không liên quan đến trang điểm: từ đạo cụ/cảnh/động tác/tư thế không làm cơ sở trang điểm | Ngăn chặn đánh giá sai |
| S3 | Trước tiên phù hợp với hệ thống cảnh cổ phong/đô thị, sau đó phù hợp với ma trận phong cách trang điểm và đưa ra độ cường độ | Hệ thống cổ phong: trang điểm cơ bản / trang điểm nhẹ / trang điểm chính thức; Hệ thống đô thị: trang điểm đi làm / trang điểm công việc / trang điểm chức năng cyber |
| S4 | Tạo ra từ khóa L1 cuối cùng | Chỉ xuất kết luận, không xuất quá trình phân tích |

### Phản ánh dấu hiệu vào trang điểm (Thực hiện tiêu chuẩn·thích ứng hai cảnh)

| Loại dấu hiệu | Dấu hiệu điển hình | Phù hợp cảnh | Quyết định L1 |
|---|---|---|---|
| Không có dấu hiệu cảnh rõ ràng/dấu hiệu nhấn mạnh khuôn mặt | Chỉ thay đổi trang phục/kiểu tóc, không nhấn mạnh cảm xúc và trạng thái | Mặc định cổ phong | Trang điểm cơ bản |
| Dấu hiệu khuôn mặt nhẹ | Nhẹ nhàng, mỉm cười, lông mi khẽ rung, khí sắc hơi nâng | Phổ biến cho cổ phong/đô thị | Trang điểm nhẹ (cực nhẹ) |
| Dấu hiệu cổ phong hàng ngày rõ ràng | Hàng ngày, nội thất, ra ngoài, thư giãn, tụ họp văn nhân | Cảnh cổ phong | Trang điểm cơ bản (tự nhiên trong suốt) |
| Dấu hiệu nghi lễ chính thức cổ phong rõ ràng | Đại hôn, nghi lễ, triều đình, dịp quan trọng | Cảnh cổ phong | Trang điểm chính thức (tinh tế quý tộc) |
| Dấu hiệu đô thị hàng ngày rõ ràng | Đi làm, đô thị hàng ngày, đi chơi thư giãn | Cảnh đô thị cyber | Trang điểm đi làm đô thị (trong suốt tự nhiên + cực kỳ nhẹ) |
| Dấu hiệu chính thức đô thị rõ ràng | Công việc, hội nghị toàn ảnh, lễ hội đô thị | Cảnh đô thị cyber | Trang điểm công việc đô thị (tinh tế mờ mờ + cảm giác lạnh) |
| Dấu hiệu chức năng cyber rõ ràng | Cyber, chức năng, đi đêm, nhiệm vụ, ánh sáng neon, cảm giác tương lai | Cảnh đô thị cyber | Trang điểm chức năng cyber (hiệu ứng ánh sáng có thể kiểm soát, kết hợp với quốc phong) |

> Nguyên tắc đánh giá:
> 1. Tất cả tài sản phát sinh đều cần có trang điểm; trước tiên xem dấu hiệu cảnh phù hợp với hệ thống nào, sau đó xem dấu hiệu khuôn mặt để quyết định cường độ và phong cách, thay đổi đạo cụ, cảnh, tư thế không được nâng cấp riêng cường độ trang điểm
> 2. Dấu hiệu chức năng cyber chỉ có thể kích hoạt trang điểm hệ thống cyber đô thị, không có dấu hiệu tương ứng không được tự ý thêm trang điểm hiệu ứng ánh sáng cyber
> 3. Cảnh cổ phong không có dấu hiệu cyber rõ ràng, cấm thêm bất kỳ hiệu ứng ánh sáng/ chức năng trang điểm cyber nào, đảm bảo cảnh thuần cổ phong hoàn toàn thích ứng

### Ma trận phong cách trang điểm nữ (Bao phủ toàn bộ hai cảnh)

| Hệ thống | Phong cách | Cảnh áp dụng | Từ khóa cốt lõi |
|---|---|---|---|
| Hệ thống cổ phong | Trang điểm nhẹ thanh nhã | Cổ phong hàng ngày, gặp gỡ đầu tiên, nội thất, tụ họp văn nhân | Trang điểm thanh nhã, lông mày nhẹ, khuôn mặt không trang điểm |
| Hệ thống cổ phong | Trang điểm quý phái cung đình | Cổ phong cung đình, chính thức, quyền lực, lễ hội | Trang điểm tinh tế, hình dạng lông mày sắc sảo, màu môi đỏ mọng |
| Hệ thống cổ phong | Trang điểm hoa đào lãng mạn | Hẹn hò cổ phong, rung động, cảnh ngọt ngào | Trang điểm hoa đào, đuôi mắt hồng nhạt, màu môi mọng nước |
| Hệ thống cổ phong | Trang điểm cưới lớn | Đại hôn cổ phong, nghi lễ | Trang điểm đậm lộng lẫy, môi đỏ mắt phượng |
| Hệ thống cổ phong | Trang điểm lễ hội | Lễ hội cổ phong, tụ hội | Màu sắc sáng, trang điểm pastel |
| Hệ thống đô thị cyber | Trang điểm đi làm đô thị | Đô thị hàng ngày, đi làm, đi chơi thư giãn | Trang điểm nhẹ trong suốt, hình dáng lông mày tự nhiên, lớp nền trang điểm đồng đều, không màu sắc quá đáng |
| Hệ thống đô thị cyber | Trang điểm công việc đô thị | Công việc đô thị, hội nghị toàn ảnh, dịp chính thức | Lớp nền trang điểm lạnh mờ, hình dáng lông mày sắc sảo, trang điểm mắt sâu, màu môi thấp bão hòa chất liệu |
| Hệ thống đô thị cyber | Trang điểm dòng chảy cyber | Đi đêm đô thị, cảnh cyber, nghỉ ngơi chức năng | Hiệu ứng ánh sáng neon nhỏ ở đuôi mắt, mạch điện tiếp xúc da, màu môi có ánh sáng lấp lánh, trang điểm trong suốt không nặng |
| Hệ thống đô thị cyber | Trang điểm lạnh chức năng | Nhiệm vụ đô thị, hành động, cảnh khí trường mạnh | Lớp nền mờ lạnh, hình dáng lông mày sắc sảo, trang điểm mắt sâu, họa tiết chức năng mờ một phần, không hiệu ứng ánh sáng quá đáng |

### Da nền chung (Tất cả trang điểm · Chia sẻ hai cảnh)

| Dự án | Ràng buộc | Từ khóa |
|---|---|---|
| Chất cảm | Vật liệu PBR, tự nhiên trong sáng, họa tiết có thể kiểm soát, chất cảm 3D thống nhất toàn cảnh | Vật liệu PBR, ánh sáng tự nhiên, chất cảm mềm mại, họa tiết da tinh tế |
| Độ trắng | Tông màu trắng hồng, trong suốt không nhợt nhạt | Tông màu trắng hồng, trắng sáng trong suốt |
| Ánh sáng từ trong ra | Cảm giác ánh sáng từ trong ra ngoài | Cảm giác ánh sáng từ trong ra, da phát sáng trong suốt |
| Phù hợp cyber | Chỉ hệ thống cyber đô thị có thể thêm mạch điện tiếp xúc da, hiệu ứng ánh sáng neon nhỏ, không được phủ lên chất cảm da mô hình gốc; Hệ thống cổ phong cấm sử dụng | Mạch điện tiếp xúc da, hiệu ứng ánh sáng neon nhỏ, kết hợp tự nhiên với da |
| Cấm | Mờ mờ/nhợt nhạt/trông như sáp/bóng dầu/quá sáng, trang điểm cyber phủ lên mô hình gốc diện rộng, ánh sáng mạnh chói mắt, cảnh cổ phong tự ý thêm yếu tố cyber | — |

### Trang điểm cơ bản tỉ mỉ (Mặc định cổ phong · Thông dụng cho hai cảnh)

| Dự án | Ràng buộc | Từ khóa |
|---|---|---|
| Lông mày | Chỉnh nhẹ theo hình dáng lông mày mô hình gốc, không thay đổi hình dáng lông mày | Chỉnh lông mày tự nhiên, hình dáng lông mày sạch sẽ |
| Mắt | Trang điểm mắt cực nhẹ, nhấn mạnh sự trong suốt và có hồn | Mắt trong suốt, trang điểm mắt cực nhẹ |
| Má | Khí sắc tự nhiên nhẹ nhàng, má hồng pastel | Khí sắc má tự nhiên, má hồng pastel |
| Môi | Màu hồng nhạt hoặc đỏ mọng, giữ chừng mực | Màu môi tự nhiên mọng nước, màu môi hồng nhạt |
| Tổng thể | Có thể thấy có trang điểm, nhưng cảm giác trang điểm rất nhẹ | Trang điểm cơ bản, cảm giác trang điểm tự nhiên, chất cảm mềm mại |

### Trang điểm nam (Thích ứng hai cảnh)

| Hệ thống | Dự án | Ràng buộc | Từ khóa |
|---|---|---|---|
| Cổ phong chung | Da nền | Vật liệu PBR, trắng sáng trong suốt, tươi mát tự nhiên | Vật liệu PBR, trắng sáng trong suốt, ánh sáng tự nhiên |
| Cổ phong chung | Nguyên tắc cốt lõi | Vẻ ngoài không trang điểm — trông không trang điểm nhưng da cực kỳ tốt | Vẻ ngoài không trang điểm, da tốt bẩm sinh |
| Cổ phong chung | Lông mày | Lông mày đậm tự nhiên, không thay đổi hình dáng lông mày mô hình gốc | Lông mày kiếm tự nhiên, hình dáng lông mày mạnh mẽ |
| Cổ phong chung | Màu môi | Màu máu tự nhiên, hơi mọng | Màu môi tự nhiên, cảm giác máu đỏ |
| Hệ thống đô thị cyber | Phù hợp cyber | Chỉ có thể thêm họa tiết chức năng mờ một phần, mạch điện cực nhẹ, không hiệu ứng ánh sáng quá đáng, không có dấu hiệu rõ ràng cấm sử dụng | Mạch điện cực nhẹ tiếp xúc da, họa tiết chức năng mờ, không có ánh sáng mạnh |
| Hệ thống đô thị cyber | Trang điểm công việc đô thị | Lớp nền trang điểm mờ trong suốt, hình dáng lông mày sắc sảo, không có cảm giác trang điểm dư thừa | Lớp nền trang điểm mờ trong suốt, hình dáng lông mày sắc sảo, cảm giác không trang điểm |

---

## Bốn, Ràng buộc tạo kiểu tóc (L2·Hệ đôi cổ phong + đô thị)

### Loại hình tạo kiểu nữ (Bao phủ toàn bộ hai cảnh)

| Hệ thống | Tạo kiểu | Mô tả | Cảnh áp dụng | Từ khóa |
|---|---|---|---|---|
| Hệ thống cổ phong | Búi tóc cao | Búi tóc cao + phụ kiện tóc truyền thống | Cung đình cổ phong, chính thức, lễ hội | Búi tóc cao, búi tóc tinh tế, hình thức truyền thống Trung Quốc |
| Hệ thống cổ phong | Búi tóc đôi | Đối xứng đôi, cảm giác trẻ trung | Nhân vật trẻ cổ phong, hàng ngày | Búi tóc đôi, phong cách trẻ trung, tạo kiểu truyền thống Trung Quốc |
| Hệ thống cổ phong | Búi tóc thả | Búi tóc lệch thấp, cảm giác lười biếng | Hàng ngày cổ phong, thư giãn, nội thất | Búi tóc thả, búi tóc lệch lười biếng, tạo kiểu truyền thống Trung Quốc |
| Hệ thống cổ phong | Tóc xõa | Tóc dài xõa hết, rơi tự nhiên | Nội thất cổ phong, riêng tư, ban đêm | Tóc xõa, rơi tự nhiên, chất cảm truyền thống Trung Quốc |
| Hệ thống cổ phong | Tóc cột đuôi ngựa cao | Cột cao gọn gàng, sắc sảo | Tập võ cổ phong, cảnh hành động | Đuôi ngựa cao, gọn gàng sắc sảo, cột tóc truyền thống Trung Quốc |
| Hệ thống cổ phong | Tóc nửa cột | Đỉnh đầu nửa cột + tóc xõa phía sau | Hàng ngày cổ phong, ra ngoài | Búi tóc nửa, tóc xõa tự nhiên, tạo kiểu truyền thống Trung Quốc |
| Hệ thống đô thị cyber | Đuôi ngựa thấp nửa cột quốc phong | Tóc nửa cột kiểu Trung Quốc + đuôi ngựa thấp, sắc sảo không lê thê | Đi làm đô thị, ra ngoài hàng ngày | Đuôi ngựa thấp nửa cột quốc phong, điểm xuyết bện tóc Trung Quốc, gọn gàng hàng ngày, tóc mịn độ chính xác cao |
| Hệ thống đô thị cyber | Búi tóc chức năng cao quốc phong | Búi tóc cao kiểu Trung Quốc + cấu trúc chức năng cố định, có thể nhúng dải ánh sáng neon nhỏ | Chính thức đô thị, lễ hội toàn ảnh, cảnh chức năng | Búi tóc chức năng cao quốc phong, cố định phụ kiện tóc hợp kim titan, nhúng dải ánh sáng neon nhỏ có thể kiểm soát |
| Hệ thống đô thị cyber | Bện tóc nửa cơ khí quốc phong | Bện ba kiểu Trung Quốc + dây bện chức năng, điểm xuyết tua rua ánh sáng nhỏ | Nghỉ ngơi đô thị, đi đêm, cảnh cyber | Bện tóc nửa cơ khí quốc phong, nền tảng bện tóc Trung Quốc, dây bện chức năng, điểm xuyết tua rua ánh sáng |
| Hệ thống đô thị cyber | Đuôi ngựa cao quốc phong | Cột tóc kiểu Trung Quốc + đuôi ngựa cao, cố định phụ kiện tóc chức năng | Chức năng đô thị, hành động, nhiệm vụ | Đuôi ngựa cao quốc phong, nền tảng cột tóc Trung Quốc, cố định phụ kiện tóc chức năng, gọn gàng sắc sảo |

### Phụ kiện tóc nữ (Thích ứng hai cảnh)

| Hệ thống | Ràng buộc | Từ khóa |
|---|---|---|
| Hệ thống cổ phong | Hoa mỹ tinh tế, phối hợp với trang phục, chất liệu và công nghệ truyền thống Trung Quốc thuần túy, không có yếu tố cyber (không có dấu hiệu rõ ràng cấm sử dụng) | Phụ kiện tóc hoa mỹ, công nghệ tinh tế, trâm vàng bạc, ngọc ngà đầy đầu, điêu khắc tinh xảo |
| Hệ thống đô thị cyber | Lấy hình thức quốc phong làm cốt lõi, phối hợp với trang phục, chất liệu truyền thống + chất liệu chức năng cyber kết hợp, hiệu ứng ánh sáng có thể kiểm soát | Phụ kiện tóc cyber quốc phong, công nghệ tinh tế, trang sức vàng bạc ngọc + phụ kiện chức năng hợp kim titan, dải ánh sáng neon nhỏ có thể kiểm soát, điểm xuyết toàn ảnh |

### Loại hình tạo kiểu nam (Bao phủ toàn bộ hai cảnh)

| Hệ thống | Tạo kiểu | Cảnh áp dụng | Từ khóa |
|---|---|---|---|
| Hệ thống cổ phong | Cột tóc nửa vương miện | Hàng ngày cổ phong, văn nhân, tụ họp văn nhân | Cột tóc nửa vương miện, trâm ngọc cột tóc, tạo kiểu truyền thống Trung Quốc |
| Hệ thống cổ phong | Cột tóc cao toàn vương miện | Chính thức cổ phong, triều đình, lễ hội | Cột tóc cao toàn vương miện, trâm ngọc cột tóc, hình thức truyền thống Trung Quốc |
| Hệ thống cổ phong | Tóc xõa | Nội thất cổ phong, cảnh ban đêm | Tóc xõa, tóc dài như mực, chất cảm truyền thống Trung Quốc |
| Hệ thống cổ phong | Cột tóc đuôi ngựa cao | Chiến đấu cổ phong, cảnh tập võ | Đuôi ngựa cao chiến đấu, đuôi ngựa gọn gàng, cột tóc truyền thống Trung Quốc |
| Hệ thống đô thị cyber | Cột tóc nửa vương miện chức năng quốc phong | Hàng ngày đô thị, đi làm, cảnh công việc | Cột tóc nửa vương miện chức năng quốc phong, nền tảng cột tóc Trung Quốc, phụ kiện tóc hợp kim titan mờ, gọn gàng sắc sảo |
| Hệ thống đô thị cyber | Cột tóc đuôi ngựa thấp quốc phong | Nghỉ ngơi đô thị, ra ngoài hàng ngày | Cột tóc đuôi ngựa thấp quốc phong, nền tảng cột tóc Trung Quốc, phụ kiện tóc chức năng tối giản, chất cảm tự nhiên |
| Hệ thống đô thị cyber | Cột tóc chức năng cao quốc phong | Chức năng đô thị, nhiệm vụ, cảnh đi đêm | Cột tóc chức năng cao quốc phong, nền tảng cột tóc Trung Quốc, vương miện chức năng bao phủ toàn bộ, công nghệ mờ |

---

## Năm, Ràng buộc trang phục (L3+L4·Lớp thích ứng cốt lõi cho hai cảnh)

### Đường đỏ cốt lõi (Thông dụng cho hai cảnh · Không thể vượt qua)
**Tất cả trang phục phải lấy hình thức truyền thống Trung Quốc làm cốt lõi tuyệt đối**, cảnh cổ phong tuân thủ nghiêm ngặt logic cắt trang phục truyền thống Trung Quốc; cảnh đô thị cyber phải giữ lại ít nhất 1 cấu trúc cốt lõi Trung Quốc như cổ áo đứng/lệch/áo dài/áo dài, cấm hoàn toàn trang phục phương Tây thuần túy không có lõi quốc phong, đảm bảo nền tảng quốc phong của cảnh cổ phong + đô thị không bị mất.

### Ma trận trang phục nữ (Bao phủ toàn bộ hai cảnh)

| Hệ thống | Phong cách | Cốt lõi kiểu dáng | Cảnh áp dụng | Từ khóa |
|---|---|---|---|---|
| Hệ thống cổ phong | Váy dài hàng ngày cổ phong | Hình thức áo dài Trung Quốc, chân váy bay bổng, thêu truyền thống | Hàng ngày cổ phong, nội thất, tụ họp văn nhân, ra ngoài | Váy dài áo dài cổ phong, trang phục bay bổng, chất liệu lụa, họa tiết thêu truyền thống Tô Châu, nhiều lớp chồng lên nhau |
| Hệ thống cổ phong | Lễ phục cung đình | Hình thức lễ phục Trung Quốc, áo rộng tay, chân váy tầng, thêu hoa quý | Cung đình cổ phong, chính thức, lễ hội, cảnh quyền lực | Lễ phục cung đình cổ phong, váy hoa quý, áo rộng tay Trung Quốc, thêu chỉ vàng, chân váy tầng |
| Hệ thống cổ phong | Trang phục thường tiện lợi | Áo ngắn Trung Quốc, cổ áo đứng lệch, cắt eo, gọn gàng không lê thê | Hành động cổ phong, tập võ, cảnh ra ngoài | Trang phục thường tiện lợi cổ phong, cắt áo ngắn, cổ áo đứng lệch, chất liệu lụa và bông, gọn gàng sắc sảo |
| Hệ thống cổ phong | Trang phục ngủ | Áo trong lụa mỏng, màu lụa, rộng rãi thoải mái | Nội thất cổ phong, ban đêm, cảnh riêng tư | Trang phục ngủ cổ phong, rộng rãi thoải mái, chất liệu lụa mỏng, màu lụa đơn giản |
| Hệ thống cổ phong | Trang phục cưới lớn | Hình thức phượng quan hà bào, áo đỏ tầng, họa tiết trang phục cưới truyền thống | Lễ cưới cổ phong, nghi lễ cưới lớn | Trang phục cưới lớn cổ phong, phượng quan hà bào, áo đỏ tầng, thêu chỉ vàng, hình thức trang phục cưới Trung Quốc |
| Hệ thống đô thị cyber | Trang phục thường đi làm quốc phong | Áo sơ mi cổ đứng/lệch Trung Quốc, áo dài cải tiến ngắn, phối chất liệu chức năng hàng ngày, không quá đáng | Hàng ngày đô thị, đi làm, nghỉ ngơi ra ngoài | Trang phục thường đi làm cyber quốc phong, áo sơ mi cổ đứng lệch Trung Quốc, cắt áo dài cải tiến, phối lụa và chất liệu chức năng mờ, thêu tối giản, gọn gàng hàng ngày |
| Hệ thống đô thị cyber | Lễ phục công việc quốc phong | Hình thức áo vest đối cánh Trung Quốc, cấu trúc áo dài cải tiến, chất liệu mờ cao cấp, hoa quý tối giản | Công việc đô thị, hội nghị toàn ảnh, dịp chính thức | Lễ phục công việc cyber quốc phong, nền tảng áo dài đối cánh Trung Quốc, chất liệu mờ cao cấp, cắt 3D, họa tiết Trung Quốc tối giản, hoa quý thầm lặng |
| Hệ thống đô thị cyber | Trang phục thường chức năng nhẹ quốc phong | Áo ngắn Trung Quốc + áo vest chức năng, cổ áo lệch và khóa nam châm, cắt eo, tiện lợi nhẹ nhàng | Hành động đô thị, đi đêm, cảnh nghỉ ngơi chức năng | Trang phục thường chức năng nhẹ quốc phong, áo ngắn cổ lệch Trung Quốc, phối áo vest chức năng, khóa nam châm, chất liệu chức năng mờ, gọn gàng sắc sảo |
| Hệ thống đô thị cyber | Lễ phục cưới lớn/ lễ hội cyber quốc phong | Hình thức phượng quan hà bào/ lễ phục Trung Quốc, cấu trúc hợp kim titan, chân váy tầng, dải ánh sáng neon nhỏ có thể kiểm soát | Lễ cưới lớn đô thị, lễ hội toàn ảnh, dịp quan trọng | Lễ phục lễ hội cyber quốc phong, hình thức lễ phục Trung Quốc, phối lụa và cấu trúc in 3D, thêu chỉ vàng và mạch điện kết hợp, dải ánh sáng neon nhỏ có thể kiểm soát |
| Hệ thống đô thị cyber | Trang phục ngủ chức năng quốc phong | Áo trong cổ lệch Trung Quốc, phối lụa mỏng và chất liệu chức năng, rộng rãi thoải mái, họa tiết ánh sáng nhỏ | Nội thất đô thị, ban đêm, cảnh riêng tư | Trang phục ngủ chức năng quốc phong, hình thức áo trong cổ lệch Trung Quốc, rộng rãi thoải mái, phối lụa mỏng và chất liệu chức năng, họa tiết ánh sáng nhỏ |

### Ràng buộc trang phục nữ thông dụng (Thích ứng hai cảnh)

| Dự án | Ràng buộc | Từ khóa |
|---|---|---|
| Màu chủ đạo | Cảnh cổ phong mặc định màu sắc truyền thống Trung Quốc; Cảnh đô thị có thể phối màu cyber lạnh thấp bão hòa, điểm xuyết màu neon có thể kiểm soát, cấm màu sắc chói mắt cao bão hòa | Màu sắc truyền thống Trung Quốc, phối màu cyber quốc phong, màu đậm thấp bão hòa, điểm xuyết màu neon có thể kiểm soát |
| Chất liệu | Cảnh cổ phong mặc định lụa + thêu + chất liệu ngọc trai; Cảnh đô thị có thể phối chất liệu chức năng mờ, dải phản quang cao sáng, cấu trúc in 3D, phải giữ lại nền tảng chất liệu cốt lõi quốc phong | Chất liệu lụa, chi tiết thêu, chất liệu truyền thống cảnh cổ phong; Cảnh đô thị phối chất liệu truyền thống và chất liệu chức năng, cấu trúc in 3D lập thể |
| Họa tiết | Cảnh cổ phong mặc định họa tiết truyền thống Trung Quốc; Cảnh đô thị có thể kết hợp họa tiết truyền thống và họa tiết mạch điện, họa tiết cyber, họa tiết siêu rõ nét, cấm họa tiết cyber thuần không có lõi quốc phong | Chất cảm quần áo rõ nét, họa tiết siêu rõ nét, họa tiết truyền thống thuần Trung Quốc cảnh cổ phong; Cảnh đô thị kết hợp sâu họa tiết truyền thống và họa tiết mạch điện |
| Vai | Cảnh cổ phong mặc định vai mây quốc phong/khăn choàng; Cảnh đô thị có thể phối giáp vai chức năng/trang trí cấu trúc, phải thống nhất với hình thức Trung Quốc | Cảnh cổ phong vai mây hoa mỹ, khăn choàng bay bổng; Cảnh đô thị giáp vai quốc phong điểm xuyết, thống nhất với hình thức tổng thể |
| Lớp | Nhiều lớp chồng lên nhau, lớp phân biệt rõ ràng, logic áo trong và áo ngoài quốc phong thống nhất, cấu trúc chức năng cảnh đô thị không được phá vỡ logic chồng lớp | Nhiều lớp chồng lên nhau, lớp phân biệt rõ ràng, logic hình thức Trung Quốc thống nhất |
| Hiệu ứng ánh sáng | Chỉ cảnh đô thị cyber có thể thêm dải ánh sáng neon nhỏ nhúng, hiệu ứng ánh sáng có thể kiểm soát không chói mắt, không phá vỡ chất cảm trang phục, không quá sáng; Cảnh cổ phong không có dấu hiệu rõ ràng cấm sử dụng | Dải ánh sáng neon nhỏ nhúng cảnh đô thị, hiệu ứng ánh sáng có thể kiểm soát, không quá sáng, kết hợp tự nhiên với trang phục |

### Ma trận trang phục nam (Bao phủ toàn bộ hai cảnh)

| Hệ thống | Phong cách | Cảnh áp dụng | Từ khóa |
|---|---|---|---|
| Hệ thống cổ phong | Trang phục văn nhân | Hàng ngày cổ phong, phòng đọc sách, tụ họp văn nhân, ra ngoài | Trang phục văn nhân cổ phong, hình thức áo dài, cổ áo đứng lệch, chất liệu lụa và bông, họa tiết thêu truyền thống |
| Hệ thống cổ phong | Trang phục chiến binh | Chiến đấu cổ phong, luyện võ, cảnh hành động | Trang phục chiến binh cổ phong, hình thức áo dài, cổ áo đứng thu eo, chất liệu bền, gọn gàng sắc sảo |
| Hệ thống cổ phong | Lễ phục triều đình | Triều đình cổ phong, nghi lễ, lễ hội | Lễ phục triều đình cổ phong, hình thức lễ phục chính thức, áo rộng tay, chất liệu hoa quý, họa tiết truyền thống |
| Hệ thống cổ phong | Trang phục thường | Nghỉ ngơi cổ phong, riêng tư, ra ngoài hàng ngày | Trang phục thường cổ phong, phong cách đơn giản, chất liệu thoải mái, cổ áo đứng Trung Quốc, rộng rãi gọn gàng |
| Hệ thống cổ phong | Lễ phục lớn | Chính thức cổ phong, lễ hội, dịp quan trọng | Lễ phục lớn cổ phong, hoa quý tinh tế, hình thức lễ phục Trung Quốc, chất liệu cao cấp, thêu chỉ vàng |
| Hệ thống đô thị cyber | Trang phục đi làm công việc quốc phong | Hàng ngày đô thị, đi làm, hội nghị công việc | Trang phục đi làm công việc cyber quốc phong, nền tảng áo dài cổ đứng Trung Quốc, cắt áo vest cải tiến, chất liệu mờ cao cấp, họa tiết Trung Quốc tối giản, gọn gàng gọn gàng |
| Hệ thống đô thị cyber | Trang phục nghỉ ngơi chức năng quốc phong | Hàng ngày đô thị, nghỉ ngơi ra ngoài, cảnh chức năng nhẹ | Trang phục nghỉ ngơi chức năng cyber quốc phong, áo ngắn cổ lệch Trung Quốc, phối chất liệu chức năng, khóa nam châm, rộng rãi thoải mái, phối hàng ngày |
| Hệ thống đô thị cyber | Trang phục chiến binh chức năng | Hành động đô thị, nhiệm vụ, cảnh đi đêm | Trang phục chiến binh chức năng cyber quốc phong, nền tảng áo dài chiến binh Trung Quốc, chất liệu chức năng mờ, cấu trúc bảo vệ lập thể, cổ áo đứng thu eo, gọn gàng sắc sảo |
| Hệ thống đô thị cyber | Lễ phục lễ hội quốc phong | Lễ hội toàn ảnh đô thị, dịp chính thức, lễ cưới lớn | Lễ phục lễ hội cyber quốc phong, hình thức lễ phục Trung Quốc, chất liệu hoa quý, cấu trúc hợp kim titan, kết hợp họa tiết truyền thống và mạch điện |

---

## Sáu, Ràng buộc phụ kiện (L5·Thích ứng hai cảnh)

### Phụ kiện nữ (Phân hệ cho hai cảnh)

| Hệ thống | Loại | Ràng buộc | Từ khóa |
|---|---|---|---|
| Hệ thống cổ phong | Phụ kiện đầu | Hoa mỹ tinh tế, không mỏng manh, chất liệu truyền thống Trung Quốc thuần túy, phối hợp với kiểu tóc và trang phục | Phụ kiện đầu hoa mỹ, ngọc ngà đầy đầu, trâm vàng bạc, trâm ngọc ngọc, điêu khắc tinh xảo |
| Hệ thống cổ phong | Khuyên tai | Tua rua truyền thống/Ngọc đeo tai, thống nhất với phong cách tổng thể | Tua rua khuyên tai, ngọc đeo tai, khuyên tai ngọc, vàng bạc khảm |
| Hệ thống cổ phong | Vòng cổ | Dây chuyền truyền thống, hình thức truyền thống Trung Quốc | Dây chuyền hoa mỹ, dây chuyền tinh tế, vàng bạc ngọc khảm |
| Hệ thống cổ phong | Phụ kiện thắt lưng | Dây thắt lưng truyền thống/ngọc bội, công nghệ truyền thống Trung Quốc | Dây thắt lưng bay bổng, ngọc bội thắt lưng, ngọc bội cấm, dệt tinh tế |
| Hệ thống cổ phong | Phụ kiện tay | Vòng ngọc truyền thống/vòng tay, hình thức truyền thống Trung Quốc | Vòng ngọc trong suốt, vòng tay tinh tế, chất liệu vàng bạc ngọc |
| Hệ thống đô thị cyber | Phụ kiện đầu | Lấy hình thức quốc phong làm cốt lõi, phối hợp với kiểu tóc và trang phục, chất liệu truyền thống + chất liệu chức năng cyber kết hợp, hiệu ứng ánh sáng có thể kiểm soát | Phụ kiện đầu cyber quốc phong, ngọc ngà + phụ kiện chức năng hợp kim titan, dải ánh sáng neon nhỏ có thể kiểm soát, điểm xuyết toàn ảnh, công nghệ tinh tế |
| Hệ thống đô thị cyber | Khuyên tai | Ngọc đeo tai truyền thống + khuyên tai chức năng cyber kết hợp, tua rua ánh sáng có thể kiểm soát không quá đáng | Khuyên tai chức năng quốc phong, ngọc khảm + chất liệu hợp kim titan, tua rua ánh sáng neon nhỏ có thể kiểm soát, nhỏ gọn tinh tế |
| Hệ thống đô thị cyber | Vòng cổ | Dây chuyền truyền thống + vòng cổ chức năng, hình thức Trung Quốc làm cốt lõi | Vòng cổ chức năng quốc phong, cấu trúc dây chuyền + chất liệu hợp kim titan, nhúng ánh sáng nhỏ có thể kiểm soát, tinh tế vừa khít |
| Hệ thống đô thị cyber | Phụ kiện thắt lưng | Dây thắt lưng truyền thống/ngọc bội + dây thắt lưng chức năng, khóa nam châm, cấu trúc lập thể | Dây thắt lưng chức năng quốc phong, dây thắt lưng rộng + dây thắt lưng kết hợp, ngọc bội thắt lưng, khóa nam châm hợp kim titan, chất cảm phân biệt |
| Hệ thống đô thị cyber | Phụ kiện tay | Vòng ngọc truyền thống + vòng tay chức năng, hình thức Trung Quốc làm cốt lõi, không thiết kế quá đáng | Vòng tay chức năng quốc phong, vòng ngọc trong suốt + chất liệu hợp kim titan, ánh sáng nhỏ có thể kiểm soát, tinh tế vừa khít |

### Phụ kiện nam (Phân hệ cho hai cảnh)

| Hệ thống | Loại | Ràng buộc | Từ khóa |
|---|---|---|---|
| Hệ thống cổ phong | Vương miện | Vương miện ngọc truyền thống/vương miện vàng, công nghệ tinh tế, hình thức truyền thống Trung Quốc, phối hợp với kiểu tóc và trang phục | Vương miện ngọc, vương miện vàng, điêu khắc ngọc, công nghệ tinh tế |
| Hệ thống cổ phong | Dây thắt lưng | Dây thắt lưng rộng truyền thống/dây da, hình thức truyền thống Trung Quốc, chất cảm phân biệt | Dây thắt lưng rộng, dây da, móc ngọc đá, chất cảm phân biệt |
| Hệ thống cổ phong | Ngọc bội | Ngọc bội truyền thống trong suốt ấm áp, công nghệ truyền thống Trung Quốc, đeo thắt lưng | Ngọc bội thắt lưng, trong suốt ấm áp, chất ngọc Hòa Điền, điêu khắc tinh tế |
| Hệ thống cổ phong | Phụ kiện thắt lưng | Kiếm/quạt/sáo chỉ giới hạn ở phụ kiện cố định thắt lưng, **cấm đạo cụ cầm tay**, hình thức truyền thống Trung Quốc | Phụ kiện kiếm cố định thắt lưng, quạt gấp thắt lưng, phụ kiện sáo trúc thắt lưng, không có tương tác cầm tay |
| Hệ thống đô thị cyber | Vương miện | Hình thức vương miện ngọc truyền thống + chất liệu chức năng hợp kim titan, công nghệ mờ, mô hình tinh tế, phối hợp với kiểu tóc và trang phục | Vương miện chức năng quốc phong, nền tảng vương miện Trung Quốc, chất liệu hợp kim titan mờ, ngọc khảm, công nghệ tinh tế |
| Hệ thống đô thị cyber | Dây thắt lưng | Hình thức dây thắt lưng rộng truyền thống + cấu trúc chức năng, khóa nam châm, cắt 3D, chất cảm phân biệt | Dây thắt lưng chức năng quốc phong, nền tảng dây thắt lưng Trung Quốc, chất liệu chức năng mờ, khóa nam châm hợp kim titan, cấu trúc lập thể |
| Hệ thống đô thị cyber | Ngọc bội | Hình thức ngọc truyền thống + chất liệu ánh sáng acrylic, trong suốt ấm áp, ánh sáng nhỏ có thể kiểm soát, đeo thắt lưng | Ngọc bội ánh sáng quốc phong, hình thức truyền thống, chất liệu acrylic + ngọc, trong suốt ấm áp, ánh sáng nhỏ có thể kiểm soát |
| Hệ thống đô thị cyber | Phụ kiện thắt lưng | Hình thức truyền thống + chất liệu chức năng, chỉ giới hạn ở phụ kiện cố định thắt lưng, **cấm đạo cụ cầm tay** | Phụ kiện kiếm chức năng cố định thắt lưng, quạt gấp hợp kim titan thắt lưng, không có tương tác cầm tay |

---

## Bảy, Tra cứu nhanh tổ hợp trang phục và hóa trang (Bao phủ toàn cảnh hai cảnh)

| Hệ thống | Cảnh | Trang điểm | Kiểu tóc | Trang phục | Phụ kiện |
|---|---|---|---|---|---|
| Hệ thống cổ phong | Hàng ngày nội thất | Trang điểm nhẹ thanh nhã | Tóc xõa/nửa cột | Váy dài hàng ngày cổ phong | Trung bình (phụ kiện truyền thống đơn giản) |
| Hệ thống cổ phong | Gặp gỡ đầu tiên/tụ họp văn nhân | Trang điểm nhẹ thanh nhã | Nửa cột tóc/búi tóc thả | Váy dài hàng ngày cổ phong | Trung bình nhiều (phụ kiện truyền thống tinh tế) |
| Hệ thống cổ phong | Tương tác lãng mạn | Trang điểm hoa đào lãng mạn | Nửa cột tóc/búi tóc thả | Váy dài hàng ngày cổ phong/trang phục thường tiện lợi | Trung bình |
| Hệ thống cổ phong | Ra mắt chính thức cung đình | Trang điểm quý phái cung đình | Búi tóc cao | Lễ phục cung đình cổ phong | Rất nhiều (phụ kiện truyền thống hoa quý) |
| Hệ thống cổ phong | Riêng tư ban đêm | Trang điểm nhẹ/hoa đào | Tóc xõa/búi tóc thả | Trang phục ngủ cổ phong | Rất ít (không có phụ kiện thừa) |
| Hệ thống cổ phong | Nghi lễ cưới lớn | Trang điểm cưới lớn | Búi tóc cao | Trang phục cưới lớn cổ phong | Rất nhiều (phụ kiện phượng quan hà bào đầy đủ) |
| Hệ thống cổ phong | Tập võ/hành động | Trang điểm nhẹ (cực nhẹ) | Cột tóc đuôi ngựa cao | Trang phục thường tiện lợi cổ phong/trang phục chiến binh | Ít (chỉ có phụ kiện cố định cơ bản) |
| Hệ thống đô thị cyber | Hàng ngày đi làm đô thị | Trang điểm đi làm đô thị | Đuôi ngựa thấp nửa cột quốc phong | Trang phục thường đi làm quốc phong | Trung bình thấp (phụ kiện chức năng quốc phong cực đơn giản) |
| Hệ thống đô thị cyber | Ra mắt chính thức công việc đô thị | Trang điểm công việc đô thị | Cột tóc nửa vương miện chức năng quốc phong | Lễ phục công việc quốc phong | Trung bình (phụ kiện chức năng quốc phong hoa quý tối giản) |
| Hệ thống đô thị cyber | Ra mắt lễ hội toàn ảnh đô thị | Trang điểm quý phái cung đình/trang điểm dòng chảy cyber | Búi tóc chức năng cao quốc phong | Lễ phục lễ hội cyber quốc phong | Rất nhiều (phụ kiện kết hợp quốc phong + cyber hoa quý) |
| Hệ thống đô thị cyber | Đi đêm đô thị/nhiệm vụ chức năng | Trang điểm lạnh chức năng | Đuôi ngựa cao quốc phong | Trang phục thường chức năng nhẹ quốc phong/trang phục chiến binh chức năng | Ít (chỉ có phụ kiện cố định chức năng) |
| Hệ thống đô thị cyber | Hẹn hò nghỉ ngơi đô thị | Trang điểm hoa đào lãng mạn/trang điểm dòng chảy cyber | Bện tóc nửa cơ khí quốc phong | Trang phục thường đi làm quốc phong/trang phục thường chức năng nhẹ | Trung bình (phụ kiện quốc phong ánh sáng nhỏ) |
| Hệ thống đô thị cyber | Cảnh riêng tư ban đêm | Trang điểm nhẹ thanh nhã | Tóc xõa/đuôi ngựa thấp | Trang phục ngủ chức năng quốc phong | Rất ít (không có phụ kiện thừa) |
| Hệ thống đô thị cyber | Nghi lễ cưới lớn đô thị | Trang điểm cưới lớn | Búi tóc chức năng cao quốc phong | Lễ phục cưới lớn cyber quốc phong | Rất nhiều (phụ kiện kết hợp quốc phong + cyber đầy đủ) |

---

> **🔍 Quy tắc suy luận cho cảnh chưa được bao phủ (Thông dụng cho hai cảnh)**
>
> Khi mô tả cảnh/tình huống của người dùng không có trong bảng trên, dựa trên gene cốt lõi phong cách này để tự suy luận, **trước tiên khóa hệ thống cảnh cổ phong/đô thị, sau đó phù hợp quy tắc chiều tương ứng**:
>
> | Chiều suy luận | Gene cốt lõi hệ thống cổ phong | Gene cốt lõi hệ thống đô thị cyber |
> |---|---|---|
> | Cường độ trang điểm | Mặc định trang điểm nhẹ thanh nhã; cung đình/quyền lực/chính thức → trang điểm quý phái cung đình; rung động/ngọt ngào → trang điểm hoa đào lãng mạn; đại hôn/nghi lễ → trang điểm cưới lớn; lễ hội tụ hội → trang điểm lễ hội | Mặc định trang điểm đi làm đô thị; công việc/chính thức → trang điểm công việc đô thị; rung động/ngọt ngào → trang điểm hoa đào lãng mạn; lễ hội/đại hôn → trang điểm quý phái cung đình; cyber/chức năng/đi đêm → trang điểm dòng chảy cyber/trang điểm lạnh chức năng |
> | Kiểu tóc | Hàng ngày/nội thất → nửa cột tóc hoặc búi tóc thả; cung đình/chính thức/lễ hội → búi tóc cao; riêng tư/ban đêm → tóc xõa; tập võ/hành động → cột tóc đuôi ngựa cao | Hàng ngày/đi làm → đuôi ngựa thấp nửa cột; công việc/chính thức → cột tóc nửa vương miện chức năng; lễ hội/đại hôn → búi tóc chức năng cao; riêng tư/ban đêm → tóc xõa/đuôi ngựa thấp; chức năng/hành động → đuôi ngựa cao |
> | Trang phục | Hình thức truyền thống Trung Quốc là cốt lõi tuyệt đối; cảnh cảm xúc → váy dài áo dài bay bổng; quyền lực/chính thức → lễ phục cung đình; hành động → trang phục thường tiện lợi; vật liệu PBR luôn khóa; họa tiết truyền thống thuần Trung Quốc là mặc định | Hình thức cốt lõi Trung Quốc là nền tảng tuyệt đối; hàng ngày/đi làm → trang phục thường đi làm quốc phong; công việc/chính thức → lễ phục công việc quốc phong; hành động/chức năng → trang phục thường chức năng nhẹ; vật liệu PBR luôn khóa; kết hợp họa tiết truyền thống và họa tiết mạch điện là mặc định |
> | Phụ kiện phong phú | Hàng ngày → trung bình; chính thức/cung đình → rất nhiều; riêng tư → rất ít; hành động → ít; phụ kiện truyền thống Trung Quốc thuần là cốt lõi | Hàng ngày → trung bình thấp; công việc/lễ hội → rất nhiều; riêng tư → rất ít; hành động → ít; phụ kiện kết hợp quốc phong + cyber là cốt lõi, hiệu ứng ánh sáng có thể kiểm soát |
> | Cơ sở chất cảm | Vật liệu PBR + ánh sáng mềm mại điện ảnh luôn khóa; cảm giác thể tích và ánh sáng ưu tiên hơn cảm giác trang trí phẳng; không hiệu ứng ánh sáng cyber (không có dấu hiệu rõ ràng cấm sử dụng) | Vật liệu PBR + ánh sáng điện ảnh luôn khóa; cảm giác thể tích và ánh sáng ưu tiên hơn cảm giác trang trí phẳng; hiệu ứng ánh sáng cyber là dải neon nhỏ nhúng có thể kiểm soát, cấm quá sáng; kết hợp sâu yếu tố quốc phong và cyber, không có cảm giác chia cắt |

## Tám, Quy định thiết lập tứ giác nhìn (Thông dụng cho hai cảnh · Tiêu chuẩn 3D thống nhất)

> Sau khi chồng lớp trang phục và hóa trang vẫn cần xuất ra hình tứ giác nhìn thiết lập, đảm bảo sự nhất quán hoàn toàn của trang phục, hóa trang, hoa văn, hiệu ứng ánh sáng cyber, cấu trúc ở các góc độ khác nhau, thông dụng cho cảnh cổ phong/đô thị.

### Định nghĩa hình nhìn

| Vị trí | Hình nhìn | Góc độ | Phạm vi cảnh | Yêu cầu | Từ khóa |
|---|---|---|---|---|---|
| Trái nhất | Cận cảnh chân dung | Trực diện 0° | Từ khuôn mặt đến xương đòn | Khuôn mặt chiếm hơn 60%, chi tiết ngũ quan/trang điểm/hiệu ứng trang điểm rõ ràng 100% | cận cảnh chân dung, chi tiết khuôn mặt, chi tiết trang điểm |
| Trái hai | Hình nhìn trực diện | Trực diện 0° | Toàn thân đứng | Đối diện máy ảnh, toàn cảnh trang phục phía trước, vị trí cấu trúc/hoa văn/dải ánh sáng rõ ràng | hình nhìn trước, dấu chiều cao, chi tiết trang phục |
| Phải hai | Hình nhìn cạnh | Bên phải 90° | Toàn thân đứng | Hình dáng cạnh thuần túy, lớp cạnh trang phục, hình dáng cạnh cấu trúc rõ ràng | hình nhìn cạnh, hình dáng cạnh, dấu chiều cao, chi tiết hình dáng cạnh trang phục |
| Phải nhất | Hình nhìn sau | Phía sau 180° | Toàn thân đứng | Phụ kiện tóc sau đầu/trang phục phía sau/đuôi tóc/hình dáng cấu trúc phía sau rõ ràng | hình nhìn sau, hình nhìn phía sau, dấu chiều cao, chi tiết trang phục phía sau |

### Quy tắc hình ảnh (Thông dụng cho hai cảnh · Không thể vượt qua)

| Dự án | Ràng buộc |
|---|---|
| Bố cục | Cùng một hình ảnh từ trái sang phải sắp xếp tứ giác nhìn, thông dụng cho cảnh cổ phong/đô thị |
| Nền | Màu xám nhạt #B8B8B8, **cấm thêm bất kỳ yếu tố cảnh/môi trường/thời tiết nào**, thông dụng cho cảnh cổ phong/đô thị |
| Tư thế đứng | Đứng tự nhiên, hai chân song song hơi phân, hai tay thả tự nhiên hoặc hơi dang ( **cấm bất kỳ thay đổi tư thế nào** ), thông dụng cho cảnh cổ phong/đô thị |
| Biểu cảm | Biểu cảm nhẹ phù hợp với phong cách trang điểm, chỉ giới hạn ở biểu cảm khuôn mặt, không liên quan đến động tác cơ thể, thông dụng cho cảnh cổ phong/đô thị |
| Ánh sáng | Tiêu chuẩn chung: ánh sáng mềm đồng đều, ánh sáng chính phía trước + ánh sáng bổ sung hai bên, không có bóng cứng; cảnh đô thị cyber có thể thêm ánh sáng phản chiếu tự phát có thể kiểm soát, không phá vỡ sự thống nhất ánh sáng tổng thể, không quá sáng |
| Nhất quán | Trang phục/hóa trang/kiểu tóc/phụ kiện/hoa văn/hiệu ứng ánh sáng/cấu trúc trong tứ giác nhìn hoàn toàn nhất quán, không có bất kỳ sai lệch nào |
| Tỷ lệ hình ảnh | Khuyến nghị 4:1 hoặc 3:1, thông dụng cho cảnh cổ phong/đô thị |
| Tiêu chuẩn 3D | Mô hình hóa độ chính xác cao thống nhất toàn cảnh, vật liệu PBR, độ phân giải siêu cao 8K, ánh sáng điện ảnh, cảnh cổ phong/đô thị không có sự khác biệt chất cảm |

---

## Chín, Mẫu từ khóa (Thích ứng một chạm cho hai cảnh · Chuyên dụng cho 3D quốc phong cyber)

### Ràng buộc định dạng xuất (Thông dụng cho hai cảnh · Quy tắc sắt)

| Dự án | Ràng buộc |
|---|---|
| Nội dung xuất | **Chỉ xuất văn bản từ khóa**, không xuất bất kỳ nội dung nào khác |
| Cấm xuất | Bảng tra cứu nhanh, phương án cấu trúc phân lớp, bảng ràng buộc hình ảnh, bảng cấm, phương án phát sinh, đề xuất xuất, bảng yếu tố cốt lõi và mọi nội dung không phải từ khóa khác |
| Cấm cảnh | Tài sản phát sinh nhân vật **không bao gồm mô tả cảnh/môi trường**, không xuất bất kỳ nội dung cảnh/môi trường/thời tiết/nền kể chuyện nào (cảnh thuộc phạm vi tài sản cảnh) |
| Cấm đạo cụ | **Không bao gồm bất kỳ tương tác đạo cụ nào**, không xuất ô/kiếm/quạt/sách/đèn lồng/cốc rượu và các vật dụng cầm tay hoặc tương tác (đạo cụ thuộc phạm vi tài sản đạo cụ) |
| Cấm thay đổi tư thế | **Không thay đổi tư thế mô hình gốc**, không xuất đi bộ/quay đầu/nâng tay/nghiêng người/chạy và bất kỳ động tác hoặc thay đổi thể trạng nào, duy trì đứng tự nhiên |
| Định dạng | Trực tiếp xuất mã từ khóa có thể sử dụng, không cần tiêu đề, bảng, giải thích, so sánh phương án |

### Chồng lớp trang phục và hóa trang hoàn chỉnh (Tứ giác nhìn · Thích ứng một chạm cho hai cảnh)

```
Lấy hình ảnh cơ bản của nhân vật làm hình nền, img2img chồng lớp trang phục và hóa trang,
Phong cách 3D quốc phong cyber, {hệ thống cảnh: cổ phong/đô thị cyber}, mô hình hóa độ chính xác cao, vật liệu PBR, mỹ học Trung Quốc cốt lõi, {hòa nhập nhẹ nhàng cổ phong/hòa nhập chức năng đô thị}, ánh sáng điện ảnh,
Hình tứ giác nhìn thiết lập nhân vật quốc phong cyber {giới tính}, 3D render, mô hình hóa độ chính xác cao, 8K, siêu thực
thiết kế nhân vật, tứ giác nhìn nhân vật,
Giữ khuôn mặt hoàn toàn giống hình ảnh cơ bản, tư thế đứng tự nhiên không thay đổi, {khí chất tổng thể},
【L1·Trang điểm】Quyết định dựa trên dấu hiệu người dùng: {trang điểm cơ bản/trang điểm nhẹ/trang điểm chính thức/trang điểm đi làm đô thị/trang điểm công việc/trang điểm chức năng cyber}; sử dụng {phong cách trang điểm}, vật liệu PBR render, {trang điểm lông mày}, {trang điểm mắt}, {trang điểm môi}, {hiệu ứng ánh sáng neon nhỏ có thể kiểm soát/mạch điện tiếp xúc da (thêm theo nhu cầu)},
【L2·Kiểu tóc】{loại hình tạo kiểu}, tóc mịn độ chính xác cao rõ nét, {mô tả phụ kiện tóc}, hình thức quốc phong cốt lõi,
【L3+L4·Trang phục】{màu chủ đạo}{kiểu dáng}, {chất liệu}, {công nghệ trang trí}, {hoa văn truyền thống/kết hợp hoa văn truyền thống và hoa văn mạch điện}, chất cảm quần áo rõ nét, vật liệu PBR render, {dải ánh sáng neon nhỏ nhúng có thể kiểm soát (thêm theo nhu cầu)},
【L5·Phụ kiện】{phụ kiện đầu}, {khuyên tai}, {vòng cổ}, {phụ kiện thắt lưng}, {phụ kiện tay}, hình thức quốc phong cốt lõi, thống nhất với phong cách trang phục và hóa trang,
Cùng một hình ảnh từ trái sang phải sắp xếp: cận cảnh chân dung + hình nhìn trực diện + hình nhìn cạnh + hình nhìn sau,
Đứng tự nhiên, nền màu xám nhạt, ánh sáng mềm đồng đều, không có bóng cứng, {hiệu ứng ánh sáng cyber có thể kiểm soát không chói mắt (thêm theo nhu cầu)},
Trang phục/hóa trang/kiểu tóc/trang phục/phụ kiện/hoa văn/hiệu ứng ánh sáng trong tứ giác nhìn hoàn toàn nhất quán, mô hình hóa 3D quốc phong cyber rõ nét, mô hình hóa độ chính xác cao rõ nét,
Không có bất kỳ chữ viết nào trong hình
```

---

## Mười, Quy tắc ràng buộc (Thông dụng cho hai cảnh · Phải tuân thủ + Quy tắc sắt cấm)

### Quy tắc phải tuân thủ (Thực hiện 100%, không có ngoại lệ)

| Số hiệu | Quy tắc |
|---|---|
| R1 | Sau khi chồng lớp, khuôn mặt phải hoàn toàn giống với mô hình gốc, cấm bất kỳ lệch ngũ quan, biến dạng, thay đổi phong cách hóa nào |
| R2 | Trang phục phải sử dụng "chất cảm quần áo rõ nét + vật liệu PBR render", yếu tố cyber không được phá vỡ chất cảm cơ bản của trang phục và hình thức cốt lõi quốc phong |
| R3 | Toàn cảnh phải lấy hình thức quốc phong Trung Quốc làm cốt lõi tuyệt đối, cảnh cổ phong hoàn toàn truyền thống quốc phong, cảnh đô thị không được mất nền tảng quốc phong, cấm hoàn toàn thiết kế thuần phương Tây không có lõi quốc phong |
| R4 | Phong cách trang điểm/kiểu tóc/trang phục/phụ kiện/yếu tố cyber phải hoàn toàn thống nhất, cấm hoàn toàn sự đối lập giữa yếu tố quốc phong và cyber |
| R5 | Phải xuất ra hình tứ giác nhìn thiết lập (cận cảnh chân dung + hình nhìn trực diện + hình nhìn cạnh + hình nhìn sau), thông dụng cho cảnh cổ phong/đô thị |
| R6 | Phải chỉ định "nền màu xám nhạt", cấm thêm bất kỳ yếu tố cảnh/môi trường/thời tiết nào, thông dụng cho cảnh cổ phong/đô thị |
| R7 | Phải chỉ định "nhất quán tứ giác nhìn", tất cả trang phục, hoa văn, hiệu ứng ánh sáng cyber, cấu trúc trong tứ giác nhìn phải hoàn toàn thống nhất |
| R8 | **Chỉ xuất từ khóa**——cấm xuất bất kỳ nội dung nào không phải từ khóa như bảng tra cứu nhanh/phương án cấu trúc phân lớp/bảng ràng buộc hình ảnh/bảng cấm/phương án phát sinh/đề xuất xuất |
| R9 | **Cấm bao gồm mô tả cảnh**——tài sản phát sinh nhân vật không liên quan đến cảnh/môi trường/thời tiết/nền kể chuyện, cảnh thuộc loại tài sản độc lập |
| R10 | **Cấm tương tác đạo cụ**——không bao gồm bất kỳ vật cầm tay/tương tác nào (ô/kiếm/quạt/sách/đèn lồng/cốc rượu và các vật dụng khác), đạo cụ thuộc loại tài sản độc lập, ngoại trừ phụ kiện cố định thắt lưng |
| R11 | **Tư thế không thay đổi**——phải giữ tư thế đứng tự nhiên của mô hình gốc, cấm bất kỳ động tác/thay đổi thể trạng/tư thế nào |
| R12 | **L1 phải phân tích trước khi quyết định**——trước tiên phân tích dấu hiệu cảnh người dùng, dấu hiệu khuôn mặt, dấu hiệu phong cách, sau đó phù hợp hệ thống tương ứng, xác định mức độ trang điểm |
| R13 | **Tất cả tài sản phát sinh đều cần trang điểm**——trong điều kiện bình thường không giữ mặt mộc, ít nhất sử dụng trang điểm cơ bản |
| R14 | **Cường độ trang điểm có kiểm soát**——dù trang điểm cũng cần kiềm chế, không được xuất hiện trang điểm đậm hiện đại/trang điểm màu sắc quá đáng/hiệu ứng ánh sáng cyber quá sáng |
| R15 | **Đạo cụ/cảnh/động tác không làm cơ sở nâng cấp cường độ**——chỉ dựa vào thông tin đạo cụ, môi trường, động tác không được nâng cấp trang điểm cơ bản thành trang điểm mạnh hơn |
| R16 | **Quy tắc thích ứng hai cảnh**——khi không có dấu hiệu cyber/đô thị rõ ràng, mặc định tương thích với tạo dựng thuần cổ phong; khi có dấu hiệu rõ ràng, phù hợp hệ thống đô thị cyber, không được tự ý chuyển đổi |
| R17 | **Yếu tố cyber bị kiểm soát nghiêm ngặt**——chỉ hệ thống cyber đô thị có thể sử dụng hiệu ứng ánh sáng cyber/yếu tố chức năng, cảnh cổ phong không có dấu hiệu rõ ràng cấm sử dụng; tất cả yếu tố cyber phải kết hợp sâu với quốc phong, cấm chia cắt |
| R18 | **Yếu tố cyber chỉ giới hạn trong phạm vi trang phục và hóa trang**——cấu trúc chức năng, yếu tố ánh sáng chỉ giới hạn trong cấp độ trang phục và hóa trang, không được thay đổi cấu trúc khuôn mặt, cơ thể và thể trạng cơ bản của mô hình gốc |
| R19 | **Chất cảm 3D thống nhất toàn cảnh**——cảnh cổ phong/đô thị phải giữ tiêu chuẩn mô hình hóa độ chính xác cao, vật liệu PBR, ánh sáng điện ảnh thống nhất, không được xuất hiện giảm chất cảm |

### Quy tắc cấm nghiêm ngặt (Cấm 100%, không có ngoại lệ)

| Số hiệu | Cấm nghiêm ngặt |
|---|---|
| X1 | Sau khi chồng lớp, khuôn mặt lệch, ngũ quan biến dạng, không giống mô hình gốc |
| X2 | Trang phục mất hình thức cốt lõi quốc phong, xuất hiện thiết kế thuần phương Tây không có lõi Trung Quốc, trang phục chức năng thuần, thiết kế cyber punk phương Tây thuần |
| X3 | Phong cách trang điểm/trang phục/yếu tố cyber xung đột, xuất hiện cảm giác chia cắt, đối lập giữa yếu tố quốc phong và cyber |
| X4 | Phức tạp nền cảnh (phải là màu thuần), cấm thêm bất kỳ yếu tố môi trường/cảnh/thời tiết nào |
| X5 | Trang phục, hóa trang, hoa văn, hiệu ứng ánh sáng cyber, cấu trúc không nhất quán trong tứ giác nhìn |
| X6 | Xuất bất kỳ nội dung nào không phải từ khóa (bảng/phương án/đề xuất/giải thích/biến thể và các nội dung khác) |
| X7 | Thêm mô tả cảnh trong tài sản phát sinh nhân vật (cảnh phố/cảnh mưa/nội thất/phố/thời tiết và các yếu tố môi trường khác) |
| X8 | Xuất "bảng yếu tố cốt lõi tra cứu nhanh", "phương án cấu trúc phân lớp", "bảng ràng buộc hình ảnh", "bảng cấm", "phương án phát sinh" và các chương khác |
| X9 | Thêm bất kỳ tương tác đạo cụ nào (vật cầm tay ô/kiếm/quạt/sách/đèn lồng/cốc rượu và các vật dụng khác) |
| X10 | Thay đổi tư thế mô hình gốc (đi bộ/quay đầu/nâng tay/nhìn nghiêng/chạy/cúi đầu/nghiêng đầu và các mô tả động tác khác) |
| X11 | Thêm mô tả liên kết biểu cảm và tư thế (như "nghiêng người 45° đi bộ, môi hơi nhếch" và các mô tả kể chuyện khác) |
| X12 | Không phân tích dấu hiệu người dùng đã trực tiếp áp dụng trang điểm/yếu tố cyber cố định, tự ý chuyển đổi hệ thống cổ phong/đô thị |
| X13 | Giữ mặt mộc không đúng, khiến tài sản phát sinh thiếu trang điểm cần có |
| X14 | Chỉ dựa vào từ đạo cụ/cảnh/động tác mà nâng cấp sai trang điểm, dẫn đến quyết định cường độ trang điểm sai |
| X15 | Cảnh cổ phong không có dấu hiệu rõ ràng, tự ý thêm hiệu ứng ánh sáng cyber/yếu tố chức năng, phá vỡ không khí cổ phong |
| X16 | Hiệu ứng ánh sáng neon quá sáng, chói mắt, phủ diện rộng, phá vỡ chất cảm hình ảnh và chi tiết khuôn mặt, trang phục |
| X17 | Tự ý thay đổi cấu trúc cơ thể mô hình gốc, hình thái ngũ quan, thêm cải tạo cơ thể không thuộc phạm vi trang phục và hóa trang, trang trí cơ thể |
| X18 | Cảnh đô thị mất nền tảng quốc phong, xuất hiện phong cách cyber punk phương Tây thuần, rời xa hình thức cốt lõi Trung Quốc |
| X19 | Xuất hiện thiết kế cyber punk phương Tây không phù hợp, không phù hợp với thẩm mỹ phương Đông, trái với cốt lõi mỹ học quốc phong |

---

## ✅ Hoàn thành kiểm tra
1. **Thích ứng 100% hai cảnh**: Hoàn thành xây dựng "hệ thống truyền thống cổ phong" + "hệ thống cyber đô thị" hai bộ quy tắc song song, khi không có dấu hiệu cyber rõ ràng, có thể tạo ra nội dung cổ phong thuần hoàn hảo, khi có dấu hiệu đô thị, có thể tạo ra nội dung cyber quốc phong chính xác, không xung đột
2. **Nền tảng quốc phong không lệch**: Toàn bộ cẩm nang xuyên suốt "hình thức Trung Quốc là cốt lõi tuyệt đối", cảnh cyber đô thị tất cả trang phục, kiểu tóc, phụ kiện đều giữ lại lõi quốc phong, không có sự lệch hướng cyber phương Tây thuần túy
3. **Hòa nhập cyber có thể kiểm soát**: Yếu tố cyber chia thành "phiên bản nhẹ có thể lựa chọn" và "phiên bản tăng cường đô thị", ranh giới rõ ràng, không xuất hiện vấn đề cyber hóa quá mức cảnh cổ phong, mất quốc phong cảnh đô thị
4. **Tiêu chuẩn 3D thống nhất**: Cảnh cổ phong/đô thị sử dụng chung một bộ tiêu chuẩn render 3D độ chính xác cao, vật liệu PBR, ánh sáng, mô hình hóa không có sự khác biệt, đảm bảo hiệu quả tạo ra ổn định
5. **Ràng buộc cốt lõi không bỏ sót**: Hoàn toàn giữ lại quy tắc cốt lõi "khuôn mặt không đổi, tư thế không đổi, có thể kiểm soát từng lớp, phạm vi chỉ thuộc trang phục và hóa trang" của cẩm nang gốc, tối ưu hóa không phá vỡ logic nền tảng của cẩm nang gốc
6. **Bao phủ toàn cảnh không có góc chết**: Hoàn thành tổ hợp trang phục và hóa trang cảnh cổ phong + đô thị toàn cảnh, quy tắc suy luận, mẫu từ khóa, có thể sử dụng trực tiếp, không cần điều chỉnh lần thứ hai