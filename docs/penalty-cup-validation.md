# Penalty Cup mobile validation - 31 October 2026

Maintained locally in Future Games Web at /play/penalty-cup. No Flutter changes, publication or deployment. This report supersedes the initial implementation report for the mobile changes.

## Mobile gameplay fixes ? 8 November 2026

Cup-only timing now starts buffered dives 0.12 seconds before contact, extends sooner and retains reach through shot arrival. AI reacts to launched velocity, including centre shots. Front-side Rapier contacts catch or parry the ball back into play. Low, middle and high save poses, landing and recovery follow the same simulation clock; low saves use the source's downward-reaching frame rather than the raised middle-save pose. Original Shootout defaults remain available.

- `npm run test:penalty-cup`: 22 passed, including real seeded saves on both sides, AI centre blocks, power-shot parries, near misses and replay/checkpoint continuity.
- `npm run test:shootout`: 34 passed.
- `npm run build:penalty-cup`: passed; local offline bundle rebuilt.
- `npm run typecheck` and scoped lint for the changed shared runtime: passed.
- Focused Chrome touch captures in `test-results/mobile-gameplay-refinements` cover the real Cup push/stretch/recovery sequence. Desktop emulation only; physical phone acceptance remains pending.

The broad Cup mobile browser run completed the first five viewport sizes but hit an iframe reload race at 844?300 before reaching gameplay. Its harness now waits for the landscape surface after reload. Repository-wide lint reports existing errors in generated/cache and unrelated skill files; scoped lint passes. No publication or upstream synchronization.

## Match-night presentation and music — 6 November 2026

Local-only menu refresh: trophy-led lobby, football mode cards, shield nation selections, match journey, tournament tables, full-time results and trophy room. Decorative trailing action arrows were removed. Original procedural stadium music uses one gesture-gated music context with persisted volume/master mute, a quieter match mix, background/host/match pause handling and disposal on exit. No third-party music assets were added.

Passed checks for this revision:

- `npm run test:penalty-cup`: all 19 tournament/save/mobile integration tests.
- `npm run test:shootout`: all 34 existing shared-match regression tests.
- `tests/penalty-cup-mobile.browser.mjs`: 131 screen-fit checks across seven phone sizes/orientations and 1280×720 desktop, plus all 48 nations, simultaneous touch shooting, goalkeeper animation, completed-penalty reload and account isolation. Settings, results, champion screens, history and paginated panels fit without page scrolling. Zero browser errors.
- `tests/penalty-cup-music.browser.mjs`: no audio context before interaction; non-silent output with headroom; music volume, zero volume and master mute; host/background/match pause and resume; actual bus attenuation during matches; return to the menu mix; settings persistence; context disposal. The harness captures the music bus through an analyser. This is automated signal verification, not a physical-device listening test.
- `npm run test:penalty-cup:app`: production play route, landscape and upright-phone rotation, account-scoped v2 save and reload.
- `npm run typecheck`, `npm run build:penalty-cup` and `npm run build`: production compilation, all 65 generated routes and the device asset manifest. The final Penalty Cup bundle and device hashes were refreshed after the last presentation adjustment.
- Scoped ESLint for Penalty Cup source and changed browser tests: no errors or warnings. Targeted `git diff --check`: clean.

Repository-wide `npm run lint` reports 18 existing errors and 22 warnings in `.cache/hoop-legacy-athletes/rig.cjs`, `.claude/skills/*` and other unrelated files; none came from Penalty Cup. Those files were left as found.

Evidence is in `test-results/penalty-cup-mobile`: `checks.json`, `music-checks.json`, `app-checks.json`, and current lobby, nation, hub, bracket, result and gameplay screenshots. Earlier `failure.*` files are diagnostic history from the layout iterations. The maintained preview is served locally at `http://127.0.0.1:5240/embedded-games/penalty-cup/index.html`. No push, deployment or cross-project sync was performed.

## Passed checks — 31 October 2026

- 38 unit/integration tests: tournament, mobile checkpoints, viewport policy, discovery and device assets (tests/penalty-cup.test.ts, tests/penalty-cup-mobile.test.ts, tests/mobile-game-viewport.test.ts, tests/home-catalog.test.ts, tests/device-assets.test.mjs).
- 34 existing Penalty Shootout regression tests: npm run test:shootout. The original game's default physics, animation and match rules remain covered.
- 108 browser screen-fit checks across 667x375, 844x390, 852x393, 932x430, 568x280, 844x300 and upright 390x844. Menus, all 48 selections, groups, third-place table, paged results/bracket, final result and history fit the viewport without page scrolling or clipped controls. No page errors were recorded.
- Actual simultaneous touch aim/shoot, goalkeeper input, dive/recovery, pause, completed-penalty reload and account isolation passed in the offline-bundle browser suite. No difficulty selector remains.
- The local preview passed landscape rendering, upright-phone rotation and persistent v2 save/reload checks at http://127.0.0.1:3199. It serves the maintained offline bundle, with local-only browser storage.
- npm run build:penalty-cup passed. The embedded offline HTML is approximately 8.8 MiB, with local fonts, character atlases/masks, physics and audio.
- Scoped ESLint passed with no warnings or errors. Repository lint had no errors and three existing unused-variable warnings in .cache/f1-racing-phone-probe.mjs, .cache/shootout-fx/capture.mjs and src/features/games/retro-circuit/data.ts.
- Targeted git diff --check passed.
- Final npm run typecheck passed, including Next route generation and TypeScript.
- Final npm run build passed: production compilation, TypeScript, all 64 generated pages and the device-download manifest, including /play/penalty-cup.
- npm run test:penalty-cup:app passed against that production build: real play route, landscape layout, upright-phone rotation, account-scoped v2 save and reload. No page errors were recorded.

## Rules, save and animation coverage

The 72 unit/integration/regression tests include all 495 third-place routing combinations, head-to-head ties, group draws, complete championship/group-elimination/bronze journeys, early knockout clinch, paired sudden death, retry decisions and duplicate result settlement. Random opponents differ from the selected nation.

New checks cover RNG state restoration, the next actual CPU outcome after restoring a checkpoint, early goalkeeper tap buffering, centre high/low reach, low-dive stretch/landing/recovery sampling, v1-to-v2 migration, backup recovery and stale-write rejection. Browser reload preserves finished penalties and resumes the next keeping/shooting turn. Random Game does not alter Cup progress.

## Earlier environment retries

Earlier typecheck attempts reported unrelated Racer nx/nz property errors. The final repository typecheck passed after those concurrent changes settled; no Racer source was changed for this task.

An earlier full build met a concurrent Next build lock. The final full build passed after the other build finished. No other process or build lock was removed.

An earlier integration attempt against the existing Next dev server on port 3123 timed out; its log contained repeated write EPIPE errors. The final integration run passed against the freshly completed production build. The standalone compiled bundle and local preview also passed independently.

## Evidence and physical-device limits

Current evidence: test-results/penalty-cup-mobile/checks.json, preview-checks.json and app-checks.json. Screenshots include nations at each viewport, paged brackets, compact results, shooting, keeper push/stretch/recovery, pause, preview reload and the production app's restored landscape cup. A gameplay WebM is stored in the video subdirectory. app-failure.png is retained only as diagnostic history from the earlier dev-server timeout.

Browser viewport emulation does not establish physical iPhone Safari performance, audible mixing, notch behavior on every device or real gamepad hardware. Existing simulated input coverage is preserved. Asset permissions/provenance remain in public/games/penalty-cup/PROVENANCE.json and the Penalty Shootout character notices. Cup scores are original gameplay, not historical World Cup results.

See PENALTY-CUP.md for rules and sources, and penalty-cup-mobile.md for implementation details.
