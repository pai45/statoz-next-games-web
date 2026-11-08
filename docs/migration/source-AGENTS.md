# Independent StatOz demo

This repository is a games demo/UI reference. Never write to the original card_game, statoz_web or another repository. Keep saves local and namespaced. Do not run cross-project synchronization. All inherited artwork is temporary with replacement planned; preserve source notices. No real payments, authentication or production economy is implemented.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## StatOz mock data

Before creating or changing StatOz demo fixtures, read `.codex/skills/statoz-mock-data/SKILL.md` and follow its ownership and validation rules.

## UI UX Pro Max skills

Seven MIT-licensed skills from nextlevelbuilder/ui-ux-pro-max-skill live in `.codex/skills/`: `ui-ux-pro-max`, `design`, `design-system`, `ui-styling`, `brand`, `banner-design` and `slides`. Source commit and local changes are recorded in `.codex/skills/THIRD_PARTY_NOTICES.md`. Treat them as supporting guidance only: inside the host product the StatOz design system (`statoz-design-system`, `src/design-system`) takes precedence, and inside a game its independent style rules below take precedence. Do not add shadcn/ui, Radix, new font families or new palettes from these skills without a separate request. Run the search script from the repository root, for example `python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux`.

## Retro Football independent style

User direction: Retro Football uses its own classic arcade identity. Follow the installed `independent-game-style` skill: no StatOz visual system, cyberpunk theme, techno fonts, chamfer panels or cyber HUD styling inside this game. The host product retains its existing styling.

## Pitch Duel independent style

User direction (2026-10-30, layout changed to landscape 2026-11-01): Pitch Duel is an eleven-a-side, landscape card football game with its own Ballers-inspired look (dark violet stadium panels, pink/cyan accents, player cards in the StatOz collectible layout with a stat panel, Bebas Neue / Barlow Condensed / Inter). Do not restyle it with the StatOz system inside the game; the host keeps its styling. The Ballers repository is unlicensed: never copy its code, CSS, images, logo or audio — measure and redraw only. See `docs/PITCH-DUEL.md`. First-time players open on the debut XI reveal. Sound is CC0 Freesound recordings plus WebAudio synthesis, recorded with hashes in `public/games/pitch-duel/PROVENANCE.json` (checked by `npm run test:pitch-duel`).

## Penalty Cup independent style

Penalty Cup is landscape-only. Keep every menu and overlay within one iPhone viewport; paginate nations, standings, brackets and history instead of adding page scrolling. It has one balanced stage progression and no selectable difficulty. Preserve old cup saves through the v2 migration and checkpoint completed penalties, including RNG state. Runtime and mobile checks are documented in docs/PENALTY-CUP.md.

Penalty Cup is a separate game at /play/penalty-cup, maintained here only. Follow independent-game-style: game-owned football broadcast menus and interface, no StatOz/cyber styling inside the game. Share Penalty Shootout's match runtime with optional group-draw rules; preserve default Shootout behavior. Frozen 2026 data, tournament state and account-scoped saves live in the penalty-cup feature. See docs/PENALTY-CUP.md. Keep changes local unless separately authorized for release.

## Longbow independent style

Longbow (`/play/longbow`) is an original landscape 3D archery game. It sits beside Archery Master (`archery-test`) and shares no files with it. Follow `independent-game-style`: parchment, forest green, brass and wood, no StatOz or cyber styling inside the game. Runtime third-party assets must be CC0, verified at the original source, and recorded with hashes in `public/games/longbow/PROVENANCE.json` (checked by `npm run test:longbow`). See docs/LONGBOW.md.

## Rim Rush independent style

Rim Rush (`/play/rim-rush`) is an original landscape 3D one-on-one basketball duel in the basketball hub. It is a genre game: do not copy names, art, audio or levels from any existing basketball game. Follow `independent-game-style`: chalk panels, hardwood amber, sunset orange and deep court green with Lilita One / Barlow Condensed. No StatOz or cyber styling inside the game. Players and venues are procedural. Runtime third-party assets must be CC0, verified at the original source, and recorded with hashes in `public/games/rim-rush/PROVENANCE.json` (checked by `npm run test:rim-rush`). See docs/RIM-RUSH.md.

## Football Chess independent style

Football Chess (`/play/football-chess`) is an original five-a-side, turn-based landscape game on a 7x5 chessboard pitch. Follow `independent-game-style`: mown-grass squares, walnut and brass frame, ivory and ebony tokens, Fraunces with IBM Plex Sans Condensed (OFL, licences in the game's `fonts` folder). No StatOz design system, matchmaking gate or cyber styling inside the game. The engine is pure and seeded; the odds shown are the outcome list the game rolls. Saves live under `statoz.games.web.football-chess.v2` (the v1 record migrates and is never deleted). Sound is WebAudio synthesis only. See docs/FOOTBALL-CHESS.md; run `npm run test:football-chess` and `npm run test:football-chess:browser`.

## Rally Dash independent style

Rally Dash (`/play/rally`; `/play/grand-prix` still opens it) is the rally remake of Grand Prix Dash. The host keeps the game id `grand-prix-dash`. It is an original top-down Canvas 2D rally game with Stage Attack (solo, medals, splits, ghost) and six-car Rallycross. Follow `independent-game-style`: stage-board yellow, rally orange, warm black and cream sticker panels, Rubik Dirt and Barlow Condensed (OFL, licences in the game's `fonts` folder). No StatOz design system or cyber styling inside the game. Sound is WebAudio synthesis only. Saves live under `statoz.games.web.rally-dash.v1`; the old Grand Prix Dash keys are never read or removed. Medal targets are calibrated by headless runs, so recalibrate them after handling changes. Fonts and art are recorded with hashes in `public/assets/games/rally-dash/PROVENANCE.json`. See docs/RALLY-DASH.md; run `npm run test:rally-dash` and `npm run test:rally-dash:browser`.

## Yorker independent style

Yorker (`/play/yorker`) is an original landscape 3D bowling game in the Cricket hub beside Cricketer; it shares no source files with it. It keeps its own night-broadcast look (navy glass panels, gold accent, Barlow Condensed), not the StatOz system. Runtime third-party assets must be CC0 or CC BY with credit, verified at the source and recorded with hashes in `public/games/yorker/PROVENANCE.json` (checked by `npm run test:yorker`). Saves stay local in `yorker.progress.v1`. See docs/YORKER.md.

## Open Golf lobby and arcade style

User direction (2026-11-05): Open Golf (`/play/open-golf`) uses one modern arcade style for its lobby and every in-game screen: sunny greens, cream and gold, rounded 3D buttons, Rubik (OFL, hashed in `src/features/games/open-golf/source/provenance.json`). The lobby (`components/open-golf-lobby.tsx`) mirrors the in-game hole select: logo, progress and stats on the left, the 20-hole grid on the right. In-game screens live in `src/features/games/open-golf/shell`. Keep StatOz tokens, design-system components, fonts and cyber styling out of both; the user rejected a StatOz-HUD lobby. The engine's own menus are disabled by `scripts/rebuild-open-golf-mobile.py`; the shell drives it through the `statoz_golf_*` bridge. See docs/open-golf/README.md; run `npm run test:open-golf` and `npm run test:open-golf:browser`.

## Penalty Shootout ownership

This repository is the canonical home for all future Penalty Shootout changes, per the user. The complete 3D game was transferred from statoz_web on 2026-10-21. Develop, test and maintain it here; do not sync changes back to statoz_web or edit Designer staging copies as the runtime source. Preserve local namespaced progress and account isolation.

## Retro Hoops asset agent

For Retro Hoops asset generation, modification, animation and Street Hoop likeness
work, delegate to one `street_hoop_artist` agent when delegation is available.
Its project role is `.codex/agents/street-hoop-artist.toml`. Read the canonical
`street-hoop-assets` skill in the Designer research workspace named by that role;
if custom roles or delegation are unavailable, the executing agent reads the same
role and workflow. Give it a concrete defect target and exclusive asset-file
ownership for the pass. Keep runtime changes here, preserve unrelated work and
Retro Hoops' independent arcade style, and keep builds local unless a separate
current release request authorizes a push/pipeline/publication.
