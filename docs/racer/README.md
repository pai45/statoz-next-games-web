# Racer

## Career (2 November 2026)

Career is the main menu's primary mode: twelve races across Rookie, Club and Grand Prix, with 36 stars available.
The first race is one lap of the original Starter Oval against three opponents. The field grows through 4, 5, 7,
9, 11, 13, 15, 17 and 19 opponents; the last two races run three laps. Meadow Loop, Club Circuit and Ridge GP are
original authored layouts, followed by the existing Silverstone GP circuit for races 9–12. Third place earns one
star, second two and first three. A podium opens the next race, without additional tier star gates; a podium in
race twelve completes career. Replays retain the best stars, position and time independently.

`career.ts` owns the campaign and defensive save parsing. `geometry.ts` builds and caches immutable per-circuit
track samples, gates, racing lines, barrier data and minimap geometry. Each race owns its circuit, grid size and
lap count. Quick Race defaults remain twenty cars and two Silverstone laps with selectable Rookie/Pro/Elite AI.
Career AI profiles interpolate from a forgiving rookie pace to Elite, without player-position speed boosts.
The renderer rebuilds for a changed circuit or field size, retaining the loaded Kenney kit and disposing replaced
scene resources. Motion interpolation, HUD, grids and diagnostics use the active field.

Progress uses `racer.career.progress.v1` through the existing account-owned bundle storage. It saves completed
attempts and the selected race, and resumes between races; an interrupted race restarts. Corrupt or newer saves
remain untouched and the session is temporary. Existing Silverstone records and settings retain their keys;
career never updates Quick Race records. Career host results include `mode: 'career'`, `stageId`, circuit,
configured laps and earned stars, once per completed race. Quick Race result fields remain compatible.

The three tier tabs show four races per page within a landscape viewport. The results offer Next Race, Retry,
Replay for Stars and Back to Career. No economy, upgrades, new asset downloads or publication are involved.
The implementation uses the installed router, level-design, game-ai, game-ui-ux, save-systems and
threejs-scene-setup skills, while retaining Racer's existing presentation.

Validation commands:

```sh
npm run test:racer                 # existing physics/reference tests plus all career stages
npm run test:racer:career          # campaign, save validation, geometry and full-field completion
npm run build:f1-racing            # local embedded bundle
npm run test:racer:career:browser  # isolated fixture, accounts, circuits, mobile menus and real-clock opening race
```

Career browser evidence is written to `test-results/racer-career/`. Browser touch emulation does not replace
physical iPhone/Android checks. No build or code is pushed by these commands.

The latest gameplay revision is grounded in the original build's extracted RCC controllers and named native race/AI code. See [mechanics evidence and adaptation decisions](crazy-grand-prix-mechanics.md). Player and CPU now share physical motion, gearing and pedal behavior; ordered route gates, finish-time classification, gear/RPM, rival order, minimap competitors and held rear view replace the earlier simplified race model. The source-shaped simulation remains an authored browser adaptation.

[Current validation](reference-validation.json) records 35 passing focused tests, the complete nineteen-CPU pack run, real-browser two-lap completion, pedal/phone/app checks and the matching production build. Earlier validation files remain historical. The timing stripe was shifted along the same Hamilton Straight so all ten starting rows launch on the straight. The preview launcher also waits for complete Next server manifests before starting.

31 October 2026. Local implementation; no release or push requested.

## Circuit boundaries, collisions and crashes (1 November 2026)

**Boundaries.** `engine.ts` builds a continuous barrier line on both sides of the lap, every 2 m, and the physics and renderer share it (`walls`, `wallLane`, `wallKind`):

| Where | Barrier | Kenney model | Offset from centreline |
| --- | --- | --- | --- |
| Start/finish straight | Painted concrete wall with catch fence | `barrierWall` + `fenceStraight` | 12.5 m |
| Outside slow corners (gravel traps) | Red/white tyre-wall blocks | `barrierRed`, `barrierWhite` | up to 22 m |
| Everywhere else | Guardrail | `rail` | 14.5 m |

Where two parts of the circuit run close together, the barrier moves to the midline between them. The two tightest hairpin apexes keep a grass island instead, because a wall there would fold back across the road. Tests check that no barrier sits on any tarmac. Marshal posts, flags and billboards stand behind the barriers, and the start gantry spans the concrete walls.

**Barrier physics.** A car is pushed back to the barrier face. The part of its velocity going into the wall is removed with a small bounce (restitution 0.28), and Coulomb friction scrubs the rest. A glancing hit (under 7 m/s into the wall) slides the car along the barrier and loses only a few percent of speed. A hard hit (over 10.5 m/s into the wall) spins the car out: drive and steering cut, the body rotates while the car keeps sliding along its old path, then grip returns. Route gates use the direction of travel, so a car that slides through a gate mid-spin still collects it, and gates count anywhere inside the barriers.

**Car-to-car contact.** Every pair is checked each 120 Hz tick:
- Overlapping cars side by side are separated.
- The closing velocity is exchanged along the contact normal (equal masses, restitution 0.35).
- Off-centre hits add yaw, so a hard hit on a rear quarter can spin a car.
- Nose-to-tail spacing still uses the existing traffic limiter, which keeps the "blocked travel" test exact.

**Damage.** Impacts add damage (0–100%), costing up to 15% power and 8% top speed for the rest of the race. Cars above 45% trail smoke. The HUD shows a damage bar, and the results screen shows damage and hits.

**Crash presentation.**
- Spark bursts and smoke puffs.
- Kenney Car Kit debris (tyre, spoiler, bumper, panels, door, bolt) painted in the crashed car's livery, with gravity, ground bounces and a fade-out.
- A body hop and rattle on impact, scrape sparks along barriers, and skid smoke and marks while spinning.
- Camera trauma, plus a 0.3× slow-motion beat for 320 ms on big player crashes.
- The camera follows the direction of travel during a spin, impact sound is scaled by distance, and barrier scrapes have a synthesised scrape sound.
- Call-outs: SPUN OUT, BIG HIT · BARRIER, HEAVY CONTACT / CONTACT · rival.

## Kenney kit, race-craft and presentation pass (1 November 2026)

Racer no longer loads the recovered Crazy Grand Prix meshes. Cars, grandstands, pit garages, the start gantry, billboards, tyre barriers, marshal posts, tents and trees come from Kenney's **Car Kit 3.1** and **Racing Kit 1.2**; engine, skid and impact sounds come from Kenney's **Starter Kit Racing**. All are CC0, downloaded from Kenney's own uploads (opengameart.org and github.com/KenneyNL, because kenney.nl refuses automated downloads) and served locally from `public/games/f1-racing/kenney/`. `node scripts/import-racer-kenney.mjs --source <folder>` packs the chosen models into `racer-kit.glb` and writes `PROVENANCE.json` with page URLs, zip hashes and file hashes. `npm run test:racer` checks those hashes. Every banner slot shows newly drawn StatOz CIRCUITS signage, not Kenney's fictional sponsor. `assets.json` and `docs/racer/asset-provenance.json` remain only as history.

See [improvement-plan.md](improvement-plan.md) for the full review, what was built in this pass and what is suggested next. In short:

- **Mechanics:** a five-light start with a perfect-launch window (gas on the fifth light gives +15 boost and a rolling start; holding gas earlier gives wheelspin), boost rewards for overtakes that gain new ground, and kerb and skid state used for feedback.
- **Opponent AI:** a racing line limited by each corner's radius; side-aware passing with clearance checks; one-move defending on straights; side-by-side spacing so CPUs never squeeze a neighbour; seeded, replayable driver mistakes; CPU boost and slipstream under the player's rules; and Rookie/Pro/Elite rival skill. Pace still never depends on the player's race position (no rubber band).
- **Graphics:** Kenney cars with per-livery paint recolouring, Classic and Future chassis, brake lights, boost flames, tyre smoke, grass dust and skid marks. The circuit adds mown grass, gravel traps, a rubbered-in racing line, a sky gradient, a horizon tree line, speed-based FOV, a camera lift over cars directly behind, and trauma-based camera shake with a Reduce camera shake option.
- **UI:** start lights, call-outs (perfect start, positions, laps, final lap), live gaps in the race order, best lap, an RPM bar, boost speed lines, car and rival-skill selection, a sound toggle and a results classification table. Settings persist in `racer.settings.v1`, separate from progress.

Sound uses Ogg Vorbis. Browsers that cannot decode it, such as older iOS Safari, race silently instead of failing.

Racer replaces Crazy Grand Prix's active catalogue entry with a stylized arcade circuit racer. Open `/play/racer`; `/play/f1-racing` remains a compatible address. The stable bundle ID is still `f1-racing`, so host integration and account isolation retain their existing contracts.

## The requested first game

- One Quick Race: twenty cars, two laps of the Silverstone Grand Prix layout, adapted to arcade scale from the FIA map.
- Recovered car body, chassis, front/rear wheel, grandstand and circuit-truss meshes, with new materials, placement, daylight, shadows and scenery.
- All active circuit advertising is newly drawn **StatOz CIRCUITS** signage. Original provider textures are not loaded by Racer.
- A larger race viewport with one game interface; the old nested Unity menus, garage onboarding and handheld frame are not used.
- Manual acceleration by default, an optional automatic-acceleration setting, an analog touch steering pad, brake/boost buttons, keyboard support, speed-sensitive steering and a gentle alignment assist. Simultaneous input owners are tracked independently and released on interruption.
- Slipstream recharges boost faster. Grass and car contact cost momentum. Recovery returns to earned course progress.
- Checkpoints, real lap/finish times, position, overtakes, replay and a local personal best. Silverstone progress uses `racer.silverstone.progress.v1` inside the account-owned host store; original native progress and the earlier Coast record remain preserved separately.

The work follows the user's three passes: a simpler quick-race experience, a new visual treatment, then new arcade driving and opponent behavior. Soccer Real, Stick Cricket Chase and Tennis Bits remain queued for separate revamps.

## Ownership and editable source

`src/features/games/racer/engine.ts` owns simulation and race state; `renderer.ts` owns the Three.js scene; `game.tsx` owns lifecycle, inputs and presentation. `assets.json` is adapted geometry, generated by `node scripts/import-racer-assets.mjs` from existing local research exports. [asset-provenance.json](asset-provenance.json) pins each imported mesh's source and SHA-256. Original ownership and research notices remain applicable to those meshes; new colors and signage do not transfer ownership.

This is authored game code using recovered geometry, not a renamed Unity client or recovered original Unity editor project. The previous native client and its inputs are retained as reference history under `public/games/f1-racing/native`. Racer does not load them, and they are excluded from the active device-download manifest. No changes are synchronized to another app checkout.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | A/D or left/right | Drag the steering pad |
| Brake | S or down | Brake |
| Boost | Space or Shift | Boost |
| Accelerate (default manual mode) | W or up | Hold Gas |
| Camera | C | Camera |
| Recover | R | Reset car |
| Pause/resume | Escape | Pause / Resume |

On an 851 x 393 mobile landscape viewport, the enlarged steering pad is 184 x 88 px, Brake is 92 x 80 px, and Boost is 104 x 92 px. Smaller phones keep at least 76 px control height and move telemetry clear of the optional third pedal.

Pause also provides automatic-acceleration, sensitivity, touch-control, sound and reduced-camera-shake settings. Car, colour and rival skill are chosen on the start screen.

## Local checks and evidence

`npm run test:racer` exercises the simulation, a complete race, checkpoint seam, boost/brake, recovery, compatible routes and original-mesh hashes. `npm run test:racer:browser` boots real Chrome, uses ordinary keyboard and pointer inputs to complete two laps, inspects screenshots, verifies paused time/input release, result/reload/account separation and renderer disposal. The inspector is read-only; it cannot set scores, alter race state or advance simulation time.

Evidence lives in `test-results/racer`: desktop/landscape opening views, driving, results and `checks.json`. Automated input is bounded functional evidence, not human driving-feel acceptance or physical Android/iOS testing. Runtime previews and covers use the same Three.js renderer. The approximately 1.7 MiB bundle embeds its adapted meshes and fonts; local bundle size is not a mobile-network loading-time measurement.

The enlarged-control pass is checked by `npm run test:racer:mobile` against `npm run preview:local-games` (default loopback port 5240). It covers simultaneous touch, cancellation and 851 x 393, 667 x 375 and 568 x 320 layouts. `npm run test:racer:app` uses the production app at port 3212, or `GAMES_APP_ORIGIN`, to check catalogue launch, route compatibility, pause/exit and phone orientation.

## Silverstone and motion revision

The circuit follows the 18-corner Grand Prix sequence in the [FIA circuit map](https://www.fia.com/system/files/decision-document/2025_british_grand_prix_-_event_notes_-_circuit_map_v2.pdf): Abbey/Farm, Village/Loop/Aintree, Brooklands/Luffield/Woodcote, Copse, Maggotts/Becketts/Chapel, Stowe and Vale/Club. `circuit.ts` records the reference and authored control points. This is a shortened, widened arcade adaptation, not a surveyed circuit model or a claim of official affiliation. The real reference length is 5.891 km; the game centreline is about 2 km. The FIA artwork and logos are not bundled.

The 20 cars are the player plus 19 fictional CPU rivals. The grid uses staggered paired lanes. Positive steering now consistently means screen-right, including A/D, arrows and analog touch input. The simulation updates at 120 Hz; `motion.ts` interpolates render poses between updates and takes the shortest heading arc. Wheel rotation uses each car's own speed. Camera position, heading, look target, suspension tilt and boost FOV use time-based damping. Contact adds a decaying impulse instead of an instant position jump. Nine instanced vehicle batches render the field, and track projection avoids temporary objects inside its segment loop.

Desktop direction checks measure both simulated and rendered screen displacement for all four steering keys. Browser validation also records a bounded 10-second compositor motion clip, frame-time samples and draw-call counts. Those timings describe this desktop Chrome test, not physical-phone performance.

The compositor video is visual QA only: its capture timestamps are not calibrated against the native game clock. Use the direct requestAnimationFrame samples in `validation.json` for measured desktop frame pacing; do not infer game speed or native frame rate from the exported clip.

## Starting the local preview

Run `npm run preview:racer` from the Games Web checkout and open http://127.0.0.1:3212/play/racer. This launcher watches the completed Next build identity and restarts its own server after a rebuild. A plain `next start` process can retain obsolete chunk references if another task replaces `.next`, leaving the page stuck before hydration. If no completed build exists, run `npm run build` first. Keep this local preview running while using its link.

## Acceleration and braking correction

Manual mode is now the default: hold W/up or Gas to accelerate, release to coast, and hold S/down or Brake to stop. Brake has priority over gas, boost and automatic acceleration, and continues to hold the car at rest. The optional auto mode remains in Pause. Boost also provides throttle while held. The speed limit uses a smooth throttle curve; releasing boost eases down without top-speed cycling.

Traffic contact now limits actual speed before moving the car, so the speed display, wheel rotation and travel agree. CPU grid launches no longer wait for a speed signal to propagate through all nineteen opponents. Independent physical input owners prevent releasing one finger/key from dropping another. All key releases are accepted even after focus changes; cancel, blur and pause clear held inputs. Focus returns to the race canvas after Resume so Space boosts rather than activating a stale Pause button. Pedals display their active state and the speed panel distinguishes acceleration, coasting and braking.

`npm run test:racer:pedals` runs three fresh real-browser sessions: manual keyboard and accessible pedal activation; automatic acceleration with gas/brake/boost overlap; and three-finger mobile gas/brake/steering with interruption and restart. Detailed samples are in `test-results/racer/pedals/checks.json`. The simulation suite also completes full twenty-car races in manual, automatic and coasting modes. Physical-device driving feel still needs hands-on review.
