# Competitive leaderboard

`/leaderboard` defaults to Master / Weekly. A single board picker lists Master and all games in the active catalog, including golf and archery. Each game and Master has Weekly and Season standings. This is a local UI demo; no runtime results, XP, economy, or saves award Rank Points.

The main board has one compact title/control header, a 2–1–3 podium, and rankings starting at rank 4. Neon frames, a perspective grid, medal portraits, and stepped platforms retain the cyberpunk arcade style with the existing fonts. Repeated headings, score readouts, slogans, place labels, numbered game covers, ads, and the personal-standing panel are removed. A signed-in player is highlighted only in their actual ranked entry. Master scores open contribution details directly; scoring explanations live in How ranking works.

The opening screen shows the full podium and ranks 4–6 on a 1366×768 laptop, and at least ranks 4–5 in a native 390×844 layout. Short landscape phones put the podium beside the rankings so ranks 4–6 fit without a fixed standing bar. All rankings remain in the page's normal scroll; no nested table scrolling or pagination is introduced. Scores render their final value immediately, while the brief podium entrance respects reduced motion.

## Ranking

Sample RP is seeded by fixture version, stable participant ID, game ID, and period ID. Game results use a fixed 0–1,000 RP scale; zero means no result. Master sums each participant's five highest eligible game results, up to 5,000 RP. Missing games contribute zero. Ties sort by stable participant ID, giving unique ordinal ranks. Movement is the previous matching period's rank minus the current rank; a missing previous result displays NEW.

Rival canonical XP remains unchanged and is used only by profile dossiers. The signed-in sample participant is seeded from a hash of the existing local account identity. Renaming a profile or changing profile XP does not change RP. Main-page demo/sample badges are removed; the Ranking Protocol explains the generated snapshots used by this local edition. Weekly and Season are independent sample snapshots; there is no implied historical results ledger.

## Periods and navigation

Weeks run Monday 00:00 UTC to the next Monday. Seasons follow calendar quarters, starting January 1, April 1, July 1, and October 1 at 00:00 UTC. Ranges are half-open. One minute-resolution clock selects the period and its deadline, resynchronizing when the page becomes visible. The server renders a loading field until the client clock is available. Displayed dates use the device timezone; ranking rules explain UTC boundaries.

Canonical URLs are `/leaderboard?ladder=master&period=weekly` and `/leaderboard?ladder=<gameId>&period=season`. Controls push history; normalization replaces the current entry. Old `mode` and `scope` parameters migrate, All-Time maps to Season, and obsolete sport/league/team controls are discarded. Invalid or disabled games fall back to Master. Player search carries the same ladder and period and searches the same ranked results.

## Ownership and validation

Fixture-safe contracts live in `src/domain/leaderboard.ts`. Sample results and rivals live in `src/mocks/leaderboard`; selection, periods, aggregation, and UI live in the leaderboard feature. The generic rank components/contracts used by friends and match screens retain their existing API. Game entry links use the focused leaderboard navigation API.

Run `npm run test:leaderboard`, `npm run test:leaderboard:browser` (against a local server; override with `LEADERBOARD_TEST_ORIGIN`), `npm run typecheck`, targeted ESLint, and `npm run build`. Browser screenshots and the journey report are written to `test-results/leaderboard`. The phone journey exercises the existing rotated platform host as well as narrow native layouts; no orientation policy changes are required.
