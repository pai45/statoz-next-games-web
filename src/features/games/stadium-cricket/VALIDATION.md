# Stadium Cricket validation — 22 October 2026

## Mobile responsiveness — 23 October 2026

Identified and fixed:

- At 844px landscape width, the original batting grid placed the action button at x=863, outside the screen. The responsive grid now keeps batting, bowling, catching and fielding actions fully visible, including Legend.
- Short landscape lobbies placed Play below the first screen (y=375–385). A two-column mobile landscape layout now places it at y=72.
- Source utility and shot buttons were only 29–32px high. Interactive touch targets are now at least 44px, with a 64px primary gameplay action.
- At 320px width, setup fields were squeezed into two 112px columns with 12px text. Narrow forms now use a single column, 16px field text and 48px field heights; dialogs scroll within the available viewport and keep Close reachable.
- Touch setup no longer automatically opens a text keyboard. The host responds to visual-viewport height changes and reserves notch/home-indicator space.

Passed: ten viewports (320×568, 360×640, 390×844, 412×915, 430×932, 568×320, 667×375, 844×390, 932×430, 768×1024), 80 role/difficulty/rotation combinations, input sizing, visible action bounds, control/scoreboard overlap checks, touch setup focus, exit cleanup and simulated safe-area/keyboard-height changes. Lint, typecheck, the four focused integration tests and production build passed. The original 15-file source hash manifest still passes.

Before/after audit images are in test-results/stadium-cricket/mobile-before and mobile-after; the reproducible check is scripts/verify-stadium-mobile.mjs, with screenshots and validation.json in test-results/stadium-cricket/mobile-regression. Safe-area and keyboard-height checks were simulated in Chromium; physical iOS/Android keyboard behavior remains unverified. No gameplay mechanics or camera code changed.

## Lobby presentation refresh

The lobby now follows the maintained 3D Penalty Shootout lobby composition: a full-screen original-game stadium capture, left-aligned wordmark and introduction, a three-cell capabilities row, one primary play action and compact expandable help/credits. StatOz tokens, type and controls are retained. No imported runtime or gameplay files changed.

Browser review passed at 1440px desktop, 412px portrait, 844px landscape and 320px narrow mobile, including overflow checks, keyboard disclosure activation, entering the original game and returning to the lobby. Updated screenshots are in test-results/stadium-cricket/lobby-refresh. Existing source-integrity, catalogue and save tests pass.

## Result

Implemented locally in Future Games Web. No push, hosted integration or publication was performed. Final Over is retired from the playable catalogue and launcher; its saves, historical progress readers and shared kit data remain.

## Source and gameplay

- Source: RealOmlit/CricketV2 at cb19e595d5a00a2764a6a5cb4b20fc48a2a733bc.
- All 15 upstream source/asset files pass the SHA-256 integrity manifest in vendor/cricketv2/SOURCE.json. Original game permission was confirmed by the user; existing third-party credits and Three.js r160 MIT notice are retained.
- Chromium parity comparison passed 19 scenarios: every role at every difficulty in two-over challenges, plus early victories configured for 5, 10 and 20 overs. Identical seeded random values and frame timestamps produced equal delivery choices, timing state, scores, wickets, striker changes, player figures, ball/camera positions and result text.
- The renderer was bypassed after initialization during simulation comparisons for speed. Actual rendering was inspected separately through screenshots and a recorded short innings. Longer configurations were checked through early finishes rather than complete 120-ball playthroughs.
- Source game files are unchanged. Integration lives in the outer lobby, packaging, account storage and host lifecycle adapter.

## Checks passed

- Seven focused catalogue, ownership, account-save, protocol and source-integrity tests.
- Full lint, typecheck, standard production build and subdirectory static-export build.
- Desktop, 412px portrait and 844px landscape visual inspection; no lobby horizontal overflow.
- Original game inside the StatOz host, completed short innings, saved configuration reload, account-switch remount, invalid-save preservation and frame removal on exit.
- Pause, keyboard camera control, sound toggle states, all five graphics preset selections and cancellation of animation callbacks on disposal.
- Old Final Over URL, subdirectory asset loading, original home-link reload and return to the cricket catalogue.
- Unavailable storage remains playable; write failures display a warning; unsupported WebGL displays a recoverable error.
- Recorded WebM decoded fully with FFmpeg 7.1 without errors.

## Evidence

## Single-lobby update — 2026-10-23

All configuration is now inside one expandable Match setup section on the StatOz lobby. Play Cricket is the sole primary CTA and invokes the original start action directly after readiness; the source intro and masthead are hidden in hosted auto-start mode only.

Verified direct launch with custom settings in all four roles, camera and sound preferences, low graphics, reload persistence and frame removal on exit. The mobile regression passed ten viewports and 80 role/difficulty/rotation checks, including simulated safe areas and visual viewport resizing. Screenshots cover desktop, 320px, 412px and landscape. Lint, typecheck, four Stadium Cricket tests, source hash verification, packaging and production build passed. The existing full deterministic parity and subdirectory suites were updated for the new lobby flow but were not rerun for this UI-only change. No upstream source files or gameplay algorithms were changed. Physical-device and audible-output limitations above still apply.

Repeat the focused flow with node scripts/verify-stadium-lobby.mjs and the expanded mobile suite with node scripts/verify-stadium-mobile.mjs. Earlier evidence above describes the previous two-screen entry flow.

Generated evidence is local and ignored by Git under test-results/stadium-cricket:

- validation.json: gameplay parity and hosted account/lifecycle checks.
- static-validation.json: subdirectory/mobile and failure recovery.
- lobby-desktop.png, lobby-412.png and lobby-844.png.
- original-desktop.png, completed-innings.png, static-game-mobile.png and static-game-landscape.png.
- video/: silent browser recording containing a complete short innings.

The actual game capture used by the lobby and catalogue lives in public/games/stadium-cricket/stadium-preview.jpg with a reference/provenance sidecar.

## Limits retained for iteration

Personal-best keys remain shared across roles, including defending modes, as in the source. Shot direction remains automatic, despite stale aiming instructions in the upstream README. No card gate, XP or coin awards were introduced. Audio toggle/lifecycle behavior was exercised, but audible output and loudness were not manually assessed. Physical-device frame rate, thermals and every graphics preset's visual fidelity have not been benchmarked.
