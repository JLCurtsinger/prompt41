// Simple enemy registry for hit detection
// Enemies register on mount and unregister on unmount
// Player queries this registry to find nearby enemies for damage

import * as THREE from 'three';

export interface EnemyInstance {
  id: string;
  getPosition: () => THREE.Vector3; // Use getter function to get current position
  takeDamage: (amount: number) => void;
  isDead: () => boolean;
  isActive?: () => boolean; // Optional getter to check if enemy is active/visible
  getHealth?: () => number; // Optional getter for current health
  getMaxHealth?: () => number; // Optional getter for max health
  getEnemyName?: () => string; // Optional getter for enemy name/type
}

const enemies = new Map<string, EnemyInstance>();

export function registerEnemy(id: string, instance: EnemyInstance) {
  if (enemies.has(id)) {
    console.warn(`[enemyRegistry] WARNING: Enemy ${id} is already registered! This will overwrite the previous registration. Stack:`, new Error().stack);
  }
  console.log(`[enemyRegistry] Registering enemy ${id}. Total enemies: ${enemies.size + (enemies.has(id) ? 0 : 1)}`);
  enemies.set(id, instance);
}

export function unregisterEnemy(id: string) {
  const existed = enemies.has(id);
  enemies.delete(id);
  if (existed) {
    console.log(`[enemyRegistry] Unregistered enemy ${id}. Remaining enemies: ${enemies.size}`);
  } else {
    console.warn(`[enemyRegistry] WARNING: Attempted to unregister enemy ${id} that was not registered.`);
  }
}

export function getEnemiesInRange(
  center: THREE.Vector3,
  maxDistance: number
): EnemyInstance[] {
  const results: EnemyInstance[] = [];
  const maxDistanceSq = maxDistance * maxDistance;
  
  enemies.forEach((enemy) => {
    if (enemy.isDead()) return; // Skip dead enemies
    if (enemy.isActive && !enemy.isActive()) return; // Skip inactive enemies
    
    const enemyPos = enemy.getPosition();
    // Use squared distance to avoid Math.sqrt
    const dx = enemyPos.x - center.x;
    const dy = enemyPos.y - center.y;
    const dz = enemyPos.z - center.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq <= maxDistanceSq) {
      results.push(enemy);
    }
  });
  
  // Sort by squared distance (nearest first)
  results.sort((a, b) => {
    const aPos = a.getPosition();
    const bPos = b.getPosition();
    const aDx = aPos.x - center.x;
    const aDy = aPos.y - center.y;
    const aDz = aPos.z - center.z;
    const aDistSq = aDx * aDx + aDy * aDy + aDz * aDz;
    
    const bDx = bPos.x - center.x;
    const bDy = bPos.y - center.y;
    const bDz = bPos.z - center.z;
    const bDistSq = bDx * bDx + bDy * bDy + bDz * bDz;
    
    return aDistSq - bDistSq;
  });
  
  return results;
}

export function getAllEnemies(): EnemyInstance[] {
  return Array.from(enemies.values()).filter((e) => {
    if (e.isDead()) return false;
    if (e.isActive && !e.isActive()) return false; // Filter out inactive enemies
    return true;
  });
}

// Debug function to get all registered enemy IDs (including dead ones)
export function getAllEnemyIds(): string[] {
  return Array.from(enemies.keys());
}

// Check if an enemy with a given ID exists (for debugging)
export function hasEnemy(id: string): boolean {
  return enemies.has(id);
}

