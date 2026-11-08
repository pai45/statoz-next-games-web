> **Latest — 2026-10-20:** Future Games Web now includes the enhanced three-track demo, hills/obstacles, faster racing, improved rivals and start/finish sequences. See [current integration and validation](retro-circuit/enhancement-v4.md). Commercial reference cars/pit imagery are temporary demo assets with replacement required before production; earlier original-only descriptions below are historical. Current StatOz and Flutter are unchanged.

# Retro Circuit

New single-player racing title at `/play/retro-circuit`. Three original tracks, four cars, nineteen AI opponents, fuel stops and three nitro charges. Uses existing app authentication; requires no deck and awards no coins or XP. Grand Prix Dash, its `/play/grand-prix` address and its saves remain separate.

## Implementation

The lazy-loaded feature is `src/features/games/retro-circuit`. Pure TypeScript simulation and a Three.js renderer form one portable runtime. A fixed 60 Hz simulation uses bounded catch-up with interpolated presentation. Runtime artwork is original authored pixel geometry; audio uses original deterministic synthesis. Reference-game recordings and commercial sprites are excluded.

Research used the original English SNES Top Gear manual and two bounded gameplay excerpts. Physics, AI and timing are original tuning, not recovered console code. Evidence and editable review sources are retained in StatOz Designer `output/retro-circuit`.

Keyboard: arrows/WASD steer and drive, Space uses nitro, Escape pauses. Simultaneous touch controls and optional auto-throttle are available; braking overrides throttle. Slow down, move into the right pit lane and stop to refuel. Accelerating permits partial-fill departure. Pause/background clears held input and stops audio. The garage, restart and rematch dispose previous graphics resources.

Settings/results use `statoz:retro-circuit:v1` and participate in the existing local account switch. Future-version saves remain intact; best times are independent of bounded result history. Account isolation has a regression test.

## Verification and review status

- Sixteen focused game/account tests pass, including all twelve car/track combinations finishing in the intended 2–4 minute range under the test driver.
- Typecheck and repository lint pass. Production build and static-export build generate the route. Run `npm run test:retro-circuit`, `node --test tests/static-segments.test.mjs`, `npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm run build:pages` for current validation.
- Twenty-two standalone browser checks cover keyboard, synthetic simultaneous touch/cancellation, short-landscape canvas fit, pause/background, complete race/results, rematch, graphics interruption and disposal. Four supported REA browser operations pass.
- A race inside the production StatOz app finished sixth of twenty in 3:24, with one pit stop, through keyboard events driven from visible road pixels and HUD. Rematch, exit and repeated launches pass. Four audio contexts were created and closed, with no overlapping contexts.
- A retained verification attempt used the wrong old-game URL. A separate check through the real Grand Prix Dash catalog link passes and reaches its original deck gate. Failed attempts remain in the evidence record.
- Thirteen audio exports and a live full-race mix decode without measured clipping. Listening approval, final visual acceptance and physical Android/iPhone measurements remain pending. Headless desktop results do not certify phone performance.

The local static build script includes `normalize-static-segments.mjs`. Next 16.3 on Windows can output nested segment folders while its client requests dotted navigation filenames. The post-export step adds byte-identical aliases, preserves originals and rejects conflicting content. Correct POSIX exports are unchanged. Regression tests cover these cases. No special hosting rewrite is needed.

## Flutter follow-on

### Earlier visual revision 0.2.0

Before the Flutter wrapper, the user requested closer replication of the original SNES design. The current web candidate moves its instruments into the driving view: red segmented speed and stepped rev strip, upper-left white course diagram, vertical right fuel bar, lower-left nitro/automatic gear and lower-right position. Original rear cars are larger and more detailed, with explicit turn contours. Original scenery adds layered panoramas, richer roadside props, broad lane markings, fine shoulders, distance bands and visual crests with partial sprite clipping. The garage uses a compact 2×2 car selection and selected-machine specifications. Game rules and save schema remain unchanged.

The registered original artwork is `retro-circuit-cars-v2`, pinned version `v-48ecd90104c67a0414634f1e`. The course diagram is deliberately nonmetric and derives from the canonical sector data; it is not a scaled world centreline. The single driving view remains an agreed adaptation of the source's two-pane presentation. Source sprites, logos and recordings are not shipped. Evidence and the two bounded independent visual reviews are recorded in Designer `output/retro-circuit/visual-revision.md` and `verification-v3`.

### Handheld revision 0.3.0

The current game adds a retro title menu, original 5x7 pixel font and bitmap action icons, original 128x80 car details with three liveries per silhouette, and fine road/verge detail. The full 16:9 scene fits above a landscape handheld control deck: steering left; brake, accelerator and nitro right. Portrait pauses and blocks resume. Safe-area padding covers menus, controls, pause and finish. The finish panel uses the frozen driving scene and shows points, time, position, personal best, lap and pits.

The user explicitly chose local records. Top ten completed races per circuit, all-time best score and fastest times persist independently of the last 100 results. Additive v1 migration preserves existing settings and history. Practice and DNFs earn no records. Points = (21-position)*1000 + max(0,floor((240-elapsed)*100)); this is a StatOz design, not recovered SNES scoring. Scores grant no currency/XP. The original visual pack is retro-circuit-handheld-v3 / v-cb9624a844117a39dd408e48; status remains reference until owner acceptance. Current evidence is Designer output/retro-circuit/verification-v4. The decoded complete renderer race is196.38 seconds with one pit stop.

Current Designer lint/typecheck pass; 327/328 full tests pass, with an unrelated daily-report fixture expecting Arsenal failing. Physical-phone and audio-listening gates remain open.

After web acceptance, package the same runtime/assets behind a versioned host adapter for launch, lifecycle, settings, result and exit. Keep gameplay out of a separate Dart implementation. A read-only app integration map is retained in Designer `output/retro-circuit/flutter-handoff.md`. No Flutter code or dependency has been changed, and no publishing or deployment is included.

Additional browser checks complete a practice race without saving, finish a race while preserving an unsupported future-version save and show the session-only label, and load the exported menu plus pixel font. The measured local desktop menu/font-ready time was 1.83 s with 27 resources; it is not a network or phone measurement. The static navigation regression tests also pass (2/2).

Designer build limitation: the required repository build remained in webpack compilation after a bounded 15-minute attempt (943 seconds) and was stopped. This is incomplete, not a successful build. StatOz web production and static-export builds both passed. Current Designer lint/typecheck pass; 327/328 tests pass, with the unrelated Arsenal daily-report fixture failing.
