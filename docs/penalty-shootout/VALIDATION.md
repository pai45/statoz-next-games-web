# Local delivery and validation

Date: 21 October 2026. Checkout: `statoz_web`. Route: `/play/penalty-shootout`. This delivery is local; no commit, push or deployment was made.

## Delivered

The mounted game now uses Three.js, skinned original football animation and Rapier at 120 Hz. Composure, charged power, continuous aiming, aim lock, three shot styles, physical goal/frame/keeper contacts, direct keeping, AI, five-kick rules, paired sudden death, training and recorded-transform replay share one simulation. Touch, keyboard and gamepad adapters feed the same actions.

The lobby, HUD, tutorial, pause/settings, summary and discovery integration have been rebuilt. Deck ownership is no longer required. Existing authentication, return navigation, lobby ads, career XP/history and completed-match rewards remain integrated. Session IDs deduplicate history and wallet settlement; training and abandonment award nothing.

Editable character source and authoring recipes are under [assets](assets/). Runtime provenance, source URLs, licences, adaptations, sizes and SHA-256 hashes are in [manifest.json](../../public/assets/games/penalty-shootout/manifest.json). The official CC0 realistic human foundation and CC0 crowd recording were adapted locally. No FIFA models, animations, sounds or textures are bundled. The [reference study](REFERENCE.md) separates documented controls, observed presentation and original tuning.

## Automated verification

| Check | Result |
| --- | --- |
| Repository tests, 16 files | 100 passed |
| Shootout-specific engine/account/input/model cases | 15 passed, included above |
| Packaged browser journeys | 6 passed against the final static export |
| Full ESLint | Passed |
| TypeScript | Passed |
| Normal production build | Passed |
| Static `/statoz_web` export | Passed |

Engine cases cover timing/power/aim locking, styles, full-ball goal crossing, actual Rapier goal/miss/frame/keeper contacts, AI information boundaries, seeded equivalence at 30/60/144 Hz render schedules, early termination, paired sudden death, complete physical win/loss sessions, replay isolation, save migration, account switching, blocked storage and exactly-once result recording. Input cases cover keyboard/gamepad/touch dispatch and cancellation.

The exported skinned boot is checked geometrically at the one-second contact event. A second geometric regression runs the actual renderer's hand IK over ready, centre, low, middle and high dive poses. It verifies that each glove encloses the visible hand, stays inside its collision shape and matches the simulated palm position. Final visual review exposed the original glove offset; the palm pivots and shells were corrected before this delivery.

The six browser journeys exercise desktop shooting, replay, pause and keeping; simultaneous touch stick/charge in portrait and landscape; a complete losing match and reload without duplicate settlement; failed model loading followed by retry; WebGL context loss/restoration with explicit resume; and starting muted then unmuting the crowd. Complete wins and sudden death are exercised by the physical engine tests, rather than claimed as manual browser playthroughs.

Tooling caveat: after all six journeys passed, two owned headless Chromium processes lingered during shutdown and required explicit cleanup. The suite then exited successfully. The installed Chromium 153 executable was used; it is older than this Playwright package's default browser revision. This is recorded separately from gameplay assertions and device acceptance.

## Captures and measured budget

Final captures and recording are in [evidence](evidence/). The recording uses the live browser audio mix, encoded as H.264/AAC at 30 fps, then fully decoded with FFmpeg. Original audio files are separately decoded and peak-checked. The ambience has a circular half-second crossfade; an invalid empty export found during verification was replaced. There is no music.

Desktop shooting, the replay angle, the corrected keeping pose, and portrait/landscape captures were visually inspected. The phone captures retain the full goal and separate portrait controls below the scene.

Final capture metrics are recorded in [capture-metrics.json](evidence/capture-metrics.json): 69 draw calls and 74.4 fps in the renderer's last 180-frame desktop sample; 3.97 MiB of response bodies across the cold navigation and gameplay capture. No HTTP errors were observed. This exceeds the 60 fps desktop target in that sample and stays below the 150-draw-call and 15-MB budgets, but is not a sustained-device benchmark. The runtime asset bundle is approximately 1.37 MiB, before transport compression. The editable Blender file and review media are documentation assets and are excluded from the game payload.

Test host: Windows 11 build 26200, Intel Core i7-12650H, 16 logical processors, 16 GiB RAM, NVIDIA GeForce RTX 3070 Ti Laptop GPU through ANGLE/D3D11. Browser: installed Chromium 153.0.8010.12, headless. Desktop recording viewport: 1280 x 800 at DPR 1. Phone emulation viewports: 412 x 915 portrait and 915 x 412 landscape with touch enabled.

## Remaining device acceptance

Physical midrange-phone sustained 30 fps, thermal/battery behaviour, Safari/iOS, and physical controller connection/ergonomics have not been verified. Headless desktop samples and emulated phone dimensions do not establish those results. The adaptive resolution/shadow path is implemented. A long-duration desktop performance run and subjective listening on physical speakers/headphones remain manual acceptance work; decode and peak checks alone do not establish perceived audio quality.

The original animation set is authored for this compact browser game; it is not a claim of FIFA animation or visual parity. Frame-by-frame exported geometry checks establish foot and hand contact alignment, while final screenshots/recording provide the local visual review evidence.

## Reproduce

Run `npm run test:shootout`, `npm run lint`, `npm run typecheck`, `npm run build` and `npm run build:pages` from the web checkout. Run all root `tests/*.test.ts` and `tests/*.test.mjs` through the installed `tsx --test` runner for the 100-test repository check. For browser verification, serve the completed static output, set `SHOOTOUT_URL` to the local URL including `/statoz_web`, optionally set `SHOOTOUT_CHROMIUM` to an installed Chromium, then run `npm run test:shootout:e2e`.

Detailed build/test logs, the reference excerpt/contact sheet, original downloaded source archives, and untrimmed capture inputs remain in the local Designer work folder `output/penalty-shootout-revamp`.
