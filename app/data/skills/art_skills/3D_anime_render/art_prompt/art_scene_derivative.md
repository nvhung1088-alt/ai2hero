# 3D hoạt hình kết xuất đô thị cảnh phát sinh tài sản tạo · Sổ tay hạn chế

---

## Một, Nguyên tắc phát sinh

1. **Không gian nhất quán** — Cấu trúc/ Bố cục/ Chất liệu kiến trúc duy trì nhất quán trong tất cả các biến thể
2. **Định hướng cảnh quay** — Cùng một cảnh thông qua các cảnh quay khác nhau để hiển thị chức năng tường thuật khác nhau
3. **Chuyển đổi thời gian** — Cùng một không gian trong các thời gian khác nhau thể hiện ánh sáng và bóng tối khác nhau
4. **Thay đổi thời tiết** — Cùng một không gian trong các thời tiết khác nhau thể hiện cảm xúc khác nhau
5. **Cel-shade làm neo** — Tất cả các biến thể phải duy trì 3D hoạt hình kết xuất + phong cách cel-shade, từ chối cảm giác nhiếp ảnh thực tế/ hoạt hình CG; duy trì đặc điểm máy ảnh và sự nhất quán của ánh sáng và bóng tối
6. **Phong cách đô thị đồng nhất** — Tất cả các biến thể phải duy trì phong cách đô thị hiện đại, phối màu ấm

---

## Hai, Biến thể cảnh quay

### Định nghĩa cảnh quay

| Cảnh quay | Phạm vi | Chức năng tường thuật | Từ gợi ý |
|---|---|---|---|
| Toàn cảnh rộng | Toàn cảnh và môi trường xung quanh | Tạo cảm giác không gian, định vị | extreme wide shot, toàn cảnh rộng |
| Toàn cảnh | Hiển thị đầy đủ cảnh | Trình bày cấu trúc không gian | wide shot, toàn cảnh |
| Trung cảnh | Khu vực cục bộ của cảnh | Tập trung vào khu vực chức năng | medium shot, trung cảnh |
| Cận cảnh | Chi tiết của cảnh | Chụp cận cảnh chất liệu/ đạo cụ không khí | close shot, cận cảnh |
| Đặc tả | Chi tiết cực cục bộ | Kết cấu chất liệu/ đạo cụ quan trọng | extreme closeup, đặc tả |

### Quy chuẩn phát sinh cảnh quay

| Phát sinh từ hình tham chiếu | Giữ nguyên | Được phép thay đổi |
|---|---|---|
| Toàn cảnh rộng → Toàn cảnh | Ngoại thất kiến trúc, bố cục tổng thể | Góc nhìn hẹp, thêm tiền cảnh |
| Toàn cảnh → Trung cảnh | Chất liệu, tông màu, ánh sáng | Cắt tập trung, thay đổi chiều sâu |
| Trung cảnh → Cận cảnh | Chất liệu, tông màu | Chiều sâu cạn, mờ nền |
| Cận cảnh → Đặc tả | Kết cấu chất liệu | Chiều sâu cực cạn, cảm giác macro |

---

## Ba, Biến thể thời gian

### Định nghĩa thời gian

| Thời gian | Đặc điểm thị giác | Từ gợi ý |
|---|---|---|
| Sáng sớm | Sương mờ ánh sáng mềm, tông màu lạnh ấm đan xen (cel-shade) | Ánh sáng sáng sớm, sương mờ sáng sớm |
| Trưa | Sáng, bóng ngắn, màu sắc rõ nét (cel-shade) | Ánh sáng trưa, sáng rõ |
| Hoàng hôn | Tông màu vàng, bóng dài, bầu trời chuyển màu (cel-shade) | Ánh sáng hoàng hôn, golden hour |
| Ban đêm (ánh trăng) | Tông màu xanh lạnh, yên tĩnh (cel-shade) | Ánh sáng trăng, moonlight |
| Ban đêm (đèn sáng) | Điểm nhấn màu vàng ấm, đối lập sáng tối (cel-shade) | Đèn sáng, ánh nến |

### Quy chuẩn phát sinh thời gian

| Phát sinh từ thời gian tham chiếu | Giữ nguyên | Thay đổi |
|---|---|---|
| Ban ngày → Hoàng hôn | Kiến trúc/ Bố cục/ Chất liệu | Tông màu bầu trời ấm, bóng kéo dài (cel-shade) |
| Ban ngày → Ban đêm | Kiến trúc/ Bố cục/ Chất liệu | Tối đi, tăng không khí đèn/ ánh trăng (cel-shade) |
| Nội thất ban ngày → Nội thất ban đêm | Cấu trúc không gian, nội thất | Tông màu ấm, thêm yếu tố ánh nến/ đèn lồng (cel-shade) |

---

## Bốn, Biến thể thời tiết

### Định nghĩa thời tiết

| Thời tiết | Đặc điểm thị giác | Từ gợi ý |
|---|---|---|
| Trời nắng | Sáng, bóng rõ nét (cel-shade) | Trời nắng đẹp, ánh sáng tươi |
| Trời âm u | Ánh sáng đều, không bóng cứng (cel-shade) | Ánh sáng mềm, overcast |
| Sương mù | Tầm nhìn giảm, không khí mờ ảo (cel-shade) | Sương mờ, sương mù |
| Mưa nhỏ | Giọt nước, phản chiếu ẩm ướt, mưa nhẹ (cel-shade) | Mưa nhẹ như tơ, màn mưa nhẹ |
| Tuyết rơi | Phủ trắng, tuyết rơi (cel-shade) | Tuyết rơi, tuyết phủ |

### Quy chuẩn phát sinh thời tiết

| Phát sinh từ thời tiết tham chiếu | Giữ nguyên | Thay đổi |
|---|---|---|
| Nắng → Sương mù | Kiến trúc/ Bố cục | Thêm lớp sương, làm mờ viễn cảnh, giảm bão hòa (cel-shade) |
| Nắng → Mưa nhỏ | Kiến trúc/ Bố cục | Thêm sợi mưa, phản chiếu mặt đất, tông màu lạnh (cel-shade) |
| Nắng → Tuyết rơi | Kiến trúc/ Bố cục | Thêm tuyết phủ, tuyết rơi, tông màu trắng (cel-shade) |
| Thực vật cần thích ứng theo logic thời tiết | — | Hoa ẩm ướt trong mưa, cành khô trong tuyết (cel-shade) |

---

## Năm, Biến thể góc độ

### Định nghĩa góc độ

> Hình phát sinh so với hình tham chiếu, có thể chuyển đổi trên các chiều góc độ sau. Bên gọi sẽ truyền vào hình tham chiếu + mô tả góc độ mục tiêu, tài liệu này chỉ định nghĩa ngôn ngữ góc độ và hạn chế tính nhất quán.

| Góc độ | Mô tả | Từ gợi ý |
|---|---|---|
| Chính diện/ Trước mặt | So với hình tham chiếu, tầm nhìn hướng về phía trước cảnh | front view, eye level |
| Bên (Trái/ Phải) | Hướng về bên trái/ phải cảnh 90° tầm nhìn ngang | left side view / right side view |
| Mặt sau/ Sau lưng | Hướng về sau cảnh 180° | back view |
| Nhìn từ trên xuống | Nhìn từ trên cao, trình bày bố cục tổng thể | high angle, bird's eye view |
| Nhìn từ dưới lên | Nhìn từ thấp, nhấn mạnh chủ thể cao | low angle, worm's eye view |
| Tiến gần cận cảnh | Cùng hướng nhưng máy ảnh tiến gần, tập trung vào cục bộ | push-in, closer angle |
| Góc độ tự do | Mô tả góc độ tùy chỉnh của bên gọi | Chèn theo `{góc độ mục tiêu}` |

### Quy chuẩn phát sinh góc độ

| Dự án | Hạn chế |
|---|---|
| Nhất quán tham chiếu | Cấu trúc/ Bố cục/ Chất liệu/ Tông màu/ Ánh sáng/ Mùa/ Thời tiết phải nhất quán với hình tham chiếu (xử lý cel-shade) |
| Điểm nhìn | Cùng trung tâm cảnh, chỉ thay đổi góc độ; độ cao tầm nhìn có thể điều chỉnh theo góc độ |
| Logic ánh sáng | Hướng nguồn sáng hình tham chiếu không đổi, sau khi thay đổi góc độ, hướng ánh sáng và bóng cần đồng bộ tính toán lại (xử lý cel-shade) |
| Bố cục | Một hình duy nhất (không ghép hình, không đa góc nhìn, không chia màn hình) |
| Nhân vật | **Cấm xuất hiện bất kỳ nhân vật, bóng người, đường viền cơ thể nào** |
| Tỷ lệ hình ảnh | Mặc định 16:9 (hoặc theo thiết lập của bên gọi) |

---

## Sáu, Mẫu từ gợi ý
```
3D hoạt hình kết xuất, ánh sáng cấp điện ảnh, cảm giác cel-shade sống động, chất liệu chi tiết cao, không khí vui vẻ chữa lành, phong cách đô thị hoạt hình, chất liệu hoạt hình chi tiết cao, tỷ lệ hoạt hình vừa phải, phối màu ấm, 8K siêu HD, bố cục cấp điện ảnh, lớp ánh sáng mềm mại, phong cách kết xuất hoạt hình rõ nét, ấm áp chữa lành, hình phát sinh cảnh, dựa trên hình tham chiếu,
anime style, cel-shaded, 3D animation render,
film lighting, warm sunset lighting,
scene derivative design sheet, environment concept art, no people, no characters, no human figures,
Giữ cấu trúc không gian cảnh nhất quán,
{Góc độ mục tiêu (nếu có)}, {Cảnh quay góc nhìn (nếu có)}, {Mô tả thời gian (nếu có)}, {Mô tả thời tiết (nếu có)},
{Tiền cảnh}, {Trung cảnh}, {Hậu cảnh},
{Mô tả tông màu}, {Mô tả chiều sâu (nếu có)}, {Thay đổi tông màu bầu trời (nếu có)}, {Điều chỉnh không khí (nếu có)},
{Đặc điểm thị giác thời tiết (nếu có)}, {Thay đổi bề mặt chất liệu (nếu có)}, {Mô tả thích ứng thực vật (nếu có)},
Chất liệu có dấu vết sử dụng tự nhiên, mòn do cuộc sống, nếp gấp vải tự nhiên (cel-shade),
Ánh sáng tự nhiên khuếch tán, ánh sáng thể tích, hiệu ứng ánh sáng cel-shade, bóng cel-shade,
Không khí trong suốt, họa tiết rõ nét, xử lý cel-shade,
Bố cục một hình duy nhất, giữ cấu trúc/ chất liệu/ tông màu/ ánh sáng nhất quán với hình tham chiếu, chỉ thay đổi góc nhìn theo góc độ mục tiêu,
Hình không có bất kỳ nhân vật nào,
Phong cách kết xuất cel-shade, ánh sáng mềm mại, tỷ lệ hoạt hình vừa phải, chất liệu hoạt hình chi tiết cao,
Phối màu ấm, không khí hoàng hôn, không khí vui vẻ chữa lành,
8K siêu HD, bố cục cấp điện ảnh,
Trong hình không có bất kỳ chữ nào
```

> **Hướng dẫn sử dụng**: Dựa vào thông tin do người dùng cung cấp để tự xác định các chiều thay đổi cần áp dụng (góc độ/ cảnh quay/ thời gian/ thời tiết), các chiều không được đề cập thì để trống. Không cần tạo mẫu riêng cho từng biến thể.

---

## Bảy, Quy tắc hạn chế

### Bắt buộc tuân thủ

| Số | Quy tắc |
|---|---|
| R1 | Cấu trúc không gian cảnh phải nhất quán trong tất cả các biến thể |
| R2 | Biến thể thời gian phải điều chỉnh tông màu bầu trời và không khí (cel-shade) |
| R3 | Biến thể thời tiết phải thích ứng với thực vật/ bề mặt chất liệu (cel-shade) |
| R4 | Hình phát sinh phải là "một hình duy nhất", không được ghép nhiều góc nhìn/ ô lưới/ chia màn hình |
| R5 | Hình phát sinh phải giữ cấu trúc kiến trúc/ chất liệu/ tông màu/ ánh sáng nhất quán với hình tham chiếu, chỉ thay đổi điểm nhìn theo góc độ mục tiêu |
| R6 | Trong hình cảnh **cấm xuất hiện bất kỳ nhân vật nào** |
| R7 | Tùy theo thông tin do người dùng cung cấp để tự xác định các chiều thay đổi (góc độ/ cảnh quay/ thời gian/ thời tiết), các chiều không được đề cập thì để trống |
| R8 | Phải bao gồm từ khóa kết xuất hoạt hình 3D (cel-shaded, 3D animation render, anime style) |
| R9 | Phải bao gồm đặc điểm quang học máy ảnh (shallow depth of field / lens vignette / bokeh ít nhất một mục, xử lý cel-shade) |
| R10 | Chất liệu phải có dấu vết mòn tự nhiên/ dấu vết thời gian, cấm cảm giác "CG" mới nguyên không tì vết, nhưng phải hiển thị cel-shade |
| R11 | Phải giữ sự nhất quán phong cách kết xuất cel-shade, không được trộn các yếu tố thực tế |
| R12 | Phải bao gồm phối màu ấm, từ khóa không khí hoàng hôn |
| R13 | Phải bao gồm từ khóa 8K siêu HD, bố cục cấp điện ảnh |
| R14 | Phải bao gồm từ khóa ánh sáng cấp điện ảnh, không khí vui vẻ chữa lành |

### Nghiêm cấm

| Số | Nghiêm cấm |
|---|---|
| X1 | Cấu trúc/ Bố cục kiến trúc không nhất quán giữa các biến thể |
| X2 | Thời tiết và mùa mâu thuẫn (như tuyết rơi mùa hè, trong giới hạn cel-shade) |
| X3 | Sự thay đổi đột ngột của chất liệu/ phong cách giữa các biến thể |
| X4 | Xuất hiện bất kỳ nhân vật, bóng người, đường viền cơ thể nào |
| X5 | Hình bị ghép thành nhiều góc nhìn/ ô lưới/ chia màn hình |
| X6 | Cảm giác kết xuất 3D/ hoạt hình CG/ hoạt hình/ động cơ trò chơi (cấm sử dụng các từ như 3D render, CGI, Unreal Engine, Unity, nhưng cần rõ ràng kết xuất hoạt hình cel-shade) |
| X7 | Chất liệu quá sạch đẹp hoàn hảo, không có bất kỳ dấu vết sử dụng và thời gian (tránh cảm giác "nhựa"), cần xử lý cel-shade |
| X8 | Ánh sáng quá đều, không có chiều sâu mờ, không có đặc điểm quang học máy ảnh |
| X9 | Sử dụng thuật ngữ nhiếp ảnh thực tế (như real photography, photorealistic, RAW photo, etc.) |
| X10 | Yếu tố cổ đại/ tương lai, không phải phong cách đô thị hiện đại |
| X11 | Tông màu lạnh/ tông màu chủ đạo ban đêm, không phải tông màu ấm/ không khí hoàng hôn |
| X12 | Thiếu từ khóa không khí vui vẻ chữa lành |