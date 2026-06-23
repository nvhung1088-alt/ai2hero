'use client'

import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '../chat-store';
import { getOrCreateDirectConversation } from '@/lib/db/social-chat-actions';
import { useState } from 'react';

export function MessageButton({ targetUser }: { targetUser: { id: number, name: string, avatarUrl: string | null } }) {
  const { openChat } = useChatStore();
  const [loading, setLoading] = useState(false);

  const handleMessage = async () => {
    try {
      setLoading(true);
      const conv = await getOrCreateDirectConversation(targetUser.id);
      openChat({ id: targetUser.id, name: targetUser.name, avatar: targetUser.avatarUrl || '' }, conv.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleMessage} disabled={loading} variant="secondary" size="sm" className="gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200">
      <MessageSquare className="w-4 h-4" />
      <span>Nhắn tin</span>
    </Button>
  );
}
