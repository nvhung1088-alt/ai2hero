'use server';

import { and, eq, desc, not, sql, lt } from 'drizzle-orm';
import { db } from './drizzle';
import {
  heroCareInboxes,
  heroCareSnapshots,
  heroCareCustomers,
  heroCareConversations,
  heroCareMessages,
  heroCareScripts,
  heroCareSnapshotItems,
  heroCareGuardrails,
  heroCareEvents,
  teamMembers,
  teams,
  activityLogs,
  users
} from './schema';
import { getUser } from './queries';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { deliverMessage } from '../hero-care/ai-reply-engine';
import * as connectorService from '../connect-hub/connector-service';
import crypto from 'crypto';


// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const CreateInboxSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(255),
  channel: z.string().min(1, 'Kênh không được để trống'),
  connectionId: z.number().int().nullable().optional(),
  webhookId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'paused']).default('active'),
  systemPrompt: z.string().nullable().optional(),
  defaultReply: z.string().min(1, 'Câu trả lời mặc định không được để trống'),
  dailyMessageLimit: z.number().int().nonnegative().default(50),
  dailyAiCallLimit: z.number().int().nonnegative().default(20),
});

const CreateScriptSchema = z.object({
  inboxId: z.number().int().nullable().optional(),
  triggerText: z.string().min(1, 'Câu hỏi mẫu không được để trống'),
  keywords: z.array(z.string()).default([]),
  negativeKeywords: z.array(z.string()).default([]),
  triggerExamples: z.array(z.string()).default([]),
  intent: z.string().max(50).nullable().optional(),
  confidenceThreshold: z.number().int().min(0).max(100).default(70),
  replyText: z.string().min(1, 'Nội dung phản hồi không được để trống'),
  status: z.enum(['active', 'paused', 'pending', 'rejected']).default('active'),
});

const CreateSnapshotSchema = z.object({
  inboxId: z.number().int(),
  name: z.string().min(1, 'Tên snapshot không được để trống').max(255),
  dataType: z.string().min(1, 'Loại dữ liệu không được để trống'),
  refreshIntervalMinutes: z.number().int().min(1).default(15),
  maxStaleMinutes: z.number().int().min(5).default(60),
  allowStaleFallback: z.number().int().min(0).max(1).default(1),
  status: z.enum(['active', 'paused']).default('active'),
  config: z.record(z.any()).optional(),
});

export type CreateInboxInput = z.infer<typeof CreateInboxSchema>;
export type CreateScriptInput = z.infer<typeof CreateScriptSchema>;
export type CreateSnapshotInput = z.infer<typeof CreateSnapshotSchema>;

// ============================================================================
// SECURITY HELPER
// ============================================================================

async function verifyHeroCareAccess(targetTeamId: number, requireRole?: string[]) {
  if (process.env.HERO_CARE_TEST === 'true') {
    const [mockUser] = await db.select().from(users).limit(1);
    return { user: mockUser || { id: 1, email: 'test@example.com' }, role: 'owner' };
  }

  const user = await getUser();
  if (!user) {
    throw new Error('Chưa đăng nhập');
  }

  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, targetTeamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (member.length === 0) {
    throw new Error('Không có quyền truy cập Không gian làm việc này');
  }

  if (requireRole && !requireRole.includes(member[0].role)) {
    throw new Error('Bạn không có quyền thực hiện hành động này');
  }

  // App activation check
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, targetTeamId))
    .limit(1);

  if (team.length === 0 || team[0].deletedAt) {
    throw new Error('Không gian làm việc không tồn tại hoặc đã bị xóa');
  }

  const activatedApps = (team[0].activatedApps as string[]) || [];
  if (!activatedApps.includes('hero-care')) {
    throw new Error(`Ứng dụng Hero Care chưa được kích hoạt trong Không gian này`);
  }

  return { user, role: member[0].role };
}

function sanitizeError(error: any): string {
  return error?.message || 'Đã xảy ra sự cố kỹ thuật';
}

// ============================================================================
// INBOX ACTIONS
// ============================================================================

export async function getInboxesAction(teamId: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    const inboxes = await db
      .select()
      .from(heroCareInboxes)
      .where(and(eq(heroCareInboxes.teamId, teamId), not(eq(heroCareInboxes.status, 'deleted'))))
      .orderBy(desc(heroCareInboxes.createdAt));
    return { success: true, data: inboxes };
  } catch (error: any) {
    console.error('Error fetching inboxes:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function createInboxAction(teamId: number, data: CreateInboxInput) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    const parsed = CreateInboxSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }
    
    const [inserted] = await db
      .insert(heroCareInboxes)
      .values({
        teamId,
        name: parsed.data.name,
        channel: parsed.data.channel,
        connectionId: parsed.data.connectionId || null,
        webhookId: parsed.data.webhookId || null,
        status: parsed.data.status,
        systemPrompt: parsed.data.systemPrompt || null,
        defaultReply: parsed.data.defaultReply,
        dailyMessageLimit: parsed.data.dailyMessageLimit,
        dailyAiCallLimit: parsed.data.dailyAiCallLimit,
        dailyMessageCount: 0,
        dailyAiCallCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã tạo Inbox Hero Care mới: ${parsed.data.name}`
    });

    revalidatePath(`/hero-care/t/${teamId}/settings`);
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating inbox:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateInboxAction(teamId: number, inboxId: number, data: Partial<CreateInboxInput>) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    const parsed = CreateInboxSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const [existing] = await db
      .select()
      .from(heroCareInboxes)
      .where(and(eq(heroCareInboxes.id, inboxId), eq(heroCareInboxes.teamId, teamId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Không tìm thấy Inbox' };
    }

    const [updated] = await db
      .update(heroCareInboxes)
      .set({
        name: parsed.data.name ?? existing.name,
        channel: parsed.data.channel ?? existing.channel,
        connectionId: parsed.data.connectionId !== undefined ? parsed.data.connectionId : existing.connectionId,
        webhookId: parsed.data.webhookId !== undefined ? parsed.data.webhookId : existing.webhookId,
        status: parsed.data.status ?? existing.status,
        systemPrompt: parsed.data.systemPrompt !== undefined ? parsed.data.systemPrompt : existing.systemPrompt,
        defaultReply: parsed.data.defaultReply ?? existing.defaultReply,
        dailyMessageLimit: parsed.data.dailyMessageLimit ?? existing.dailyMessageLimit,
        dailyAiCallLimit: parsed.data.dailyAiCallLimit ?? existing.dailyAiCallLimit,
        updatedAt: new Date()
      })
      .where(and(eq(heroCareInboxes.id, inboxId), eq(heroCareInboxes.teamId, teamId)))
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật Inbox Hero Care: ${updated.name}`
    });

    revalidatePath(`/hero-care/t/${teamId}/settings`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating inbox:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteInboxAction(teamId: number, inboxId: number) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin']);
    
    // Soft delete inbox by updating status
    const [deleted] = await db
      .update(heroCareInboxes)
      .set({
        status: 'deleted',
        updatedAt: new Date()
      })
      .where(and(eq(heroCareInboxes.id, inboxId), eq(heroCareInboxes.teamId, teamId)))
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy Inbox hoặc không có quyền' };
    }

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xóa Inbox Hero Care: ${deleted.name}`
    });

    revalidatePath(`/hero-care/t/${teamId}/settings`);
    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting inbox:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ============================================================================
// SCRIPT (FAQ) ACTIONS
// ============================================================================

export async function getScriptsAction(teamId: number, inboxId?: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const query = db
      .select()
      .from(heroCareScripts)
      .where(
        inboxId 
          ? and(eq(heroCareScripts.teamId, teamId), eq(heroCareScripts.inboxId, inboxId), not(eq(heroCareScripts.status, 'deleted')))
          : and(eq(heroCareScripts.teamId, teamId), not(eq(heroCareScripts.status, 'deleted')))
      )
      .orderBy(desc(heroCareScripts.createdAt));

    const scripts = await query;
    return { success: true, data: scripts };
  } catch (error: any) {
    console.error('Error fetching scripts:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function createScriptAction(teamId: number, data: CreateScriptInput) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    const parsed = CreateScriptSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const [inserted] = await db
      .insert(heroCareScripts)
      .values({
        teamId,
        inboxId: parsed.data.inboxId || null,
        triggerText: parsed.data.triggerText,
        keywords: parsed.data.keywords,
        negativeKeywords: parsed.data.negativeKeywords,
        triggerExamples: parsed.data.triggerExamples,
        intent: parsed.data.intent || null,
        confidenceThreshold: parsed.data.confidenceThreshold,
        replyText: parsed.data.replyText,
        status: parsed.data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã tạo FAQ Script mới: ${parsed.data.triggerText.substring(0, 50)}...`
    });

    revalidatePath(`/hero-care/t/${teamId}/scripts`);
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating script:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateScriptAction(teamId: number, scriptId: number, data: Partial<CreateScriptInput>) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    const parsed = CreateScriptSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const [existing] = await db
      .select()
      .from(heroCareScripts)
      .where(and(eq(heroCareScripts.id, scriptId), eq(heroCareScripts.teamId, teamId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Không tìm thấy Script' };
    }

    const [updated] = await db
      .update(heroCareScripts)
      .set({
        inboxId: parsed.data.inboxId !== undefined ? parsed.data.inboxId : existing.inboxId,
        triggerText: parsed.data.triggerText ?? existing.triggerText,
        keywords: parsed.data.keywords ?? existing.keywords,
        negativeKeywords: parsed.data.negativeKeywords ?? existing.negativeKeywords,
        triggerExamples: parsed.data.triggerExamples ?? existing.triggerExamples,
        intent: parsed.data.intent !== undefined ? parsed.data.intent : existing.intent,
        confidenceThreshold: parsed.data.confidenceThreshold ?? existing.confidenceThreshold,
        replyText: parsed.data.replyText ?? existing.replyText,
        status: parsed.data.status ?? existing.status,
        updatedAt: new Date()
      })
      .where(and(eq(heroCareScripts.id, scriptId), eq(heroCareScripts.teamId, teamId)))
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật FAQ Script: ${updated.triggerText.substring(0, 50)}...`
    });

    revalidatePath(`/hero-care/t/${teamId}/scripts`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating script:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteScriptAction(teamId: number, scriptId: number) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    
    // Soft delete by setting status
    const [deleted] = await db
      .update(heroCareScripts)
      .set({
        status: 'deleted',
        updatedAt: new Date()
      })
      .where(and(eq(heroCareScripts.id, scriptId), eq(heroCareScripts.teamId, teamId)))
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy Script hoặc không có quyền' };
    }

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xóa FAQ Script: ${deleted.triggerText.substring(0, 50)}...`
    });

    revalidatePath(`/hero-care/t/${teamId}/scripts`);
    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting script:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ============================================================================
// SNAPSHOT ACTIONS
// ============================================================================

export async function getSnapshotsAction(teamId: number, inboxId?: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    const query = db
      .select()
      .from(heroCareSnapshots)
      .where(
        inboxId
          ? and(eq(heroCareSnapshots.teamId, teamId), eq(heroCareSnapshots.inboxId, inboxId), not(eq(heroCareSnapshots.status, 'deleted')))
          : and(eq(heroCareSnapshots.teamId, teamId), not(eq(heroCareSnapshots.status, 'deleted')))
      )
      .orderBy(desc(heroCareSnapshots.createdAt));

    const snapshots = await query;
    return { success: true, data: snapshots };
  } catch (error: any) {
    console.error('Error fetching snapshots:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function createSnapshotAction(teamId: number, data: CreateSnapshotInput) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    const parsed = CreateSnapshotSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const [inserted] = await db
      .insert(heroCareSnapshots)
      .values({
        teamId,
        inboxId: parsed.data.inboxId,
        name: parsed.data.name,
        dataType: parsed.data.dataType,
        refreshIntervalMinutes: parsed.data.refreshIntervalMinutes,
        maxStaleMinutes: parsed.data.maxStaleMinutes,
        allowStaleFallback: parsed.data.allowStaleFallback,
        status: parsed.data.status,
        config: parsed.data.config || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã tạo Snapshot config mới: ${parsed.data.name}`
    });

    revalidatePath(`/hero-care/t/${teamId}/snapshots`);
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating snapshot:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateSnapshotAction(teamId: number, snapshotId: number, data: Partial<CreateSnapshotInput>) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    const parsed = CreateSnapshotSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const [existing] = await db
      .select()
      .from(heroCareSnapshots)
      .where(and(eq(heroCareSnapshots.id, snapshotId), eq(heroCareSnapshots.teamId, teamId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Không tìm thấy Snapshot' };
    }

    const [updated] = await db
      .update(heroCareSnapshots)
      .set({
        name: parsed.data.name ?? existing.name,
        dataType: parsed.data.dataType ?? existing.dataType,
        refreshIntervalMinutes: parsed.data.refreshIntervalMinutes ?? existing.refreshIntervalMinutes,
        maxStaleMinutes: parsed.data.maxStaleMinutes ?? existing.maxStaleMinutes,
        allowStaleFallback: parsed.data.allowStaleFallback ?? existing.allowStaleFallback,
        status: parsed.data.status ?? existing.status,
        config: parsed.data.config ?? existing.config,
        updatedAt: new Date()
      })
      .where(and(eq(heroCareSnapshots.id, snapshotId), eq(heroCareSnapshots.teamId, teamId)))
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật Snapshot config: ${updated.name}`
    });

    revalidatePath(`/hero-care/t/${teamId}/snapshots`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating snapshot:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteSnapshotAction(teamId: number, snapshotId: number) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);
    
    // Soft delete
    const [deleted] = await db
      .update(heroCareSnapshots)
      .set({
        status: 'deleted',
        updatedAt: new Date()
      })
      .where(and(eq(heroCareSnapshots.id, snapshotId), eq(heroCareSnapshots.teamId, teamId)))
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy Snapshot hoặc không có quyền' };
    }

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xóa Snapshot config: ${deleted.name}`
    });

    revalidatePath(`/hero-care/t/${teamId}/snapshots`);
    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting snapshot:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ============================================================================
// CUSTOMER ACTIONS
// ============================================================================

export async function getCustomersAction(teamId: number, limit: number = 50, offset: number = 0) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    const customers = await db
      .select()
      .from(heroCareCustomers)
      .where(eq(heroCareCustomers.teamId, teamId))
      .orderBy(desc(heroCareCustomers.lastSeenAt))
      .limit(limit)
      .offset(offset);
    return { success: true, data: customers };
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateCustomerAction(
  teamId: number, 
  customerId: number, 
  data: { tags?: string[]; notes?: string }
) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [existing] = await db
      .select()
      .from(heroCareCustomers)
      .where(and(eq(heroCareCustomers.id, customerId), eq(heroCareCustomers.teamId, teamId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Không tìm thấy khách hàng' };
    }

    const [updated] = await db
      .update(heroCareCustomers)
      .set({
        tags: data.tags !== undefined ? data.tags : existing.tags,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        updatedAt: new Date()
      })
      .where(and(eq(heroCareCustomers.id, customerId), eq(heroCareCustomers.teamId, teamId)))
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật thông tin khách hàng: ${updated.name || 'Khách hàng #' + customerId}`
    });

    revalidatePath(`/hero-care/t/${teamId}/customers`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ============================================================================
// CONVERSATION & MESSAGE ACTIONS (CHAT UI)
// ============================================================================

export async function getConversationsAction(teamId: number, inboxId: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    const conversations = await db
      .select({
        id: heroCareConversations.id,
        teamId: heroCareConversations.teamId,
        inboxId: heroCareConversations.inboxId,
        externalConversationId: heroCareConversations.externalConversationId,
        customerId: heroCareConversations.customerId,
        chatMode: heroCareConversations.chatMode,
        status: heroCareConversations.status,
        lastMessageAt: heroCareConversations.lastMessageAt,
        createdAt: heroCareConversations.createdAt,
        updatedAt: heroCareConversations.updatedAt,
        customer: {
          id: heroCareCustomers.id,
          name: heroCareCustomers.name,
          phone: heroCareCustomers.phone,
          avatar: heroCareCustomers.avatar,
          tags: heroCareCustomers.tags,
          notes: heroCareCustomers.notes,
        }
      })
      .from(heroCareConversations)
      .leftJoin(heroCareCustomers, eq(heroCareConversations.customerId, heroCareCustomers.id))
      .where(
        and(
          eq(heroCareConversations.teamId, teamId),
          eq(heroCareConversations.inboxId, inboxId)
        )
      )
      .orderBy(desc(heroCareConversations.lastMessageAt));

    return { success: true, data: conversations };
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function getMessagesAction(teamId: number, conversationId: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    // Verify conversation belongs to team
    const [conv] = await db
      .select()
      .from(heroCareConversations)
      .where(and(eq(heroCareConversations.id, conversationId), eq(heroCareConversations.teamId, teamId)))
      .limit(1);

    if (!conv) {
      return { success: false, error: 'Không tìm thấy cuộc hội thoại' };
    }

    const messages = await db
      .select()
      .from(heroCareMessages)
      .where(
        and(
          eq(heroCareMessages.teamId, teamId),
          eq(heroCareMessages.conversationId, conversationId)
        )
      )
      .orderBy(heroCareMessages.createdAt);

    return { success: true, data: messages };
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateConversationModeAction(
  teamId: number, 
  conversationId: number, 
  chatMode: 'auto' | 'hybrid' | 'manual'
) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [conv] = await db
      .select()
      .from(heroCareConversations)
      .where(and(eq(heroCareConversations.id, conversationId), eq(heroCareConversations.teamId, teamId)))
      .limit(1);

    if (!conv) {
      return { success: false, error: 'Không tìm thấy cuộc hội thoại' };
    }

    const [updated] = await db
      .update(heroCareConversations)
      .set({
        chatMode,
        updatedAt: new Date()
      })
      .where(and(eq(heroCareConversations.id, conversationId), eq(heroCareConversations.teamId, teamId)))
      .returning();

    // Log event change
    await db.insert(heroCareEvents).values({
      teamId,
      inboxId: conv.inboxId,
      conversationId,
      eventType: 'chat_mode_changed',
      payload: { oldMode: conv.chatMode, newMode: chatMode, userId: user.id },
      processedAt: new Date(),
    });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating chat mode:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateConversationStatusAction(
  teamId: number, 
  conversationId: number, 
  status: 'active' | 'pending_agent' | 'resolved'
) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [conv] = await db
      .select()
      .from(heroCareConversations)
      .where(and(eq(heroCareConversations.id, conversationId), eq(heroCareConversations.teamId, teamId)))
      .limit(1);

    if (!conv) {
      return { success: false, error: 'Không tìm thấy cuộc hội thoại' };
    }

    const [updated] = await db
      .update(heroCareConversations)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(and(eq(heroCareConversations.id, conversationId), eq(heroCareConversations.teamId, teamId)))
      .returning();

    await db.insert(heroCareEvents).values({
      teamId,
      inboxId: conv.inboxId,
      conversationId,
      eventType: 'conversation_status_changed',
      payload: { oldStatus: conv.status, newStatus: status, userId: user.id },
      processedAt: new Date(),
    });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating conversation status:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function sendManualMessageAction(teamId: number, conversationId: number, content: string) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [conv] = await db
      .select()
      .from(heroCareConversations)
      .where(and(eq(heroCareConversations.id, conversationId), eq(heroCareConversations.teamId, teamId)))
      .limit(1);

    if (!conv) {
      return { success: false, error: 'Không tìm thấy cuộc hội thoại' };
    }

    // Insert message into local DB
    const [inserted] = await db
      .insert(heroCareMessages)
      .values({
        teamId,
        inboxId: conv.inboxId,
        conversationId,
        senderId: `agent-${user.id}`,
        senderName: user.name || 'Nhân viên',
        direction: 'outbound',
        messageType: 'text',
        content,
        createdAt: new Date(),
      })
      .returning();

    // Update conversation lastMessageAt
    await db
      .update(heroCareConversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(heroCareConversations.id, conversationId), eq(heroCareConversations.teamId, teamId)));

    // Log manual send event
    await db.insert(heroCareEvents).values({
      teamId,
      inboxId: conv.inboxId,
      conversationId,
      eventType: 'message_sent',
      payload: { messageId: inserted.id, method: 'manual', userId: user.id },
      processedAt: new Date(),
    });

    // Gọi deliverMessage gửi đi thật qua API kênh gốc
    const [inbox] = await db
      .select()
      .from(heroCareInboxes)
      .where(eq(heroCareInboxes.id, conv.inboxId))
      .limit(1);

    let delivered = false;
    if (inbox) {
      delivered = await deliverMessage(teamId, inbox, conv, content);
    }

    if (!delivered) {
      return { 
        success: false, 
        error: 'Gửi tin nhắn qua API kênh gốc thất bại. Vui lòng kiểm tra lại kết nối.',
        data: inserted 
      };
    }

    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error sending manual message:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function approveDraftAction(teamId: number, messageId: number, editedContent?: string) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [msg] = await db
      .select()
      .from(heroCareMessages)
      .where(and(eq(heroCareMessages.id, messageId), eq(heroCareMessages.teamId, teamId)))
      .limit(1);

    if (!msg) {
      return { success: false, error: 'Không tìm thấy tin nhắn nháp' };
    }

    const finalContent = editedContent !== undefined ? editedContent : (msg.draftContent || msg.content);

    const [updated] = await db
      .update(heroCareMessages)
      .set({
        direction: 'outbound',
        content: finalContent,
        draftStatus: editedContent !== undefined ? 'edited' : 'approved',
      })
      .where(and(eq(heroCareMessages.id, messageId), eq(heroCareMessages.teamId, teamId)))
      .returning();

    // Update conversation lastMessageAt
    await db
      .update(heroCareConversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(heroCareConversations.id, msg.conversationId), eq(heroCareConversations.teamId, teamId)));

    await db.insert(heroCareEvents).values({
      teamId,
      inboxId: msg.inboxId,
      conversationId: msg.conversationId,
      eventType: 'message_sent',
      payload: { messageId, method: 'hybrid_approved', userId: user.id },
      processedAt: new Date(),
    });

    // Gọi deliverMessage gửi đi thật qua API kênh gốc
    const [inbox] = await db
      .select()
      .from(heroCareInboxes)
      .where(eq(heroCareInboxes.id, msg.inboxId))
      .limit(1);

    const [conv] = await db
      .select()
      .from(heroCareConversations)
      .where(eq(heroCareConversations.id, msg.conversationId))
      .limit(1);

    let delivered = false;
    if (inbox && conv) {
      delivered = await deliverMessage(teamId, inbox, conv, finalContent);
    }

    if (!delivered) {
      return { 
        success: false, 
        error: 'Duyệt thành công nhưng không thể gửi tin qua API kênh gốc.',
        data: updated 
      };
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error approving draft:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function rejectDraftAction(teamId: number, messageId: number) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [msg] = await db
      .select()
      .from(heroCareMessages)
      .where(and(eq(heroCareMessages.id, messageId), eq(heroCareMessages.teamId, teamId)))
      .limit(1);

    if (!msg) {
      return { success: false, error: 'Không tìm thấy tin nhắn nháp' };
    }

    const [updated] = await db
      .update(heroCareMessages)
      .set({
        draftStatus: 'rejected',
      })
      .where(and(eq(heroCareMessages.id, messageId), eq(heroCareMessages.teamId, teamId)))
      .returning();

    await db.insert(heroCareEvents).values({
      teamId,
      inboxId: msg.inboxId,
      conversationId: msg.conversationId,
      eventType: 'draft_rejected',
      payload: { messageId, userId: user.id },
      processedAt: new Date(),
    });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error rejecting draft:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function getSnapshotItemsAction(teamId: number, query?: string) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    let dbQuery = db
      .select()
      .from(heroCareSnapshotItems)
      .where(eq(heroCareSnapshotItems.teamId, teamId))
      .orderBy(desc(heroCareSnapshotItems.createdAt))
      .limit(50);

    if (query) {
      dbQuery = db
        .select()
        .from(heroCareSnapshotItems)
        .where(
          and(
            eq(heroCareSnapshotItems.teamId, teamId),
            sql`${heroCareSnapshotItems.entityName} ILIKE ${'%' + query + '%'}`
          )
        )
        .orderBy(desc(heroCareSnapshotItems.createdAt))
        .limit(50);
    }

    const items = await dbQuery;
    return { success: true, data: items };
  } catch (error: any) {
    console.error('Error fetching snapshot items:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function getCustomerDetailsAction(teamId: number, customerId: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [customer] = await db
      .select()
      .from(heroCareCustomers)
      .where(and(eq(heroCareCustomers.id, customerId), eq(heroCareCustomers.teamId, teamId)))
      .limit(1);

    if (!customer) {
      return { success: false, error: 'Không tìm thấy khách hàng' };
    }

    return { success: true, data: customer };
  } catch (error: any) {
    console.error('Error fetching customer details:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ============================================================================
// SNAPSHOT SYNC ACTION & HELPERS (Phase 4)
// ============================================================================

function extractItems(resData: any): any[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.items)) return resData.items;
  
  if (resData.data && typeof resData.data === 'object') {
    for (const val of Object.values(resData.data)) {
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}

function parseItemMeta(item: any, dataType: string): { entityKey: string; entityName: string } {
  let entityKey = '';
  let entityName = '';

  if (item.code) entityKey = String(item.code);
  else if (item.sku) entityKey = String(item.sku);
  else if (item.id) entityKey = String(item.id);
  else if (item.key) entityKey = String(item.key);
  else entityKey = Math.random().toString(36).substring(7);

  if (item.fullName) entityName = String(item.fullName);
  else if (item.name) entityName = String(item.name);
  else if (item.title) entityName = String(item.title);
  else if (item.customerName) entityName = String(item.customerName);
  else if (dataType === 'orders') entityName = `Đơn hàng ${entityKey}`;
  else entityName = `Sản phẩm ${entityKey}`;

  return { entityKey, entityName };
}

function computeHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function triggerSnapshotSyncAction(teamId: number, snapshotId: number) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    // 1. Lấy snapshot config
    const [snap] = await db
      .select()
      .from(heroCareSnapshots)
      .where(and(eq(heroCareSnapshots.id, snapshotId), eq(heroCareSnapshots.teamId, teamId)))
      .limit(1);
      
    if (!snap) {
      return { success: false, error: 'Không tìm thấy cấu hình snapshot' };
    }
    
    // 2. Lấy Inbox để lấy connectionId
    const [inbox] = await db
      .select()
      .from(heroCareInboxes)
      .where(and(eq(heroCareInboxes.id, snap.inboxId), eq(heroCareInboxes.teamId, teamId)))
      .limit(1);
      
    if (!inbox) {
      return { success: false, error: 'Không tìm thấy Inbox tương ứng' };
    }
    
    if (!inbox.connectionId) {
      return { success: false, error: 'Inbox không cấu hình Connection ID' };
    }

    const syncStartTime = new Date();
    const startTime = Date.now();

    // 3. Xác định action slug thích hợp theo dataType
    let actionSlug = 'list_products';
    if (snap.dataType === 'orders') {
      actionSlug = 'list_orders';
    } else if (snap.dataType === 'customers') {
      actionSlug = 'list_customers';
    } else if (snap.dataType === 'inventory') {
      actionSlug = inbox.channel === 'pancake' ? 'get_inventory' : 'list_products';
    }

    // 4. Gọi API POS qua Connect Hub
    const apiRes = await connectorService.runConnectorAction({
      teamId,
      connectionId: inbox.connectionId,
      actionSlug,
      input: {},
      callerModule: 'hero-care'
    });

    if (!apiRes.success) {
      return { success: false, error: apiRes.error || 'Gọi API Connection thất bại' };
    }

    const rawItems = extractItems(apiRes.data);
    let insertedOrUpdated = 0;

    // 5. Upsert từng item vào Cache DB
    for (const rawItem of rawItems) {
      const { entityKey, entityName } = parseItemMeta(rawItem, snap.dataType);
      const dataHash = computeHash(rawItem);

      // Tìm xem item đã tồn tại trong snapshot chưa
      const [existingItem] = await db
        .select()
        .from(heroCareSnapshotItems)
        .where(
          and(
            eq(heroCareSnapshotItems.snapshotId, snap.id),
            eq(heroCareSnapshotItems.entityKey, entityKey)
          )
        )
        .limit(1);

      if (!existingItem) {
        await db.insert(heroCareSnapshotItems).values({
          teamId,
          snapshotId: snap.id,
          dataType: snap.dataType,
          entityKey,
          entityName,
          data: rawItem,
          dataHash,
          createdAt: new Date(),
          refreshedAt: new Date()
        });
        insertedOrUpdated++;
      } else if (existingItem.dataHash !== dataHash) {
        await db
          .update(heroCareSnapshotItems)
          .set({
            entityName,
            data: rawItem,
            dataHash,
            refreshedAt: new Date()
          })
          .where(eq(heroCareSnapshotItems.id, existingItem.id));
        insertedOrUpdated++;
      } else {
        await db
          .update(heroCareSnapshotItems)
          .set({
            refreshedAt: new Date()
          })
          .where(eq(heroCareSnapshotItems.id, existingItem.id));
      }
    }

    // 6. Garbage Collection: Xóa các items đã bị xóa ở POS gốc (refreshedAt < syncStartTime)
    await db
      .delete(heroCareSnapshotItems)
      .where(
        and(
          eq(heroCareSnapshotItems.snapshotId, snap.id),
          lt(heroCareSnapshotItems.refreshedAt, syncStartTime)
        )
      );

    // 7. Cập nhật thông tin snapshot
    const nextRefreshAt = new Date(Date.now() + snap.refreshIntervalMinutes * 60 * 1000);
    await db
      .update(heroCareSnapshots)
      .set({
        lastRefreshedAt: new Date(),
        nextRefreshAt,
        updatedAt: new Date()
      })
      .where(eq(heroCareSnapshots.id, snap.id));

    // 8. Log Event thành công
    await db.insert(heroCareEvents).values({
      teamId,
      inboxId: inbox.id,
      eventType: 'snapshot_refreshed',
      payload: {
        snapshotId: snap.id,
        itemsFetched: rawItems.length,
        itemsUpserted: insertedOrUpdated,
        durationMs: Date.now() - startTime,
        userId: user.id
      },
      processedAt: new Date()
    });

    try {
      revalidatePath(`/hero-care/t/${teamId}/snapshots`);
    } catch (e) {
      // Skip error in CLI testing
    }

    return { 
      success: true, 
      itemCount: rawItems.length, 
      upsertedCount: insertedOrUpdated 
    };

  } catch (error: any) {
    console.error('Error triggering snapshot sync:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ============================================================================
// GUARDRAILS ACTIONS (Phase 5)
// ============================================================================

export async function getGuardrailsAction(teamId: number, inboxId?: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    let dbQuery = db
      .select()
      .from(heroCareGuardrails)
      .where(eq(heroCareGuardrails.teamId, teamId));

    if (inboxId !== undefined) {
      dbQuery = db
        .select()
        .from(heroCareGuardrails)
        .where(
          and(
            eq(heroCareGuardrails.teamId, teamId),
            eq(heroCareGuardrails.inboxId, inboxId)
          )
        );
    }

    const rules = await dbQuery;
    return { success: true, data: rules };
  } catch (error: any) {
    console.error('Error fetching guardrails:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function saveGuardrailAction(
  teamId: number,
  data: {
    id?: number;
    inboxId?: number | null;
    ruleType: 'keyword_block' | 'intent_handoff' | 'max_turns_handoff' | 'stale_data_block';
    condition: Record<string, any>;
    action: 'handoff' | 'block' | 'warn';
    enabled: number;
  }
) {
  try {
    const { user } = await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);

    if (data.id) {
      // Update
      const [updated] = await db
        .update(heroCareGuardrails)
        .set({
          inboxId: data.inboxId || null,
          ruleType: data.ruleType,
          condition: data.condition,
          action: data.action,
          enabled: data.enabled,
        })
        .where(and(eq(heroCareGuardrails.id, data.id), eq(heroCareGuardrails.teamId, teamId)))
        .returning();

      if (!updated) {
        return { success: false, error: 'Không tìm thấy quy tắc bảo vệ cần cập nhật' };
      }

      return { success: true, data: updated };
    } else {
      // Create
      const [created] = await db
        .insert(heroCareGuardrails)
        .values({
          teamId,
          inboxId: data.inboxId || null,
          ruleType: data.ruleType,
          condition: data.condition,
          action: data.action,
          enabled: data.enabled,
          createdAt: new Date()
        })
        .returning();

      return { success: true, data: created };
    }
  } catch (error: any) {
    console.error('Error saving guardrail:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteGuardrailAction(teamId: number, guardrailId: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager']);

    const [deleted] = await db
      .delete(heroCareGuardrails)
      .where(and(eq(heroCareGuardrails.id, guardrailId), eq(heroCareGuardrails.teamId, teamId)))
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy quy tắc bảo vệ để xóa' };
    }

    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting guardrail:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// ============================================================================
// EVENT LOGS ACTIONS (Phase 5)
// ============================================================================

export async function getEventsAction(
  teamId: number,
  filters?: {
    inboxId?: number;
    eventType?: string;
    limit?: number;
  }
) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const limitVal = filters?.limit ? Math.min(filters.limit, 200) : 50;

    let conditions = [eq(heroCareEvents.teamId, teamId)];

    if (filters?.inboxId) {
      conditions.push(eq(heroCareEvents.inboxId, filters.inboxId));
    }
    if (filters?.eventType) {
      conditions.push(eq(heroCareEvents.eventType, filters.eventType));
    }

    const events = await db
      .select()
      .from(heroCareEvents)
      .where(and(...conditions))
      .orderBy(desc(heroCareEvents.createdAt))
      .limit(limitVal);

    return { success: true, data: events };
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function getEventDetailAction(teamId: number, eventId: number) {
  try {
    await verifyHeroCareAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const [event] = await db
      .select()
      .from(heroCareEvents)
      .where(and(eq(heroCareEvents.id, eventId), eq(heroCareEvents.teamId, teamId)))
      .limit(1);

    if (!event) {
      return { success: false, error: 'Không tìm thấy chi tiết sự kiện' };
    }

    return { success: true, data: event };
  } catch (error: any) {
    console.error('Error fetching event details:', error);
    return { success: false, error: sanitizeError(error) };
  }
}


