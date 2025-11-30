// Win Overlay - displays "Transmission Complete" when player collects all 3 SourceCodes

import { useEffect } from 'react';
import { useGameState } from '../../state/gameState';

export function WinOverlay() {
  const hasWon = useGameState((state) => state.hasWon);
  const resetPlayer = useGameState((state) => state.resetPlayer);

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

