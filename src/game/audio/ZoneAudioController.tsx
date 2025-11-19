// TEST PLAN (ZoneAudioController)
// 1. Zone Transitions:
//    - Component should listen to currentZone in gameState
//    - When zone changes from zone1 to zone2 -> AudioManager.setZone('zone2') should be called
//    - When zone changes from zone2 to zone3 -> zone2 layer should fade out, zone3 should fade in
//    - When zone changes from zone3 to zone4 -> zone3 layer should fade out, zone4 should fade in
// 2. Initial Zone:
//    - On mount, if currentZone is zone1 -> only global ambient should play
//    - If currentZone is already zone2/3/4 -> appropriate zone layer should be active
// 3. Player Alive State:
//    - When isDead becomes true -> AudioManager.setPlayerAlive(false) should be called
//    - When isDead becomes false -> AudioManager.setPlayerAlive(true) should be called
// 4. Volume/Mute Sync:
//    - When audioVolume changes -> AudioManager.setVolume() should be called
//    - When audioMuted changes -> AudioManager.setMuted() should be called

import { useEffect } from 'react';
import { useGameState } from '../../state/gameState';
import { AudioManager } from './AudioManager';

export function ZoneAudioController() {
  const currentZone = useGameState((state) => state.currentZone);
  const isDead = useGameState((state) => state.isDead);
  const audioVolume = useGameState((state) => state.audioVolume);
  const audioMuted = useGameState((state) => state.audioMuted);

  // Update zone ambient layers when zone changes
  useEffect(() => {
    AudioManager.setZone(currentZone);
  }, [currentZone]);

  // Update player alive state
  useEffect(() => {
    AudioManager.setPlayerAlive(!isDead);
  }, [isDead]);

  // Sync volume and mute settings
  useEffect(() => {
    AudioManager.setVolume(audioVolume);
  }, [audioVolume]);

  useEffect(() => {
    AudioManager.setMuted(audioMuted);
  }, [audioMuted]);

  // Initialize AudioManager on mount
  useEffect(() => {
    AudioManager.initialize();
    
    return () => {
      AudioManager.cleanup();
    };
  }, []);

  return null; // This component doesn't render anything
}

