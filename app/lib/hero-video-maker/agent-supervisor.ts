import { HeroAiText } from './ai-utils';
import { EntityProfile, SupervisorVerdict } from './agent-types';

/** Helper parse JSON an toàn */
function cleanAndParseJson<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.substring(startIdx, endIdx + 1)) as T;
      } catch (subError) {
        throw new Error(`Phản hồi từ AI không đúng cấu trúc JSON: ${error}`);
      }
    }
    throw new Error(`Không thể parse phản hồi từ AI thành JSON: ${error}`);
  }
}

export class SupervisorAgent {
  private aiText: HeroAiText;

  constructor(aiText: HeroAiText) {
    this.aiText = aiText;
  }

  async execute(params: {
    resultData: any;
    targetAgent: 'script' | 'asset' | 'storyboard';
    entityProfiles: EntityProfile[];
  }): Promise<SupervisorVerdict> {
    const profilesContext = params.entityProfiles.length > 0
      ? `Danh sách Entity Profiles chuẩn (Neo hình ảnh/nhất quán):\n` +
        params.entityProfiles.map(p => `- [Thực thể: "${p.name}"] Visual Prompt: "${p.visualPrompt}"`).join('\n')
      : 'Không có Entity Profiles nào.';

    const systemPrompt = `Bạn là SupervisorAgent — chuyên gia kiểm định chất lượng đầu ra của các hệ thống AI tạo video ngắn.

# NHIỆM VỤ
Kiểm tra cấu trúc và nội dung dữ liệu JSON đầu ra từ ${params.targetAgent} agent để đảm bảo tính hợp lệ, an toàn và quan trọng nhất là TÍNH NHẤT QUÁN THỰC THỂ (Character/Scene Consistency).

# CONTEXT DỰ ÁN
${profilesContext}

# TIÊU CHÍ KIỂM ĐỊNH (Theo thứ tự ưu tiên)
1. **Schema Validation**:
   - Nếu là \`script\`: JSON phải có mảng \`scripts\`, mỗi phần tử có \`name\` và \`content\` (độ dài > 50 ký tự).
   - Nếu là \`asset\`: JSON phải có \`newAssets\` (có name, type, describe, visualPrompt) và \`existingRefs\`.
   - Nếu là \`storyboard\`: JSON phải có mảng \`scenes\`, mỗi phần tử có \`order\`, \`narration\`, \`imagePrompt\` (> 30 ký tự), \`duration\` (3-8), \`videoDesc\`.

2. **Character/Scene Consistency (Đặc biệt cho Storyboard)**:
   - Trong mỗi cảnh, nếu có sự xuất hiện của một nhân vật hay bối cảnh thuộc Entity Profiles, \`imagePrompt\` của cảnh đó BẮT BUỘC phải chứa các từ khóa trọng tâm từ \`visualPrompt\` nguyên thủy của thực thể đó.
   - Nếu phát hiện \`imagePrompt\` miêu tả hời hợt hoặc lệch so với Profile gốc → Báo LỖI (error) kèm gợi ý chèn nguyên văn \`visualPrompt\` gốc vào.

3. **Guardrails**:
   - Dữ liệu không được chứa từ khóa nhạy cảm, bạo lực (nude, nsfw, gore, extreme violence).
   - Storyboard phải có số cảnh (3-20), tổng duration (15-90 giây).

# DỮ LIỆU ĐẦU RA CẦN KIỂM TRA
\`\`\`json
${JSON.stringify(params.resultData, null, 2)}
\`\`\`

# OUTPUT FORMAT
BẮT BUỘC trả về duy nhất định dạng JSON theo cấu trúc sau:
{
  "passed": true, // false nếu có ít nhất 1 issue severity = 'error'
  "issues": [
    {
      "severity": "error", // hoặc "warning"
      "field": "scenes[2].imagePrompt", // Tên trường bị lỗi
      "message": "Thiếu mô tả ngoại hình nhân vật 'Lâm Phong'",
      "suggestion": "Chèn: 'A 20-year-old swordsman...'"
    }
  ]
}
Nếu dữ liệu hoàn hảo, trả về "passed": true và "issues": []`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Hãy kiểm tra dữ liệu đầu ra và phản hồi bằng JSON.' }],
      temperature: 0.1 // Cần độ chính xác cao
    });

    return cleanAndParseJson<SupervisorVerdict>(res.text);
  }
}
