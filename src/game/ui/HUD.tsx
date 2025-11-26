// TEST PLAN (HUD)
// 1. Health Bar Display:
//    - Should show current health / max health as numeric text
//    - Health bar should fill proportionally (100/100 = full, 50/100 = half, etc.)
//    - Should update in real-time when player takes damage
// 2. Visual Feedback:
//    - Health bar should be visible in top-left or top-center of screen
//    - Should remain fixed in screen space (not move with camera)
// 3. Edge Cases:
//    - Health bar should not go below 0 or above max
//    - Should handle rapid damage updates smoothly

import { useGameState } from '../../state/gameState';

export function HUD() {
  const { playerHealth, playerMaxHealth, energyCellCount, sourceCodeCount } = useGameState();
  
  const healthPercentage = Math.max(0, Math.min(100, (playerHealth / playerMaxHealth) * 100));
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        fontFamily: 'monospace',
        color: '#ffffff',
        fontSize: '14px',
      }}
    >
      {/* Health bar container */}
      <div
        style={{
          width: '200px',
          height: '24px',
          backgroundColor: '#333333',
          border: '2px solid #666666',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '10px',
        }}
      >
        {/* Health bar fill */}
        <div
          style={{
            width: `${healthPercentage}%`,
            height: '100%',
            backgroundColor: healthPercentage > 30 ? '#4a9eff' : '#ff4444',
            transition: 'width 0.2s ease-out, background-color 0.2s ease-out',
          }}
        />
        {/* Health text overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {Math.ceil(playerHealth)} / {playerMaxHealth}
        </div>
      </div>
      
      {/* Energy Cell counter */}
      <div
        style={{
          color: '#00ffff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          fontSize: '16px',
        }}
      >
        Energy Cells: {energyCellCount}
      </div>
      
      {/* Source Code counter */}
      <div
        style={{
          color: '#00ff88',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          fontSize: '16px',
          marginTop: '4px',
        }}
      >
        Source Codes: {sourceCodeCount}
      </div>
    </div>
  );
}

