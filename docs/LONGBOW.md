# Longbow

Longbow is an original 3D archery game at `/play/longbow`, in the Archery hub beside Archery Master
(`archery-test`). It shares no files with Archery Master. Its rules, levels, rival names, interface and most of its
scenery are original. It follows the genre's draw, aim and release conventions without copying any particular
game.

- **Orientation:** landscape only. On phones the shared `MobileGameViewport` rotates the iframe. If the game itself
  sees a portrait viewport, it pauses behind a "turn your device" notice.
- **Style:** its own look, following the `independent-game-style` rule in `AGENTS.md`: parchment panels, forest
  green, brass, wood-grain buttons, Barlow Condensed with a serif body. No StatOz tokens, cyber styling or chamfered
  panels.
- **Source:** `src/features/games/longbow/`
- **Runtime assets:** `public/games/longbow/`

## How it plays

**Controls**
- Press and hold anywhere on the range to draw. A full draw takes 0.6 s, and the view zooms in as you draw.
- Drag to move the sight, then let go to shoot.
- Keyboard: hold Space to draw, use the arrow keys or WASD to aim, release Space to shoot. Esc or P pauses.
- Releasing below 35% draw is a "dry release": no arrow is fired and a hint explains why. A partial draw above that
  is slow and drops low.

**Aim sway**
- When you start drawing, the sight wanders.
- About 0.5 s after full draw it settles for a 2.5 s steady window, and the sight turns green.
- After that the archer tires and the sway grows. The sight turns red.

**Sight and wind**
- The sight is zeroed for each lane. With no wind and a full draw, the arrow lands on the sight point.
- The skill is reading the wind (shown on the HUD) and leading moving targets.
- Wind is re-rolled every end of three arrows.

**Targets**
- A standard 122 cm face (radius 0.61 m) or a small face (radius 0.4 m).
- Ring 10 down to ring 1, with an X ring (inner half of the 10) for tie-breaks.
- Targets can be still, sliding on a rail, or swinging from a frame.

**Career**
- 30 lanes across Meadow, Pinewood and Red Canyon, at 15–90 m.
- Each lane has a set number of arrows (3, 6 or 9) and three star thresholds. One star clears a lane and opens the
  next.
- Twenty stars in a range open the next range.

**Duel a rival**
- Five ends, three arrows each, shooting in turn: 30 arrows in all.
- Highest total wins; X count breaks a tie.
- Three rivals:

| Rival | Title | Distance | Spread | Wind error |
|---|---|---|---|---|
| Wren Hollis | Village Rookie | 30 m | 0.2 m | 50% |
| Tamsin Rook | Forest Ranger | 50 m | 0.12 m | 25% |
| Odette Vale | Canyon Champion | 70 m | 0.075 m | 10% |

- Each rival unlocks after you beat the previous one.

**Feedback** (from the gamedev `game-feel` guidance)
- **Hit:** a thunk sound, the arrow quivering, a flash on the ring that was hit, a score pop-up, and a small camera
  shake on your own arrows.
- **Bullseye:** a predicted 10 plays in slow motion behind the arrow. Tapping skips it, and skipping never changes
  the result.
- **Reduce motion** (pause menu): turns off shake, flashes, slow motion, the arrow trail and cloud drift.

## Graphics

The renderer only draws the engine state and never changes it. `renderer.ts` (`LongbowView`) coordinates the
modules in `render/`:

| Module | What it draws |
|---|---|
| `sky.ts` | Original sky shader: gradient, horizon haze, sun glow and disc, drifting clouds. It also bakes the sky into the environment map that lights every material. |
| `post.ts` | High tier only: depth of field, the bow overlay, bloom, a per-range colour grade and the final output. Also the low tier's one-quad vignette. |
| `quality.ts` | The two tiers and the frame-time watch. |
| `target.ts`, `bow.ts`, `arrows.ts`, `scenery.ts` | Target rig, first-person bow, arrows and range scenery. |
| `textures.ts` | Canvas-generated textures: target face, straw, distance sign, contact shadows. |
| `common.ts` | Shared helpers and `LOOKS`, the art direction for each range: sky, sun direction and colour, fog, light and grade. |

**Light per range**
- **Meadow:** late morning.
- **Pinewood:** cool mist.
- **Red Canyon:** warm late-afternoon sun behind the archer, so the canyon walls throw their shadows along the sides
  and not across the lane.

The sun's shadow map is fitted to the whole field, from the archer to the backstop, in `fitShadow`. Every prop also
gets a soft contact-shadow decal, so it sits on the ground even without shadow maps.

**Depth of field**
- **Drawing:** focuses on the target and softens the rest as the bow comes to full draw.
- **Impact close-up:** blurs the backstop behind the target.
- **Slow-motion arrow camera:** blurs everything but the arrow.

**Quality tiers**

| | High (desktop) | Low (phones) |
|---|---|---|
| Chosen when | Default | Coarse pointer, or a short side under 500 px |
| Pixel ratio | ≤ 1.6 | ≤ 1.25 |
| Shadows | 2048 px PCF map fitted to the lane | Contact shadows only |
| Post-processing | Depth of field, bloom, grade, 4× MSAA | Vignette quad |

- A high-tier session drops to low if frames average over 22 ms for 3 s. This is judged by wall-clock time, not the
  game's time step.
- QA can force a tier by setting `window.__LONGBOW_QUALITY__ = 'high' | 'low'` before the game boots. A forced tier
  never drops.
- `__LONGBOW_INSPECT__.view()` reports the tier, draw calls and triangles for the whole frame.

## Simulation and saves

**Engine** (`engine.ts`)
- Pure TypeScript with no Three.js, stepped at a fixed 120 Hz.
- Arrows are semi-implicit Euler with gravity and linear drag towards the wind (`DRAG = 0.07`).
- Hits are tested on the segment travelled each step, so fast arrows cannot pass through a target.
- At release, the game pre-simulates the shot to decide whether to play the slow-motion camera.
- `tests/longbow.test.ts` checks that the same inputs give identical results at 30, 60 and 120 fps.

**Random numbers**
- A seeded LCG drives wind, sway and rival errors.
- Every arrow consumes the same number of random values. So a save stores only completed arrows and replays them to
  rebuild the exact state. A half-drawn or mid-air arrow restarts on reload.

**Save file**
- Key: `longbow.progress.v1`.
- The bundle host scopes `localStorage` per account (see `scripts/build-game-bundles.mjs`).
- `readSave` validates every field: level ids, star and score ranges, shooter order, ring scores and X consistency.
- An invalid or newer save is kept untouched, and that session plays without saving.

**Results**
- On a finish, a `result` event goes to the host with an id that is only sent once.

## Assets and licences

All third-party runtime files are **CC0**, and each was checked on its original source page. They are listed in
`public/games/longbow/PROVENANCE.json` (with SHA-256 hashes and byte sizes) and in `CREDITS.md`.
`npm run test:longbow` fails if a file changes or is added without a provenance entry.

| What | Source | Files |
|---|---|---|
| Rocks, boulder, stump, shrub, fern | Poly Haven | `models/*.glb` |
| Grass, forest floor and sand ground textures | ambientCG | `textures/*.jpg` |
| Bow release, arrow hits, arrow fly-by, meadow ambience | freesound (CC0 only) | `audio/*.mp3` |
| Barlow Condensed font | Google Fonts, OFL | `src/features/games/longbow/barlow-condensed.woff2` |

**How the files were prepared**
- **Models:** Poly Haven glTF models were packed into single GLBs. Meshes were simplified with `meshoptimizer` to
  about 2,400–3,000 triangles each. Colour textures were cut to 512 px and normal maps to 256 px. For foliage, the
  separate alpha map was merged into a PNG.
- **Audio:** the freesound previews are unchanged. The game plays measured slices of them.
- **Everything else is original:**
  - the bow, arrows, target faces, straw boss, stands and rigs, flags, trees, hay bales and mesas;
  - the sky and cloud shader, contact shadows and post-processing shaders;
  - the synthesized creak, thud and chimes.

  The post-processing chain uses three.js's own addons (MIT, covered by the three.js licence notice).
- **No runtime downloads:** the offline bundle (about 4.7 MB, including the cover) embeds every asset, so nothing is fetched remotely.
- **Kenney:** its site blocked automated downloads, so no Kenney assets are used.

## Commands

```bash
npm run test:longbow          # engine, levels, AI, saves, registry, asset provenance
npm run build:longbow         # writes public/embedded-games/longbow/index.html
npm run preview:longbow       # http://127.0.0.1:5256/fixture?account=qa
npm run test:longbow:browser  # fixture host + Chrome; evidence in test-results/longbow/
node tests/longbow-gallery.browser.mjs [--out=dir]   # all three ranges, desktop and phone, with draw calls,
                                                      # frame times and console warnings; default test-results/longbow-gallery/
npm run build:pages && npm run test:longbow:app   # exported product route; evidence in test-results/longbow-app/
```

Fixture options: `?account=<name>` gives isolated progress, and `&manual=1` uses a manual clock driven by
`window.__LONGBOW_INSPECT__.advance()`.

These checks run in desktop Chrome with touch emulation. Emulation does not replace a check on a physical iPhone and
Android phone. Before a release, confirm touch draw/drag/release, rotation, audio unlock and frame rate on real
devices.
