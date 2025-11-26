// BackgroundAtmosphere - Looping ambient background audio
// Plays quietly during gameplay, separate from zone-specific audio layers

import { useEffect, useRef } from 'react';

export function BackgroundAtmosphere() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.loop = true;
    el.volume = 0.09; // Quiet background level

    const tryPlay = () => {
      el.play().catch(() => {
        // Autoplay may be blocked until user interaction
      });
    };

    // Try immediately and also on first user click
    tryPlay();
    window.addEventListener('click', tryPlay, { once: true });

    return () => {
      window.removeEventListener('click', tryPlay);
      el.pause();
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      src="/audio/background-atmosphere.ogg"
      preload="auto"
    />
  );
}

