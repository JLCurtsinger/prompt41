import { GameScene } from './game/GameScene'
import { HUD } from './game/ui/HUD'
import { ScreenHitEffect } from './game/Effects/ScreenHitEffect'
import { DeathOverlay } from './game/ui/DeathOverlay'
import './App.css'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <GameScene />
      <HUD />
      <ScreenHitEffect />
      <DeathOverlay />
    </div>
  )
}

export default App
