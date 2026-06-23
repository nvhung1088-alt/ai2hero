---
name: storyboard_table_techniques
description: >-
  Tham khảo kỹ thuật chung cho bảng phân cảnh.
  Bao gồm nguyên tắc chia nhỏ phân cảnh, quy tắc định vị và kết hợp góc máy, nguyên tắc liên tục về mặt hình ảnh, hướng dẫn điền trường, quy tắc chuyển cảnh và các kỹ thuật thiết kế phân cảnh chung khác, cung cấp cho Agent để kích hoạt sử dụng.
---
# Kỹ thuật chung cho bảng phân cảnh

Tài liệu này là tham khảo kỹ thuật chung cho thiết kế bảng phân cảnh, áp dụng cho tất cả các tình huống Agent cần xây dựng bảng phân cảnh.

---

## Nguyên tắc chia nhỏ phân cảnh

**Khởi tạo phân cảnh mới**: Chuyển đổi cảnh/địa điểm, nhảy thời gian, thay đổi chủ thể góc máy, thay đổi rõ rệt về cảnh quan, điểm nút hành động quan trọng

**Không cần khởi tạo mới**: Đối thoại liên tục trong cùng một khung hình, thay đổi biểu cảm nhẹ hoặc hành động nhỏ

Độ chi tiết: Một khung hình độc lập = Một phân cảnh, khoảng mỗi 50~100 từ kịch bản tương ứng 1~2 phân cảnh. Chuyển tiếp/chuyển cảnh nếu có miêu tả rõ ràng cũng tách riêng.

---

## Quy tắc định vị và kết hợp góc máy (ngăn ngừa dư thừa)

**Góc máy định vị**: Mỗi cảnh/đoạn mới định vị tối đa 1~2 góc máy hoàn thành, cấm tách thành hơn 3 mảnh vụn.
- Cách làm được khuyến nghị: 1 góc máy viễn cảnh có đẩy nhẹ (định vị + giới thiệu chủ thể trong một cú máy), hoặc 1 góc máy viễn cảnh lớn định vị + 1 góc máy toàn cảnh giới thiệu chủ thể
- Cách làm bị cấm: chụp môi trường không có nhân vật→sau đó chụp chi tiết cục bộ→sau đó chụp nhân vật đến nơi, tạo thành ba đoạn dư thừa

**Tự kiểm tra kết hợp góc máy**:
- Có thể giải thích trong một cú máy thì không tách thành hai cú máy——nếu một góc máy có thể hoàn thành đồng thời định vị + giới thiệu, không tách thành hai
- Góc máy miêu tả liên tục các phần khác nhau trong không gian cùng một cảnh (cổng sân→cây leo→phòng khách) nên kết hợp thành một góc máy, dùng hình ảnh để miêu tả bao quát nhiều không gian
- Góc máy chỉ mang tính trang trí (chỉ hiển thị chi tiết môi trường mà không có sự tiến triển về mặt tường thuật) nên kết hợp vào góc máy có chức năng tường thuật
- **Kiểm tra tư duy đạo diễn**: Sau khi viết xong, tự kiểm tra——nếu một đạo diễn thực sự sẽ hợp nhất 2~3 góc máy liền kề thành 1, có nghĩa là phân cảnh đã bị tách quá chi tiết, nên hợp nhất lại

**Chiến lược một cú máy liên tục**: Khi giữa các góc máy liền kề có **hành động thay đổi liên tục, thay đổi nhẹ về cảnh (di chuyển trong cùng một cảnh), hoặc góc chụp thay đổi dần** thì có thể đánh dấu "một cú máy liên tục" trong `cameraMove` hoặc `description`, hợp nhất nhiều góc máy vụn thành một cú máy dài liên tục.
- **Ứng dụng**: Nhân vật đi qua không gian, theo dõi hành động từ điểm A đến điểm B, xoay quanh nhân vật để trình bày môi trường, định vị đẩy nhẹ đến cận cảnh chủ thể
- **Cách đánh dấu**: Trong `cameraMove`, viết rõ đường đi của máy quay (như "một cú máy liên tục: đẩy nhẹ viễn cảnh→di chuyển theo vào trong sân→kết thúc toàn cảnh"), trong `description`, miêu tả nội dung khung hình bắt đầu và kết thúc
- **Thời lượng linh hoạt**: Góc máy một cú máy liên tục do lượng thông tin liên tục cập nhật, có thể vượt quá giới hạn 6 giây của một góc máy đơn, nhưng không quá 12 giây
- **Cảnh báo rủi ro**: Một cú máy liên tục sẽ tăng độ khó khi tạo hình ảnh (yêu cầu tính liên tục cao), chỉ sử dụng khi lợi ích về sự mượt mà trong tường thuật rõ ràng vượt trội so với khi cắt nhỏ, không lạm dụng

**Quy tắc vàng 6 giây**: Góc máy không có lời thoại tích lũy vượt quá 6 giây mà không xuất hiện thông tin mới (lời thoại/hành động/thay đổi chủ thể), sự chú ý của khán giả bị gián đoạn. Đặc biệt chú ý đến góc máy định vị + chuyển tiếp, nên hợp nhất và nén lại thay vì kéo dài

---

## Nguyên tắc liên tục về mặt hình ảnh (tuân thủ toàn bộ trong thiết kế phân cảnh)

**① Tính liên tục của hành động**: Vị trí, tiến độ hành động, hướng của nhân vật giữa các góc máy liền kề phải nhất quán theo logic vật lý. Tay giơ lên nửa chừng trong góc máy trước→góc máy tiếp theo phải tiếp nối từ trạng thái nửa chừng, không thể đột ngột thu lại.

**② Nguyên tắc tiến triển cảnh quan**: Chuyển cảnh phải tuân theo quy tắc tập trung dần hoặc giải phóng dần——
- Tập trung dần: Viễn cảnh→Toàn cảnh→Cận cảnh→Đặc tả (thắt chặt cảm xúc)
- Giải phóng dần: Đặc tả→Cận cảnh→Toàn cảnh→Viễn cảnh (giải phóng cảm xúc)
- Cấm chuyển cảnh cùng cảnh quan liên tục không có lý do tường thuật (liên tục 3 góc máy trở lên cùng cảnh quan = mệt mỏi về thị giác)

**③ Bảo toàn trục quan sát**: Nguyên tắc 180 độ——vị trí của các nhân vật trong cảnh đối thoại/đối đầu phải được cố định cùng phía trong suốt bộ phim, không được nhảy trục

**④ Logic không gian hướng tới**: Hai bên đối thoại phải hướng mặt về phía nhau, thao tác vật phẩm phải hướng mặt về phía vật phẩm, nhìn xa phải hướng mặt về phía xa. Cấm hướng mặt vô định về phía máy quay

**⑤ Nhận thức kiểm soát thông tin**: Mỗi góc máy phải nhận thức "khán giả hiện tại biết gì, không biết gì"——
- Cho tay không cho mặt = Kỳ bí; Trước tiếng sau hình = Chờ đợi; Chỉ cho bóng lưng = Xa cách; Tiết lộ toàn diện = Đỉnh điểm

**⑥ Ràng buộc mật độ nhịp điệu**: Số lượng hành động/sự kiện của mỗi góc máy phải phù hợp với thời lượng, ngăn chặn nhồi nhét quá nhiều nội dung——
- 1 hành động vật lý = 1 nhịp, 1 lần di chuyển máy quay = 1 nhịp, 1 câu ngắn lời thoại (≤10 từ) = 1 nhịp
- Góc máy 2~3s: tối đa 1 nhịp; Góc máy 4~6s: tối đa 2 nhịp; Góc máy 7s+: tối đa 3 nhịp

**⑦ Vùng an toàn đầu và cuối**: 0.5s đầu và 0.5s cuối của mỗi góc máy là vùng an toàn chuyển tiếp, không đặt điểm bắt đầu hành động hoặc lời thoại quan trọng. 0.5s đầu dùng để thiết lập môi trường hoặc giới thiệu tĩnh chủ thể, 0.5s cuối dùng để tự nhiên kết thúc hành động.

---

## Hướng dẫn điền trường

**description**（Miêu tả hình ảnh）: Một câu miêu tả nội dung cốt lõi của khung hình (15~50 từ), bao gồm **chủ thể + hành động/trạng thái + không gian môi trường** có thể nhìn thấy, không viết hoạt động tâm lý. Cần thể hiện tầng lớp không gian (ít nhất liên quan đến hai tầng: tiền cảnh/trung cảnh/hậu cảnh). Như "Rèm cửa nhẹ nhàng lay động ở tiền cảnh, xe ngựa của Hầu phủ đến ngôi nhà bỏ hoang ở núi Lạc Yên trong trung cảnh""Bà Mẹ nhảy xuống xe ngựa, quan sát ngôi nhà hoang tàn, xa xa núi non ẩn hiện trong sắc chiều"

> **🚫 Cấm miêu tả ánh sáng/màu sắc**：description và tất cả các trường đều **không được phép** xuất hiện các từ ngữ liên quan đến ánh sáng như `ánh sáng`/`bóng`/`nhiệt độ màu`/`tông màu`/`màu ấm`/`màu lạnh`/`ngược sáng`/`sáng tối`/`tương phản cao`. Ánh sáng hoàn toàn do hình ảnh tài sản của cảnh đó tự động đảm nhận——nhu cầu chiếu sáng đặc biệt như cảnh đêm/cảnh mưa/ánh lửa xin thông qua việc trích dẫn **cảnh phái sinh** tương ứng (phiên bản cảnh đêm/phiên bản cảnh mưa/phiên bản ánh lửa) để biểu đạt. Như trong ví dụ gốc "dưới ánh hoàng hôn" cũng là vi phạm, nên xóa đi.

**shotSize**（Cảnh quan）：

| Cảnh quan | Giải thích | Ý nghĩa tường thuật |
|------|------|---------|
| Đại viễn cảnh | Toàn cảnh môi trường | Định vị / Cô đơn / Nhỏ bé |
| Viễn cảnh | Quan hệ giữa cảnh và nhân vật | Quan hệ không gian / Tạo không khí |
| Toàn cảnh | Nhân vật toàn thân và môi trường | Nhân vật xuất hiện / Xuất hiện toàn thân |
| Trung cảnh | Trên gối | Tường thuật hàng ngày / Đối thoại |
| Cận cảnh | Trên ngực | Truyền đạt cảm xúc / Trọng điểm đối thoại |
| Đặc tả | Mặt hoặc bộ phận chi tiết | Tăng cường cảm xúc / Đạo cụ quan trọng |
| Đại đặc tả | Cực kỳ chi tiết | Bom cảm xúc / Khoảnh khắc quyết định (cẩn thận sử dụng, toàn phim 2~3 lần) |

**cameraMove**（Di chuyển máy quay）：Khi không có di chuyển máy quay, điền `tĩnh`. Di chuyển máy quay cần ghi rõ hướng điểm bắt đầu và kết thúc.

| Di chuyển máy quay | Giải thích | Ý nghĩa tường thuật |
|------|------|---------|
| Đẩy | Từ xa đến gần, nhấn mạnh chủ thể | Tiến triển cảm xúc / Khám phá / Nhìn trộm |
| Rút | Từ gần đến xa, trình bày môi trường | Tách rời cảm xúc / Tiết lộ toàn cảnh / Chia tay |
| Quay | Quay quét tại vị trí cố định | Giới thiệu môi trường / Tìm kiếm |
| Di chuyển | Theo dõi chủ thể di chuyển | Đồng hành / Theo dõi |
| Quay từ trên xuống | Từ trên nhìn xuống | Quan sát / Nhỏ bé / Toàn cục |
| Quay từ dưới lên | Từ dưới nhìn lên | Anh hùng hóa / Áp đảo |

**action**（Hành động của nhân vật）: Mô tả cụ thể các hành động của nhân vật/chủ thể trong khung hình (5~40 từ), khi không có hành động của nhân vật điền `khung hình trống`. Định dạng là `(giải thích kết nối) mô tả hành động`. Yêu cầu:
- **Giải thích kết nối đặt ở đầu**: Được đặt trong ngoặc đơn, nằm ở đầu mô tả hành động. Cảnh đầu tiên viết `(mở đầu)`; các góc máy khác viết `(tiếp nối góc máy trước: hành động kết nối)`, như `(tiếp nối góc máy trước: đẩy nhẹ kết thúc ~ hình ảnh nhóm người dừng lại)`, `(tiếp nối góc máy trước: tay nâng lên nửa chừng→tiếp tục nâng cao)`
- **Cách viết chuỗi hành động**: Viết chuỗi hành động vật lý liên tục + tốc độ nhịp điệu ("chậm rãi nâng tay phải→đầu ngón tay run nhẹ→đột ngột nắm chặt"), cấm chỉ viết trạng thái tĩnh. Khi có nhiều nhân vật, hành động của mỗi nhân vật được ngăn cách bằng `;`, sắp xếp theo thứ tự tên tài sản liên quan, như `Lê Vụ tay phải xoa cổ tay áo→tay trái ôm chặt con thỏ bông vào lòng; Nhiêu Vi ánh mắt khóa chặt vào con thỏ bông`
- **Không viết hướng/quan hệ không gian trong cột này**: Hướng và quan hệ không gian đã được tách thành cột độc lập (`orientation` / `spatialRelation`), không lặp lại trong action để tránh xung đột với `|` và dấu phân cách cột trong bảng markdown

**orientation**（Hướng mặt）: Cột độc lập, ghi chú hướng mặt của nhân vật trong khung hình. Định dạng:
- Nhiều nhân vật được liệt kê theo thứ tự `associateAssetsNames`, ngăn cách bằng `;`: `Nhân vật A-3/4 mặt hướng phải; Nhân vật B-3/4 mặt hướng trái`
- Nhân vật đơn có thể bỏ tên nhân vật: `Mặt hướng phải`
- Khung hình trống và đặc tả vật thể điền `—`
- Hướng mặt phải tuân theo quy tắc trục 180° (trong cùng một cảnh khóa lại, thay đổi phải được cung cấp hành động chuyển mình/quay đầu trong `action` và cập nhật đồng bộ vào cột này), giá trị cụ thể xem bảng tham khảo hướng mặt dưới đây

**spatialRelation**（Quan hệ không gian）: Cột độc lập, vị trí tương đối của các nhân vật trong khung hình nhiều nhân vật. Định dạng:
- Được liệt kê theo thứ tự `associateAssetsNames`, ngăn cách bằng `、`: `Nhân vật A(vị trí)、Nhân vật B(vị trí)`
- Giá trị vị trí xem bảng tham khảo quan hệ không gian dưới đây (9 vị trí đứng)
- Góc máy đơn nhân vật có thể chỉ điền một mục `Nhân vật(vị trí)` hoặc điền `—`; đặc tả vật thể, khung hình trống điền `—`
- Phải tự hiểu với hướng mặt, cảnh quan, di chuyển máy quay (Nhân vật hướng mặt phải thì mục tiêu nhìn/chạm phải nằm ở vị trí đứng bên phải của nhân vật đó); vị trí đứng của các nhân vật cùng cảnh cùng nhóm phải ổn định, di chuyển phải được cung cấp hành động nối tiếp trong `action` và cập nhật đồng bộ vào cột này

**Ví dụ đầy đủ về trường** (Cảnh nhóm 5 người):
- `action`: `(mở đầu) Góc máy viễn cảnh đẩy nhẹ về phía nhóm người, năm người đứng thưa thớt——Lê Vụ hơi lệch trái, tay trái ôm chặt con thỏ bông; Nhiêu Vi ánh mắt bị thu hút bởi khối trắng đó`
- `orientation`: `Lê Vụ-3/4 mặt hướng phải; Nhiêu Vi-3/4 mặt hướng trái; Hà Tồn Vũ-3/4 mặt hướng trái; Thu Đồng-3/4 mặt hướng trái; Anna-mặt chính diện`
- `spatialRelation`: `Lê Vụ(trước trái)、Anna(trước phải)、Nhiêu Vi(sau trái)、Hà Tồn Vũ(sau giữa)、Thu Đồng(sau phải)`

**Bảng tham khảo hướng mặt** (dùng để điền cột orientation):

| Giá trị hướng mặt | Ý nghĩa | Cảnh điển hình |
|---------|------|---------|
| Mặt hướng phải | Mặt ngang hướng bên phải của khung hình | Nhân vật bên trái của đường 180°, hướng đến mục tiêu bên phải |
| Mặt hướng trái | Mặt ngang hướng bên trái của khung hình | Nhân vật bên phải của đường 180°, hướng đến mục tiêu bên trái |
| Mặt chính diện | Đối diện máy quay | Tự bộc lộ, tuyên bố, nhìn thẳng vào khán giả |
| 3/4 mặt hướng phải | Mặt 3/4 hơi lệch phải hướng máy quay | Đối thoại chính (nhân vật lệch trái trong khung hình) |
| 3/4 mặt hướng trái | Mặt 3/4 hơi lệch trái hướng máy quay | Đối thoại chính (nhân vật lệch phải trong khung hình) |
| Chính diện ngang hướng phải | Mặt chính diện ngang hướng phải | Tự bộc lộ, suy tư |
| Chính diện ngang hướng trái | Mặt chính diện ngang hướng trái | Tự bộc lộ, suy tư |
| 3/4 mặt sau hướng phải | Mặt sau 3/4 hơi lệch phải | Xa cách, rời đi |
| 3/4 mặt sau hướng trái | Mặt sau 3/4 hơi lệch trái | Xa cách, rời đi |
| Mặt sau | Lưng hướng máy quay | Xuất hiện bí ẩn, rời đi, nhìn xa |

> Có thể kết hợp điều chỉnh cúi/ngẩng: `Mặt hướng phải ngẩng nhẹ đầu`, `3/4 mặt hướng trái cúi nhẹ đầu`.

**Bảng tham khảo quan hệ không gian** (dùng để điền cột spatialRelation, cảnh nhiều nhân vật bắt buộc ghi chú):

Khung hình được chia thành lưới vị trí 3×3 với "trái/giữa/phải" × "trước/giữa/sau", trước=gần máy quay/tầng tiền cảnh, sau=xa máy quay/tầng hậu cảnh; trước/sau cũng có thể biểu đạt chênh lệch cao thấp (như trong góc quay từ trên xuống, người quỳ chiếm "giữa trước", người đứng áp đảo chiếm "giữa sau").

| Giá trị vị trí | Ý nghĩa | Cách dùng điển hình |
|---------|------|---------|
| Trước trái | Bên trái khung hình, gần máy quay | Chủ thể lệch trái tiền cảnh, thường là bên phát ngôn chủ đạo |
| Giữa trước | Giữa khung hình, gần máy quay | Chủ thể đơn giữa khung hình, bị che khuất một phần bởi tiền cảnh |
| Trước phải | Bên phải khung hình, gần máy quay | Chủ thể lệch phải tiền cảnh |
| Giữa trái | Bên trái khung hình, tầng trung cảnh | Vị trí giữa bên trái trong cảnh nhóm |
| Giữa giữa | Chính giữa khung hình, tầng trung cảnh | Chủ thể chính ở giữa, người chủ đạo đối thoại |
| Giữa phải | Bên phải khung hình, tầng trung cảnh | Vị trí giữa bên phải trong cảnh nhóm |
| Sau trái | Bên trái khung hình, xa hơn (tầng hậu cảnh) | Vị trí sau bên trái, người đồng hành |
| Sau giữa | Giữa khung hình, xa hơn | Vị trí sau giữa, bị che khuất bởi tiền cảnh hoặc ở vị trí cao hơn |
| Sau phải | Bên phải khung hình, xa hơn | Vị trí sau bên phải, người quan sát |

**emotion**（Cảm xúc）: Tông cảm xúc mà khung hình truyền đạt (2~10 từ), dùng mô tả cụ thể dễ cảm nhận. Như "lạnh lùng khinh miệt", "đau khổ tuyệt vọng", "căng thẳng áp lực". Cấm dùng từ chung chung như "vui vẻ", "buồn bã".

**scene**: Tên cảnh mà phân cảnh này thuộc về, tương ứng với kịch bản

**associateAssetsNames**: Danh sách tên tài sản **có thể nhìn thấy** trong khung hình (bao gồm cả những nhân vật/vật dụng chỉ xuất hiện một phần), để dễ dàng xác nhận nội dung liên quan

**duration**: Tham khảo cơ bản——Đặc tả/biểu cảm 2~3s · Đối thoại cận cảnh 3~5s · Xuất hiện toàn thân 3~5s · Hành động 2~4s · Viễn cảnh/khung hình trống/chuyển tiếp 3~5s · Cảnh phức tạp 5~8s. **Một góc máy không quá 8 giây**, nếu vượt quá phải tách ra.

**Khi có lời thoại, thời lượng phải đủ để đọc hết toàn bộ lời thoại và phù hợp với tốc độ nói theo cảm xúc**:

| Trạng thái cảm xúc | Tham khảo tốc độ nói | Cảnh điển hình |
|---------|---------|----------|
| Giận dữ, gấp gáp, cãi nhau | ~4 chữ/giây | La mắng, thúc giục, hoảng hốt |
| Đối thoại bình thường, tường thuật | ~3 chữ/giây | Cuộc trò chuyện hàng ngày, trình bày bình tĩnh |
| Buồn bã, sâu lắng, suy tư | ~2 chữ/giây | Tỏ tình, than khóc, hồi tưởng |
| Thì thầm, yếu ớt, hấp hối | ~2 chữ/giây | Nói yếu ớt, thì thầm bên tai |

Cách tính: Số chữ trong lời thoại ÷ tốc độ nói tương ứng (làm tròn lên) = Số giây cơ bản, sau đó cộng thêm khoảng dừng:
- Mỗi dấu câu trong lời thoại (dấu phẩy, dấu chấm, dấu ba chấm, dấu gạch ngang, v.v.) +0.3~0.5 giây
- Đoạn chuyển cảm xúc/thay đổi giọng điệu +0.5 giây
- Cuối cùng `duration` = Số giây cơ bản + Tổng thời gian dừng + 1 giây dư thừa an toàn (làm tròn lên)

**lines**: Nguyên văn lời thoại của nhân vật, **phải sao chép từ kịch bản mà không sửa đổi một chữ nào**. Nhiều nhân vật theo định dạng `Tên nhân vật: Lời thoại`. Không có lời thoại điền `Không có lời thoại`. Một câu thoại tương ứng một góc máy, tránh nhét nhiều vòng đối thoại của nhiều nhân vật vào một góc máy.

**sound**（Hiệu ứng âm thanh）: Mô tả âm thanh thuần túy, phân lớp theo "Lớp âm thanh môi trường + Lớp âm thanh hành động". Như "Gió hú ở xa + Tiếng kiếm kêu". Không có âm thanh điền `Không có âm thanh`.

> **🚫 Cấm nhạc nền/nhạc kịch**: Sản phẩm cuối cùng của dây chuyền này **hoàn toàn không chứa nhạc nền**. Cột `sound` chỉ chứa nguồn âm thanh thực (âm thanh môi trường + âm thanh hành động + âm thanh giả lập), bất kỳ "BGM", "nhạc nền", "giai điệu", "nhạc cụ như dàn nhạc/đàn piano/đàn hạc/tiếng sáo dùng làm tăng cường bầu không khí" đều bị coi là vi phạm, và sẽ bị đánh giá là vấn đề nghiêm trọng. Nếu trong kịch bản có cảnh diễn nhạc cụ như một hành động trong cốt truyện (như nhân vật chơi đàn), chỉ có thể viết "Tiếng rung kim loại khi ngón tay chạm dây + Tiếng ầm ầm của hộp cộng hưởng" hoặc các nguồn âm thanh vật lý cụ thể khác.

**associateAssetsIds**: ID của tài sản **có thể nhìn thấy** trong khung hình (lấy giá trị từ trường `id` trong dữ liệu tài sản), không bịa ra ID không tồn tại.
- **Nhân vật xuất hiện thì phải trích dẫn**: Tất cả các nhân vật xuất hiện trong khung hình, bất kể là chủ thể hay chỉ xuất hiện một phần (như bóng lưng, tay, bóng mờ, v.v.), chỉ cần có thể được nhận biết trong khung hình, đều phải trích dẫn ID tài sản tương ứng
- **Tài sản cảnh phải chọn**: Mỗi phân cảnh phải trích dẫn ID tài sản cảnh tương ứng với cảnh mà nó thuộc về (loại là scene); nếu cảnh đó có tài sản cảnh phái sinh phù hợp với trạng thái khung hình hiện tại, thì chọn ID tài sản cảnh phái sinh, nếu không thì chọn ID tài sản cảnh chính. Thiếu ID tài sản cảnh sẽ bị coi là trường không đầy đủ
- Quy tắc lựa chọn tài sản cha-con: Chọn ID tài sản theo trạng thái cần thiết của kịch bản——nếu góc máy đó cần trạng thái phái sinh của một tài sản chính, **chỉ chọn ID tài sản phái sinh**; chỉ khi không tồn tại trạng thái phái sinh phù hợp thì mới chọn ID tài sản chính; tài sản cha cùng phân cảnh cấm xuất hiện đồng thời tài sản chính/phái sinh

---

## Quy tắc chuyển cảnh

- **Trong cùng cảnh**: Các góc máy mặc định cắt cứng
- **Qua cảnh**: Chèn 1 phân cảnh khung hình trống (2~3 giây) để tạo đệm cảm xúc, nội dung khung hình trống liên quan đến không khí của cảnh trước và sau
- **Qua đoạn**: Có thể đánh dấu "chuyển đổi chồng" hoặc "mờ dần vào/mờ dần ra" trong description
- Cấm dùng chuyển cảnh hoa mỹ (vuốt, xoay, rèm cửa sổ, v.v.)