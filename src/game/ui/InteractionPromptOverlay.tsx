// TEST PLAN (InteractionPromptOverlay)
// 1. Display:
//    - Component should render nothing when interactionPrompt.message is null
//    - When interactionPrompt.message is set, should display centered at bottom of screen
//    - Should match existing UI aesthetic (monospace, dark background, subtle glow)
// 2. Message Format:
//    - Should display message like "[ E ] Hack terminal" or "[ E ] Open crate"
//    - actionKey should default to 'E' if not provided
//    - Should format as [ KEY ] Message
// 3. Visibility Conditions:
//    - Should NOT display when player is dead (isDead === true)
//    - Should NOT display when shutdown ScreenFade is fully active (isShuttingDown === true)
//    - Should NOT display when terminal hacking overlay is open (isPaused === true)
// 4. Styling:
//    - Should be positioned at bottom-center of screen
//    - Should have similar styling to ZoneLabel (monospace, dark background, subtle glow)
//    - Should not interfere with other UI elements
// 5. State Updates:
//    - Should update immediately when interactionPrompt changes in gameState
//    - Should disappear when clearInteractionPrompt() is called

import { useGameState } from '../../state/gameState';

export function InteractionPromptOverlay() {
  const interactionPrompt = useGameState((state) => state.interactionPrompt);
  const isDead = useGameState((state) => state.isDead);
  const isPaused = useGameState((state) => state.isPaused);
  const isShuttingDown = useGameState((state) => state.isShuttingDown);

  // Don't display if no message, player is dead, paused, or shutting down
  if (
    !interactionPrompt.message ||
    isDead ||
    isPaused ||
    isShuttingDown
  ) {
    return null;
  }

  const actionKey = interactionPrompt.actionKey;
  const displayText = actionKey 
    ? `[ ${actionKey.toUpperCase()} ] ${interactionPrompt.message}`
    : interactionPrompt.message;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100, // Below ZoneLabel (1200) but above most UI
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#00ff00',
          padding: '10px 20px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '16px',
          fontWeight: 'bold',
          textShadow: '0 0 6px rgba(0, 255, 0, 0.5)',
          letterSpacing: '1px',
          border: '1px solid rgba(0, 255, 0, 0.4)',
          boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)',
        }}
      >
        {displayText}
      </div>
    </div>
  );
}

