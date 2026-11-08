# Penalty Cup

Maintained only in Future Games Web. New game ID and route: `penalty-cup`, `/play/penalty-cup`.

## Game and rules

The two modes are Penalty Cup (48 national teams, actual 2026 groups) and Random Game (choose a nation, random different opponent). Both use Penalty Shootout's original 120 Hz simulation, composure/aim/power controls, keeping, camera, animation, replay and existing local audio. Independent football styling is owned by this game; it does not import StatOz design tokens or UI components.

Group matches always play five penalties per side and allow draws (3/1/0). Goals and goal difference mean penalties scored. Article 13's head-to-head mini-table is reapplied to the remaining tied teams, followed by overall goal difference, goals scored and the frozen 11 June 2026 ranking. Conduct is equal: this penalties-only game has no cards. Third-placed teams are compared separately. All 495 Annexe C routing combinations are frozen data. Knockouts use early clinch and paired sudden death. The user plays eight matches on a championship route, with an optional bronze match after a semi-final loss.

Knockout losses remain pending until Retry Match or Accept Result. A retry keeps the opponent and changes only the fixture's attempt seed. Group results cannot be retried. Accepted results and CPU fixtures settle atomically; CPU results are seeded and cannot reroll on revisits. After player elimination the remaining tournament is simulated to completion for the bracket. Team gameplay attributes are equal. There is one balanced challenge, with CPU levels increasing from 5 in groups to 10 in the final; no difficulty selector remains.

## Sources and assets

- Teams/groups: https://www.ussoccer.com/stories/2026/05/usmnt/which-countries-are-competing-in-fifa-world-cup-usa-mexico-canada
- Format, match wiring, tiebreaks, Annexe C: https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf (May 2026 edition, 98 pages).
- Dated ranking table: https://wildstat.com/p/7001/ddate/2026-06-11
- FIFA confirms that ranking and its role as tiebreaker: https://ar.fifa.com/fifa-rankings/world-ranking/men/news/argentina-reclaim-top-spot-mens-world-ranking-fifa-coca-cola

The local character pack and its existing source/permission notices are preserved. These are generic reference-game athletes, not real international players. National-color adaptations use the source's clothing coverage masks, not full-image tinting. Bodies, skin, frame holds, anchors and source geometry remain unchanged. A shared renderer's optional kit mode leaves the existing Penalty Shootout rendering untouched. Flags are original small-format vector interpretations with simplified emblems; the trophy and cover are original SVG designs. Barlow Condensed is SIL OFL, bundled locally with its license. See `public/games/penalty-cup/PROVENANCE.json` and `docs/penalty-shootout/IMPORTED_CHARACTERS.md`.

## Match-night menus and music

The lobby, nation draft, cup hub, results and trophy room share a game-owned emerald, cream and gold stadium presentation, using the existing local Barlow Condensed font. Mode cards have leading football icons, nation cards have shield badges and selection checks, and the cup hub shows an eight-match journey. Actions use clear labels without decorative trailing arrows. All tables, brackets and nation lists remain paginated within one landscape viewport. Reduced motion disables trophy entrance animation and button transitions.

`music.ts` owns an original procedural 112 BPM stadium groove: synthesized hand percussion, bass, chords and an alternating melodic phrase. `use-cup-music.ts` creates one music context after the first interaction, controls its music bus, lowers it during a match, and suspends it for mute, zero volume, match pause, host pause or document backgrounding. Resume never overrides mute. The controller owns disposal across menu and match transitions. The existing match audio remains owned by its match runtime. Music volume and master mute persist in the existing local `penalty-cup.settings.v1` record; older settings default to 55% music. The menu settings expose a music slider and master mute. No audio files or network calls are added.

## Saves and lifecycle

One active cup per host account, isolated by the existing bundle host and a scoped `penalty-cup.v1.<scope>` key. Internal save format v2 migrates existing v1 cups and keeps twelve completed runs. Every resolved penalty saves its history and RNG state; an interrupted fixture resumes at the next unfinished penalty. Live ball flight is never serialized. Completed fixtures and pending results persist atomically. Revision checks reject stale writes and a validated backup recovers a damaged primary record. Invalid or incompatible saves are preserved until explicit reset. Storage failure leaves session play available with a visible notice. Random Game does not alter cup progress or grant economy rewards.

The game follows existing host pause/resume/dispose commands. Backgrounding pauses, held input is cleared, WebGL failures have a restart path, and resources are disposed on exit. All required physics, fonts, textures, masks and audio are embedded in the hashed offline HTML bundle; no runtime data service is needed. The game is landscape-only, with a rotated fallback when the browser cannot lock orientation. Compact menus and paged tables fit a single phone viewport. No Flutter changes, upload or deployment are part of this work. See [mobile implementation notes](penalty-cup-mobile.md) for input, goalkeeper animation, rendering and persistence details.

## Validation commands

`npm run test:penalty-cup`, `npm run test:shootout`, `npm run build:penalty-cup`, `npm run test:penalty-cup:browser`, `npm run test:penalty-cup:app`, `npm run lint`, `npm run typecheck`, `npm run build`.

Current mobile review evidence is written under `test-results/penalty-cup-mobile`; the earlier implementation's evidence remains under `test-results/penalty-cup`. Browser emulation does not verify physical-device touch/audio performance or a real gamepad. Record actual validation results in `docs/penalty-cup-validation.md` after checks.
