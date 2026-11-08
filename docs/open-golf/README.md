# Open Golf

Original game by Michael Gerdes: https://github.com/mgerdes/Open-Golf (MIT).

The original public golf.js, golf.worker.js and golf.wasm remain unchanged with SHA-256 provenance. The shipped game uses golf-mobile.js and golf-mobile.wasm, rebuilt from source revision b9029f1e80c3110ae3d4fc9300854bdaeef96508 using Emscripten 3.1.64. Asset loading and GPU finalization run synchronously on the render thread, without pthread workers, shared memory, cross-origin isolation or a service-worker reload. This addresses startup failure in Android WebView and non-isolated browser frames. Courses, physics, graphics and controls remain upstream. Course loading may briefly block rendering.

The compiler stack is explicitly 5 MB (matching the original toolchain), with ordinary growable WebAssembly memory up to 256 MB. A smaller stack can crash during nested UI/GIF initialization. The adapter embeds runtime bytes, preserves account-scoped storage and lifecycle handling, and makes no remote game requests during play.

Routes: /?sport=golf, /games/golf, /play/open-golf. Build: node scripts/build-game-bundles.mjs --game=open-golf. The downloadable bundle embeds all bytes in embedded-games/open-golf/index.html and is included in the device asset manifest.

To rebuild, extract src/features/games/open-golf/source/upstream-source.zip to a scratch source directory and install/activate Emscripten 3.1.64 locally. Run python scripts/rebuild-open-golf-mobile.py --source <extracted-source-root> --sdk <emsdk-directory> --output <scratch-build-directory>. Copy golf.js/golf.wasm to src/features/games/open-golf/source/golf-mobile.js/golf-mobile.wasm, update their hashes in provenance.json, then rebuild the game bundle. The script records the source adaptation; it leaves the source archive unchanged. No cross-project synchronization is used.

Local verification covers startup in a non-isolated srcdoc frame with SharedArrayBuffer unavailable, course rendering, storage and pause/resume/dispose. Physical-device validation remains required. No publication is performed.

Third-party notices and the source archive preserve upstream attribution.

Touch fix: the upstream Emscripten input initialization selected mouse mode permanently. The rebuild script now selects touch mode when actual touch events arrive and restores mouse mode on a mouse press, clearing stale state on each change. This enables Play, course selection, aiming and shot release in mobile browsers and WebViews.

Regression commands: `npm run test:open-golf` (provenance, bundle, bridge exports, shell style rules and lobby progress parsing) and `npm run test:open-golf:browser` (mouse and keyboard; touch only; touch in a rotated portrait frame). Physical-device verification remains outstanding.

## Lobby and interface (2026-11-05)

`/play/open-golf` opens the lobby (`src/features/games/open-golf/components/open-golf-lobby.tsx`), drawn in the game's arcade style rather than the StatOz design system, at the user's direction. It mirrors the in-game hole select: Open Golf logo, progress bar, cleared / best total / aces and a Play button on the left, the 20-hole grid on the right, and a "?" dialog with how to play and credits. It reads the account-scoped bundle save (`stroke_count_level_N` inside `open-golf.storage`). **Tee off / Play hole N** or any unlocked hole tile boots the bundle straight into that hole. Leaving the game returns to the lobby, not to Games. Rubik is loaded on the host with `next/font/local` (`open-golf/fonts.ts`); the lobby CSS mirrors the shell's colours and shapes, so change both together. `BundledGame` gained two optional props for this, `launch` (passed to the bundle as `__STATOZ_BOOT__.launch`) and `onExit`; other games are unaffected.

Inside the game, every screen is the game's own modern arcade shell (`src/features/games/open-golf/shell`): splash and loading putt, hole select (5×4 in landscape, 4×5 in portrait, locked holes follow the upstream rule), hole intro banner, HUD (hole, strokes, best, pause), power gauge while aiming, tutorial hints, out-of-bounds toast, celebration, pause, hole complete with new-best/first-clear badges and course dots, a host-pause screen and an error screen. Style: sunny greens, cream and gold, chunky rounded 3D buttons, Rubik (SIL OFL 1.1, `fonts/OFL-rubik.txt`, hashed in `src/features/games/open-golf/source/provenance.json`). It does not use StatOz tokens, Orbitron/Space Grotesk, chamfers or cyber HUD styling, and the bundle builder no longer injects the StatOz fonts into this game.

Engine side, `rebuild-open-golf-mobile.py` now patches `src/golf/ui.c` so the engine stops drawing its menus, HUD text, pause and result panels, and appends `scripts/open-golf/statoz-ui-bridge.c`. The bridge exports `statoz_golf_*` getters (state, hole, strokes, best, power, tutorial step, out-of-bounds timer, transition flag) and commands (play, pause, resume, retry, menu, click sound). Commands go through the upstream transitions and fades; aiming visuals, the tutorial pointer, fades, courses, physics and saves are unchanged. `--interface-only` recompiles just the patched files. The bundle defers engine start until the splash has painted and decodes the WebAssembly with a plain loop.

Keyboard: Escape or P pauses and resumes, arrow keys move through the hole grid, and Space or Enter activates focused buttons. The engine cancels Space on the window, so key events aimed at shell controls are kept from it.
