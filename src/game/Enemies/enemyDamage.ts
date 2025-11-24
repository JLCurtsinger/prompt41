// Shared helper function for enemy damage application
// This ensures consistent damage handling across all enemy types

import { useGameState } from '../../state/gameState';

const DAMAGE_DEBUG = true;

/**
 * Apply damage to the player from an enemy source
 * @param amount - Amount of damage to apply
 * @param source - Name of the enemy type (e.g., "Crawler", "Shambler")
 */
export function applyDamageToPlayer(amount: number, source: string) {
  const state = useGameState.getState();
  const { applyDamage, playerHealth } = state;
  
  // Try to get playerPosition from state if available (may not exist)
  const playerPosition = (state as any).playerPosition;
  
  if (DAMAGE_DEBUG) {
    console.warn('[PLAYER DAMAGE]', {
      amount,
      source,
      time: performance.now(),
      playerHealth,
      playerPosition,
    });
  }
  
  applyDamage(amount, source);
}

