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
//
// TEST PLAN (Zone Tracking)
// 1. Initial State:
//    - currentZone should be 'zone1' on game start
// 2. Zone Transitions:
//    - Enter Zone 2 trigger -> currentZone should become 'zone2'
//    - Enter Zone 3 trigger -> currentZone should become 'zone3'
//    - Enter Zone 4 trigger -> currentZone should become 'zone4'
// 3. Reset Player:
//    - Call resetPlayer() -> currentZone should reset to 'zone1'
//    - Verify zone label shows Zone 1 after respawn
// 4. Zone Label Display:
//    - When currentZone changes, ZoneLabel should fade in, display, then fade out
//    - Verify timing: fade in ~0.3s, visible ~2.5s, fade out ~0.7s
//
// TEST PLAN (Audio State)
// 1. Initial State:
//    - audioVolume should be 0.7 on game start
//    - audioMuted should be false on game start
// 2. Volume Control:
//    - Call setAudioVolume(0.5) -> audioVolume should become 0.5
//    - Call setAudioVolume(1.5) -> audioVolume should clamp to 1.0
//    - Call setAudioVolume(-0.5) -> audioVolume should clamp to 0.0
//    - Verify AudioManager receives volume updates
// 3. Mute Toggle:
//    - Call toggleAudioMuted() -> audioMuted should become true
//    - Call toggleAudioMuted() again -> audioMuted should become false
//    - Verify AudioManager receives mute updates
// 4. Reset Player:
//    - Set audioVolume to 0.3 and audioMuted to true
//    - Call resetPlayer() -> audioVolume and audioMuted should remain unchanged (user preferences)
//
// TEST PLAN (Interaction Prompt State)
// 1. Initial State:
//    - interactionPrompt.message should be null on game start
//    - interactionPrompt.actionKey should be null
//    - interactionPrompt.sourceId should be null
// 2. Show Prompt:
//    - Call showInteractionPrompt({ message: '[ E ] Hack terminal', sourceId: 'terminal-1' })
//    - interactionPrompt.message should become '[ E ] Hack terminal'
//    - interactionPrompt.actionKey should default to 'E'
//    - interactionPrompt.sourceId should become 'terminal-1'
// 3. Clear Prompt:
//    - Call clearInteractionPrompt() -> all prompt fields should become null
//    - Call clearInteractionPrompt('terminal-1') with matching sourceId -> prompt should clear
//    - Call clearInteractionPrompt('terminal-2') with non-matching sourceId -> prompt should NOT clear
// 4. Reset Player:
//    - Set a prompt, then call resetPlayer() -> prompt should be cleared

import React from 'react';
import { create } from 'zustand';
import hostLinesData from '../assets/data/hostLines.json';
import { AudioManager } from '../game/audio/AudioManager';
import type { BatonSFXHandle } from '../game/audio/BatonSFX';
import { setPlayerSpawnTime, SPAWN_PROTECTION_MS } from '../game/Enemies/enemyDamage';

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
  playerInvulnerableUntil: number | null;
  
  // Door and terminal state
  doorStates: Record<string, 'closed' | 'open'>;
  terminalStates: Record<string, 'locked' | 'hacked'>;
  
  // Game pause state (for hacking overlay, etc.)
  isPaused: boolean;
  
  // Sentinel and shutdown state
  sentinelDefeated: boolean;
  isShuttingDown: boolean;
  hasCompletedLevel: boolean;
  isEnding: boolean;
  
  // Enemy kill tracking
  enemiesKilled: number;
  totalEnemiesForLevelStart: number;
  
  // Host message bus
  hostMessages: HostMessage[];
  lastHostEvent: string | null;
  lowHealthTriggered: boolean; // Track if low health line has been triggered
  
  // Inventory state
  energyCellCount: number;
  
  // Zone tracking
  currentZone: 'zone1' | 'zone2' | 'zone3' | 'zone4';
  
  // Audio state
  audioVolume: number;
  audioMuted: boolean;
  
  // Interaction prompt state
  interactionPrompt: {
    message: string | null;
    actionKey?: string | null;
    sourceId?: string | null;
  };
  
  // Hacking overlay state
  hackingOverlay: {
    isOpen: boolean;
    terminalId: string | null;
    mode: 'normal' | 'locked' | 'alreadyHacked' | 'success';
  };
  
  // Zone 2 -> Zone 3 door unlock flag
  hasZone2DoorUnlocked: boolean;
  
  // Current target enemy for HUD display
  currentTargetEnemyId: string | null;
  currentTargetEnemyName: string | null;
  currentTargetEnemyHealth: number | null;
  currentTargetEnemyMaxHealth: number | null;
  
  // Baton SFX ref
  batonSfxRef?: React.RefObject<BatonSFXHandle | null>;
  
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
  completeLevel: () => void;
  setEnding: (ending: boolean) => void;
  
  // Host message actions
  playHostLine: (eventKey: string, options?: { zoneId?: string }) => void;
  
  // Inventory actions
  addEnergyCell: (count?: number) => void;
  consumeEnergyCell: (count?: number) => void;
  resetInventory: () => void;
  
  // Zone actions
  setCurrentZone: (zone: 'zone1' | 'zone2' | 'zone3' | 'zone4') => void;
  
  // Audio actions
  setAudioVolume: (volume: number) => void;
  toggleAudioMuted: () => void;
  
  // Interaction prompt actions
  showInteractionPrompt: (payload: { message: string; actionKey?: string; sourceId?: string }) => void;
  clearInteractionPrompt: (sourceId?: string) => void;
  
  // Hacking overlay actions
  openHackingOverlay: (terminalId: string, mode: 'normal' | 'locked' | 'alreadyHacked' | 'success') => void;
  setHackingOverlayMode: (mode: 'normal' | 'locked' | 'alreadyHacked' | 'success') => void;
  closeHackingOverlay: () => void;
  
  // Zone 2 door unlock action
  unlockZone2Door: () => void;
  
  // Target enemy actions
  setCurrentTargetEnemy: (enemyId: string | null, enemyName: string | null, health: number | null, maxHealth: number | null) => void;
  
  // Enemy kill tracking
  incrementEnemiesKilled: () => void;
  checkWinCondition: () => boolean;
  setTotalEnemiesForLevelStart: (count: number) => void;
  
  // Baton SFX actions
  setBatonSfxRef: (ref: React.RefObject<BatonSFXHandle | null>) => void;
  
  // Invulnerability actions
  setPlayerInvulnerableFor: (milliseconds: number) => void;
  clearPlayerInvulnerability: () => void;
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

export const useGameState = create<GameState>((set, get) => {
  // NOTE: Do not set spawn time here - it will be set when resetPlayer() is called
  // This ensures spawn protection starts at the actual spawn/reset moment, not store creation
  
  return {
  // Initial state
  playerHealth: 100,
  playerMaxHealth: 100,
  isSwinging: false,
  recentlyHit: false,
  isDead: false,
  playerInvulnerableUntil: null,
  
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
  hasCompletedLevel: false,
  isEnding: false,
  
  // Enemy kill tracking initial state
  enemiesKilled: 0,
  totalEnemiesForLevelStart: 0,
  
  // Host message bus initial state
  hostMessages: [],
  lastHostEvent: null,
  lowHealthTriggered: false,
  
  // Inventory initial state
  energyCellCount: 0,
  
  // Zone initial state
  currentZone: 'zone1',
  
  // Audio initial state
  audioVolume: 0.7,
  audioMuted: false,
  
  // Interaction prompt initial state
  interactionPrompt: {
    message: null,
    actionKey: null,
    sourceId: null,
  },
  
  // Hacking overlay initial state
  hackingOverlay: {
    isOpen: false,
    terminalId: null,
    mode: 'normal',
  },
  
  // Zone 2 door unlock initial state
  hasZone2DoorUnlocked: false,
  
  // Current target enemy initial state
  currentTargetEnemyId: null,
  currentTargetEnemyName: null,
  currentTargetEnemyHealth: null,
  currentTargetEnemyMaxHealth: null,
  
  // Baton SFX ref initial state
  batonSfxRef: undefined,
  
  // Actions
  setPlayerHealth: (health) => set({ playerHealth: health }),
  setIsSwinging: (swinging) => set({ isSwinging: swinging }),
  resetCombatState: () => set({ isSwinging: false }),
  
  applyDamage: (amount, source = 'unknown') => {
    const state = get();
    const now = Date.now();
    
    // Ignore damage if player is already dead or at 0 HP
    if (state.isDead || state.playerHealth <= 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DMG-IGNORED:ALREADY_DEAD]', {
          source,
          health: state.playerHealth,
          isDead: state.isDead,
        });
      }
      return;
    }
    
    // Existing invulnerability window check
    if (state.playerInvulnerableUntil && now < state.playerInvulnerableUntil) {
      // TEMP: ignore all damage during spawn invulnerability window
      return;
    }
    
    const currentHealth = state.playerHealth;
    const maxHealth = state.playerMaxHealth;
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
    
    // Play hit player SFX
    AudioManager.playSFX('hitPlayer');
    
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
    const now = Date.now();
    console.log('[RESET-PLAYER]', { now });
    
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
      hasCompletedLevel: false,
      isEnding: false,
      // Reset enemy kills
      enemiesKilled: 0,
      totalEnemiesForLevelStart: 0,
      isPaused: false,
      // Reset host messages
      hostMessages: [],
      lastHostEvent: null,
      lowHealthTriggered: false,
      // Reset inventory
      energyCellCount: 0,
      // Reset zone
      currentZone: 'zone1',
      // Clear interaction prompt
      interactionPrompt: {
        message: null,
        actionKey: null,
        sourceId: null,
      },
      // Close hacking overlay
      hackingOverlay: {
        isOpen: false,
        terminalId: null,
        mode: 'normal',
      },
      // Reset Zone 2 door unlock
      hasZone2DoorUnlocked: false,
      // Reset target enemy
      currentTargetEnemyId: null,
      currentTargetEnemyName: null,
      currentTargetEnemyHealth: null,
      currentTargetEnemyMaxHealth: null,
    });
    // Clear cooldowns
    hostLineCooldowns.clear();
    
    // Align spawn protection: use a single timestamp for both mechanisms
    setPlayerSpawnTime(now);
    // Set invulnerability using the same timestamp and duration constant
    set({
      playerInvulnerableUntil: now + SPAWN_PROTECTION_MS,
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
  
  // Sentinel and shutdown actions
  setSentinelDefeated: (defeated) => {
    set({ sentinelDefeated: defeated });
    console.log(`Sentinel defeated: ${defeated}`);
  },
  
  setIsShuttingDown: (shuttingDown) => {
    set({ isShuttingDown: shuttingDown });
    console.log(`System shutdown: ${shuttingDown}`);
  },
  
  completeLevel: () => {
    set({ 
      hasCompletedLevel: true,
      isEnding: true 
    });
    console.log('Level completed');
  },
  
  setEnding: (ending) => {
    set({ isEnding: ending });
  },
  
  // Host message actions
  playHostLine: (eventKey, options) => {
    // Defensive check: if eventKey is missing or invalid, return early
    if (!eventKey || typeof eventKey !== 'string') {
      console.warn('playHostLine: Invalid eventKey provided');
      return;
    }
    
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
    
    // Defensive check: ensure category exists
    if (!category) {
      console.warn(`playHostLine: Invalid eventKey format: ${eventKey}`);
      return;
    }
    
    // Get lines from hostLines.json with defensive checks
    const hostLines = hostLinesData as Record<string, any>;
    if (!hostLines || typeof hostLines !== 'object') {
      console.warn('playHostLine: hostLines data is invalid');
      return;
    }
    
    let lines: string[] = [];
    
    try {
      if (category === 'zoneEntry' && options?.zoneId) {
        // Defensive check: ensure zoneEntry exists and zoneId is valid
        if (hostLines.zoneEntry && typeof hostLines.zoneEntry === 'object') {
          const zoneId = options.zoneId;
          if (zoneId && typeof zoneId === 'string' && hostLines.zoneEntry[zoneId]) {
            lines = Array.isArray(hostLines.zoneEntry[zoneId]) 
              ? hostLines.zoneEntry[zoneId] 
              : [];
          }
        }
      } else if (hostLines[category] && subKey) {
        // Defensive check: ensure category and subKey exist
        const categoryData = hostLines[category];
        if (categoryData && typeof categoryData === 'object' && categoryData[subKey]) {
          lines = Array.isArray(categoryData[subKey]) 
            ? categoryData[subKey] 
            : [];
        }
      }
    } catch (error) {
      console.warn(`playHostLine: Error accessing hostLines data for ${eventKey}:`, error);
      return;
    }
    
    // If no lines found, return early (don't crash)
    if (!lines || lines.length === 0) {
      console.warn(`No host lines found for eventKey: ${eventKey}`);
      return;
    }
    
    // Pick a random line with defensive check
    const randomIndex = Math.floor(Math.random() * lines.length);
    const randomLine = lines[randomIndex];
    
    // Defensive check: ensure randomLine is valid
    if (!randomLine || typeof randomLine !== 'string') {
      console.warn(`playHostLine: Invalid line data for ${eventKey}`);
      return;
    }
    
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
  
  // Zone actions
  setCurrentZone: (zone) => {
    set({ currentZone: zone });
    console.log(`Zone changed to: ${zone}`);
  },
  
  // Audio actions
  setAudioVolume: (volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    set({ audioVolume: clampedVolume });
    console.log(`Audio volume set to: ${clampedVolume}`);
  },
  
  toggleAudioMuted: () => {
    set((state) => {
      const newMuted = !state.audioMuted;
      console.log(`Audio muted: ${newMuted}`);
      return { audioMuted: newMuted };
    });
  },
  
  // Interaction prompt actions
  showInteractionPrompt: (payload) => {
    set({
      interactionPrompt: {
        message: payload.message,
        actionKey: payload.actionKey || 'E',
        sourceId: payload.sourceId || null,
      },
    });
  },
  
  clearInteractionPrompt: (sourceId) => {
    set((state) => {
      // If sourceId is provided, only clear if it matches
      if (sourceId && state.interactionPrompt.sourceId !== sourceId) {
        return state; // Don't clear if source doesn't match
      }
      return {
        interactionPrompt: {
          message: null,
          actionKey: null,
          sourceId: null,
        },
      };
    });
  },
  
  // Hacking overlay actions
  openHackingOverlay: (terminalId, mode) => {
    set({
      hackingOverlay: {
        isOpen: true,
        terminalId,
        mode,
      },
      isPaused: true,
    });
  },
  
  setHackingOverlayMode: (mode) => {
    set((state) => ({
      hackingOverlay: {
        ...state.hackingOverlay,
        mode,
      },
    }));
  },
  
  closeHackingOverlay: () => {
    set({
      hackingOverlay: {
        isOpen: false,
        terminalId: null,
        mode: 'normal',
      },
      isPaused: false,
    });
  },
  
  // Zone 2 door unlock action
  unlockZone2Door: () => {
    set({ hasZone2DoorUnlocked: true });
    console.log('Zone 2 -> Zone 3 door unlocked');
  },
  
  // Target enemy actions
  setCurrentTargetEnemy: (enemyId, enemyName, health, maxHealth) => {
    set({
      currentTargetEnemyId: enemyId,
      currentTargetEnemyName: enemyName,
      currentTargetEnemyHealth: health,
      currentTargetEnemyMaxHealth: maxHealth,
    });
  },
  
  // Enemy kill tracking
  incrementEnemiesKilled: () => {
    set((state) => {
      const newCount = state.enemiesKilled + 1;
      console.log(`[Game] Enemy killed. Total: ${newCount}`);
      return { enemiesKilled: newCount };
    });
  },
  
  // Win condition check: all active enemies killed
  checkWinCondition: () => {
    const state = get();
    // Dynamic win condition: check if all enemies at level start are killed
    const hasWon = state.totalEnemiesForLevelStart > 0 && 
                   state.enemiesKilled >= state.totalEnemiesForLevelStart;
    if (hasWon && !state.hasCompletedLevel) {
      set({ hasCompletedLevel: true, isEnding: true });
      console.log(`[Game] Win condition met! Killed ${state.enemiesKilled}/${state.totalEnemiesForLevelStart} enemies`);
    }
    return hasWon;
  },
  
  setTotalEnemiesForLevelStart: (count) => {
    set({ totalEnemiesForLevelStart: count });
    console.log(`[Game] Total enemies for level start set to: ${count}`);
  },
  
  // Baton SFX actions
  setBatonSfxRef: (ref) => set({ batonSfxRef: ref }),
  
  // Invulnerability actions
  setPlayerInvulnerableFor: (milliseconds) =>
    set({
      playerInvulnerableUntil: Date.now() + milliseconds,
    }),
  clearPlayerInvulnerability: () =>
    set({
      playerInvulnerableUntil: null,
    }),
  };
});

