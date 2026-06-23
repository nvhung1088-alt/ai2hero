'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStore, ChatPopupState } from '../chat-store';
import { X, Minus, Send } from 'lucide-react';
import { getChatMessages, sendChatMessageAction } from '@/lib/db/social-chat-actions';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: number;
  senderId: number;
  content: string;
  createdAt: Date;
  sender: { id: number, name: string, avatarUrl: string | null };
}

export function ChatPopup({ chat, currentUserId }: { chat: ChatPopupState, currentUserId: number }) {
  const { closeChat, minimizeChat } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [chat.conversationId]);
  
  useEffect(() => {
    if (scrollRef.current && !chat.isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chat.isMinimized]);

  const fetchMessages = async () => {
    try {
      const msgs = await getChatMessages(chat.conversationId);
      setMessages(msgs as any);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const tempInput = input.trim();
    setInput('');
    
    try {
      await sendChatMessageAction(chat.conversationId, tempInput);
      await fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  if (chat.isMinimized) {
    return (
      <div 
        onClick={() => minimizeChat(chat.conversationId, false)}
        className="w-64 bg-[#161618] border border-white/10 rounded-t-xl px-4 py-3 flex items-center justify-between shadow-2xl cursor-pointer hover:bg-white/5 transition-colors text-white"
      >
        <span className="text-xs font-semibold truncate max-w-[150px]">{chat.userName}</span>
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); closeChat(chat.conversationId); }} className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const initial = chat.userName.charAt(0).toUpperCase();

  return (
    <div className="w-80 h-[380px] bg-[#161618] border border-white/10 rounded-t-xl flex flex-col shadow-2xl text-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border border-white/10">
            <AvatarImage src={chat.userAvatar || ''} />
            <AvatarFallback className="bg-white/10 text-white font-bold text-[10px]">{initial}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold truncate max-w-[120px]">{chat.userName}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => minimizeChat(chat.conversationId, true)} className="text-white/40 hover:text-white cursor-pointer">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => closeChat(chat.conversationId)} className="text-white/40 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-2.5 rounded-xl text-xs max-w-[80%] ${
                isMe 
                  ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-br-none' 
                  : 'bg-white/5 border border-white/5 text-white/95 rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 disabled:bg-white/5 disabled:text-white/20 text-white transition-colors cursor-pointer shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}