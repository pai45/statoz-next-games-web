# Football Chess

- **Route:** `/play/football-chess` (game id `football-chess`)
- **Status:** v2 is live. Phase 1 built the engine and AI in
  `src/features/games/football-chess/engine/`, and Phase 2 replaced the v1 screens
  with the hub, Quick Match, Record and the new match screen. Training (Phase 3),
  AI tiers in the UI and Game Review (Phase 4) and Career (Phase 5) are still to come.
- **Orientation:** landscape, goals left and right. On phones it runs in the shared
  landscape frame; a portrait desktop window stacks the panels under the board.
- **Style:** its own "chessboard pitch" identity, with no StatOz design system inside the game.

The full revamp plan is in the project's plan file. This document is the rules
spec for v2 and the record of how the numbers were tuned.

## The board

- **Size:** 7 columns (a–g) by 5 rows (1–5). Home is on the left and attacks the goal to the right of column g. Away attacks the goal to the left of column a.
- **Goals:** each goal sits off the grid, level with rows 2–4. The three goal-mouth rows are the shot targets G2, G3 and G4.
- **Keepers:** each keeper stands in its goal, not on a square.
- **Squads:** each side fields four outfielders and a keeper, from a squad in the order `[attacker, attacker, defender, defender, keeper]`.
- **Formations:** box (2-2), diamond (1-2-1), high line (2-1-1) and low block (1-1-2). Each side's starting squares are in its own three columns. Away uses the same shapes mirrored.
- **Kick-off:** the kick-off takes place on d3. The kicker is the side's most forward attacker.

## Piece classes

The class comes from the card's first listed position, so it needs no new card data.

| Class | Positions | Moves | Shoots from | Power |
|---|---|---|---|---|
| Striker | ST | 1 square, any direction | 4 columns out | Finishing ×1.1 |
| Runner | LW, RW, LB, RB | Up to 2 squares in a straight line (8 directions), no jumping | 3 | **Skill move**, plus +12% on take-ons |
| Playmaker | CM, CAM | 1 square | 3 | Lofted pass |
| Defender | CB, CDM | 1 square | 3 | Guards the 8 squares around it; +10% tackles, blocks 55% |
| Keeper | GK | Automatic | n/a | Saves; throws to any teammate |

How the powers work:

- **Guarded squares:** a carrier that steps into a square guarded by an opposing Defender stops there. A Runner with the ball cannot carry on to its second square.
- **Skill move:** a Runner with the ball can make an L-shaped knight jump over pieces. It can be used once per possession per team, and it can't land on a guarded square.
- **Lofted pass:** a Playmaker's pass goes over pieces and can't be cut out on the way. Only a marked receiver is at risk.
- **Keepers:** after each action by the side on the ball, both keepers step one row toward the ball's row. Actions by the defending side don't move them, so switching play beats the keeper.

## Actions

Each turn the side to move takes **one action**, chosen by tapping a piece and then a target.

- **Move:** to an empty square, following the class's movement.
- **Pass:** to a teammate along a straight lane (a row, a column or a true diagonal).
  - **Lane:** a ground pass needs a lane with no opponent in it. Teammates let the ball through.
  - **Interception:** each lane square guarded by a Defender adds a 25% chance of the pass being cut out. A marked receiver adds 15%. A pass always has at least a 35% chance of arriving.
  - **Keeper throws:** a keeper can throw to anyone. Only a marked receiver is at risk.
  - **Keeper release:** while a keeper holds the ball, its team may take one outfield setup action instead of throwing immediately. Its next action must be a keeper throw, even if every receiver is marked. Opponent actions do not use the allowance. The rule applies to both sides; the attack clock keeps running and throws do not reset it. Saves start a fresh allowance; distribution, turnovers and restarts clear it. Half time and full time still happen normally. If no outfielder is on the pitch, the existing forced hold advances the sin bin until a receiver returns; no further setup move is allowed.
- **Shoot:** at G2, G3 or G4, from within the class's range.
- **Take-on:** at an adjacent opponent with an empty square straight behind it. Win and you land on that square; lose and they take the ball.
- **Tackle:** from next to the carrier.
  - A win takes the ball.
  - A miss leaves the tackler beaten: it can't act, and it can't tackle, on its side's next turn.
- **Slide:** from exactly 2 squares away in a straight line, with the square between empty.
  - A win means the slider lands in between with the ball.
  - A miss leaves the slider grounded for a turn, and 30% of misses are fouls.
- **Never from behind:** tackles and slides must come from the front or the side. A defender nearer the carrier's own goal than the carrier has been beaten and can only chase.

## Odds

Every chance is shown before the player commits, with the reasons behind it (`odds.ts`). The AI reads exactly the same numbers. Position is meant to matter more than rating.

### Shots

The chance before any blocker = base × angle × keeper × finish × rating.

| Part | Values |
|---|---|
| Base, by columns from goal: 1 / 2 / 3 / 4 | 0.80 / 0.60 / 0.40 / 0.24 |
| Angle, by rows between the shooter and the target: 0 / 1 / 2 / 3 | ×1.00 / 0.92 / 0.80 / 0.65 |
| Keeper, by rows between the keeper and the target: 0 / 1 / 2 | ×0.60 / 0.90 / 1.00 |
| Striker's finish | ×1.1 |
| Rating against the keeper | ±0.5% per point, capped at ±8% |
| Each opponent in the shot's path | Blocks 40%, or 55% for a Defender |

- The final goal chance is clamped to between 5% and 85%.
- 40% of blocked shots become **corners**: the attackers keep the ball on the near corner square with 3 actions on the attack clock.
- Other blocked shots go to the blocker, and saved shots go to the keeper.

### Duels and penalties

| Action | Base | Modifiers | Range |
|---|---|---|---|
| Take-on | 50% | Runner +12%; against a Defender −10%; −8% for each other defender next to the landing square; rating ±6% | 15–85% |
| Tackle | 28% | +12% for each teammate next to the carrier (up to 2); Defender +10%; rating ±6% | 15–75% |
| Slide | 55% | Defender +5%; rating ±6% | 20–80% |
| Penalty | 70% | Striker +4%; rating ±6% | 55–85% |

## Fouls, cards and penalties

- **Yellow card:** a foul (30% of missed slides) earns the slider a yellow card.
- **Second yellow:** the player goes to the sin bin for 6 of its side's actions, then comes back on the free square nearest its starting square.
- **Penalty:** a foul on a carrier in the fouling side's own penalty area (its first two columns, rows 2–4) gives a penalty. The fouled carrier takes it and must shoot. A penalty kick costs no action.
- **Free kick:** a foul outside the area just restarts the attack clock.

## Clock and match length

- **Half length:** each half is a fixed number of actions per side: short 12, standard 20, long 28.
  The plan started at 16; see the tuning record for why standard became 20.
- **Second half:** the side that did not kick off the first half kicks off the second.
- **The clock is actions, not seconds.** Quick Match adds optional per-move timers (Phase 2).
- **Attack clock:** the side on the ball has 6 of its own actions to shoot. A shot or a turnover resets it.
  - At zero, it's passive play: the opponent nearest the carrier is given the ball.
  - Defending actions don't run the clock.

## "Shot on!" works like check

A side has a shot on when its carrier has a shot of at least 25% now, or a pass-then-shot of at least 35% (`threats.ts`). The UI warns the defending side and shades the lanes. Answering it is advice, not a rule.

## Notation

`notation.ts` writes moves like a chess move list:

| Notation | Meaning | Notation | Meaning |
|---|---|---|---|
| `ST e3-f3` | move | `RN c2~d4` | skill move |
| `DF b2>d2` | pass | `PM c2>>f2` | lofted pass |
| `ST f3xG3` | shot | `RN d3^e3` | take-on |
| `DF d4Te3` | tackle | `DF b2Sd2` | slide |

`#` marks a goal and `+` a shot on. `positionFromDiagram` builds a position from five 7-character rows, which lessons, puzzles and tests use.

## Screens

- **Hub:** Quick Match, How to play (a five-page rules sheet), Record, and back to games. v1 players see a note that their record carried over.
- **Quick Match setup:** rival difficulty (Easy, Medium, Hard), your shape (four formations, drawn as mini boards) and length (12, 20 or 28 actions a half). Your five come from the active football deck; if it is incomplete, the Academy five play (`src/mocks/packs/football-chess-academy.ts`), so the launcher lets Football Chess past the full-deck gate.
- **Team sheets:** both fives with classes and ratings, the rival manager's habits (a random personality, which picks its shape), and the coin toss.
- **Match:** top bar (menu, score, half and actions left, attack-clock pips, sin bin, sound); left panel (whose turn, the tapped piece's moves and power, or the odds of the action waiting to be confirmed); the board with a win-chance bar beside it; right panel (the move list). Tap a piece, then a target: a dot is a move, a diamond a skill move, a dashed ring a pass, a red ring a duel and the goal boxes are shots. A sure thing plays at once; anything that rolls shows its outcomes and the factors behind them, and plays on Play it or a second tap. "Shot on!" shades the rival's shooting lanes. Goals, half time, cards, penalties and passive play get a banner; other rolls a short toast with the chance that came off.
- **Result and Record:** score, coins and match stats; then the record, win rate, goals and the last 30 results (five a page).

Everything fits one landscape phone screen: lists page instead of scrolling, and only the move list and an overflowing side card scroll inside their panels.

## Save

- **Key:** `statoz.games.web.football-chess.v2`, listed in `playerStorageKeys` so it moves with the account. The store refreshes when storage is cleared.
- **Contents:** settings (sound, win bar), tutorial status, overall and per-mode records, the last quick-match setup, the last 30 results, and the settled match ids.
- **v1:** `statoz.games.web.footballchess.v1` is read once and migrated in memory: wins, draws, losses and streaks carry over, and so does the formation. The migrated save is written from an effect; the v1 key is never deleted.
- **Settling:** a match is banked once by its id, paying 50, 20 or 10 coins through `settleCoinReward({ id: "football-chess-v2-<match id>" })`. Leaving a match early banks nothing.
- **Tampering:** counts are rebuilt from wins, draws and losses, streaks are capped by wins, unknown options fall back to defaults, and a result's letter always follows its score.

## Look and sound

- **Palette:** grass `#6f9a4a` / `#5a8540`, chalk `#f2efe1`, walnut `#5b3a22` / `#3e2716`, brass `#c9a24a`, warning `#a8322d`. You are ivory, the rival ebony.
- **Type:** Fraunces (display) and IBM Plex Sans Condensed (labels), both SIL OFL 1.1, from Fontsource, with the licences in `src/features/games/football-chess/fonts`.
- **Icons:** drawn for the game (`components/icons.tsx`).
- **Sound:** WebAudio synthesis only (`components/audio.ts`): clack, pass, shot, net, whistle and bell. No recordings, so there is nothing to license.

## Determinism, saves and replay

- **Plain data:** a match is plain JSON, made of the setup, the seed, the gameplay random stream's position and a log of actions with their outcome index.
- **One outcome list:** `resolve.ts` lists every outcome of an action. `step` draws one from the stored stream, and only when there is a real choice, so a plain move never uses up a roll.
- **Replay:** `replay(setup, log)` rebuilds the match exactly and refuses forged outcomes. Forced outcomes are only allowed when the match config allows them, which is Training only.

## AI

The AI lives in `engine/ai/`.

**Search:**
- It looks ahead and averages over each action's possible outcomes, reading the same lists the game draws from.
- Below the root, the most promising few actions are searched first, ranked by a quick guess.
- Its effort is capped by a count of positions, not by time, so it plays the same on every device.
- A goal ends a line. Like a chess engine preferring the shorter mate, a goal further ahead is worth 0.03 less for each move away, which stops the search putting a shot off forever.

**Position value** (`eval.ts`), in goals:
- the score difference;
- the ball carrier's progress, counted up to the halfway line, and its shot as an option (×0.3);
- the best open teammate it could pass to;
- a discount as the attack clock runs down;
- for the defending side, pressure on the ball and bodies goal-side of it;
- a cost for players in the sin bin.

**Tiers:**

| Tier | Depth | Width below the root | Position budget | Noise |
|---|---|---|---|---|
| Easy | 2, often only 1 (45% of moves) | 4 | 400 | High |
| Medium | 2 | 10 | 2,500 | Low |
| Hard | 3 | 12, then 6 | 16,000 | None |

**Personalities** change the position value, the appetite for risk and a taste for certain verbs:
- Balanced
- Park the Bus
- Tiki-Taka
- Gegenpress
- Long Ball
- Maverick

## Tuning record

`npx tsx scripts/football-chess-selfplay.ts [calibrate|tiers|personalities|all] [matches]`
plays headless matches.

Targets from the plan:
- 2.5–4 goals per standard match
- 20–30% draws
- 4–7 shots per side
- fewer than 1 passive-play turnover per side
- a 90-rated squad beating a 70-rated one about 60–65% of the time
- tier win rates: Easy beats random play at least 80% of the time, Medium beats Easy at least 75%, and Hard beats Medium at least 65%

What changed while tuning, and why:

1. **Tackles were too strong.** At first, a Defender with one teammate nearby won 65% of the time, and a miss cost almost nothing. Attackers never went near a defender, and Medium vs Medium scored 0 goals. Fix: tackles were weakened, and a missed tackle now leaves the tackler beaten for a turn.
2. **The AI kept "saving" its shots.** The evaluation counted an open shot as nearly a goal, so the AI held on to chances until they closed. Fix: a shot now counts as an option worth 0.3 of its chance, and possession loses value as the attack clock runs down.
3. **Nobody made forward runs.** Only the carrier's position counted, so moving a teammate into space looked worthless. Fix: the best open teammate now counts, and teammates no longer block passes.
4. **Possessions died in the attacker's own half.** Fix: the no-tackles-from-behind rule, and shooting range +1 column.
5. **Keeper throws and late shots.** An uncatchable keeper throw made saves look like counter-attacks, and the search kept delaying its shots. Fix: keeper throws can now be picked off when the receiver is marked; keeper possession is valued by its best throw; and goals end the search line with the shorter-mate preference.

Latest results are kept in the section below.

### Latest calibration (4 November 2026, standard length)

| Matchup | Matches | Goals/match | Draws | Shots/side | Passive/side | Result |
|---|---|---|---|---|---|---|
| Greedy vs greedy | 60 | 2.52 | 28% | 3.7 | 0.28 | |
| Medium vs Medium | 30 | 1.77 | 27% | 2.5 | 1.28 | |
| 90- vs 72-rated squad (Medium) | 30 | 1.67 | 27% | 2.6 | 1.22 | Stronger side 70% |
| Easy vs random | 60 | 1.48 | 20% | 2.1 | 1.91 | Easy 88% (target ≥80%) |
| Medium vs Easy | 60 | 1.77 | 20% | 2.9 | 1.47 | Medium 85% (target ≥75%) |
| Hard vs Medium | 30 | 1.70 | 47% | 2.6 | 0.63 | Hard 70% (target ≥65%) |

The match length changed after measuring. Each side spends about half its
actions defending, so at 16 actions a half a side only gets about 5
possessions a match. The first targets (2.5–4 goals, 4–7 shots a side) would
need almost every possession to end in a shot, so standard became 20 actions a
half.

Targets for the AI matched against itself are now:
- 1.5–3 goals per match
- 20–35% draws
- 2.5–4 shots per side
- passive play under 1.5 per side

Greedy and Medium sit inside these bands.

**Still open (Phase 4):**
- The rating effect is a little above its 60–65% target, at 70%.
- Against Balanced, Tiki-Taka scores 28% and Gegenpress 22%. Both hold the ball too long (1.6–2.1 passive turnovers a side) and need retuning.
- Park the Bus (53%), Maverick (50%) and Long Ball (42%) are close to even.

## Commands

- `npm run test:football-chess` — rules, odds, AI, save and style unit tests.
- `npm run test:football-chess:browser` — the hub, setup, team sheets and match at 844x390, an upright 360x740 phone (rotated frame), 932x430 and 1280x800; full short matches to the result; the v2 save and the v1 migration. Pass `-- --url=http://localhost:3000` to reuse a running dev server. Screenshots go to `test-results/football-chess`.
- `npm run test:football-chess:selfplay` — the calibration and tier report (slow).
