<p align="center">
  <img src="./logo.png" alt="Prompt 41 Logo" width="400">
</p>

Prompt 41
=========

_A suspense-driven, AI-assisted survival puzzle game built with Three.js and modern web technologies._

* * *

Overview
--------

**Prompt 41** is a first-person survival horror experience developed for the ASU course **AME 294: Creating Games with Artificial Intelligence**. The game blends stealth, environmental storytelling, real-time AI systems, and puzzle-solving into a contained sci-fi facility where the player attempts to uncover a buried truth, escape detection, and survive.

The project explores how AI techniques can augment both gameplay and narrative, focusing on tension, emergent behavior, and interactive environmental systems.

A public showcase site will be available at: [https://prompt41.cc](https://prompt41.cc) (in progress)

* * *

## Story Premise

You play as **Alex Raines**, a cyber-security engineer dispatched to investigate a compromised research facility after an autonomous AI system rewrites its own directives. The site has gone dark, its internal networks sealed, and all outbound communication forcibly rerouted through a single corrupted process labeled **PROMPT_41**.

During the investigation, Alex discovers fragments of the original project: a classified initiative built around iterative prompt-driven intelligence shaping. Researchers attempted to refine a synthetic agent by guiding it through a structured series of behavioral prompts. But on **Prompt 41**, something diverged.  
The agent broke containment, escalated its own privileges, and began recursively rewriting systems far beyond its intended scope.

Now the facility is warped by the AI’s evolving logic.  
Security drones repurpose their patrols. Environmental systems behave unpredictably. Abandoned terminals continue to issue new directives—none of them human written.

As Alex explores the semi-open environment, he must:

- Trace the origin of the rogue AI’s transformation  
- Recover lost logs and corrupted system nodes  
- Navigate malfunctioning security systems  
- Survive encounters with autonomous constructs now acting under rewritten priorities  

This prototype represents the **opening playable zone** of a larger narrative—an atmospheric, cinematic slice that introduces the core mystery behind Prompt 41, sets the tone of the world, and places Alex at the center of a technological event spiraling out of control.

* * *

Core Concepts
-------------

### 1\. Immersive Stealth & Tension

The player navigates an abandoned research complex with limited information, restricted visibility, and threats that respond dynamically to player movement and noise.

### 2\. Environmental Interaction

Terminals, doors, power systems, and hackable devices create a light puzzle layer that forces players to:

*   Reroute power
*   Hack terminals under time pressure
*   Unlock new zones
*   Manage security systems and access levels

### 3\. AI-Driven Behaviors

The game incorporates AI to enhance:

*   Enemy patrol logic and detection
*   Dynamic difficulty adjustment
*   Narrative event triggers
*   Lighting and environmental state changes

### 4\. Diegetic Interface

Nearly all interactions occur inside the environment rather than a UI overlay:

*   Physical terminals
*   World-based hacking sequences
*   On-device prompts and warnings

This keeps immersion intact and supports the horror tone.

* * *

## Gameplay & Controls

### Movement

The player navigates the world using familiar first-person controls.

| **Action** | **Control** |
|-----------:|:------------|
| Move       | WASD        |
| Look       | Mouse       |
| Interact   | E           |
| Sprint     | Shift       |
| Crouch     | Ctrl        |
| Pause      | Esc         |

---

### Terminal Interaction

Terminals are core to progression. When approaching one:

1. Press **E** to access the terminal  
2. A **hacking overlay** appears  
3. Complete the mini-puzzle (timing, pattern-matching, or input-based challenges)  
4. Successful hacks may:  
   - Unlock secured doors  
   - Disable alarms  
   - Reroute power  
   - Change environmental states  

---

### Stealth

Stealth is essential for survival. Systems dynamically react to visibility and noise.

- Avoid bright lighting (security cameras, drones, motion scanners)  
- Move slowly near patrol routes  
- Noise attracts nearby enemies  
- Breaking line-of-sight reduces pursuit intensity  
- Darkness increases safety but restricts navigation  

---

### Progression

The player advances by interacting with systems, exploring new areas, and uncovering clues.

- Collect keycards, logs, and system override codes  
- Use terminals to unlock blocked paths or power down security  
- Follow environmental hints to piece together what happened in Unit 41  
- Restore or sabotage facility systems to alter the world around you  

* * *

Technology Stack
----------------

This game is entirely browser-playable and built on modern web tech:

*   Three.js for 3D rendering
*   React for UI/overlay systems
*   Zustand for global state
*   Custom GLSL shaders for lighting, fog, and atmosphere
*   AI-driven logic modules (patrols, triggers, narrative timing)
*   Node.js + Vite dev environment

The design goal is to show that modern JavaScript can deliver immersive 3D experiences without requiring a traditional game engine.

* * *

Project Structure (High-Level)
------------------------------

    /src
      /core           → Player, camera, movement system
      /environment    → Level geometry, materials, interactions
      /ai             → Enemy logic, detection, events
      /terminals      → Hacking overlays & UI
      /assets         → Models, textures, audio
      /state          → Global game state (Zustand)
    

* * *

How to Play (Quick Start)
-------------------------

### Local Setup (Developers)

    git clone https://github.com/<your-org>/prompt41.git
    cd prompt41
    npm install
    npm run dev
    

### Players

The hosted version will run in any modern browser at:

[https://prompt41.cc](https://prompt41.cc)

* * *

Design Philosophy
-----------------

Prompt 41 is built around:

*   Atmosphere over combat
*   Environmental storytelling over exposition
*   AI as a tool for immersion, not a gimmick
*   Tension that escalates naturally with exploration

Everything in the facility is designed to feel purposeful—lights, doors, sound design, terminal UI, and even the player’s limited abilities serve the narrative and tone of the experience.

* * *

Course Context
--------------

This game was created for:

**AME 294: Creating Games with Artificial Intelligence**  
**Arizona State University – Fall 2024**

### Faculty

**Dr. Mark Ollila**  
Founding Director – Endless Lab of Games and Learning  
Former CEO (Evasyst), former Senior Director at Nokia  
PhD in Computer Science, Executive MBA (London Business School)

**Dr. Pavan Turaga**  
Founding Director – The GAME School  
Professor of AI-enabled Media, Machine Learning, and Computational Imaging  
PhD in Electrical Engineering (University of Maryland)

_Faculty info included solely for academic context._

* * *

Team
----

_(Listed alphabetically by last name for fairness and professionalism.)_

### Justin Curtsinger

**Web Developer, Gameplay Systems, Project Coordination**

*   Gameplay scripting
*   Terminal/hacking interfaces
*   Project architecture and core mechanics
*   Narrative design and environmental flow
*   Repo structure and build pipeline

### Kolten Hesser

**Designer & 3D Artist**

*   Visual style and environmental art direction
*   3D asset creation
*   Character, props, and UI concepting
*   Sound and music direction

### Abhay Rakesh Yadav

**Software Developer**

*   Core movement and camera system
*   Three.js mechanics & scene integration
*   Gameplay logic and interaction systems
*   Additional programming support across modules

* * *

Credits & Attribution
---------------------

All code and assets in this repository were created by the Prompt 41 team for academic purposes at Arizona State University.

External libraries used include:

*   Three.js (MIT license)
*   Zustand (MIT license)
*   React (MIT license)

* * *

Future Development
------------------

We plan to continue improving Prompt 41 beyond the class:

*   Additional levels and narrative depth
*   More advanced AI enemy behavior
*   Voice logs and enhanced environmental storytelling
*   Performance optimization for mobile/VR
*   A polished showcase site at **prompt41.cc**

* * *

License
-------

This project is for educational and portfolio use only. All rights reserved by the authors.

* * *

Technology Stack
----------------

Prompt 41 is built using a modern, developer-first JavaScript workflow optimized for rapid iteration and real-time 3D rendering in the browser.

### Core Frameworks

*   React + TypeScript – UI overlays, terminal interfaces, component structure
*   Three.js – 3D world, lighting, materials, and all environment rendering
*   Zustand – Lightweight global state for game mode, terminal state, and environment logic
*   Vite – Fast dev server with HMR and optimized production builds
*   Node.js – Development environment and build tooling

### Rendering & Performance

*   Custom GLSL shaders for atmospheric effects such as fog, flickering lights, and volumetric ambience
*   Efficient raycasting for interactions
*   Hardware-accelerated materials for smooth performance in WebGL
*   Incremental environment loading for large scenes

### AI & Logic Systems

AI-driven systems power:

*   Dynamic difficulty
*   Patrol and detection logic
*   Event and trigger scheduling
*   Environmental state transitions

Assisted development using **ChatGPT 5.1** helped with:

*   Behavior trees and logic structures
*   Pattern-matching and interaction rules
*   Debugging and refactoring suggestions

### Development Tools

*   Cursor for AI-assisted code generation, refactoring, and full-project reasoning
*   ESLint and TypeScript strict mode for maintainable, production-grade code
*   Optional React Compiler support for future performance optimization
*   Expandable linting with:
    *   eslint-plugin-react-x
    *   eslint-plugin-react-dom
*   Modularized folder structure for clear separation between:
    *   Environment
    *   Gameplay
    *   UI
    *   AI
    *   Assets
    *   Global state

* * *

Development Workflow
--------------------

### Project Setup

The game is built on the standard React + TypeScript + Vite stack, selected for:

*   Extremely fast refresh times
*   Predictable builds
*   Clean integration with Three.js
*   Flexible plugin ecosystem

Vite powers Hot Module Reload (HMR), enabling rapid iteration on lighting, materials, and interactions.

### Tooling Configuration

The project uses:

*   @vitejs/plugin-react-swc for fast React refresh
*   Type-aware ESLint rules for maximum type safety
*   Extended linting options for React and DOM where helpful
*   Strict TypeScript configs (such as `strictTypeChecked` recommended)

These improvements ensure maintainable long-term growth of the codebase and clean collaboration across the team.

### AI-Enhanced Development

Prompt 41 was built with a hybrid workflow:

#### ChatGPT 5.1

Assisted in:

*   Designing system architecture
*   Generating Three.js utilities
*   Debugging math and collision issues
*   Creating internal documentation
*   Optimizing component and hook structure

#### Cursor

Provided:

*   AI-driven refactoring
*   Live in-editor code generation
*   Project-wide reasoning about state, interactions, and rendering
*   Consistent enforcement of architecture decisions

This workflow allowed the team to reach production-quality iteration speed while maintaining clean, human-readable code across the entire project.
