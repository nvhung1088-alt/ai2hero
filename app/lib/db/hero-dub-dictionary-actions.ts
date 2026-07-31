'use server';

import { db } from './drizzle';
import { dubDictionaries, DubDictionary, NewDubDictionary } from './schema';
import { eq, or, isNull, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Seed mặc định 5 bộ từ điển chuẩn
export const DEFAULT_SYSTEM_DICTIONARIES: Array<Omit<NewDubDictionary, 'id' | 'createdAt' | 'updatedAt'>> = [
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

// 5. Auto-Detect Dictionary phù hợp dựa trên Title / Description
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
