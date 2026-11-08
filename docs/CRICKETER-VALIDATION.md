# Cricketer validation — low-poly player remake, 1 November 2026 (later pass)

All players now use the low-poly bhagathartworks model and its own batting cycle (see `CRICKETER-CHARACTERS.md`). The previous body (`player-shared.glb`) and Stick Cricket motion (`source-motion.local.glb`) were removed from the runtime. This GitHub Pages release was explicitly authorized by the user; no Flutter synchronization is included.

| Check | Result |
| --- | --- |
| `npm run test:cricketer` (engine) | 12 passed, 0 failed |
| `npm run test:cricketer:characters` | 30 contact cases (6 shots × 5 heights): max blade-to-ball error < 1 mm, max top-hand grip error 1.2 mm; feet within 21 mm of ground in all roles; 0 page errors |
| `npm run test:cricketer:browser` | 14 scenario groups passed; in-game contact blade-to-ball < 1 mm, 1 skinned mesh, 49 bones; 0 errors / failed / remote requests |
| `npm run build:cricketer` | Passed; offline bundle 2,382,646 bytes (was 4,842,662) |
| `npm run build:pages` + `npm run test:cricketer:app` | Static build passed with the new players; exported app 5 scenario groups passed. A second Pages build after the cover refresh was blocked by an unrelated, in-progress Longbow test (`tests/longbow.test.ts` type errors), so re-run it once that work settles. |
| Typecheck / focused ESLint (Cricketer files, bake/verify scripts, tests) | Passed, 0 warnings |
| Scene sample at contact | 359 draw calls / 220,036 triangles (was 777 / 363,092) |
| Character asset verification | `cricketer-player.glb` and `PLAYER-LICENSE.txt` hashes match the manifest; no embedded textures; credit present |

Gameplay frame sequences across two deliveries confirmed the batter going relaxed → get set → high backlift → downswing → contact → follow-through → walk-off without pops, plus the bowling action and follow-through. This found and fixed one defect: AnimationMixer skipped re-writing unchanged values, which left stale corrections in the stance. The cover was refreshed from gameplay (`CRICKETER_CAPTURE_COVER=1`). Physical-phone acceptance remains pending.

---

## Earlier pass — character remake, 1 November 2026

The supplied skinned player and retained cricket motion now replace the earlier jointed player shapes in Future Games Web at `/play/cricketer`. The user explicitly authorized the GitHub Pages release; no Flutter import or cross-project synchronization is included. Original source files in Downloads and the installed Stick Cricket source/runtime were not edited. Earlier source/cover/docs snapshots remain under `.cache/cricketer-character-before`.

## Executed checks

| Check | Result |
| --- | --- |
| Engine, Stick Cricket input/catalog, orientation and device-cache regression tests | 31 passed, 0 failed |
| Character visual/rig suite | 30 contact cases passed; six stroke families × five heights, finite posed bounds and wrist constraints |
| Cricketer gameplay browser suite | 14 scenario groups passed; all lessons and all twelve chases, plus real-time play, saves, controls and recovery |
| Actual exported product app | 5 scenario groups passed; library, guide, guest launch/pause, physical orientation and exit |
| Runtime errors/failed/external requests in final browser suites | 0 / 0 / 0 |
| `npm run typecheck` | Passed after adding the explicit material type for the custom glove shader hook |
| `npm run lint` | 0 errors; 4 existing warnings in unrelated cache/Racer/Retro Circuit files |
| Focused character/renderer ESLint | Passed |
| Character asset build verification | Shared model, local motion and credit/license hashes match the reviewed inputs |
| `npm run build:cricketer` | Passed; final offline bundle 4,842,662 bytes |
| `npm run build:pages` | Full production/static build passed, including TypeScript and 66 generated pages; 64 static-segment aliases |
| Final device manifest | 1,224 files / 280.3 MiB overall; all 8 Cricketer records match both public and exported bytes |

Final static build ID: `7baa58c7-858e-42ad-bc5a-ee8dee74ded3`. The full build includes its configured typography, artwork and background checks. No remote pipeline was started.

## Character and gameplay acceptance

The supplied player contributes 10 skinned meshes and 83 joints. The new design has a continuous face/body, fitted helmet/grille, padded gloves, strapped pads, tapered bat, original kits and deforming jersey numbers. Glasses/national-kit maps are not rendered. Selected local native-curve clips are retargeted with a compact strike correction, arm IK and planted-foot crouch; no original Stick Cricket body meshes or textures are used.

The character suite covers drive, cut, pull, hook, sweep and scoop at 0.22, 0.45, 0.75, 1.10 and 1.32m contact heights. All finite-bound and 35mm wrist-target acceptance checks pass; maximum analytic wrist-target error is below 1mm, with sampled foot minima within 3mm of the ground. These are rig target checks plus visual review, not physical fingertip collision measurements. Front/back/side, contact and follow-through PNGs were inspected. Numbers follow the skinned shirt rather than a detached plane.

The gameplay suite confirms the actual skinned rig and bat/ball target while using ordinary input commands and bounded fixed-step advancement; a separate real-time rendered chase also completes through keyboard input. It covers all three lessons/all twelve chases, wrong/no-shot outcomes, unlocks, account isolation, checkpoint/RNG restoration, incompatible-save preservation, touch cancellation, pause, reduced camera motion, portrait interruption, offline subdirectory play and WebGL failure/retry.

Phone checks cover 915×412, 844×390 and 667×375 landscape, plus 390×844 portrait interruption. Controls stay at least 44px and within the viewport. The actual exported app also passes landscape/portrait checks and correct Cricket-library exit. Cover art was refreshed from actual redesigned-player gameplay before the final build, and no subsequent test overwrote it.

## Evidence and limits

- `test-results/cricketer-characters/closeup/checks.json` and its PNGs: current source-character pose/design review.
- `test-results/cricketer-characters/source`: original shared/native comparison and measured rig data.
- `test-results/cricketer/checks.json` and `contact.json`: final game/rig checks; sampled scene statistics are 777 draw calls / 363,092 triangles, not a physical-phone performance claim.
- `test-results/cricketer-app/checks.json`: final exported product-flow checks.
- Designer `output/research/cricketer-character-remake-2026-11-01`: canonical REA archive receipts, source comparison, byte identities and pose results. See `CRICKETER-CHARACTERS.md` for the distinction between REA archive evidence, glTF parsing and rendered observations.
- Earlier failed pose/build/test results remain retained. Final successful records supersede them. Corrections include retarget blend aliasing, reach/crouch, eye/kit details and the shader type annotation.
- The supplied model is CC-BY-4.0 / numaan.k99 with credit in the menu, source files and bundle notices. Stick Sports motion has no independently established redistribution license; the user explicitly authorized this Pages release. The model license does not license that motion.
- This is an adapted skinned character and motion set, not a recovered Unity project or identical native controller/IK playback. Match simulation, inputs, progression and save schema are preserved.
- Physical Android/iOS GPU, WebView, audio and OS interruption acceptance remains pending.

Local preview: `http://127.0.0.1:5254/fixture` (`npm.cmd run preview:cricketer`). Full product entry: Future Games Web → Cricket → Cricketer.
