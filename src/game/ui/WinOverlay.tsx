// Win Overlay - displays "Transmission Complete" when player collects all 3 SourceCodes

import { useEffect, useRef } from 'react';
import { useGameState } from '../../state/gameState';

export function WinOverlay() {
  const hasWon = useGameState((state) => state.hasWon);
  const resetPlayer = useGameState((state) => state.resetPlayer);
  const hasPlayedWinSfxRef = useRef(false);

  // Play win SFX when hasWon transitions from false → true
  useEffect(() => {
    if (!hasWon) {
      // Reset guard when hasWon becomes false (for restart)
      hasPlayedWinSfxRef.current = false;
      return;
    }

    // Prevent repeated playback
    if (hasPlayedWinSfxRef.current) return;
    hasPlayedWinSfxRef.current = true;

    // Use AudioManager for win sounds (lazy load if needed)
    // Note: These are special win sounds, so we create them on-demand
    // but only once per win state
    const tone = new Audio('/audio/win-sound.ogg');
    const clap = new Audio('/audio/win-clap.ogg');

    // Normal volume for tone
    tone.volume = 1.0;

    // Reduced volume for clapping so it doesn't overpower the sci-fi sound
    clap.volume = 0.18;

    tone.play().catch(() => {});
    clap.play().catch(() => {});
  }, [hasWon]);

  useEffect(() => {
    if (!hasWon) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        resetPlayer();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasWon, resetPlayer]);

  if (!hasWon) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at center, rgba(0,255,200,0.25), rgba(0,0,0,0.95))',
        color: '#e6fffa',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          fontSize: '2.8rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}
      >
        Transmission Complete
      </div>
      <div style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem' }}>
        All 3 SourceCodes secured. Neural rogue contained.
      </div>
      <div style={{ fontSize: '0.95rem', opacity: 0.8 }}>
        Press <span style={{ fontWeight: 700 }}>R</span> to restart.
      </div>
    </div>
  );
}

