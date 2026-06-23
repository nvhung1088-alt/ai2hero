import { create } from 'zustand';

export interface ChatPopupState {
  conversationId: number;
  userId: number;
  userName: string;
  userAvatar: string;
  isMinimized: boolean;
}

interface ChatStore {
  activeChats: ChatPopupState[];
  openChat: (user: { id: number, name: string, avatar: string }, conversationId: number) => void;
  closeChat: (conversationId: number) => void;
  minimizeChat: (conversationId: number, minimized: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeChats: [],
  openChat: (user, conversationId) => set((state) => {
    // Check if already open
    const exists = state.activeChats.find(c => c.conversationId === conversationId);
    if (exists) {
      return {
        activeChats: state.activeChats.map(c => 
          c.conversationId === conversationId ? { ...c, isMinimized: false } : c
        )
      };
    }
    
    // Max 3 popups open
    const newChat: ChatPopupState = {
      conversationId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      isMinimized: false
    };

    let newChats = [newChat, ...state.activeChats];
    if (newChats.length > 3) {
      newChats = newChats.slice(0, 3);
    }
    
    return { activeChats: newChats };
  }),
  closeChat: (conversationId) => set((state) => ({
    activeChats: state.activeChats.filter(c => c.conversationId !== conversationId)
  })),
  minimizeChat: (conversationId, minimized) => set((state) => ({
    activeChats: state.activeChats.map(c => 
      c.conversationId === conversationId ? { ...c, isMinimized: minimized } : c
    )
  }))
}));
