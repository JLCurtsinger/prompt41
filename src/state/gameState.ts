import { create } from 'zustand';

interface GameState {
  // Player state
  playerHealth: number;
  isSwinging: boolean;
  
  // Actions
  setPlayerHealth: (health: number) => void;
  setIsSwinging: (swinging: boolean) => void;
  resetCombatState: () => void;
}

export const useGameState = create<GameState>((set) => ({
  // Initial state
  playerHealth: 100,
  isSwinging: false,
  
  // Actions
  setPlayerHealth: (health) => set({ playerHealth: health }),
  setIsSwinging: (swinging) => set({ isSwinging: swinging }),
  resetCombatState: () => set({ isSwinging: false }),
}));

