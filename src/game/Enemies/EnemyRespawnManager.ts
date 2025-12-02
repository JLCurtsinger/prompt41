// Enemy Respawn Manager - handles per-zone enemy respawning
// Tracks active enemies per zone and schedules respawns when enemies die

import { getAllEnemies } from './enemyRegistry';

export type EnemyType = 'crawler' | 'drone' | 'shambler';

export interface ZoneRespawnConfig {
  zoneId: 'zone2' | 'zone3' | 'zone4';
  maxEnemies: number;
  respawnDelayMs: number;
  spawnPositions: [number, number, number][];
  enemyTypes: Array<{ type: EnemyType; weight: number }>; // Weight for random selection
}

export interface PendingRespawn {
  zoneId: string;
  enemyType: EnemyType;
  spawnPosition: [number, number, number];
  scheduledTime: number;
}

// Zone configurations
const ZONE_CONFIGS: ZoneRespawnConfig[] = [
  {
    zoneId: 'zone2',
    maxEnemies: 3,
    respawnDelayMs: 8000, // 8 seconds
    spawnPositions: [
      [-3, 0, 2],
      [3, 0, -2],
      [-2, 0, -3],
    ],
    enemyTypes: [
      { type: 'crawler', weight: 2 },
      { type: 'drone', weight: 1 },
    ],
  },
  {
    zoneId: 'zone3',
    maxEnemies: 2,
    respawnDelayMs: 10000, // 10 seconds
    spawnPositions: [
      [18, 1.4, 0],
      [22, 1.4, -2],
    ],
    enemyTypes: [
      { type: 'shambler', weight: 1 },
      { type: 'crawler', weight: 1 },
    ],
  },
  {
    zoneId: 'zone4',
    maxEnemies: 2,
    respawnDelayMs: 12000, // 12 seconds
    spawnPositions: [
      [42, 0, 3],
      [48, 0, -3],
    ],
    enemyTypes: [
      { type: 'crawler', weight: 1 },
      { type: 'drone', weight: 1 },
    ],
  },
];

class EnemyRespawnManager {
  private pendingRespawns: PendingRespawn[] = [];
  private zoneConfigs: Map<string, ZoneRespawnConfig>;
  private activeEnemiesByZone: Map<string, Set<string>>; // zoneId -> Set<enemyId>
  private nextEnemyIdCounter: Map<string, number>; // zoneId -> counter

  constructor() {
    this.zoneConfigs = new Map();
    ZONE_CONFIGS.forEach((config) => {
      this.zoneConfigs.set(config.zoneId, config);
    });
    
    this.activeEnemiesByZone = new Map();
    this.nextEnemyIdCounter = new Map();
    
    // Initialize counters
    ZONE_CONFIGS.forEach((config) => {
      this.activeEnemiesByZone.set(config.zoneId, new Set());
      this.nextEnemyIdCounter.set(config.zoneId, 0);
    });
  }

  // Count active enemies in a zone
  private countActiveEnemiesInZone(zoneId: string): number {
    const allEnemies = getAllEnemies();
    const zoneEnemies = this.activeEnemiesByZone.get(zoneId) || new Set();
    
    // Filter to only count enemies that are actually active
    let count = 0;
    zoneEnemies.forEach((enemyId) => {
      const enemy = allEnemies.find((e) => e.id === enemyId);
      if (enemy && !enemy.isDead()) {
        count++;
      }
    });
    
    return count;
  }

  // Register an enemy as active in a zone
  registerEnemy(zoneId: string, enemyId: string): void {
    console.log(`[RespawnManager] registerEnemy called - zoneId: ${zoneId}, enemyId: ${enemyId}, stack:`, new Error().stack);
    
    const zoneSet = this.activeEnemiesByZone.get(zoneId);
    if (zoneSet) {
      if (zoneSet.has(enemyId)) {
        console.warn(`[RespawnManager] WARNING: Enemy ${enemyId} is already registered in zone ${zoneId}! This may indicate a duplicate spawn.`);
      }
      zoneSet.add(enemyId);
      console.log(`[RespawnManager] Added ${enemyId} to zone ${zoneId}. Total in zone:`, Array.from(zoneSet));
    } else {
      console.warn(`[RespawnManager] WARNING: No zone set found for zoneId ${zoneId}`);
    }
  }

  // Unregister an enemy (called on death)
  unregisterEnemy(zoneId: string, enemyId: string): void {
    console.log(`[RespawnManager] unregisterEnemy called - zoneId: ${zoneId}, enemyId: ${enemyId}, stack:`, new Error().stack);
    
    const zoneSet = this.activeEnemiesByZone.get(zoneId);
    if (zoneSet) {
      zoneSet.delete(enemyId);
      console.log(`[RespawnManager] Removed ${enemyId} from zone ${zoneId}. Remaining in zone:`, Array.from(zoneSet));
    }

    // Schedule respawn
    const config = this.zoneConfigs.get(zoneId);
    if (!config) {
      console.log(`[RespawnManager] No config found for zone ${zoneId}, skipping respawn`);
      return;
    }

    const activeCount = this.countActiveEnemiesInZone(zoneId);
    console.log(`[RespawnManager] Active enemies in ${zoneId}: ${activeCount}/${config.maxEnemies}`);
    
    if (activeCount >= config.maxEnemies) {
      // Already at max, don't schedule respawn
      console.log(`[RespawnManager] Zone ${zoneId} already at max enemies (${activeCount}), skipping respawn`);
      return;
    }

    // Select random spawn position
    const spawnPos = config.spawnPositions[
      Math.floor(Math.random() * config.spawnPositions.length)
    ];

    // Select enemy type based on weights
    const totalWeight = config.enemyTypes.reduce((sum, et) => sum + et.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType: EnemyType = config.enemyTypes[0].type;
    for (const et of config.enemyTypes) {
      random -= et.weight;
      if (random <= 0) {
        selectedType = et.type;
        break;
      }
    }

    // Schedule respawn
    const scheduledTime = Date.now() + config.respawnDelayMs;
    this.pendingRespawns.push({
      zoneId,
      enemyType: selectedType,
      spawnPosition: spawnPos,
      scheduledTime,
    });

    console.log(
      `[RespawnManager] Scheduled ${selectedType} respawn in ${zoneId} at position [${spawnPos.join(', ')}] in ${config.respawnDelayMs}ms`
    );
  }

  // Get pending respawns that are ready to spawn
  getReadyRespawns(): PendingRespawn[] {
    const now = Date.now();
    const ready: PendingRespawn[] = [];
    const remaining: PendingRespawn[] = [];

    this.pendingRespawns.forEach((respawn) => {
      if (now >= respawn.scheduledTime) {
        // Check if zone is still under max
        const config = this.zoneConfigs.get(respawn.zoneId);
        if (config) {
          const activeCount = this.countActiveEnemiesInZone(respawn.zoneId);
          if (activeCount < config.maxEnemies) {
            ready.push(respawn);
          } else {
            // Reschedule for later
            respawn.scheduledTime = now + 2000; // Check again in 2 seconds
            remaining.push(respawn);
          }
        }
      } else {
        remaining.push(respawn);
      }
    });

    this.pendingRespawns = remaining;
    return ready;
  }

  // Generate unique enemy ID for a zone
  generateEnemyId(zoneId: string, enemyType: EnemyType): string {
    const counter = this.nextEnemyIdCounter.get(zoneId) || 0;
    this.nextEnemyIdCounter.set(zoneId, counter + 1);
    return `${enemyType}-${zoneId}-${counter}`;
  }

  // Get spawn configuration for a zone
  getZoneConfig(zoneId: string): ZoneRespawnConfig | undefined {
    return this.zoneConfigs.get(zoneId);
  }

  // Reset all state (for game reset)
  reset(): void {
    this.pendingRespawns = [];
    this.activeEnemiesByZone.forEach((set) => set.clear());
    this.nextEnemyIdCounter.forEach((_, zoneId) => {
      this.nextEnemyIdCounter.set(zoneId, 0);
    });
  }
}

// Singleton instance
export const enemyRespawnManager = new EnemyRespawnManager();

