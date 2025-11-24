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
  enemies.set(id, instance);
}

export function unregisterEnemy(id: string) {
  enemies.delete(id);
}

export function getEnemiesInRange(
  center: THREE.Vector3,
  maxDistance: number
): EnemyInstance[] {
  const results: EnemyInstance[] = [];
  
  enemies.forEach((enemy) => {
    if (enemy.isDead()) return; // Skip dead enemies
    if (enemy.isActive && !enemy.isActive()) return; // Skip inactive enemies
    
    const enemyPos = enemy.getPosition();
    const distance = enemyPos.distanceTo(center);
    if (distance <= maxDistance) {
      results.push(enemy);
    }
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

