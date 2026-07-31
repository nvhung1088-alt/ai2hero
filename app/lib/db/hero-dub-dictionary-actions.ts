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
    keywords: 'tiên hiệp, tu tiên, độ kiếp, tu vi, pháp bảo, luyện khí, nguyên thần, kim đan, phi thăng, đại vương, yêu quái',
    promptContent: `Thể loại: Phim Tiên hiệp / Tu tiên.

QUY TẮC XƯNG HÔ:
- 大王 (Đại Vương) → Dùng cho vua yêu quái / chúa động phủ. TUYỆT ĐỐI KHÔNG dịch thành "Bệ hạ".
- Yêu quái xưng hô với Đại Vương: Thuộc hạ, Tiểu yêu.
- Tiên nhân xưng hô: Bần đạo, Đạo hữu, Tiền bối, Hậu bối.

TỪ ĐIỂN THUẬT NGỮ TU TIÊN:
- 炼化 = Luyện hóa (hấp thụ/tinh luyện pháp bảo)
- 天仙 = Thiên Tiên (cấp bậc cảnh giới)
- 渡劫 = Độ kiếp
- 修为 = Tu vi
- 法宝 = Pháp bảo
- 功法 = Công pháp
- 灵气 = Linh khí
- 金丹 = Kim Đan
- 元神 = Nguyên Thần
- 飞升 = Phi thăng

SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP:
- 练画 → 炼化 (Luyện hóa)
- 天先 → 天仙 (Thiên Tiên)
- 度节 / 渡节 → 渡劫 (Độ kiếp)
- 法保 → 法宝 (Pháp bảo)`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'tayDuKy',
    name: '🐒 Tây Du Ký / Ngoại truyện',
    keywords: 'tây du, tây du ký, tôn ngộ không, đại thánh, bảo tượng quốc, bạch hổ lĩnh, bác học hồng từ, trạng nguyên, tể tướng, yêu vương',
    promptContent: `Thể loại: Phim Tây Du Ký / Ngoại truyện yêu vương.

QUY TẮC XƯNG HÔ:
- 大王 = Đại Vương (vua yêu quái). KHÔNG dịch "Bệ hạ".
- 陛下 = Bệ hạ (chỉ dùng cho vua loài người).
- Yêu quái gọi chủ: Đại vương, Chủ nhân.
- Thần tiên gọi nhau: Đại Thánh, Tiền bối.

ĐỊA DANH & NHÂN VẬT TÂY DU:
- 宝象国 = Bảo Tượng Quốc (KHÔNG dịch "Bảo Hướng")
- 白虎岭 = Bạch Hổ Lĩnh
- 花果山 = Hoa Quả Sơn
- 金角大王 = Kim Giác Đại Vương
- 银角大王 = Ngân Giác Đại Vương

TỪ ĐIỂN KHOA CỬ & THÀNH NGỮ:
- 博学鸿词科 = Khoa thi Bác Học Hồng Từ
- 状元 = Trạng nguyên
- 宰相 = Tể tướng
- 春秋 = Xuân Thu (kinh điển)
- 周礼 = Chu Lễ (kinh điển)
- 趟浑水 = Dính vào vũng nước đục (thành ngữ: can thiệp vào chuyện rắc rối)

SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP:
- 薄雪红磁壳 → 博学鸿词科 (Bác Học Hồng Từ)
- 烧大的竹子 → 稍大的卒子 (quân tốt nhỉnh hơn)
- 魂水 → 浑水 (nước đục)
- 家详 → 可想 (nhớ)
- 彩相 → 宰相 (Tể tướng)
- 状怨 → 状元 (Trạng nguyên)`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'coTrang',
    name: '👑 Cổ trang Triều đình',
    keywords: 'cổ trang, triều đình, hoàng đế, thừa tướng, hàn lâm, tri chế cáo, muối sắt, trà ngựa, điền phú, hoàng thượng, bệ hạ, trẫm',
    promptContent: `Thể loại: Phim cổ trang triều đình / cung đấu.

QUY TẮC XƯNG HÔ (BẮT BUỘC):
- Hoàng đế xưng: Trẫm. Gọi thần tử: Khanh, Ái khanh.
- Thần tử xưng: Thần (nam), Thần thiếp (nữ phi tần). Gọi vua: Bệ hạ, Hoàng thượng.
- Thái hậu: Ai gia (tự xưng), gọi vua: Hoàng đế.
- Hoàng hậu: Bổn cung (tự xưng).
- Công chúa: Bổn công chúa.
- Quan lại gọi nhau: Đại nhân, Tiên sinh.
- TUYỆT ĐỐI KHÔNG dùng "anh/cô/tôi/bạn".

TỪ ĐIỂN CHỨC TƯỚC & THUẬT NGỮ:
- 丞相 = Thừa tướng
- 翰林 = Hàn Lâm
- 知制诰 = Tri chế cáo
- 权知户部事 = Quyền tri Hộ bộ sự
- 盐铁专卖 = Độc quyền muối sắt
- 茶马互市 = Giao thương Trà - Ngựa
- 田赋 = Thuế ruộng / Điền phú

SỬA LỖI ĐỒNG ÂM ASR THƯỜNG GẶP:
- 汉林 → 翰林 (Hàn Lâm)
- 知智告 → 知制诰 (Tri chế cáo)
- 全支户部士 → 权知户部事 (Quyền tri Hộ bộ sự)
- 严帖专媚 → 盐铁专卖 (Độc quyền muối sắt)
- 查马户士 → 茶马互市 (Giao thương Trà Ngựa)
- 天父 → 田赋 (Thuế ruộng)`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'xuyenKhong',
    name: '⚡ Xuyên không',
    keywords: 'xuyên không, hệ thống, kpi, hiện đại về cổ đại, xuyên qua',
    promptContent: `Thể loại: Phim xuyên không (nhân vật hiện đại xuyên về thời cổ đại).

QUY TẮC XƯNG HÔ KÉP:
- Khi giao tiếp triều đình / quan lại / vua: Dùng xưng hô cổ phong (Bệ hạ, Thần, Khanh, Tiểu nữ).
- Khi suy nghĩ nội tâm / chửi thầm / nhắc thuật ngữ hiện đại: Giữ nguyên đại từ hiện đại (Tôi, Anh, Hệ thống, KPI, Tài khoản, CEO).
- Khi nói chuyện riêng với người cùng xuyên không: Dùng xưng hô hiện đại.

GHI CHÚ:
- Phân biệt rõ ngữ cảnh mỗi câu thoại để chọn đúng hệ xưng hô.
- Các thuật ngữ hiện đại giữ nguyên tiếng Việt phổ thông, không cổ phong hóa.`,
    isAutoUpdate: false,
  },
  {
    teamId: null,
    isGlobal: true,
    genreKey: 'doThi',
    name: '🏙️ Đô thị hiện đại',
    keywords: 'đô thị, hiện đại, tổng tài, giám đốc, tình cảm, công sở',
    promptContent: `Thể loại: Phim đô thị / tình cảm / hành động hiện đại.

QUY TẮC XƯNG HÔ:
- Xưng hô bình thường: Anh/Em, Tôi/Bạn, Cậu/Tớ.
- Cấp trên/cấp dưới: Giám đốc, Tổng giám đốc, Sếp.
- Gia đình: Ba/Mẹ, Ông/Bà, Anh/Chị.

GHI CHÚ:
- Dịch tự nhiên theo văn phong đời thường, tránh cứng nhắc.
- Giữ nguyên tên riêng thương hiệu, công ty nếu có.`,
    isAutoUpdate: false,
  }
];

// 1. Lấy danh sách từ điển (gồm Global + Team)
export async function getDubDictionariesAction(teamId: number) {
  try {
    const list = await db
      .select()
      .from(dubDictionaries)
      .where(or(isNull(dubDictionaries.teamId), eq(dubDictionaries.teamId, teamId)));
    
    // Nếu chưa có Global dictionaries nào trong DB, tự động seed
    if (list.filter(d => d.isGlobal).length === 0) {
      await db.insert(dubDictionaries).values(DEFAULT_SYSTEM_DICTIONARIES);
      return await db
        .select()
        .from(dubDictionaries)
        .where(or(isNull(dubDictionaries.teamId), eq(dubDictionaries.teamId, teamId)));
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
    if (parsed.matchedId) {
      const found = dicts.find(d => d.id === parsed.matchedId);
      if (found) return found;
    }

    return autoDetectDictionaryAction(teamId, transcript30Lines);
  } catch (error) {
    console.error('Failed to detect genre by transcript AI:', error);
    return autoDetectDictionaryAction(teamId, transcript30Lines);
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
