// TEST PLAN (DeathOverlay)
// 1. Display:
//    - Should show "SYSTEM FAILURE" centered on screen when player is dead
//    - Should show "Press R to reboot" below the failure message
//    - Should only be visible when isDead = true
// 2. Visual:
//    - Should have dark background overlay (semi-transparent black)
//    - Text should be clearly visible (white/red)
//    - Should cover entire screen
// 3. Interaction:
//    - R key handling is done in Player.tsx
//    - Overlay should disappear when player respawns

import { useGameState } from '../../state/gameState';

export function DeathOverlay() {
  const { isDead } = useGameState();
  
  if (!isDead) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        fontFamily: 'monospace',
        color: '#ff4444',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '20px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
        }}
      >
      THE AGENTS HAVE CONQUERED
      </div>
      <div
        style={{
          fontSize: '24px',
          color: '#ffffff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
        }}
      >
        Press R to reboot
      </div>
    </div>
  );
}

