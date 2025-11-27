// TEST PLAN (AudioManager)
// 1. Initialization:
//    - AudioManager should initialize on first use
//    - Global ambient loop should start playing when game is running and player is alive
//    - Volume should respect gameState.audioVolume and audioMuted
// 2. Ambient Loops:
//    - Global ambient (low industrial hum) should play continuously when player is alive
//    - Should fade in over ~0.8-1.0 seconds on start
//    - Should fade out when player dies
// 3. Zone Ambient Layers:
//    - Enter Zone 1 -> only global ambient plays
//    - Enter Zone 2 -> zone2 layer fades in over ~0.8-1.0 seconds
//    - Enter Zone 3 -> zone2 fades out, zone3 fades in
//    - Enter Zone 4 -> zone3 fades out, zone4 fades in
//    - Transitions should be smooth (no pops)
// 4. SFX Triggers:
//    - Call playSFX('hitPlayer') when player takes damage -> should play hit sound
//    - Call playSFX('enemyDeath') when Sentinel dies -> should play death sound
//    - Call playSFX('hackingStart') when terminal overlay opens -> should play start sound
//    - Call playSFX('hackingSuccess') when terminal is hacked -> should play success sound
//    - Call playSFX('shutdownStart') when final terminal is hacked -> should play shutdown sound
//    - Call playSFX('pickupEnergyCell') when energy cell is picked up -> should play pickup sound
// 5. Volume Control:
//    - Change audioVolume in gameState -> all sounds should respect new volume
//    - Toggle audioMuted -> all sounds should mute/unmute
//    - Volume changes should apply immediately
// 6. Error Handling:
//    - If a sound file fails to load, should log warning but not throw error
//    - Game should continue running even if audio fails

type ZoneId = 'zone1' | 'zone2' | 'zone3' | 'zone4';
type SFXType = 'hitPlayer' | 'enemyDeath' | 'hackingStart' | 'hackingSuccess' | 'hackingFail' | 'pickupEnergyCell' | 'pickupSourceCode' | 'shutdownStart' | 'footstep' | 'gameOver';

interface AmbientLayer {
  audio: HTMLAudioElement;
  targetVolume: number;
  currentVolume: number;
  isActive: boolean;
}

class AudioManagerClass {
  private globalAmbient: HTMLAudioElement | null = null;
  private zoneLayers: Map<ZoneId, AmbientLayer> = new Map();
  private sfxCache: Map<SFXType, HTMLAudioElement> = new Map();
  private currentZone: ZoneId = 'zone1';
  private isPlayerAlive: boolean = true;
  private volume: number = 0.7;
  private muted: boolean = false;
  private fadeAnimationFrame: number | null = null;
  private isInitialized: boolean = false;
  
  // Hacking loop audio element (plays during mini-game)
  private hackingLoop: HTMLAudioElement | null = null;
  private isHackingLoopPlaying: boolean = false;

  // TODO: Replace with final asset paths
  private readonly AMBIENT_GLOBAL_PATH = '/audio/ambient_global_loop.ogg'; // Low industrial hum
  private readonly AMBIENT_ZONE2_PATH = '/audio/ambient_zone2_machinery.ogg'; // Low machinery
  private readonly AMBIENT_ZONE3_PATH = '/audio/ambient_zone3_conduit.ogg'; // Conduit buzz
  private readonly AMBIENT_ZONE4_PATH = '/audio/ambient_zone4_core.ogg'; // Core pulse
  private readonly SFX_HIT_PLAYER_PATH = '/audio/sfx_hit_player.ogg';
  private readonly SFX_ENEMY_DEATH_PATH = '/audio/sfx_enemy_death.ogg';
  private readonly SFX_HACKING_START_PATH = '/audio/sfx_hacking_start.ogg';
  private readonly SFX_HACKING_SUCCESS_PATH = '/audio/sfx_hacking_success.ogg';
  private readonly SFX_HACKING_FAIL_PATH = '/audio/sfx_hacking_fail.ogg';
  private readonly SFX_HACKING_LOOP_PATH = '/audio/sfx_hacking_loop.ogg';
  private readonly SFX_PICKUP_ENERGY_CELL_PATH = '/audio/sfx_pickup_energy_cell.ogg';
  private readonly SFX_PICKUP_SOURCE_CODE_PATH = '/audio/sfx_pickup_source_code.ogg';
  private readonly SFX_SHUTDOWN_START_PATH = '/audio/sfx_shutdown_start.ogg';
  private readonly SFX_FOOTSTEP_PATH = '/audio/sfx_footstep.ogg';
  private readonly SFX_GAME_OVER_PATH = '/audio/game-over.ogg';

  private readonly FADE_DURATION = 0.9; // seconds

  /**
   * Initialize the audio manager (called once on game start)
   */
  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Create global ambient loop
    this.globalAmbient = this.createAudio(this.AMBIENT_GLOBAL_PATH, true);
    if (this.globalAmbient) {
      this.globalAmbient.loop = true;
      this.globalAmbient.volume = 0;
      this.globalAmbient.play().catch((err) => {
        console.warn('AudioManager: Failed to play global ambient:', err);
      });
    }

    // Create zone ambient layers (but don't play them yet)
    const zone2Layer = this.createZoneLayer('zone2', this.AMBIENT_ZONE2_PATH);
    const zone3Layer = this.createZoneLayer('zone3', this.AMBIENT_ZONE3_PATH);
    const zone4Layer = this.createZoneLayer('zone4', this.AMBIENT_ZONE4_PATH);

    if (zone2Layer) this.zoneLayers.set('zone2', zone2Layer);
    if (zone3Layer) this.zoneLayers.set('zone3', zone3Layer);
    if (zone4Layer) this.zoneLayers.set('zone4', zone4Layer);

    // Preload SFX (but don't play)
    this.preloadSFX();

    // Start fade-in for global ambient
    this.fadeInGlobalAmbient();
  }

  /**
   * Create an audio element with error handling
   */
  private createAudio(path: string, preload: boolean = false): HTMLAudioElement | null {
    try {
      const audio = new Audio(path);
      audio.preload = preload ? 'auto' : 'none';
      audio.volume = 0;
      
      audio.addEventListener('error', () => {
        console.warn(`AudioManager: Failed to load audio file: ${path}`);
      });

      return audio;
    } catch (err) {
      console.warn(`AudioManager: Error creating audio for ${path}:`, err);
      return null;
    }
  }

  /**
   * Create a zone ambient layer
   */
  private createZoneLayer(_zoneId: ZoneId, path: string): AmbientLayer | null {
    const audio = this.createAudio(path, true);
    if (!audio) return null;

    audio.loop = true;
    audio.volume = 0;

    return {
      audio,
      targetVolume: 0,
      currentVolume: 0,
      isActive: false,
    };
  }

  /**
   * Preload SFX files
   */
  private preloadSFX(): void {
    const sfxMap: Record<SFXType, string> = {
      hitPlayer: this.SFX_HIT_PLAYER_PATH,
      enemyDeath: this.SFX_ENEMY_DEATH_PATH,
      hackingStart: this.SFX_HACKING_START_PATH,
      hackingSuccess: this.SFX_HACKING_SUCCESS_PATH,
      hackingFail: this.SFX_HACKING_FAIL_PATH,
      pickupEnergyCell: this.SFX_PICKUP_ENERGY_CELL_PATH,
      pickupSourceCode: this.SFX_PICKUP_SOURCE_CODE_PATH,
      shutdownStart: this.SFX_SHUTDOWN_START_PATH,
      footstep: this.SFX_FOOTSTEP_PATH,
      gameOver: this.SFX_GAME_OVER_PATH,
    };

    for (const [type, path] of Object.entries(sfxMap)) {
      const audio = this.createAudio(path, true);
      if (audio) {
        this.sfxCache.set(type as SFXType, audio);
      }
    }
    
    // Create hacking loop (separate from SFX cache as it loops)
    this.hackingLoop = this.createAudio(this.SFX_HACKING_LOOP_PATH, true);
    if (this.hackingLoop) {
      this.hackingLoop.loop = true;
      this.hackingLoop.volume = 0;
    }
  }

  /**
   * Fade in global ambient on game start
   */
  private fadeInGlobalAmbient(): void {
    if (!this.globalAmbient || !this.isPlayerAlive) return;

    const targetVolume = this.muted ? 0 : this.volume * 0.4; // Global ambient at 40% of master volume
    this.fadeToVolume(this.globalAmbient, 0, targetVolume, this.FADE_DURATION);
  }

  /**
   * Fade audio element to target volume over duration
   */
  private fadeToVolume(
    audio: HTMLAudioElement,
    startVolume: number,
    targetVolume: number,
    duration: number
  ): void {
    if (!audio) return;

    const startTime = performance.now();
    const volumeDelta = targetVolume - startVolume;

    const fade = () => {
      const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds
      const progress = Math.min(1, elapsed / duration);
      
      // Use ease-in-out curve for smoother fade
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const currentVolume = startVolume + (volumeDelta * easedProgress);
      audio.volume = Math.max(0, Math.min(1, currentVolume));

      if (progress < 1) {
        this.fadeAnimationFrame = requestAnimationFrame(fade);
      } else {
        audio.volume = targetVolume; // Ensure exact target
      }
    };

    fade();
  }

  /**
   * Update zone ambient layers based on current zone
   */
  setZone(zone: ZoneId): void {
    if (this.currentZone === zone) return;
    
    const previousZone = this.currentZone;
    this.currentZone = zone;

    // Fade out previous zone layer (if it exists and was active)
    if (previousZone !== 'zone1') {
      const prevLayer = this.zoneLayers.get(previousZone);
      if (prevLayer && prevLayer.isActive) {
        prevLayer.targetVolume = 0;
        prevLayer.isActive = false;
        const currentVol = prevLayer.audio.volume;
        prevLayer.currentVolume = currentVol;
        this.fadeToVolume(prevLayer.audio, currentVol, 0, this.FADE_DURATION);
      }
    }

    // Fade in new zone layer (if not zone1)
    if (zone !== 'zone1') {
      const newLayer = this.zoneLayers.get(zone);
      if (newLayer && !newLayer.isActive) {
        newLayer.isActive = true;
        const targetVolume = this.muted ? 0 : this.volume * 0.3; // Zone layers at 30% of master volume
        newLayer.targetVolume = targetVolume;
        
        if (newLayer.audio.paused) {
          newLayer.audio.play().catch((err) => {
            console.warn(`AudioManager: Failed to play zone layer ${zone}:`, err);
          });
        }
        
        newLayer.currentVolume = 0;
        this.fadeToVolume(newLayer.audio, 0, targetVolume, this.FADE_DURATION);
        
        // Update currentVolume when fade completes
        setTimeout(() => {
          if (newLayer.isActive) {
            newLayer.currentVolume = targetVolume;
          }
        }, this.FADE_DURATION * 1000);
      }
    }
  }

  /**
   * Play an SFX sound
   */
  playSFX(type: SFXType): void {
    if (this.muted) return;

    const audio = this.sfxCache.get(type);
    if (!audio) {
      console.warn(`AudioManager: SFX not found: ${type}`);
      return;
    }

    try {
      // Clone and play to allow overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.volume * 0.6; // SFX at 60% of master volume
      clone.play().catch((err) => {
        console.warn(`AudioManager: Failed to play SFX ${type}:`, err);
      });
    } catch (err) {
      console.warn(`AudioManager: Error playing SFX ${type}:`, err);
    }
  }

  /**
   * Start the hacking loop (plays during mini-game)
   */
  startHackingLoop(): void {
    if (this.isHackingLoopPlaying || this.muted || !this.hackingLoop) return;
    
    try {
      this.hackingLoop.currentTime = 0;
      const targetVolume = this.volume * 0.4;
      this.hackingLoop.volume = targetVolume;
      this.hackingLoop.play().catch((err) => {
        console.warn('AudioManager: Failed to start hacking loop:', err);
      });
      this.isHackingLoopPlaying = true;
    } catch (err) {
      console.warn('AudioManager: Error starting hacking loop:', err);
    }
  }

  /**
   * Stop the hacking loop
   */
  stopHackingLoop(): void {
    if (!this.isHackingLoopPlaying || !this.hackingLoop) return;
    
    try {
      this.hackingLoop.pause();
      this.hackingLoop.currentTime = 0;
      this.isHackingLoopPlaying = false;
    } catch (err) {
      console.warn('AudioManager: Error stopping hacking loop:', err);
    }
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateAllVolumes();
  }

  /**
   * Update all audio volumes based on current settings
   */
  private updateAllVolumes(): void {
    const effectiveVolume = this.muted ? 0 : this.volume;

    // Update global ambient
    if (this.globalAmbient) {
      this.globalAmbient.volume = effectiveVolume * 0.4;
    }

    // Update zone layers
    for (const layer of this.zoneLayers.values()) {
      if (layer.isActive) {
        layer.targetVolume = effectiveVolume * 0.3;
        layer.audio.volume = layer.targetVolume;
      }
    }
  }

  /**
   * Set player alive state (affects global ambient)
   */
  setPlayerAlive(alive: boolean): void {
    if (this.isPlayerAlive === alive) return;
    this.isPlayerAlive = alive;

    if (!alive && this.globalAmbient) {
      // Fade out on death
      this.fadeToVolume(this.globalAmbient, this.globalAmbient.volume, 0, this.FADE_DURATION);
    } else if (alive && this.globalAmbient) {
      // Fade in on respawn
      const targetVolume = this.muted ? 0 : this.volume * 0.4;
      this.fadeToVolume(this.globalAmbient, 0, targetVolume, this.FADE_DURATION);
    }
  }

  /**
   * Cleanup (called on unmount)
   */
  cleanup(): void {
    if (this.fadeAnimationFrame !== null) {
      cancelAnimationFrame(this.fadeAnimationFrame);
    }

    if (this.globalAmbient) {
      this.globalAmbient.pause();
      this.globalAmbient = null;
    }

    for (const layer of this.zoneLayers.values()) {
      layer.audio.pause();
    }
    this.zoneLayers.clear();

    // Stop hacking loop if playing
    if (this.hackingLoop) {
      this.hackingLoop.pause();
      this.hackingLoop = null;
      this.isHackingLoopPlaying = false;
    }

    this.sfxCache.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const AudioManager = new AudioManagerClass();

// Subscribe to gameState changes and sync volume/mute
// This import is deferred to avoid circular dependency issues
let unsubscribe: (() => void) | null = null;

export function initAudioManagerStateSync() {
  if (unsubscribe) return; // Already subscribed
  
  // Dynamic import to avoid circular dependency
  import('../../state/gameState').then(({ useGameState }) => {
    // Sync initial state
    const state = useGameState.getState();
    AudioManager.setVolume(state.audioVolume);
    AudioManager.setMuted(state.audioMuted);
    
    // Subscribe to future changes
    unsubscribe = useGameState.subscribe((state) => {
      AudioManager.setVolume(state.audioVolume);
      AudioManager.setMuted(state.audioMuted);
    });
  });
}

