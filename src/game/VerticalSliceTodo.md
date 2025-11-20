# Vertical Slice TODO – prompt41

Source of truth: `CoreGameDetails.md`

## 1. Level Flow

- [x] Player spawns at Zone 1 (Perimeter Breach) at correct position
- [x] Zone 1 layout exists (placeholder geometry with breach, debris, exposed cables)
- [x] Zone 2 layout exists (Processing Yard with machinery blocks creating paths)
- [x] Zone 3 layout exists (Conduit Hall with side room branch)
- [x] Zone 4 layout exists (Core Access Chamber with circular arena)
- [x] Zone transition markers visible (teal/amber/red floor strips)
- [ ] Replace placeholder geometry with actual `level_blockout.glb` model
- [ ] Zone 1: Add environmental storytelling elements (disabled robots, warning holograms, inspection spots)
- [ ] Zone 3: Add environmental hazard (steam vents, sparks, flickering power) in forward route
- [ ] Zone 3: Add environmental log or directive entry in side room branch
- [ ] Zone 4: Add server core visual (currently placeholder cylinder)
- [ ] Zone 4: Add wall panels/monitors for THE HOST visual presentation

## 2. Combat

- [x] Player movement (walk, jog, sprint) with WASD + Shift
- [x] Third-person camera with mouse look and arrow keys
- [x] Camera follows player with over-the-shoulder offset
- [x] Shock Baton melee attack (left mouse click, 300ms swing duration)
- [x] Player health system (100 HP max, damage reduces health)
- [x] Health bar HUD displays current/max health
- [x] Health bar changes color when below 30% (red warning)
- [x] Player death when health reaches 0 (controls freeze)
- [x] Player respawn with R key (restores health, resets position)
- [x] Player can damage enemies (Sentinel takes 10 damage per swing within 2.5m range)
- [ ] Dodge/evade mechanic (optional per design doc)
- [ ] Plasma Cutter ranged weapon (stretch goal)
- [ ] Player attack animations (currently no visual feedback for baton swing)
- [ ] Hit detection improvements (currently basic distance check, needs proper collision)
- [ ] Stagger effect on enemies when hit (mentioned in design doc but not fully implemented)

## 3. Enemies

- [x] EnemyBase FSM system (idle, patrol, chase, attack states)
- [x] Crawler Zombot spawns in Zone 2 with patrol points
- [x] Crawler detection radius (8m), attack range (2m), fast movement (5 m/s)
- [x] Crawler deals 5 damage with 0.8s cooldown
- [x] Shambler Zombot spawns in Zone 3, activated by trigger
- [x] Shambler detection radius (6m), attack range (2.5m), slow movement (1.8 m/s)
- [x] Shambler deals 15 damage with 1.2s cooldown and 0.5s wind-up
- [x] Sentinel Zombot spawns in Zone 4, activated by trigger
- [x] Sentinel detection radius (10m), attack range (4m), slow movement (2.5 m/s phase 1)
- [x] Sentinel deals 25 damage with 1.5s cooldown
- [x] Sentinel Phase 2 activates at 40% health (increased speed to 3.5 m/s)
- [x] Sentinel health system (100 HP, takes 10 damage per player swing)
- [x] Sentinel defeat triggers `sentinelDefeated` flag
- [x] Enemy placeholder models (Crawler: low box, Shambler: tall box, Sentinel: large box)
- [ ] Replace enemy placeholders with actual GLB models (`crawlerZombot.glb`, `shamblerZombot.glb`, `sentinelZombot.glb`)
- [ ] Enemy animations (Idle, Walk, Run, Attack, Death, Stagger) from GLB files
- [ ] Crawler: Implement skittering movement pattern (short bursts, circling/flanking behavior)
- [ ] Shambler: Implement jerky, unpredictable pathing with occasional stalls/twitches
- [ ] Sentinel: Implement phase change visual/audio feedback (currently only speed change)
- [ ] Enemy emissive core pulsing based on alertness/health (currently static)
- [ ] Enemy death animations and cleanup
- [ ] Crawler reveal micro-cutscene (freeze player, slow time, enemy steps from shadow, lights flicker, HOST line)

## 4. Hacking + Doors

- [x] HackingTerminal component with interaction range (2.5m)
- [x] "Press E to hack" prompt appears when in range
- [x] Hacking overlay UI opens on E key press
- [x] Hacking overlay displays directive title and options from `directives.json`
- [x] Hacking overlay has normal/locked/alreadyHacked/success modes
- [x] Terminal state system (locked/hacked) stored in gameState
- [x] Zone 2 terminal opens door when hacked
- [x] Zone 4 terminal locked until Sentinel is defeated
- [x] Door component with open/closed states
- [x] Door animates upward when opened (smooth Y position transition)
- [x] Door collision blocking when closed
- [x] Door visual indicators (red light when closed, green when open)
- [ ] Real hacking mini-game (currently just button clicks - needs directive-based puzzle)
- [ ] Hacking failure consequences (triggers local alert, spawns/enrages enemies)
- [ ] Hacking temporarily slows/pauses nearby enemies (mentioned in design doc)
- [ ] Directive options have different effects (Disable vs Override vs Convert)
- [ ] Enemy hacking interactions (Crawler: Disable/Stun/Convert, Shambler: Disable/Override, Sentinel: Stun only)
- [ ] Hacking success triggers glitch overlay effect (ScreenGlitch exists but not wired to hacking events)
- [ ] Terminal model replacement (currently placeholder box)

## 5. Final Encounter + End

- [x] Sentinel spawns in Zone 4 at correct position
- [x] Sentinel activation trigger fires when player enters Zone 4
- [x] Sentinel boot-up HOST line plays on activation
- [x] Sentinel combat encounter (patrol, chase, attack states)
- [x] Sentinel defeat sets `sentinelDefeated` flag
- [x] Final terminal becomes accessible after Sentinel defeat
- [x] Final terminal triggers shutdown sequence when hacked
- [x] ScreenFade component fades to black over 4 seconds
- [x] "SYSTEM SHUTDOWN" text appears after fade completes
- [x] "Press R to reboot" prompt after shutdown
- [x] Reboot resets all game state (player, doors, terminals, enemies)
- [ ] Sentinel boot-up micro-cutscene (lights dim, camera partially locks, Sentinel animates up, dramatic reveal)
- [ ] Zone 4 lighting changes for Sentinel reveal (red floodlights, localized spotlights)
- [ ] THE HOST speaks during Sentinel fight (more lines, not just spawn line)
- [ ] Final HOST whisper after shutdown ("Process suspended. Pending… reboot?")
- [ ] Ending fade-out sequence (lights shut down in stages, audio ducks to silence)

## 6. Tech / Glue

- [x] GameState (Zustand) with player health, door/terminal states, inventory
- [x] Zone tracking system (currentZone updates on trigger volumes)
- [x] Host message bus (playHostLine, hostMessages array with cooldown)
- [x] Interaction prompt system (showInteractionPrompt, clearInteractionPrompt with priority)
- [x] Hacking overlay state management (open/close, mode switching)
- [x] Audio system (AudioManager, ZoneAudioController)
- [x] HUD component (health bar, energy cell counter)
- [x] HostLog component (displays host messages in top-right, fades after 6s)
- [x] DeathOverlay component (shows on player death)
- [x] ScreenGlitch component (idle/alert/critical/shutdown intensities)
- [x] ScreenFade component (shutdown fade effect)
- [x] ScreenHitEffect component (damage feedback)
- [x] ZoneLabel component (displays zone name on transition)
- [x] InteractionPromptOverlay component (shows "Press E" prompts)
- [x] AudioSettings component (volume/mute controls)
- [x] TriggerVolume component (zone detection, enemy activation)
- [x] EnergyCell pickup system (auto-pickup within 1.5m, adds to inventory)
- [x] LootCrate system (opens on E, spawns EnergyCell, lid animation)
- [x] Player position tracking for enemies (PlayerPositionTracker component)
- [ ] Replace player placeholder (capsule) with actual `mainChar.glb` model
- [ ] Player animations (Idle, Walk, Run, Attack, Hit-react, Death) from GLB
- [ ] Level geometry collision detection (currently basic, needs proper mesh collision)
- [ ] Camera collision avoidance (currently stubbed, needs raycast against level geometry)
- [ ] Environmental trigger system for ambient events (lights flicker, audio cues, ghost silhouettes)
- [ ] Diegetic tutorial system (in-world screens/overlays instead of UI popups)
- [ ] AI reaction moments (scripted lines on first kill, low health, hacking success)
- [ ] Light flicker volumes (scripted light intensity randomization in specific areas)
- [ ] Audio ducking during hacking (lower ambient by 30%, raise UI sounds)
- [ ] Enemy core emissive pulsing shader/material (modulated by alertness/health)
- [ ] Screen glitch triggered by AI events (hacking start/fail, enemy spawn, Sentinel awaken)
- [ ] Proper GLB model loading pipeline (useGLTF, useAnimations hooks)
- [ ] Animation mixer integration for all characters
- [ ] Performance optimization (poly budget, draco compression if needed)

## 7. Content / Data

- [x] `directives.json` data file structure exists
- [x] `hostLines.json` data file structure exists
- [x] Host lines loaded and displayed via playHostLine system
- [x] Directive data loaded for hacking terminals
- [ ] Environmental logs/collectibles (mentioned in design doc but not implemented)
- [ ] Audio log system (pickup and playback)
- [ ] More host line variations (currently basic set, needs expansion per design doc)
- [ ] Reactive AI lines (first kill, low health crossing threshold, hacking success variations)
- [ ] Zone-specific ambient audio tracks
- [ ] SFX for all interactions (currently some missing)
- [ ] Voice lines for Zeeko (stretch goal)
- [ ] Voice lines for THE HOST (filtered, with reverb)

## 8. Polish / Effects

- [x] Screen glitch effect (scanlines, RGB channel shift, noise)
- [x] Screen fade effect (shutdown sequence)
- [x] Screen hit effect (damage feedback)
- [x] Health bar color transition (blue to red when low)
- [x] Door animation (smooth Y position transition)
- [x] Energy cell rotation and bob animation
- [x] Loot crate lid opening animation
- [ ] Screen glitch triggered by specific events (not just health-based)
- [ ] Particle effects (sparks on baton hit, steam vents, fog)
- [ ] Improved VFX (weapon swing trails, impact flashes)
- [ ] Lighting transitions (dramatic changes for Sentinel reveal, shutdown sequence)
- [ ] Volumetric fog effects (mentioned in design doc)
- [ ] Improved weapon animation (baton swing visual feedback)
- [ ] Enemy death particle effects
- [ ] Terminal screen animations (glitch text, directive scrolling)

## Notes

- Most core systems are in place but use placeholder geometry/models
- Enemy AI behavior is functional but needs animation integration
- Hacking system works but lacks the directive-based mini-game described in design doc
- Micro-cutscenes are mentioned but not implemented (Crawler reveal, Sentinel boot-up)
- Environmental storytelling elements are mostly missing
- Audio system exists but needs more content and proper ducking/mixing
- Visual effects exist but need to be wired to more game events

