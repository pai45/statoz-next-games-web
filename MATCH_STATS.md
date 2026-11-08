# Match Stats Feature

This is the implementation reference for the `STATS` tab in a StatOz match
detail. It describes the complete feature as it exists in the web app: the
shared report contract, every supported sport, the current demo-data pipeline,
and the rules to follow when adding a new stat surface or live provider data.

## Scope and entry point

The `STATS` tab is one of four match-detail surfaces:

```text
/matches/[matchId]
  PREDICT | PICKS | TOPS | STATS
```

`src/app/(platform)/matches/[matchId]/page.tsx` resolves a `SportMatch` and
its `MatchDetailData`. `MatchTabsView` owns the four top-level tabs and mounts
`MatchScoreboard` only when the viewer selects `STATS`.

The stats feature supports all five `Sport` values:

| Sport | Renderer | Report sections | Current data level |
| --- | --- | --- | --- |
| Football | `FootballStatsView` | Overview, Momentum, Lineups, Commentary | Snapshot-backed for the featured fixture; deterministic demo report otherwise |
| Basketball | `BasketballStatsView` | Overview, Flow, Plays, Box Score, Teams | Snapshot-backed for the featured fixture; deterministic demo report otherwise |
| Cricket | `CricketStatsView` | Overview, Race, Scorecard, Match Feed | Snapshot-backed for the featured fixture; deterministic demo report otherwise |
| Tennis | generic `MatchScoreboard` view | Sets, Lineup, Commentary | Deterministic demo report |
| Motorsport | `MotorsportStatsView` when an F1 race report is present; generic view otherwise | Race, Weekend, Qualifying; or Facts, Lineup, Commentary | Dedicated F1 report for the Italian GP; deterministic demo report otherwise |

`MatchScoreboard` dispatches by `match.sport`. Keep it as the only sport
renderer switch; sport pages and tabs should not duplicate that decision.

## User experience

Every sport report is a client-side, vertically scrollable panel. The section
picker is a `FilterChips` control; it changes the visible section without
changing the match URL. Football resets the panel scroll position when a
section changes. Other sport views retain the current panel scroll position.

Common interaction behavior:

- Home/away comparison rows are buttons. Selecting a row toggles its active
  visual state; it does not currently filter or open another surface.
- Line charts support point selection and show the selected tick's reading.
- Football and basketball shot maps are driven by their event coordinates.
- Links from player names open `/matches/[matchId]/players/[playerId]` when a
  matching player dossier exists.
- Missing optional data renders an `EmptyPanel` with an honest explanation;
  data is never invented by a view merely to fill an empty section.

## Composition and data flow

```text
SportMatch
  -> matchDetailFor(match)
  -> buildMatchDetail(match, sport config)
  -> buildReport({ match, seed, stats, scoreRows })
  -> optional sport snapshot adapter
  -> MatchDetailData.scoreboard
  -> MatchTabsView
  -> MatchScoreboard
  -> sport-specific or generic STATS view
```

The owner of the data assembly is
`src/mocks/matches/details/index.ts`. It first builds a stable detail package
from the sport's `DetailConfig`, then applies the football, cricket, and
basketball snapshot adapters. Each adapter returns immediately for every
fixture except its featured fixture, so it cannot accidentally overwrite
another sport's report. The Italian GP additionally attaches `scoreboard.race`
from `f1.ts`, which selects the dedicated F1 renderer.

The fallback builder uses `stableSeed(match.id + ":scoreboard")`. This gives
demo fixtures repeatable statistics and traces across renders. It is a demo
mechanism, not a provider-data strategy; production data should populate the
same domain contract directly.

## Shared scoreboard contract

The canonical UI contract is `MatchDetailScoreboard` in
`src/domain/matches/detail.ts`. A report always contains these baseline fields:

| Field | Purpose |
| --- | --- |
| `facts` | Simple fixture facts retained for general match detail use |
| `stats` | Home/away comparison metrics; each carries display text and numeric values for the split bar |
| `timeline` | Structured key events |
| `commentary` | Ordered play-by-play entries |
| `homeLineup`, `awayLineup` | Starters, substitutes, formation, and confirmation state |
| `scoreRows` | Sport-specific period, set, phase, or session comparisons |
| `pulse` | Leading report metric, state label, optional movement, and compact supporting metrics |
| `intel` | Competition, season, venue, attendance, facts, and optional result note |

Optional fields add sport depth without widening every view:

| Field | Used by |
| --- | --- |
| `trace` | Football momentum, basketball flow, cricket innings race, tennis games by set, and generic reports |
| `shots` | Football shot map |
| `basketballShots` | Basketball shot map |
| `leaders`, `boxScore` | Basketball overview and box score |
| `innings`, `runRate`, `feed` | Cricket scorecard, run-rate chart, and match feed |
| `players` | Player dossier links, player stats, football heatmaps, and cricket innings tape |
| `sessions`, `driverStandings` | Generic motorsport facts and grid fallback |
| `race` | Dedicated F1 race report |

The supporting domain types live in `src/domain/matches/report.ts` and
`src/domain/matches/race.ts`. Keep the contract presentation-oriented: values
such as `home` and `away` are formatted display strings, while `homeValue` and
`awayValue` are numeric values used for comparison geometry.

## Shared visual primitives

`src/features/matches/components/match-stats-shell.tsx` holds the shared
building blocks. Sport views should compose these before creating new visual
patterns:

- `MatchPulseHeader`: hero metric, status, title, movement, and mini metrics.
- `MatchIntelPanel`: competition and venue context with status-sensitive edge.
- `StatComparisonRow`: two-sided metric with team-colored proportional bar.
- `TeamLegendRow`: home and away identity labels for comparison blocks.
- `StatsRow` and `SectionHeading`: neutral report rows and section structure.
- `EmptyPanel`: consistent missing-data state.

`match-trace-chart.tsx` draws a two-sided trace with event markers;
`match-report-parts.tsx` supplies reusable timeline, commentary, lineup, and
box-score-adjacent pieces. Styles for the shared sport reports are in
`match-stats.module.css`; dedicated F1 styling is in
`motorsport-stats-view.module.css`.

## Football

Renderer: `src/features/matches/components/football-stats-view.tsx`

| Section | Content | Required data |
| --- | --- | --- |
| Overview | Match intel, team-control stat comparisons, key-event timeline | `intel`, `stats`, `timeline` |
| Momentum | Territorial-pressure trace, goal markers, football shot map, pressure-read note | `trace`; `shots` is optional |
| Lineups | Pitch layout with starters, substitutes, formation, and confirmation state | both lineups; optional `players` for dossiers |
| Commentary | Ordered match commentary | `commentary` |

The generic football configuration exposes possession, shots, shots on target,
and passes. Its fallback report derives a territorial-pressure trace and goal
markers from the scoreline. The featured fixture adapter
`football-snapshot.ts` replaces generated values with `football-revamp.json`:

- available top statistics become `scoreboard.stats`;
- timeline and commentary become provider snapshot entries;
- momentum series and goal events become `trace` and markers;
- positional event coordinates become `shots`, including goal placement;
- provider lineups and player-stat/heatmap data replace generated squads.

The overview compares formatted values but sizes the bar from each metric's
`share` value. Provider adapters must therefore preserve meaningful numeric
comparison values even when their display values include units or percentages.

## Basketball

Renderer: `src/features/matches/components/basketball-stats-view.tsx`

| Section | Content | Required data |
| --- | --- | --- |
| Overview | Match intel, quarter rows, team-control metrics, stat leaders | `intel`, `scoreRows`, `stats`; `leaders` optional |
| Flow | Score/win-probability trace, Game/H1/H2/Clutch filter, shot map, scoring runs | `trace`; `basketballShots` and `scoreRows` optional |
| Plays | Turning-point timeline and full commentary | `timeline`, `commentary` |
| Box Score | Separate home and away player tables | `boxScore` |
| Teams | Home and away rosters | both lineups |

The Flow filter slices the trace by its tick labels (`Q1` through `Q4`) and
uses the final five minutes of Q4 for Clutch. Use this label format when
supplying a basketball trace. Its generic metrics are field goals, three
pointers, rebounds, and assists.

`basketball-snapshot.ts` maps the featured snapshot into all rich surfaces:
period scores, top stats, play-by-play trace, turning points, commentary,
leaders, a full box score, starting fives/bench, and made/missed 2- and
3-point shot coordinates. The score trace title is `SCORE RACE` and its unit
is points, even though the generic fallback uses win probability.

## Cricket

Renderer: `src/features/matches/components/cricket-stats-view.tsx`

| Section | Content | Required data |
| --- | --- | --- |
| Overview | Match intel and home/away team comparison | `intel`, `stats` |
| Race | Two-innings run trace and selectable actual-versus-required run-rate chart | `trace`, `runRate` |
| Scorecard | Selectable innings, batting table, bowling table, and phase comparison | `innings`, `scoreRows`; `players` enables player links |
| Match Feed | Ball-by-ball rows; can filter by batting team | `feed` |

The generic report offers run rate, boundaries, wickets, and dot balls. Its
hero is the active innings score, and its trace is a cumulative runs curve.
The featured adapter `cricket-snapshot.ts` maps the cricket snapshot into:

- match context including format, toss, venue, and result;
- available team comparisons and innings summary rows;
- full batting and bowling cards, including chase target;
- a two-innings run race with wicket markers;
- legal-ball run-rate points, boundary/wicket markers, and required rate for
  the chase;
- team-tagged ball-by-ball commentary and player dossier statistics.

The chart uses an over as `legalBalls / 6`, not decimal base-10 arithmetic.
The scorecard computes strike rate as runs per 100 balls and economy using the
same six-balls-per-over conversion. Supply raw overs strings such as `3.4` and
integer runs/balls; do not precompute a decimal over value.

## Tennis

Renderer: generic `MatchScoreboard` view

| Section | Content | Required data |
| --- | --- | --- |
| Sets | Pulse, match intel, set-by-set rows, games-won trace, team comparisons, timeline | baseline fields; `trace` optional |
| Lineup | Generic pitch/lineup display | both lineups |
| Commentary | Ordered play-by-play | `commentary` |

The tennis report reads `match.tennisSets` when it is available. It calculates
sets won and total games from those values, then plots games won per set. The
generic configuration lists aces, winners, break points, and first serve.

Tennis intentionally has no dedicated scorecard or player-level renderer yet.
The current generic lineup fallback is presentation debt, not a tennis model.
When richer tennis data arrives, add a `TennisStatsView` and keep the common
scoreboard contract rather than overloading `MatchPitchView` further.

## Motorsport and F1

There are two modes:

1. A fixture with `scoreboard.race` uses `MotorsportStatsView`.
2. Any other motorsport fixture uses the generic view with Facts, Lineup, and
   Commentary. Its `LINEUP` tab is rendered as a starting grid from qualifying
   sessions; qualifying/session aliases are recognized by `isQualifying`.

The dedicated F1 renderer is selected for the Italian GP fixture and reads
`F1RaceReport` from `src/domain/matches/race.ts`.

| Section | Content | Required data |
| --- | --- | --- |
| Race | Circuit profile and map link, winner, gap-to-leader classification, grid-versus-finish movement | `circuit`, `winner`, `race` |
| Weekend | Selectable driver-position chart across sessions and top session classifications | `weekendTicks`, `weekendDrivers`, `sessions` |
| Qualifying | Full qualifying classification | qualifying entry in `sessions` |

The dedicated F1 view does not estimate unavailable telemetry. It explicitly
states that ESPN session classifications do not provide lap-by-lap or sector
telemetry. Preserve that policy for all future motorsport providers.

The generic motorsport configuration currently uses top speed, laps, pit
stops, and tyre stint, with session results and driver standings. It remains a
useful fallback for series that do not have an `F1RaceReport` adapter.

## Data ownership

| Responsibility | Location |
| --- | --- |
| Public match-detail routing | `src/app/(platform)/matches/[matchId]/page.tsx` |
| Top-level match tabs | `src/features/matches/components/match-tabs-view.tsx` |
| Sport dispatch and generic renderer | `src/features/matches/components/match-scoreboard.tsx` |
| Shared report UI | `src/features/matches/components/match-stats-shell.tsx` and `match-report-parts.tsx` |
| Sport-specific report UIs | `football-stats-view.tsx`, `basketball-stats-view.tsx`, `cricket-stats-view.tsx`, `motorsport-stats-view.tsx` |
| Domain contracts | `src/domain/matches/detail.ts`, `report.ts`, and `race.ts` |
| Generic demo report generation | `src/mocks/matches/details/shared.ts` and `report.ts` |
| Per-sport demo defaults | `src/mocks/matches/details/{football,basketball,cricket,tennis,motorsport}.ts` |
| Snapshot adapters | `src/mocks/matches/details/{football,basketball,cricket}-snapshot.ts` |
| Feature snapshots | `src/mocks/snapshots/card-game/` |
| Dedicated F1 report | `src/mocks/matches/details/f1.ts` |

Snapshots are fixture-owned mock data. Before changing their contents or
changing an adapter that changes fixture meaning, follow
`.codex/skills/statoz-mock-data/SKILL.md`.

## Availability and correctness rules

- Do not infer provider facts that were not supplied. Prefer `EmptyPanel`, an
  em dash, or the dedicated F1 honesty note.
- Keep display strings separate from comparison numbers. A value such as
  `52.4%` needs a numeric `52.4`; strings that cannot be compared should not
  be sent to `StatComparisonRow`.
- Trace `ticks`, `home`, and `away` arrays must have matching lengths. Marker
  indices refer to the arrays after any sport-local slicing.
- Team side must be consistently `home` or `away` in timelines, lineups,
  player dossiers, traces, shots, innings, and race data.
- Player dossier IDs must match the route ID used by the player detail page.
- Optional arrays should be omitted or empty when data is unavailable; views
  already contain appropriate empty states.
- Keep the `STATS` tab browser-only interactions inside client components.
  Domain contracts and mock adapters remain framework-agnostic TypeScript.

## Extending the feature

### Add or replace data for an existing sport

1. Map provider data into `MatchDetailScoreboard`, using existing domain
   primitives wherever possible.
2. Add an adapter in `src/mocks/matches/details/` or, for a live integration,
   a server-owned repository/adapter that returns the same contract.
3. Apply it in `matchDetailFor` only for fixtures it owns.
4. Confirm every optional surface has data or deliberately exercises its empty
   state.
5. Test the matching `STATS` tab at desktop and mobile sizes.

### Add a dedicated sport renderer

1. Add sport-specific report types to `src/domain/matches` only when the data
   cannot be expressed by the existing scoreboard fields.
2. Build the renderer in `src/features/matches/components/` from the shared
   shell and design-system controls.
3. Register the sport branch in `MatchScoreboard`.
4. Extend the demo `DetailConfig` and report builder so all fixtures remain
   complete in local development.
5. Add focused component or browser coverage for data-present and
   data-absent states.

## Verification checklist

- Open a fixture for each of football, basketball, cricket, tennis, and
  motorsport; select `STATS` and every section chip.
- Check live, finished, and scheduled fixtures. Scheduled fixtures should
  show pending/no-data states rather than fabricated events.
- Confirm comparison bars reflect the numeric values and team colors match
  the fixture identity.
- Scrub every rendered chart and change basketball Flow / cricket innings
  filters.
- Check that football/basketball shot maps, cricket scorecards, and F1
  classifications remain usable on narrow screens.
- Run the relevant lint/build checks after TypeScript or UI changes. This
  document itself has no runtime impact.
