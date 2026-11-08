# Crazy Grand Prix / F1 Racing — local client

**31 October 2026:** The active entry is now [Racer](racer/README.md) at `/play/racer`, an authored arcade game using adapted recovered meshes. `/play/f1-racing` is a compatible alias. The native integration below is retained history; Racer does not load the Unity client.

`/play/f1-racing` now launches the recovered original Unity client locally. The former online embed was replaced on 30 October 2026 at the owner's request. Career, practice, cars, tracks, art and physics come from the native build. Local keyboard and simultaneous touch-driving controls, host pause/audio/dispose and game/account-prefixed Unity storage are authored integration code.

The copied WASM has an explicit local-host policy at function34010 and the framework has an offline `_InitSDK` boundary. The actual browser origin is unchanged. Complete original payload hashes, old/new method body details and output hashes live in `native/localization-manifest.json`. This is an adapted original client, not an unchanged native build or an original Unity source project.

Reproduce native assets with `node scripts/install-f1-racing.mjs --source=<acquired-original-directory>`; pinned input hashes must match. Rebuild the host with `npm run build:f1-racing`. The compressed Unity data is split into byte-exact chunks below GitHub's 100 MiB blob limit and the local boot loader reconstructs it before streaming decompression. Original code/art ownership remains with its rights holders. On 30 October 2026, the project owner authorized publication on GitHub Pages.

Provider accounts, purchases, ads, leaderboard and network multiplayer are unavailable. Ad errors do not grant rewards. Native career/practice progression remains game-owned and persists on this device per host account. Game-earned progress is not synchronized to a remote account. A native multiplayer menu does not constitute an offline multiplayer implementation.

See [all local games, exact extraction locations and checks](local-games/README.md). A fresh checkout needs the existing acquired binary inputs restored locally; no CDN fallback is used.
