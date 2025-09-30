import { create } from 'zustand';

interface NavigationState {
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
  isChatbotOpen: boolean; // ✅ Nou estat
  toggleChatbot: () => void; // ✅ Nova acció
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  setIsNavigating: (isNavigating) => set({ isNavigating }),
  isChatbotOpen: false, // Per defecte, està tancat
  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),
}));