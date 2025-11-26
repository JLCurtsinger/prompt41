// Win Overlay - displays "You Win" when player exits after completing objective

import { useEffect, useState } from 'react';
import { useGameState, SOURCE_CODE_GOAL } from '../../state/gameState';

export function WinOverlay() {
  const { hasWon, sourceCodeCount, resetPlayer } = useGameState();
  const [opacity, setOpacity] = useState(0);
  
  // Fade in effect
  useEffect(() => {
    if (hasWon) {
      // Start fade in
      const timer = setTimeout(() => {
        setOpacity(1);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
    }
  }, [hasWon]);
  
  // Handle R key to restart
  useEffect(() => {
    if (!hasWon) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        resetPlayer();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasWon, resetPlayer]);
  
  if (!hasWon) return null;
  
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
        zIndex: 2100, // Above VictoryOverlay
        fontFamily: 'monospace',
        color: '#00ff88',
        opacity: opacity,
        transition: 'opacity 0.5s ease-in',
      }}
    >
      <div
        style={{
          fontSize: '64px',
          fontWeight: 'bold',
          marginBottom: '24px',
          textShadow: '0 0 20px rgba(0, 255, 136, 0.8), 2px 2px 4px rgba(0,0,0,0.9)',
          letterSpacing: '4px',
        }}
      >
        You Win
      </div>
      
      <div
        style={{
          fontSize: '18px',
          color: '#ffffff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
          marginBottom: '16px',
        }}
      >
        Source Codes Collected: {sourceCodeCount} / {SOURCE_CODE_GOAL}
      </div>
      
      <div
        style={{
          fontSize: '20px',
          color: '#00ffff',
          textShadow: '0 0 8px rgba(0, 255, 255, 0.5), 1px 1px 2px rgba(0,0,0,0.9)',
          marginTop: '20px',
        }}
      >
        Press R to restart
      </div>
    </div>
  );
}

