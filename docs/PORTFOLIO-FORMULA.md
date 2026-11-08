# Formula

Formula is a separate Motorsport game at `/play/portfolio-formula`,
ported from the user-supplied Priyangshu portfolio Figma code layer
(`RZuziAAke5pGi3yfKvXYMG`, `261:2`). It does not replace Racer.

## Ownership and presentation

- Race source: `src/features/games/portfolio-formula/source/src/`
- Pinned isolated dependencies: `src/features/games/portfolio-formula/source/package-lock.json`
- Build adapter: `scripts/build-portfolio-formula.mjs`
- Provenance and adaptation notes: `src/features/games/portfolio-formula/source/{SOURCE.json,NOTICE.md}`
- Generated offline runtime: `public/embedded-games/portfolio-formula/index.html`
- Hub artwork: `public/assets/games/covers/formula-2026-11-06/formula.webp`

Keep the supplied independent night-circuit presentation, Archivo/JetBrains Mono
typography, 3D cars and broadcast HUD inside the game. StatOz's host retains its
own design system. The original portfolio and every other repository are
read-only references, never synchronization targets.

## Play

The game opens on a lobby with **Career** and **Quick Match**. Quick Match lets
players pick one of three circuits, any of eight cars, unlocked paint, 1/3/5 laps,
and Easy/Medium/Hard rivals. Touch driving always uses separate accelerator and brake pedals side by side, including older saves with auto-accelerate enabled. Desktop settings retain optional auto-accelerate, braking-zone racing
line, camera, and sound preferences. Career never changes Quick Match settings.

Career is four three-race championships, each visiting Night Circuit, Harbor Run,
and Switchback Ring in that order:

| Tier | Laps | Rivals |
| --- | --- | --- |
| Rookie | 1 | Easy |
| Club | 3 | Medium |
| Pro | 3 | Hard |
| Champion | 5 | Expert (career only) |

P1-P8 earn 10/8/6/5/4/3/2/1 points. Ties use finishing-position countback, then
the latest round. A top-three finish unlocks the next tier; top three in Champion
completes the career, and winning earns the Champion title. Completing each tier
unlocks its original Signal/Copper/Silverline/Goldleaf paint and badge; first place
also earns its trophy. Replays preserve the best finish and all earned rewards.
Players keep their chosen car through each championship. Grid order is seeded
independently of car selection; unfinished-race restarts keep their seed and grid.
Completed races are final and commit points and rewards exactly once. Reloading
restarts an unfinished race from its beginning and retains completed rounds.

Career menus use calendar, standings, and rewards tabs to fit a landscape phone.
Menu controls support touch, keyboard, and gamepad; arrows move focus, Enter/A
activates, and Escape/B goes back. Settings remain available in both modes.

Use arrows/WASD or touch steering/pedals; the supplied gamepad controls are
retained. `Esc`/`P` pauses, `C` changes camera, `R` resets to track and `M` mutes.
Quick Match pause and results screens allow restarting and returning to setup.
Career pause allows restarting an unfinished round or returning to Career; results
return to Career after committing that round. Both modes offer settings and exit.

Race physics uses a fixed 120 Hz bicycle model with grip limits, grass drag,
wall/car contact, AI passing and sector/lap timing. Car specification is equal;
car selection is cosmetic and never determines the starting grid slot.

The eight cars now use original formula model names with fictional drivers
inspired by racing legends. Timing codes identify the driver; bodywork decals
carry the car marque. The selector and classification show the matching names.

| Roster | Car | Driver | Code |
| --- | --- | --- | --- |
| 01 | Apex GP-01 | Ayrton Serra | SER |
| 02 | Verdant GP-02 | Alain Prevost | PRE |
| 03 | Aurora GP-03 | Sebastian Voss | VOS |
| 04 | Vortex GP-04 | Mika Hakkala | HAK |
| 05 | Imperial GP-05 | Michael Schreiber | SCH |
| 06 | Argent GP-06 | Lewis Harrington | HAR |
| 07 | Azure GP-07 | Max Van Dalen | VAN |
| 08 | Solstice GP-08 | Fernando Alvarez | ALV |

Legacy portfolio slugs remain internal identifiers so existing records retain
their car association. Source names and hashes remain in the provenance files.

Preferences and personal bests stay browser-local in
`statoz.portfolio-formula.settings.v1` and
`statoz.portfolio-formula.records.v2`, with career in
`statoz.portfolio-formula.career.v1` (plus a last-valid backup), inside
`statoz.games.web.bundle.portfolio-formula.<account-or-guest>`.
Old `records.v1` data migrates into Night Circuit only and is never deleted or
rewritten. New bests are isolated per circuit. Career saves are validated on load;
invalid or newer saves are preserved and the visit uses in-memory progress, with a
visible warning. A valid backup is used when available. Storage write errors are
shown to the player. No payments, sign-in integrations or production rewards are added.

## Local circuit and career adaptation

The original night circuit and car geometry remain the base. Harbor Run and
Switchback Ring are original closed-loop knot layouts, retaining the common grid
straight and generating road, barriers, sector boundaries, racing line, minimap,
and AI speed profiles from one selected Track. The car physics model is unchanged;
Expert adds a career-only rival pace preset. Source hashes in `SOURCE.json` remain
historical provenance; the simulation tests verify unchanged car geometry/art and
behavioral tests cover the adapted simulation and circuit registry.

The race configuration freezes mode, circuit, car, paint, grid, laps, rival preset,
seed, and career event identity at start. Race phases remain separate from menu
navigation. No runtime testing controls or race-completion cheats ship in the bundle.

## Checks

Use the host-supervised preview; do not start another development server.

```sh
npm ci --prefix src/features/games/portfolio-formula/source --no-audit --no-fund
npm run typecheck --prefix src/features/games/portfolio-formula/source
npm run build:portfolio-formula
npm run test:portfolio-formula
npm run test:portfolio-formula:browser
npm run typecheck
NODE_ENV=production npm run build
```

The Figma screenshot service failed for the supplied code-layer node. The port
therefore uses the provided source's exact race geometry and UI, checked through
local desktop and mobile runtime screenshots. Supplied fonts and generated
textures are bundled locally; the race makes no external asset requests.

Mobile pedal refinement (8 November 2026): all 31 simulation/career/input tests pass, including a legacy auto-throttle setting on a coarse-pointer device. The focused `tests/mobile-gameplay-refinements.browser.mjs` check passes both phone orientations with simultaneous steering and accelerator input, a stationary car before acceleration, and both pedals visible side by side. Isolated and repository typechecks pass; the offline bundle is rebuilt locally.
