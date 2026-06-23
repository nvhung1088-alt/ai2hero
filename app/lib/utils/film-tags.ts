import { HASHTAGS } from './film-constants';

import { db } from '../db/drizzle';
import { connectHubConnections } from '../db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { runConnectorAction } from '../connect-hub/connector-service';

export async function autoCategorizeFilm(teamId: number, title: string, description: string): Promise<string[]> {
  const text = (title + ' ' + (description || '')).trim();
  if (!text) return [];

  try {
    // 1. Tìm AI connection (chiasegpu, gemini, openai)
    const connection = await db.query.connectHubConnections.findFirst({
      where: and(
        eq(connectHubConnections.teamId, teamId),
        eq(connectHubConnections.status, 'connected'),
        inArray(connectHubConnections.appSlug, ['chiasegpu', 'gemini', 'openai', 'anthropic'])
      )
    });

    if (connection) {
      const systemPrompt = `Bạn là chuyên gia phân loại phim. Nhiệm vụ của bạn là đọc Tiêu đề và Mô tả phim, sau đó chọn ra TỐI ĐA 3 thể loại phù hợp nhất từ danh sách sau: ngon-tinh, chien-than, xuyen-khong, kich-tinh, hai-huoc, gay-can, vo-thuat, gia-tuong.
QUAN TRỌNG: 
- Chỉ trả về duy nhất mảng chuỗi dạng JSON, KHÔNG giải thích, KHÔNG markdown.
Ví dụ đầu ra chuẩn: ["ngon-tinh", "xuyen-khong"]`;

      const aiResponse = await runConnectorAction({
        teamId,
        connectionId: connection.id,
        actionSlug: 'chat', // Action phổ biến của các LLM connector
        input: {
          system_message: systemPrompt,
          message: `Tiêu đề: ${title}\nMô tả: ${description}`,
          model: 'gemini-1.5-flash', // Fallback gợi ý model rẻ cho chiasegpu/gemini
          temperature: 0.1
        },
        callerModule: 'hero-report'
      });

      if (aiResponse.success && aiResponse.data?.reply) {
        let replyText = aiResponse.data.reply;
        // Xóa markdown block (nếu AI ngoan cố trả về)
        replyText = replyText.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(replyText);
          if (Array.isArray(parsed)) {
            // Lọc lại đảm bảo nó nằm trong HASHTAGS (trừ 'all')
            const validKeys = HASHTAGS.map(h => h.key).filter(k => k !== 'all');
            return parsed.filter(t => validKeys.includes(t)).slice(0, 3);
          }
        } catch (e) {
          console.error('Lỗi parse JSON từ AI categorize:', replyText);
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi gọi AI phân loại phim:', error);
  }

  // 2. Fallback logic thủ công nếu AI thất bại
  const tags: string[] = [];
  const textLower = text.toLowerCase();
  const rules = [
      { id: 'ngon-tinh', keywords: ['ngôn tình', 'tổng tài', 'phu nhân', 'vợ cũ', 'tra nam', 'trà xanh', 'ly hôn', 'bạch nguyệt quang', 'thiên kim', 'phú bà', 'tiểu thư', 'tình đầu'] },
      { id: 'chien-than', keywords: ['chiến thần', 'đại sư', 'đỉnh phong', 'sư phụ', 'tuyệt thế', 'đại vương', 'thiên tôn'] },
      { id: 'xuyen-khong', keywords: ['xuyên không', 'trùng sinh', 'chuyển sinh', 'sống lại', 'trở lại'] },
      { id: 'kich-tinh', keywords: ['kịch tính', 'trả thù', 'hacker', 'phản đòn', 'tẩy chay', 'vạch mặt', 'đại hội', 'drama', 'phản bội', 'gia thế'] },
      { id: 'hai-huoc', keywords: ['hài hước', 'vui nhộn', 'cười', 'giả điên', 'bá đạo', 'xu cà na', 'hí hí'] },
      { id: 'gay-can', keywords: ['gây cấn', 'hồi hộp', 'bí ẩn', 'truy tìm', 'giết'] },
      { id: 'vo-thuat', keywords: ['võ thuật', 'đánh nhau', 'cao thủ', 'võ sư', 'thượng thừa', 'chiêu'] },
      { id: 'gia-tuong', keywords: ['giả tưởng', 'hệ thống', 'dị giới', 'phép thuật', 'yêu ma'] }
  ];
  
  for (const rule of rules) {
      for (const kw of rule.keywords) {
          if (textLower.includes(kw)) {
              tags.push(rule.id);
              break; 
          }
      }
  }
  
  return tags.slice(0, 3);
}
