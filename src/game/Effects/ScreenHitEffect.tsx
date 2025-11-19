// TEST PLAN (ScreenHitEffect)
// 1. Hit Flash:
//    - Should appear when player takes damage (recentlyHit = true)
//    - Should show red overlay/vignette for ~200ms
//    - Should fade out smoothly
// 2. Visual Feedback:
//    - Red overlay should be visible but not completely block view
//    - Should cover entire screen (fixed position)
// 3. Timing:
//    - Should automatically clear after 200ms (handled by gameState)
//    - Should not persist if multiple hits occur rapidly

import { useGameState } from '../../state/gameState';

export function ScreenHitEffect() {
  const { recentlyHit } = useGameState();
  
  if (!recentlyHit) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999,
        backgroundColor: 'rgba(255, 0, 0, 0.3)',
        transition: 'opacity 0.2s ease-out',
      }}
    />
  );
}

