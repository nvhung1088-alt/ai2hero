// Memory Manager — Quản lý Entity Profiles (Long-term Memory)
// Đọc/Ghi vào bảng videoMakerAssets (đã có sẵn, tái sử dụng)
// + Chat History via videoAgentWorkData (key='chat_history')

import { db } from '@/lib/db/drizzle';
import { videoMakerAssets, videoAgentWorkData } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { EntityProfile, AgentMessage } from './agent-types';

export class MemoryManager {
  private projectId: number;

  constructor(projectId: number) {
    this.projectId = projectId;
  }

  // ============ ENTITY PROFILES (Long-term Memory) ============

  /** Lấy toàn bộ Entity Profiles của dự án → dùng inject vào prompt Agent */
  async getEntityProfiles(): Promise<EntityProfile[]> {
    const assets = await db.select().from(videoMakerAssets).where(
      eq(videoMakerAssets.projectId, this.projectId)
    );
    return assets.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type as 'role' | 'scene' | 'tool',
      describe: a.describe || '',
      visualPrompt: a.prompt || '',
    }));
  }

  /** Tạo/Cập nhật Profile thực thể — ghi ngược vào DB */
  async saveEntityProfile(name: string, type: string, describe: string, visualPrompt: string): Promise<number> {
    // Tìm asset trùng tên trong cùng project
    const existing = await db.select().from(videoMakerAssets).where(
      and(
        eq(videoMakerAssets.projectId, this.projectId),
        eq(videoMakerAssets.name, name)
      )
    );
    if (existing.length > 0) {
      await db.update(videoMakerAssets).set({
        describe,
        prompt: visualPrompt,
        promptState: 'done'
      }).where(eq(videoMakerAssets.id, existing[0].id));
      return existing[0].id;
    } else {
      const [newAsset] = await db.insert(videoMakerAssets).values({
        projectId: this.projectId,
        name,
        type: type as any,
        describe,
        prompt: visualPrompt,
        promptState: 'done'
      }).returning();
      return newAsset.id;
    }
  }

  // ============ CHAT HISTORY (Short-term Memory) ============

  /** Lấy lịch sử chat agent của dự án */
  async getChatHistory(): Promise<AgentMessage[]> {
    const data = await db.select().from(videoAgentWorkData).where(
      and(
        eq(videoAgentWorkData.projectId, this.projectId),
        eq(videoAgentWorkData.key, 'chat_history')
      )
    );
    if (!data.length) return [];
    try {
      return JSON.parse(data[0].data);
    } catch {
      return [];
    }
  }

  /** Append tin nhắn mới vào chat history (giới hạn 50 tin nhắn gần nhất) */
  async appendChatMessage(message: AgentMessage) {
    const history = await this.getChatHistory();
    history.push(message);
    // Giữ tối đa 50 tin nhắn gần nhất (Short-term window)
    const trimmed = history.slice(-50);
    const dataStr = JSON.stringify(trimmed);

    const existing = await db.select().from(videoAgentWorkData).where(
      and(
        eq(videoAgentWorkData.projectId, this.projectId),
        eq(videoAgentWorkData.key, 'chat_history')
      )
    );
    if (existing.length > 0) {
      await db.update(videoAgentWorkData).set({
        data: dataStr,
        updatedAt: new Date()
      }).where(eq(videoAgentWorkData.id, existing[0].id));
    } else {
      await db.insert(videoAgentWorkData).values({
        projectId: this.projectId,
        key: 'chat_history',
        data: dataStr,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
    }
  }
}
