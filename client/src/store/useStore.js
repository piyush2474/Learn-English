import { create } from 'zustand';

const useStore = create((set) => ({
  // Connection & Matchmaking
  status: 'Idle',
  isSocketConnected: false,
  roomId: null,
  userCount: 0,
  partnerName: 'Stranger',
  partnerUserId: null,
  
  // User Profile
  myUserId: null,
  myName: 'Stranger',
  
  // Chat Data
  messages: [],
  sharedKey: null,
  isPartnerTyping: false,
  unreadCounts: {},
  partnerMediaStatus: null,
  
  // Friends System
  friends: [],
  friendRequests: [],
  
  // UI & Modes
  isSidebarOpen: false,
  isSettingsOpen: false,
  isStealthMode: false,
  stealthWord: null,
  isVaultEnabled: false,
  isVaultUnlocked: false,
  replyingTo: null,
  hasMoreMessages: false,
  
  // Actions
  setStatus: (status) => set({ status }),
  setIsSocketConnected: (isConnected) => set({ isSocketConnected: isConnected }),
  setRoomId: (roomId) => set({ roomId }),
  setUserCount: (count) => set({ userCount: count }),
  setPartnerName: (name) => set({ partnerName: name }),
  setPartnerUserId: (id) => set({ partnerUserId: id }),
  
  setMyUserId: (id) => set({ myUserId: id }),
  setMyName: (name) => set({ myName: name }),
  
  setMessages: (messages) => set((state) => ({ 
    messages: typeof messages === 'function' ? messages(state.messages) : messages 
  })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  
  setSharedKey: (key) => set({ sharedKey: key }),
  setIsPartnerTyping: (isTyping) => set({ isPartnerTyping: isTyping }),
  setUnreadCounts: (counts) => set((state) => ({ 
    unreadCounts: typeof counts === 'function' ? counts(state.unreadCounts) : counts 
  })),
  setPartnerMediaStatus: (status) => set({ partnerMediaStatus: status }),
  
  setFriends: (friends) => set((state) => ({ 
    friends: typeof friends === 'function' ? friends(state.friends) : friends 
  })),
  setFriendRequests: (requests) => set((state) => ({ 
    friendRequests: typeof requests === 'function' ? requests(state.friendRequests) : requests 
  })),
  
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setIsStealthMode: (isStealth) => set({ isStealthMode: isStealth }),
  setStealthWord: (word) => set({ stealthWord: word }),
  setIsVaultEnabled: (isEnabled) => set({ isVaultEnabled: isEnabled }),
  setIsVaultUnlocked: (isUnlocked) => set({ isVaultUnlocked: isUnlocked }),
  setReplyingTo: (msg) => set({ replyingTo: msg }),
  setHasMoreMessages: (has) => set({ hasMoreMessages: has }),
  
  // Complex actions
  resetChat: () => set({ 
    messages: [], 
    sharedKey: null, 
    roomId: null, 
    partnerName: 'Stranger',
    partnerUserId: null,
    isPartnerTyping: false
  }),
}));

export default useStore;
