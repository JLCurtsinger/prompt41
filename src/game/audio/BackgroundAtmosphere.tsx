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
      
      console.log('[BackgroundAtmosphere] play() called');
      el.play()
        .then(() => {
          console.log('[BackgroundAtmosphere] play() succeeded');
          hasStartedRef.current = true;
        })
        .catch((err) => {
          console.log('[BackgroundAtmosphere] play() blocked, will retry on click:', err.message);
        });
    };

    // Try to play immediately
    tryPlay();
    
    // Also attach a click listener in case autoplay was blocked
    const handleClick = () => {
      if (!hasStartedRef.current) {
        console.log('[BackgroundAtmosphere] retrying play on user click');
        tryPlay();
      }
    };
    
    window.addEventListener('click', handleClick, { once: true });

    return () => {
      window.removeEventListener('click', handleClick);
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

