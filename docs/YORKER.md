# Yorker

Yorker is an original 3D bowling game at `/play/yorker`, in the Cricket hub beside Cricketer (batting). You are the
bowler; a CPU batter with a scouting report tries to score. It shares no source files with Cricketer; both use the same
CC BY player body.

- **Orientation:** landscape only. On phones the shared `MobileGameViewport` rotates the iframe; a portrait viewport
  pauses behind a "turn your device" notice.
- **Style:** its own night-broadcast look (deep navy glass panels, gold accent, Barlow Condensed), not the StatOz
  design system.
- **Source:** `src/features/games/yorker/` · **Runtime assets:** `public/games/yorker/`

## How it plays

Each ball has three decisions:

1. **Plan.** Pick one of four deliveries and drag on the pitch (or tap the pitch map, or use arrows/WASD) to place
   where the ball should pitch. Length bands show yorker, full, good, back-of-a-length and short. Choose an attacking,
   balanced or defensive field.
   - Pace: seam up, outswinger, inswinger, slower ball. Spin (leg-spin): leg-break, googly, top-spinner, slider.
2. **Release.** Press Bowl or Space; tap or press Space as the needle reaches gold during the run-up. Perfect gives
   full pace, tight accuracy and more movement; early loses pace and sprays; past the line is a no-ball (one run, free
   hit). Release assist (pause menu) widens the gold zone.
3. **Result.** The ball is simulated physically and the batter responds.

**Rules:** six-ball overs; wides (outside the 0.89 m guideline, down leg, over head height) and no-balls (overstep,
waist-high full toss, second bouncer of an over) cost a run and are re-bowled; free hit after any no-ball; strike
rotates on odd runs and at the end of the over. Dismissals: bowled, played on, LBW, caught, caught behind.

**DRS:** an LBW appeal goes to the umpire. If it is given not out you may review (one per spell, kept on umpire's call
or success). The batter may review out decisions. Ball tracking shows pitching, impact and wickets with umpire's call
where less than half the ball is in the zone.

**Modes:** Bowling Academy (5 coached lessons: line and length, the release, swing and seam, attack the stumps, spin),
Career (12 spells over three venues: defend a target, take wickets, economy), and Quick Match (a random death over).
Stars reward economy and wickets; a win unlocks the next spell.

## Simulation (`physics.ts`, `batting.ts`, `engine.ts`)

- Pure TypeScript, fixed 120 Hz clock; the ball integrates at 480 Hz with gravity, drag, late swing and spin drift.
  Seam and turn deviate the ball at the bounce; restitution and pace off the pitch depend on delivery and pitch type.
- A Newton solver finds the release velocity that pitches the ball exactly on the (scattered) aim point.
- The batter commits to a shot from the ball's early read, then predicts the flight from his decision point without
  the movement he cannot see (late swing, seam, a misread googly or slower ball). Skilled batters partly adjust. Errors
  scale with pace, length, the corridor outside off, weaknesses, and breaking the recent pattern. Dot-ball pressure
  raises his risk-taking.
- Contact geometry decides middle, mistimed, outside/inside/top/bottom edges or a miss; then pad (LBW), body or
  stumps. Struck balls fly and roll on the outfield; the earliest fielder decides catch, drop, stop or boundary, and
  runs come from the throw time.
- Every ball is resolved at release from a seeded LCG; the renderer never consumes simulation randomness. Balance was
  tuned with Monte Carlo runs (expert pace bowling ~6-7 an over and a wicket every ~11 balls; random bowling ~10 and
  ~16; poor bowling ~16 and ~23).

## Saves

`yorker.progress.v1`, scoped per account by the bundle host. `readSave` validates every field, including each
recorded ball of the unfinished-spell checkpoint; a broken or newer save is preserved and the session plays without
saving. A checkpoint stores the seed and completed balls (plan, meter, assist, review) and is rebuilt by replaying them.
Finishing a spell sends one `result` event to the host.

## Presentation

- Broadcast camera (high, long lens behind the bowler), a chase camera on the run-up, a ball-following wide camera, an
  appeal camera, a slow-motion stump-cam replay of broken wickets (re-evaluated from the deterministic state) and a
  Hawk-Eye style tracking view.
- Players: the credited CC BY body and rig, with a shared, restrained Loop subdivision for close cameras and a
  lighter smooth-shaded body for distant players. The source's head and collar patches are replaced by original
  anatomical head/neck and fitted collar meshes. A continuous original, skeleton-weighted jersey replaces the
  fragmented source shirt and sleeves, avoiding loose shoulder scraps when posing. Faces have modeled noses, eyelids,
  irises, lips and ears; hair, beards and stature vary across the fictional cast. Skull attachments use the actual bind frame, rather than the
  root's direction, so faces and properly sized headwear stay together throughout the action.
- Original textile, willow and fictional kit-artwork maps are generated locally. Kits have subtle weave, seams,
  chest crests, readable names/numbers and subdued trim; padding and gloves are nonmetallic, bats have willow grain,
  helmets have a restrained lacquer finish, and shoes have laces. CC0 equipment stays fitted to the bones.
  Bowling actions, keeping, fielding, throwing, running between wickets and umpire signals are authored on the rig;
  batting uses the source cycle with bat-to-ball
  IK at the simulated bat position, so misses and edges look like misses and edges.
- Camera-projected character detail is selected before rendering, including telephoto cameras. The original heads
  have near/far topology; the high-detail version is not drawn for every distant fielder. Bone-attached details are
  batched by material, and per-player materials, artwork, geometry and skeleton bone textures are disposed when the
  cast changes.
- Stumps and bails are split from the CC0 models, with a subtle wood finish, and scatter when hit. An original shaded
  spectator atlas replaces single-colour silhouettes; the crowd remains one instanced mesh and reacts to wickets
  and boundaries. The big screen follows the score. Empty seats, concourse rails, roof supports, glazed pavilion
  windows and individual lamp arrays add stadium depth without extra real-time shadow lights.
- The mown outfield has fine surface relief and gentler striping. An adjoining wicket square, old strips, boot scrapes
  and fine cracks distinguish the pitch. Green-top, dry and flat pitch conditions affect its visible finish as well
  as the unchanged simulation. Day, dusk and night retain their own lighting and atmospheric depth.
- Sound: CC0 crowd recordings plus synthesised bat, edge, pad, stumps, gloves and footstep sounds.

## Assets and licences

Every third-party runtime file is listed with source, licence, modifications and SHA-256 in
`public/games/yorker/PROVENANCE.json`; `npm run test:yorker` fails on an unlisted or changed file.

| What | Source | Licence |
|---|---|---|
| Player body | bhagathartworks, Sketchfab (same runtime body as Cricketer) | CC BY 4.0 |
| Helmet, bat, pads, gloves, keeper gloves, ball, stumps, bails | 3DAssets.dev Cricket Ground and Pavilion pack (gear simplified with meshoptimizer) | CC0 |
| Day, dusk and night skies | Poly Haven pure-sky HDRIs (tonemapped, downscaled) | CC0 |
| Grass and pitch colour maps | ambientCG Grass005, Ground102 | CC0 |
| Crowd bed, roar, cheer, sigh, applause | freesound (CC0 only), trimmed and normalised | CC0 |
| Barlow Condensed | Google Fonts | OFL |

Everything is bundled into the offline game (about 3 MB); nothing is fetched remotely.

## Commands

### Blender 5.2 bowler trial (2026-11-07)

Pace and spin now load `models/bowler-blender52.glb`: a Blender-authored bowler
with a continuous fitted jersey, trousers, anatomical head/hair and cricket
shoes. Team kit colours and artwork remain dynamic. Its named skin influences
retarget onto the existing credited rig, preserving the pose solver and release
timing. Other player roles retain their existing assets. The derivative hand
topology/joint layout remains credited under CC BY 4.0.

Editable source: `src/features/games/yorker/art/yorker-bowler.blend` (Blender
5.2.3). See that directory's README for regeneration, studio previews, detail
levels and provenance. `bowler-asset.ts` owns runtime joint remapping; the unit
suite verifies both detail budgets and skin weights, and the art browser suite
asserts that the real bowler uses the Blender export.

```bash
npm run test:yorker          # registry, data, physics, rules, LBW, determinism, saves, provenance
npm run build:yorker         # writes public/embedded-games/yorker/index.html
npm run preview:yorker       # http://127.0.0.1:5258/fixture?account=qa (&manual=1 for the manual clock)
npm run test:yorker:browser  # fixture + Chromium: Academy lesson, career spell, death over, reload; screenshots in test-results/yorker/
npm run test:yorker:art      # actual cast close-ups, bowling poses, all three venues, phone framing and rendering budgets
YORKER_CAPTURE_COVER=1 npm run test:yorker:browser   # deliberately refresh public/games/yorker/cover.png from gameplay
```

With `&manual=1`, `window.__YORKER_INSPECT__` exposes `snapshot()`, `advance(seconds)` and `act.*`.
`act.start(id, seed)` starts a spell or lesson with a fixed match seed, so specific outcomes can be
replayed exactly. For example, `lesson-stumps` seed 22 with an in-line inswinging yorker at 1.9 m and
a release meter of 0.86 gives a turned-down LBW that ball tracking overturns. Phone layouts have been
checked at 844×390 and at 740×340 (Safari landscape with toolbars).

Browser checks use desktop Chromium with touch emulation; confirm touch, rotation, audio unlock and frame rate on real
phones before a release.

The art review writes `test-results/yorker-app/art-after/` (including `checks.json`). It compiles the real rendering
modules into a test-only fixture; it does not add review controls or a second development server to the app.
`YORKER_ART_BASELINE=1 npm run test:yorker:art` writes comparison frames to `art-before/`.
Run the art and gameplay browser checks sequentially on software WebGL. Gameplay screenshots allow up to 120 seconds
for SwiftShader to flush a detailed scene. Phase checks render every half-second while still advancing every 120 Hz
engine step and keeping the original simulated deadlines and gameplay assertions.
