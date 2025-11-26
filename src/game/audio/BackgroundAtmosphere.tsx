import { useEffect, useRef } from 'react';

export function BackgroundAtmosphere() {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.loop = true;
    el.volume = 0.15;

    const tryPlay = () => {
      el.play().catch(() => {});
    };

    tryPlay();
    window.addEventListener('click', tryPlay, { once: true });

    return () => {
      window.removeEventListener('click', tryPlay);
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

