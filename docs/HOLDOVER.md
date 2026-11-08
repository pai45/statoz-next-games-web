# Holdover

Holdover is the full user-supplied Three.js sniper game, imported into this repository from `C:\Users\priya\Downloads\Create a 3D Cat`. Launch it from **Archery**, beside Longbow and Archery Master, or at `/play/holdover`.

The complete game lives in `src/features/games/holdover/source/src`: eight campaign operations, Quick Duel, four unlockable rifles, camouflage, optics, rank progression, career records, settings, procedural 3D terrain/structures/vegetation/actors, ballistic simulation, synthesized audio, and mouse/keyboard and touch controls. All 24 gameplay modules are retained unchanged; imported source hashes are recorded in `src/features/games/holdover/source/SOURCE.json`.

The game keeps its original interface and fonts inside an isolated iframe. `scripts/build-holdover.mjs` compiles its React/Three.js source and Tailwind CSS into a self-contained offline HTML bundle. Fonts are embedded; no external images, models, audio, fonts, APIs or other runtime requests are needed. Source ownership and third-party notices are in `src/features/games/holdover/source/NOTICE.md` and the bundled notices.

The existing host bundle bridge owns local account-isolated saves under `statoz.games.web.bundle.holdover.<encoded account or guest>`; the game's `holdover.profile.v1` and HUD preference keys live inside that envelope. No source-folder storage is read or modified. Backgrounding pauses an active mission or duel; leaving unmounts the game. Back to Archery returns through the existing launch-return navigation. Phones use the shared landscape viewport, including when held upright.

The original Figma/Vite toolchain is retained as `package.original.json` and `pnpm-lock.yaml` for reference. The local build uses this repository's React 19, Three.js 0.186.1, esbuild and Tailwind toolchain; a second install is unnecessary. The original manifest requested Three.js ^0.187.0. The port has its own TypeScript check, and is excluded from the host's TypeScript/lint file glob because it retains explicit `.ts` imports and original standalone conventions.

Validation and rebuilding:

- `npm run build:holdover`
- `npm run test:holdover`
- `node node_modules/typescript/bin/tsc --noEmit -p src/features/games/holdover/source/tsconfig.json`
- `npm run test:holdover:browser` (local app at `http://localhost:3000`; override with `HOLDOVER_TEST_ORIGIN`)
- `node scripts/capture-holdover-cover.mjs` captures the cover from the actual imported campaign renderer.
- `npm run typecheck` and `npm run build` validate the host and device download bundle.

The supplied 19 engine tests cover ballistics, terrain, target sightlines, collisions, profile sanitization, scoring, missions and duels. Host browser checks exercise real campaign firing, Quick Duel, pause, persistent saves, catalog/exit navigation, landscape touch controls and rotated portrait-phone controls.

Keep this game local unless a separate release request authorizes publication. Do not synchronize it into another repository or modify the Downloads source.
