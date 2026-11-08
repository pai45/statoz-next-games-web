# Rim Rush

Original 3D one-on-one basketball duel at `/play/rim-rush`, in the basketball hub beside Vibe Basketball. Landscape only. It is in the genre of mobile "basket battle" duels, but its name, rules, rivals, players, courts, art and code are all original. Nothing was copied from any specific game.

- Source: `src/features/games/rim-rush/`
- Runtime assets: `public/games/rim-rush/` (CC0 textures and sounds, cover render, `PROVENANCE.json`, `CREDITS.md`)
- Style: its own playground look (chalk panels, hardwood amber, sunset orange, deep court green; Lilita One and Barlow Condensed). It follows `independent-game-style`: no StatOz or cyber styling inside the game.

## How it plays

- Side-on court with a hoop at each end. You stand left of centre and shoot at the right hoop; the rival stands right of centre and shoots at the left one, so every shot has to arc over the other player.
- **Shoot:** press anywhere, pull back, let go. A longer pull is a harder shot. The dots show only the first 0.36 s of the arc. A light aim assist pulls shots within 12% of the right speed 45% of the way toward it (player only). Keyboard: arrows aim, Enter or F shoots.
- **Jump:** JUMP button, a second finger, or Space. A jump can swat a shot passing overhead (a block), and a shot taken from the top of a jump is released higher.
- **Scoring:** a basket is 2; +1 for a swish (no rim or board), +1 for a bank (backboard or end net). Shots released in the last 3 seconds count double. After each make the shooter moves to a new spot.
- **Match:** 60 seconds or first to 21. At the buzzer, shots in the air still count. A tie goes to sudden death (next basket wins, 30 s cap, then a draw).
- **Power-ups** float above centre court; shoot through one to take it. Big Rim widens your hoop for 6 s, Freeze stops the rival for 2 s, Double makes your next basket count double.
- **Tournament:** three cups (Street, City, Champions) of three knockout rounds against nine rivals across four venues (Rooftop, Old Gym, Boardwalk, Night Arena). Winning a cup opens the next and its rivals in Quick Match.
- **Locker:** coins from wins, swishes, banks, blocks and cup titles buy outfits and balls. No real payments.

## Simulation and saves

- `engine.ts` is a pure fixed-step simulation (1/120 s, two ball substeps) in the court's vertical plane with seeded Mulberry32 randomness. Identical inputs give identical matches at any frame rate. `physics.ts` holds ball vs rim, backboard, stanchion, end nets, floor, the defender's body and the other ball. `ai.ts` is the rival: per-rival aim and power error, reaction time, jump shots and timed blocks.
- `renderer.ts` draws with Three.js only (it never changes the simulation): RoomEnvironment reflections, ACES tone mapping, soft shadows, reactive nets, ball trails, confetti and camera shake (off with Reduce motion). `baller.ts` builds chunky stylised players from primitives (a lathe torso with a painted tank-top jersey, capsule limbs, big readable faces and high-tops) with an ink outline, poses them with two-bone IK, and merges each bone's parts into one vertex-coloured mesh to keep draw calls low. `crowd.ts` draws instanced 3D fans whose bounce and raised arms run in the vertex shader. `venues.ts` builds the four courts (layered dusk skyline, brick gym with bleachers and a live scoreboard, boardwalk with clouds, surf and huts, arena bowl with an LED ribbon) and merges static props that share a material. A high back light outlines the players against busy backgrounds. Each venue costs roughly 180–210 draw calls.
- Matches are short and are not resumed mid-game. `save.ts` keeps coins, owned and equipped items, cup progress, rival records, totals and settings under `rim-rush.progress.v1`. The bundle host scopes it per account. Invalid or tampered saves are rejected and kept untouched, and the session runs on a temporary save.
- A finished match reports one result event (`game: 'rim-rush'`) to the host.

## Assets and licences

- Textures: ambientCG Wood Floor 051 and 064, Planks 021, Asphalt 031, Ground 054, Bricks 101 and Concrete 034 (CC0), resized for mobile.
- Sounds: freesound CC0 recordings (bounce, net swish, backboard, rim, buzzer, crowd cheer, whistle), played as measured slices. Shot, jump and power-up cues, the crowd murmur and stings are synthesized.
- Fonts: Lilita One and Barlow Condensed (OFL 1.1, licence files in `src/features/games/rim-rush/fonts/`).
- Everything else (players, ball, hoops, nets, crowds, skyline, clouds, gym, boardwalk, arena) is procedural geometry or canvas art made for this game. No external character models are used; CC0 rigged basketball players were not available from sources that can be verified.
- `PROVENANCE.json` lists every runtime texture and sound with its source page, licence, SHA-256 and size; `npm run test:rim-rush` fails if a file is missing, changed or unlisted. Only CC0 sources checked at the original page may be added.

## Commands

- `npm run build:rim-rush` builds the offline bundle into `public/embedded-games/rim-rush/`.
- `npm run preview:rim-rush` serves a local host fixture at `http://127.0.0.1:5257/fixture` (add `&manual=1` for a manual clock, `account=` to switch accounts).
- `npm run test:rim-rush` runs the unit tests: registration, frame-rate determinism, swish, rim-out, bank, block, aim assist, buzzer and overtime, rival strength, saves and provenance.
- `npm run test:rim-rush:browser` plays it in Chrome at 844×390. It checks the menus fit, the drag-aim, scoring, jumping, pause, a won quarter-final saving progress and reporting its result, account isolation, the 667×375 and 932×430 layouts, the portrait prompt, and that there are no errors or remote requests. Screenshots go to `test-results/rim-rush/`.
