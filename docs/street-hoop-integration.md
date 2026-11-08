# Street Hoop local integration

> Release exclusion — 30 October 2026: Street Hoop (`retro-hoops`), Retro Football 2 (`retro-football-2`) and Football Shooting (`football-shooting`) are removed from discovery, play routes, bundle builds and GitHub Pages artifacts. All source, runtime assets, notices and local saves remain on this workstation. This does not publish a release.

This replaces the playable content at `/play/retro-hoops` with the actual Street Hoop arcade game while retaining its stable route, handheld frame and on-screen controls. The former original Rimforge 3 implementation and saved results remain in the repository; they are not the active game or used to fabricate arcade results.

The included runtime adapter and mobile controls are original project code. The local engine is EmulatorJS 4.2.3 (GPL-3.0), source https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3 . Its unmodified licence is retained in `data/LICENSE`. The FBNeo core is downloaded from the same official CDN; preserve its licence and source notices. The ROM and BIOS retain their respective owners' rights and have no recorded redistribution licence. Their files and the generated local emulator assets are ignored by git. No hosting or publication is authorized by this integration.

`assets-manifest.json` records byte identities and origins. The local files are provisioned for this workstation. Missing files produce a retryable loading error; there is no third-party site iframe, advertisement, remote tracker or hosted emulator dependency during play.

Controls: analog touch position becomes an eight-way digital stick with a dead zone; independent pointers can hold movement and A/B together. A maps to native Neo Geo A (RetroPad B/0), B maps to native Neo Geo B (RetroPad A/8). Coin and Start are native inputs. Very short action taps are held for at least 50 ms; native action timing, difficulty and game rules are otherwise retained. On interruption, input clears and the core pauses. Host account scopes namespace emulator IndexedDB storage. The account identity itself is not sent to a third-party service.

The native BIOS boot is allowed to finish before the initial credit/Start sequence. The wrapper uses emulated frame count for this gate. It does not forge score, result, match length or completed-match progress. Settings preserve the shared handheld/on-screen layout and offer left-handed controls, touch size and game volume.

Validation commands: `npm run test:street-hoop`, `node scripts/build-game-bundles.mjs --game=retro-hoops`, `npm run lint`, `npm run typecheck`, `npm run build:pages`. Physical Android/iOS verification is separate from browser viewport tests.

Re-provisioning: keep an authorized local backup containing `data/` and `roms/`. Run `node scripts/install-street-hoop-assets.mjs <backup-directory>` to verify every SHA-256 before installation. This script never downloads the game or BIOS. Run `node tests/street-hoop.browser.mjs` for mobile browser checks (Chrome installed; `STREET_HOOP_BROWSER` overrides its Playwright channel). Generated bundles must be rebuilt after adapter changes.

Re-provisioning: keep an authorized local backup containing `data/` and `roms/`. Run `node scripts/install-street-hoop-assets.mjs <backup-directory>` to verify every SHA-256 before installation. This script never downloads the game or BIOS. Run `node tests/street-hoop.browser.mjs` for mobile browser checks (Chrome installed; `STREET_HOOP_BROWSER` overrides its Playwright channel). Generated bundles must be rebuilt after adapter changes.

