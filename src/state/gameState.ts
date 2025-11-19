// TEST PLAN (Door + Terminal State)
// 1. Initial State:
//    - doorStates['zone1-zone2-main'] should be 'closed'
//    - terminalStates['terminal-zone2-main'] should be 'locked'
// 2. Terminal State Change:
//    - Call setTerminalState('terminal-zone2-main', 'hacked')
//    - Verify getTerminalState('terminal-zone2-main') returns 'hacked'
// 3. Door State Change:
//    - Call setDoorState('zone1-zone2-main', 'open')
//    - Verify getDoorState('zone1-zone2-main') returns 'open'
// 4. Hacking Success Flow:
//    - Terminal should call setTerminalState('terminal-zone2-main', 'hacked')
//    - Terminal should then call setDoorState('zone1-zone2-main', 'open')
//    - Door component should react to state change and open visually

import { create } from 'zustand';

interface GameState {
  // Player state
  playerHealth: number;
  playerMaxHealth: number;
  isSwinging: boolean;
  recentlyHit: boolean;
  isDead: boolean;
  
  // Door and terminal state
  doorStates: Record<string, 'closed' | 'open'>;
  terminalStates: Record<string, 'locked' | 'hacked'>;
  
  // Game pause state (for hacking overlay, etc.)
  isPaused: boolean;
  
  // Actions
  setPlayerHealth: (health: number) => void;
  setIsSwinging: (swinging: boolean) => void;
  resetCombatState: () => void;
  applyDamage: (amount: number, source?: string) => void;
  resetPlayer: () => void;
  setRecentlyHit: (hit: boolean) => void;
  setIsDead: (dead: boolean) => void;
  
  // Door and terminal actions
  setDoorState: (id: string, state: 'closed' | 'open') => void;
  setTerminalState: (id: string, state: 'locked' | 'hacked') => void;
  
  // Pause actions
  setPaused: (paused: boolean) => void;
}

// Helper functions to get state (exported for use in components)
export const getDoorState = (state: GameState, id: string): 'closed' | 'open' => {
  return state.doorStates[id] || 'closed';
};

export const getTerminalState = (state: GameState, id: string): 'locked' | 'hacked' => {
  return state.terminalStates[id] || 'locked';
};

export const useGameState = create<GameState>((set, get) => ({
  // Initial state
  playerHealth: 100,
  playerMaxHealth: 100,
  isSwinging: false,
  recentlyHit: false,
  isDead: false,
  
  // Door and terminal initial state
  doorStates: {
    'zone1-zone2-main': 'closed'
  },
  terminalStates: {
    'terminal-zone2-main': 'locked'
  },
  
  // Pause state
  isPaused: false,
  
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
  
  // Door and terminal actions
  setDoorState: (id, state) => {
    set((prev) => ({
      doorStates: { ...prev.doorStates, [id]: state }
    }));
    console.log(`Door ${id} set to ${state}`);
  },
  
  setTerminalState: (id, state) => {
    set((prev) => ({
      terminalStates: { ...prev.terminalStates, [id]: state }
    }));
    console.log(`Terminal ${id} set to ${state}`);
  },
  
  // Pause actions
  setPaused: (paused) => set({ isPaused: paused }),
}));

