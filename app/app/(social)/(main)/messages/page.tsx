import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { MessagesClient } from './messages-client';
import { getChatConversations, getOrCreateDirectConversation } from '@/lib/db/social-chat-actions';

export const revalidate = 0;

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ userId?: string, convId?: string }> }) {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const resolvedSearchParams = await searchParams;
  let activeConvId = resolvedSearchParams.convId ? parseInt(resolvedSearchParams.convId) : null;

  // Nếu User đến từ trang cá nhân (nhấn nút nhắn tin) => query getOrCreateDirectConversation
  if (!activeConvId && resolvedSearchParams.userId) {
    const targetUserId = parseInt(resolvedSearchParams.userId);
    if (!isNaN(targetUserId)) {
      try {
        const conv = await getOrCreateDirectConversation(targetUserId);
        if (conv) {
          activeConvId = conv.id;
        }
      } catch (e) {
        console.error('Error creating conversation:', e);
      }
    }
  }

  const conversations = await getChatConversations();

  return (
    <div className="flex h-[calc(100vh-100px)] lg:h-[calc(100vh-64px)] w-full relative">
      <MessagesClient 
        currentUserId={user.id} 
        initialConversations={conversations as any} 
        initialConvId={activeConvId}
      />
    </div>
  );
}
