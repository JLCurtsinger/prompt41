// Enemy Health HUD - displays current target enemy health in top-right corner
// Shows enemy name and health bar during combat

import { useGameState } from '../../state/gameState';

export function EnemyHealthHUD() {
  const { 
    currentTargetEnemyId, 
    currentTargetEnemyName, 
    currentTargetEnemyHealth, 
    currentTargetEnemyMaxHealth 
  } = useGameState();
  
  // Don't render if no target
  if (!currentTargetEnemyId || !currentTargetEnemyName || currentTargetEnemyHealth === null || currentTargetEnemyMaxHealth === null) {
    return null;
  }
  
  // Don't render if enemy is dead
  if (currentTargetEnemyHealth <= 0) {
    return null;
  }
  
  const healthPercentage = Math.max(0, Math.min(100, (currentTargetEnemyHealth / currentTargetEnemyMaxHealth) * 100));
  
  // Different color than player HP (use orange/red theme for enemies)
  const healthColor = healthPercentage > 50 ? '#ff8800' : healthPercentage > 25 ? '#ff6600' : '#ff4400';
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        fontFamily: 'monospace',
        color: '#ffffff',
        fontSize: '14px',
        minWidth: '200px',
      }}
    >
      {/* Target label */}
      <div
        style={{
          color: '#ffaa00',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          fontSize: '12px',
          marginBottom: '4px',
        }}
      >
        Target: {currentTargetEnemyName}
      </div>
      
      {/* Health bar container */}
      <div
        style={{
          width: '200px',
          height: '20px',
          backgroundColor: '#333333',
          border: '2px solid #666666',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Health bar fill */}
        <div
          style={{
            width: `${healthPercentage}%`,
            height: '100%',
            backgroundColor: healthColor,
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
            fontSize: '12px',
          }}
        >
          {Math.ceil(currentTargetEnemyHealth)} / {currentTargetEnemyMaxHealth}
        </div>
      </div>
    </div>
  );
}

