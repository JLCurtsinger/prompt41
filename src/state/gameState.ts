import { create } from 'zustand';

interface GameState {
  // Player state
  playerHealth: number;
  playerMaxHealth: number;
  isSwinging: boolean;
  recentlyHit: boolean;
  isDead: boolean;
  
  // Actions
  setPlayerHealth: (health: number) => void;
  setIsSwinging: (swinging: boolean) => void;
  resetCombatState: () => void;
  applyDamage: (amount: number, source?: string) => void;
  resetPlayer: () => void;
  setRecentlyHit: (hit: boolean) => void;
  setIsDead: (dead: boolean) => void;
}

export const useGameState = create<GameState>((set, get) => ({
  // Initial state
  playerHealth: 100,
  playerMaxHealth: 100,
  isSwinging: false,
  recentlyHit: false,
  isDead: false,
  
  // Actions
  setPlayerHealth: (health) => set({ playerHealth: health }),
  setIsSwinging: (swinging) => set({ isSwinging: swinging }),
  resetCombatState: () => set({ isSwinging: false }),
  
  applyDamage: (amount, source = 'unknown') => {
    const currentHealth = get().playerHealth;
    const newHealth = Math.max(0, currentHealth - amount);
    set({ 
      playerHealth: newHealth,
      recentlyHit: true,
      isDead: newHealth === 0
    });
    console.log(`Damage: -${amount} from ${source} -> current HP: ${newHealth}`);
    
    // Clear recentlyHit after 200ms
    setTimeout(() => {
      set({ recentlyHit: false });
    }, 200);
  },
  
  resetPlayer: () => {
    set({
      playerHealth: get().playerMaxHealth,
      isDead: false,
      recentlyHit: false,
      isSwinging: false
    });
  },
  
  setRecentlyHit: (hit) => set({ recentlyHit: hit }),
  setIsDead: (dead) => set({ isDead: dead }),
}));

