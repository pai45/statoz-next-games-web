# Shared retro presentation

Football, Hoops, Circuit and Innings use the shared plastic handheld styles and presentation lifecycle in `src/features/games/shared/retro`. Each renderer retains its own canvas, controls, game state, audio settings and records.

New preferences default to on-screen buttons and fullscreen. Settings offers on-screen or side-button controls and fullscreen; the saved preference applies to all four games for the active account. The web host stores it separately from game archives under `statoz.games.web.retro.presentation.<encoded account or guest>`. Missing or invalid presentation data uses defaults without rewriting progress. Storage denial permits temporary play.

The existing bundle protocol gains an optional boot `presentation` field and a `presentation` event containing `{schemaVersion:1, layout:"onscreen"|"handheld", fullscreen:boolean}`. The parent validates the complete value and the existing source/origin/game/session envelope. Older native hosts may omit preferences and receive defaults; importing or releasing Flutter bundles remains a separate task.

The viewport fills immediately. The lifecycle attempts fullscreen at mount and retries once on the first supported user interaction; browser restrictions retain the fitted viewport. Escape can exit fullscreen without triggering a request loop. Landscape lock is best effort. Portrait phones show a rotation prompt; rotation, settings and background transitions pause play and clear held input. Rendering preserves each game's aspect ratio.

Validation commands:

- `npm run test:retro-presentation` checks preference validation, all four rebuilt bundles, phone touch targets, simultaneous touch movement/action, settings messages, portrait blocking, and phone/tablet/desktop layouts. Screenshots go to `test-results/retro-presentation`.
- With a production preview on loopback, `node tests/retro-presentation-host.browser.mjs` checks real account-scoped storage, all four game routes, reloads and invalid messages. Set `RETRO_HOST_URL` to use a different preview URL.
- Run lint, typecheck, the existing retro regression tests, and the production build.

Browser automation covers Chromium viewport behavior; physical-device orientation locking and browser fullscreen policies require device checks. No publication or cross-project synchronization is part of this change.
