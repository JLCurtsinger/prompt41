// Victory Overlay - displays when player wins
// Shows "CORE SEALED" or "DIRECTIVE STABILIZED" with restart option

import { useGameState } from '../../state/gameState';

export function VictoryOverlay() {
  const { hasCompletedLevel, enemiesKilled } = useGameState();
  
  if (!hasCompletedLevel) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        fontFamily: 'monospace',
        color: '#00ff00',
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
        DIRECTIVE STABILIZED
      </div>
      <div
        style={{
          fontSize: '20px',
          color: '#ffffff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
          marginBottom: '10px',
        }}
      >
        Enemies Eliminated: {enemiesKilled}
      </div>
      <div
        style={{
          fontSize: '24px',
          color: '#00ffff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
        }}
      >
        Press R to restart
      </div>
    </div>
  );
}

