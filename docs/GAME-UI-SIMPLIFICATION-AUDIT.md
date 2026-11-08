# Game UI Simplification Audit

Audit date: 2026-11-06  
Scope: the 15 active game routes in this repository, reviewed at first launch, lobby, selection/setup, tutorial/help, pause/settings, results/records, error, and return states. Open Golf is reviewed but locked. Visual evidence stays local and is not committed.

## Decision standard

- A decision screen has one primary action and no more than two secondary paths. Back, sound, help, records, and settings are compact utilities.
- A screen uses one heading and, when needed, one supporting sentence. Artwork, progress meters, and CTA labels are allowed to carry meaning without duplicate prose.
- The next playable event is the default. Full ladders, brackets, fixtures, collections, cosmetics, and records sit behind Browse, Season, Tournament, Profile, or Details.
- Setup starts with recommended values. Difficulty, tactics, cosmetics, assists, and control detail sit behind Customize or Settings.
- Results show outcome, essential score/reward, one next action, and one return action. Detailed statistics are collapsed.
- Pause exposes Resume, Settings, and Exit. Control instructions belong in Help or the first contextual prompt.
- Game-owned typography, palette, save keys, progression, controls, credits, and accessibility remain unchanged.

## Portfolio audit

Counts below refer to prominent visible decision branches before this pass, excluding compact Back/sound/help utilities. Targets describe the post-pass hierarchy.

| Game | Screens audited | Highest current action count | Redundant or overwhelming content | Keep / merge / move / remove | Target hierarchy | Priority |
|---|---|---:|---|---|---|---|
| Cricketer | Lobby, chase ladder, academy, pause, result, error | 4 | Intro repeats the CTA; three-fact rail and venue plaque compete with play; pause repeats controls | Keep next chase and academy; move full ladder to Browse; remove facts, plaque, pause tutorial, result slogan | **Continue/next chase** → Browse Chases / Academy | P0 |
| Yorker | Lobby, career, academy, briefing, pause, result, error | 7 | Four modes, bowler selector, three-step how-to, and lesson CTA share one lobby | Keep next spell; move bowler to briefing; merge quick match into Browse; remove lobby how-to; collapse result stats | **Continue/next spell** → Browse Spells / Academy | P0 |
| Longbow | Lobby, range browser, rivals, pause, result, error | 4 | Career description and pause tutorial repeat learned controls; result offers next, replay, and back | Keep next lane and rival duel; move ranges to Browse; remove pause tutorial and result replay branch | **Continue/next lane** → Browse Lanes / Duel | P1 |
| Rim Rush | Lobby, cup, quick match, locker, pause, result, error | 4 | Mode metadata repeats the card title; pause paragraph is a second tutorial; result exposes all statistics | Surface the next cup round; keep cups behind Browse and Locker as a utility; summarize locked rivals; remove pause tutorial; collapse match details | **Next Round** → Browse Cups / Quick Match; Locker utility | P1 |
| Hoop Legacy | Title, main menu, career slots/hub, quick setup, contest setup, pause, results, settings | 5 | Record pills, control footer, tile kickers, captions, and long career promise crowd the main menu | Keep Career, Play Now, 3PT Contest; move records/settings to secondary surfaces; remove footer facts and duplicate captions | **My Career** → Play Now / 3PT Contest; Settings utility | P1 |
| Holdover | Title, main menu, campaign, duel, armory, career record, settings, mission briefing, result | 6 | Five equal menu entries plus player card, next-operation panel, unlock ticker, stars, streak, and input advice | Keep next operation and duel; merge armory/records/settings under Profile; remove ticker facts and repeated mission summary | **Play next operation** → Browse Operations / Quick Duel; Profile utility | P0 |
| Penalty Cup | Lobby, nation select, cup hub, match, result, history/help dialogs | 5 | Trophy slogans and stat rail precede four equal tournament tabs; result adds motivational copy | Keep Cup, Random, History utility; merge Groups/Third/Results/Bracket into Overview/Tournament with one details selector; remove duplicate slogans | **Continue/Start Cup** → Random Game; History utility | P0 |
| Racer | Lobby, career grid, race, pause, result, error | 9 | Lobby mixes career entry, duplicate start/continue, car, paint, difficulty, specs, instructions, best time, and track plaque | Keep next career race, Browse, Quick Race; move car/paint/difficulty behind Customize; collapse result detail; remove replay-for-stars branch | **Continue/Start Career** → Browse Races / Quick Race | P0 |
| Formula | Lobby, quick setup, career tiers/calendar/standings/rewards, settings, result | 4 | Each of two lobby choices repeats number, icon, title, two-line description, metadata, CTA, and footer facts | Keep Career and Quick Match; shorten cards to title, status, CTA; remove lobby kicker, descriptions, and footer | **Career** / Quick Match | P1 |
| Pitch Rush | Lobby, tutorial offer/training, quick setup, career hub, resume, results, settings | 6 | Mode cards repeat eyebrow/body/footer; career has five peer tabs; standings includes rule copy | Keep Career and Quick Match; group fixtures/trophies under Season; keep Club; trim tutorial and results | **Continue/Start Career** → Quick Match; utilities. Career: **Next Match** → Season / Club | P0 |
| Rally Dash | Lobby, event setup, driving school/help, settings, records, pause, result | 5 | Quick Start and Stage Attack duplicate the same route; mode cards include tag, title, paragraph, and status | Keep Quick Start; turn duplicate entry into Choose Stage; keep Rallycross; retain help/records/settings utilities | **Quick Start** → Choose Stage / Rallycross | P0 |
| Pitch Duel | Starter reveal, lobby, lineup, league, guide, prematch, match, pause, result | 5 | Five-screen starter sequence; lobby duplicates Lineup as a pill and a tappable pitch; reward copy competes with play | Merge starter sequence into one debut-XI summary with persistent Skip; keep Next Match and tappable Squad; move League/Guide to utilities | **Next Match** → Squad; League / Guide utilities | P0 |
| Football Chess | Starter reveal, hub, recommended setup, prematch, match, pause, result, record, help | 7 | Shared starter copy names the wrong game; setup exposes difficulty, length, formation, squad, and CTA at once; result table is always open | Use sport-neutral compact starter summary; show recommended setup first; move controls behind Customize; collapse result stats | **Find a rival** → Customize; Help / Record utilities | P0 |
| Vibe Basketball | Lobby, how-to, 1v1 setup/game/result, 3PT setup/game/result, pause | 5 | Edition banner, eyebrow, description, athlete caption, mode label numbering, card metadata, and footer repeat the scene | Keep 1V1 and 3-Point; reduce cards to title and one fact; make How to Play a utility; remove decorative copy/footer | **1V1 Street** / 3-Point Contest; How to Play utility | P1 |
| Open Golf | Lobby/hole select, shell menus, gameplay overlays, pause, result | 3 | Reviewed: dense but intentionally unified with its in-game hole-select composition | **Locked.** Keep every UI, copy, flow, shell, style, and bridge behavior unchanged | Existing hierarchy retained | LOCKED |

## Screen-level action decisions

| Screen family | Keep | Merge or group | Move | Remove |
|---|---|---|---|---|
| First launch | Identity, essential entitlement/squad summary, Skip | Multi-card pack contents into one summary | Full collection detail to Squad/Collection | Timed intro, repeated Continue steps, hard-coded game naming |
| Lobby | Contextual Continue/Next action, at most two mode paths | Profile, Records, Armory, Settings; Season/Club data | Setup controls to Customize; instructions to Help | Fact rails, metadata footers, duplicate slogans, decorative instructions |
| Browse/select | 4–8 candidates, selected state, one confirmation | Locked items into a count/summary where practical | Full records and rewards to Details | Multiple competing confirmation CTAs |
| Setup/briefing | Recommended defaults, opponent/objective, one Start | Tactics, difficulty, assists, cosmetics in Customize | Control reference to Help | Repeated mode descriptions and separate Start/Continue emphasis |
| Pause | Resume, Settings, Exit | Accessibility toggles in Settings | Full controls to Help | Tutorial paragraphs and live-record summaries |
| Results | Outcome, score/reward, Next/Retry, Return | Statistics in closed Details | Records/history to their own surface | Motivational filler, duplicate replay branches, long breakdown rails |
| Errors | Clear failure, Retry, Exit | Technical detail in optional disclosure | Diagnostics out of the primary message | Repeated branding and recovery explanations |

## Implementation record

- Shared entry: `StarterPackReveal` supports a compact summary and context label. Pitch Duel and Football Chess use it; other pack flows retain their existing behavior.
- Authored 3D: Cricketer, Yorker, Longbow, and Rim Rush use next-action lobbies, lighter pause screens, and optional result details. Yorker selection now happens in its briefing.
- Bundled campaigns: Hoop Legacy, Holdover, Penalty Cup, Racer, Formula, and Pitch Rush reduce peer navigation and progressively disclose records/setup/tournament detail.
- App-owned flows: Rally Dash, Pitch Duel, Football Chess, and Vibe Basketball use the reduced hierarchies above.
- Open Golf: no source, shell, copy, styling, bridge, or bundle change is part of this work.

### Detailed screen decisions

Counts distinguish navigation branches from candidate selectors and compact utilities. A list of selectable teams, lanes, cars, or tactics is reported as a candidate count rather than as separate navigation paths.

| Screen/state | Before → target decisions | Disposition |
|---|---|---|
| Shared football starter gate | Intro + five reveal steps + actions + summary → one summary | Compact squad card summary; game context label; one Continue and persistent Skip; claim/save behavior retained |
| Pitch Duel debut pack/open/reveal/finale | One advance + Skip; finale two exits → same | Required XI reveal retained; short finale heading; Skip stays visible through every animated phase |
| Cricketer lobby / ladder / academy | 3–4 / four candidates / three lessons → 3 / four / three | Next chase first; Browse and Academy retained; redundant fact rail and venue plaque removed |
| Cricketer pause / result / error | 4 including toggles / 2 / 2 → 2 plus Settings/Help utilities / 2 / 2 | Settings and control reference disclosed; result score and next action retained; recovery retained |
| Yorker lobby / career / academy / brief | Up to 7 / four spells / lessons / bowler + Start → 3 / four spells / lessons / bowler + Start | Bowler moves to briefing; Quick Match available from Browse Spells; competing how-to and lesson shortcut removed |
| Yorker pause / result / error | 5 including toggles / 3 / 2 → 2 plus Settings/Help / 2 plus Details / 2 | Optional statistics and one contextual Next/Retry; recovery retained |
| Longbow lobby / ranges / rivals | 3–4 / ten lanes / three rivals → 3 / at most eight unlocked lanes per page / three rivals | Next lane first; locked lanes summarized; paginated unlocked lanes; rival mode retained |
| Longbow pause / career result / duel result / error | 4 / 3 / 2–3 / 2 → 2 plus Settings/Help / 2 / 2 / 2 | Replay remains available through Browse; a win makes Next Rival the contextual primary action |
| Rim Rush lobby / cup / quick / locker | 3 / bracket / nine rivals / collections → 3 / bracket / at most eight unlocked rivals / collections | Next round first; Browse Cups and Quick Match; Locker utility; locked-rival summary |
| Rim Rush pause / result / error | 4 / 2 + four stats / 2 → 2 plus Settings/Help / 2 plus Details / 2 | Essential outcome, score and coins remain; detail becomes optional |
| Hoop Legacy title / lobby / career slots | 1 / 3 plus metadata / save slots → 1 / 3 / existing slots | Title and save selection retained; lobby record rail, control footer and repeated tile descriptions removed |
| Hoop Legacy career home / sections | Six peer tabs plus training, progress, messages → Next Event + Browse Career | Training/progress disclosed; all five secondary career sections remain under Browse; simulation under More Options |
| Hoop Legacy pause / match result / contest result | Five pause actions / score + box score / contest standings → Resume, Settings, Exit + Help / optional box score / retained standings | Restart moves into Settings; player-of-game and box score collapse; essential contest ranking retained |
| Holdover lobby / campaign / duel setup | Six paths / eight operations + loadout / setup + loadout → 3 + Profile utility / eight operations + Customize / setup + Customize | Next operation is visible on phones; Armory, Records and Settings grouped; loadout controls disclosed |
| Holdover mission result / duel result / pause / error | Up to 4 / 3 / existing pause / recovery → 2 / 2 / retained / retained | Objectives, score breakdown and statistics optional; XP/progression retained; redundant replay/setup exits removed |
| Penalty Cup home / nation select | Up to 4 / eight nations per page + Start → 3 + History utility / retained | One contextual primary for Continue versus New Cup; duplicated slogans and facts removed |
| Penalty Cup hub / results / history / settings | Four peer tabs + Play / 2–3 / pages / controls → Overview + Tournament + Play / two result choices / retained / retained | Third-place table, results and bracket share one Tournament selector; retry/accept remains essential for cup-loss decisions; a new random opponent is reached through Home → Random Game |
| Racer lobby / career browser | Modes + car + paint + skill + facts → 3 + Customize / four races per tier | Continue/Start Career is primary; Browse Races and Quick Race secondary; setup controls disclosed |
| Racer pause / result / error | Settings + tutorial + up to four actions → Resume + Settings + Exit, Help utility / next + one return / recovery retained | Restart inside Settings; statistics and classification optional; duplicate replay and return branches removed |
| Formula lobby / quick setup / career | Two large repeated cards / circuit and car choices / tiers + details → two concise cards / retained setup / Next Race + Browse Career | Default career view shows the next circuit and one race CTA; tiers, car, calendar, standings and rewards remain under Browse |
| Formula result / pause / settings / error | Outcome + full standings → outcome + optional Race Details; other utility screens retained | Classification/championship table opens on demand; earned points, paint, badges and promotion remain visible |
| Pitch Rush lobby / career / club | Two modes + repeated copy / five tabs / cosmetics → two modes / three tabs / retained cosmetics | Next Match, Season, Club; fixtures and trophies grouped under Season; cosmetics and season history remain available |
| Pitch Rush tutorial / resume / result / settings | Practice or Skip / Resume / Continue + Lobby / existing utilities → retained concise pathways | Playable drills, persistent Skip, saved-match restoration and season reward flows retained |
| Rally Dash home / event / help / records / settings | Quick Start + Stage Attack + Rallycross + school → Quick Start + Choose Stage + Rallycross | Driving School stays in Help; event defaults, mode controls, records and assists retained |
| Rally Dash pause / stage result / cross result / error | Existing focused menu/result pathways → retained | Source audit found no duplicate entry to remove in these states; stage/ghost/medal and retry flows retained |
| Pitch Duel home / squad / league / guide / prematch | Play + two lineup entries + League + Guide → Next Match + Squad; League/Guide utilities | Duplicate lineup pill and repeated stakes/form record removed; full squad editor, competition and guide retained |
| Pitch Duel match pause / summary / error | Existing match decisions and result settlement → retained | Gameplay choices, tactical cards, momentum, reward settlement and recovery remain outside this presentation pass |
| Football Chess hub / setup / prematch | Three hub paths / difficulty + length + formation + squad → Quick Match with Help/Record utilities / recommended defaults + Customize / retained | Advanced setup controls hidden initially; preferred setup and squad retained |
| Football Chess pause / result / record / rules / error | Existing pause / outcome + full table / history / rules → retained pause / outcome + optional Details / retained | Record migration, exact odds, help pagination, rematch and exit remain available |
| Vibe Basketball home / how-to / 1v1 setup / contest setup | Two modes + decorative rails → two modes + How to Play utility | Edition, eyebrow, description, athlete caption, numbers and footer removed; mode rules shortened |
| Vibe Basketball pause / 1v1 result / contest result / settings / error | Existing game-owned flows → retained | Modes, player counts, control choices, scoring, return behavior and credits retained |
| Open Golf every state | Existing → unchanged | Reviewed and locked: no edits to lobby, hole selection, tutorials, pause, results, records, shell or engine bridge |

## Verification contract

- No route, host message, engine rule, progression rule, save key, or save schema changes.
- Desktop landscape and 844×390 mobile landscape must keep primary controls visible without page scrolling or clipping.
- Modal focus stays trapped; Back/Escape and gamepad/keyboard focus remain predictable.
- Existing unit and browser suites run by batch, followed by typecheck/build checks and the unchanged Open Golf regressions.

## Verification results

The implementation stays local. Screenshots and machine-readable reports are in `test-results/` and are not added as large audit binaries.

| Check | Result |
|---|---|
| Cross-game lobby suite, 1440×900 and 844×390 | **28/28 passed** across all 14 changed games: one primary, at most three main branches, controls inside viewport, no page scrolling; modal Tab checks included for authored 3D menus |
| Starter summaries, both target sizes | **4/4 passed**: one summary, persistent Skip, grant occurs once, reload skips the gate; Pitch Duel still opens its required debut XI |
| Cricketer browser | Passed all twelve chases, three lessons, checkpoint/RNG reload, account isolation, pause/settings, touch, portrait interruption, offline path and WebGL recovery |
| Yorker browser | Passed coaching, academy completion, a career spell, quick death over, and save reload |
| Longbow browser | Passed keyboard/pointer shooting, scoring/stars, checkpoint reload, pause/settings, full rival duel, phone geometry, offline path and WebGL recovery |
| Rim Rush browser | Passed shooting/jump, cup result settlement, next round, account isolation, phone menus and portrait notice |
| Penalty Cup browser | **131 screen-fit checks passed**, plus simultaneous touch, goalkeeping, completed-penalty reload, settings and account isolation |
| Rally Dash browser | Passed desktop stage and phone Rallycross, keyboard/touch, pause, results, medals/ghost save, old-route compatibility and old-save preservation |
| Pitch Duel browser | Passed debut reveal/signing, squad drag/edit, complete landscape/rotated matches and v3→v4 migration |
| Football Chess browser | Passed recommended setup/Customize, full matches, phone/desktop fit and v1 record migration without deleting the old save |
| Holdover browser | Passed mission firing, duel, pause, persistent isolated saves, return/catalog and both phone orientations |
| Hoop Legacy browser | Passed 1v1/3v3/contest, pause/host suspension, player creation, grouped career Browse/Next Event, save reload and account isolation; dedicated suspension regression passed |
| Vibe Basketball redesign browser | Passed five viewport layouts, both modes, pause, assets and reduced motion |
| Formula browser | Passed default Next Race/Browse hub, quick setup, all career details, three real circuit results, promotion/rewards, reload and Quick Match isolation |
| Pitch Rush career browser | Passed complete four-division climb, all three drills, exact checkpoint/RNG reload, earned cosmetics, grouped Season selector, trophy/history, keyboard/gamepad navigation and four mobile/desktop sizes |
| Racer career + runtime browsers | Passed four-race tier pages at four sizes, all circuit/grid switches, account and future-save restoration, ordinary-input opening race, two-lap Quick Race, result/reload, host disposal and control release |
| Open Golf unit + desktop/touch/portrait browser | **Passed unchanged regression suites**; no Golf source or game bundle rebuild performed by this pass |
| Engine/progression suites | Passed Yorker, Rim Rush, Penalty Cup, Racer (53 checks), Formula (30), Pitch Rush, Rally Dash, Pitch Duel, Football Chess, Vibe Basketball and Hoop Legacy; Holdover's 19 game tests passed |
| Type checks | Host and all three vendor projects passed |
| Changed-file lint | Passed; no new lint errors or warnings |
| Local production build | Passed: 65 routes generated, 15 device game packs; selected embedded bundles rebuilt from canonical source |

### Existing repository checks outside this change

- Cricketer, Longbow and Holdover catalog unit tests still expect retired `stick-cricket` or `archery-test` entries in the active sport deck. Their gameplay/save tests pass. The active catalog remains the user's 15-game set; the removed games were not restored to satisfy stale assertions.
- Repository-wide lint also scans pre-existing `.cache` and `.claude` generated/vendor scripts and reports CommonJS/aliasing errors there. The changed implementation files pass focused lint.
- Browser checks use Chrome desktop/touch emulation; physical-device acceptance is not claimed.

