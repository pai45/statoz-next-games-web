# Rally Dash

Rally Dash is the rally remake of Grand Prix Dash. It plays at `/play/rally`, and the old `/play/grand-prix` address opens the same game. The host still knows it by the game id `grand-prix-dash`, so registry entries, history, discovery links and tests stay stable. Everything inside the game is rally-owned: stages, crews, saves, art and sound.

Code: `src/features/games/rally-dash/` (in-app, loaded by `game-launcher.tsx` with `next/dynamic`). It is not a bundle game.

## Modes

- **Stage Attack**: one run around a stage against the clock. There are three split checkpoints (green or red against your best), bronze/silver/gold target times, and a translucent ghost of your best run. Retry is instant (Backspace, Enter on the result card, or the button).
- **Rallycross**: six cars, three or five laps. The player starts fourth. Rival levels are Rookie, Pro and Legend. A podium earns a medal.
- **Driving school**: four prompts on Pine Ridge (gas, steer, handbrake, finish). It is offered on the home screen until it has been completed once.

Setup is one screen: stage carousel, crew, laps and rivals (Rallycross only), two assists, and GO. **Quick start** on the home screen repeats the last setup in one tap.

## Handling

`simulation.ts`, `drive()`:
- The heading turns first. The velocity is then re-read in the new heading frame, so turning creates sideways slip.
- Each surface decides how fast that slip dies away, and how much of it turns back into forward speed (`GRIP` in `stages.ts`). Tarmac grips, gravel and sand slide, snow slides more, and ice the most.
- The **handbrake** cuts rear grip and adds yaw, which swings the car round hairpins.
- A slip limit stops spins, so drifts stay forgiving.

Other features:
- **Jumps** launch the car for 0.25–0.8 s depending on speed. Steering does nothing in the air.
- **Splashes** slow the car and throw spray.
- **Stage edges**: trees, rocks, walls and snowbanks have their own distance and hardness.
- **No invalid laps.** Ordered gates still make teleports and shortcuts worthless, and Recover (R) puts the car back on the road.

## Pace notes

`pace-notes.ts` reads the notes from the road itself:
- Each bend is graded by its tightest radius, from 1 (hairpin) to 6 (nearly flat). Turns over 130° at grade 1–2 are hairpins.
- Jumps, splashes and the start of ice get their own calls.
- The HUD always shows the next call with its distance, plus the one after when it is near. Each new call plays a two-tone blip, which can be switched off.

## Stages

There are five fictional closed loops, about 1.9–2.2 km each:

| Stage | Surfaces | Features | Gold / silver / bronze |
|---|---|---|---|
| Pine Ridge | gravel, tarmac | splash, jump | 60.5 / 64.5 / 72.5 |
| Red Mesa | tarmac, sand, gravel | two jumps | 61.5 / 65.5 / 74 |
| Frostvale | snow, ice | jump | 74 / 79 / 89 |
| Harbour Hill | tarmac, gravel | crest jump | 57.5 / 61 / 68.5 |
| Mudbank Farm | tarmac, gravel, mud | splash, jump | 64.5 / 68.5 / 77 |

**Medal targets** are calibrated against headless autopilot runs:
- Gold is about the best autopilot time (pace 1.02).
- Silver is about 4% over a clean run (pace 0.97).
- Bronze is about 12% over a relaxed run (pace 0.9).

`tests/rally-dash.test.ts` fails if a clean autopilot run stops landing between gold and bronze, so recalibrate the targets after any handling change.

**Rival pace**: Rookie 0.80, Pro 0.86, Legend 0.94 of the braking-aware target speed. Measured with the autopilot driving your car, over 10 races per level:
- Rookie is beaten by a decent driver.
- A very good driver wins about 40% of Pro races.
- Legend was never won from fourth on the grid, even by the near-perfect autopilot. It is meant for experts.

## Look

The game owns its art direction; there is no StatOz design system inside it:
- **Palette**: warm black `#1B1714`, cream `#F6EEDC`, rally orange `#FF5B14`, stage-board yellow `#FFC629`.
- **Panels**: sticker-style, with cream outlines and hard offset shadows.
- **Type**: Rubik Dirt for the wordmark and stage names; Barlow Condensed for the HUD and UI.

**Camera**: the chase camera keeps the car pointing up and blends heading with travel direction in drifts. A fixed north-up map view is in Settings.

**Scenery** uses fake 3D height: each layer is pushed away from the camera centre in proportion to its height. Tree canopies, roofs, boulders and cactus tops are drawn above the cars, and a canopy fades when your car is under it.

**Effects**:
- Dust, snow and spray are soft irregular cloud sprites (pre-rendered, drawn with `drawImage`), not solid circles. Sparks, debris, mud clods and droplets are small crisp chips.
- Tyre tracks: each rear wheel keeps its own last point, and a gap over 3.5 units (off screen, recovery, jumps) starts a new track instead of drawing a straight line across it. Older marks fade in three steps.
- Surface changes have flat ends plus a ragged blend: patches of each surface intrude into the other, and loose material is carried along the wheel tracks onto the next surface. Loose road shoulders are uneven; tarmac stays crisp.
- Puddles are clusters of wobbly pools with a muddy rim, a deep-to-shallow gradient, clipped sky reflections and a lit outer shoreline. Cars passing through throw droplets and leave ripple rings.
- Jump scale and shadow, screen shake on landings and crashes (off with reduced motion), and dirt that builds up on the car.

In Rallycross, rivals vanish into dust, but your own car always draws on top of it.

**Lobby**: a live attract mode behind it, with rival crews racing the selected stage on the real renderer at 1× resolution and 30 fps. It pauses when hidden and shows a still frame under reduced motion.

## Mobile

Phones are the main target. The game runs inside the host's landscape frame, so it is always laid out sideways.

- **Layout**: sizes follow the screen height (the short side), with 44 px minimum touch targets and safe-area padding. Home, event and dialogs fit without page scrolling from 640×360 upwards; the start button is always visible. Only a genuinely portrait window stacks and scrolls.
- **Controls**: the left thumb uses a slide-to-steer pad (`SteerPad` in `ui.tsx`). Thumb position is the steering angle: the ends are full lock, the middle is straight, and anything between is partial. The right thumb has BRAKE and HANDBRAKE, plus GAS when auto gas is off. On the first visit from a touch device, auto gas starts on.
- **Feel**: the camera is closer on short screens and the car sits lower, to keep the view ahead. Optional vibration on landings, bumps, crashes and medals (where the browser supports it). The screen stays awake while racing (Wake Lock) and is released on pause or finish.
- **HUD**: icon buttons (recover, sound, pause); compact standings (top three plus you), so nothing reaches the controls; hints say "tap ↺" on touch and "press R" on a keyboard.
- **Checked sizes**: 667×375 (iPhone SE), 740×360 (small Android), 844×390 (iPhone 14), 932×430 (Pro Max), iPad 1180×820 and desktop 1440×900.

## Performance

These numbers come from Chrome with the GPU on, using a `requestAnimationFrame` loop, a Rallycross field, 600 frames, and the old Grand Prix Dash renderer measured in the same harness. Both held 75 fps (13.3 ms per frame).

| | Grand Prix Dash | Rally Dash |
|---|---|---|
| JS per frame, phone 844×390 @3× (step + draw) | ~2.6 ms | ~1.5 ms |
| JS per frame, desktop 1440×900 | ~2.3 ms | ~1.9 ms |
| Ground cache memory | 27.8 MB, fixed | 12–18 MB, sized to the view |
| Ground sharpness | 2 px per world unit | up to 4 px per world unit |
| Start-up (renderer + session) | 44–134 ms | 22–36 ms |
| HUD updates | whole race screen re-rendered every 90 ms, rebuilding a ~500-point SVG minimap | only the HUD subtree, at 10 Hz |
| CSS | 1,946 lines | 295 lines |

**How the new version gets there:**
- **Ground**: 512 px tiles painted only when needed (at most two per frame once racing) and dropped when off screen.
- **Scenery**: a spatial grid, with only visible props drawn.
- **Effects**: particles and tyre marks live in fixed typed-array pools, drawn in batches by colour.
- **Simulation**: the AI target speed and the surface are precomputed per road sample, and 6 cars give 15 contact pairs where 20 cars gave 190.
- **Canvas**: the context is opaque, and size changes come from a `ResizeObserver`.
- **Idle**: nothing is stepped or drawn while paused, finished or on the intro card.
- **Adaptive quality**: if frames stay above 11 ms for 2 s, resolution and particle count drop once.

**Live counters**: `?clock=manual` together with `window.__RALLY_DASH_INSPECT__` exposes `snapshot()`, `advance(ms, held | 'auto')`, `autopilot(on)`, `zoom(factor)` and `perf()`.

## Saves

- **Key**: `statoz.games.web.rally-dash.v1`, listed in `auth-session.ts` for account switching.
- **Contents**: setup, best time, splits, ghost and medal per `stage:assists` key, and the 12 most recent results.
- **Protection**: unknown versions are kept read-only, blocked storage falls back to memory for the visit, and each result is stored once.
- **Old saves**: the Grand Prix Dash keys (`statoz.games.web.grandprix.v2` and `.v1`) are never read, migrated or removed, because their tracks and physics no longer exist.
- **Profile**: XP still reads the legacy Grand Prix progress through `game-career.ts`. Rally Dash results do not feed the profile yet.

## Assets and sound

- Cars, stages, scenery, effects and the HUD are drawn procedurally in code.
- **Cover**: `public/assets/games/rally-dash/cover.webp`, rendered from the game by `scripts/render-rally-dash-cover.mjs` (needs a running dev server).
- **Catalog tile**: `scene.svg`, generated by `scripts/render-rally-dash-scene.ts` from the car paths in `art.ts`, using the host's tile palette. The shared motorsport discovery family, also used by Racer and Apexbreak 3, is unchanged.
- **Sound**: WebAudio synthesis only. There are two detuned oscillators with gear-shift pitch for the engine, filtered noise for gravel and tyre squeal, and short cues for the countdown, crashes, landings, splashes, splits, pace notes and medals.
- **Fonts and records**: fonts are OFL 1.1 (Fontsource 5.3.0) with their licences in `rally-dash/fonts/`. Hashes for the fonts and art are in `public/assets/games/rally-dash/PROVENANCE.json`, and the unit test checks them.

## Checks

```
npm run test:rally-dash                     # stages, handling, jumps, gates, both modes on every stage, medals, ghosts, saves, registry, provenance
npm run test:rally-dash:browser             # desktop, two phone sizes and an upright phone: keyboard, slide steering, handbrake, auto gas, controls clear of the HUD, tyre tracks never bridge gaps, both modes to results, saves, old route
npm run test:rally-dash:browser -- --url=http://localhost:3000
```

Screenshots and `checks.json` are written to `test-results/rally-dash/`.

**Not yet verified**: real phones (touch feel and thermal behaviour) and a listening pass on real speakers.
