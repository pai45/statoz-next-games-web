# Local game integration — 30 October 2026

**31 October 2026:** Racer supersedes the active Crazy Grand Prix entry. Its new quick race, controls, source, retained assets and current validation are documented in [Racer](../racer/README.md). Earlier native-racing validation below describes the archived client.

> Release exclusion — 30 October 2026: Street Hoop (`retro-hoops`), Retro Football 2 (`retro-football-2`) and Football Shooting (`football-shooting`) are removed from discovery, play routes, bundle builds and GitHub Pages artifacts. All source, runtime assets, notices and local saves remain on this workstation. This does not publish a release.

Maintained code and playable assets live in this Future Games Web checkout. Designer remains the read-only acquisition/research source. No online backend, provider account, advertisement, payment or matchmaking service is required for the local modes below. On 30 October 2026, the project owner authorized publishing the playable runtime assets on GitHub Pages; optional editable research libraries remain local-only.

## Play

Open the maintained Future Games Web application at http://127.0.0.1:3211/ for the production preview, or http://127.0.0.1:3210/ for the existing development server. Active games are in the normal All Games library and their Football, Cricket, Tennis, Motorsport or Archery category. Each opens through `/play/<game-id>`, uses the current player?s local storage and returns to the correct sport page. Football Strike assets appear in **Football Shooting**; the existing Retro Innings game keeps its **Creasefire Six** identity. Archery Master, Stick Cricket Chase and Crazy Grand Prix keep their existing stable route IDs.

The separate QA hub remains available: run `npm run preview:local-games` and open http://127.0.0.1:5240/local-games.html. It binds to loopback only and persists account A/B preview saves separately; `?account=b` selects the second test account. The application does not depend on that preview server.

| Research title | Maintained route | Local implementation |
| --- | --- | --- |
| Stick Cricket Chase | `/play/stick-cricket` | Existing original Unity client, native lessons/chases, account-scoped Unity storage and host controls. |
| Archery Master | `/play/archery-test` | Original shipped browser client, local platform/player data, original equipment and level progression. |
| Penalty Shooters 2 | `/play/penalty-shooters-2` | Original Construct engine/project/event sheets, all recovered teams, atlases and physics, with a local platform adapter. Separate from the existing 3D Penalty Shootout. |
| Football Strike assets | Excluded from next release; files retained locally | Existing authored browser shooting/keeper game now renders recovered original skinned character parts and eight native-curve-derived animations; exposes a persisted jersey-colour/palette editor. This is not an Android APK port or a claim of identical Miniclip gameplay. |
| Tennis Bits | `/play/tennis-bits` | Complete original WASM/data/framework and all 752 catalogued Addressable bundles, local platform/storage, native tutorial and CPU tennis. |
| Soccer REAL | `/play/soccer-real` | Original shipped Three.js game and models, native CPU quick matches/tournament, local persistence. The formerly online entry now starts local CPU play. Optional mid-match ad offers are skipped without awarding a boost. |
| Creasefire Six (Retro Innings) | Retired 30 October 2026 | Removed from discovery, direct play routes, local builds and device downloads; source retained as development history. |
| Racer (formerly Crazy Grand Prix) | `/play/racer` (`/play/f1-racing` compatible) | Authored Three.js quick race: recovered and restyled car/circuit meshes, StatOz Circuits signs, two laps, six cars, analog steering, brake/boost and account-scoped personal best. Original Unity client retained as history. |

## Main application integration

- Catalogue covers and discovery scenes use the installed game artwork, including a direct original native practice-grid capture for Crazy Grand Prix. Active games have registered How to Play pages with a link back to their maintained play route.
- The shared bundle host shows loading, retry and return controls; preserves incompatible saves; and remounts the live game when the account changes. Sport-page exits resolve from the same category data as the catalogue.
- Penalty?s native URL resolves against the inherited document base inside the application iframe. Its bridge validates the actual native origin. Native disposal uses Construct?s supported suspension API, suspends audio and lets iframe removal discard the window; calling the shipped runtime?s unsupported `Release` path or closing audio before its queued suspension callback raises errors.
- Each local edition uses a normal same-origin bundle URL, with a validated parent-to-game bootstrap for its account, saves and session. The service worker pins its compiled asset build before starting native/model requests. Native HTML session/account parameters remain in the live URL but are excluded from the immutable HTML cache key. Native child clients inherit the correct pinned version. Soccer?s original immutable texture `?v=1` requests use the same pinned file. Application/account navigation remains network-only and is never stored in the asset cache; the local app server must remain running.
- Rebuild the active local editions with `npm run build:local-games`, then run `node scripts/build-with-assets.mjs` to build the application and its matching device manifest. Do not keep an old manifest after changing generated runtime files.
- `npm run test:local-games:app` tests the real production catalogue, runtime boots, save reload/account isolation, phone navigation, guest entry and retry flow. It exercises the existing on-demand fallback in a context where device downloading is unavailable. `npm run test:device-assets:browser -- --local-games` separately uses a throwaway ordinary disk-backed Chrome profile, verifies the complete download/retry/repair path and blocks asset networking while checking cached files and game boots.

Reports: `test-results/local-games/app-integration/checks.json`, `test-results/device-assets/results.json`, `app-production-real-frames.log` and `app-device-cache-unit-final.log`.

## Every recovered export is attached to its game

The optional editable libraries are `.local-game-assets/<game-id>/`, indexed by [extraction-library.json](extraction-library.json). Each file has a source research path, byte length and SHA-256 in its game manifest. They contain 80,612 copied/verified exports, approximately 1.52 GB decimal, including original meshes, textures, raw clip/rig/material JSON, typed records/locators, sprite frames, audio, portable Stick GLB/Blender scene, Archery/Soccer curves and code atlases.

Public `games/<id>/dissection/manifest.json` files retain the indices. The loopback preview server serves the corresponding library files at those same `/games/<id>/dissection/…` URLs. Ordinary Next builds do not distribute these optional libraries. The active games load their native or `recovered/` runtime representations, and the device-download manifest excludes `dissection/` and immutable `originals/` inputs. The finished production asset cache is approximately 581 MiB across the whole active game catalogue, not the extra 1.52 GB of editable research copies.

Run `python scripts/install-extraction-library.py` from this checkout to reproduce the copies from existing Designer evidence. It verifies originals and destinations and preserves the acquired source. It does not download anything. Do not interpret JSON/WAT exports as an original Unity editor project or original C# source.

## Reproducible native adaptations

- `scripts/install-penalty-shooters-2.mjs` copies the recorded Construct snapshot, replaces its DOM SDK adapter, removes captured-site service-worker registration and installs a local storage/lifecycle bridge. Native gameplay, teams, event sheets, sprites and physics remain the original client. `assets-manifest.json` records original and transformed hashes.
- `scripts/build-tennis-bits-assets.mjs` verifies immutable `originals/` hashes, generates the local client and records its local policy. Metadata token `0x06000b05`, CodeGenModule slots and WASM element mappings identify `SiteLock.IsOnValidHost` as function 21883. Only that copied WASM body is changed to the explicit local-host policy; original input is preserved. The SDK JavaScript boundary is replaced with local data/device information and unavailable online services. No origin or authenticated identity is impersonated.
- `scripts/install-f1-racing.mjs` verifies the pinned complete original payloads. Its analogous local policy changes function 34010, replaces `_InitSDK` and records original/body/output hashes in `native/localization-manifest.json`. Original data/loader bytes are preserved. Local policy adaptation is an explicit client modification, not an unchanged-original claim.
- `scripts/build-soccer-real-assets.mjs` verifies `originals/`, preserves the original client and art, changes selected platform/matchmaking entry functions to local CPU flows and skips optional advertising. Its manifest identifies both original and localized files.
- `scripts/native-frame-gate.js` stops scheduled native frames and audio on host pause, releases held keys and cancels pending work on disposal. The native bridges validate source window, origin, game/session and namespace storage.
- Football's `recovered/` contains all 524 typed appearance records, 43 selected keeper/shot records, original skin geometry, hierarchy, runtime textures and eight converted clips. `recovered-athlete.ts` binds those original meshes/weights/matrices. Jersey changes update that original character mesh and persist in the host account. The rest of the typed native tuning is available for inspection; it is not blindly substituted into the authored browser physics with unverified units.

Football and Stick portable humanoid animation is re-solved by the installed Unity2022 Avatar solver using original samples. Exact Unity6000 runtime IK/controller/shader parity is not established. The original native Stick client continues to use its own native clips during gameplay.

## Local saves and remaining boundaries

JavaScript progress uses the existing game/account bundle bridge. Unity IDBFS/PlayerPrefs databases have per-game/account prefixes. Storage removal resets local progress. Earned progression remains native; ad or purchase success is never fabricated. Online multiplayer and provider commerce/account/leaderboard services are outside these local editions. Native online-only menu entries do not establish an offline multiplayer implementation.

Archery retains the previously documented EnvironmentA 1024-quality resource substitution with exact available 512 bytes. Retro Innings retains its existing unfinished keeper/certain movement fidelity limitations. No original developer repositories, full Unity projects, source artwork projects or server implementation have been invented or claimed. Source notices and local-reference scope remain in force.

## Checks

- Production Next build and device manifest completed successfully; all local play routes and eight added rules pages prerender. The pack contains 3,211 files (580.6 MiB).
- All 14 real-application checks passed: eight catalogue/runtime/exit flows, same-browser account isolation and reload, three phone layouts/navigation flows, guest entry and retry recovery; zero runtime errors, failed requests or external calls.
- The complete pack downloaded, resumed after a deliberate failed file, repaired an evicted file, served every cached response and booted all eight local games while asset networking was blocked. The existing Vibe gameplay/cache check and unsupported-storage fallback also passed; zero post-download asset requests reached the server.
- Typecheck and whole-repository ESLint completed; ESLint reports warnings separately from errors.
- 22 focused existing game/catalog tests and nine local-integration tests passed; 12 device-cache tests passed.
- Football browser checks passed full five-ball practice and ten alternating CPU turns, result/save/replay, reload/account isolation, touch cancellation, pause/disposal, phone/landscape/desktop and zero external requests/failures/errors.
- Archery browser checks passed ordinary touch completion 24/21, earned Level2 persistence/reload, second-account isolation, pause/audio and zero external requests/failures/errors.
- Stick browser checks passed native lesson/input, touch controls, interrupted input cleanup, frozen native frame/clock pause and account-prefixed Unity databases without remote requests/errors.
- Penalty and Soccer browser checks completed full native CPU matches and reported real scores to the host. Tennis reached its original result/reward panel and passed pause, reload and account isolation. All three report zero external requests, failed loads or runtime errors. Racing passed native setup/driving, pause/resume, scoped storage and disposal; this is bounded driving coverage.
- Retro completed two innings through its built-in manual-clock inspection API using normal bowl/delivery commands, with no score/state assignment. This establishes instrumented completion, not human timing acceptance.
- New-client reports and screenshots live in `test-results/local-games/`; [VALIDATION.json](VALIDATION.json) consolidates actual bounded coverage. Exhaustive campaign completion, every equipment variant and physical-phone acceptance are not asserted.

The final closure pass added 660 Tennis Addressable bundles (20,549,463 bytes); all 752 catalogue entries are now present. Penalty now has all seven WebM files declared in its native project, including six additional match effects. These raw native acquisitions are preserved beside their manifests; they are distinct from the earlier 80,612 editable exports.

Useful commands: `npx tsx --test tests/localized-games.test.ts tests/f1-racing.test.ts`, `npm run test:football-shooting:browser`, `npm run test:archery-test:browser`, `npm run test:stick-cricket:browser`, `npm run typecheck`, `npm run lint`, and `node scripts/build-with-assets.mjs`. Rebuild one game using `node scripts/build-game-bundles.mjs --game=<id>`; Tennis/Soccer installers run automatically, Retro rebuilds its source, and other native installers have separate pinned-input verification.


## Direct game entry (2026-10-31)

All six maintained native launchers (Stick Cricket Chase, Archery Master, Penalty Shooters 2, Tennis Bits, Soccer REAL and Crazy Grand Prix) boot as soon as their page opens. The redundant wrapper title/instructions/Play screen is removed. A loading status appears while preparing the game; native game menus and team/level selection remain inside the game. Pause/resume, retry/restart, exit and account-scoped saves keep their existing controls. Browser integration checks enter without clicking a wrapper Play button.
