# StatOz console dashboard

The home route uses a game-art spotlight, a complete catalog strip with recent games first,
sport filters, horizontal sport shelves, and platform shortcuts. The shared
platform frame has one command bar (64px desktop, 48px short landscape), replacing
the sidebar, bottom navigation and outer ad gutters. Game interiors and their
orientation rules remain independent. The Shop retains native portrait behavior.

## Ownership and data

- Home composition: `src/features/games/components/console-dashboard.tsx`.
- Editorial ordering/crops: `src/mocks/games/home-presentation.ts`. Titles, routes,
  enabled status and sports still come from the existing catalog.
- Reusable layout tokens: `src/design-system/tokens/dashboard.ts`, paired with
  the dashboard custom properties in `src/design-system/styles/tokens.css`.
- Recent launches: `statoz.games.web.home-recents.v1`, registered with local
  account switching. Version 1 stores `{ version: 1, entries: [{ gameId,
  lastPlayedAt }] }`, at most twelve unique enabled games, newest first.
  Direct entry is recorded by the mounted game host. Prefetch and hovering do
  not record play. Missing, malformed or blocked storage uses featured ordering.
- Session-only browsing positions use account/sport-scoped
  `statoz.games.web.home-view.v1.*` and `statoz.games.web.home-library.v1.*` keys.
  The mobile navigation bridge snapshots these before leaving its frame.

## URL and interaction contract

`sport` filters home; `view=all` opens Library; `listSport` independently filters
Library (`all` overrides the home sport); `q` searches titles and sports; `game`
selects a validated enabled spotlight. Every enabled game stays in the main strip;
recent launches carry a small clock indicator. Existing game return
URLs remain compatible.

Library uses Next's native History API integration for immediate local search,
preserving URL state without a server request or pending search navigation.
Opening Library pushes history; Escape/Close removes Library-only parameters.
Native Back closes it. Focus returns to its opener. Launch links carry the
current filter, search and game in `returnTo`.

Mouse hover/focus previews lineup titles. Clicking a cover or Play launches.
Left/Right/Home/End navigate covers within a shelf. Touch pans shelves without
launching. Primary command shortcuts are 1 Games, 2 Library, 3 Shop, 4 Leaderboard;
text inputs, dialogs and browser-modified shortcuts keep their own keys.
Reduced-motion mode removes perceptible transitions.

The spotlight Play action keeps its chamfered cyberpunk silhouette with a
translucent glass edge, frosted backdrop and a brighter keyboard focus border.
This treatment is scoped to the dashboard action.

## Artwork

Four original text-free 1920×1080 backgrounds were generated with the built-in
`image_gen` tool from the existing Penalty Cup, Hoop Legacy, Formula and Cricketer
covers as identity references. Files live in
`public/assets/games/home/spotlights/`. `PROVENANCE.json` records each complete
generation prompt, source/reference hashes, final hash and file size. Existing
covers and notices were preserved. Final WebP files are under 200 KB each.
Other games use the existing cover and an explicit focal-position fallback.

The selected spotlight now plays a silent eight-second H.264 recording of its
actual local gameplay. All fifteen enabled titles have clips in
`public/assets/games/home/gameplay/`. `PROVENANCE.json` records hashes, duration,
dimensions, capture method and source notices; `CREDITS.txt` preserves inherited
asset attribution. Capture and normalization are reproducible through
`scripts/capture-home-gameplay.mjs` and `scripts/finalize-home-gameplay.mjs`.
Each preview plays twice, then crossfades back to its still artwork. Thirty
seconds without pointer, keyboard, touch or scrolling activity selects the next
game in the displayed strip, wrapping at the end. Rotation leaves focus in place
and only adjusts the strip's horizontal position when its next cover is hidden.
Manual pause, Library, hidden tabs, offscreen spotlights and reduced-motion mode
suspend rotation; returning starts a fresh idle period. Launching stops it.
Only one video mounts at a time; opening Library, scrolling it offscreen or
hiding the tab pauses playback. Reduced-motion viewers retain still artwork.
A pause control also stops the ambient grid and light sweep behind lower shelves.

Pitch Rush has a new illustrated cover; Fot Duel is the display name of the
existing `pitch-duel` game. Its route, save keys and internal IDs are unchanged.
Both new covers and complete generation prompts are recorded under
`public/assets/games/home/covers/PROVENANCE.json`.

## Local validation

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

```text
node node_modules/tsx/dist/cli.mjs --test tests/home-catalog.test.ts tests/home-recents.test.ts tests/game-navigation.test.ts tests/mobile-game-viewport.test.ts
node tests/home-hub.browser.mjs --url=http://localhost:3000
node tests/platform-rail.browser.mjs
node tests/game-navigation.browser.mjs --url=http://localhost:3000
node tests/home-gameplay.browser.mjs --url=http://localhost:3000
node tests/home-spotlight-idle.browser.mjs --url=http://localhost:3000
npm.cmd run typecheck
npm.cmd --ignore-scripts run build
```

The last command runs the production application build and device-asset manifest
without rebuilding unrelated game bundles through the package prebuild hook.
Screenshots are under `test-results/home-hub` and `test-results/platform-shell`.
The home suite checks desktop, tablet, four landscape phone sizes, an upright
phone with the rotated frame, reduced motion, search, recent play, touch panning,
and return navigation. Builds and previews stay local.
