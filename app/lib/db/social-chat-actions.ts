'use server'

import { db } from './drizzle';
import { socialConversations, socialConversationMembers, socialMessages } from './schema';
import { getUser } from './queries';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Tạo mới hoặc lấy conversation direct 1-1 có sẵn
export async function getOrCreateDirectConversation(targetUserId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  // Tìm cuộc hội thoại direct mà cả user và targetUserId đều là member
  const myConvs = await db.query.socialConversationMembers.findMany({
    where: eq(socialConversationMembers.userId, user.id),
  });
  
  const myConvIds = myConvs.map(m => m.conversationId);
  
  if (myConvIds.length > 0) {
    const targetConvs = await db.query.socialConversationMembers.findMany({
      where: and(
        eq(socialConversationMembers.userId, targetUserId),
        inArray(socialConversationMembers.conversationId, myConvIds)
      ),
      with: {
        conversation: true
      }
    });

    // Trả về cuộc hội thoại type = 'direct'
    const directConv = targetConvs.find(c => c.conversation?.type === 'direct');
    if (directConv) {
      return directConv.conversation;
    }
  }

  // Không có thì tạo mới
  const [newConv] = await db.insert(socialConversations).values({
    type: 'direct',
  }).returning();

  // Insert 2 members
  await db.insert(socialConversationMembers).values([
    { conversationId: newConv.id, userId: user.id },
    { conversationId: newConv.id, userId: targetUserId }
  ]);

  return newConv;
}

export async function getChatConversations() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  // Lấy các cuộc trò chuyện của mình
  const myMemberships = await db.query.socialConversationMembers.findMany({
    where: eq(socialConversationMembers.userId, user.id),
  });

  const convIds = myMemberships.map(m => m.conversationId);
  if (convIds.length === 0) return [];

  // Lấy chi tiết các conversations và tất cả members của chúng
  const conversations = await db.query.socialConversations.findMany({
    where: inArray(socialConversations.id, convIds),
    with: {
      members: {
        with: {
          user: true
        }
      },
      messages: {
        orderBy: desc(socialMessages.createdAt),
        limit: 1
      }
    }
  });

  // Map lại để trả về thông tin dễ hiển thị ở Client
  return conversations.map(conv => {
    const lastMsg = conv.messages[0] || null;
    
    // Nếu là direct chat, tìm đối phương (partner)
    let title = conv.name || '';
    let avatarUrl = '';
    
    if (conv.type === 'direct') {
      const partner = conv.members.find(m => m.userId !== user.id)?.user;
      title = partner?.name || 'Người dùng AI2Hero';
      avatarUrl = partner?.avatarUrl || '';
    }

    return {
      id: conv.id,
      type: conv.type,
      title,
      avatarUrl,
      lastMessage: lastMsg ? {
        content: lastMsg.content,
        createdAt: lastMsg.createdAt,
        senderId: lastMsg.senderId
      } : null,
      updatedAt: conv.updatedAt
    };
  }).sort((a, b) => {
    const dateA = a.lastMessage?.createdAt || a.updatedAt || new Date(0);
    const dateB = b.lastMessage?.createdAt || b.updatedAt || new Date(0);
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

export async function getChatMessages(conversationId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  // Kiểm tra xem user có trong conversation không
  const membership = await db.query.socialConversationMembers.findFirst({
    where: and(
      eq(socialConversationMembers.conversationId, conversationId),
      eq(socialConversationMembers.userId, user.id)
    )
  });

  if (!membership) throw new Error('Forbidden');

  // Lấy tin nhắn
  const messages = await db.query.socialMessages.findMany({
    where: eq(socialMessages.conversationId, conversationId),
    orderBy: desc(socialMessages.createdAt),
    limit: 50,
    with: {
      sender: true
    }
  });

  return messages.reverse();
}

export async function sendChatMessageAction(conversationId: number, content: string, attachments: any[] = []) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    // Kiểm tra quyền gửi
    const membership = await db.query.socialConversationMembers.findFirst({
      where: and(
        eq(socialConversationMembers.conversationId, conversationId),
        eq(socialConversationMembers.userId, user.id)
      )
    });

    if (!membership) throw new Error('Forbidden');

    // Insert tin nhắn mới
    const [newMsg] = await db.insert(socialMessages).values({
      conversationId,
      senderId: user.id,
      content,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null
    }).returning();

    // Cập nhật thời gian update của conversation
    await db.update(socialConversations).set({
      updatedAt: new Date()
    }).where(eq(socialConversations.id, conversationId));

    revalidatePath(`/messages/${conversationId}`);
    return { data: newMsg };
  } catch (error: any) {
    console.error('Lỗi gửi tin nhắn:', error);
    return { error: error.message || 'Không thể gửi tin nhắn' };
  }
}