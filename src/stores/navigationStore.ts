// src/stores/navigationStore.ts

import { create } from 'zustand';
// ✅ 1. Importem el nou tipus que acabem de crear
import type { ActiveTeam } from '@/types/app/navigation'; 

interface NavigationState {
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
  isChatbotOpen: boolean;
  toggleChatbot: () => void;
  
  // ✅ 2. AFEGIM LES PROPIETATS QUE FALTAVEN
  activeTeam: ActiveTeam | null;
  setActiveTeam: (team: ActiveTeam | null) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  setIsNavigating: (isNavigating) => set({ isNavigating }),
  isChatbotOpen: false,
  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),

  // ✅ 3. AFEGIM ELS VALORS PER DEFECTE
  activeTeam: null, // Comença sent null
  setActiveTeam: (team) => set({ activeTeam: team }),
}));