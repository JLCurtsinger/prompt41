// Shared helper function for enemy damage application
// This ensures consistent damage handling across all enemy types

import { useGameState } from '../../state/gameState';

/**
 * Apply damage to the player from an enemy source
 * @param amount - Amount of damage to apply
 * @param source - Name of the enemy type (e.g., "Crawler", "Shambler")
 */
export function applyDamageToPlayer(amount: number, source: string) {
  const { applyDamage } = useGameState.getState();
  applyDamage(amount, source);
}

