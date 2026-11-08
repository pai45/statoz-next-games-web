# Editorial discovery card library

The recent Match Trending cards share a presentation contract and reusable primitives. This library consolidates the approved designs; trading, scoring, settlement, authentication and navigation remain feature responsibilities.

## Ownership and component structure

- Numerical source: card_game/design/match-discovery.json. Generate Flutter, web and Designer adapters explicitly; each app builds using its local files.
- Flutter compatibility import: lib/widgets/cyber/match_discovery.dart. Its parts separate presentation, plate/motion, status, primitives, outcomes, fixture, Events, market, mission, layout and reveal. Reuse EditorialOutcomeRow, EditorialTeamName and EditorialVersus rather than copying controls.
- Web feature adapters: src/features/matches/components/editorial-*.tsx and featured-picks.tsx. The editorial-discovery.tsx facade preserves existing callers.
- React primitives: src/design-system/components/data-display/discovery-card. No feature/domain/router imports. Native buttons/anchors keep their semantics; use discoveryPlateClass and DiscoveryChrome on interactive roots. DiscoveryPlate is a static container and must not wrap an interactive root in another button.
- Designer ships a byte-checked local copy, displays specimens in Brand > Components and includes the library in Assets > Design kit.

## Recipes

Use the headerless manual carousel once, then football, cricket, basketball and motorsport cycles: two wide fixtures, up to three independent Events rows, a paired grid of quiz/compact match/two XP missions, then one available Future. Keep frozen IDs while scrolling. Omit unavailable records; never invent production fixtures or progress. Demo championship markets remain explicitly labeled.

Football uses edge-aligned logos above two-line names and an unboxed score. Cricket and basketball retain stacked scoreboards. Motorsport uses available session/classification data. VS is a small supporting display label, distinct from numeric scores.

Reserve status space but place the lifecycle tab flush at the top-right edge. Keep internal tag padding. LIVE includes only available clock context, e.g. LIVE 67′. Suppress duplicate lifecycle-only timing. UNRESOLVED must remain readable; timing wraps instead of shrinking text.

Events use medium-weight questions, quiet answers and signed percentage-point movement without an underline. Picks/Futures use team-colored percentage controls filling the row at the right edge. XP cards retain genuine progress and reward with no action rail or repeated Match Prediction title. Thin gold reveal cards remain in dedicated lists.

Match tint is subtle and even from the top-right: live red, followed cyan, scheduled neutral, finished supported winner color. Keep continuous chamfer frames, restrained depth and scarce glow. Preserve the one-time entrance, focus/press response, reduced motion and visibility behavior.

## Sync and validation

From card_game: node tool/match-discovery.mjs --web-root <web> --designer-root <designer>. Run each app's local stale-output check afterwards.

From statoz_web: node scripts/sync-discovery-library.mjs --designer-root <designer>. This copies only the fixed primitive allowlist and records content hashes. Run npm run discovery:check locally in both React apps. Normal builds never access another checkout. After changing Designer brand-guide.ts run npm run design:sync.

Before changing a primitive, inspect real full-width and narrow cards across all four sports, 320px, increased text scale, long names, partial cycles and lifecycle states. Verify keyboard/tap, carousel restoration, reduced motion, permissions and disabled controls. Run affected Flutter analysis/widget tests and React lint/typecheck/tests/build. The library makes no measured performance claims.

## Superseded code cleanup (2026-10-15)

The Match feed uses the editorial cycle selector, not the retired hard-coded Match Trending catalog. Games keeps its own typed catalog with unchanged IDs, spans and sport locks. Removed unreferenced web Trending tiles, their private footer/meta helpers and the unused team lockup. The web feed imports the single design-system token stylesheet; generators no longer emit a duplicate feature copy. Team-name typography and clamping belong to the shared primitive. Removed obsolete Trending fixture chrome and unreachable race/cricket branches from the Tennis fallback. Active compatibility exports and Tennis presentation remain supported.

## Personal cards on Match Trending (2026-10-16)

After the featured carousel, show saved reveal entries as the existing thin paired gold cards without a visible Ready to reveal heading. Follow them with Your predictions: existing compact prediction cards for saved drafts, live/locked entries, unresolved results and settled history. Use actual quiz IDs, progress and earned XP; include paid quizzes and all supported sports. A finished entry becomes gold only when its quiz has resolvable results. Settlement remains inside the existing quiz route. Recompute personal entries from saved state independently of frozen discovery slots and omit their duplicate XP mission tile from the cycle. Flutter resolves repository-backed saved fixtures outside the rolling feed without injecting them into cycle selection. Missing records are omitted. Keep sport locks, navigation, reduced-motion behavior and settlement guards.

Personal card carousels (2026-10-16): Reveal results is the heading above the thin gold cards. Both it and Your predictions use independent manual horizontal rails with 2.2 cards visible at ordinary phone/desktop sizes. Use the same generated visible-count tokens; 16px gutters, natural equal card height, keyboard left/right/Home/End, swipe and stored return offsets. Below 360px or at 1.4× text use 1.1 wider cards for readable names and lifecycle tags. No automatic playback or arrow controls. Gold names clamp to two visible lines with full accessible identity.

Trends visibility update (2026-10-17): hide the top featured winner-Picks carousel and the Your predictions/played-card carousel in Match Trending. Keep the gold Reveal results heading and reveal carousel. Apply visibility at feed composition; preserve saved entries, reusable card/rail components, dedicated history and result navigation. Omit the personal module entirely when no reveal entries exist, without empty spacing. Frozen sport-cycle selection remains unchanged.

Visibility clarification (2026-10-17): the top featured winner-Picks carousel remains visible, followed by the gold Reveal results carousel. Only the third carousel, Your predictions, is hidden in Match Trending. Saved entries and dedicated history remain unchanged.

## Match header and kickoff placement (2026-10-18)

Upcoming match cards show the local 24-hour kickoff clock at 16px / Space Grotesk 500 in the centre, replacing VS, with no separate Starts line. The sport-tab card removes the entire league/icon metadata row and divider, retaining only the flush lifecycle dock and minimal clearance so cards become thinner. Trends keeps its league/icon row. Upcoming cricket, basketball and Tennis use opposing identities with the same centred clock; live/finished scoreboards keep their existing sport structure. Upcoming motorsport places the clock beneath the race identity. No trading-volume figure is added. Invalid web timing shows an unavailable dash, never an invented clock. Card names, navigation, motion, locks and live clock tags remain intact.
