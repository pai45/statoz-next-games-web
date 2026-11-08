# Penalty Cup mobile pass — 31 October 2026

## Presentation

Landscape-only, with the existing app landscape frame and a standalone rotated fallback for browsers that cannot lock orientation. All game screens fit a single viewport. Native safe-area insets protect controls from notches and home indicators. The maintained runtime remains in Future Games Web; Designer output is research and review history.

Home contains the two modes, a saved cup shortcut and history. Nation selection shows eight countries per page, preserving access to all 48 across six pages. The cup hub uses compact groups/third-place tables, four fixtures per bracket page, and four personal results per page. History and results are compact overlays/screens. The redundant match-introduction step, marketing copy, full statistical columns and decorative panels were removed. Easy/Normal/Hard choices were removed entirely; one balanced CPU progression runs from level 5 in groups to level 10 in the final. The host product retains its own branding outside this independent game.

## Goalkeeping and animation

Cup-only responsive keeping buffers a tap made during preparation or early run-up, then starts the dive 0.12 seconds before kick contact. Taps made later act immediately. The selected direction is highlighted. This prevents an early tap from completing the keeper's recovery before the striker shoots. Centre high/low inputs now produce different glove heights, with a low centre crouch. Cup keepers extend sooner and retain their reach through shot arrival. Reactive AI reads launched velocity after a level-based reaction delay and recognises central shots. Actual front-side keeper contacts produce a catch or a parry back into play; near misses and wrong height/direction still concede. Full-ball goal-line rules remain in force.

Side dives and centre catches now show push/reach, a held block, landing and a complete recovery. Low side dives pass through the source push, airborne stretch, landing and recovery poses instead of skipping directly from the loaded pose to the ground. Source atlases, anchors and generic athlete provenance are preserved. This is original Cup timing, not a claim about the native reference game's timing. Original Penalty Shootout behavior remains the shared engine's default.

The match HUD contains the score, recent penalties, compact meter and essential controls. Touch dive commands fire on pointer-down. Analogue input accounts for the standalone rotated viewport. Results advance after 2.2 seconds unless paused or replaying, and manual Next/Replay remain available. The replay/collision simulation is shared with Penalty Shootout.

## Progress saving

The internal save format is v2; the existing scoped key `penalty-cup.v1.<scope>` is retained for discovery. Existing v1 cups migrate with IDs, fixtures, scores, pending results and history preserved; the removed difficulty field is discarded. The outer app bundle save protocol remains v1.

Every resolved Cup penalty records kick history, RNG state, seed, CPU level and simulation tick. Reload resumes at the next unfinished penalty, preserving completed kicks and the next CPU decision. Live ball flight is intentionally not serialized. Final penalties atomically produce the pending match result. Retry clears its checkpoint and changes only that fixture's attempt seed. Random Game stays independent of Cup progress and does not advertise a saved match.

A synchronous state owner prevents late checkpoint callbacks overwriting newer accepted results. Revision checks reject stale writes to the same storage snapshot. Main and backup records are validated, damaged-primary recovery uses the backup, and failed storage retains session play with a visible notice. These are local browser saves, not cloud synchronization or a cross-tab locking service.

## Runtime cost and ownership

Cup rendering is capped at 60 fps and HUD updates at 15 Hz, while physics stays fixed at 120 Hz. Paused games stop repeated scene/HUD rendering. Coarse/short viewports cap pixel ratio at 1.25 and disable shadow maps, including automatic quality adjustments. Unused cover artwork is omitted from the embedded runtime asset map. No new remote dependency, economy, Flutter synchronization or publication was added.

Responsibilities are separated across the controller, compact views, landscape wrapper, match screen, persistence validator/migration, save hook and existing tournament engine. `game.tsx`, `match.tsx` and `storage.ts` retain compatibility entry points.

## Checks and review

- `npm run test:penalty-cup`: tournament plus checkpoint, migration, backup, input timing and animation tests.
- `npm run test:shootout`: existing shared-engine regression suite.
- `npm run test:penalty-cup:browser`: screen-fit and actual touch/gameplay checks; screenshots, a gameplay recording and JSON results under `test-results/penalty-cup-mobile`.
- `npm run test:penalty-cup:app`: real app landscape and account save/reload checks. Set `GAMES_APP_ORIGIN` to exercise a running local app instead of preparing a production server.
- `npm run build:penalty-cup`, `npm run lint`, `npm run typecheck`, `npm run build`.

Browser viewport emulation is not physical iPhone or real-controller verification. Review records must report unrelated repository build/type errors separately from the Penalty Cup checks. See the latest `penalty-cup-validation.md` for actual results.
