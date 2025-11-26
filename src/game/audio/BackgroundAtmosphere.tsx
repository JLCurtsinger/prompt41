import { useEffect, useRef } from 'react';
import { useGameState } from '../../state/gameState';

export function BackgroundAtmosphere() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);
  
  // Subscribe to global audio state
  const audioVolume = useGameState((state) => state.audioVolume);
  const audioMuted = useGameState((state) => state.audioMuted);

  // Update volume/mute whenever state changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const effectiveVolume = audioMuted ? 0 : audioVolume * 0.15; // Base volume scaled by global
    el.volume = effectiveVolume;
  }, [audioVolume, audioMuted]);

  useEffect(() => {
    console.log('[BackgroundAtmosphere] mounted');
    
    const el = ref.current;
    if (!el) return;

    el.loop = true;
    
    // Set initial volume based on global state
    const state = useGameState.getState();
    const effectiveVolume = state.audioMuted ? 0 : state.audioVolume * 0.15;
    el.volume = effectiveVolume;

    const tryPlay = () => {
      if (hasStartedRef.current) return; // Already started, don't try again
      
      console.log('[BackgroundAtmosphere] attempting play()');
      el.play()
        .then(() => {
          console.log('[BackgroundAtmosphere] play() succeeded');
          hasStartedRef.current = true;
          // Remove listeners once playback has started
          removeUserGestureListeners();
        })
        .catch((err) => {
          console.log('[BackgroundAtmosphere] play() blocked, will retry on user gesture:', err.message);
        });
    };

    // Handler for any generic user gesture (not tied to baton or any specific input)
    const handleUserGesture = () => {
      if (!hasStartedRef.current) {
        console.log('[BackgroundAtmosphere] retrying play on user gesture');
        tryPlay();
      }
    };

    const removeUserGestureListeners = () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
    };

    // Try to play immediately on mount
    tryPlay();
    
    // If autoplay was blocked, listen for any generic user gesture to retry
    // Using pointerdown/keydown/touchstart covers all interaction types
    window.addEventListener('pointerdown', handleUserGesture, { once: true });
    window.addEventListener('keydown', handleUserGesture, { once: true });
    window.addEventListener('touchstart', handleUserGesture, { once: true });

    return () => {
      removeUserGestureListeners();
      el.pause();
    };
  }, []);

  return (
    <audio
      ref={ref}
      src="/audio/background-atmosphere.ogg"
      preload="auto"
    />
  );
}

