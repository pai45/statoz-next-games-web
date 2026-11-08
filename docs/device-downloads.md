# Per-game offline downloads

The production app opens its library immediately. `DeviceAssets` registers the
service worker and caches the core shell in the background. It never downloads a
game at startup. Development continues to bypass device downloads.

Every catalog PLAY action uses the same controller. PLAY checks the selected
game, downloads missing or updated files, verifies them, then opens its lobby.
The library stays visible while the selected Play button shows Downloading and
its percentage (or Updating for a new version). Completion opens the lobby
automatically. Failures show an inline message and the same control becomes
Retry download. Repeated clicks share the download; selecting another game or
leaving the page cancels the pending launch and retains verified files for resume.
There is no Play Online bypass or in-app uninstall screen. Challenge actions and
direct `/play/...` visits use the same verified download boundary. Direct visits
to an uninstalled game retain a full-screen fallback with Cancel and Retry.
The lobby gate keeps its initial checking state free of download UI, including
in prerendered HTML. It still verifies files before mounting the game; the
fallback appears only for a real download, update or error. This prevents the
already-installed lobby from flashing the install panel during hydration.

## Build outputs and ownership

Use `npm run build` or `npm run build:pages`; calling `next build` alone does not
generate the required download manifests. Both commands emit schema v2 under:

```text
public/_game-assets/<build-id>/index.json
public/_game-assets/<build-id>/core.json
public/_game-assets/<build-id>/games/<game-id>.json
```

Pages builds copy these outputs under `out/` with their deployment base path.
`scripts/game-asset-manifest.mjs` reads enabled routes from the actual registry.
Its explicit pack ownership table selects each game's embedded runtime and any
external dependencies. Self-contained bundles do not also install their loose
authoring assets. Pitch Duel includes its referenced football portraits; other
shop assets load normally on demand. The core contains the library document,
catalog art, shell scripts/fonts and an offline game-download fallback.

Each game owns its prerendered route document, route scripts, dynamic import
closure and CSS font dependencies. The generator uses the pinned Next.js client
and loadable manifests and fails when a route, runtime, shared dependency or
dynamic closure is missing. Revisit this extraction when upgrading Next.js.
Core and game manifests may reference the same URL/hash; the bytes are stored
once. The build prints core size and all game pack sizes before deduplication.

## Offline and update behavior

`AssetPackIndex`, `AssetPackManifest` and `AssetRecord` are exported from the
device-assets feature. The worker handles `INSTALL_PACK`, `CANCEL_PACK`,
`GET_PACK_STATUS` and `VERIFY_PACK`. Installation states are checking,
not-installed, downloading, installed, updating, error and cancelled.

The worker limits transfers to four globally, checks available quota and verifies
SHA-256 and size. PLAY rechecks cached content, repairs corrupt or evicted files,
and reuses completed files from interrupted downloads. Pack activation is atomic:
a failed update does not replace the previous complete version. When offline,
PLAY may open that version. An uninstalled game explains that internet is needed.

PLAY hard-navigates with `assetPack=<revision>` so the worker serves the exact
verified lobby document. Offline startup works from the cached root, and installed
`/play/...` routes support reload and cold launch after the browser closes. The
phone's platform/game frames inherit the same pinned game build. Game exits use
document navigation to the cached library. Cached media supports byte ranges.

Only build-generated static shell/game documents are stored. Accounts, APIs,
RSC responses and arbitrary private application pages remain network-only. Shop,
leaderboard and account operations are not an offline product in this change.
The worker never calls skipWaiting or reloads a running game. If the previous
worker is still controlling another tab, close all StatOz tabs and reopen the app
to activate the new download protocol.

## Migration and storage

The `files-v1` content-addressed cache is retained. Matching legacy bytes are
adopted lazily when a pack is checked; unadopted legacy files are preserved as
migration sources. Installed packs, partial downloads and live client versions
protect their files from cleanup. Unreferenced v2 revisions are pruned after
successful installation. No save or account key is deleted or migrated by this
feature.

Storage persistence is best-effort. Browser eviction requires repairing missing
files; clearing all site data also clears local progress. Users manage storage
through browser/device settings. Device downloads are shared across local
accounts, while game progress keeps its existing account/guest namespaces.

## Validation

- `npm run test:device-assets`: isolation, resume/cancel, corruption/eviction,
  quota, v1 adoption, atomic updates, live tabs, ranges and build extraction.
- `npm run test:device-assets:browser`: production startup requests, single PLAY,
  retry, cancellation, offline errors, every enabled game, browser restart and
  SHA-256 verification of every pack file with the network offline.
- Add `-- --launch-only` for inline progress, retry, superseded launches and
  a fresh phone download that opens the landscape lobby automatically.
  It also checks prerendered HTML and observes DOM additions from document start
  across navigation and frames, so even a transient install panel fails the test.
- After `npm run build:pages`, use
  `npm run test:device-assets:browser -- --pages` for `/statoz-games-web` coverage.
- Browser evidence is saved to `test-results/device-assets*`. Set
  `DEVICE_ASSETS_CHROMIUM` to override the installed Chrome executable.

Physical Android Chrome and iPhone Safari acceptance must cover storage eviction,
background interruption, touch orientation, audio unlock and device restarts.
