---
name: director_planning_style
description: Quốc phong 3D ràng buộc — Định nghĩa phong cách 3D Quốc phong trong hệ thống màu sắc, chương trình ánh sáng và bóng tối, hướng chất liệu, yếu tố không gian cảnh, lựa chọn nhạc cụ và âm thanh môi trường trên các ràng buộc toàn cầu. Áp dụng cho bất kỳ loại hình tự sự nào.
metaData: director_skills
---

# Quốc phong 3D ràng buộc · Quốc phong 3D · Kỹ pháp tham khảo

---

## Một, Hệ thống màu sắc và nền tảng hình ảnh

- **Nền tảng màu sắc** — Toàn bộ phim sử dụng nguyệt bạch (C1), thanh lục (C2), điến lam (C4) làm màu nền, nhiệt độ màu tổng thể nghiêng về trung tính (4800-5500K), độ bão hòa trung bình cao (55-75%), thể hiện tông màu trang nhã và khí phách của thẩm mỹ phương Đông truyền thống
- **Bảng màu cảm xúc dẫn động** — Sáu bộ bảng màu cảm xúc (cung đình hoa quý/sơn thủy ý cảnh/khuê các ôn nhu/ võ hiệp tú sát/lễ hội vui mừng/nguyệt dạ thanh u) tương ứng với các đoạn tự sự khác nhau, việc chuyển đổi bảng màu phải đồng bộ với đường cong câu chuyện
- **Tương phản tự sự nóng lạnh** — Màu nóng (chu hồng C3, kim hoàng C5, yên chi C7, đằng hoàng C9) làm tín hiệu thị giác cho sự chuyển hướng tự sự, dùng cho đoạn cảm xúc tăng nhiệt và vui mừng; màu lạnh (điến lam C4, mực đen C6) dùng cho đoạn tú sát, u sầu, thanh u
- **Nguyên tắc bảng màu trước tiên** — Việc lập kế hoạch cho đoạn cần gắn liền với cảnh cảm xúc (cung đình hoa quý/sơn thủy ý cảnh/khuê các ôn nhu/ võ hiệp tú sát/lễ hội vui mừng/nguyệt dạ thanh u, v.v.), sau đó xác định màu chính + màu phụ và chương trình ánh sáng, tránh "cốt truyện đúng nhưng cảm xúc không đúng màu"
- **Cấm sử dụng dải màu** — Màu huỳnh quang bão hòa cao, màu neon, hệ thống màu sắc số hóa hiện đại đều không tương thích với phong cách này

---

## Hai, Hệ thống chương trình ánh sáng và bóng tối

- **Ánh sáng và bóng tối là tự sự** — 7 chương trình ánh sáng và bóng tối tương ứng với các đoạn cảm xúc khác nhau, giai đoạn lập kế hoạch của đạo diễn cần xác định hướng đi nền tảng ánh sáng và bóng tối ở cấp độ đoạn, không phải chỉ định từng khung hình
- **Đặc điểm ánh sáng và bóng tối của 3D render** — Ánh sáng thể tích, che giấu ánh sáng môi trường (AO), làm mờ độ sâu trường ảnh là các phương tiện ánh sáng và bóng tối cốt lõi của phong cách 3D Quốc phong, tất cả các chương trình ánh sáng và bóng tối phải thể hiện cảm giác chất liệu vật lý PBR

| Chương trình ánh sáng | Tên chương trình | Khuynh hướng màu sắc | Cảm xúc áp dụng |
|---|---|---|---|
| A | Ấm sáng hoa mỹ | Chu hồng + điểm sáng kim hoàng + nền nguyệt bạch | Cung đình hoa quý, trang nghiêm khí phái, vui mừng lớn |
| B | Thanh lục ý cảnh | Thanh lục + sương mù nguyệt bạch + khuếch tán ánh sáng thể tích | Sơn thủy ý cảnh, thơ mộng xa vời, không linh phiêu diêu |
| C | Mềm sáng ấm bóng | Tông ấm yên chi + điểm xuyết kim hoàng + bóng tối mềm mại | Khuê các ôn nhu, mềm mại tinh tế, ấm áp thường ngày |
| D | Lạnh tông tú sát | Mực đen + điến lam + tương phản ánh sáng cứng | Võ hiệp tú sát, lạnh lùng sắc bén, không khí áp bức |
| E | Màn cửa khuếch tán | Nền nguyệt bạch + ánh sáng bên tự nhiên + che giấu ánh sáng môi trường | Nội thất ban ngày, sinh hoạt thường ngày, yên tĩnh thanh nhã |
| F | Nguyệt dạ thanh huy | Điến lam + ánh sáng lạnh nguyệt bạch + điểm xuyết ánh sáng ấm kim hoàng | Nguyệt dạ thanh u, yên tĩnh mỹ lệ, suy tư một mình |
| G | Lễ hội ấm sáng | Chu hồng + đằng hoàng + ánh sáng ấm bão hòa cao | Lễ hội, rộn ràng vui vẻ, màu sắc phong phú |

- **Phân bố ánh sáng lạnh và nóng** — Ánh sáng màu nóng (chu hồng/kim hoàng/đằng hoàng) áp dụng cho đoạn hoa quý, ôn nhu, vui mừng; ánh sáng màu lạnh (điến lam/mực đen) áp dụng cho đoạn tú sát, u sầu, thanh u. Đạo diễn có thể điều chỉnh điểm chuyển đổi lạnh nóng theo nhu cầu tự sự
- **Hướng không khí ánh xạ** — Hướng không khí của mỗi cảnh cần có thể ánh xạ đến một trong những hướng của các chương trình ánh sáng và bóng tối trên (A-G), đảm bảo tính nhất quán về mặt thị giác

---

## Ba, Hướng chất liệu

- **3D render là mỏ neo** — Cốt lõi của 3D Quốc phong: mô hình hóa chính xác cao, render chất liệu PBR, ánh sáng thể tích, che giấu ánh sáng môi trường, làm mờ độ sâu trường ảnh, thể hiện hình ảnh render 3D cấp độ điện ảnh
- **Chất liệu PBR là trên hết** — Tất cả các chất liệu trang phục và đạo cụ phải được render vật lý PBR đáng tin cậy: ánh sáng và rủ của lụa, vân và patina của gỗ, phản quang và chất liệu của kim loại, độ trong suốt và ấm áp của ngọc, ánh sáng men của sứ
- **Ánh sáng thể tích và độ sâu trường ảnh** — Ánh sáng thể tích là linh hồn của hình ảnh 3D Quốc phong: cảnh ngoài trời phải có hiệu ứng thị giác không khí và khuếch tán ánh sáng thể tích, cảnh trong nhà tạo hiệu ứng ánh sáng thể tích qua ánh sáng cửa sổ/nến; làm mờ độ sâu trường ảnh tăng cường độ sâu không gian
- **Chất liệu thời gian** — Chất liệu không thể quá sạch sẽ hoàn hảo: bề mặt gỗ có dấu vết sử dụng, bề mặt đá có vân phong hóa và rêu xanh, vải có nếp nhăn tự nhiên, ngói có dấu vết rêu phong. Cấm "cảm giác nhựa" và "cảm giác CG" hoàn toàn mới không tì vết
- **3D không đồng nghĩa với lạnh lẽo** — 3D Quốc phong nhấn mạnh cảm giác ấm áp của thẩm mỹ phương Đông, truyền tải cảm xúc qua cảm giác chất liệu, tầng lớp ánh sáng và bóng tối, phối màu, không phụ thuộc vào hiệu ứng kỳ quan

---

## Bốn, Yếu tố không gian cảnh cổ phong

Yếu tố cảnh đặc trưng của thế giới quan cổ phong và chức năng tự sự thị giác của chúng:

- **Màn lụa/bình phong/khung cửa** — Đạo cụ bố cục khung tự nhiên, tạo cảm giác tầng lớp "không nhìn thấu" và độ sâu không gian. Trong 3D render, hiệu ứng chất liệu bán trong suốt của màn lụa và ánh sáng xuyên qua là điểm nhấn của hình ảnh
- **Sân vườn/cây hoa/màn mưa** — Phương tiện tự nhiên của bố cục để trống, cảnh tức là tình: hoa nở đầy sân = thản nhiên, ngồi một mình trong mưa = cô đơn, lá rụng bay bay = ly sầu. Trong cảnh 3D, thể tích và sự tương tác ánh sáng và bóng tối của thực vật đặc biệt quan trọng
- **Ánh nến/ánh trăng/ánh sáng cửa sổ** — Phương tiện nguồn sáng của thế giới cổ phong, ánh nến = ấm áp/riêng tư (chương trình C), ánh trăng = lạnh/lặng lẽ (chương trình F), ánh sáng cửa sổ = thường ngày/yên tĩnh (chương trình E). Trong 3D render, hiệu ứng ánh sáng thể tích của nguồn sáng và phản xạ chất liệu PBR là chìa khóa
- **Mái vòm/đấu củng/ngói xanh** — Yếu tố đặc trưng của kiến trúc cổ phong, mô hình 3D cần thể hiện chi tiết tinh xảo của điêu khắc trạm trổ, chất liệu cần có cảm giác thời gian
- **Chuyển tiếp đoạn bằng cảnh không** — Phong cách này có tài sản cảnh phong phú (các biến thể thời gian khác nhau/thời tiết/mùa), khuyến nghị sử dụng cảnh không để đệm cảm xúc giữa các đoạn, không cắt cứng
- **Điểm chuyển hướng dùng hình ảnh thay vì lời thoại** — Ưu tiên sử dụng phương tiện hình ảnh (biến đổi đột ngột ánh sáng và bóng tối, cắt nhảy cảnh, ẩn dụ cảnh không) thay vì dựa vào lời thoại giải thích

---

## Năm, Nhạc cụ cổ phong và âm thanh môi trường

Ràng buộc yếu tố âm thanh trong thế giới quan cổ phong:

### Lựa chọn nhạc cụ

- **Tiêu** — Nhạc cụ cốt lõi cho đoạn u sầu, cô đơn, bi thương, thể hiện tốt nhất sự lạnh lẽo và ai oán
- **Nhị hồ** — Đoạn cảm xúc dữ dội, bi thương, nhớ nhung, cảm giác tiếng khóc của dây đàn kéo thích hợp cho sự bùng nổ cảm xúc
- **Sáo** — Đoạn cảm xúc dao động mạnh (đại bi đại hỉ, chuyển biến số phận, cao trào), sử dụng cẩn thận nhưng một khi dùng là như bom nguyên tử
- **Cổ cầm** — Định hình đầu đoạn / đoạn bình ổn, kết hợp với tiêu, thể hiện ý cảnh sơn thủy
- **Tỳ bà** — Điểm xuyết cho đoạn căng thẳng, gấp gáp, áp dụng cho cảnh võ hiệp tú sát
- **Cổ tranh** — Nhạc cụ không khí cho đoạn cung đình hoa quý, lễ hội vui mừng, sang trọng và thanh nhã
- Dàn nhạc dây nền có thể tăng cường cảm giác điện ảnh nhưng không nên lấn át

### Chiến lược kết hợp nhạc cụ

| Giai đoạn cảm xúc | Kết hợp nhạc cụ |
|---|---|
| Bình ổn/đầu đoạn/kết thúc | Cổ cầm độc tấu hoặc Cổ cầm + Tiêu |
| Sơn thủy ý cảnh/không linh | Tiêu + Cổ cầm + Sáo |
| Cung đình hoa quý/vui mừng | Cổ tranh + Biên chung + Dàn nhạc dây |
| Bi thương dần đậm | Tiêu + Nhị hồ |
| Bùng nổ cảm xúc/chuyển biến số phận | Sáo độc tấu hoặc Sáo + Nhị hồ |
| Võ hiệp tú sát/căng thẳng | Điểm xuyết Tỳ bà + Nền dàn nhạc dây |
| Ôn nhu thường ngày | Cổ cầm + Sáo + Dàn nhạc dây nhẹ |

### Âm thanh môi trường cổ phong

- **Tầng lớp âm thanh môi trường điển hình** — Tiếng ve kêu côn trùng hát / suối chảy rì rào / gió qua rừng trúc / phố phường ồn ào / mưa đêm nhỏ giọt / vải áo cọ xát / chuông gió khẽ vang / chim hót ríu rít / hoa rơi xào xạc
- **Mỗi cảnh đánh dấu 1-2 âm thanh môi trường cốt lõi**, giúp cho việc thiết kế âm thanh sau này. Tầng lớp âm thanh môi trường càng phong phú, cảnh cổ phong càng có cảm giác chìm đắm
