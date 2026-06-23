import { HeroAiText } from './ai-utils';
import { EntityProfile } from './agent-types';

/**
 * Helper để bóc tách và parse JSON an toàn từ phản hồi của AI.
 * Hỗ trợ loại bỏ markdown block ```json ... ``` hoặc ``` ... ```.
 */
export function cleanAndParseJson<T>(text: string): T {
  let cleaned = text.trim();
  
  // Loại bỏ các thẻ markdown code block
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    // Fallback: Tìm dấu mở { hoặc [ đầu tiên và dấu đóng } hoặc ] cuối cùng
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonSubStr = cleaned.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(jsonSubStr) as T;
      } catch (subError) {
        throw new Error(`Phản hồi từ AI không đúng cấu trúc JSON: ${error}`);
      }
    }
    throw new Error(`Không thể parse phản hồi từ AI thành JSON: ${error}`);
  }
}

// ============================================================================
// 🦴 STORY SKELETON AGENT
// ============================================================================

export interface StorySkeletonResult {
  title: string;
  logline: string;
  acts: {
    actNumber: number;
    description: string;
  }[];
}

export class StorySkeletonAgent {
  private aiText: HeroAiText;

  constructor(aiText: HeroAiText) {
    this.aiText = aiText;
  }

  async execute(params: {
    userMessage: string;
  }): Promise<StorySkeletonResult> {
    const systemPrompt = `Bạn là StorySkeletonAgent — chuyên gia xây dựng cấu trúc và khung xương kịch bản.

# NHIỆM VỤ
Nhận ý tưởng hoặc câu chuyện từ người dùng và xây dựng một khung xương kịch bản video (3 hồi).

# OUTPUT FORMAT
BẮT BUỘC trả về duy nhất định dạng JSON theo cấu trúc sau, không giải thích:
{
  "title": "Tên câu chuyện",
  "logline": "Một câu tóm tắt nội dung chính",
  "acts": [
    {
      "actNumber": 1,
      "description": "Mô tả hồi 1 (Mở bài)"
    },
    {
      "actNumber": 2,
      "description": "Mô tả hồi 2 (Phát triển)"
    },
    {
      "actNumber": 3,
      "description": "Mô tả hồi 3 (Kết thúc)"
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
      temperature: 0.7
    });

    return cleanAndParseJson<StorySkeletonResult>(res.text);
  }
}

// ============================================================================
// 🧠 ADAPTATION STRATEGY AGENT
// ============================================================================

export interface AdaptationStrategyResult {
  pacing: string;
  visualStyle: string;
  keyElementsToHighlight: string[];
  suggestedDuration: string;
}

export class AdaptationStrategyAgent {
  private aiText: HeroAiText;

  constructor(aiText: HeroAiText) {
    this.aiText = aiText;
  }

  async execute(params: {
    skeleton: StorySkeletonResult;
  }): Promise<AdaptationStrategyResult> {
    const systemPrompt = `Bạn là AdaptationStrategyAgent — chuyên gia chuyển thể kịch bản và đạo diễn.

# NHIỆM VỤ
Dựa vào khung xương kịch bản được cung cấp, đề xuất chiến lược chuyển thể hình ảnh và nhịp độ video.

# OUTPUT FORMAT
BẮT BUỘC trả về duy nhất định dạng JSON theo cấu trúc sau, không giải thích:
{
  "pacing": "Nhịp độ video (ví dụ: Nhanh, dồn dập, chậm rãi...)",
  "visualStyle": "Phong cách hình ảnh (ví dụ: Cinematic, Anime, Dark Fantasy...)",
  "keyElementsToHighlight": ["Yếu tố 1 cần nhấn mạnh", "Yếu tố 2"],
  "suggestedDuration": "Thời lượng video đề xuất (ví dụ: 60s, 30s)"
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(params.skeleton) }],
      temperature: 0.7
    });

    return cleanAndParseJson<AdaptationStrategyResult>(res.text);
  }
}

// ============================================================================
// ✍️ SCRIPT AGENT
// ============================================================================

export interface ScriptAgentResult {
  scripts: {
    name: string;
    content: string;
  }[];
}

export class ScriptAgent {
  private aiText: HeroAiText;

  constructor(aiText: HeroAiText) {
    this.aiText = aiText;
  }

  async execute(params: {
    userMessage: string;
    entityProfiles: EntityProfile[];
    existingScripts?: string[];
  }): Promise<ScriptAgentResult> {
    const profilesContext = params.entityProfiles.length > 0
      ? `Danh sách các thực thể (nhân vật, bối cảnh) hiện có trong dự án:\n` +
        params.entityProfiles.map(p => `- ${p.name} (${p.type === 'role' ? 'Nhân vật' : p.type === 'scene' ? 'Bối cảnh' : 'Đạo cụ'}): ${p.describe}`).join('\n')
      : 'Hiện tại chưa có thực thể nào được định nghĩa trong dự án.';

    const scriptsContext = params.existingScripts && params.existingScripts.length > 0
      ? `Các kịch bản hiện có của dự án:\n` + params.existingScripts.map((s, idx) => `[Kịch bản ${idx + 1}]:\n${s}`).join('\n\n')
      : '';

    const systemPrompt = `Bạn là ScriptAgent — một biên kịch chuyên nghiệp, chuyên viết kịch bản video ngắn (TikTok/Reels/Shorts) hấp dẫn, kích thích tương tác cao.

# NHIỆM VỤ
Nhận ý tưởng, yêu cầu hoặc chương tiểu thuyết từ người dùng và chuyển đổi thành một hoặc nhiều kịch bản video ngắn hoàn chỉnh.

# QUY TẮC VIẾT KỊCH BẢN VIDEO NGẮN
1. **Mở đầu giật gân (Hook)**: 3 giây đầu tiên phải thu hút người xem ngay lập tức bằng một tuyên bố, một câu hỏi hoặc một tình huống kịch tính.
2. **Nội dung súc tích**: Chia nhỏ kịch bản thành các đoạn ngắn. Mỗi đoạn tương ứng khoảng 3-6 giây khi đọc. Tránh viết câu quá dài dòng.
3. **Kêu gọi hành động (Call to action)**: Cuối video luôn có phần kêu gọi bấm follow, thả tim, bình luận hoặc mua hàng tự nhiên.
4. **Giọng văn**: Phù hợp phong cách mạng xã hội (tự nhiên, lôi cuốn, có nhịp điệu nhanh).
5. **Nhất quán thực thể**: Nếu trong yêu cầu có đề cập đến các thực thể đã được thiết lập, hãy sử dụng chính xác tên của chúng.

# CONTEXT DỰ ÁN
${profilesContext}

${scriptsContext}

# OUTPUT FORMAT
BẮT BUỘC trả về duy nhất định dạng JSON theo cấu trúc sau, không kèm bất kỳ giải thích nào khác ngoài JSON:
{
  "scripts": [
    {
      "name": "Tên kịch bản (Ngắn gọn, giật tít)",
      "content": "Nội dung kịch bản đầy đủ, chứa cả lời thoại, lời dẫn truyện và mô tả cảnh trong ngoặc đơn (nếu có)"
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
      temperature: 0.7
    });

    return cleanAndParseJson<ScriptAgentResult>(res.text);
  }
}

// ============================================================================
// 🔍 ASSET AGENT
// ============================================================================

export interface AssetAgentResult {
  newAssets: {
    name: string;
    type: 'role' | 'scene' | 'tool';
    describe: string;
    visualPrompt: string;
  }[];
  existingRefs: {
    name: string;
    updatedVisualPrompt?: string;
  }[];
}

export class AssetAgent {
  private aiText: HeroAiText;

  constructor(aiText: HeroAiText) {
    this.aiText = aiText;
  }

  async execute(params: {
    scriptContent: string;
    existingProfiles: EntityProfile[];
  }): Promise<AssetAgentResult> {
    const existingContext = params.existingProfiles.length > 0
      ? `Danh sách thực thể đã có sẵn trong dự án (KHÔNG ĐƯỢC TẠO TRÙNG LẶP):\n` +
        params.existingProfiles.map(p => `- Tên: "${p.name}", Loại: "${p.type}", Mô tả: "${p.describe}", Visual Prompt hiện tại: "${p.visualPrompt}"`).join('\n')
      : 'Dự án hiện chưa có thực thể nào.';

    const systemPrompt = `Bạn là AssetAgent — chuyên gia trích xuất và thiết lập thực thể (nhân vật, bối cảnh, đạo cụ) từ kịch bản video.

# NHIỆM VỤ
1. Đọc kịch bản do người dùng cung cấp.
2. Trích xuất TẤT CẢ các thực thể quan trọng xuất hiện:
   - **Nhân vật (role)**: Những người xuất hiện trong kịch bản.
   - **Bối cảnh (scene)**: Địa điểm diễn ra các cảnh quay.
   - **Đạo cụ (tool)**: Các vật phẩm quan trọng có ảnh hưởng lớn tới cốt truyện.
3. Đối chiếu với danh sách các thực thể đã có sẵn. KHÔNG được tạo thực thể mới trùng tên với thực thể đã có. Nếu có cập nhật về visual prompt cho thực thể cũ, hãy đưa vào mục \`existingRefs\`.
4. Với mỗi thực thể mới, viết:
   - \`describe\`: Mô tả chi tiết bằng tiếng Việt về vai trò, tính cách, đặc điểm của thực thể đó.
   - \`visualPrompt\`: Prompt bằng tiếng Anh SIÊU CHI TIẾT để sinh ảnh AI (Character Consistency).

# QUY TẮC THIẾT KẾ VISUAL PROMPT (CHARACTER CONSISTENCY)
Visual Prompt phải được mô tả bằng tiếng Anh, cực kỳ chi tiết, đóng vai trò làm neo (anchor) để đảm bảo hình ảnh nhân vật hoặc bối cảnh luôn đồng nhất qua các cảnh quay khác nhau.
- **Đối với Nhân vật**: Phải cố định các thuộc tính nhận diện: độ tuổi, kiểu tóc, màu tóc, khuôn mặt, biểu cảm đặc trưng, trang phục chính, phụ kiện nổi bật.
  - *Ví dụ tốt*: "A 25-year-old female magic warrior, 170cm tall, long silver hair tied in a high ponytail, sparkling green eyes, wearing a black leather armor with neon green glowing runes, athletic build, holding a crystal staff, fantasy anime style"
  - *Ví dụ xấu*: "a girl", "a female warrior"
- **Đối với Bối cảnh**: Cố định tông màu chủ đạo, phong cách kiến trúc, các chi tiết đặc trưng (sương mù, ánh sáng, vật thể cố định).
  - *Ví dụ tốt*: "A dark gothic library, tall wooden bookshelves filled with ancient glowing books, a large stained glass window with moonlight shining through, dust motes in the air, purple and blue ambient lighting, cinematic, 8k resolution"

# CONTEXT DỰ ÁN
${existingContext}

# OUTPUT FORMAT
BẮT BUỘC trả về duy nhất cấu trúc JSON dưới đây, không kèm text ngoài:
{
  "newAssets": [
    {
      "name": "Tên thực thể mới",
      "type": "role", 
      "describe": "Mô tả chi tiết bằng tiếng Việt",
      "visualPrompt": "Detailed English prompt for AI generation"
    }
  ],
  "existingRefs": [
    {
      "name": "Tên thực thể đã có sẵn",
      "updatedVisualPrompt": "English prompt mới được tối ưu hoặc bổ sung chi tiết nếu cần thiết (hoặc bỏ trống nếu giữ nguyên)"
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: `Hãy phân tích kịch bản sau và trích xuất thực thể:\n\n${params.scriptContent}` }],
      temperature: 0.3
    });

    return cleanAndParseJson<AssetAgentResult>(res.text);
  }
}

// ============================================================================
// 🎬 STORYBOARD AGENT
// ============================================================================

export interface StoryboardAgentResult {
  title: string;
  scenes: {
    order: number;
    narration: string;
    imagePrompt: string;
    duration: number;
    videoDesc: string;
  }[];
}

export class StoryboardAgent {
  private aiText: HeroAiText;

  constructor(aiText: HeroAiText) {
    this.aiText = aiText;
  }

  async execute(params: {
    scriptContent: string;
    entityProfiles: EntityProfile[];
  }): Promise<StoryboardAgentResult> {
    const profilesContext = params.entityProfiles.length > 0
      ? `Danh sách Entity Profiles (Hãy copy nguyên văn visualPrompt của nhân vật/bối cảnh để ghép vào cảnh quay có mặt chúng):\n` +
        params.entityProfiles.map(p => `- [Thực thể: "${p.name}"] Loại: "${p.type}", Visual Prompt: "${p.visualPrompt}"`).join('\n')
      : 'Không có Entity Profiles nào được định nghĩa.';

    const systemPrompt = `Bạn là StoryboardAgent — chuyên gia phân cảnh hình ảnh cho video.

# NHIỆM VỤ
Đọc kịch bản và chia kịch bản thành các cảnh quay chi tiết (storyboard). Mỗi cảnh quay (scene) phải chứa đầy đủ thông tin mô tả hình ảnh, lời thoại/narration, thời lượng và chỉ đạo nghệ thuật cho video.

# QUY TẮC XÂY DỰNG CẢNH QUAY (STORYBOARD SCENE)
1. **Phân đoạn hợp lý**: Tổng số cảnh quay từ 3 - 20 cảnh. Thời lượng mỗi cảnh quay từ 3 - 8 giây.
2. **Narration**: Lời thoại hoặc lời dẫn của cảnh quay đó (bằng tiếng Việt).
3. **Video Description (videoDesc)**: Chỉ đạo góc quay, chuyển động camera (như zoom in, panning, tilt up) hoặc chuyển động của nhân vật/hiệu ứng trong cảnh (tiếng Việt).
4. **Nhất quán hình ảnh (Character/Scene Consistency) - QUY TẮC BẮT BUỘC**:
   - Khi một cảnh có nhân vật hoặc bối cảnh nào xuất hiện, bạn **BẮT BUỘC** phải copy nguyên văn \`visualPrompt\` của thực thể đó từ danh sách Entity Profiles và chèn vào trong \`imagePrompt\` của cảnh quay đó.
   - Thêm vào đó các mô tả hành động cụ thể, biểu cảm và góc máy của cảnh quay hiện tại.
   - *Công thức ghép*: "[visualPrompt nguyên văn của nhân vật], [hành động cụ thể ở cảnh này], [bối cảnh hiện tại hoặc visualPrompt bối cảnh], [góc máy/ánh sáng/chuyển động], [phong cách nghệ thuật, cinematic, 8k]"
   - KHÔNG tự tiện nghĩ ra mô tả nhân vật mới. Hãy dùng đúng các chi tiết đã thiết lập ở Profile để AI tạo ảnh không bị lệch mặt, lệch trang phục.

# CONTEXT DỰ ÁN
${profilesContext}

# OUTPUT FORMAT
BẮT BUỘC trả về duy nhất định dạng JSON theo cấu trúc sau, không kèm bất kỳ giải thích nào khác:
{
  "title": "Tiêu đề dự án video gợi ý",
  "scenes": [
    {
      "order": 1,
      "narration": "Lời dẫn hoặc lời thoại tiếng Việt cho cảnh 1",
      "imagePrompt": "Detailed English image prompt containing entity visualPrompts",
      "duration": 5,
      "videoDesc": "Mô tả chỉ đạo camera/chuyển động bằng tiếng Việt"
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: `Hãy lập storyboard cho kịch bản sau:\n\n${params.scriptContent}` }],
      temperature: 0.5
    });

    return cleanAndParseJson<StoryboardAgentResult>(res.text);
  }
}
