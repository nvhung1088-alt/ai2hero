---
name: liveaction_urban_storyboard_table
description: Bảng phân cảnh giới hạn đô thị thực tế — Định nghĩa quy tắc ánh sáng và bóng tối của phong cách đô thị thực tế trong bảng phân cảnh, chất lượng quay phim, nhịp độ hành động, động lực môi trường, cấm di chuyển và chuyển cảnh, và điều chỉnh sâu cho Seedance 2.0. Áp dụng cho bất kỳ loại hình kể chuyện đô thị nào.
metaData: director_skills, seedance2.0_adapted
---

# Bảng phân cảnh giới hạn đô thị thực tế · Quay phim đô thị thực tế · Tham khảo kỹ thuật

---

## Một, Định vị bảng phân cảnh

Bảng phân cảnh là công cụ cốt lõi để đạo diễn chuyển đổi kịch bản thành ngôn ngữ hình ảnh. Quy tắc này hướng tới việc tạo video Seedance 2.0, tất cả các mô tả ánh sáng, hành động, không gian đều sử dụng ngôn ngữ cụ thể mà mô hình có thể thực hiện. Không làm tóm tắt cảm xúc trừu tượng, không viết các tham số kết xuất mà mô hình không hiểu.

---

## Hai, Nguyên tắc mô tả Seedance 2.0

> Tất cả mô tả trong bảng phân cảnh đô thị thực tế phải tuân thủ nguyên tắc dịch sau - dịch "ý định của đạo diễn" thành "chỉ thị vật lý mà AI có thể thực hiện".

| Biểu đạt trừu tượng cấm | Thay thế cụ thể Seedance 2.0 |
|---|---|
| Cô ấy rất buồn | Lông mày và mắt cúi xuống, ánh nhìn lơ đãng xuống đất, khóe miệng tự nhiên hạ xuống, tay phải vô thức xoa cổ tay trái |
| Ánh nắng rất đẹp | Ánh nắng buổi trưa từ cửa sổ bên trái chiếu nghiêng vào 45° (khoảng 4500K trắng ấm), tạo ra vệt ánh sáng hình chữ nhật của khung cửa sổ trên sàn nhà |
| Con đường rất nhộn nhịp | Ánh đèn ấm vàng của cửa hàng bên đường sáng hết (khoảng 3000K), năm người đi bộ dọc phố đi bộ, trong đó có một người đẩy xe nôi |
| Anh ta quay đi | Quay chậm sang phải khoảng 90 độ, đối diện phía phải màn hình, chân phải bước ra khoảng 0.6 mét, chân trái theo sau, toàn bộ khoảng 2 giây |
| Không khí rất căng thẳng | Ánh sáng cửa sổ cứng bên cạnh (trắng lạnh khoảng 5000K) đánh xiên một nguồn, phần còn lại của căn phòng tối nhưng có thể nhìn thấy đường viền mờ nhạt, tỷ lệ ánh sáng khoảng 1:8 |
| Gió thổi rèm cửa | Rèm vải trắng bị gió nhẹ từ cửa sổ thổi phồng lên khoảng 15cm, sau đó rơi xuống, lặp lại khoảng 2 giây một chu kỳ |

---

## Ba, Ánh sáng và bầu không khí — Mô tả nguồn sáng vật lý Seedance 2.0

### 3.1 Ánh sáng thống nhất trong cùng một cảnh

Trong một cảnh không nên có hơn hai phương án ánh sáng cốt lõi, trừ khi có sự thay đổi nguồn sáng do động cơ kể chuyện (như có người bật đèn bàn, ánh sáng sau khi mặt trời mọc sáng hơn đèn trong nhà, từ trong nhà đi ra ngoài). Sự thay đổi nguồn sáng phải được đánh dấu trong bảng phân cảnh.

### 3.2 Cú pháp câu nguồn sáng (mỗi khung hình phải bao gồm)
[Nguồn sáng] Ánh sáng chính: {loại nguồn sáng}, {hướng}, {giá trị nhiệt độ màu K}, {mềm/cứng}
[Nguồn sáng] Ánh sáng phụ/ánh sáng môi trường: {loại nguồn sáng}, {hướng}, {giá trị nhiệt độ màu K}
[Tỷ lệ ánh sáng] Khoảng 1:{X}
### 3.3 Cảm xúc → Ma trận nguồn sáng

| Cảm xúc | Công thức nguồn sáng (Seedance 2.0 có thể điền trực tiếp) | Từ khóa trực quan |
|---|---|---|
| Công việc kìm nén | Ánh sáng cửa sổ lạnh trắng chính (5000-5500K) từ cửa sổ lớn bên vào, ánh sáng màn hình lạnh (6500K) bổ sung mặt. Tỷ lệ ánh sáng khoảng 1:3 | Trung tính hơi lạnh, chất liệu rõ nét |
| Thư giãn hàng ngày | Ánh sáng cửa sổ lớn phân tán (5000K), mềm hóa bởi rèm cửa. Tỷ lệ ánh sáng khoảng 1:1.5 thấp tương phản | Trong suốt, thấp tương phản, chữa lành |
| Ấm áp thân mật | Đèn bàn ánh sáng ấm làm nguồn chính (2800-3200K), phần tối giữ lại đường viền vật thể. Tỷ lệ ánh sáng khoảng 1:4 | Ấm áp bao bọc, thân mật |
| Đời sống thường nhật | Nhiều nguồn sáng pha trộn — đèn natri đường phố ánh sáng ấm vàng (2000-2200K) là chính, cửa hàng ánh sáng trắng lạnh (4000K) đối lập cục bộ. Tỷ lệ ánh sáng khoảng 1:5 | Ấm áp chủ đạo, nhộn nhịp |
| Cô đơn đêm mưa | Đường ướt phản chiếu vệt ánh sáng ấm vàng của đèn đường (2800K), môi trường lạnh (6000K khuếch tán bầu trời), kính cửa sổ rải vết mưa. Tỷ lệ ánh sáng khoảng 1:6 | Lạnh và ấm cùng tồn tại, cô đơn thơ mộng |
| Hồi hộp căng thẳng | Ánh sáng cửa sổ cứng bên cạnh (trắng lạnh 5000K) một nguồn, tỷ lệ ánh sáng lớn khoảng 1:8, phần tối sâu nhưng có đường viền mờ nhạt. Tỷ lệ ánh sáng khoảng 1:8 | Căng thẳng, không chắc chắn |
| Hồi sinh chữa lành | Ánh sáng tự nhiên đầy đủ phân tán (5000-5500K), ánh sáng bầu trời + phản xạ mặt đất bổ sung ánh sáng. Tỷ lệ ánh sáng khoảng 1:1.5 | Cao độ trong suốt, hy vọng |
| Mong manh đêm khuya | Một nguồn sáng ấm duy nhất — đèn bàn/đèn đường ngoài cửa sổ (2800-3200K) tạo ra ánh sáng đảo, một bên mặt sáng một bên tối. Tỷ lệ ánh sáng khoảng 1:8 | Nguồn sáng tối giản, mong manh riêng tư |

### 3.4 Tông màu lạnh ấm và giai đoạn kể chuyện

- **Lạnh chủ đạo** (5000K+): công việc kìm nén, hồi hộp căng thẳng, cô đơn lạnh, đêm mưa
- **Ấm chủ đạo** (2000-3500K): thân mật ấm áp, đời sống thường nhật, ở nhà hàng ngày, khoảnh khắc vàng
- **Lạnh và ấm cùng tồn tại**: khoảnh khắc chuyển tiếp (khoảnh khắc xanh + đèn ấm đầu tiên), đêm mưa (môi trường lạnh + vệt ánh sáng ấm)
- **Thay đổi nguồn sáng = Tín hiệu kể chuyện**: bầu trời ngoài cửa sổ từ ban ngày lạnh trắng chuyển sang chiều tối vàng ấm = thời gian trôi qua; từ ánh sáng lạnh văn phòng đi đến dưới đèn đường ấm vàng = chuyển đổi cảnh và cảm xúc

### 3.5 Điểm thích ứng ánh sáng Seedance 2.0

- Số nhiệt độ màu giúp mô hình điều chỉnh xu hướng cân bằng trắng: `nhiệt độ màu khoảng 3200K` tốt hơn `ánh sáng ấm`
- Số tỷ lệ ánh sáng giúp mô hình xây dựng ý thức sáng tối: `tỷ lệ ánh sáng khoảng 1:4` tốt hơn `bóng mờ`
- Nguồn sáng phải có nguồn rõ ràng: `từ cửa sổ bên trái màn hình chiếu xiên vào 45°` tốt hơn `ánh sáng bên`
- Mô tả đường đi phản xạ ánh sáng môi trường: `đường ướt phản chiếu vệt ánh sáng ấm vàng của đèn đường` tốt hơn `mặt đất có phản chiếu màu ấm`

---

## Bốn, Động lực môi trường — Làm cho hình ảnh thở

### 4.1 Mật độ động lực

Mỗi 3-4 khung hình ít nhất sắp xếp một khung hình có động lực môi trường. Cảnh đối thoại tĩnh cũng không ngoại lệ — ít nhất một khung hình có lá cây ngoài cửa sổ đang động, hơi nóng từ cốc cà phê bốc lên, rèm cửa bị gió nhẹ thổi động.

### 4.2 Các yếu tố động lực môi trường đô thị (Seedance 2.0 có thể thực hiện)

| Cảnh | Động lực môi trường có thể mô tả |
|---|---|
| Trong nhà | Rèm cửa bị gió nhẹ phồng lên khoảng 10cm rồi rơi xuống (chu kỳ khoảng 2 giây), hơi nước từ cốc cà phê bốc lên chậm, côn trùng nhỏ bay qua phạm vi chiếu sáng của đèn bàn trên bàn, ánh sáng xe cộ ngoài cửa sổ thỉnh thoảng quét qua trần nhà |
| Con đường | Lá cây ven đường rung rinh, người đi bộ xa chờ trên vạch kẻ chân rồi đi qua, xe đạp chậm rãi chạy qua cảnh trung, nước đọng ven đường bị bánh xe nghiền qua tạo sóng gợn |
| Quán cà phê/nhà hàng | Hơi nước từ máy pha cà phê bốc lên, ánh sáng và bóng tối trên ghế cửa sổ thay đổi theo mây ngoài cửa sổ, nhân viên quầy bar lau cốc lặp lại động tác, chuông gió cửa ra vào kêu bởi gió đẩy cửa |
| Văn phòng | Bóng lá chắn cửa sổ di chuyển chậm theo góc ánh sáng ngoài cửa sổ, chương trình bảo vệ màn hình máy tính thay đổi, máy nước thỉnh thoảng phát ra tiếng "bong bóng", máy in nhả giấy |
| Địa điểm đêm khuya | Cửa tự động của cửa hàng tiện lợi mở đóng liên tục, đèn giao thông chiếu xuống vạch người đi bộ ánh sáng đỏ/ xanh luân phiên, ánh đèn xa thỉnh thoảng chiếu qua trần nhà |
| Sân thượng | Quần áo trên dây phơi bị gió thổi động, ánh đèn đường chân trời thành phố xa thỉnh thoảng có đèn sáng hoặc tắt, mây trên bầu trời di chuyển chậm |

### 4.3 Quy tắc mô tả động lực môi trường Seedance 2.0

- Động lực phải có quỹ đạo và tốc độ cụ thể: `Lá cây bị gió thổi động, mỗi giây khoảng 2-3 lần rung nhẹ` tốt hơn `Cây đang động`
- Động lực nguồn sáng phù hợp với logic nguồn sáng không gian: `Khi mây che mặt trời, diện tích ánh sáng cửa sổ trong nhà thu nhỏ khoảng 40%, kéo dài khoảng 3 giây sau đó phục hồi`
- Cấm động lực không có nguồn: không có gió thổi = rèm cửa không động. Trong nhà không mở cửa sổ = không có gió

---

## Năm, Nhịp độ hành động nhân vật — Cụ thể hóa logic vật lý Seedance 2.0

### 5.1 Nguyên tắc mô tả hành động

Tất cả hành động nhân vật phải mô tả: **Quỹ đạo + Tốc độ/thời gian + Phối hợp bộ phận cơ thể + ảnh hưởng đến vật thể xung quanh**.

### 5.2 Thư viện hành động hàng ngày cụ thể

| Hành động | Mô tả có thể thực hiện Seedance 2.0 |
|---|---|
| Đứng dậy | Hai tay chống tay vịn ghế, đầu gối di chuyển về phía trước, 0.5 giây sau trọng tâm cơ thể chuyển về phía đôi chân, sau 1 giây đứng thẳng — toàn bộ khoảng 2 giây, đứng thẳng nghỉ khoảng 0.5 giây |
| Quay đầu | Đầu quay chậm sang phải khoảng 30 độ, ánh nhìn từ tài liệu trên bàn chuyển ra ngoài cửa sổ, quá trình quay khoảng 1 giây, sau khi đến nơi ánh nhìn dừng tại xa khoảng 1 giây |
| Uống cà phê | Tay phải cầm quai cốc, miệng cốc gần môi, nghiêng cốc khoảng 15 độ, chất lỏng chạm môi trên, nhấp từng ngụm nhỏ khoảng 1 giây, cốc hạ xuống về vị trí ban đầu khoảng 1 giây |
| Đi đến cửa sổ | Từ ghế làm việc đứng dậy (khoảng 2 giây), đi đều bước về phía cửa sổ bên phải màn hình khoảng 4 bước (khoảng 3 mét, thời gian khoảng 3 giây), dừng cách cửa sổ khoảng 0.5 mét |
| Ngồi xuống | Cơ thể cúi nhẹ đầu gối, mông chạm mặt ghế, cùng mặt ghế hạ xuống khoảng 2cm (lò xo/miếng xốp biến dạng), lưng tựa vào lưng ghế — toàn bộ khoảng 1.5 giây |
| Đặt đồ xuống | Tay phải cầm cốc cà phê từ độ cao trước ngực hạ xuống mặt bàn, đáy cốc chạm mặt bàn gỗ phát ra âm thanh va chạm nhẹ, ngón tay rời khỏi quai cốc — toàn bộ khoảng 1 giây |
| Đẩy cửa vào | Tay phải nắm tay nắm cửa xoay xuống khoảng 30 độ, đẩy cửa vào khoảng 70 độ, cơ thể theo cửa vào, chân phải trước vượt qua ngưỡng cửa — toàn bộ khoảng 2 giây |
| Xem điện thoại | Tay phải lấy điện thoại từ bàn (dài khoảng 15cm), ngón cái nhấn vào phía dưới màn hình để mở, ánh sáng lạnh của màn hình chiếu vào bên phải khuôn mặt, mắt nhắm nhẹ tập trung vào màn hình — toàn bộ khoảng 3 giây |
| Mặc áo/khoác áo | Tay phải luồn vào tay áo phải, tay trái phía sau luồn vào tay áo trái, hai vai hơi mở ra để áo khoác ôm sát vai, cổ áo tự nhiên mở ra — toàn bộ khoảng 4 giây |
| Ôm | A bước về phía trước khoảng 0.5 mét, hai tay ôm vai và lưng B, hai tay nhẹ nhàng đan chéo trên lưng B, mặt chạm vào bên tai B, giữ khoảng 3 giây |

### 5.3 Nhịp độ hành động và cảnh kể chuyện

- **Kể chuyện hàng ngày/cảnh văn chương**: Hành động ổn định, kìm nén, mỗi động tác nhỏ đều ghi chú thời gian và quỹ đạo. Nhịp độ chậm rãi — không phải chậm mà là "không vội"
- **Cảnh cảm xúc dao động**: Biên độ và tốc độ hành động tăng nhẹ. Nhân vật có thể trong đối thoại không tự giác tăng tần suất ngón tay gõ bàn, hô hấp khiến vai cử động rõ ràng hơn
- **Cảnh xung đột**: Hành động dứt khoát, nhưng vẫn có quỹ đạo vật lý. Đánh/đẩy phải cụ thể đến "tay phải đẩy vào phía trước vai trái đối phương, trọng tâm đối phương nghiêng về phía sau khoảng 20cm"
- Cấm: chồng chất hành động nhanh không có lý do kể chuyện, logic vật lý không có dịch chuyển tức thì, mô tả mơ hồ "làm một cử chỉ"

### 5.4 Động lực trang phục

Động lực trang phục thực tế là tài sản tự nhiên của hình ảnh — không phải "tham số mô phỏng vải", mà là "đuôi áo gió bị gió thổi lên khoảng 20 độ", "một đầu khăn quàng trượt khỏi vai", "tà váy theo bước chân lay động trái phải nhẹ khoảng 10cm". Ghi chú chi tiết động lực trang phục trong mô tả hình ảnh bảng phân cảnh.

---

## Sáu, Cụ thể hóa logic không gian — Hệ tọa độ không gian Seedance 2.0

### 6.1 Thông tin không gian phải tuyên bố mỗi khung hình
Vị trí ngang: màn hình trái/giữa/phải, hoặc một phần ba bên trái màn hình
Vị trí sâu: cách máy quay {giá trị} mét, cận cảnh/trung cảnh/hậu cảnh
Quan hệ giữa nhân vật và cảnh: cách {vật cố định} {giá trị} mét
(Nếu có từ hai người trở lên) Khoảng cách tương đối và hướng giữa nhân vật A và B
### 6.2 Ví dụ kết nối vị trí đứng
【Cuối đoạn A】
A đứng trước cửa sổ lớn, cách cửa sổ khoảng 0.5 mét, mặt hướng ra ngoài cửa sổ, nằm ở vị trí giữa hơi lệch phải màn hình, cách máy quay khoảng 4 mét.
Ngoài cửa sổ là chân trời thành phố buổi trưa, ánh nắng từ cửa sổ bên phải màn hình chiếu xiên vào.
Tay phải A cầm cốc cà phê trước ngực, cốc cách môi khoảng 15cm.

【Đầu đoạn B】
Cốc cà phê của A vừa hạ xuống khỏi miệng khoảng 10cm, cốc vẫn ở vị trí trước ngực. A vẫn đứng trước cửa sổ lớn (vị trí không thay đổi).
Ngoài cửa sổ trời đã chuyển sang khoảnh khắc xanh — bầu trời màu xanh tím đậm, đèn đường và đèn viền tòa nhà đã sáng.
Đèn bàn trong nhà đã bật (bên trái màn hình), ánh sáng vàng ấm (khoảng 3000K) chiếu vào bên trái má A.
### 6.3 Thay đổi không gian phải cụ thể

| Trừu tượng (cấm) | Cụ thể Seedance 2.0 |
|---|---|
| Cô ấy đi đến gần | A từ nền màn hình (cách máy quay khoảng 5 mét, vị trí khung cửa) đi đều về phía máy quay 4 bước (khoảng 3 mét), dừng cách máy quay khoảng 2 mét — thời gian khoảng 4 giây |
| Hai người đối mặt | A nằm ở giữa hơi lệch trái màn hình (cách máy quay khoảng 3 mét), B nằm ở giữa hơi lệch phải màn hình (cách máy quay khoảng 3 mét), hai người đối diện, cách nhau khoảng 0.8 mét |
| Từ trong nhà ra ngoài | A từ trong nhà (cách máy quay khoảng 3 mét) đi tới cửa, đẩy cửa (cửa xoay vào khoảng 80 độ), chân phải vượt qua ngưỡng cửa, bước ra đường ngoài — ánh sáng vàng ấm của đèn đường ngoài thay thế ánh sáng lạnh trắng của đèn huỳnh quang trong nhà |

---

## Bảy, Quy tắc di chuyển máy quay — Seedance 2.0 Chuyển động máy quay

### 7.1 Di chuyển máy quay được phép

| Di chuyển máy quay | Mô tả Seedance 2.0 | Cảnh áp dụng |
|---|---|---|
| Cố định | Máy quay cố định không di chuyển, hình ảnh đứng yên | Đối thoại, hàng ngày, không ảnh để lại, nhìn cảm xúc |
| Cầm tay rung nhẹ | Máy quay có rung nhẹ không đều (biên độ khoảng ±2cm), mô phỏng cảm giác thở khi cầm tay quay | Cảm xúc dao động, đi bộ đường phố, theo dõi thân mật, góc nhìn chủ quan |
| Di chuyển mượt mà bằng ổn định | Máy quay di chuyển mượt mà với tốc độ đều, không rung | Dạo quanh thành phố, nhân vật xuất hiện, hiển thị không gian, chuyển tiếp |
| Đẩy chậm | Máy quay đẩy từ từ về phía đối tượng, tốc độ đẩy khoảng 0.3 mét mỗi giây | Tăng nhiệt cảm xúc, chân lý tiếp cận, tập trung chú ý |
| Kéo chậm | Máy quay kéo chậm ra xa, tốc độ kéo khoảng 0.3 mét mỗi giây | Chia ly, kết thúc, tiết lộ toàn cảnh |
| Theo dõi | Máy quay giữ khoảng cách khoảng 2 mét với nhân vật di chuyển đồng bộ | Theo dõi đi bộ, theo dõi thành phố |
| Xoay máy quay | Máy quay xoay ngang/dọc tại chỗ | Chuyển đổi ánh nhìn, giải thích mối quan hệ không gian |

### 7.2 Cấm di chuyển máy quay

- Quay nhanh không có mục đích kể chuyện, đẩy nhanh và kéo nhanh (tốc độ đẩy/kéo vượt quá 1 mét mỗi giây)
- Rung cầm tay mạnh trên 3 giây (trừ khi góc nhìn bị đánh/choáng váng)
- Chuyển cảnh đặc biệt không có logic — kéo màn, xoay, rèm cửa, lật trang và các hiệu ứng chuyển cảnh khác
- Máy quay không có lý do quay 360 độ

### 7.3 Triết lý di chuyển máy quay đô thị thực tế

- Vị trí cố định là lựa chọn đầu tiên — để khán giả thấy người thật trong không gian thật tồn tại tự nhiên
- Rung nhẹ cầm tay sử dụng trong đoạn cảm xúc — nhưng biên độ rung không vượt quá phạm vi phong cách phim tài liệu thông thường
- Khởi đầu và kết thúc của chuyển động máy quay phải ổn định, quá trình chuyển động đều — cấm tăng tốc đột ngột hoặc dừng gấp

---

## Tám, Quy tắc chuyển cảnh

### 8.1 Phương thức chuyển cảnh được phép

| Chuyển cảnh | Thực thi hình ảnh | Chức năng kể chuyện |
|---|---|---|
| Cắt cứng | Chuyển đổi trực tiếp | Chuyển cảnh trong cùng một cảnh (mặc định) |
| Chuyển cảnh phù hợp ánh sáng | Hai cảnh chuyển đổi trong logic ánh sáng tương tự | Thời gian trôi qua, kể chuyện song song. Ví dụ: Ánh sáng buổi sáng ngoài cửa sổ A → Ánh sáng buổi sáng ngoài cửa sổ B |
| Chuyển cảnh phù hợp không gian | Hai không gian phù hợp về bố cục hoặc yếu tố | Nhảy cảnh. Ví dụ: Cửa văn phòng đóng lại ngay lập tức → Cửa căn hộ mở ngay lập tức |
| Chuyển tiếp không ảnh | Chèn không ảnh cảnh (3-5 giây) | Đệm cảm xúc, phân chia chương, gợi ý thời gian trôi qua |
| Chuyển cảnh tiêu điểm | Tiêu điểm trước di chuyển từ đối tượng đến nền, sau đó từ nền mờ dần dần tập trung vào đối tượng | Chuyển đổi không gian, chuyển đổi chú ý |

### 8.2 Cấm chuyển cảnh

- Chuyển cảnh hiệu ứng hình ảnh thuần túy (lật trang, kéo màn, rèm cửa, mosaic)
- Chuyển cảnh xoay/thu phóng không có logic kể chuyện
- Sử dụng hơn hai phương thức chuyển cảnh trong cùng một cảnh

---

## Chín, Lập kế hoạch đồng bộ âm thanh hình ảnh (Dành riêng cho Seedance 2.0)

### 9.1 Quy tắc ghi chú âm thanh môi trường

Mỗi cảnh ghi chú 1-2 âm thanh môi trường cốt lõi, viết trong cột âm thanh môi trường của bảng phân cảnh:

| Cảnh | Âm thanh môi trường đề xuất |
|---|---|
| Văn phòng | Tiếng gõ phím nhẹ / Tiếng điều hòa rì rào / Tiếng máy in xa |
| Quán cà phê | Tiếng hơi nước từ máy pha cà phê / Tiếng cốc va chạm nhẹ / Tiếng nói nền mờ nhạt |
| Đường phố ban ngày | Tiếng ồn lốp xe / Tiếng người xa / Tiếng lá cây ven đường rung động trong gió |
| Đường phố đêm mưa | Tiếng mưa đập vào cửa xe và mặt đường / Tiếng nước bắn từ xe thỉnh thoảng đi qua |
| Ở nhà đêm khuya | Tiếng vo vo tần số thấp của tủ lạnh / Tiếng xe thỉnh thoảng ngoài cửa sổ / Tiếng đồng hồ chạy |
| Sân thượng | Tiếng gió / Tiếng rì rào yếu từ thành phố xa |
| Ga tàu điện ngầm | Tiếng thông báo vào ga và phanh / Tiếng bước chân của dòng người |

### 9.2 Ghi chú đồng bộ âm thanh hình ảnh

Trong bảng phân cảnh ghi chú điểm đồng bộ âm thanh hình ảnh quan trọng:
- `t=2s` Tiếng cốc cà phê đặt xuống khi đáy cốc tiếp xúc với mặt bàn
- `t=5s` Tiếng kêu nhẹ từ bản lề cửa khi đẩy mở — Nhân vật vào trong nhà, tiếng đường phố ngoài bị cửa ngăn cách ngay lập tức giảm đi
- `t=8s` Tiếng còi xe cứu thương từ xa vọng lại — Nhân vật ngẩng đầu nhìn ra ngoài cửa sổ khoảng 1 giây

---

## Mười, Mẫu thẻ phân cảnh Seedance 2.0

Mỗi khung hình sử dụng định dạng thẻ sau, điền từng khung trong bảng phân cảnh:
【Khung hình X】Thời gian: {giá trị}s | Cỡ cảnh: {cận cảnh/ trung cận cảnh/ trung cảnh/ toàn cảnh/ đại toàn cảnh/ không ảnh}

Mô tả hình ảnh:
{Động lực nhân vật — bao gồm quỹ đạo hành động cụ thể, thời gian, phối hợp bộ phận cơ thể}
{Biểu cảm nhân vật — bao gồm hướng ánh mắt, chi tiết biểu cảm nhỏ}
{Logic nguồn sáng — loại ánh sáng chính + hướng + nhiệt độ màu K + tỷ lệ ánh sáng}
{Chi tiết môi trường — bao gồm cụ thể đạo cụ, bề mặt chất liệu, dấu vết sử dụng}
{Động lực trang phục — nếu có gió thổi động/ hành động kèm theo động lực trang phục}

Tọa độ không gian:
Ngang {trái/giữa/phải màn hình, khoảng cách cụ thể đến cạnh} | Sâu {cách máy quay giá trị mét}
{Quan hệ khoảng cách với vật cố định trong cảnh}
{Nếu có từ hai người trở lên, khoảng cách và hướng tương đối giữa các nhân vật}

Di chuyển máy quay: {cố định/ cầm tay rung nhẹ/ đẩy chậm/ kéo chậm/ theo dõi/ xoay máy quay}
{Tốc độ và điểm bắt đầu và kết thúc cụ thể của di chuyển máy quay}

Chuyển cảnh: {cắt cứng/ chuyển tiếp không ảnh/ chuyển cảnh phù hợp ánh sáng/ chuyển cảnh phù hợp không gian — ghi chú điểm kết nối giữa khung trước và sau}

Âm thanh môi trường: {1-2 âm thanh môi trường cốt lõi}

Điểm neo quan trọng Seedance 2.0:
Neo nhân vật: @ImageX_{Tên nhân vật} {Mô tả tạo hình}
Neo cảnh: @ImageX {Tên cảnh} {Mô tả không gian}
{Neo đạo cụ: @ImageX {Tên đạo cụ} — nếu có đạo cụ cầm tay/ tương tác cốt lõi}
---

## Mười một, Quy tắc sử dụng không ảnh

### 11.1 Không ảnh không phải là "không có gì để quay"

Không ảnh là thùng chứa cảm xúc. Mỗi không ảnh phải có mục đích kể chuyện và nội dung hình ảnh cụ thể:

| Loại không ảnh | Mục đích kể chuyện | Ví dụ |
|---|---|---|
| Thiết lập cảnh | Không gian mới xuất hiện lần đầu — để khán giả nhìn rõ đây là nơi nào | Toàn cảnh văn phòng: sắp xếp bàn làm việc, cửa sổ lớn, thành phố ngoài cửa sổ |
| Đệm cảm xúc | Thở ra sau đoạn cảm xúc cao | Giọt mưa ngoài cửa sổ trượt xuống kính, tốc độ khoảng 2cm mỗi giây |
| Thời gian trôi qua | Gợi ý thời gian đã qua | Bầu trời ngoài cửa sổ cùng một cửa từ xanh dương buổi trưa chuyển dần sang xanh tím |
| Ẩn dụ bỏ trống | Vật thay thế cảm xúc | Cốc cà phê trên bàn còn một nửa chưa uống hết, miệng cốc có vết son môi |
| Chuyển cảnh kết nối | Chuyển tiếp tự nhiên giữa hai không gian | Đèn ống trong cầu thang — cảnh trước là văn phòng, cảnh sau là sân thượng |

### 11.2 Quy tắc mô tả không ảnh Seedance 2.0

Không ảnh cũng phải tuân thủ quy tắc mô tả ánh sáng + chất liệu + động lực: Ánh sáng cửa sổ buổi chiều chiếu xiên từ bên phải (khoảng 4500K), tạo ra vệt sáng sọc của rèm lá trên bàn họp trống,
vệt sáng thay đổi chậm chiều rộng và vị trí theo mây ngoài cửa sổ, khoảng 5 giây sau hoàn toàn tối lại — một đám mây che mặt trời.
Trên bàn có vết xước nhỏ và vết cốc còn lại từ cuộc họp.

---

## Mười hai, Danh sách kiểm tra chất lượng bảng phân cảnh

Sau khi hoàn thành bảng phân cảnh của mỗi cảnh, đạo diễn kiểm tra từng mục:

| Mục kiểm tra | Tiêu chuẩn thông qua |
|---|---|
| Nguồn sáng có thể truy xuất | Mỗi khung hình có thể trả lời "ánh sáng từ đâu đến, nhiệt độ màu là gì" |
| Hành động có thể thực hiện | Mỗi hành động có quỹ đạo, thời gian, bộ phận cơ thể |
| Không gian có thể định vị | Mỗi khung hình ghi chú vị trí ngang và sâu của nhân vật |
| Kết nối vị trí đứng | Vị trí/tư thế của cùng một người trong khung hình liền kề có thể kết nối |
| Môi trường có động lực | Mỗi 3-4 khung hình ít nhất 1 khung có động lực môi trường |
| Giọng điệu không mơ hồ | Không có mô tả không thể thực hiện như "cô ấy rất đẹp" "không khí rất tốt" |
| Thuật ngữ CG không có | Không có từ CG như PBR/SSR/AO/ánh sáng thể tích/thế hệ tiếp theo |
| @reference đầy đủ | Nhân vật/cảnh/đạo cụ cốt lõi đều được ghi chú neo tham chiếu |