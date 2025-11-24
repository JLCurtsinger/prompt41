// Shared helper function for enemy damage application
// This ensures consistent damage handling across all enemy types

import { useGameState } from '../../state/gameState';

const LOG_PLAYER_DAMAGE = true;
const SPAWN_PROTECTION_MS = 3000;

// Track when player spawns/respawns - set by gameState resetPlayer
let playerSpawnedAt: number | null = null;

/**
 * Set the player spawn time (called by gameState on spawn/respawn)
 */
export function setPlayerSpawnTime(): void {
  playerSpawnedAt = Date.now();
  if (LOG_PLAYER_DAMAGE) {
    console.log('[SPAWN] Player spawn time set:', playerSpawnedAt);
  }
}

/**
 * Apply damage to the player from an enemy source
 * @param amount - Amount of damage to apply
 * @param source - Name of the enemy type (e.g., "Crawler", "Shambler")
 */
export function applyDamageToPlayer(amount: number, source: string) {
  const now = Date.now();
  
  // Defensive guard: if playerSpawnedAt is null, treat as protected
  if (playerSpawnedAt === null) {
    console.warn('[DMG-IGNORED:SPAWN_PROTECTION] playerSpawnedAt is null, blocking damage from', source);
    return;
  }
  
  // Check spawn protection window
  const timeSinceSpawn = now - playerSpawnedAt;
  if (timeSinceSpawn < SPAWN_PROTECTION_MS) {
    if (LOG_PLAYER_DAMAGE) {
      console.log('[DMG-IGNORED:SPAWN_PROTECTION]', { source, timeSinceSpawn });
    }
    return;
  }
  
  const state = useGameState.getState();
  const { applyDamage, playerHealth } = state;
  
  if (LOG_PLAYER_DAMAGE) {
    const healthAfter = Math.max(0, playerHealth - amount);
    console.log('[DMG-APPLY]', { source, timeSinceSpawn });
    console.log(
      `[DMG] amount=${amount}, source=${source ?? 'unknown'}, ` +
      `healthBefore=${playerHealth}, healthAfter=${healthAfter}`
    );
    console.trace('[DMG-STACK]');
  }
  
  applyDamage(amount, source);
}

