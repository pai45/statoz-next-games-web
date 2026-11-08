# Match Trending Flutter/web parity

## Match Trending editorial discovery

Match Trending starts with one manual winner-Pick carousel (football, cricket, basketball, motorsport, extra football), then repeats one sport at a time: two wide fixtures, up to three Event rows, and a paired grid of one standalone sport quiz, one different compact fixture, and up to two free XP quiz missions. Missing records produce partial modules; no filler is created. Gold reveal strips and Futures stay in their dedicated lists.

Football team logos sit above names at the outer edges (home left, away right); the central score owns the hierarchy. Cricket and basketball use stacked left-aligned identities and right-aligned scores. Racing displays available session results, never driver standings as race classification. Events use 14px/500 questions, 12px/400 answers, independent details navigation and signed percentage-point movement. All cards have padded lifecycle/timing areas and complete labels. The revised cadence uses 20px page margins, 16px card padding, 16px match/grid gaps and 24px module gaps. The grid collapses below 360px or at 1.4 text scale.

The canonical spec is Flutter's `design/match-discovery.json`. Each checkout ships its own generated adapters. Run `node tool/match-discovery.mjs --web-root <web checkout>` in Flutter to synchronize; add `--check` to verify both copies. Web also runs `npm run match-discovery:check` before build. Local Flutter contract tests verify generated values without reading the other checkout.

The cycle retains IDs while mounted; web additionally restores its session selection and carousel slide on return. Fixture, Event and quiz identities remain independent records. Quiz artwork reuses the filled discovery renderer. Trade buttons use the existing trading hook/sheet; Event rows open details; gold strips use the existing guarded reveal callbacks. No trading, scoring, settlement or wallet schema changed. No ambient border animation was added; press/focus feedback and selection haptics are brief.

Validation: `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run test:match-editorial`, `npm run build`; Flutter targeted analysis, `test/match_editorial_test.dart`, `test/match_discovery_contract_test.dart`, `test/trending_hub_test.dart`, `test/picks_widget_test.dart` and existing settlement tests. Local production-widget review entry point: `tool/match_editorial_review.dart`.

Match cards omit the bottom action strip and arrow. The full plate remains the match-details target with keyboard focus and press feedback.

Match backgrounds have a quiet 9% tint fading from the top-right: LIVE red; other upcoming followed-team games cyan; ordinary upcoming games dark grey; finished games use a supported winner identity color. Draws, missing results and unavailable winner colors stay neutral. This tint does not animate or tint text/borders. Away identities align to the right card inset.

Outcome rows use the existing team/Draw colors on a contained chamfered percentage button (the price replaces BUY), with contrast-safe ink. Featured cards show at most three outcomes and one compact volume/details footer; full Futures lists retain every candidate.

Web presentation type uses generated rem adapters so increased browser text size scales the actual text. Both discovery and reveal grids collapse below 360px or at 1.4 text scale, including desktop.


Validation completed: 31 final affected Flutter card/hub/trade widget tests passed; the earlier 85-test card/prediction/settlement run passed. Targeted analysis of 12 files is clean. Web lint, TypeScript, five focused cycle/status/tint tests and the production build passed. Shared generated-output checks pass. Actual local review covers all four sports at 393px, 320px and desktop widths; web 1.4 text scale collapses the grid at phone and desktop sizes without horizontal overflow. Keyboard carousel controls, guest trade guard, independent Event navigation, return scroll and slide restoration passed browser checks. Selection haptics are retained in code/widget callbacks; physical-device haptic feel was not measured. Preview data comes from existing bundled product records, so Flutter/web fixture values can differ.

Cricket nonnumeric innings text such as Yet to Bat uses supporting copy instead of the numeric score style.


## Cyber HUD refinement and card entrance

Match discovery now uses etched inner chamfer frames, a short sport-colored top rail, existing sport marks, inset Orbitron score plates, beveled team-colored percentage controls, gold XP reward labels and discrete progress segments from genuine answered-question counts. The navy fill and restrained top-right lifecycle/team tint remain. Lifecycle tabs dock at the top-right frame edge with zero outer inset; their text retains its internal padding. Wide headers reserve the measured tag width, and compact headers reserve height before metadata. Embedded Events dock each row's own lifecycle to its right edge. Event questions remain Space Grotesk 14px/500 and answers 12px/400. No extra match footer was restored.

Cards enter once when at least 8% visible: 420ms easeOutCubic, opacity 0 to 1, translation 12px to 0, and the short signal rail extends from 20% to full width. Viewport bands stagger by 48ms, capped at three bands. Motion pauses offscreen, on inactive routes/pages and in the background. Reduced motion shows the final pose immediately. Stable card identities retain the entered state when returning; focus or press settles the entrance immediately so navigation never waits. This adds no ambient border pulse or audio.

Shared appearance timing/geometry remains in Flutter's canonical `design/match-discovery.json` and generated local adapters. Actual Flutter/web captures, browser motion samples, flush-tag geometry and short silent recordings are in Designer `test-results/match-cyber-polish/review`. Source data/economy and access behavior are unchanged.


### Carousel edge spacing · 2026-10-15

Featured Picks scroll through the full feed width, with 20px leading/trailing content insets and the header aligned to page content. Indicators retain their touch targets and sit 4px below the cards. Event percentages retain outcome color and signed movement without an underline. Other feed modules keep their page margins.


Percentage CTAs (2026-10-15): outcome percentage plates fill the outcome row height and dock flush to its right edge, without outer padding. Keep label padding, existing outcome colors, 44px minimum hit areas, disabled/access behavior and matching 6px chamfers. Long labels and increased text scale grow the row and percentage plate together.

Live match context (2026-10-15): available clock/minute context sits next to LIVE inside the flush lifecycle tag (for example LIVE 67′), with no repeated timing line. Missing context leaves LIVE alone; upcoming kickoff and market deadline placement stay authoritative.

Score presentation (2026-10-15): scores render as open Orbitron text, without an inset box, border, fill or box padding, in both mirrored and stacked scoreboards. Preserve the established sizes, weight and responsive layout.

Compact XP cards (2026-10-15): opposing team logos with a centered VS replace visible full team names; the quiz subtitle and action rail are removed. Genuine answer progress and potential XP remain, and the whole card opens the existing prediction flow. Team identities remain accessible. Motorsport retains race identity.

Status and long-name cleanup (2026-10-15): timing text equal to the lifecycle label is suppressed after whitespace/case normalization, so LIVE is not repeated below the competition. Genuine deadlines and clock context remain visible. Team names in match cards use at most two visible lines with ellipsis; full names remain in accessible text.

Future tail per sport (2026-10-15): one full-width Future market follows each sport grid, using the existing editorial market plate and up to three existing outcomes with colored percentage CTAs. Available championship/title/season markets lead; stable IDs preserve return/scroll order. Skip unavailable markets, exclude featured carousel records, and retain existing trade/detail guards. Futures also remain in their dedicated list.

UCL 2026/27, NBA 2027 and F1 2027 championship markets are user-approved local demo examples. Their competition markers explicitly say DEMO, volumes are zero, and percentages are illustrative. They live only in the existing mock-data owners and do not add production schemas, settlement behavior or external feeds. The existing IPL market is reused.

Carousel header removal (2026-10-15): remove the entire visible header strip, including Featured Picks, All Picks and previous/next arrows. Cards start directly in the scrolling rail; swipe, dot selection, keyboard navigation and return-position restoration remain available.

VS typography (2026-10-15): upcoming match and compact XP-card VS labels use the existing shared 12px support size with Orbitron 600 weight. Labels continue to scale with accessibility text settings. Numeric scores retain their score typography.

## Reusable discovery cards

See [the discovery card library](discovery-card-library.md) for current component ownership, approved recipes and independent local sync checks.

Dead-code cleanup (2026-10-15): the shared editorial cycle and card modules are the sole Match Trending implementation. Superseded tiles/catalogs, their private helpers and duplicate generated feature tokens were removed. Tennis keeps its existing set-score renderer. See the discovery card library for ownership.

## Personal cards on Match Trending (2026-10-16)

After the featured carousel, show saved reveal entries as the existing thin paired gold cards without a visible Ready to reveal heading. Follow them with Your predictions: existing compact prediction cards for saved drafts, live/locked entries, unresolved results and settled history. Use actual quiz IDs, progress and earned XP; include paid quizzes and all supported sports. A finished entry becomes gold only when its quiz has resolvable results. Settlement remains inside the existing quiz route. Recompute personal entries from saved state independently of frozen discovery slots and omit their duplicate XP mission tile from the cycle. Flutter resolves repository-backed saved fixtures outside the rolling feed without injecting them into cycle selection. Missing records are omitted. Keep sport locks, navigation, reduced-motion behavior and settlement guards.

Personal card carousels (2026-10-16): Reveal results is the heading above the thin gold cards. Both it and Your predictions use independent manual horizontal rails with 2.2 cards visible at ordinary phone/desktop sizes. Use the same generated visible-count tokens; 16px gutters, natural equal card height, keyboard left/right/Home/End, swipe and stored return offsets. Below 360px or at 1.4× text use 1.1 wider cards for readable names and lifecycle tags. No automatic playback or arrow controls. Gold names clamp to two visible lines with full accessible identity.

Trends visibility update (2026-10-17): hide the top featured winner-Picks carousel and the Your predictions/played-card carousel in Match Trending. Keep the gold Reveal results heading and reveal carousel. Apply visibility at feed composition; preserve saved entries, reusable card/rail components, dedicated history and result navigation. Omit the personal module entirely when no reveal entries exist, without empty spacing. Frozen sport-cycle selection remains unchanged.

Visibility clarification (2026-10-17): the top featured winner-Picks carousel remains visible, followed by the gold Reveal results carousel. Only the third carousel, Your predictions, is hidden in Match Trending. Saved entries and dedicated history remain unchanged.

## Match header and kickoff placement (2026-10-18)

Upcoming match cards show the local 24-hour kickoff clock at 16px / Space Grotesk 500 in the centre, replacing VS, with no separate Starts line. The sport-tab card removes the entire league/icon metadata row and divider, retaining only the flush lifecycle dock and minimal clearance so cards become thinner. Trends keeps its league/icon row. Upcoming cricket, basketball and Tennis use opposing identities with the same centred clock; live/finished scoreboards keep their existing sport structure. Upcoming motorsport places the clock beneath the race identity. No trading-volume figure is added. Invalid web timing shows an unavailable dash, never an invented clock. Card names, navigation, motion, locks and live clock tags remain intact.
