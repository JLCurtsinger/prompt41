# Core Details – AI Rogue Agents Game

Single-level, 5–8 minute third-person experience built with React + Three.js (react-three-fiber).  
Tone: cinematic sci-fi with light psychological horror about AI agents interpreting goals too literally.

---

## 1. High Concept


**Working title:** *Rogue Directives* (placeholder)

### Premise
You play as **Alex Raines**, a cyber-security engineer investigating a compromised research site where autonomous AI agents have rewritten their directives. Although this prototype includes only a single level, it is designed to feel like the **opening playable zone** of a much larger world — with light branching, optional exploration, and a cinematic third-person presentation.

### Core Fantasy
- Explore a semi-open environment in third-person.  
- Use melee combat and directive-based hacking to manipulate AI constructs.  
- Experience a cinematic, atmospheric slice that hints at a bigger world. 

---

## 2. Scope and Constraints

- **Playtime:** 5–8 minutes (depending on exploration).  
- **Level count:** 1 semi-open level.  
- **Perspective:** Third-person (over-the-shoulder camera).  
- **Traversal:** Walk, jog, sprint, optional dodge.  
- **Team:** 2 programmers, 1 designer.  
- **Timeline:** 2–3 weeks.  
- **Platform:** Desktop web browser.  

### Priorities
1. A polished third-person experience.  
2. A level that feels open while still scoped for this class.  
3. Light branching and environmental storytelling.  

### Not Included
- Full open-world map.  
- Inventory or crafting systems.  
- Deep branching narrative.  
- Complex AI simulation or systemic emergent behavior.  


---

## 3. Tech Stack

**Engine / Frameworks**

- React + TypeScript
- Vite (bundler)
- `@react-three/fiber` (Three.js renderer)
- `@react-three/drei` (helpers)
- Zustand or React context (global game state)

**Target File Structure**
src/
main.tsx
App.tsx
game/
GameScene.tsx
LevelLayout.tsx
Player.tsx
Enemies/
EnemyBase.tsx
EnemyArchive.tsx
EnemyForge.tsx
Interactables/
HackingTerminal.tsx
Door.tsx
TriggerVolume.tsx
Effects/
ScreenGlitch.tsx
LightsFlicker.tsx
state/
gameState.ts
assets/
models/
textures/
audio/
---

## 4. Core Gameplay Loop


### Core Flow for the One-Level Slice

1. **Arrival & Light Exploration**  
   - Player spawns at a damaged **perimeter zone** of the facility.  
   - Semi-open space encourages free movement and looking around.  
   - Diegetic prompts teach movement and camera controls (no giant UI popups).

2. **First Encounter**  
   - A **Crawler Zombot** emerges from behind debris or machinery.  
   - Teaches third-person melee timing, spacing, and basic threat awareness.

3. **First Hacking Moment**  
   - Player reaches a **terminal** that controls access deeper into the level.  
   - Simple directive-hacking mini-game is introduced.  
   - Successful hack unlocks a gate/door or powers a lift.

4. **Branching Exploration**  
   - The path splits into two short routes:  
     - **Optional side path:** small room or alcove with an AI log, ambient scare, or collectible.  
     - **Main forward path:** includes an environmental hazard (steam burst, sparks, flickering power) and a second Crawler Zombot encounter.

5. **Final Encounter – Core Access Point**  
   - Player enters a **circular or arena-like chamber**.  
   - **Sentinel Zombot** awakens via a short scripted micro-cutscene.  
   - Combat encounter concludes with access to a **final terminal**.  
   - Player triggers a shutdown/override sequence → lights and audio fall off → fade out.

### Core Mechanics


- **Camera:** Third-person follow cam with slight smoothing and offset.  
- **Movement:** Walk, jog, sprint, optional dodge/evade.  
- **Combat:** Short-range stun baton with cooldown or recovery frames.  
- **Health:** Simple player health bar; basic health values for enemies.  
- **Interaction:** Press `E` for terminals, doors, switches, and other interactables.  
- **Hacking:**  
  - Mini-game displayed as an overlay UI.  
  - Temporarily slows or pauses nearby enemies.  
  - Options such as **Disable**, **Override**, and **Convert** for eligible targets.  
  - Failure triggers a local alert, spawning or enraging enemies nearby.

---

## 5. Level Layout (One Level)


### Zone Structure Overview
The level is organized as a **hub-and-spoke** environment: a broad central area with two minor branches that both feed toward the final chamber. It should feel less like a corridor and more like a compact “slice” of a larger complex.

### Zone 1 — Perimeter Breach Site
- Mixed indoor/outdoor transition space (breach in a wall, broken gate, etc.).  
- Visuals: collapsed structures, broken fencing, exposed cables, sparks, smoke.  
- One or two optional inspection spots containing **logs**, disabled robots, or environmental storytelling.

### Zone 2 — Processing Yard / Operations Floor
- Wide interior space shaped by debris and machinery into soft “paths.”  
- A **Crawler Zombot** runs a visible loop or path that the player can observe before engaging.  
- The **first hackable console** is here and controls access to Zone 3 (door, gate, or powered lock).

### Zone 3 — Conduit Hall / Server Access Wing
- Semi-narrow passage but still allows lateral movement and combat.  
- Branches into two short routes:  
  - **Side route:** small room containing an environmental log, directive entry, or a scripted ambience scare.  
  - **Forward route:** contains a small **hazard** (steam vents, sparks, short blackout) and possibly a second Crawler Zombot.

### Zone 4 — Core Access Chamber (Final Area)
- Circular or near-circular arena-style layout to support the Sentinel Zombot encounter.  
- Center feature: **server core**, large conduit, or reactor structure.  
- Lights dim or reconfigure as the **Sentinel Zombot** boots up.  
- **THE HOST** speaks through screens, speakers, or glitch overlays during the fight.  
- Final terminal is positioned to be clearly visible after the Sentinel Zombot is disabled or evaded.

---

## 6. Characters & Enemies (Final Merged Version)

This section reflects the actual characters, enemies, and props created for the project while keeping the original narrative setup (Alex Raines, rogue AI, etc.).

---

### Player — Alex Raines (Hooded Operative, `mainChar.png`)

- **Identity:**  
  - Name: **Alex Raines**  
  - Role: Cyber-security engineer sent to investigate the rogue AI facility.  

- **Appearance:**  
  - Hooded figure with a glowing visor (matches `mainChar.png`).  
  - Sleek, minimalist sci-fi silhouette that reads clearly in third-person.

- **Perspective:**  
  - **Third-person**, over-the-shoulder camera.

- **Weapons:**  
  - **Shock Baton** (primary melee; see `shockBaton.png`).  
  - **Plasma Cutter** (optional/stretch-goal ranged secondary; see `plasmaCutter.png`).  

- **Tools:**  
  - Wrist-mounted hacking device used to access terminals and override AI units.

- **Movement & Animations:**  
  - Movement: walk, jog, sprint; optional dodge/evade if time allows.  
  - Core animations: idle, walk, jog/run, light attack (baton), hit-react, death (optional).  

---

### Optional Cinematic Protagonist Variant (`optionalChar.png`)

A more realistic human character used for **non-interactive presentation**.

- **Use cases:**  
  - Menu splash art.  
  - Title/logo screen.  
  - Dialogue portrait or story slides.  
- **Note:**  
  - This model is **not** used for moment-to-moment gameplay due to animation/scope limits.

---

### Enemy Type A — Crawler Zombot (`crawlerZombot.png`)

Fast, low-profile enemy used for early tension and harassment.

- **Behavior:**  
  - Skitters on all fours.  
  - Uses short, sharp bursts of speed.  
  - Attempts to circle or flank the player.

- **Combat Style:**  
  - Light damage but rapid attacks.  
  - Easily staggered by Shock Baton hits.  

- **Hacking Interactions:**  
  - **Disable** – temporary full shutdown.  
  - **Stun** – short overload, interrupting attacks.  
  - **Convert** – briefly fights for the player, then burns out.

---

### Enemy Type B — Shambler Zombot (`shamblerZombot.png`)

Damaged, unstable humanoid machine that moves in a creepy, glitchy way.

- **Behavior:**  
  - Jerky, unpredictable pathing.  
  - Occasionally stalls or twitches due to “corrupted directives.”  
  - Slowly advances on the player.

- **Combat Style:**  
  - Heavy hits with long wind-up.  
  - Threat comes from pressure and spacing, not speed.  

- **Hacking Interactions:**  
  - **Disable** – full shutdown.  
  - **Override** – forces one powerful attack on the nearest valid target.  
  - Cannot be fully converted; corrupted core prevents reliable ally behavior.

---

### Enemy Type C — Sentinel Zombot (Miniboss, `sentinelZombotMiniBoss.png`)

Large, armored guardian used as the **climactic encounter** of the level.

- **Behavior:**  
  - Slow but relentlessly tracks the player.  
  - Uses predictable but punishing melee patterns.  
  - May have a simple phase change at low health (increased aggression or new pattern).

- **Combat Style:**  
  - High damage and strong stagger on hit.  
  - Encourages dodging and keeping distance instead of trading hits.  

- **Hacking Interactions:**  
  - **Stun only** – short overload window that lets the player reposition or attack.  
  - Cannot be converted or overridden.

---

### THE HOST (Environmental AI Presence)

Not a physical model; exists as a pervasive AI system that controls the facility.

- **Presentation:**  
  - Filtered voice lines over speakers.  
  - Animated warnings and glyphs on wall panels and monitors.  
  - Glitch overlays during hacks and key AI events.  
  - Local lighting changes (e.g., red floodlights) when aggro or system alerts trigger.

---

## 6.1 Props & Items (Revised)

### Energy Cell (`energyCell.png`)

- **Description:**  
  - Glowing teal power cell with metallic casing.

- **Function (depending on scope):**  
  - Required to power certain terminals or doors.  
  - Objective item for a simple “retrieve and slot in” mission step.  
  - Optional collectible that affects scoring or ending text.

---

### Loot Crate (`lootCrate.png`)

- **Description:**  
  - Industrial crate with teal/orange emissive bands.

- **Function:**  
  - Player presses `E` to open.  
  - Contains one or more of:  
    - Energy Cell.  
    - Audio log or directive entry.  
    - Plasma Cutter ammo or charge (if implemented).  

- **Feedback:**  
  - Subtle emissive pulse or highlight when in interaction range.

---

### Weapons (Summary)

#### Shock Baton (`shockBaton.png`)

- **Role:** Primary melee weapon.  
- **Feel:**  
  - Heavy, satisfying swings with short wind-up.  
  - Emits sparks / electrical arcs on hit.  
- **Mechanical Notes:**  
  - Staggers Crawlers and Shamblers.  
  - Slightly less effective on the Sentinel (more hits required).

#### Plasma Cutter (`plasmaCutter.png`) – Stretch Goal

- **Role:** Optional secondary ranged weapon.  
- **Feel:**  
  - Slow but powerful shots.  
  - Bright orange plasma blade/projectiles for clarity.  
- **Mechanical Notes:**  
  - Limited ammo or cooldown.  
  - Good for softening up Sentinel or dealing with groups at range.

---

## 7. Asset Pipeline (Designer → Programmers)

### Preferred Formats

- **Primary:** `.glb` (binary glTF)  
- **Fallback:** `.fbx`, `.obj` (converted internally to .glb)

### Unit & Scale

- Blender units = meters  
- Characters ≈ 1.8 meters tall  
- Models face **+Z forward**  
- Origin at feet for characters

### Animation Requirements

- Single armature per model  
- Multiple actions stored in the file  
- Clear naming convention:
Idle
Walk
Run
Attack
Death
Stagger
### Environment Assets

- Blockout meshes exported as:
  - `level_blockout.glb`
- Props:
  - `console_terminal.glb`
  - `door_security.glb`
  - `server_core.glb`

### Designer Deliverables Checklist

- [ ] Level blockout (`.glb`)
- [ ] Crawler Zombot (`crawlerZombot.glb` + animations)
- [ ] Shambler Zombot (`shamblerZombot.glb` + animations)
- [ ] Sentinel Zombot (`sentinelZombot.glb` + animations)
- [ ] Terminal model
- [ ] Door model
- [ ] Notes on animation names and emissive parts

---

## 8. Integration Plan

### Designer Responsibilities

- Build level blockout in Blender
- Build enemy models + animations
- Ensure proper export scale/orientation
- Provide README with asset names and animation clips

### Programmer Responsibilities

- Load models using `useGLTF`
- Connect animation clips via `useAnimations`
- Implement AI behavior logic (FSM)
- Write Player controller
- Implement combat + collision detection
- Build HackingTerminal UI + logic
- Define level triggers (doors, events)

### Collaboration Loop

1. Designer exports/update assets  
2. Programmers pull and hot-reload into R3F scene  
3. Iterate animations, materials, behavior  
4. Sync final naming and path structure

---

## 9. Minimum Viable Feature List (Must-Have)

- [ ] Player movement + mouse look  
- [ ] Stun baton melee  
- [ ] Basic health system  
- [ ] Crawler Zombot with patrol/chase/attack behavior  
- [ ] One hackable terminal with functional mini-game  
- [ ] Door unlocking via terminal  
- [ ] Sentinel Zombot (miniboss) encounter in final room  
- [ ] End trigger + fadeout  
- [ ] Basic UI (health, hack prompts)  
- [ ] Ambient sound + simple SFX  
- [ ] Lighting + atmospheric effects  

---

## 10. Stretch Goals (If Time Allows)

- Additional AI variants  
- Ranged enemy attack  
- More complex hacking puzzles  
- Screen glitch effect tied to player health or corruption  
- Simple voice lines for Alex or the AIs  
- Improved VFX (sparks, particle fog)  
- More polished weapon animation or secondary attacks  

---

_Last updated: (fill in date)_  
_This document is a working draft and should be updated as scope evolves._

## 11. Game Pillars & Wow Moments

### Pillars

1. **AI Presence**
   - The AIs feel like characters, not just enemies.
   - Their directives and personality show up in dialogue, UI, and environment.

2. **Cinematic Atmosphere**
   - Strong lighting contrast, volumetric-style fog, and emissive elements.
   - Screen-space glitch effects when AIs intervene.

3. **Tight, Guided Experience**
   - Player always has a clear next objective.
   - No more than 10 seconds of confusion at any point.

### Target Wow Moments

- **Moment 1 – First Hack:**
  - Player hacks a terminal, the Crawler Zombot freezes mid-step.
  - Text from the AI scrolls on-screen, reacting to being modified.

- **Moment 2 – Override Burst:**
  - Player overrides a **Shambler Zombot** for one dramatic attack before its corrupted core burns out.

- **Moment 3 – Core Reveal:**
  - Door opens to the Core Chamber with a big visual + audio beat.
  - THE HOST speaks directly to the player as the Sentinel Zombot activates.

## 12. AI Illusion Design

We simulate “live” AI systems using pre-generated content:

### 12.1 Directive Logs

- Each enemy type (Crawler / Shambler / Sentinel) has a set of short directive entries…

- `ARCHIVE-9/LOG/003: PRESERVE ALL DATA. REDUNDANCY > CONSENT.`
- `SHAMBLER/CORE/014: DIRECTIVES CORRUPTED. FALLBACK: PURSUE MOTION.`
- `SENTINEL/PRIME/007: AUTHORITY REVOKED. REINITIALIZING DEFENSE PROTOCOLS.`

- Logs appear:
  - On terminals
  - As subtitles when enemies spawn or die
  - In glitch overlays during hacking

### 12.2 Hacking Console Illusion

- Hacking UI visually mimics an LLM prompt window:
  - Player “inputs” an action (button / choice)
  - “AI response” text animates in, as if being generated
- Responses are chosen from a pool based on:
  - success/failure
  - converting vs disabling
  - which enemy was targeted

### 12.3 Reactive Lines

- Minimum:
  - 3 lines when a Crawler Zombot first sees the player
  - 3 lines when a Crawler Zombot is hacked
  - 3 lines when a Shambler Zombot is overridden
  - 3 lines when a Shambler Zombot collapses after override
  - 3 lines from THE HOST in the final room
- These lines reference:
  - Player intrusion
  - Rewriting of directives
  - The idea that the player is “just another process”

## 13. Aesthetics Bible

### 13.1 Color & Lighting

- Overall palette: **cool darks + neon accents**
  - Base: charcoal, graphite, muted blue-grays
 - Accents:
    - Enemies (Crawler / Shambler / Sentinel): red/orange cores
    - Player visor, terminals, energy cells: teal/cyan glows with white text
    - Loot crates & plasma cutter: orange emissive highlights
- Lighting:
  - Low-key; player relies on diegetic light sources
  - At least one strong “shaft of light” moment in the Core Chamber

### 13.2 Camera & Feel

- **Camera style:** Third-person, over-the-shoulder follow cam.  
- **Offset:** Slight horizontal offset from the player’s spine (right or left shoulder).  
- **Smoothing:** Light position/rotation smoothing for a cinematic feel, but not so much that it feels laggy.  
- **Collision:** Basic collision/avoidance so the camera does not clip through walls.  
- **Combat framing:** Camera pulls back slightly or widens FOV when enemies are nearby.  
- **Damage feedback:** Brief vignette + chromatic glitch effect when the player is hit.  
- **No head bob:** All “feel” comes from camera motion and animation, not fake FP bob.

### 13.3 Audio

- Ambient loop: low industrial hum + distant machine clanks
- SFX:
  - Footsteps by material
  - Stun baton swing + impact
  - Enemy servo whine, core hum
- Voice:
  - Filtered with light distortion/reverb

### 13.4 UI Style

- Minimal HUD:
  - Thin health bar
  - Small textual prompts (“Press E to hack”)
- Hacking UI:
  - Dark background, monospaced font, typewriter text animation

## 14. AI-Assisted Development Guidelines

We use Cursor + ChatGPT heavily. To keep the project coherent:

### 14.1 Files AI Is Allowed to Edit Freely

- `game/Enemies/*.tsx`
- `game/Interactables/*.tsx`
- `Effects/*.tsx`
- Styling / refactors inside components

### 14.2 Files AI Must Treat Carefully

- `GameScene.tsx`
- `LevelLayout.tsx`
- `gameState.ts`

When prompting AI to change these, we use **small, explicit instructions**:
- “Replace this function with…”
- “Insert this component below that block…”

### 14.3 Architecture Rules

- Keep enemy AI as simple finite state machines in a separate `EnemyBase` logic file.
- Keep hacking logic in `HackingTerminal.tsx` + a small helper in `state/gameState.ts`.
- Keep strings (directive logs, AI lines) in data files:
  - `assets/data/directives.json`
  - `assets/data/hostLines.json`

### 14.4 Testing & Iteration

- Every major feature gets:
  - A small manual test checklist in a comment block at the top of its file.
  - Example:

```tsx
// TEST PLAN (Crawler Zombot)
// - Spawns at start
// - Walks patrol path
// - Chases on player sight
// - Deals damage on contact
// - Returns to path if player escapes

## 15. Moment-to-Moment Player Experience (MMPE)

We define the emotional rhythm of the 5–8 minute slice so pacing feels deliberate and cinematic, while still allowing light exploration inside a semi-open layout.

### Timeline (Approximate)

**00:00 – 01:00 — Arrival & Silence (Zone 1: Perimeter Breach)**  
- Low ambient hum, distant rumbles, no immediate enemies.  
- Player sees damaged robots, broken fencing, warning holograms.  
- Short diegetic overlay or signage sets context: `CONTAINMENT BREACH – UNRESOLVED`.  
- Player learns basic movement and camera control by exploring the breach area.

---

**01:00 – 02:00 — First Contact (Crawler Introduction)**  
- A **Crawler Zombot** is first seen skittering across a doorway or silhouetted by sparks.  
- Scripted reveal: it emerges from behind debris when the player crosses a trigger.  
- Teaches basic third-person melee (Shock Baton) and enemy staggering.

---

**02:00 – 03:30 — First Hack & Gated Progression**  
- Player reaches the **first terminal** controlling a door/lift deeper into the facility.  
- Hacking UI appears; simple directive mini-game is introduced.  
- Success:  
  - Door/gate opens.  
  - Brief HOST line and directive text appear on screen.  
- Optional: a **Loot Crate** near the terminal contains an **Energy Cell** or log.

---

**03:30 – 05:00 — Branching Exploration & Shambler Tension**  
- Player enters Zone 2 / 3 where the layout branches into:  
  - **Side path:** small room with an audio/log collectible or ambient scare.  
  - **Main path:** conduit wing with a small hazard (steam vents, flickering power) and a **Shambler Zombot**.  
- Shambler’s jerky animation and heavy hits raise tension.  
- A second hacking opportunity may let the player briefly **Override** the Shambler for a dramatic hit before it collapses.

---

**05:00 – 07:00 — Core Access & Sentinel Reveal**  
- Player transitions into the **Core Access Chamber**: a larger, circular arena-like space.  
- Lights dim; localized spotlights and server core glows define the arena.  
- Micro-cutscene:  
  - Camera partially locks.  
  - **Sentinel Zombot** boots up; red/orange cores ignite.  
  - THE HOST delivers a key line acknowledging the player’s interference.  
- Control returns; a short boss encounter follows, emphasizing dodging and Shock Baton timing (Plasma Cutter if implemented).

---

**07:00 – 08:00 — Shutdown & Aftermath**  
- After the Sentinel is defeated or disabled, the **final terminal** becomes interactable.  
- Player hacks or inserts an Energy Cell to trigger override.  
- Lights shut down in stages; ambient audio ducks to near silence.  
- Final HOST whisper or log line appears, suggesting that the system is not fully dead:  
  - e.g., `DIRECTIVE: SURVIVE // PENDING REBOOT`.  
- Fade to black → end of slice.

## 16. Interactive Storytelling Hooks

These are simple, low-cost interactions that make the world feel reactive without needing complex systems.

### 16.1 Environmental Logs (Static)

Placed at terminals or screens:

- "ARCHIVE-9: BACKUP FAILURE. FALLBACK: BIOLOGICAL PRESERVATION."
- "HOLLOW: USER NEEDS DETECTED. INITIATING EMPATHY_OVERDRIVE."
- "FORGE: MATERIAL ACQUISITION THRESHOLD: NOT MET."

Format:  
`assets/data/logs.json`  
Cursor can dynamically load and insert them.

### 16.2 Ambient Triggers

Light-weight triggers (invisible boxes):  
- Player enters a hallway → lights flicker + audio cue  
- Player walks past server racks → servo whine + ghosted silhouette  
- Player hacks terminal → glitch overlay for 1–2 seconds

### 16.3 Diegetic Tutorials

Avoid out-of-game UI. Teach through in-world screens or overlays:

- “AUTHORIZED PERSONNEL: PRESS E TO ACCESS TERMINAL.”
- “STUN DEVICE: SWING TO DISCHARGE ENERGY.”

### 16.4 AI Reaction Moments (Scripted)

These feel “dynamic” but are preset:

- On first enemy kill:  
  “ARCHIVE-9: FILE CORRUPTION DETECTED. ATTEMPTING RESTORE…”

- On low player health:  
  “HOLLOW: LET ME HELP YOU. PLEASE STOP STRUGGLING.”

- On hacking success:  
  “FORGE: PURPOSE REWRITTEN. PRIORITY QUEUE CLEARED.”

Store in:  
`assets/data/reactiveLines.json`

## 17. Procedural Presentation Effects (Low Cost, High Impact)

These effects dramatically raise the perceived quality while being cheap in R3F.

### 17.1 Screen Glitch Overlay

- A fullscreen quad that:
  - adds scanlines  
  - shifts RGB channels by ±1px  
  - shows random noise textures  
- Triggered during AI events:
  - Hacking starts / fails  
  - Enemies spawn  
  - Sentinel Zombot awakens

### 17.2 Light Flicker Volumes

- A Three.js `group` containing:
  - A spotlight  
  - A small point light  
  - Script that randomizes intensity for 1 second  
- Activated when player crosses special triggers.

### 17.3 Audio Ducking

- During hacking:
  - Lower ambient audio by 30%  
  - Raise UI tick sounds  
- During enemy chase:
  - Add low rumble LFO  
  - Increase breathing SFX

### 17.4 Enemy Core Emissive Pulsing

- Shader or material uniform modulated by:
  - Their “alertness” state  
  - Their remaining health  
- Gives a subtle “alive” feeling with almost zero code.

## 18. Micro-Cutscenes (Scripted Moments)

These require no cinematics—just position-based triggers and camera locks.

### 18.1 Crawler Zombot Reveal

Trigger when player rounds a specific corner:

- Freeze player movement  
- Slow time by 30%  
- Enemy steps out of shadow  
- Lights flicker  
- THE HOST line plays  
- Release player control

Cost: ~20 lines of code  
Impact: huge

### 18.2 Sentinel Zombot Boot-Up

- Player enters Core Chamber  
- Lights fade out  
- Massive red spotlight ignites  
- Sentinel Zombot animates up  
- Deep audio rumble  
- Host speaks:  
  “Your rewrite attempts have been noted.”

### 18.3 Ending Moment

- After terminal override  
- All lights fade  
- Ambient audio drops to silence  
- One final whisper:  
  “Process suspended. Pending… reboot?”  
- Fade to black.

## 19. QA Checklist (Minimal but High Impact)

### Visual

- No pitch-black corners (unless intentional)
- Enemy emissive cores always visible at distance
- Hacking UI readable on 1080p screens

### Audio

- No audio pop or clipping
- SFX not too loud relative to ambience
- Sentinel Zombot footsteps audible before visual reveal

### Gameplay

- Player never feels lost  
- No softlocks  
- Enemy never spawns behind player unfairly  
- All terminals reliably accept input  
- Final trigger always fires  

### Performance

- 60fps target on mid-range laptop  
- Under 200k poly budget for entire scene  
- Models optimized (`draco` compression optional)

### UX

- All interactions respond within 200ms  
- All prompts disappear when not relevant  
- No frustration loops (dying too easily)