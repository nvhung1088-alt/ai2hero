"use client";

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getChatMessages, sendChatMessageAction } from '@/lib/db/social-chat-actions';
import { Send, Info, Search, Phone, Video, MoreHorizontal, PenSquare, Image as ImageIcon, Smile, Mic, PlusCircle, ChevronLeft, Loader2 } from 'lucide-react';

export function MessagesClient({ currentUserId, initialConversations, initialConvId }: { currentUserId: number, initialConversations: any[], initialConvId?: number | null }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<number | null>(initialConvId || (conversations.length > 0 ? conversations[0].id : null));
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // State cho tin nhắn
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Thiết lập SSE Realtime
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let eventSource: EventSource | null = null;
    let isMounted = true;

    const initChat = async () => {
      setIsLoadingMessages(true);
      try {
        // Lấy tin nhắn ban đầu
        const initialMessages = await getChatMessages(activeConvId);
        if (!isMounted) return;
        setMessages(initialMessages);
        setIsLoadingMessages(false);

        // Tính toán lastId
        const lastId = initialMessages.length > 0 
          ? Math.max(...initialMessages.map(m => m.id)) 
          : 0;

        // Mở kết nối SSE
        eventSource = new EventSource(`/api/chat/stream?conversationId=${activeConvId}&lastId=${lastId}`);
        
        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (Array.isArray(data) && data.length > 0) {
               setMessages(prev => {
                 const newMessages = [...prev];
                 data.forEach(newMsg => {
                   // Tránh duplicate tin nhắn (có thể do optimistic update)
                   if (!newMessages.find(m => m.id === newMsg.id)) {
                     newMessages.push(newMsg);
                   }
                 });
                 return newMessages;
               });
               
               // Cuộn xuống
               setTimeout(() => {
                 if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
               }, 100);
            }
          } catch (e) {
            console.error("Lỗi parse SSE:", e);
          }
        };

        eventSource.onerror = (err) => {
           console.error("Lỗi SSE connection (sẽ tự động reconnect):", err);
        };

      } catch (err) {
        console.error("Lỗi khởi tạo chat:", err);
        setIsLoadingMessages(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeConvId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConvId || sending) return;
    
    const tempInput = input.trim();
    setInput('');
    setSending(true);
    
    // Optimistic UI Update
    const optimisticMsg = {
      id: Date.now() + Math.random(), // Random id tạm thời
      content: tempInput,
      senderId: currentUserId,
      createdAt: new Date(),
      sender: { name: 'You' }
    } as any;
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await sendChatMessageAction(activeConvId, tempInput);
      // Không cần fetch lại, SSE sẽ tự động push tin nhắn mới về và thay thế optimistic msg (nếu cần)
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch (e) {
      console.error(e);
      // Rollback on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full text-white bg-[#0f0f10]">
      {/* Sidebar - Conversations list */}
      <div className={`w-full lg:w-[360px] border-r border-white/5 flex-col bg-[#161618] shrink-0 ${activeConvId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-bold text-white">Đoạn chat</h2>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <MoreHorizontal className="w-5 h-5 text-white/90" />
              </button>
              <button className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <PenSquare className="w-4.5 h-4.5 text-white/90" />
              </button>
            </div>
          </div>
          
          {/* Ô tìm kiếm hội thoại */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Tìm kiếm trên Messenger"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/10 rounded-full text-[15px] text-white placeholder-white/40 focus:outline-none focus:bg-white/15 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-full bg-white/10 text-pink-500 font-semibold text-[13px]">Tất cả</button>
            <button className="px-3 py-1.5 rounded-full hover:bg-white/5 font-semibold text-[13px] text-white/60">Chưa đọc</button>
            <button className="px-3 py-1.5 rounded-full hover:bg-white/5 font-semibold text-[13px] text-white/60">Nhóm</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/40">Chưa có hội thoại nào</div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const initial = conv.title.charAt(0).toUpperCase();
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-2 rounded-lg flex gap-3 items-center transition-all ${
                    isActive ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <Avatar className="h-[52px] w-[52px] border-0 shrink-0">
                    <AvatarImage src={conv.avatarUrl || ''} />
                    <AvatarFallback className="bg-white/10 text-white font-bold">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-semibold truncate block pr-2 text-white/90">{conv.title}</span>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-white/45 truncate">
                        {conv.lastMessage.senderId === currentUserId ? 'Bạn: ' : ''}
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className={`flex-1 flex-col bg-[#0f0f10] ${!activeConvId ? 'hidden lg:flex' : 'flex'}`}>
        {activeConv ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[#0f0f10] shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveConvId(null)} className="lg:hidden text-white/70 hover:text-white transition-colors mr-1">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <Avatar className="h-10 w-10 border-0">
                  <AvatarImage src={activeConv.avatarUrl || ''} />
                  <AvatarFallback className="bg-white/10 text-white font-bold">{activeConv.title.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-[15px] font-bold text-white/95">{activeConv.title}</h3>
                  <span className="text-[12px] text-white/50">Đang hoạt động</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="text-pink-500 hover:text-pink-400 transition-colors">
                  <Phone className="w-5 h-5 fill-current" />
                </button>
                <button className="text-pink-500 hover:text-pink-400 transition-colors">
                  <Video className="w-6 h-6 fill-current" />
                </button>
                <button 
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`transition-colors ${showInfoPanel ? 'text-pink-500' : 'text-pink-500 hover:text-pink-400'}`}
                >
                  <Info className="w-6 h-6 fill-current" />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const senderInitial = (msg.sender?.name || '?').charAt(0).toUpperCase();
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 max-w-[75%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <Avatar className="h-7 w-7 border border-white/10 shrink-0">
                        <AvatarImage src={msg.sender?.avatarUrl || ''} />
                        <AvatarFallback className="bg-white/10 text-white text-[10px]">{senderInitial}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col gap-1">
                      <div className={`px-4 py-2 text-[15px] rounded-[20px] ${
                        isMe 
                          ? 'bg-pink-500 text-white rounded-br-sm' 
                          : 'bg-white/10 text-white rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className={`text-[9px] text-white/30 ${isMe ? 'text-right' : ''}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 bg-[#0f0f10] flex gap-3 items-end">
              <div className="flex gap-2 pb-2">
                <button type="button" className="text-pink-500 hover:text-pink-400 transition-colors">
                  <PlusCircle className="w-5 h-5" />
                </button>
                <button type="button" className="text-pink-500 hover:text-pink-400 transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button type="button" className="text-pink-500 hover:text-pink-400 transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Aa"
                  className="w-full pl-4 pr-10 py-2 bg-white/10 rounded-full text-[15px] text-white placeholder-white/40 focus:outline-none focus:bg-white/15 transition-colors"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-500 hover:text-pink-400">
                  <Smile className="w-5 h-5" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="pb-2 text-pink-500 hover:text-pink-400 disabled:text-white/20 transition-colors cursor-pointer"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 fill-current" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-lg font-bold text-white/80">Chọn một cuộc hội thoại</h3>
            <p className="text-sm text-white/40 mt-1">Bắt đầu trò chuyện với đồng nghiệp của bạn.</p>
          </div>
        )}
      </div>

      {/* Cột 3: Info Panel */}
      {showInfoPanel && activeConv && (
        <div className="w-[320px] border-l border-white/5 bg-[#0f0f10] h-full flex flex-col items-center gap-6 overflow-y-auto shrink-0 hidden lg:flex">
          <div className="flex flex-col items-center text-center gap-2 pt-6 w-full">
            <Avatar className="h-[80px] w-[80px] border-0 shrink-0 mb-1">
              <AvatarImage src={activeConv.avatarUrl || ''} />
              <AvatarFallback className="bg-white/10 text-white font-bold text-3xl">{activeConv.title.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h3 className="font-extrabold text-[17px] text-white">{activeConv.title}</h3>
            
            <div className="flex items-center gap-6 mt-4">
              <div className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Avatar className="w-5 h-5 border-0"><AvatarFallback className="bg-transparent text-white/90 text-xs">P</AvatarFallback></Avatar>
                </div>
                <span className="text-[12px] text-white/90">Trang cá nhân</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white/90">🔔</span>
                </div>
                <span className="text-[12px] text-white/90">Tắt thông báo</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Search className="w-4 h-4 text-white/90" />
                </div>
                <span className="text-[12px] text-white/90">Tìm kiếm</span>
              </div>
            </div>
          </div>

          <div className="w-full space-y-0 pb-6 w-full">
            <button className="w-full px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between">
              <span className="text-[15px] font-semibold text-white/95">Thông tin về đoạn chat</span>
              <span className="text-white/60">▼</span>
            </button>
            <button className="w-full px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between">
              <span className="text-[15px] font-semibold text-white/95">Tùy chỉnh đoạn chat</span>
              <span className="text-white/60">▼</span>
            </button>
            <button className="w-full px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between">
              <span className="text-[15px] font-semibold text-white/95">File phương tiện, file và liên kết</span>
              <span className="text-white/60">▼</span>
            </button>
            <button className="w-full px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between">
              <span className="text-[15px] font-semibold text-white/95">Quyền riêng tư và hỗ trợ</span>
              <span className="text-white/60">▼</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}