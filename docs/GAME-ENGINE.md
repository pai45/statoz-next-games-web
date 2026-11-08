# Shared game engine and Blender workflow

The engine lives in this repository as the private workspace package
`@statoz/game-engine`. The host, studio, game code and editable artwork have
separate ownership. Nothing synchronizes to another repository or publishes a build.

## Open the interface

Run `npm run studio` from the repository root. The launcher starts Next.js and a
token-protected local asset bridge, then opens a dedicated Chrome studio window.
Keep the terminal running. The URL is `/studio/games` on the available local port;
use the launcher's link because its fragment carries this session's bridge token.
The studio is unavailable in production. `-- --no-open` starts the servers without
a browser; this mode supports canvas captures only. Ctrl+C stops the launcher.

The studio contains the 14 game definitions, the actual game preview (without player onboarding gates), desktop and
phone sizes, pause/resume, shared master volume, diagnostics, asset revision
inspection, Blender launch, candidate builds, activation, rollback and PNG capture.
The managed browser captures the preview including DOM menus and HUDs. Captures
and diagnostic metadata stay in `output/game-studio/<game-id>/`.
Asset inspection pauses the game preview; return to Game and press Resume when ready.
Blender remains a native application, opened with the asset's editable source.

## Ownership and structure

```text
packages/game-engine/
  core/                 lifecycle, clock, fixed steps, tasks, events via subscribers
                        asset cache/catalog, input, audio, saves, screen stack, RNG
  render-2d/            PixiJS application, camera, pooled immediate drawing adapter
  render-3d/            Three.js surface, model loading, animation, resource disposal
  physics/              separately lazy Rapier 2D and 3D adapters
  integrations/         React and host inspector adapters
  templates/            playable 2D and 3D starting modules
src/features/games/<game>/
  game.definition.ts    versioned serializable engine/studio metadata
  engine/ or source/    game-owned rules, AI, tuning, animation and presentation
  art/<asset>/
    original/           untouched imported file, when newly imported
    source.blend        editable source, or recipe-relative existing source
    recipe.json         export selection, budgets, rig/clip requirements, provenance
    state.json          local candidates, active revision and rollback history
src/features/game-studio/   browser interface and registered game definitions
tools/game-assets/          Blender import/export, validation and revision pipeline
tools/game-studio/          local launch, protected jobs, captures and checks
public/game-runtime/       generated, hashed shared ESM modules
public/games/<id>/engine-assets/<asset>/<revision>/  immutable runtime revisions
```

`state.json`, caches, generated runtime modules and captures are ignored by Git.
Keep `recipe.json`, original provenance and editable source as the authoring record.
Preserve existing license notices. Source workspaces for Formula, Holdover,
Hoop Legacy, Pitch Rush and Vibe Basketball remain under their game features.

## Runtime components

| Component | Responsibility |
| --- | --- |
| GameSession / GameLoop | One browser frame scheduler, per-game channels, bounded delta, visibility and reason-based pause, owned cleanup |
| FixedStepper | Game-specific fixed simulation frequency and catch-up limits, render interpolation |
| TurnSession / TaskQueue | Pure reducer state and pausable decisions/reveals, without a continuous render loop |
| ActionInput | Named actions, keyboard/gamepad/touch sources, rebinding conflicts, deadzones, blur cleanup |
| AudioMixer | Lazy gesture-unlocked WebAudio, master/music/SFX/ambience/UI/voice buses, gain, positional sound and disposal |
| AssetCatalog / AssetCache | SHA-256 verification, reference-counted leases, cancellation and safe asynchronous disposal |
| SaveStore | Game/account namespaces, schema checks and copy-only migration of old records |
| ScreenStack | Observable screen history for new menus; React owns accessible host UI |
| SeededRandom | Serializable deterministic RNG for new modules; existing game RNGs retain their sequences |
| Render adapters | PixiJS for 2D; Three.js and GLB animation for 3D |
| Optional physics | Rapier 2D/3D loaded when requested; sport and vehicle solvers remain game-owned |
| Inspector | Session status, frame intervals, game details, pause and volume controls |

Game logic belongs to each game. Shared engine code handles common services; it
does not define cricket rules, chess odds, race handling or basketball decisions.
Existing save keys, account isolation and independent art directions are retained.
The p95 metric is a browser frame **interval**, not measured GPU time or a physical
device performance certification.

## Integration status

| Game | Current integration |
| --- | --- |
| Formula | Shared scheduler drives R3F explicitly, 120 Hz simulation, shared audio |
| Rally Dash | Shared scheduler, original fixed solver, native Pixi presentation and shared audio |
| Football Chess | Event-driven TurnSession, pausable CPU/reveal tasks, shared audio |
| FOT Duel | TurnSession, pausable match reveal, shared audio |
| Pitch Rush | Shared scheduler, native Pixi adapter and audio through build-time integration |
| Yorker | Shared scheduler/fixed steps/audio; real bowler catalog and temporary in-game candidate binding |
| Cricketer, Longbow, Rim Rush, Racer | Shared scheduler/fixed steps and audio; existing Three scenes and game solvers |
| Penalty Cup | Shared match scheduler, 120 Hz steps, existing Rapier simulation and Howler output adopted into the mixer |
| Holdover, Hoop Legacy | Shared scheduler/audio; original gameplay and renderer classes remain |
| Vibe Basketball | Shared scheduler/audio through build-time adapters; pinned legacy Three.js remains |

Open Golf is intentionally absent from the studio migration and remains playable
on its existing runtime until its separate remake. No game has been removed here.

This first engine release supports compatibility adapters. Older games still have
game-owned input bindings, menus, save adapters and rendering code. Formula's
React Three Fiber layer and Vibe's pinned Three version are retained. Shared core
ESM files are hashed and reused across embedded games, but this is not yet one
identical renderer dependency build for every historical game. Converting these
remaining systems requires game-specific visual and gameplay acceptance, rather
than replacing every solver and screen at once.

## Blender: supplied asset to running game

1. Select the game in the studio. Import a `.blend`, self-contained `.glb` or
   `.fbx` with the author, original source, license and verification evidence.
   Loose OBJ/glTF files must first be packaged with their textures. CC0 is the
   default third-party policy; Yorker also permits credited CC BY. An original
   asset requires actual ownership, not a license conversion of someone else's work.
2. The importer preserves original bytes and a SHA-256 hash. It creates an editable
   Blender 5.2 source without changing the original or any open unsaved project.
3. Open in Blender and edit. Keep scale, rig names, sockets and animation names
   compatible with the intended game role. Save the `.blend` when ready to export.
4. Configure `recipe.json`: selected objects/collection, triangle/texture budgets,
   required nodes/clips, or atlas frame count, dimensions, FPS and pivot. For 2D,
   use an orthographic camera; the importer creates a starting camera when missing.
5. Build a candidate. A separate background Blender process exports GLB or
   transparent sprite frames. GLB runs through glTF Transform and Khronos
   validation; atlas frames become PNG plus frame/pivot metadata. A failed export
   never changes the active revision.
6. Inspect the candidate model/atlas. The Yorker bowler also has **Preview candidate
   in game**, which overrides bytes only in that studio session. Review actual
   animation, cameras, collisions, lighting and phone sizes before activation.
7. Activate the reviewed candidate. The pipeline writes an immutable revision,
   credits/provenance and an atomic catalog pointer, then rebuilds its embedded game.
   A packaging failure restores the old pointers and rebuilds the old game.
   Reload the preview after a completed activation or rollback job.
8. Rollback selects and verifies the previous revision. Original source and old
   immutable revisions remain available. Production assets and offline packs update
   on the next normal production build, which is a separate local operation.

An imported file is available in the asset library; it cannot automatically replace
an arbitrary game object. Each game role needs a binding using
`loadRuntimeAsset(gameId, assetId, baseUrl)` and an explicit rig/material/collision
contract. The Yorker bowler is the first real binding. A car in Formula needs its
own car/wheel/socket and collision contract before swapping it into racing.

Useful commands:

```sh
npm run assets:game -- build --game=yorker --asset=bowler
npm run assets:game -- watch --game=yorker --asset=bowler
npm run assets:game -- activate --game=yorker --asset=bowler --reviewed
npm run assets:game -- rollback --game=yorker --asset=bowler
```

Watching builds candidates when the saved source changes. It never activates
unreviewed art. Blender 5.2 is required; `BLENDER_PATH` can select its executable.
The current Yorker candidate was exported with Blender 5.2.3; it is not activated.

## New game workflow

Create a feature and `game.definition.ts`, then start from
`packages/game-engine/templates/game-2d.ts` or `game-3d.ts`. Define game-specific
rules in pure modules, declare actions and simulation frequency, and own resources
through the session's scope. Load renderer/physics modules only when needed.
For Pixi AnimatedSprite instances, set autoUpdate=false and advance animation
from the shared session update; do not start the shared Pixi ticker.
Register the definition in the studio and the game in the existing host catalog
and route registry. Keep a game's style, asset budgets and persistence contracts
in its own feature. Add an explicit asset-role binding before replacing game art.

## Validation and acceptance

```sh
npm run test:game-engine          # runtime, cleanup, fixed timing, saves, pipeline
npm run test:game-engine:games    # game-specific logic suites, logs and summary
npm run test:game-engine:browser  # studio and live Pixi preview
node tests/game-engine-integrations.browser.mjs --url=http://127.0.0.1:3040
npm run build                    # production and offline asset packaging
```

Existing deep browser tests remain the acceptance criteria for each game's controls,
complete rounds, saved progress and phone layout. Browser software WebGL checks do
not substitute for physical phone frame-time/memory acceptance. Art review and any
future renderer/version consolidation should use the studio captures plus those
game-specific checks. No online multiplayer, networking backend, production economy,
visual node editor or universal character retargeter is implemented by this release.
