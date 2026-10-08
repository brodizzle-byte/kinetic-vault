# Kinetic Vault 🗝️⚙️

> **Kinetic Vault** is a tactile, offline-first 3D mechanical puzzle mobile game built with **Three.js**, **TypeScript**, **Vite**, and **Capacitor**. Inspired by clockwork cryptexes, antique bank vault strongboxes, and puzzle box classics (*The Room*, *The House of Da Vinci*).

---

## 🏛️ Key Features

- **Offline-First Mechanical Architecture**: 
  - Complete procedural audio synthesis via the Web Audio API — zero external `.mp3` or `.wav` dependencies.
  - Procedural Canvas PBR material generator: brushed brass, gunmetal iron, dark obsidian, and graduated dial faces generated directly in memory.
  - Service Worker cache (`public/sw.js`) and PWA Web Manifest (`public/manifest.json`) for seamless zero-network gameplay.
- **Physical & Mathematical Kernels**:
  - `kinematics.ts`: 1D linear slider track constraints, 1D rotational dial constraints, detent ratchet snapping, and 2nd-order `SpringDamper` harmonic oscillator physics ($f = -k \cdot x - c \cdot v$).
  - `raycaster.ts`: Touch-occlusion-compensated 3D raycasting, tangential screen-space dial rotation calculations, and rail vector projections.
  - `gear_train.ts`: Pitch circle mesh calculation, tooth ratios, backlash modeling, and compound BFS gear transmission.
  - `optical.ts`: 3D laser ray-tracing through rotating prism mirrors, computing reflection vectors ($\vec{r} = \vec{d} - 2(\vec{d}\cdot\vec{n})\vec{n}$) and photoelectric sensor activation.
- **Mobile-Native Haptic Integration**:
  - Multi-tier tactile feedback powered by `@capacitor/haptics` with fallback to `navigator.vibrate`:
    - `tick`: Crisp detent notches on rotational dials and ratchet cogs.
    - `latch`: Medium mechanical snap on slider locks and drawer releases.
    - `heavyImpact`: Resonant thud on vault door openings.
    - `success`: Multi-pulse celebratory burst on puzzle completion.
- **3D Item Inspector & Inventory System**:
  - Collect mechanical tokens and tools into an interactive bottom dock.
  - Full-screen 3D Item Inspector modal: 360° touch rotation to examine hidden engravings and articulate mechanical sub-components (such as folding the articulated bit on the Brass Gear-Key).
- **Three Distinct Mechanical Vaults**:
  1. **Vault I: The Brass Crypt (The Mechanist's Strongbox)**:
     - Astronomical concentric cipher dials (Sun & Moon rings aligned to Roman coordinates).
     - Interlocking dual-bolt safety slider and spring-loaded secret drawer with pneumatic steam release.
     - Articulated brass keyway unlock, folding side panels, and ascension of the Alchemical Chrono Core.
  2. **Vault II: The Obsidian Reliquary (The Enigma Monolith)**:
     - 4-ring horizontal Cryptex tumbler deciphered from obsidian bezel runes.
     - 3-gear movable train linkage with sliding idler cog bridging the drive crank to the locking deadbolt.
     - Magnetic stylus labyrinth groove maze.
     - 4-petal origami pyramid blossoming open to reveal the floating Aether Relic.
  3. **Vault III: The Chrono Dynamo (The Steampunk Resonator)**:
     - Cross-coupled differential steam valves calibrated to harmonic pressure zones.
     - 3-turret optical laser prism alignment system with real-time beam reflection tracing.
     - 4-phase harmonic resonator lever sequencer.
     - Central steam turbine acceleration and ascending Chrono Dynamo Core.
- **Field Notebook & Progressive Hint System**:
  - In-game Journal with hand-drawn mechanical sketches and archivist lore.
  - 3-tier hint modal: Tier 1 (Subtle Whisper) → Tier 2 (Mechanical Guidance) → Tier 3 (Direct Solution).
- **Settings & Save Persistence**:
  - Audio SFX & Ambient Clockwork Drone volume controls, Haptics toggle, Camera sensitivity slider, Invert Orbit toggle.
  - Star ratings, move counters, and stopwatch timers stored locally in `localStorage`.

---

## 🛠️ Tech Stack

- **Runtime**: Vite 8 + TypeScript (Strict mode, `verbatimModuleSyntax`)
- **3D Graphics Engine**: Three.js (WebGLRenderer, PCFSoftShadowMap, ACESFilmicToneMapping)
- **Mobile Container**: Capacitor 7 (`@capacitor/core`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/app`)
- **Celebratory Particles**: `canvas-confetti` + procedural Three.js GPU particle system

---

## 🚀 Getting Started

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Capacitor Native Sync
```bash
npm run cap:build
```

---

## 📱 Mobile Native Setup

To package for Android or iOS with Capacitor:
```bash
npx cap add android
npx cap add ios
npx cap open android   # Launches Android Studio
npx cap open ios       # Launches Xcode
```
