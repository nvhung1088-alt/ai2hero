'use client'

import { useChatStore } from '../chat-store';
import { ChatPopup } from './chat-popup';

export function ChatDock({ currentUserId }: { currentUserId: number }) {
  const { activeChats } = useChatStore();

  if (activeChats.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-10 z-[100] flex items-end gap-3 pointer-events-none">
      {activeChats.map(chat => (
        <ChatPopup key={chat.conversationId} chat={chat} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
