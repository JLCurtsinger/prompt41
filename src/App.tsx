import { GameScene } from './game/GameScene'
import { HUD } from './game/ui/HUD'
import { ScreenHitEffect } from './game/Effects/ScreenHitEffect'
import { DeathOverlay } from './game/ui/DeathOverlay'
import { HostLog } from './game/ui/HostLog'
import { ZoneLabel } from './game/ui/ZoneLabel'
import { ScreenGlitch } from './game/Effects/ScreenGlitch'
import { ScanlineOverlay } from './game/Effects/ScanlineOverlay'
import { AudioSettings } from './game/ui/AudioSettings'
import './App.css'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <GameScene />
      <HUD />
      <ScreenHitEffect />
      <ScanlineOverlay />
      <ScreenGlitch />
      <HostLog />
      <ZoneLabel />
      <AudioSettings />
      <DeathOverlay />
    </div>
  )
}

export default App
