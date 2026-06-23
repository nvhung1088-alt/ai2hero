// === AGENT MESSAGE PROTOCOL ===
export type AgentRole = 'orchestrator' | 'script' | 'asset' | 'storyboard' | 'supervisor';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentRole?: AgentRole;     // Agent nào đang xử lý
  timestamp?: number;
}

export interface AgentStepEvent {
  type: 'step';              // SSE event type
  agentRole: AgentRole;
  status: 'thinking' | 'executing' | 'reviewing' | 'done' | 'error';
  message: string;           // "Đang phân tích ý tưởng..."
}

export interface AgentTextEvent {
  type: 'text';              // SSE event type cho stream text
  content: string;           // Chunk text
  agentRole: AgentRole;
}

export interface AgentResultEvent {
  type: 'result';            // SSE event cuối cùng
  success: boolean;
  data?: any;                // Kết quả cuối: scripts[], storyboards[], etc.
  error?: string;
}

export type AgentSSEEvent = AgentStepEvent | AgentTextEvent | AgentResultEvent;

// === ORCHESTRATOR INTENT ===
export type OrchestratorIntent =
  | 'generate_script'          // Tạo kịch bản từ novel/idea
  | 'edit_script'              // Sửa kịch bản cụ thể
  | 'extract_assets'           // Trích xuất tài sản từ kịch bản
  | 'generate_storyboard'      // Tạo phân cảnh
  | 'edit_storyboard'          // Sửa phân cảnh cụ thể
  | 'general_chat'             // Chat chung về dự án
  | 'full_pipeline';           // Chạy toàn bộ pipeline

export interface OrchestratorPlan {
  intent: OrchestratorIntent;
  agents: AgentRole[];         // Danh sách agent cần gọi theo thứ tự
  context: {
    projectId: number;
    scriptIds?: number[];
    storyboardIds?: number[];
    userMessage: string;
    chatHistory: AgentMessage[];
    entityProfiles: EntityProfile[];
  };
}

// === MEMORY / ENTITY PROFILE ===
export interface EntityProfile {
  id: number;
  name: string;
  type: 'role' | 'scene' | 'tool';
  describe: string;            // Mô tả tiếng Việt
  visualPrompt: string;        // Prompt tiếng Anh cho AI image (Character Consistency)
}

// === SUPERVISOR RESULT ===
export interface SupervisorVerdict {
  passed: boolean;
  issues: SupervisorIssue[];
}

export interface SupervisorIssue {
  severity: 'error' | 'warning';
  field: string;               // 'storyboard[2].imagePrompt'
  message: string;             // "Thiếu mô tả ngoại hình nhân vật Lâm Phong"
  suggestion?: string;         // "Thêm: tall young man with..."
}
