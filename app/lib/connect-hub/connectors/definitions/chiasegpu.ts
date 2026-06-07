import { ConnectorDefinition } from '../types';

export const chiasegpuConnector: ConnectorDefinition = {
  slug: 'chiasegpu',
  name: 'AI2Hero ( cổng 1 )',
  icon: 'Cpu',
  category: 'ai',
  description: 'AI hub giá rẻ do admin cung cấp. Hỗ trợ hàng chục mô hình AI (GPT, Claude, Gemini...) qua một API duy nhất. Không cần API Key — hệ thống tự động xử lý.',
  authType: 'none',
  authFields: [],
  actions: [
    // --- Lĩnh vực Text & Code ---
    { 
      slug: 'chat_completion', 
      name: 'Chat Completion (Văn bản)', 
      description: 'Tạo hội thoại tự nhiên, giải quyết vấn đề bằng các mô hình LLM hàng đầu (GPT-4o, Claude 3.5, Gemini 1.5).', 
      group: 'Text & Code',
      httpMethod: 'POST',
      endpoint: '/v1/chat/completions',
      status: 'ready',
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI (Model)',
          type: 'select',
          required: true,
          options: [
            'krr/claude-sonnet-4-6',
            'ant/claude-opus-4-7',
            'krr/claude-haiku-4-7',
            'gx/gpt-5.5',
            'gx/gpt-5.4',
            'glm-5.1'
          ],
          helpText: 'Chọn mô hình AI phù hợp với nhu cầu phân tích báo cáo.'
        },
        {
          name: 'messages',
          label: 'Hội thoại (Messages)',
          type: 'textarea',
          required: true,
          helpText: 'Mảng chứa các tin nhắn hội thoại dạng JSON.'
        },
        {
          name: 'temperature',
          label: 'Nhiệt độ sáng tạo (Temperature)',
          type: 'text',
          required: false,
          helpText: 'Độ sáng tạo của câu trả lời (từ 0 đến 1).'
        }
      ],
      outputFields: ['choices', 'usage'],
      aiInstruction: 'Bước 1: Chọn model (vd: gx/gpt-5.4) và điền mảng messages.\nBước 2: Gửi request tới /v1/chat/completions.\nBước 3: Trích xuất choices[0].message.content làm câu trả lời.',
      testStrategy: 'direct'
    },
    { 
      slug: 'code_generation', 
      name: 'Code Generation', 
      description: 'Trợ lý lập trình AI chuyên sâu: Viết mã nguồn, Review code, Refactor và tìm lỗi (Bugs) tự động.', 
      group: 'Text & Code',
      httpMethod: 'POST',
      endpoint: '/v1/chat/completions',
      status: 'ready',
      inputSchema: [],
      outputFields: ['choices'],
      aiInstruction: 'Sử dụng model chuyên về code (krr/claude-sonnet-4-6). Truyền system prompt yêu cầu viết code hoặc tìm bug.',
      testStrategy: 'direct'
    },
    
    // --- Lĩnh vực Media (Ảnh & Video) ---
    { 
      slug: 'image_generation', 
      name: 'Sinh Ảnh AI (Text-to-Image)', 
      description: 'Sáng tạo hình ảnh chân thực, sắc nét và nghệ thuật dựa trên văn bản mô tả (DALL-E, Midjourney-like).', 
      group: 'Media (Ảnh & Video)',
      httpMethod: 'POST',
      endpoint: '/v1/images/generations',
      status: 'ready',
      inputSchema: [
        { name: 'prompt', label: 'Mô tả hình ảnh', type: 'textarea', required: true }
      ],
      outputFields: ['data', 'created'],
      aiInstruction: 'Gửi prompt chi tiết bằng tiếng Anh hoặc tiếng Việt để tạo ảnh. Nhận về URL hình ảnh trong thuộc tính data[0].url.',
      testStrategy: 'direct'
    },
    { 
      slug: 'video_generation', 
      name: 'Sáng tạo Video AI', 
      description: 'Tạo các đoạn video ngắn, sinh động từ văn bản (Text-to-Video) hoặc từ ảnh tĩnh (Image-to-Video).', 
      group: 'Media (Ảnh & Video)',
      httpMethod: 'POST',
      endpoint: '/v1/videos/generations',
      status: 'planned',
      inputSchema: [],
      outputFields: ['video_url'],
      aiInstruction: 'Tính năng đang trong giai đoạn cập nhật.',
      testStrategy: 'direct'
    },
    { 
      slug: 'vision_analysis', 
      name: 'Phân tích Tầm nhìn (Vision)', 
      description: 'Khả năng đọc hiểu hình ảnh, biểu đồ, nhận diện đối tượng và trích xuất chữ viết (OCR) từ file tải lên.', 
      group: 'Media (Ảnh & Video)',
      httpMethod: 'POST',
      endpoint: '/v1/chat/completions',
      status: 'ready',
      inputSchema: [],
      outputFields: ['choices'],
      aiInstruction: 'Gửi cấu trúc messages với nội dung dạng mảng chứa type: "image_url". Model AI sẽ đọc và phân tích hình ảnh.',
      testStrategy: 'direct'
    },
    
    // --- Quản trị Hệ sinh thái AI ---
    { 
      slug: 'list_models', 
      name: 'Thư viện Models AI', 
      description: 'Cập nhật danh sách các mô hình trí tuệ nhân tạo mới nhất khả dụng trên hệ thống.', 
      group: 'Quản trị AI',
      httpMethod: 'GET',
      endpoint: '/v1/models',
      status: 'ready',
      inputSchema: [],
      outputFields: ['data'],
      aiInstruction: 'Gọi GET /v1/models để lấy danh sách id model mới nhất được hỗ trợ bởi AI2Hero.',
      testStrategy: 'direct'
    },
    { 
      slug: 'create_llm_key', 
      name: 'Quản lý API Key', 
      description: 'Sinh mã khóa bảo mật (sk-...) để nhúng tích hợp thẳng vào các ứng dụng bên thứ 3.', 
      group: 'Quản trị AI',
      httpMethod: 'POST',
      endpoint: '/v1/api_keys',
      status: 'planned',
      inputSchema: [],
      outputFields: ['api_key'],
      aiInstruction: 'Tính năng tự sinh API key độc lập đang được xây dựng.',
      testStrategy: 'direct'
    },
    { 
      slug: 'get_llm_usage', 
      name: 'Báo cáo Tiêu thụ (Usage)', 
      description: 'Thống kê lượng Token (Input/Output) đã sử dụng và tối ưu hóa chi phí AI.', 
      group: 'Quản trị AI',
      httpMethod: 'GET',
      endpoint: '/v1/usage',
      status: 'planned',
      inputSchema: [],
      outputFields: ['total_usage'],
      aiInstruction: 'Tính năng dashboard thống kê token đang được xây dựng.',
      testStrategy: 'direct'
    },
  ],
  popular: true,
  setupGuide: `
    <div class="space-y-4">
      <div class="rounded-md bg-emerald-500/10 p-4 border border-emerald-500/20">
        <h4 class="text-sm font-semibold text-emerald-600 mb-2">✅ AI Hub Siêu Tiết Kiệm (Cổng 1)</h4>
        <p class="text-sm text-muted-foreground">Bạn đang được truy cập vào nguồn API chất lượng cao với mức giá <b>rẻ hơn đến 98%</b> so với giá mua trực tiếp từ OpenAI hay Anthropic. Hệ thống tự động xử lý Key, bạn chỉ việc dùng.</p>
      </div>
      
      <div>
        <h4 class="text-sm font-semibold mb-2">📊 So sánh chi phí (VNĐ / 1M Tokens)</h4>
        <div class="overflow-x-auto rounded-md border">
          <table class="w-full text-sm text-left">
            <thead class="bg-muted">
              <tr>
                <th class="px-4 py-2 font-medium">Model</th>
                <th class="px-4 py-2 font-medium text-emerald-600">Giá AI2Hero (In/Out)</th>
                <th class="px-4 py-2 font-medium text-muted-foreground">Giá Chính Hãng</th>
                <th class="px-4 py-2 font-medium text-amber-600">Tiết kiệm</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr><td class="px-4 py-2 font-medium">Claude 3 Opus<br/><span class="text-xs text-muted-foreground">ant/claude-opus-4-7</span></td><td class="px-4 py-2">12k / 60k</td><td class="px-4 py-2 text-muted-foreground line-through">381k / 1.905k</td><td class="px-4 py-2 text-emerald-600 font-bold">~ 96%</td></tr>
              <tr><td class="px-4 py-2 font-medium">Claude 3.5 Sonnet<br/><span class="text-xs text-muted-foreground">krr/claude-sonnet-4-6</span></td><td class="px-4 py-2">9k / 45k</td><td class="px-4 py-2 text-muted-foreground line-through">76k / 381k</td><td class="px-4 py-2 text-emerald-600 font-bold">~ 88%</td></tr>
              <tr><td class="px-4 py-2 font-medium">Claude 3 Haiku<br/><span class="text-xs text-muted-foreground">krr/claude-haiku...</span></td><td class="px-4 py-2">3k / 15k</td><td class="px-4 py-2 text-muted-foreground line-through">6k / 31k</td><td class="px-4 py-2 text-emerald-600 font-bold">~ 50%</td></tr>
              <tr><td class="px-4 py-2 font-medium">GPT-4 Turbo / 4o<br/><span class="text-xs text-muted-foreground">gx/gpt-5.4, 5.5</span></td><td class="px-4 py-2">1.3k / 4k</td><td class="px-4 py-2 text-muted-foreground line-through">127k / 381k</td><td class="px-4 py-2 text-emerald-600 font-bold">~ 98%</td></tr>
              <tr><td class="px-4 py-2 font-medium">GPT-3.5 / GLM<br/><span class="text-xs text-muted-foreground">glm-5.1, gpt-codex</span></td><td class="px-4 py-2">1.2k / 6k</td><td class="px-4 py-2 text-muted-foreground line-through">12k / 38k</td><td class="px-4 py-2 text-emerald-600 font-bold">~ 85%</td></tr>
              <tr><td class="px-4 py-2 font-medium">DALL-E / Image<br/><span class="text-xs text-muted-foreground">imx/gpt-image-2</span></td><td class="px-4 py-2">1.500 đ / ảnh</td><td class="px-4 py-2 text-muted-foreground line-through">2.000 đ</td><td class="px-4 py-2 text-emerald-600 font-bold">25%</td></tr>
              <tr><td class="px-4 py-2 font-medium">Google Veo 3.1 / Luma<br/><span class="text-xs text-muted-foreground">vid/veo-3.1-4k, luma...</span></td><td class="px-4 py-2">2.000 đ / video</td><td class="px-4 py-2 text-muted-foreground line-through">9.000 đ</td><td class="px-4 py-2 text-emerald-600 font-bold">~ 75%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  lifecycle: {
    updatePolicy: 'manual',
    healthCheckEndpoint: 'https://vilao.ai/api/v2/llm/marketplace/models',
    documentationUrl: 'https://vilao.ai'
  }
};
