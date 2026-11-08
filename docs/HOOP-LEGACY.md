# Hoop Legacy

Local import of the user-supplied `Downloads/hoop legacy` game, added to the
basketball library and home feed at `/play/hoop-legacy` on 2026-11-06.

## Game and controls

The source is a standalone React 19 / Three.js 0.187 / Tailwind 4 game. It offers
1v1 and 3v3 half-court matches, a three-point contest and three career save slots.
Career chapters are Blacktop, City Circuit, Combine and Pro Hoops League, with
recruitment, draft, upgrades, local currency and later seasons. These systems are
internal to the game; they award no host currency, packs or leaderboard entries.

Matches use timed hold/release shooting, pump fakes, contextual finishing,
passing, switching, steals, blocks, clear-ball rules, fouls, free throws and a
12-second shot clock. WASD/arrows move, Shift sprints, Space/J shoots or blocks,
K/E passes or switches in 3v3, L/Q performs a move or steals, and Escape/P pauses.
Gamepad and the original contextual touch buttons/joystick remain supported.
The contest moves between racks automatically and uses the same shot timing.

## Source and build ownership

`src/features/games/hoop-legacy/source/SOURCE.json` records SHA-256 hashes of all imported source,
asset and tool files. The original Downloads folder is unchanged. Source notices
and the original Figma configuration are retained. Figma preview injection,
analytics and development plugins are not used by the host build. There was no
blanket license for the supplied game source; see `src/features/games/hoop-legacy/source/NOTICE.md`.

The active athlete renderer uses repository-authored, skinned meshes: a conformed
MakeHuman CC0 body/head with face/build morphs, fitted eyes and cards, basketball
uniforms, layered shoes, hair and accessories. Game assets preload from this
repository; close-up views load the hero tier locally. Failed or timed-out loading
retains the original procedural character. The supplied smoke-test asset remains
part of the preserved baseline. Audio is procedural WebAudio with browser speech
commentary and captions.

The production plan is in `docs/HOOP-LEGACY-ATHLETE-PLAN.md`. Authoring and
regeneration instructions are in `tools/hoop-legacy-athletes/README.md`; the hashed
distribution and CC0 provenance live in `public/games/hoop-legacy/athletes`.

`scripts/build-hoop-legacy.mjs` verifies the baseline, bundles the game with its
own locked dependencies, inlines the original Barlow fonts and compiles its
original Tailwind theme. `src/features/games/hoop-legacy/source/statoz/entry.tsx` owns the host adapter.
The host lifecycle, authored character constructor and close-up detail selection
are patched in memory; no baseline source files are edited. No host fonts,
palette, global CSS or components enter the game.

Run `npm ci --prefix src/features/games/hoop-legacy/source --omit=dev --ignore-scripts` after checkout
(also included in the root postinstall). `npm run build:hoop-legacy` generates
`public/embedded-games/hoop-legacy/index.html`, local auxiliary assets and notices.
Full game and production builds regenerate it as well. Relative auxiliary paths
support static subdirectory hosting. The device asset manifest caches the entire
embedded folder, including KTX2/WASM files, plus the game cover.

## Host lifecycle and saves

The existing BundledGame launcher supplies a session-validated protocol and
virtual localStorage before the game imports its store. Career slots, settings
and quick-play/contest records are saved inside
`statoz.games.web.bundle.hoop-legacy.<encoded-account-or-guest>`. The original
`hoop-legacy:*` names are inner keys only; they do not leak into host localStorage.
No other game's keys are read, migrated, removed or reused.

Background/blur suspension stops simulation, input and sound, with an explicit
Resume overlay. The engine's own pause state is retained separately. Disposal
unmounts React, stops music/crowd/commentary, closes audio and releases the renderer,
input and wake lock. Back to Games returns through the existing host return
path. In a match, use its Pause menu to quit to the game menu or use the background
pause overlay to leave directly. Career saves checkpoint between events; an
unfinished match is replayed, not resumed mid-possession.

## Validation

- `npm run build:hoop-legacy`
- `npm run test:hoop-legacy`
- `npm run test:hoop-legacy:pause` for the isolated held-input suspension regression.
- `npm run test:hoop-legacy:browser` against a local host (default localhost:3000;
  override with `HOOP_LEGACY_TEST_ORIGIN`, including a static base path if needed).
- `npm run test:hoop-legacy:athletes` validates the authored pack and budgets.
- `npm run test:hoop-legacy:athletes:browser` exercises real creator, 3v3, detail
  selection and blocked-asset fallback at low/medium/high settings.
- `npm run test:hoop-legacy:deformation` checks actual skinned vertices across
  translated/rotated/jumping detail swaps and enforces decoded-memory sharing.
- `npm run review:hoop-legacy:athletes -- --coverage` captures identical baseline
  and authored views, all ten hairstyles, five skin tones and seeded face variants.
- `npm run typecheck` and production build.
- With vendor dev dependencies installed:
  `node src/features/games/hoop-legacy/source/node_modules/typescript/bin/tsc -p src/features/games/hoop-legacy/source/tsconfig.statoz.json --noEmit`.

Browser evidence is written under `test-results/hoop-legacy`. Automated touch and
viewport emulation do not establish physical iOS/Android GPU performance or
audible speaker output.

Completed locally on 2026-11-06: production build (including the generated play
and guide routes), host/vendor TypeScript checks, scoped lint, three import tests,
five home-catalog tests, twelve device-cache tests and the production browser
suite all passed. The browser suite exercised all modes, keyboard input, validated
pause commands, career creation/reload, account isolation, return navigation and
844x390 / 390x844 touch viewports, with zero page errors or failed requests.
It used the host's supported Play online fallback and the game's Low/75% setting;
the default Auto/High title scene was separately captured and reviewed. The device
manifest was checked for the game HTML, cover, optional athlete manifest/textures
and Basis transcoder. Physical-device performance remains unmeasured.

## Athlete stretching correction

The authored mesh originally rebound to the player's current world matrix during
detail changes, while its skeleton inverses remained in the original bind space.
Court translation and facing therefore distorted the skin during intro/replay or
quality changes. Reproduction stretched a human athlete beyond 24 m. The renderer
now retains its construction-time bind matrix and swaps mesh geometry without
resetting the skeleton. Vertex round trips are exact across 20 combinations of
pose, court position, jump offset and facing; posed extent stays below 2.34 m in
that regression. Bone-only checks did not detect the original defect.

Identical geometry is cached by SHA-256 across quality tiers. Unused colour and
region attributes are removed; team-print materials survive detail swaps. Loading
all three tiers now retains 33,920,044 bytes of decoded geometry buffers versus
51,847,792 before (34.6% less). This measures CPU vertex/index/morph buffers, not
total GPU memory or physical-device FPS. Source GLBs and their notices are intact.

The browser suite samples deformed vertices throughout real intros and 1v1/3v3
play, inputs and quality changes. The host suite also checks phone geometry in
both orientations. Detailed regression evidence is written to
`test-results/hoop-legacy-athletes/deformation.json`; the failing reproduction is
preserved locally as `deformation-before.json`.
