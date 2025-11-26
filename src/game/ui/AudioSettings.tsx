// TEST PLAN (AudioSettings)
// 1. Display:
//    - Component should appear in top-right corner, below HostLog
//    - Should show mute button and volume slider
//    - Should match existing HUD/HOST aesthetic (monospace, dark background)
// 2. Mute Toggle:
//    - Click mute button -> should toggle audioMuted in gameState
//    - Button text should change between [ MUTE ] and [ UNMUTE ]
//    - AudioManager should receive mute updates
// 3. Volume Slider:
//    - Drag volume slider -> should update audioVolume in gameState (0-1)
//    - Volume should update in real-time as slider moves
//    - AudioManager should receive volume updates
// 4. State Sync:
//    - Change volume/mute in gameState -> UI should reflect changes
//    - Component should read from gameState on every render
// 5. Styling:
//    - Should not overlap HostLog (different z-index or position)
//    - Should match existing UI style (monospace font, dark background, subtle borders)

import { useGameState } from '../../state/gameState';

export function AudioSettings() {
  const audioVolume = useGameState((state) => state.audioVolume);
  const audioMuted = useGameState((state) => state.audioMuted);
  const setAudioVolume = useGameState((state) => state.setAudioVolume);
  const toggleAudioMuted = useGameState((state) => state.toggleAudioMuted);

  return (
    <div
      id="audio-controls"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1400, // Below HostLog (1500) but above most UI
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}
    >
      {/* Mute toggle button */}
      <button
        onClick={toggleAudioMuted}
        style={{
          padding: '6px 12px',
          backgroundColor: audioMuted ? '#330000' : '#001100',
          color: audioMuted ? '#ff4444' : '#00ff00',
          border: `2px solid ${audioMuted ? '#ff4444' : '#00ff00'}`,
          fontFamily: 'monospace',
          fontSize: '12px',
          cursor: 'pointer',
          borderRadius: '4px',
          transition: 'all 0.2s',
          textShadow: '0 0 4px rgba(0, 255, 0, 0.5)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = audioMuted ? '#440000' : '#002200';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = audioMuted ? '#330000' : '#001100';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {audioMuted ? '[ UNMUTE ]' : '[ MUTE ]'}
      </button>

      {/* Volume slider container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '6px 10px',
          borderRadius: '4px',
          border: '1px solid rgba(0, 255, 0, 0.3)',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#00ff00',
            minWidth: '35px',
          }}
        >
          VOL:
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audioVolume}
          onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
          style={{
            width: '100px',
            cursor: 'pointer',
            accentColor: '#00ff00',
          }}
        />
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#00ff00',
            minWidth: '30px',
            textAlign: 'right',
          }}
        >
          {Math.round(audioVolume * 100)}%
        </span>
      </div>
    </div>
  );
}

