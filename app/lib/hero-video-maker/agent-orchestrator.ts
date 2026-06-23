import { HeroAiText } from './ai-utils';
import { MemoryManager } from './memory-manager';
import { ScriptAgent, AssetAgent, StoryboardAgent } from './agents';
import { SupervisorAgent } from './agent-supervisor';
import { AgentSSEEvent, AgentRole, AgentMessage, OrchestratorPlan } from './agent-types';

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

export class HeroAgentOrchestrator {
  private aiText: HeroAiText;
  private memory: MemoryManager;
  private teamId: number;

  constructor(aiText: HeroAiText, projectId: number, teamId: number) {
    this.aiText = aiText;
    this.memory = new MemoryManager(projectId);
    this.teamId = teamId;
  }

  /** Gửi event qua SSE callback */
  private emitStep(onEvent: (e: AgentSSEEvent) => void, role: AgentRole, status: 'thinking' | 'executing' | 'reviewing' | 'done' | 'error', message: string) {
    onEvent({ type: 'step', agentRole: role, status, message });
  }

  /** Ghi tin nhắn vào bộ nhớ ngắn hạn (History) */
  private async appendMessage(role: 'user' | 'assistant' | 'system', content: string, agentRole?: AgentRole) {
    await this.memory.appendChatMessage({
      role,
      content,
      agentRole,
      timestamp: Date.now()
    });
  }

  async processMessage(params: {
    userMessage: string;
    projectId: number;
    onEvent: (event: AgentSSEEvent) => void;
  }) {
    const { userMessage, onEvent } = params;

    // 1. Lưu user message
    await this.appendMessage('user', userMessage);

    try {
      this.emitStep(onEvent, 'orchestrator', 'thinking', 'Đang phân tích yêu cầu...');

      // Lấy lịch sử và Entity Profiles
      const chatHistory = await this.memory.getChatHistory();
      const entityProfiles = await this.memory.getEntityProfiles();

      // 2. Xác định Intent
      const plan = await this.determineIntent(userMessage, chatHistory);

      if (plan.intent === 'general_chat') {
        const directRes = (plan as any).directResponse || 'Tôi không hiểu ý bạn, vui lòng mô tả chi tiết hơn.';
        this.emitStep(onEvent, 'orchestrator', 'done', 'Đã phân tích xong');
        onEvent({ type: 'text', agentRole: 'orchestrator', content: directRes });
        onEvent({ type: 'result', success: true, data: { reply: directRes } });
        await this.appendMessage('assistant', directRes, 'orchestrator');
        return;
      }

      this.emitStep(onEvent, 'orchestrator', 'done', `Lên kế hoạch gọi: ${plan.agents.join(' -> ')}`);

      // Khởi tạo các Agent
      const scriptAgent = new ScriptAgent(this.aiText);
      const assetAgent = new AssetAgent(this.aiText);
      const storyboardAgent = new StoryboardAgent(this.aiText);
      const supervisor = new SupervisorAgent(this.aiText);

      let finalData: any = {};
      let currentContextData = userMessage; // Dữ liệu luân chuyển giữa các agent

      // 3. Thực thi Pipeline theo các agent được lên lịch
      for (const role of plan.agents) {
        let attempts = 0;
        let success = false;
        let agentResult = null;
        let lastErrorMsg = '';

        while (attempts < 2 && !success) {
          attempts++;
          try {
            // EXECUTION
            this.emitStep(onEvent, role, 'executing', `[Lần ${attempts}] Đang xử lý tác vụ ${role}...`);
            
            if (role === 'script') {
              agentResult = await scriptAgent.execute({
                userMessage: attempts === 1 ? currentContextData : `${currentContextData}\nLưu ý sửa lỗi: ${lastErrorMsg}`,
                entityProfiles
              });
            } else if (role === 'asset') {
              agentResult = await assetAgent.execute({
                scriptContent: typeof currentContextData === 'string' ? currentContextData : JSON.stringify(currentContextData),
                existingProfiles: entityProfiles
              });
            } else if (role === 'storyboard') {
              agentResult = await storyboardAgent.execute({
                scriptContent: typeof currentContextData === 'string' ? currentContextData : JSON.stringify(currentContextData),
                entityProfiles
              });
            }

            // SUPERVISION
            this.emitStep(onEvent, 'supervisor', 'reviewing', `Đang kiểm định kết quả của ${role}...`);
            const verdict = await supervisor.execute({
              resultData: agentResult,
              targetAgent: role as any,
              entityProfiles
            });

            if (verdict.passed) {
              success = true;
              this.emitStep(onEvent, 'supervisor', 'done', `Kiểm định ${role} thành công.`);
            } else {
              lastErrorMsg = verdict.issues.map(i => `[${i.field}] ${i.message} -> ${i.suggestion}`).join('\n');
              this.emitStep(onEvent, 'supervisor', 'error', `Kiểm định thất bại, yêu cầu làm lại: ${verdict.issues[0].message}`);
            }

          } catch (err: any) {
            lastErrorMsg = err.message || 'Lỗi không xác định';
            this.emitStep(onEvent, role, 'error', `Lỗi execution: ${lastErrorMsg}`);
          }
        }

        if (!success) {
          throw new Error(`Agent ${role} thất bại sau 2 lần thử. Lỗi cuối: ${lastErrorMsg}`);
        }

        // Lưu kết quả của agent này vào finalData
        if (role === 'script') {
          finalData.scripts = (agentResult as any).scripts;
          // Context cho agent tiếp theo (nếu có) là script đầu tiên
          currentContextData = finalData.scripts[0]?.content || userMessage;
        } else if (role === 'asset') {
          finalData.assets = agentResult;
          // Cập nhật DB cho tài sản mới
          const assetsRes = agentResult as any;
          if (assetsRes.newAssets) {
            for (const a of assetsRes.newAssets) {
              await this.memory.saveEntityProfile(a.name, a.type, a.describe, a.visualPrompt);
            }
          }
        } else if (role === 'storyboard') {
          finalData.storyboard = agentResult;
        }
      }

      // 4. Trả về kết quả tổng thể
      const successMsg = "Đã hoàn thành toàn bộ tiến trình phân tích.";
      onEvent({ type: 'text', agentRole: 'orchestrator', content: successMsg });
      onEvent({ type: 'result', success: true, data: finalData });
      await this.appendMessage('assistant', successMsg, 'orchestrator');

    } catch (error: any) {
      console.error('[Orchestrator] Error:', error);
      const errMsg = error.message || 'Lỗi không xác định trong hệ thống AI.';
      this.emitStep(onEvent, 'orchestrator', 'error', errMsg);
      onEvent({ type: 'result', success: false, error: errMsg });
      await this.appendMessage('assistant', `Lỗi hệ thống: ${errMsg}`, 'orchestrator');
    }
  }

  private async determineIntent(userMessage: string, chatHistory: AgentMessage[]): Promise<OrchestratorPlan & { directResponse?: string }> {
    const systemPrompt = `Bạn là OrchestratorAgent — bộ não điều phối của hệ thống AI Video Editor.

# NHIỆM VỤ
Phân tích tin nhắn người dùng và lịch sử trò chuyện để xác định INTENT (mục đích) và LÊN KẾ HOẠCH gọi Agent.

# CÁC INTENT HỖ TRỢ & AGENT CẦN GỌI TƯƠNG ỨNG
| Intent | Mô tả | Danh sách Agents |
|---|---|---|
| generate_script | Tạo kịch bản mới | ["script"] |
| extract_assets | Tìm/trích xuất thực thể (nhân vật/bối cảnh) | ["asset"] |
| generate_storyboard | Tạo phân cảnh (chia cảnh) | ["storyboard"] |
| full_pipeline | Tạo luồng từ A-Z (kịch bản -> thực thể -> phân cảnh) | ["script", "asset", "storyboard"] |
| general_chat | Trả lời câu hỏi chung, hỏi đáp bình thường | [] |

# OUTPUT FORMAT
BẮT BUỘC TRẢ VỀ DUY NHẤT CHUỖI JSON:
{
  "intent": "generate_script",
  "agents": ["script"],
  "reasoning": "Người dùng muốn lên kịch bản cho video nấu ăn.",
  "directResponse": null
}

Nếu intent = general_chat, mảng agents PHẢI RỖNG và directResponse chứa câu trả lời trực tiếp:
{
  "intent": "general_chat",
  "agents": [],
  "reasoning": "Người dùng chỉ chào hỏi.",
  "directResponse": "Xin chào! Tôi có thể giúp bạn viết kịch bản, trích xuất nhân vật hoặc lập phân cảnh video. Bạn muốn bắt đầu từ đâu?"
}`;

    const recentHistory = chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    const promptMsg = `Lịch sử gần đây:\n${recentHistory}\n\nTin nhắn mới nhất của người dùng: "${userMessage}"\n\nHãy phân tích và trả về JSON.`;

    const res = await this.aiText.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: promptMsg }],
      temperature: 0.1
    });

    return cleanAndParseJson<OrchestratorPlan & { directResponse?: string }>(res.text);
  }
}
