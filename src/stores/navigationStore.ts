// src/stores/navigationStore.ts

import { create } from 'zustand';
// Importem el tipus que defineix com és un equip
import type { ActiveTeam } from '@/types/app/navigation'; 

interface NavigationState {
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
  isChatbotOpen: boolean;
  toggleChatbot: () => void;
  
  // ✅ --- AQUESTES SÓN LES LÍNIES QUE FALTAVEN ---
  activeTeam: ActiveTeam | null;
  setActiveTeam: (team: ActiveTeam | null) => void;
  // ✅ -------------------------------------------
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  setIsNavigating: (isNavigating) => set({ isNavigating }),
  isChatbotOpen: false,
  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),

  // ✅ --- AFEGIM ELS VALORS INICIALS ---
  activeTeam: null, // Comença sent null
  setActiveTeam: (team) => set({ activeTeam: team }),
  // ✅ ---------------------------------
}));