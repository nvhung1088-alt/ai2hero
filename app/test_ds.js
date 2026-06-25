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

const userMessage = `Dịch mảng phụ đề sau sang tiếng Việt:\n${JSON.stringify(["你好", "谢谢"])}`;

async function testDeepSeek() {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-85ab4cf3cf86c3ed380f5b9f3f27d24647e2fd3330a3b0b50ec85afd522b12e4" // ChiaseGPU key
    },
    body: JSON.stringify({
      model: "deepseek-chat", // Let's try deepseek-chat
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ]
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testDeepSeek();
