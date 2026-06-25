import { NextResponse } from 'next/server';
import { executeAction } from '@/lib/connect-hub/connectors/engine';

export async function GET() {
  const texts = ["我很高兴", "谢谢你"];
  const jsonInput = JSON.stringify(texts);

  const systemMessage = `Bạn là một dịch giả phụ đề phim chuyên nghiệp. Nhiệm vụ duy nhất của bạn là dịch phụ đề từ tiếng Trung Quốc sang tiếng Việt tự nhiên, mượt mà, đúng ngữ cảnh.

QUY TẮC BẮT BUỘC:
1. Bạn LUÔN LUÔN trả về một JSON array gồm các chuỗi tiếng Việt.
2. Số lượng phần tử trong mảng output PHẢI BẰNG ĐÚNG số lượng phần tử input.
3. KHÔNG được thêm giải thích, ghi chú, markdown, hay bất kỳ text nào ngoài mảng JSON.
4. KHÔNG BAO GIỜ trả về tiếng Trung. Mọi output đều phải là tiếng Việt.
5. TỰ ĐỘNG PHÂN TÍCH NGỮ CẢNH: Dựa vào nội dung của toàn bộ mảng đầu vào, hãy tự suy luận đây là thể loại video gì (Khoa học, Giang hồ, Nấu ăn...) để tự động chọn ĐẠI TỪ NHÂN XƯNG (Ví dụ: Chúng tôi/Mày-Tao/Anh-Em) và TỪ LÓNG phù hợp nhất.
6. Giữ nguyên số liệu, tên riêng (phiên âm nếu cần).

VÍ DỤ:
Input: ["我是狼王","我不能输"]
Output: ["Tôi là Sói Vương","Tôi không được thua"]`;

  const userMessage = `Dịch mảng phụ đề sau sang tiếng Việt:\n${jsonInput}`;

  // Use the admin key for chia se GPU to test
  const apiKey = process.env.CHIASEGPU_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No API Key' });

  const result = await executeAction('deepseek', { apiKey }, 'chat_completion', {
    model: 'DeepSeek Chat',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ],
  });

  return NextResponse.json(result);
}
