// TEST PLAN (Door + Terminal State + Sentinel + Shutdown)
// 1. Initial State:
//    - doorStates['zone1-zone2-main'] should be 'closed'
//    - terminalStates['terminal-zone2-main'] should be 'locked'
//    - terminalStates['terminal-zone4-final'] should be 'locked'
//    - sentinelDefeated should be false
//    - isShuttingDown should be false
// 2. Terminal State Change:
//    - Call setTerminalState('terminal-zone2-main', 'hacked')
//    - Verify getTerminalState('terminal-zone2-main') returns 'hacked'
// 3. Door State Change:
//    - Call setDoorState('zone1-zone2-main', 'open')
//    - Verify getDoorState('zone1-zone2-main') returns 'open'
// 4. Sentinel Defeat:
//    - When Sentinel health reaches 0, sentinelDefeated should become true
//    - Terminal zone4-final should become usable
// 5. Shutdown:
//    - When final terminal is hacked, isShuttingDown should become true
//    - ScreenFade should fade in over 4 seconds
// 6. Full Reset:
//    - Press R during shutdown -> resetPlayer() should reset everything
//    - All states should return to initial values
//
// TEST PLAN (Host Messages / playHostLine)
// 1. Zone Entry Events:
//    - Call playHostLine('zoneEntry', { zoneId: 'zone1' })
//    - Verify hostMessages array contains a new message with text from zoneEntry.zone1
//    - Call playHostLine('zoneEntry', { zoneId: 'zone2' })
//    - Verify a second message is added
// 2. Cooldown System:
//    - Call playHostLine('combat:lowHealth') twice within 5 seconds
//    - Verify only one message is added (cooldown prevents duplicate)
//    - Wait 6 seconds, call again - should add a new message
// 3. Message Limit:
//    - Call playHostLine 10 times with different eventKeys
//    - Verify hostMessages array contains at most 5 messages (oldest removed)
// 4. Hacking Events:
//    - Call playHostLine('hacking:start') when terminal opens
//    - Call playHostLine('hacking:success') when terminal is hacked
//    - Verify messages appear in HostLog UI
// 5. Combat Events:
//    - Call playHostLine('combat:lowHealth') when health < 30%
//    - Call playHostLine('combat:sentinelSpawn') when Sentinel activates
//    - Call playHostLine('combat:death') when player dies
//
// TEST PLAN (Inventory System)
// 1. Initial State:
//    - energyCellCount should be 0 on game start
// 2. Add Energy Cell:
//    - Call addEnergyCell(1) -> energyCellCount should become 1
//    - Call addEnergyCell(2) -> energyCellCount should become 3
//    - Verify HUD displays correct count
// 3. Consume Energy Cell:
//    - With energyCellCount = 3, call consumeEnergyCell(1) -> should become 2
//    - Call consumeEnergyCell(5) -> should remain 0 (doesn't go negative)
// 4. Reset Inventory:
//    - Call resetInventory() -> energyCellCount should become 0
// 5. Reset Player:
//    - Call resetPlayer() -> energyCellCount should be reset to 0
//    - Verify inventory resets on death/respawn

import { create } from 'zustand';
import hostLinesData from '../assets/data/hostLines.json';

interface HostMessage {
  id: string;
  text: string;
  timestamp: number;
}

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
  
  // Sentinel and shutdown state
  sentinelDefeated: boolean;
  isShuttingDown: boolean;
  
  // Host message bus
  hostMessages: HostMessage[];
  lastHostEvent: string | null;
  lowHealthTriggered: boolean; // Track if low health line has been triggered
  
  // Inventory state
  energyCellCount: number;
  
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
  
  // Sentinel and shutdown actions
  setSentinelDefeated: (defeated: boolean) => void;
  setIsShuttingDown: (shuttingDown: boolean) => void;
  
  // Host message actions
  playHostLine: (eventKey: string, options?: { zoneId?: string }) => void;
  
  // Inventory actions
  addEnergyCell: (count?: number) => void;
  consumeEnergyCell: (count?: number) => void;
  resetInventory: () => void;
}

// Helper functions to get state (exported for use in components)
export const getDoorState = (state: GameState, id: string): 'closed' | 'open' => {
  return state.doorStates[id] || 'closed';
};

export const getTerminalState = (state: GameState, id: string): 'locked' | 'hacked' => {
  return state.terminalStates[id] || 'locked';
};

// Cooldown tracking for host lines (prevents spam)
const hostLineCooldowns = new Map<string, number>();
const COOLDOWN_DURATION = 5000; // 5 seconds
const MAX_MESSAGES = 5;

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
    'terminal-zone2-main': 'locked',
    'terminal-zone4-final': 'locked'
  },
  
  // Pause state
  isPaused: false,
  
  // Sentinel and shutdown state
  sentinelDefeated: false,
  isShuttingDown: false,
  
  // Host message bus initial state
  hostMessages: [],
  lastHostEvent: null,
  lowHealthTriggered: false,
  
  // Inventory initial state
  energyCellCount: 0,
  
  // Actions
  setPlayerHealth: (health) => set({ playerHealth: health }),
  setIsSwinging: (swinging) => set({ isSwinging: swinging }),
  resetCombatState: () => set({ isSwinging: false }),
  
  applyDamage: (amount, source = 'unknown') => {
    const currentHealth = get().playerHealth;
    const maxHealth = get().playerMaxHealth;
    const newHealth = Math.max(0, currentHealth - amount);
    const healthRatio = newHealth / maxHealth;
    const wasLowHealth = currentHealth / maxHealth < 0.3;
    const isLowHealth = healthRatio < 0.3;
    
    set({ 
      playerHealth: newHealth,
      recentlyHit: true,
      isDead: newHealth === 0
    });
    console.log(`Damage: -${amount} from ${source} -> current HP: ${newHealth}`);
    
    // Trigger low health line if crossing threshold
    if (!wasLowHealth && isLowHealth && !get().lowHealthTriggered) {
      get().playHostLine('combat:lowHealth');
      set({ lowHealthTriggered: true });
    }
    
    // Trigger death line
    if (newHealth === 0) {
      get().playHostLine('combat:death');
    }
    
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
      isSwinging: false,
      // Reset door and terminal states
      doorStates: {
        'zone1-zone2-main': 'closed'
      },
      terminalStates: {
        'terminal-zone2-main': 'locked',
        'terminal-zone4-final': 'locked'
      },
      // Reset Sentinel and shutdown
      sentinelDefeated: false,
      isShuttingDown: false,
      isPaused: false,
      // Reset host messages
      hostMessages: [],
      lastHostEvent: null,
      lowHealthTriggered: false,
      // Reset inventory
      energyCellCount: 0
    });
    // Clear cooldowns
    hostLineCooldowns.clear();
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
  
  // Sentinel and shutdown actions
  setSentinelDefeated: (defeated) => {
    set({ sentinelDefeated: defeated });
    console.log(`Sentinel defeated: ${defeated}`);
  },
  
  setIsShuttingDown: (shuttingDown) => {
    set({ isShuttingDown: shuttingDown });
    console.log(`System shutdown: ${shuttingDown}`);
  },
  
  // Host message actions
  playHostLine: (eventKey, options) => {
    const now = Date.now();
    
    // Check cooldown
    const lastTime = hostLineCooldowns.get(eventKey);
    if (lastTime && now - lastTime < COOLDOWN_DURATION) {
      return; // Still on cooldown
    }
    
    // Update cooldown
    hostLineCooldowns.set(eventKey, now);
    
    // Parse eventKey (e.g., "zoneEntry:zone1" or "hacking:start")
    const [category, subKey] = eventKey.split(':');
    
    // Get lines from hostLines.json
    const hostLines = hostLinesData as Record<string, any>;
    let lines: string[] = [];
    
    if (category === 'zoneEntry' && options?.zoneId) {
      lines = hostLines.zoneEntry?.[options.zoneId] || [];
    } else if (hostLines[category] && subKey) {
      lines = hostLines[category][subKey] || [];
    }
    
    // If no lines found, return early
    if (lines.length === 0) {
      console.warn(`No host lines found for eventKey: ${eventKey}`);
      return;
    }
    
    // Pick a random line
    const randomLine = lines[Math.floor(Math.random() * lines.length)];
    
    // Create message
    const message: HostMessage = {
      id: `host-${now}-${Math.random()}`,
      text: randomLine,
      timestamp: now
    };
    
    // Add message and keep only last MAX_MESSAGES
    set((state) => {
      const newMessages = [...state.hostMessages, message];
      // Keep only the last MAX_MESSAGES
      const trimmedMessages = newMessages.slice(-MAX_MESSAGES);
      return {
        hostMessages: trimmedMessages,
        lastHostEvent: eventKey
      };
    });
    
    console.log(`Host line: ${randomLine}`);
  },
  
  // Inventory actions
  addEnergyCell: (count = 1) => {
    set((state) => ({
      energyCellCount: state.energyCellCount + count
    }));
    console.log(`Added ${count} energy cell(s). Total: ${get().energyCellCount}`);
  },
  
  consumeEnergyCell: (count = 1) => {
    set((state) => ({
      energyCellCount: Math.max(0, state.energyCellCount - count)
    }));
    console.log(`Consumed ${count} energy cell(s). Total: ${get().energyCellCount}`);
  },
  
  resetInventory: () => {
    set({ energyCellCount: 0 });
    console.log('Inventory reset');
  },
}));

