import { HeroAiText } from './ai-utils';
import { cleanAndParseJson } from './agents';
import {
  getScriptContext,
  getProjectAssets,
  addDeriveAsset,
  addVideoTrack,
  syncStoryboardsFromPipeline
} from './agent-tools';

/**
 * 1. Derive Assets Agent
 * Phân tích kịch bản và tạo các tài sản phái sinh (ví dụ nhân vật bị thương, mặc đồ khác...)
 */
export interface DeriveAssetsResult {
  derivedAssets: {
    baseAssetId: number;
    name: string;
    derivativeContext: string;
    visualModifiers: string;
  }[];
}

export class DeriveAssetsAgent {
  private aiText: HeroAiText;
  constructor(aiText: HeroAiText) { this.aiText = aiText; }
  async execute(params: { scriptContent: string, baseAssets: any[] }): Promise<DeriveAssetsResult> {
    const assetsContext = params.baseAssets.map(a => `[ID: ${a.id}] ${a.name} (${a.type}): ${a.describe}`).join('\n');
    const systemPrompt = `Bạn là DeriveAssetsAgent.
Nhiệm vụ: Phân tích kịch bản và danh sách tài sản (nhân vật, bối cảnh) gốc. Nếu kịch bản yêu cầu nhân vật/bối cảnh ở một trạng thái khác biệt rõ rệt (ví dụ: bị thương, mặc áo giáp, bối cảnh ban đêm, bị tàn phá) so với gốc, hãy tạo tài sản phái sinh.

[Tài sản gốc]:
${assetsContext}

Output JSON format:
{
  "derivedAssets": [
    {
      "baseAssetId": 123,
      "name": "Tên tài sản phái sinh (VD: Arthur - Bị thương)",
      "derivativeContext": "Hoàn cảnh dẫn đến sự thay đổi",
      "visualModifiers": "Các từ khoá mô tả sự thay đổi ngoại hình (VD: bloody clothes, battle scars)"
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: params.scriptContent }],
      temperature: 0.3
    });
    return cleanAndParseJson<DeriveAssetsResult>(res.text);
  }
}

/**
 * 2. Generate Assets Agent
 * Quyết định tài sản nào cần sinh ảnh ngay lập tức.
 */
export interface GenerateAssetsResult {
  assetsToGenerate: number[]; // Danh sách ID tài sản cần sinh ảnh
}

export class GenerateAssetsAgent {
  private aiText: HeroAiText;
  constructor(aiText: HeroAiText) { this.aiText = aiText; }
  async execute(params: { assets: any[] }): Promise<GenerateAssetsResult> {
    const systemPrompt = `Bạn là GenerateAssetsAgent.
Nhiệm vụ: Dựa vào danh sách tài sản (bao gồm gốc và phái sinh), quyết định xem tài sản nào thực sự cần thiết phải sinh ảnh mẫu (Reference Image) để dùng cho quá trình tạo Storyboard sau này. Bỏ qua các tài sản phụ không quan trọng.

Output JSON format:
{
  "assetsToGenerate": [123, 124] // Mảng các ID tài sản cần sinh ảnh
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(params.assets) }],
      temperature: 0.1
    });
    return cleanAndParseJson<GenerateAssetsResult>(res.text);
  }
}

/**
 * 3. Director Plan Agent
 * Lên kế hoạch đạo diễn (góc máy, ánh sáng, mood) cho toàn bộ video.
 */
export interface DirectorPlanResult {
  overallMood: string;
  cinematographyStyle: string;
  colorPalette: string;
  keyDirectingNotes: string[];
}

export class DirectorPlanAgent {
  private aiText: HeroAiText;
  constructor(aiText: HeroAiText) { this.aiText = aiText; }
  async execute(params: { scriptContent: string }): Promise<DirectorPlanResult> {
    const systemPrompt = `Bạn là DirectorPlanAgent - Đạo diễn hình ảnh.
Nhiệm vụ: Đọc kịch bản và xác định phong cách hình ảnh tổng thể, màu sắc, và các ghi chú đạo diễn quan trọng (góc quay chủ đạo, nhịp độ cắt cảnh).

Output JSON format:
{
  "overallMood": "Tâm trạng tổng thể (VD: Căng thẳng, U ám, Hài hước)",
  "cinematographyStyle": "Phong cách quay (VD: Handheld, Cinematic, Anime style)",
  "colorPalette": "Bảng màu chủ đạo",
  "keyDirectingNotes": ["Ghi chú 1", "Ghi chú 2"]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: params.scriptContent }],
      temperature: 0.5
    });
    return cleanAndParseJson<DirectorPlanResult>(res.text);
  }
}

/**
 * 4. Storyboard Panel Agent
 * Tách kịch bản thành các panel (khung hình) chi tiết.
 */
export interface StoryboardPanelResult {
  panels: {
    panelIndex: number;
    action: string;
    cameraAngle: string;
    assetsInvolved: number[]; // ID của các tài sản xuất hiện
  }[];
}

export class StoryboardPanelAgent {
  private aiText: HeroAiText;
  constructor(aiText: HeroAiText) { this.aiText = aiText; }
  async execute(params: { scriptContent: string, directorPlan: DirectorPlanResult, assets: any[] }): Promise<StoryboardPanelResult> {
    const systemPrompt = `Bạn là StoryboardPanelAgent.
Nhiệm vụ: Chia kịch bản thành các cảnh quay (panel) riêng biệt. Áp dụng phong cách đạo diễn được cung cấp. Xác định rõ tài sản (ID) nào xuất hiện trong từng panel.

[Director Plan]:
${JSON.stringify(params.directorPlan)}

[Danh sách Assets]:
${JSON.stringify(params.assets.map(a => ({id: a.id, name: a.name})))}

Output JSON format:
{
  "panels": [
    {
      "panelIndex": 1,
      "action": "Mô tả hành động trong khung hình",
      "cameraAngle": "Góc máy (VD: Close-up, Wide shot)",
      "assetsInvolved": [1, 2]
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: params.scriptContent }],
      temperature: 0.5
    });
    return cleanAndParseJson<StoryboardPanelResult>(res.text);
  }
}

/**
 * 5. Storyboard Table Agent
 * Lập bảng phân cảnh (table) nối các panel với thời gian và voice.
 */
export interface StoryboardTableResult {
  tracks: {
    trackId: string;
    type: 'video' | 'audio';
    clips: {
      panelIndex?: number;
      startTime: number; // giây
      duration: number; // giây
      content: string; // mô tả video hoặc nội dung voice/audio
    }[];
  }[];
}

export class StoryboardTableAgent {
  private aiText: HeroAiText;
  constructor(aiText: HeroAiText) { this.aiText = aiText; }
  async execute(params: { panels: StoryboardPanelResult['panels'] }): Promise<StoryboardTableResult> {
    const systemPrompt = `Bạn là StoryboardTableAgent.
Nhiệm vụ: Từ danh sách các panels, sắp xếp chúng lên timeline (video track) và dự kiến thời lượng (duration) hợp lý cho mỗi panel (thường 3-6s). Thêm một audio track cho voice over/nhạc nền (nếu cần).

Output JSON format:
{
  "tracks": [
    {
      "trackId": "video_1",
      "type": "video",
      "clips": [
        { "panelIndex": 1, "startTime": 0, "duration": 4, "content": "Mô tả panel 1" }
      ]
    },
    {
      "trackId": "audio_1",
      "type": "audio",
      "clips": [
        { "startTime": 0, "duration": 4, "content": "Voice over tương ứng" }
      ]
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(params.panels) }],
      temperature: 0.3
    });
    return cleanAndParseJson<StoryboardTableResult>(res.text);
  }
}

/**
 * 6. Storyboard Gen Agent
 * Tạo chi tiết prompt sinh ảnh/video cho từng panel.
 */
export interface StoryboardGenResult {
  prompts: {
    panelIndex: number;
    imagePrompt: string;
    videoPrompt?: string;
  }[];
}

export class StoryboardGenAgent {
  private aiText: HeroAiText;
  constructor(aiText: HeroAiText) { this.aiText = aiText; }
  async execute(params: { panels: StoryboardPanelResult['panels'], directorPlan: DirectorPlanResult, assets: any[] }): Promise<StoryboardGenResult> {
    const systemPrompt = `Bạn là StoryboardGenAgent.
Nhiệm vụ: Viết prompt chi tiết bằng tiếng Anh để sinh ảnh/video cho từng panel. Cần kết hợp:
1. Hành động trong panel
2. Góc máy
3. Phong cách đạo diễn (cinematographyStyle, colorPalette)
4. Đặc điểm của các assets xuất hiện (ghép mô tả của chúng vào prompt)

Output JSON format:
{
  "prompts": [
    {
      "panelIndex": 1,
      "imagePrompt": "English prompt for Midjourney/Stable Diffusion...",
      "videoPrompt": "English prompt for Runway/Kling/Sora..."
    }
  ]
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(params.panels) }],
      temperature: 0.6
    });
    return cleanAndParseJson<StoryboardGenResult>(res.text);
  }
}

/**
 * 7. Supervision Agent
 * Đánh giá chất lượng của kế hoạch tổng thể.
 */
export interface SupervisionResult {
  approved: boolean;
  feedback: string;
}

export class SupervisionAgent {
  private aiText: HeroAiText;
  constructor(aiText: HeroAiText) { this.aiText = aiText; }
  async execute(params: { directorPlan: DirectorPlanResult, tracks: StoryboardTableResult['tracks'] }): Promise<SupervisionResult> {
    const systemPrompt = `Bạn là SupervisionAgent - Giám đốc sản xuất.
Nhiệm vụ: Kiểm tra kế hoạch đạo diễn và timeline. Đánh giá xem nó có hợp lý, logic và hấp dẫn không.
Nếu tốt -> approved: true. Nếu có điểm phi lý (thời lượng quá dài/ngắn, thiếu logic) -> approved: false và đưa ra feedback.

Output JSON format:
{
  "approved": true,
  "feedback": "Nhận xét tổng quan..."
}`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(params) }],
      temperature: 0.2
    });
    return cleanAndParseJson<SupervisionResult>(res.text);
  }
}

/**
 * Production Orchestrator
 * Điều phối luồng 7 sub-agents
 */
export class ProductionOrchestrator {
  private aiText: HeroAiText;
  
  constructor(aiText: HeroAiText) {
    this.aiText = aiText;
  }

  async runPipeline(projectId: number) {
    // 0. Chuẩn bị Context
    const scripts = await getScriptContext(projectId);
    if (!scripts || scripts.length === 0) throw new Error("Chưa có kịch bản");
    const fullScript = scripts.map(s => s.content).join('\n\n');
    let assets = await getProjectAssets(projectId);

    // Agents
    const deriveAssetsAgent = new DeriveAssetsAgent(this.aiText);
    const generateAssetsAgent = new GenerateAssetsAgent(this.aiText);
    const directorPlanAgent = new DirectorPlanAgent(this.aiText);
    const storyboardPanelAgent = new StoryboardPanelAgent(this.aiText);
    const storyboardTableAgent = new StoryboardTableAgent(this.aiText);
    const storyboardGenAgent = new StoryboardGenAgent(this.aiText);
    const supervisionAgent = new SupervisionAgent(this.aiText);

    console.log("[Pipeline] 1. Derive Assets...");
    const deriveRes = await deriveAssetsAgent.execute({ scriptContent: fullScript, baseAssets: assets });
    // Thêm derived assets vào DB
    if (deriveRes.derivedAssets && deriveRes.derivedAssets.length > 0) {
      for (const da of deriveRes.derivedAssets) {
        await addDeriveAsset(projectId, da.baseAssetId, da.name, {
          derivativeContext: da.derivativeContext,
          visualModifiers: da.visualModifiers
        });
      }
      // Cập nhật lại list assets
      assets = await getProjectAssets(projectId);
    }
    
    console.log("[Pipeline] 2. Generate Assets Plan...");
    const genAssetsRes = await generateAssetsAgent.execute({ assets });

    console.log("[Pipeline] 3. Director Plan...");
    const directorPlanRes = await directorPlanAgent.execute({ scriptContent: fullScript });

    console.log("[Pipeline] 4. Storyboard Panel...");
    const panelRes = await storyboardPanelAgent.execute({ 
      scriptContent: fullScript, 
      directorPlan: directorPlanRes,
      assets 
    });

    console.log("[Pipeline] 5. Storyboard Table...");
    const tableRes = await storyboardTableAgent.execute({ panels: panelRes.panels });
    
    // Lưu timeline/tracks vào DB
    if (tableRes.tracks) {
      await addVideoTrack(projectId, { tracks: tableRes.tracks, directorPlan: directorPlanRes });
    }

    console.log("[Pipeline] 6. Storyboard Gen Prompts...");
    const genRes = await storyboardGenAgent.execute({ 
      panels: panelRes.panels, 
      directorPlan: directorPlanRes, 
      assets 
    });

    console.log("[Pipeline] 7. Supervision...");
    const supRes = await supervisionAgent.execute({ 
      directorPlan: directorPlanRes, 
      tracks: tableRes.tracks 
    });

    // Đồng bộ về videoStoryboards để tương thích UI cũ
    if (genRes.prompts && tableRes.tracks && panelRes.panels) {
      await syncStoryboardsFromPipeline(projectId, panelRes.panels, genRes.prompts, tableRes.tracks);
    }

    return {
      status: 'pipeline_complete',
      details: { 
        deriveRes, 
        genAssetsRes, 
        directorPlanRes, 
        panelRes, 
        tableRes, 
        genRes, 
        supRes 
      }
    };
  }
}
