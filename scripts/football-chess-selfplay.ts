/**
 * Football Chess self-play: plays headless matches and prints the numbers the
 * rules are tuned against (goals, draws, shots, passive play, rating effect)
 * and how the AI tiers fare against each other.
 *
 *   npx tsx scripts/football-chess-selfplay.ts [calibrate|tiers|personalities|all] [matches]
 */

import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { botProfile, personalities, type Difficulty } from "../src/features/games/football-chess/engine/ai/bots";
import { seededSource } from "../src/features/games/football-chess/engine/rng";
import { draftSquad, squadRating, type CardPools } from "../src/features/games/football-chess/engine/setup";
import {
  botPolicy,
  greedyPolicy,
  playMatch,
  randomPolicy,
  summarize,
  type MatchSummary,
  type Policy,
} from "../src/features/games/football-chess/engine/simulate";
import { formations, matchConfig, type MatchSetup, type Side } from "../src/features/games/football-chess/engine/state";

const pools: CardPools = {
  attackers: footballPlayerCards.filter((card) => card.role === "attacker"),
  defenders: footballPlayerCards.filter((card) => card.role === "defender"),
  keepers: footballPlayerCards.filter((card) => card.role === "goalkeeper"),
};

function setupFor(seed: number, homeRating = 82, awayRating = 82): MatchSetup {
  const random = seededSource(seed * 7919 + 13);
  const home = draftSquad(homeRating, pools, random);
  const away = draftSquad(awayRating, pools, random, new Set(home.map((card) => card.id)));
  return {
    seed,
    home: { name: "Home", formation: formations[seed % formations.length], squad: home },
    away: { name: "Away", formation: formations[(seed >> 2) % formations.length], squad: away },
    config: matchConfig("standard"),
    kickoff: seed % 2 === 0 ? "home" : "away",
  };
}

type Tally = { matches: number; goals: number; draws: number; shots: number; passives: number; fouls: number; wins: Record<Side, number> };

function tally(results: MatchSummary[]): Tally {
  const t: Tally = { matches: results.length, goals: 0, draws: 0, shots: 0, passives: 0, fouls: 0, wins: { home: 0, away: 0 } };
  for (const r of results) {
    t.goals += r.goals.home + r.goals.away;
    t.shots += r.shots.home + r.shots.away;
    t.passives += r.passives.home + r.passives.away;
    t.fouls += r.fouls.home + r.fouls.away;
    if (r.winner === null) t.draws += 1;
    else t.wins[r.winner] += 1;
  }
  return t;
}

function report(label: string, t: Tally, ms: number): void {
  const n = t.matches;
  console.log(
    `${label.padEnd(28)} n=${n}  goals/match ${(t.goals / n).toFixed(2)}  draws ${((100 * t.draws) / n).toFixed(0)}%  ` +
      `shots/side ${(t.shots / n / 2).toFixed(1)}  passive/side ${(t.passives / n / 2).toFixed(2)}  fouls/side ${(t.fouls / n / 2).toFixed(2)}  ` +
      `home ${t.wins.home} away ${t.wins.away}  (${(ms / n).toFixed(0)} ms/match)`,
  );
}

function run(label: string, n: number, make: (seed: number) => { setup: MatchSetup; home: Policy; away: Policy }): Tally {
  const started = Date.now();
  const results: MatchSummary[] = [];
  for (let seed = 1; seed <= n; seed += 1) {
    const { setup, home, away } = make(seed);
    results.push(summarize(playMatch(setup, { home, away })));
  }
  const t = tally(results);
  report(label, t, Date.now() - started);
  return t;
}

/** Plays a pairing with sides swapped every other match; returns A's points share. */
function headToHead(label: string, n: number, a: (seed: number) => Policy, b: (seed: number) => Policy, ratings: [number, number] = [82, 82]): number {
  let points = 0;
  const started = Date.now();
  const results: MatchSummary[] = [];
  for (let seed = 1; seed <= n; seed += 1) {
    const aHome = seed % 2 === 1;
    const setup = setupFor(seed, aHome ? ratings[0] : ratings[1], aHome ? ratings[1] : ratings[0]);
    const summary = summarize(
      playMatch(setup, aHome ? { home: a(seed), away: b(seed) } : { home: b(seed), away: a(seed) }),
    );
    results.push(summary);
    const aSide: Side = aHome ? "home" : "away";
    points += summary.winner === null ? 0.5 : summary.winner === aSide ? 1 : 0;
  }
  const t = tally(results);
  report(label, t, Date.now() - started);
  const share = points / n;
  console.log(`${"".padEnd(28)} first side's points share ${(100 * share).toFixed(0)}%`);
  return share;
}

const mode = process.argv[2] ?? "calibrate";
const n = Number(process.argv[3] ?? 40);
const bot = (difficulty: Difficulty) => (seed: number) => botPolicy(botProfile(difficulty), seed, difficulty);

if (mode === "calibrate" || mode === "all") {
  run("greedy vs greedy", n, (seed) => ({ setup: setupFor(seed), home: greedyPolicy(seed), away: greedyPolicy(seed + 1) }));
  run("medium vs medium", Math.max(4, Math.round(n / 2)), (seed) => ({
    setup: setupFor(seed),
    home: bot("medium")(seed),
    away: bot("medium")(seed + 1000),
  }));
  headToHead("rating 90 vs 72 (medium)", Math.max(4, Math.round(n / 2)), bot("medium"), bot("medium"), [90, 72]);
  console.log(`(squad ratings drafted around 90 / 72: e.g. ${squadRating(setupFor(1, 90, 72).home.squad)} vs ${squadRating(setupFor(1, 90, 72).away.squad)})`);
}

if (mode === "tiers" || mode === "all") {
  headToHead("easy vs random", n, bot("easy"), (seed) => randomPolicy(seed));
  headToHead("medium vs easy", n, bot("medium"), bot("easy"));
  headToHead("hard vs medium", Math.max(4, Math.round(n / 2)), bot("hard"), bot("medium"));
}

if (mode === "personalities" || mode === "all") {
  for (const personality of personalities) {
    headToHead(
      `${personality} vs balanced`,
      Math.max(4, Math.round(n / 2)),
      (seed) => botPolicy(botProfile("medium", personality), seed, personality),
      bot("medium"),
    );
  }
}
