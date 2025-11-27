import { useEffect } from 'react'
import { GameScene } from './game/GameScene'
import { HUD } from './game/ui/HUD'
import { EnemyHealthHUD } from './game/ui/EnemyHealthHUD'
import { ScreenHitEffect } from './game/Effects/ScreenHitEffect'
import { DeathOverlay } from './game/ui/DeathOverlay'
import { VictoryOverlay } from './game/ui/VictoryOverlay'
import { WinOverlay } from './game/ui/WinOverlay'
import { HostLog } from './game/ui/HostLog'
import { ZoneLabel } from './game/ui/ZoneLabel'
import { ScreenGlitch } from './game/Effects/ScreenGlitch'
import { ScanlineOverlay } from './game/Effects/ScanlineOverlay'
import { AudioSettings } from './game/ui/AudioSettings'
import { InteractionPromptOverlay } from './game/ui/InteractionPromptOverlay'
import { HackingOverlay } from './game/ui/HackingOverlay'
import { TouchControlsOverlay } from './game/ui/TouchControlsOverlay'
import { useGameState } from './state/gameState'
import './App.css'

function App() {
  const setTouchMode = useGameState((state) => state.setTouchMode);
  
  // Detect touch capability on mount
  useEffect(() => {
    const isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 900;
    
    if (isTouchCapable || isSmallScreen) {
      setTouchMode(true);
    }
    
    // Also handle resize for responsive detection
    const handleResize = () => {
      const isNowSmall = window.innerWidth < 900;
      const nowTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setTouchMode(nowTouchCapable || isNowSmall);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setTouchMode]);
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', margin: 0, padding: 0, overflow: 'hidden' }}>
      <GameScene />
      <HUD />
      <EnemyHealthHUD />
      <ScreenHitEffect />
      <ScanlineOverlay />
      <ScreenGlitch />
      <HostLog />
      <ZoneLabel />
      <InteractionPromptOverlay />
      <AudioSettings />
      <HackingOverlay />
      <TouchControlsOverlay />
      <DeathOverlay />
      <VictoryOverlay />
      <WinOverlay />
    </div>
  )
}

export default App
