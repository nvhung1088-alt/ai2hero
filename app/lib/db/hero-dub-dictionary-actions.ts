'use server';

import { db } from './drizzle';
import { dubDictionaries, DubDictionary, NewDubDictionary } from './schema';
import { eq, or, isNull, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Seed mặc định 5 bộ từ điển chuẩn
const DEFAULT_SYSTEM_DICTIONARIES: Array<Omit<NewDubDictionary, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'xianxia',
    name: '🗡️ Tiên hiệp / Tu tiên',
    keywords: 'tiên hiệp, tu tiên, độ kiếp, tu vi, pháp bảo, luyện khí, nguyên thần, kim đan, nguyên anh, hóa thần, linh thạch, tẩu hỏa nhập ma',
    promptContent: `# THỂ LOẠI & VĂN PHONG
- Thể loại: Phim Tiên hiệp / Tu tiên / Huyền huyễn.
- Văn phong: Trang trọng, tiên phong đạo cốt, sử dụng từ Hán-Việt chuẩn mực của giới tu tiên. TUYỆT ĐỐI KHÔNG dùng từ ngữ hiện đại, từ lóng hoặc văn nói đời thường.

---

## 1. QUY TẮC XƯNG HÔ (THEO GIAI TẦNG & TÔNG MÔN)
- **Yêu tộc / Chúa động phủ (\`大王\`):**
  - \`大王\` → Đại vương (Dùng cho vua yêu quái / chúa động phủ. TUYỆT ĐỐI KHÔNG dịch thành "Bệ hạ" hay "Hoàng thượng").
  - Yêu quái xưng hô với Đại vương: Thuộc hạ, Tiểu yêu.
- **Tiên nhân / Tu sĩ độc lập:**
  - Xưng hô ngang hàng: Đạo hữu, Bần đạo.
  - Phân biệt tiền-hậu: Tiền bối, Vãn bối / Hậu bối.
  - Cao nhân / Đại năng tự xưng: Bổn tọa, Bổn tôn.
- **Sư môn / Tông phái:**
  - \`师尊 / 师父\` → Sư tôn / Sư phụ.
  - \`弟子 / 徒儿\` → Đệ tử / Đồ nhi.
  - \`掌门 / 宗主\` → Chưởng môn / Tông chủ.
  - \`师兄 / 师弟 / 师姐 / 师妹\` → Sư huynh / Sư đệ / Sư tỷ / Sư muội.

---

## 2. TỪ ĐIỂN THUẬT NGỮ TU TIÊN (GLOSSARY)

### A. Cảnh giới tu luyện (Phải dịch chuẩn Hán-Việt)
- 练气 = Luyện Khí
- 筑基 = Trúc Cơ
- 金丹 = Kim Đan
- 元婴 = Nguyên Anh
- 化神 = Hóa Thần
- 渡劫 = Độ Kiếp
- 飞升 = Phi Thăng
- 天仙 = Thiên Tiên
- 突破 = Đột phá / Phá cảnh

### B. Khái niệm & Hành động tu luyện
- 炼化 = Luyện hóa (hấp thụ/tinh luyện pháp bảo, linh lực)
- 修为 = Tu vi
- 功法 = Công pháp
- 灵气 = Linh khí
- 元神 = Nguyên Thần
- 法宝 = Pháp bảo
- 丹药 = Đan dược
- 灵石 = Linh thạch (Đơn vị tiền tệ/năng lượng tu tiên)
- 阵法 = Trận pháp
- 秘境 = Bí cảnh
- 洞府 = Động phủ
- 闭关 / 出关 = Bế quan / Xuất quan
- 夺舍 = Đoạt xá
- 走火入魔 = Tẩu hỏa nhập ma

---

## 3. SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP (HOMOPHONE CORRECTION)
Whisper AI thường nhận diện sai thuật ngữ tu tiên thành từ thông thường. LLM BUỘC PHẢI suy luận theo ngữ cảnh và tự sửa các lỗi sau trước khi dịch:

- **Lỗi Cảnh giới & Tu luyện:**
  - 练画 / 练话 → 炼化 (Luyện hóa)
  - 天先 / 天线 → 天仙 (Thiên Tiên)
  - 度节 / 渡节 → 渡劫 (Độ kiếp)
  - 筑机 / 住基 → 筑基 (Trúc Cơ)
  - 元鹰 / 原英 → 元婴 (Nguyên Anh)
- **Lỗi Vật phẩm & Hành động:**
  - 法保 / 发保 → 法宝 (Pháp bảo)
  - 零食 / 灵诗 → 灵石 (Linh thạch - TUYỆT ĐỐI KHÔNG dịch là "đồ ăn vặt")
  - 但药 / 耽药 → 丹药 (Đan dược)
  - 壁关 / 避关 → 闭关 (Bế quan)
  - 多舌 / 朵舌 → 夺舍 (Đoạt xá)
  - 走火入膜 → 走火入魔 (Tẩu hỏa nhập ma)

---

## 4. QUY TẮC PHỤ ĐỀ (SUBTITLE CONSTRAINTS)
- **Ngắn gọn, súc tích:** Ưu tiên câu từ cô đọng để phù hợp tốc độ đọc phụ đề (1-3 giây/câu).
- **Chỉ xuất kết quả:** Chỉ trả về dòng dịch tiếng Việt tương ứng, KHÔNG kèm giải thích hay ghi chú.`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'tayDuKy',
    name: '🐒 Tây Du Ký / Ngoại truyện',
    keywords: 'tây du, tây du ký, tôn ngộ không, đại thánh, bảo tượng quốc, bạch hổ lĩnh, bác học hồng từ, trạng nguyên, tể tướng, yêu vương, linh sơn, phật môn',
    promptContent: `Thể loại: Phim Tây Du Ký / Ngoại truyện yêu vương (Âm mưu / Bàn cờ thế lực).

QUY TẮC XƯNG HÔ:
- 大王 = Đại Vương (vua yêu quái). KHÔNG dịch "Bệ hạ".
- 陛下 = Bệ hạ (chỉ dùng cho vua loài người ở triều đình).
- Yêu quái gọi chủ: Đại vương, Chủ nhân.
- Thần tiên gọi nhau: Đại Thánh, Tiền bối, Đạo hữu.
- 奴家 = Thiếp / Tiểu nữ (yêu nữ xưng hô với Đại vương).
- 猴子 / 泼猴 = Khỉ con / Yêu hầu (cách yêu vương gọi Tôn Ngộ Không).

ĐỊA DANH & NHÂN VẬT TÂY DU:
- 宝象国 = Bảo Tượng Quốc (KHÔNG dịch "Bảo Hướng")
- 白虎岭 = Bạch Hổ Lĩnh
- 花果山 = Hoa Quả Sơn
- 金角大王 = Kim Giác Đại Vương
- 银角大王 = Ngân Giác Đại Vương
- 佛门 / 天庭 / 灵山 = Phật Môn / Thiên Đình / Linh Sơn
- 功德 / 气运 = Công đức / Khí vận

TỪ ĐIỂN KHOA CỬ & THÀNH NGỮ:
- 博学鸿词科 = Khoa thi Bác Học Hồng Từ
- 状元 = Trạng nguyên
- 宰相 = Tể tướng
- 春秋 = Xuân Thu (kinh điển)
- 周礼 = Chu Lễ (kinh điển)
- 趟浑水 = Dính vào vũng nước đục (thành ngữ: can thiệp vào chuyện rắc rối)
- 过河帅 = Tướng qua sông (quân tốt qua sông hóa Tướng trên bàn cờ)

SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP:
- 薄雪红磁壳 → 博学鸿词科 (Bác Học Hồng Từ)
- 烧大的竹子 → 稍大的卒子 (quân tốt nhỉnh hơn)
- 魂水 → 浑水 (nước đục)
- 家详 → 可想 (nhớ)
- 彩相 → 宰相 (Tể tướng)
- 状怨 → 状元 (Trạng nguyên)
- 贺物器 → 货物 (món hàng - Vd: 行走的货物 = món hàng biết đi)
- 练画 → 炼化 (luyện hóa pháp bảo/tu vi)
- 天先 → 天仙 (cảnh giới Thiên Tiên)`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'coTrang',
    name: '👑 Cổ trang Triều đình',
    keywords: 'cổ trang, triều đình, hoàng đế, thừa tướng, hàn lâm, tri chế cáo, muối sắt, trà ngựa, điền phú, hoàng thượng, bệ hạ, trẫm, thượng thư, thị lang, tấu chương',
    promptContent: `Thể loại: Phim cổ trang triều đình / cung đấu / quan trường.

---

## 1. QUY TẮC XƯNG HÔ (BẮT BUỘC)
- **Hoàng đế:** Tự xưng "Trẫm". Gọi thần tử: "Khanh", "Ái khanh". Gọi phi tần: "Ái phi", "Nàng".
- **Thần tử (Quan lại):** Tự xưng "Thần" (nam), "Vi thần", "Hạ quan" (với quan cấp cao hơn), "Ti chức" (võ quan). Gọi vua: "Bệ hạ", "Hoàng thượng".
- **Hậu cung & Hoàng thất:**
  - Thái hậu: "Ai gia" (tự xưng) → gọi vua: "Hoàng đế" / "Hoàng nhi".
  - Hoàng hậu: "Bổn cung" (tự xưng).
  - Phi tần: "Thần thiếp", "Tần thiếp" (tự xưng) → gọi nhau ngoài mặt: "Tỷ tỷ / Muội muội".
  - Thái tử / Hoàng tử: "Bổn vương", "Bổn thái tử" → gọi vua/mẹ: "Nhi thần", "Phụ hoàng", "Mẫu hậu".
  - Công chúa: "Bổn công chúa".
- **Nội quan / Người hầu:**
  - Thái giám / Cung nữ: Tự xưng "Nô tài", "Nô tỳ" → gọi chủ: "Chủ tử", "Nương nương", "Bệ hạ".
- **Quan lại giao tiếp:** Gọi nhau bằng "Đại nhân", "Tiên sinh", "Lão sư".
- **TUYỆT ĐỐI KHÔNG** dùng đại từ hiện đại: "anh / cô / tôi / bạn / cậu / tớ".

---

## 2. TỪ ĐIỂN CHỨC TƯỚC & THUẬT NGỮ TRIỀU ĐÌNH

### A. Chức tước & Cơ quan Triều đình
- 丞相 / 宰相 = Thừa tướng / Tể tướng
- 六部 = Lục bộ (Lại, Hộ, Lễ, Binh, Hình, Công - 吏户礼兵刑工)
- 尚书 = Thượng thư (đứng đầu một Bộ)
- 侍郎 = Thị lang (cấp phó trong Bộ)
- 御史大夫 / 御史 = Ngự sử đại phu / Ngự sử
- 翰林 / 翰林院 = Hàn Lâm / Hàn Lâm Viện
- 知制诰 = Tri chế cáo
- 权知户部事 = Quyền tri Hộ bộ sự
- 钦差 = Khâm sai / Khâm sai đại thần

### B. Chính sách, Kinh tế & Văn bản
- 圣旨 / 诏书 = Thánh chỉ / Chiếu thư
- 奏折 / 奏章 = Tấu chương / Tấu chiết
- 盐铁专卖 = Độc quyền muối sắt
- 茶马互市 = Giao thương Trà - Ngựa
- 田赋 = Thuế ruộng / Điền phú
- 科举 = Khoa cử

### C. Cung đấu, Hình phạt & Đình chiến
- 冷宫 = Lãnh cung
- 请安 = Thỉnh an
- 赐死 = Tứ tử (ban cho cái chết)
- 诛九族 / 株连九族 = Tru di cửu tộc / Chu di cửu tộc
- 流放 = Lưu đày (đày đi biên cương)
- 贬为庶民 = Giáng làm thứ dân
- 斩立决 = Chém lập tức / Trảm lập quyết
- 欺君之罪 = Tội khi quân (lừa dối vua)

---

## 3. SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP (QUAN TRỌNG)
Whisper AI hay nghe nhầm từ Hán cổ sang từ hiện đại. BUỘC PHẢI tự động suy luận và sửa các lỗi sau trước khi dịch:

- **Lỗi Quan chức & Chính sách:**
  - 汉林 → 翰林 (Hàn Lâm)
  - 知智告 → 知制诰 (Tri chế cáo)
  - 全支户部士 → 权知户部事 (Quyền tri Hộ bộ sự)
  - 严帖专媚 → 盐铁专卖 (Độc quyền muối sắt)
  - 查马户士 → 茶马互市 (Giao thương Trà - Ngựa)
  - 天父 → 田赋 (Thuế ruộng / Điền phú)
  - 科技 / 客机 → 科举 (Khoa cử - TUYỆT ĐỐI KHÔNG dịch là "khoa học công nghệ")
- **Lỗi Triều đình & Cung đấu:**
  - 甚至 → 圣旨 (Thánh chỉ)
  - 走着 / 奏者 → 奏折 (Tấu chương)
  - 酒足 / 九足 → 九族 (Cửu tộc - vd: Tru di cửu tộc)
  - 市民 → 庶民 (Thứ dân - KHÔNG dịch là "thị dân/người thành phố")
  - 成以为 / 人以为 → 臣以为 (Thần cho rằng / Thần thiết nghĩ)
  - 本工 / 本公 → 本宫 (Bổn cung)`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'xuyenKhong',
    name: '⚡ Xuyên không',
    keywords: 'xuyên không, hệ thống, kpi, hiện đại về cổ đại, xuyên qua, xuyên thư, bàn tay vàng, ký chủ, trà xanh, vả mặt',
    promptContent: `# THỂ LOẠI & NGỮ CẢNH
- Thể loại: Phim Xuyên không / Xuyên thư / Cổ trang kết hợp hiện đại / Hệ thống (System).
- Đặc trưng: Nhân vật từ thế giới hiện đại xuyên về thời cổ đại, thường xuyên có sự giao thoa giữa từ ngữ công sở/internet hiện đại và văn phong quan trường/cổ phong.

---

## 1. QUY TẮC XƯNG HÔ KÉP (DUAL TONE SWITCHING - BẮT BUỘC)
Bạn BUỘC PHẢI phân tích ngữ cảnh của từng dòng thoại để chọn hệ xưng hô chính xác:

- **Hệ Cổ phong (Giao tiếp công khai thời cổ đại):**
  - Khi nói chuyện với Vua / Quan lại / Người cổ đại: Sử dụng nghiêm ngặt văn phong cổ trang ("Bệ hạ", "Thần", "Khanh", "Tiểu nữ", "Đại nhân", "Bổn cung", "Vương gia").
- **Hệ Hiện đại (Nội tâm / Chửi thầm / Giao tiếp riêng):**
  - Khi độc thoại nội tâm, suy nghĩ trong đầu, hoặc chửi thầm: Dùng đại từ hiện đại ("Tôi", "Anh", "Cô", "Tên kia", "Lão già này").
  - Khi trò chuyện với Hệ thống (System) hoặc người đồng hương cùng xuyên không: Dùng "Tôi - Hệ thống", "Tôi - Cậu/Anh/Cô", "Ký chủ".
- **Hệ Pha trộn (Hài hước cố ý):**
  - Khi nhân vật cố tình dùng từ ngữ hiện đại giữa triều đình để gây hài hoặc nói móc, giữ nguyên thuật ngữ hiện đại nhưng kết hợp danh xưng cổ phong.
  - *Ví dụ:* "Bệ hạ, ngài giao cho thần cái KPI này thật sự quá áp lực rồi!" / "Vương gia, ngài đừng có PUA tiểu nữ nữa!"

---

## 2. TỪ ĐIỂN THUẬT NGỮ HIỆN ĐẠI & HỆ THỐNG (GLOSSARY)
TUYỆT ĐỐI KHÔNG cổ phong hóa hoặc Hán-Việt hóa các khái niệm hiện đại/game dưới đây:

### A. Thuật ngữ Hệ thống / Game / Xuyên thư
- 系统 = Hệ thống
- 宿主 = Ký chủ (nhân vật được hệ thống ràng buộc)
- 金手指 = Bàn tay vàng (thủ thuật gian lận / năng lực đặc biệt)
- 任务 = Nhiệm vụ
- 攻略 = Công lược (chinh phục mục tiêu/nhân vật)
- 好感度 = Độ hảo cảm / Chỉ số thiện cảm
- 穿书 = Xuyên thư (xuyên vào tiểu thuyết)
- 重生 = Trùng sinh / Tái sinh
- 炮灰 = Pháo hối (nhân vật hy sinh / làm nền)
- 绿茶 = Trà xanh
- 白莲花 = Bạch liên hoa
- 打脸 = Vả mặt (lật ngược tình thế khiến kẻ khinh thường mình xấu hổ)

### B. Thuật ngữ Công sở / Kinh doanh / Internet (Giữ nguyên tiếng Việt/Anh phổ thông)
- KPI / 业绩 = KPI / Chỉ số công việc
- PPT / 幻灯片 = PPT / Slide thuyết trình
- 加班 / OT = Tăng ca / OT
- 社畜 = Súc vật công sở / Dân văn phòng làm thuê
- 霸总 / CEO = Bá tổng / CEO / Tổng tài
- PUA / CPU = Thao túng tâm lý / PUA
- 粉丝 = Fan / Người hâm mộ
- 流量 = Lưu lượng / Traffic

---

## 3. SỬA LỖI ĐỒNG ÂM ASR ĐẶC THÙ XUYÊN KHÔNG (QUAN TRỌNG)
Whisper AI cực kỳ dễ nhận diện sai khi từ ngữ hiện đại hoặc từ tiếng Anh bị xen vào giữa câu nói tiếng Trung cổ trang. Bạn BUỘC PHẢI suy luận theo ngữ cảnh Xuyên không để tự sửa các lỗi sau:

- **Lỗi Hệ thống & Thuật ngữ Xuyên không:**
  - 谨守旨 / 仅手指 → 金手指 (Bàn tay vàng - TUYỆT ĐỐI KHÔNG dịch thành "tuân thủ thánh chỉ")
  - 传输 / 穿衣 → 穿书 (Xuyên thư / Xuyên vào sách)
  - 诉主 / 俗主 → 宿主 (Ký chủ)
  - 工业 / 攻列 → 攻略 (Công lược - KHÔNG dịch là "công nghiệp")
  - 跑腿 / 泡灰 → 炮灰 (Pháo hối)
- **Lỗi Thuật ngữ Công sở & Tiếng Anh xen kẽ:**
  - K P I (hay bị ASR dịch thành chữ Hán đồng âm như \`开辟爱\` / \`凯皮哀\`) → KPI
  - P T T / P P T (hay bị ASR nhận diện nhầm thành \`婆婆体\` / \`皮皮踢\`) → PPT / Slide
  - 批斗 / 脾肺 → PUA / CPU (Thao túng tâm lý)
  - 蛇处 / 摄出 → 社畜 (Dân làm thuê công sở)

---

## 4. QUY TẮC PHỤ ĐỀ (SUBTITLE CONSTRAINTS)
- **Ngắn gọn, súc tích:** Tối ưu số lượng từ để người xem đọc kịp trong 1-3 giây.
- **Tính liền mạch:** Nếu một câu thoại có cả phần đối thoại cổ phong lẫn độc thoại nội tâm hiện đại (ví dụ: "[Nghĩ thầm] Tên hoàng đế điên rồi! [Nói] Thần tuân chỉ!"), hãy thể hiện rõ phần nội tâm bằng ngoặc đơn \`(...)\` hoặc ngoặc vuông \`[...]\` nếu video gốc có hiệu ứng âm thanh suy nghĩ.
- **Chỉ xuất kết quả:** Chỉ trả về văn bản tiếng Việt của dòng phụ đề, KHÔNG kèm giải thích hay chú thích.`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'doThi',
    name: '🏙️ Đô thị hiện đại',
    keywords: 'đô thị, hiện đại, tổng tài, giám đốc, tình cảm, công sở, hào môn, xem mắt, hợp đồng hôn nhân, vệ sĩ, bắt cóc',
    promptContent: `# THỂ LOẠI & NGỮ CẢNH
- Thể loại: Phim Đô thị hiện đại / Tình cảm / Hào môn thương trường / Hành động.
- Văn phong: Tự nhiên, đời thường, hiện đại. Tránh dùng từ ngữ Hán-Việt cổ phong hoặc dịch quá cứng nhắc theo ngữ pháp tiếng Trung. Giữ nguyên tên riêng thương hiệu, tập đoàn, công ty nếu có.

---

## 1. QUY TẮC XƯNG HÔ ĐỘNG (DYNAMIC PRONOUN SWITCHING - BẮT BUỘC)
Tiếng Việt hiện đại thay đổi đại từ xưng hô rất mạnh theo mức độ thân thiết và diễn biến cảm xúc. Bạn BUỘC PHẢI căn cứ vào ngữ cảnh để chọn cặp xưng hô:

- **Tình cảm / Nam nữ chính:**
  - Mới quen / Công việc / Đối đầu: **Tôi - Cô / Tôi - Anh / Tôi - Cậu**.
  - Đã hẹn hò / Thân thiết / Vợ chồng: **Anh - Em**.
  - Cãi vã gay gắt / Chia tay / Xé rách mặt: **Tôi - Anh / Tôi - Cô**, thậm chí **Tôi - Người** hoặc **Tao - Mày** (nếu đối đầu gay gắt ở tuyến nhân vật giang hồ/phản diện).
- **Công sở / Thương trường:**
  - Cấp trên - Cấp dưới: **Tôi - Cậu/Cô** (Sếp xưng), **Tôi/Em - Sếp/Giám đốc/Tổng giám đốc** (Cấp dưới xưng).
  - Đồng nghiệp ngang hàng: **Tôi - Bạn / Cậu - Tớ / Anh - Em** (tùy tuổi tác).
- **Hành động / Hắc đạo / Ngầm:**
  - Đàn anh giang hồ / Lão đại: **Đại ca / Lão đại / Sếp** → gọi đàn em: **Cậu / Mày / Tụi bây**.
  - Kẻ thù / Đối đầu trực diện: **Tao - Mày / Các người**.
- **Gia đình / Hào môn:**
  - Bố mẹ - Con cái: **Bố/Ba/Mẹ - Con**.
  - Ông bà - Cháu: **Ông/Bà - Cháu**.
  - Anh chị em: **Anh/Chị - Em**.

---

## 2. TỪ ĐIỂN THUẬT NGỮ ĐÔ THỊ & HÀNH ĐỘNG (GLOSSARY)

### A. Thương trường / Công sở / Hào môn
- 总裁 / 霸总 = Tổng giám đốc / Tổng tài
- 董事长 = Chủ tịch / Chủ tịch hội đồng quản trị
- 董事会 = Hội đồng quản trị
- 股份 / 股权 = Cổ phần / Cổ quyền
- 收购 / 并购 = Thâu tóm / Sáp nhập (M&A)
- 合作协议 / 合同 = Thỏa thuận hợp tác / Hợp đồng
- 违约金 = Tiền bồi thường hợp đồng / Tiền vi phạm hợp đồng
- 豪门 / 世家 = Hào môn / Gia tộc lớn

### B. Tình cảm / Gia đấu đô thị
- 契约婚姻 = Hôn nhân hợp đồng / Hợp đồng hôn nhân
- 相亲 = Xem mắt
- 小三 / 第五者 = Tiểu tam / Kẻ thứ ba
- 绿茶 = Trà xanh
- 闪婚 = Cưới chớp nhoáng / Cưới thần tốc
- 隐婚 = Kết hôn bí mật

### C. Hành động / Hình sự / Hắc đạo
- 卧底 = Tay trong / Cảnh sát ngầm / Nội gián
- 黑道 / 江湖 = Hắc đạo / Giang hồ / Thế giới ngầm
- 赎金 = Tiền chuộc
- 绑架 = Bắt cóc
- 证据 = Bằng chứng / Chứng cứ
- 保镖 = Vệ sĩ
- 走私 = Buôn lậu

---

## 3. SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP (HOMOPHONE CORRECTION)
Whisper AI dễ nghe nhầm các thuật ngữ thương mại và hành động tiếng Trung thành từ đồng âm thông thường. BUỘC PHẢI tự động suy luận và sửa các lỗi sau trước khi dịch:

- **Lỗi Thương trường / Hợp đồng:**
  - 骨粉 / 鼓粉 → 股份 (Cổ phần - TUYỆT ĐỐI KHÔNG dịch là "bột xương")
  - 懂事会 → 董事会 (Hội đồng quản trị - KHÔNG dịch là "hội những người hiểu chuyện")
  - 挟意 / 邪意 → 协议 (Thỏa thuận / Hợp đồng)
  - 种菜 / 总财 → 总裁 (Tổng tài / Tổng giám đốc - KHÔNG dịch là "trồng rau")
- **Lỗi Hành động / Hắc đạo:**
  - 握底 / 卧地 → 卧底 (Tay trong / Cảnh sát ngầm - KHÔNG dịch là "nằm bò ra đất")
  - 熟金 / 蜀金 → 赎金 (Tiền chuộc - KHÔNG dịch là "vàng chín")
  - 保标 → 保镖 (Vệ sĩ)
  - 挣扎 / 郑聚 → 证据 (Bằng chứng / Chứng cứ)

---

## 4. QUY TẮC PHỤ ĐỀ (SUBTITLE CONSTRAINTS)
- **Ngắn gọn, nhịp điệu nhanh:** Phim hành động và đô thị có nhịp thoại nhanh, cần ưu tiên câu văn ngắn gọn, súc tích (1-3 giây/câu).
- **Văn nói tự nhiên:** Sử dụng các từ đệm, từ nối tiếng Việt tự nhiên trong hội thoại (nhé, đâu, đấy, chứ, kìa) để lời thoại không bị giống văn dịch máy.
- **Chỉ xuất kết quả:** Chỉ trả về văn bản tiếng Việt của phụ đề, KHÔNG kèm giải thích hay chú thích.`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'danQuoc',
    name: '🕵️ Dân Quốc / Thượng Hải / Tình báo',
    keywords: 'dân quốc, thượng hải, quân phiệt, tình báo, đốc quân, đại soái, thiếu soái, tô giới, quân thống, nội gián, điệp viên, bách lạc môn',
    promptContent: `# THỂ LOẠI & NGỮ CẢNH
- Thể loại: Phim Dân Quốc / Thượng Hải những năm 1920-1940 / Quân phiệt / Tình báo gián điệp.
- Văn phong: Trang trọng, hơi nhuốm màu cổ điển nhưng mang hơi thở quân sự, chính trị, thương trường Thượng Hải xưa.

---

## 1. QUY TẮC XƯNG HÔ DÂN QUỐC (BẮT BUỘC)
- **Quân phiệt / Sĩ quan cấp cao:**
  - \`大帅 / 督军\` → Đại soái / Đốc quân (Xưng: Tôi/Bản tọa/Bản tướng).
  - \`少帅\` → Thiếu soái / Thiếu tư lệnh.
  - Cấp dưới gọi cấp trên: **Trường quan / Sếp / Tư lệnh / Thiếu soái** → tự xưng: **Tôi / Thuộc hạ / Ti chức**.
- **Hào môn Thượng Hải / Giang hồ:**
  - \`二爷 / 三爷\` → Nhị gia / Tam gia (Ông trùm/Cậu hai, Cậu ba).
  - \`夫人 / 少奶奶\` → Phu nhân / Thiếu phu nhân / Thiếu nãi nãi.
  - Người hầu gọi chủ: **Nhị gia / Phu nhân / Thiếu gia** → tự xưng: **Tôi / Con / Nô tài**.
- **Tình báo / Đồng chí:**
  - Ngụy trang ngoài xã hội: **Anh - Tôi / Ông - Tôi / Tiên sinh - Thưa ông**.
  - Nội bộ tổ chức: **Đồng chí / Chỉ huy / Tổ trưởng**.

---

## 2. TỪ ĐIỂN THUẬT NGỮ DÂN QUỐC & TÌNH BÁO
- 租界 = Tô giới (khu vực do nước ngoài quản lý tại Thượng Hải)
- 洋行 = Dương hàng (công ty/thương hiệu phương Tây)
- 军火 = Quân hỏa (vũ khí / đạn dược)
- 军统 / 中统 = Quân thống / Trung thống (cơ quan tình báo)
- 卧底 / 特工 = Nội gián / Đặc công / Điệp viên
- 情报 = Tình báo / Thông tin mật
- 堂口 = Đường khẩu (chi nhánh bang hội giang hồ)
- 大乐门 / 百乐门 = Bách Lạc Môn / Vũ trường xưa
- 刺杀 = Ám sát / Thích sát

---

## 3. SỬA LỖI ĐỒNG ÂM ASR DÂN QUỐC
- 少帅 (Shàoshuài) → hay nhầm thành 少税 / 烧帅 → Thiếu soái / Thiếu tư lệnh
- 租界 (Zūjiè) → hay nhầm thành 租借 (cho mượn) → Tô giới (TUYỆT ĐỐI KHÔNG dịch là "cho mượn")
- 军火 (Jūnhuǒ) → hay nhầm thành 均火 → Vũ khí / Quân hỏa
- 军统 (Jūntǒng) → hay nhầm thành 均同 → Quân thống
- 长官 (Zhǎngguān) → hay nhầm thành 掌握 → Trường quan / Sếp / Chỉ huy`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'linhDi',
    name: '👻 Linh Dị / Đạo Mộ / Phong Thủy',
    keywords: 'linh dị, đạo mộ, trộm mộ, phong thủy, trừ tà, cương thi, mạc kim hiệu úy, bánh ú, oán khí, quỷ đả tường, tịch tà',
    promptContent: `# THỂ LOẠI & NGỮ CẢNH
- Thể loại: Phim Linh Dị / Đạo Mộ (trộm mộ) / Phong Thủy / Trừ Tà / Huyền Nghi Trinh Thám.
- Văn phong: Bí ẩn, kỳ bí, xen lẫn thuật ngữ đạo giáo, phong thủy và lóng giang hồ.

---

## 1. QUY TẮC XƯNG HÔ
- **Đạo sĩ / Thầy phong thủy / Sư phụ:**
  - Người ngoài gọi: **Đạo trưởng / Tiên sinh / Đại sư / Sư phụ**.
  - Đệ tử gọi sư phụ: **Sư phụ / Sư tôn** → tự xưng: **Đệ tử / Con**.
- **Đoàn thám hiểm / Trộm mộ:**
  - Xưng hô giang hồ: **Lão đại / Anh - Tôi / Mày - Tao / Cậu - Tớ** (tùy mức độ thân thiết).

---

## 2. TỪ ĐIỂN THUẬT NGỮ ĐẠO MỘ & LINH DỊ
- 摸金校尉 = Mạc Kim Hiệu Úy (chỉ đạo tặc trộm mộ có kỹ thuật phong thủy)
- 搬山 / 卸岭 = Ban Sơn / Tả Lĩnh (các môn phái đạo mộ)
- 风水 / 寻龙诀 = Phong thủy / Tầm Long Quyết
- 煞气 / 怨气 = Sát khí / Oán khí
- 厉鬼 / 游魂 = Lệ quỷ / Du hồn
- 僵尸 = Cương thi
- 粽子 = Bánh ú / Cương thi (TỪ LÓNG ĐẠO MỘ: chỉ xác chết lâu năm sống dậy trong mộ)
- 辟邪 = Tịch tà / Trừ tà
- 开棺 = Khai quan (mở quan tài)
- 阵眼 = Trận nhãn (mắt trận, điểm cốt lõi phá bùa chú/phong thủy)
- 鬼打墙 = Quỷ đả tường (hiện tượng ma đưa lối, đi lạc chỗ cũ không lối ra)

---

## 3. SỬA LỖI ĐỒNG ÂM & LÓNG ASR (CỰC KỲ QUAN TRỌNG)
- 粽子 (Zòngzi) → ASR nghe đúng chữ "粽子" nhưng LLM thường dịch nghĩa đen là "Bánh ú/Bánh chưng". **BẮT BUỘC dịch là "Cương thi", "Xác sống", hoặc giữ lóng "Bánh ú" (nhưng theo nghĩa quái vật trong mộ)**.
- 煞气 (Shàqì) → hay nhầm thành 杀气 (sát khí giết chóc) → Sát khí (khí âm tà) / Oán khí.
- 辟邪 (Bìxié) → hay nhầm thành 必需 (cần thiết) → Trừ tà / Tịch tà.
- 摸金 (Mōjīn) → hay nhầm thành 摸今 → Mạc kim (trộm mộ theo phong thủy).
- 鬼打墙 (Guǐ dǎ qiáng) → KHÔNG dịch là "quỷ đánh tường" → Ma đưa lối / Quỷ đả tường.`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'eSports',
    name: '🎮 Thanh Xuân / E-Sports / Học Đường',
    keywords: 'thanh xuân, học đường, esports, thể thao điện tử, học bá, hoa khôi, nam thần, gánh team, leo rank, cao khảo, học trưởng, combat',
    promptContent: `# THỂ LOẠI & NGỮ CẢNH
- Thể loại: Phim Thanh Xuân Vườn Trường / E-sports (Thể thao điện tử) / Ngôn tình giới trẻ.
- Văn phong: Trẻ trung, năng động, đời thường, chuẩn ngôn ngữ giới trẻ/game thủ hiện đại.

---

## 1. QUY TẮC XƯNG HÔ HỌC ĐƯỜNG & GAME
- **Bạn bè lớp học:**
  - Bình thường: **Cậu - Tớ / Cậu - Mình / Bạn - Mình**.
  - Con trai thân thiết: **Mày - Tao / Ông - Tôi**.
- **Tiền bối / Đàn anh đàn chị:**
  - \`学长 / 学姐\` → Học trưởng / Học tỷ → Dịch tự nhiên: **Anh / Chị / Đàn anh / Đàn chị** (xưng: **Em**).
- **Đội tuyển E-sports:**
  - \`队长\` → Đội trưởng / Captain.
  - \`教练\` → Huấn luyện viên / Coach.
  - Các thành viên: **Anh - Em / Cậu - Tớ / Mày - Tao** (tùy ngữ cảnh lúc thi đấu hay sinh hoạt).

---

## 2. TỪ ĐIỂN THUẬT NGỮ HỌC ĐƯỜNG & E-SPORTS
- 学霸 / 学渣 = Học bá / Học tra (Học sinh giỏi đỉnh cao / Học sinh kém)
- 校草 / 校花 = Nam thần trường học / Hoa khôi trường học
- 高考 = Cao khảo (Kỳ thi Đại học)
- 社团 = Câu lạc bộ (trường học)
- 开黑 = Chơi game cùng nhau / Leo rank tổ đội
- 打野 / 辅助 / ADC = Đi rừng / Hỗ trợ / Xạ thủ (vị trí trong game MOBA)
- 团战 = Giao tranh tổng / Combat
- 带飞 / 躺赢 = Gánh team (Cân team) / Thắng ké (Nằm yên cũng thắng)
- 掉分 / 上分 = Tụt rank / Leo rank
- MVP = MVP (Người chơi xuất sắc nhất trận)

---

## 3. SỬA LỖI ĐỒNG ÂM ASR GIỚI TRẺ / E-SPORTS
- 学霸 (Xuébà) → hay nhầm thành 学爸 → Học bá / Học thần
- 开黑 (Kāihēi) → hay nhầm thành 开回 → Bắt cặp leo rank / Chơi game chung (KHÔNG dịch là "mở màu đen")
- 高考 (Gāokǎo) → KHÔNG dịch là "thi cao đẳng" → Kỳ thi Đại học
- 团战 (Tuánzhàn) → hay nhầm thành 团队 → Combat / Giao tranh tổng
- 带飞 (Dàifēi) → hay nhầm thành 带非 → Gánh team / Cân team (KHÔNG dịch là "dẫn đi bay")`,
    isAutoUpdate: false,
  }
];

// 1. Lấy danh sách từ điển (gồm Global + Team)
export async function getDubDictionariesAction(teamId: number) {
  try {
    let list = await db
      .select()
      .from(dubDictionaries)
      .where(or(isNull(dubDictionaries.teamId), eq(dubDictionaries.teamId, teamId)));
    
    const globals = list.filter(d => d.isGlobal);
    // Nếu chưa có hoặc chưa đủ 5 Global dictionaries hệ thống, tự động seed / bổ sung
    if (globals.length < DEFAULT_SYSTEM_DICTIONARIES.length) {
      const existingKeys = new Set(globals.map(g => g.genreKey || ''));
      const missingDefaults = DEFAULT_SYSTEM_DICTIONARIES.filter(d => !existingKeys.has(d.genreKey || ''));
      if (missingDefaults.length > 0) {
        await db.insert(dubDictionaries).values(missingDefaults);
        list = await db
          .select()
          .from(dubDictionaries)
          .where(or(isNull(dubDictionaries.teamId), eq(dubDictionaries.teamId, teamId)));
      }
    }

    return list;
  } catch (error) {
    console.error('Failed to fetch dub dictionaries:', error);
    return [];
  }
}

// 2. Tạo mới từ điển cho Team
export async function createDubDictionaryAction(data: {
  teamId: number;
  name: string;
  genreKey?: string;
  keywords: string;
  promptContent: string;
  isAutoUpdate?: boolean;
}) {
  try {
    const [inserted] = await db
      .insert(dubDictionaries)
      .values({
        teamId: data.teamId,
        name: data.name,
        genreKey: data.genreKey || 'custom',
        keywords: data.keywords,
        promptContent: data.promptContent,
        isAutoUpdate: data.isAutoUpdate ?? true,
        isGlobal: false,
      })
      .returning();

    revalidatePath(`/hero-dub/t/${data.teamId}/dictionaries`);
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Failed to create dub dictionary:', error);
    return { success: false, error: error.message };
  }
}

// 3. Cập nhật từ điển
export async function updateDubDictionaryAction(data: {
  id: number;
  teamId: number;
  name: string;
  keywords: string;
  promptContent: string;
  isAutoUpdate?: boolean;
}) {
  try {
    const [updated] = await db
      .update(dubDictionaries)
      .set({
        name: data.name,
        keywords: data.keywords,
        promptContent: data.promptContent,
        isAutoUpdate: data.isAutoUpdate ?? true,
        updatedAt: new Date(),
      })
      .where(and(eq(dubDictionaries.id, data.id), eq(dubDictionaries.teamId, data.teamId)))
      .returning();

    revalidatePath(`/hero-dub/t/${data.teamId}/dictionaries`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Failed to update dub dictionary:', error);
    return { success: false, error: error.message };
  }
}

// 4. Xóa từ điển
export async function deleteDubDictionaryAction(id: number, teamId: number) {
  try {
    await db
      .delete(dubDictionaries)
      .where(and(eq(dubDictionaries.id, id), eq(dubDictionaries.teamId, teamId)));

    revalidatePath(`/hero-dub/t/${teamId}/dictionaries`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete dub dictionary:', error);
    return { success: false, error: error.message };
  }
}

// 5. Auto-Detect Dictionary dựa trên 30 dòng Transcript đầu tiên bằng Gemini AI
export async function detectGenreByTranscriptAction(teamId: number, transcript30Lines: string) {
  try {
    if (!transcript30Lines || transcript30Lines.trim().length === 0) {
      return null;
    }

    const dicts = await getDubDictionariesAction(teamId);
    if (dicts.length === 0) return null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback về so khớp keyword nếu không có API key
      return autoDetectDictionaryAction(teamId, transcript30Lines);
    }

    const dictOptionsList = dicts.map(d => `- ID ${d.id} (${d.name}): GenreKey="${d.genreKey}", Keywords=[${d.keywords}]`).join('\n');

    const prompt = `Bạn là chuyên gia phân tích kịch bản phim. Dưới đây là 30 câu thoại/phụ đề đầu tiên của một tập phim:

--- TRANSCRIPT (30 CÂU ĐẦU) ---
${transcript30Lines}
-------------------------------

Danh sách các thể loại / từ điển có sẵn:
${dictOptionsList}

Nhiệm vụ: Dựa vào nội dung, từ ngữ, xưng hô trong 30 câu thoại trên, hãy xác định xem tập phim này thuộc Thể loại / Từ điển nào phù hợp nhất trong danh sách.
Chỉ trả về duy nhất JSON định dạng: {"matchedId": number_hoac_null, "reason": "lý do ngắn gọn"}
Ví dụ: {"matchedId": 1, "reason": "Có xuất hiện từ Đại Vương, Tiên nhân, Tu vi"}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!res.ok) {
      return autoDetectDictionaryAction(teamId, transcript30Lines);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return autoDetectDictionaryAction(teamId, transcript30Lines);

    const parsed = JSON.parse(jsonMatch[0]);
    return autoDetectDictionaryAction(teamId, transcript30Lines);
  } catch (error) {
    console.error('Failed to detect genre by transcript AI:', error);
    return autoDetectDictionaryAction(teamId, transcript30Lines);
  }
}

// 5b. Auto-Detect Dictionary dựa trên Title / Description (Fallback)
export async function autoDetectDictionaryAction(teamId: number, textToAnalyze: string) {
  try {
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      return null;
    }

    const dicts = await getDubDictionariesAction(teamId);
    const lowerText = textToAnalyze.toLowerCase();

    let bestMatch: DubDictionary | null = null;
    let maxMatchCount = 0;

    for (const dict of dicts) {
      const kwList = dict.keywords.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
      let matchCount = 0;

      for (const kw of kwList) {
        if (lowerText.includes(kw)) {
          matchCount++;
        }
      }

      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestMatch = dict;
      }
    }

    return bestMatch;
  } catch (error) {
    console.error('Failed to auto-detect dictionary:', error);
    return null;
  }
}

// 6. AI Tự động Xây dựng / Cải thiện nội dung Template (Nút "Sửa bằng AI")
export async function generateTemplateByAIAction(nameOrGenre: string, customInstruction?: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Thiếu GEMINI_API_KEY trong hệ thống' };
    }

    const prompt = `Bạn là chuyên gia dịch thuật phim Trung Quốc / Quốc tế chuyên nghiệp.
Hãy xây dựng một BỘ QUY TẮC DỊCH THUẬT & TỪ ĐIỂN SỬA LỖI ĐỒNG ÂM ASR cho thể loại phim: "${nameOrGenre}".
${customInstruction ? `Yêu cầu bổ sung của người dùng: "${customInstruction}"` : ''}

Định dạng mẫu cần tạo (Viết bằng Tiếng Việt rõ ràng, dễ đọc, chuẩn Markdown):

Thể loại: [Tên thể loại]

QUY TẮC XƯNG HÔ:
- [Quy tắc 1]
- [Quy tắc 2]

TỪ ĐIỂN THUẬT NGỮ & ĐỊA DANH:
- [Hán tự gốc] = [Nghĩa dịch chuẩn tiếng Việt]

SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP (Whisper nghe nhầm):
- [Hán tự sai đồng âm] → [Hán tự đúng] ([Nghĩa tiếng Việt])

Vui lòng chỉ xuất trực tiếp nội dung bộ quy tắc trên, không thêm lời chào hay giải thích ngoài.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!res.ok) {
      return { success: false, error: 'Lỗi khi kết nối với Gemini AI' };
    }

    const data = await res.json();
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, content: generatedText.trim() };
  } catch (error: any) {
    console.error('Failed to generate template by AI:', error);
    return { success: false, error: error.message };
  }
}

// 7. VÒNG LẶP AI TỰ HỌC (Phương án B): Đánh giá sau dịch & Tự động lưu từ mới vào DB
export async function evaluateAndLearnAction(dictionaryId: number, rawAsrText: string, llmTranslatedText: string) {
  try {
    const [dict] = await db
      .select()
      .from(dubDictionaries)
      .where(eq(dubDictionaries.id, dictionaryId));

    if (!dict) return { success: false, error: 'Dictionary not found' };

    // Tăng số lần sử dụng
    await db
      .update(dubDictionaries)
      .set({
        usageCount: dict.usageCount + 1,
        updatedAt: new Date()
      })
      .where(eq(dubDictionaries.id, dictionaryId));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { success: true, learnedCount: 0 };

    const prompt = `Bạn là Trợ lý AI Kiểm duyệt Chất lượng Phụ đề (QC Auditor).
Dưới đây là một đoạn thoại ASR (gốc từ Whisper AI) và Bản Dịch Tiếng Việt tương ứng:

--- ASR GỐC ---
${rawAsrText.slice(0, 2000)}

--- BẢN DỊCH ---
${llmTranslatedText.slice(0, 2000)}

Nhiệm vụ:
1. Đánh giá chất lượng bản dịch trên thang điểm từ 0 đến 100 (Score).
2. Phát hiện các từ Whisper AI nghe nhầm đồng âm (Homophones) hoặc thuật ngữ mới chưa có trong ngữ cảnh.
3. Xuất danh sách các quy tắc sửa sai đồng âm mới (nếu có).

Trả về JSON duy nhất:
{
  "scoreDelta": number (+5 nếu bản dịch xuất sắc, 0 nếu ổn, -10 nếu có lỗi nặng),
  "newRules": [
    "- [Từ Hán tự sai ASR] → [Từ Hán tự đúng] ([Nghĩa tiếng Việt])"
  ]
}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!res.ok) return { success: true, learnedCount: 0 };

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: true, learnedCount: 0 };

    const parsed = JSON.parse(jsonMatch[0]);
    const scoreDelta = typeof parsed.scoreDelta === 'number' ? parsed.scoreDelta : 0;
    const newRules: string[] = Array.isArray(parsed.newRules) ? parsed.newRules : [];

    // Tính điểm mới (trong khoảng 0 -> 100)
    const newScore = Math.min(100, Math.max(0, dict.evaluationScore + scoreDelta));

    let updatedPromptContent = dict.promptContent;
    let learnedCount = 0;

    if (newRules.length > 0 && dict.isAutoUpdate) {
      const appendBlock = `\n\n# TỰ ĐỘNG HỌC TỪ PHIÊN DỊCH (${new Date().toLocaleDateString('vi-VN')}):\n` + newRules.join('\n');
      updatedPromptContent += appendBlock;
      learnedCount = newRules.length;
    }

    await db
      .update(dubDictionaries)
      .set({
        evaluationScore: newScore,
        promptContent: updatedPromptContent,
        updatedAt: new Date()
      })
      .where(eq(dubDictionaries.id, dictionaryId));

    if (dict.teamId) {
      revalidatePath(`/hero-dub/t/${dict.teamId}/dictionaries`);
    }

    return { success: true, newScore, learnedCount };
  } catch (error: any) {
    console.error('Failed to evaluate and learn for dictionary:', error);
    return { success: false, error: error.message };
  }
}
