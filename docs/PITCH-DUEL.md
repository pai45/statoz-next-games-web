# Fot Duel (Future Web Games)

Fot Duel is a landscape, eleven-a-side football card game at `/play/pitch-duel`. Its gameplay follows the card-football structure of [Ballers](https://github.com/kiellzz/ballers-game): a zone ladder, one duel per decision, tap-to-pick set pieces, and a match screen built around two cards facing off. It adds one thing Ballers lacks: the CPU commits a hidden counter every turn.

The game has its own look, separate from the StatOz design system: dark violet night-stadium panels, pink and cyan accents, player cards in the StatOz collectible layout with a stat panel added, condensed type. The host app around it keeps StatOz styling.

All code is in `src/features/games/pitch-duel`:

| Folder | Contents |
|---|---|
| `engine/` | The pure rules. No React or window access, so it can be tested in Node. |
| `state/` | The save store and the match hook. |
| `components/` | The screens, their CSS modules and the game's own fonts loader. |
| `fonts/` | Bebas Neue, Barlow Condensed and Inter (all SIL OFL 1.1, licences alongside). |

Sound files live in `public/games/pitch-duel/audio` and are recorded in `public/games/pitch-duel/PROVENANCE.json` (see [Sound](#sound)).

## Provenance

Mechanics and art direction are inspired by Ballers (kiellzz/ballers-game). **That repository has no licence and ships real player photos, sponsor imagery and music, so none of its code, CSS, images or audio is copied.**

The look was studied from the public demo. REA browser captures (Welcome, mode select, Freestyle home) and Playwright measurements (lineup, opponent select, match, goal modal) were taken at 390×844, along with the repository's own README screenshots. Those were portrait; the November 2026 revamp re-lays every screen out for landscape (see [Landscape layout](#landscape-layout)). Everything in this folder is redrawn from scratch:
- the cards, pitch, goal, net, wall and stadium are CSS gradients and inline SVG;
- the wordmark is our own;
- portraits come from the existing StatOz card catalogue.

## Design reference (measured, then redrawn)

| Element | Measured on the reference | Fot Duel |
|---|---|---|
| Numbers | Bebas Neue (card overall 35px/-1px) | Bebas Neue, `--pd-font-numbers` |
| Labels | Barlow Condensed 600, uppercase, ~0.08em tracking | Barlow Condensed 500–800, `--pd-font-labels` |
| Display | Inter 800–950; "VS" italic 950, −0.08em | Inter variable + italic, `--pd-font-display` |
| Panels | `rgba(4,3,9,.66)`, 1px `rgba(180,100,255,.16)`, 14px radius | `.panel`, `.benchPanel` |
| Small buttons | `rgba(10,8,18,.72)`, 1px `rgba(168,85,247,.25)`, 12–14px radius | `.roundButton`, `.scoreIcon` |
| Feature buttons | 14px radius, gradient fill, 38px dark icon circle, 35px glow | `Pill` (`ui.tsx`) in violet/green/red/blue/grey/light |
| Opponent rows | `linear-gradient(135deg, rgba(91,33,182,.85), rgba(76,29,149,.75))`, 2px violet border, 12px radius | `.rival`, `.pill[data-tone="light"]` |
| Scoreboard | dark `rgba(3,3,5,.96)→rgba(30,30,36,.9)`, trapezoid, 2px violet→pink→cyan shimmer | `Scoreboard`, `.scoreTrap`, `.shimmer` (3.2s) |
| Lineup tabs | 999px pills, green→blue tint, 1px violet border | `.tab` |
| Situation box | black 82%, 4px left border coloured by situation, 8px radius | `.situation` (neutral `#bfff00`, attack `#4ade80`, defend `#f87171`, chance `#fbbf24`) |
| Match map | 78×102 portrait, 2px `#22c55e` border, 5px radius, ball 16px | `MatchMap`, drawn sideways (home attacks right), red when they are near your goal |
| VS | gradient `#fff → #ff6aaa → #ff0055 → #cc0044 → #6b001f`, pink glow | `.vs` |
| Possession | 16px triangle, blue for you, red for them | `.possession` |
| Move buttons | violet pills in two columns; the picked one turns white | `.move`, two columns in the right-hand move panel |
| Events bar | `rgba(31,19,47,.65)→rgba(8,8,16,.82)`, "Show" toggle | `EventsBar`, a card under the map, and the events drawer |
| Goal modal | `#0a0015→#1a0033`, 20px radius, blue edge, scorer card, CONTINUE | `Modal` + `.goalModal` |
| Player card | shield card, rating/position/flag top left, 2×3 stats | `DuelCard`, on the StatOz collectible layout instead (see below) |

## Player card

`DuelCard` (`components/card-art.tsx`, `card.module.css`) keeps the structure of the StatOz collectible card that Fot Duel used before the revamp, redrawn in the game's own CSS and fonts. It does not import the design system.

- **Frame:** a 2:3 rectangle with the StatOz chamfer (big cut top left and bottom right, half cut on the others). A rarity edge, thicker and brighter with each tier, surrounds a dark foil face with 45° hairlines. The tier colours are bronze `#cd7f32`, silver `#cbd5e1`, gold `#fdc700` and platinum cyan `#5cdfff` to violet `#c27aff`.
- **Top:** the portrait plate. A role and nation plate sits at the top left, for example "MID · CM" over "ARG", coloured by position group: GK gold, DEF violet, MID green, FWD cyan. The OVR compartment sits at the top right.
- **Middle:** the trait strip, then the nameplate with four rarity pips and the short name.
- **Stat panel (new):** with stats, the card grows to 5:8 and adds a 3×2 panel: PAC, SHO, PAS / DRI, DEF, PHY, or DIV, REF, HAN / POS, KEP, NRV for keepers. Each number is coloured by band (85+ green, 75+ lime, 65+ amber, below that orange) and has a bar under it.
- **Duel highlight:** after an open-play duel, each card lights the stats that decided it. These come from the move's attacker and defender weights in `engine/actions.ts`; the other stats dim.
- **Sizes:**
  - `lg` is used on the duel stage, which passes live match stats.
  - `md` is the plain face (`stats={null}`) in the goal modal and player sheet. The sheet lists the stats with bars beside it.
  - `mini` is the squad-tray card in the lineup editor: portrait, OVR, position and nation, with no stats. On the lineup pitch itself each place is a rarity shield (OVR and place) with the short name under it, so eleven fit on a sideways pitch 360px tall.

## Debut XI (first run)

A first-time player opens Fot Duel on **signing day**: an eleven-card pack reveal before the club house (`components/debut-reveal.tsx`, `debut.module.css`).

**Who sees it:** a career with no matches played, no v2/v3 migration and no claimed debut, on an account that has never been paid the `pitch-duel-debut-xi` grant (`needsDebut` in `state/career-schema.ts`). Existing careers never see it.

**The draw** (`draftDebut` in `engine/debut.ts`, pure and seeded):
- A 4-3-3 from the football catalogue: one **marquee signing** (86–89, a 90+ about one time in eight), two **stars** (82–85) and eight squad players (75–81). The marquee most often lands up front.
- Every place takes a natural fit. The band widens, then the fit relaxes, only when the catalogue runs short. Cards the player already owns are used only when nothing else fits.
- The team averages about 80 OVR, a little above the division 1 opponents (77).
- The draw is saved in the career (`debut`) before the reveal plays, so a reload shows the same eleven.

**The reveal:**
1. A foil pack floats under the floodlights. Tap it: it shakes, the top tears off and it bursts into light.
2. The eleven come lowest rated first. Squad players flip over from the card back. Stars get a short "STAR SIGNING" build-up and slam in with a spark burst.
3. The marquee comes last with the full walkout: "MARQUEE SIGNING" under beams in the card's tier colour, then the nation (code, name and its colours as a ribbon), then the position, then the card slams in with a shake, a shockwave ring and sparks. The pitch at the side dims while it plays.
4. Each card then flies to its place on the sideways 4-3-3 pitch on the right; the pips along the top count the signings.
5. The finale: the marquee card, TEAM OVR counting up, the tier mix, and PLAY FIRST MATCH or CLUB HOUSE.

Tap anywhere to speed it up; SKIP (or Escape) jumps to the finale. Signing grants the eleven once (`grantCards`, id `pitch-duel-debut-xi`) and makes them the club (`claimDebut` in `state/progress.ts`). The guide offers REPLAY DEBUT XI, which plays it again without granting anything. On the host app a brand-new account sees the host's own football starter pack first; signing day follows.

## Match loop

**The pitch** is a ladder of 8 zones × 3 lanes. Progress is counted from the attacking side: 1 is its own box, 8 is the opponent's box. Both boxes use the centre lane only.

**Who duels:** the zone picks a line (back, mid or front) and the lane picks the places that cover it. The best-suited available player there contests the duel (`participantFor` in `engine/lineup.ts`). With eleven a side, the left back meets the right winger, and the centre backs meet the strikers.

**When you have the ball**, the buttons are fixed for each zone and lane (3–4 of them, from `attackMenu`). They come from five families:

| Family | Actions |
|---|---|
| PASS | Short pass, Forward pass |
| CARRY | Dribble, Sprint, Cut inside |
| THROUGH | Through ball, Long ball |
| WIDE | Switch play, Cross |
| SHOT | Shoot, Long shot |

**When the CPU has the ball**, you pick a defence. Each one fully counters one family and partly counters another:

| Defence | Fully counters | Partly counters | Notes |
|---|---|---|---|
| Intercept | PASS | THROUGH | |
| Tackle | CARRY | PASS | |
| Hold line | THROUGH | SHOT | |
| Aerial duel | WIDE | CARRY | |
| Block | SHOT | WIDE | |
| Slide tackle | — | CARRY + THROUGH | Bigger swings, about 3× foul risk |
| Clearance | — | Everything | Box only |

**The mind game.** At the start of each turn the CPU commits its pick (`cpuIntent`) before the human chooses.
- A full counter shifts the duel by −13, a partial by −4, a wrong read by +4.
- The Mind Game tactic shows the committed pick early. It never changes it.

**Duel resolution:**
- `k = action base + 0.5 × (weighted attacker stats − weighted defender stats) + lane fit + counter + formation + division edge + man advantage + bonus + tactic`.
- Add a triangular random swing of ±24 × volatility.
- Four outcomes: big fail, fail, success, big success.

**Set pieces** (penalty, free kick, corner, one-on-one) open a picture you tap (`components/set-piece-scenes.tsx`):
- penalty: five goal zones, or three dives when you are in goal;
- free kick: over, around or under the wall, or lay it off;
- corner: near post, far post or short;
- one on one: round, chip or low.

Each zone sends the same option id as before. The odds are in `engine/set-pieces.ts`.

**The clock** runs to 90' in about 31 decisions, with stoppage time. **Draws stay draws.**

## Momentum and surges

Each side has a momentum bar from 0 to 100 (`engine/momentum.ts`), shown under its score on the scorebug.

| Event | Momentum |
|---|---|
| Win an open-play duel | +15, +8 more for a big win |
| Win a duel as the defender with a full counter (a read) | +6 more |
| Lose a duel | −7 |
| A save (open play or set piece) | +14 for the keeper's side |
| Score | +20; the side that concedes −30 |

A full bar is a **surge**: one open-play duel played at +9 for the side that spends it. A full bar holds until it is spent, so a side can save it for the right moment.
- **You** arm it with the gold SURGE chip beside the move heading. Your moves turn gold and the next pick carries it (`surge: true` on the input).
- **The CPU** spends its surge attacking from your half or defending its own third (`surgeMoment`). A pulsing bolt on their card warns you while theirs waits.
- The reveal tags a surge ("⚡ SURGE PAID OFF", "⚡ THEY SURGED") and washes the stage gold or red.

The simulator spends the human's surge at the same moments the CPU does, so test matches stay symmetric. Compared with the game before surges, 400-match runs moved goals per match from 2.0–2.4 to 2.2–2.6 and draws down a few points; win rates stayed within a few points.

## Sound

`components/audio.ts` (`PitchDuelAudio`, passed to the screens through `SoundContext`). Nothing loads until the first tap; if audio cannot start, the game plays silently. The speaker button (top bar, match scorebug and reveal) mutes it, and the setting is saved in the career (`settings.sound`).

- **Recordings** (CC0, from Freesound; cut at MP3 frame boundaries; hashes in `public/games/pitch-duel/PROVENANCE.json`, checked by `npm run test:pitch-duel`): a stadium crowd bed and terrace drums (both looped without a seam by folding the end into the start), a goal roar, a crowd "ooh", a referee whistle and a ball kick.
- **Synthesized** (WebAudio): card whooshes and flips, reveal booms by tier, sparkles, the walkout riser, duel clashes, win and loss figures, the surge rise and full-time stings.
- **In a match:** the crowd rises when either box is under threat, and the drums come in when your surge is ready or in a close last ten minutes. Whistles mark kick-off, fouls, cards, half-time and full-time. The crowd "oohs" at saves, posts and misses and roars for goals.


## Formations

| Formation | Name | Edge |
|---|---|---|
| 4-4-2 | Classic | Balanced, no modifier |
| 4-3-3 | Wing Play | +2 attacking on the wings, −1 defending there |
| 3-5-2 | Midfield Lock | +2 in the centre lane, −2 on the wings |
| 4-2-3-1 | Control | +2 defending in midfield, +1 attacking centrally near goal |
| 5-3-2 | Park the Bus | +3 defending near goal, −3 attacking near goal |

Each formation has ten places. Each place has a line, the lanes it covers, a shirt position, and an `at` spot (across, depth) that the lineup editor and match map use. `placeSpot` (`components/pitch-layout.ts`) turns a spot into a point on the sideways club pitch: depth runs left to right, across runs top to bottom.

## CPU

- **Learning:** a recency-weighted memory of your last 10 picks per zone band, spread over move families.
- **Division tables** (`difficulty` in `engine/situation.ts`) set trust, greed, softmax temperature, edge and once-per-match boosts.
- **Squads:** `draftOpponent` picks a formation, a keeper and ten outfield cards near the division's target overall (77 → 89). Each card is chosen for the place it plays (`fillFormation`).

## Club, lineup and saves

**Club:** a keeper, ten outfield players in one of five formations, and up to 3 owned tactic cards.

**Academy:** sixteen fictional academy players (`src/mocks/packs/pitch-duel-academy.ts`, ids `pd-academy-*`, rated 58–66) cover every position, so a starter collection can field eleven.
- They are always available inside Fot Duel.
- They are never sold in packs and never count as owned cards.

**Lineup editor** (`components/lineup-editor.tsx`):
- **Drag:** drag a token onto another place to swap, or drag a card across from the squad tray. This works with touch and with the mouse.
- **Tap:** tap a place, then another place or a squad card.
- **Keyboard:** Enter picks a place, the arrow keys move between places (right is up the field), Enter places the card.
- Changing formation re-seats the eleven where they fit best.
- Auto Pick fields the best eleven for the shape.
- Each name tag shows how well the player fits by its border: green for natural, amber for near, red for out of position. Tokens scale with the pitch, so no tag covers another token's shield in any of the five shapes from a 740×360 screen.

**League:** 3 points for a win, 1 for a draw, promotion every 9 points up to division 5. Each promotion grants an original fictional `pd2-*` card. Coins are 120, 75 or 45.

**Saves:**
- The key is `statoz.games.web.pitch-duel.v4`. It is included in local account switching.
- A v3 save (`…pitch-duel.v3`, five a side) or a v2 save (`…pitch-duel.reboot.v2`) is migrated automatically and keeps all progress.
- The old club is re-seated in a 4-4-2 by position, academy players fill the rest, and the rules guide shows once more.
- Older keys are never deleted.

Real-athlete cards come from the existing catalogue; their presence does not imply endorsement.

## Landscape layout

Fot Duel is played sideways. On a phone it uses the shared landscape `MobileGameViewport` (`shared/mobile-viewport/policy.ts`), so a phone held upright gets the rotated landscape frame, like the other landscape games. The game fills the screen up to 90rem wide, centred on a wide desktop. Every screen has a slim top bar, then columns side by side, sized to fit a 740×360 phone without scrolling the page. The guide and the league may scroll; they are reading screens.

**Match screen:**
1. The top bar: back, YOUR XI, the trapezoid scorebug (your score, the clock and theirs on one row), OPP. XI, and the events button. Below 47rem wide the lineup buttons shrink to icons.
2. Three columns under it:
   - **Left:** the situation box, the sideways match map (home attacks right; tap it for the big map), and the latest event (tap it for the log).
   - **Centre:** the two player cards around the VS with their live stats and pick tags. The verdict or the tip sits in a fixed slot below them, so the cards do not jump. Set pieces replace the cards with the tap scene.
   - **Right:** the move panel. It shows what the turn asks of you, then the moves as violet buttons in two columns and the tactic chips, or the CONTINUE button between turns.

**Club house:** the wordmark, division badge, PLAY MATCH, LINEUP, LEAGUE and the guide link on the left. On the right, a strip with the promotion track and form, and your eleven on a sideways pitch.

**Lineup editor:** the sideways pitch on the left. On the right: the formation and OVR, the shape blurb, the status line, a SQUAD/TACTICS switch with the position filters, the squad tray, and AUTO PICK, RESET and SAVE SQUAD.

**Signing day:** the reveal spot on the left, the 4-3-3 filling up on the right (see [Debut XI](#debut-xi-first-run)).

**Matchday:** your team sheet, the matchup (division, OVR against OVR, the rival, REROLL, KICK OFF) and their team sheet, side by side.

**Full-time:** the result card with CLUB HOUSE and NEXT MATCH, the player of the match, and the ratings list.

**Overlays:**
- Lineups, events and the big map open in a drawer from the right edge.
- Goals open the GOAL!!! modal, with the scorer's card beside the text.
- Leaving asks for confirmation.

**Motion:**
- Cards deal in, then clash with a flash and sparks at the VS; the winner lifts and the loser dims. Big wins, big losses and goals shake the cards.
- The verdict carries a tug-of-war meter along its top edge: the needle swings from the centre to where the duel landed (from your side), with ticks at the outcome bands. Very close duels add "BY A WHISKER" or "SO CLOSE".
- The crowd behind the cards twinkles with phone flashes, faster when a box is under threat and fastest on a goal.
- Kick-off, half-time and full-time take over the centre: both crests with formation and OVR at kick-off, the score and match stats at the breaks. A reveal that ends a half is dismissed first, so the panel always shows.
- Your goals throw confetti over the GOAL!!! modal; theirs pulse red at the edges. A win throws confetti on the full-time screen while the coins and points count up.
- The map dots glide.
- The score pops on a goal.
- The CONTINUE button fills while a reveal auto-advances.
- Reduced motion cuts every animation to an instant change.

**Fit and touch:** every tappable option is at least 44px and on screen from 740×360 up. Screens up to 25rem tall tighten the scorebug, the tags and the verdict. A tall, narrow desktop window stacks the columns and scrolls.

## Verification

- `npm run test:pitch-duel`: engine, CPU, career and debut tests. These cover formations, academy fill, v3 → v4 migration, calibration bands for match length, goals and draws, the debut draw (legal 4-3-3, bands, natural positions, reveal order, saved draw), momentum and surges, and the sound provenance hashes.
- `npm run test:pitch-duel:browser` (or `node tests/pitch-duel.browser.mjs --url=http://127.0.0.1:PORT` against a running dev server):
  - a fresh career signs its debut XI first: the pack, a few signings, SKIP, the finale, and the eleven granted and saved as the club;
  - a phone held sideways at 844×390: a lineup drag swap and a squad swap, then a full match;
  - a phone held upright at 360×740, which the landscape frame turns to 740×360: a full match;
  - 932×430 (phone) and 1280×800 (desktop): home, lineup, matchday and the match screen lay out without scrolling;
  - a v3 save loads as an eleven and skips the debut reveal.
- The shared `tests/mobile-game-viewport.browser.mjs` also expects `/play/pitch-duel` in the landscape frame.
- `npm run typecheck`, `npm run lint` and `npm run build`.
