# Mobile game orientation

All enabled games except Tennis Rally and the portrait-first games listed in
`src/features/games/shared/mobile-viewport/policy.ts` open in a landscape
viewport on coarse-pointer devices up to 1366 CSS pixels wide. Desktop behavior
and the exceptions keep their existing layout. No rotate-screen overlay, browser
permission, fullscreen request, or native orientation-lock support is required.

The shared game launcher hosts the same game route in a same-origin iframe. On
an upright phone, the host swaps its width/height and rotates it 90 degrees. The
game receives a genuine landscape `window.innerWidth`, media queries and pointer
coordinates. When the device is already landscape, rotation is removed without
reloading the iframe or losing the current match. Visual viewport and safe-area
changes resize the same frame.

Shop and Shop Search use the shared landscape platform frame on phones, just
like Games, Leaderboard and Profile. Direct shop links and navigation from other
platform tabs stay in that frame. Upright phones display it rotated; sideways
phones display it without rotation. Search, checkout and purchase celebrations
use the same landscape viewport, and turning the phone preserves their state.
Tablets and desktops retain their normal platform layout.

The app-layout navigation bridge forwards route changes from that frame to the
outer app. Exiting, authentication and opening a deck editor leave the landscape
frame; messages must come from that exact iframe and the same origin. Existing
account/save stores remain shared. The device-download service handles the child
document's asset checks using the same cached files.

Native browser chrome and the operating system are not forcibly rotated. Browser
orientation locking is unavailable on some platforms and often requires fullscreen.
The viewport works independently of those restrictions.

Run `npm run test:mobile-viewport` and `npm run test:mobile-viewport:browser`.
The browser check starts a local development preview, exercises all game routes,
tests real touch coordinates and match continuity on resize, and writes screenshots
under `test-results/mobile-viewport`. Set `MOBILE_VIEWPORT_CHROMIUM` to change the
installed Chrome executable. Phone/tablet emulation does not replace testing on
physical iOS and Android hardware.
For the production export, run `npm run build:pages` followed by
`npm run test:mobile-viewport:browser -- --pages`. This focused orientation test
serves a one-file download manifest; full asset caching is covered separately by
the device-assets browser suite.
When a preview is already running, pass `-- --url=http://127.0.0.1:3142` with its
actual address; the check will reuse it and leave it running.

The mobile host denies native fullscreen to its descendants: browser fullscreen
styles remove ancestor iframe transforms and would undo the landscape viewport.
Desktop fullscreen behavior is unchanged.
