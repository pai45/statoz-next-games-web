import type { PickMarket, PickMarketStatus, PickMarketType, PickOutcome } from "@/domain/predictions";
import type { Sport } from "@/domain/sports";
import { matchById, trendingMarkets } from "@/mocks/matches";

export const picksDemoAnchor = "2026-08-25T12:00:00.000Z";

/**
 * An outcome wears the side it backs. A market on a fixture takes that
 * fixture's own team colours, so recolouring a club carries through to its
 * markets; a draw or a catch-all takes slate, and a yes/no pair reads green
 * against red.
 */
const drawColor = "#64748b";
const yesColor = "#36b86a";
const noColor = "#ff332e";
function sideColor(matchId: string, side: "home" | "away"): string {
  return matchById(matchId)?.[side].color ?? drawColor;
}

type MarketInput = {
  id: string; sport: Sport; leagueId: string; leagueLabel: string; question: string;
  type: PickMarketType; status?: PickMarketStatus; outcomes: PickOutcome[]; volumeOz: number;
  closesAt: string; matchId?: string; contextTitle?: string; contextSubtitle?: string;
  homeLabel?: string; awayLabel?: string; homeScore?: string; awayScore?: string;
  liveLabel?: string; resultNote?: string; resolvedOutcomeId?: string; voidReason?: string;
};

function history(closesAt: string, outcomes: PickOutcome[]): PickMarket["priceHistory"] {
  return [-168, -72, -24, -6, 0].map((hours, pointIndex) => ({
    at: new Date(Date.parse(closesAt) + hours * 3_600_000).toISOString(),
    percentsByOutcome: Object.fromEntries(outcomes.map((outcome, outcomeIndex) => {
      const drift = (outcome.delta ?? (outcomeIndex % 2 ? -2 : 2)) * (4 - pointIndex) / 4;
      return [outcome.id, Math.round(Math.max(1, Math.min(99, outcome.probabilityPercent - drift)))];
    })),
  }));
}

function defineMarket(input: MarketInput): PickMarket {
  const status = input.status ?? "upcoming";
  return { ...input, status, resolved: status === "settled" || status === "voided", priceHistory: history(input.closesAt, input.outcomes) };
}

function normalizedTrending(market: PickMarket, index: number): PickMarket {
  const matchIds: Record<string, string> = {
    epl_liv_mc_winner: "epl_liv_mci", ipl_sixes_over_12_5: "1496576",
    epl_mu_over_1_5: "epl_mu_ars", f1_belgian_gp_winner: "f1_belgian_gp",
  };
  const type: PickMarketType = market.id.includes("2026") ? "future" : market.id.includes("over") ? "event" : "match";
  const leagueId = market.leagueLabel === "WORLD CUP" ? "fifa" : market.leagueLabel === "BELGIAN GP" ? "f1" : market.leagueLabel.toLowerCase().replaceAll(" ", "-");
  const closesAt = type === "future" ? "2027-06-01T18:00:00.000Z" : new Date(Date.parse(picksDemoAnchor) + (index + 1) * 28_800_000).toISOString();
  const match = matchIds[market.id] ? matchById(matchIds[market.id]) : undefined;
  const settled = market.id === "f1_belgian_gp_winner" || market.id === "epl_mu_over_1_5";
  return defineMarket({
    id: market.id, sport: market.sport, leagueId,
    leagueLabel: market.leagueLabel, question: market.question, type, status: settled ? "settled" : market.id === "ipl_sixes_over_12_5" ? "live" : "upcoming",
    outcomes: market.outcomes, volumeOz: market.volumeOz, closesAt, matchId: match?.id,
    contextTitle: match ? `${match.home.name} vs ${match.away.name}` : undefined,
    // A match market carries the fixture in its question, so it takes the
    // context line rather than the split team labels an in-play market wants.
    homeLabel: type === "match" ? undefined : match?.home.shortName,
    awayLabel: type === "match" ? undefined : match?.away.shortName,
    homeScore: match?.homeScore === undefined ? undefined : String(match.homeScore), awayScore: match?.awayScore === undefined ? undefined : String(match.awayScore),
    liveLabel: match?.status === "live" ? "LIVE" : undefined, resolvedOutcomeId: settled ? (market.id === "epl_mu_over_1_5" ? "over" : "ver") : undefined,
    resultNote: settled ? "Verstappen won from pole" : undefined,
  });
}

const authoredMarkets: PickMarket[] = [
// User-approved illustrative championship examples; never a live odds feed.
  defineMarket({"id":"demo_ucl_2027_champion","sport":"football","leagueId":"ucl","leagueLabel":"UCL · DEMO","question":"Who wins the UCL 2026/27 title?","type":"future","status":"upcoming","outcomes":[{"id":"rma","label":"Real Madrid","probabilityPercent":36,"color":"#febe10"},{"id":"mci","label":"Manchester City","probabilityPercent":34,"color":"#6cabdd"},{"id":"bay","label":"Bayern Munich","probabilityPercent":30,"color":"#dc052d"}],"volumeOz":0,"closesAt":"2027-06-01T18:00:00.000Z","resultNote":"Illustrative demo championship; percentages are sample data."}),
  defineMarket({"id":"demo_nba_2027_champion","sport":"basketball","leagueId":"nba","leagueLabel":"NBA · DEMO","question":"Who wins the NBA 2027 championship?","type":"future","status":"upcoming","outcomes":[{"id":"bos","label":"Boston Celtics","probabilityPercent":35,"color":"#007a33"},{"id":"okc","label":"Oklahoma City Thunder","probabilityPercent":34,"color":"#007ac1"},{"id":"lal","label":"Los Angeles Lakers","probabilityPercent":31,"color":"#fdb927"}],"volumeOz":0,"closesAt":"2027-06-30T18:00:00.000Z","resultNote":"Illustrative demo championship; percentages are sample data."}),
  defineMarket({"id":"demo_f1_2027_drivers_champion","sport":"motorsport","leagueId":"f1","leagueLabel":"F1 · DEMO","question":"Who wins the 2027 drivers’ championship?","type":"future","status":"upcoming","outcomes":[{"id":"ver","label":"Max Verstappen","probabilityPercent":38,"color":"#3671c6"},{"id":"nor","label":"Lando Norris","probabilityPercent":34,"color":"#ff8000"},{"id":"lec","label":"Charles Leclerc","probabilityPercent":28,"color":"#e8002d"}],"volumeOz":0,"closesAt":"2027-12-01T18:00:00.000Z","resultNote":"Illustrative demo championship; percentages are sample data."}),

  defineMarket({ id: "epl_cfc_new_result", sport: "football", leagueId: "epl", leagueLabel: "EPL", question: "Chelsea vs Newcastle result", type: "match", status: "live", outcomes: [{ id: "cfc", label: "Chelsea", probabilityPercent: 57, delta: 8, color: sideColor("epl_cfc_new", "home") }, { id: "draw", label: "Draw", probabilityPercent: 19, delta: -3, color: drawColor }, { id: "new", label: "Newcastle", probabilityPercent: 24, delta: -5, color: sideColor("epl_cfc_new", "away") }], volumeOz: 28200, closesAt: "2026-08-25T19:00:00.000Z", matchId: "epl_cfc_new", contextTitle: "Chelsea vs Newcastle", liveLabel: "67'" }),
  defineMarket({ id: "epl_cfc_new_next_goal", sport: "football", leagueId: "epl", leagueLabel: "EPL", question: "Which side scores the next goal?", type: "event", status: "live", outcomes: [{ id: "cfc", label: "Chelsea", probabilityPercent: 61, delta: 4, color: sideColor("epl_cfc_new", "home") }, { id: "new", label: "Newcastle", probabilityPercent: 39, delta: -4, color: sideColor("epl_cfc_new", "away") }], volumeOz: 20000, closesAt: "2026-08-25T19:00:00.000Z", matchId: "epl_cfc_new", contextTitle: "Chelsea 2 — 1 Newcastle", contextSubtitle: "Live at 67 minutes", homeLabel: "CHE", awayLabel: "NEW", homeScore: "2", awayScore: "1", liveLabel: "67'" }),
  defineMarket({ id: "ipl_pjk_rcb_winner", sport: "cricket", leagueId: "ipl", leagueLabel: "IPL", question: "Punjab Kings vs RCB result", type: "match", status: "live", outcomes: [{ id: "pbks", label: "Punjab", probabilityPercent: 44, delta: -3, color: "#ef3340" }, { id: "rcb", label: "Bengaluru", probabilityPercent: 56, delta: 3, color: "#d71920" }], volumeOz: 67900, closesAt: "2026-08-25T16:30:00.000Z", matchId: "1496576", contextTitle: "Punjab Kings vs RCB", liveLabel: "LIVE" }),
  defineMarket({ id: "ipl_opener_50", sport: "cricket", leagueId: "ipl", leagueLabel: "IPL", question: "Will the opener score 50+?", type: "event", status: "unresolved", outcomes: [{ id: "yes", label: "Yes", probabilityPercent: 62, delta: 5, color: yesColor }, { id: "no", label: "No", probabilityPercent: 38, delta: -5, color: noColor }], volumeOz: 18400, closesAt: "2026-08-24T16:00:00.000Z", matchId: "t20i_ind_pak", contextTitle: "India vs Pakistan", resultNote: "Awaiting official scorer confirmation" }),
  defineMarket({ id: "epl_avl_bha_double_chance", sport: "football", leagueId: "epl", leagueLabel: "EPL", question: "Villa or draw — double chance?", type: "event", status: "settled", outcomes: [{ id: "villa_draw", label: "Villa / Draw", probabilityPercent: 68, color: "#670e36" }, { id: "bha", label: "Brighton", probabilityPercent: 32, color: "#0057b8" }], volumeOz: 23100, closesAt: "2026-08-23T18:00:00.000Z", resolvedOutcomeId: "villa_draw", resultNote: "Aston Villa 2–1 Brighton" }),
  defineMarket({ id: "ipl_rain_delay", sport: "cricket", leagueId: "ipl", leagueLabel: "IPL", question: "Will rain delay play?", type: "event", status: "voided", outcomes: [{ id: "yes", label: "Yes", probabilityPercent: 35, color: yesColor }, { id: "no", label: "No", probabilityPercent: 65, color: noColor }], volumeOz: 9700, closesAt: "2026-08-23T14:00:00.000Z", voidReason: "Market voided before the toss", resultNote: "All stakes refunded" }),
  defineMarket({ id: "nba_lal_gsw_winner", sport: "basketball", leagueId: "nba", leagueLabel: "NBA", question: "Lakers vs Warriors result", type: "match", outcomes: [{ id: "lal", label: "Lakers", probabilityPercent: 48, delta: -2, color: sideColor("nba_lal_gsw", "home") }, { id: "gsw", label: "Warriors", probabilityPercent: 52, delta: 2, color: sideColor("nba_lal_gsw", "away") }], volumeOz: 83400, closesAt: "2026-08-25T23:30:00.000Z", matchId: "nba_lal_gsw", contextTitle: "Lakers vs Warriors" }),
  defineMarket({ id: "laliga_title_2027", sport: "football", leagueId: "laliga", leagueLabel: "LALIGA", question: "Who wins LaLiga 2026/27?", type: "future", outcomes: [{ id: "rma", label: "Real Madrid", probabilityPercent: 42, color: "#febe10" }, { id: "bar", label: "Barcelona", probabilityPercent: 39, color: "#a50044" }, { id: "atm", label: "Atletico", probabilityPercent: 12, color: "#cb3524" }], volumeOz: 192000, closesAt: "2027-05-30T18:00:00.000Z" }),
  defineMarket({ id: "seriea_title_2027", sport: "football", leagueId: "serie-a", leagueLabel: "SERIE A", question: "Who takes the Serie A title?", type: "future", outcomes: [{ id: "int", label: "Inter", probabilityPercent: 38, color: "#0068a8" }, { id: "juv", label: "Juventus", probabilityPercent: 31, color: "#2b2b2b" }, { id: "mil", label: "Milan", probabilityPercent: 19, color: "#fb090b" }], volumeOz: 116000, closesAt: "2027-05-23T18:00:00.000Z" }),
  defineMarket({ id: "mls_phi_rbny_result", sport: "football", leagueId: "mls", leagueLabel: "MLS", question: "Philadelphia Union vs Red Bull New York result", type: "match", status: "settled", outcomes: [{ id: "phi", label: "Philadelphia Union", probabilityPercent: 56, delta: 4, color: "#eee1b3" }, { id: "draw", label: "Draw", probabilityPercent: 22, color: drawColor }, { id: "rbny", label: "Red Bull New York", probabilityPercent: 22, delta: -2, color: "#d50032" }], volumeOz: 2900, closesAt: "2026-08-23T19:30:00.000Z", matchId: "mls_phi_rbny", contextTitle: "Philadelphia Union vs Red Bull New York", resolvedOutcomeId: "phi", resultNote: "Philadelphia Union won 3-1" }),
  defineMarket({ id: "mls_ne_tor_result", sport: "football", leagueId: "mls", leagueLabel: "MLS", question: "New England Revolution vs Toronto FC result", type: "match", status: "settled", outcomes: [{ id: "ne", label: "New England Revolution", probabilityPercent: 57, delta: 3, color: "#d50032" }, { id: "draw", label: "Draw", probabilityPercent: 23, color: drawColor }, { id: "tor", label: "Toronto FC", probabilityPercent: 20, delta: -2, color: "#a71930" }], volumeOz: 2900, closesAt: "2026-08-23T21:00:00.000Z", matchId: "mls_ne_tor", contextTitle: "New England Revolution vs Toronto FC", resolvedOutcomeId: "draw", resultNote: "Full time 0-0" }),
  defineMarket({ id: "mls_mia_chi_result", sport: "football", leagueId: "mls", leagueLabel: "MLS", question: "Inter Miami CF vs Chicago Fire FC result", type: "match", status: "settled", outcomes: [{ id: "mia", label: "Inter Miami CF", probabilityPercent: 51, delta: 2, color: "#f7b5cd" }, { id: "draw", label: "Draw", probabilityPercent: 25, color: drawColor }, { id: "chi", label: "Chicago Fire FC", probabilityPercent: 24, delta: -2, color: "#8fd3f4" }], volumeOz: 3100, closesAt: "2026-08-24T00:00:00.000Z", matchId: "mls_mia_chi", contextTitle: "Inter Miami CF vs Chicago Fire FC", resolvedOutcomeId: "mia", resultNote: "Inter Miami CF won 3-2" }),
  defineMarket({ id: "mls_clb_nyc_result", sport: "football", leagueId: "mls", leagueLabel: "MLS", question: "Columbus Crew vs New York City FC result", type: "match", status: "settled", outcomes: [{ id: "clb", label: "Columbus Crew", probabilityPercent: 48, delta: -1, color: "#fef200" }, { id: "draw", label: "Draw", probabilityPercent: 27, color: drawColor }, { id: "nyc", label: "New York City FC", probabilityPercent: 25, delta: 2, color: "#9bc9eb" }], volumeOz: 2700, closesAt: "2026-08-24T01:30:00.000Z", matchId: "mls_clb_nyc", contextTitle: "Columbus Crew vs New York City FC", resolvedOutcomeId: "nyc", resultNote: "New York City FC won 2-1" }),
  defineMarket({ id: "t20i_ind_pak_toss", sport: "cricket", leagueId: "t20i", leagueLabel: "T20I", question: "Who wins the next India vs Pakistan T20?", type: "match", outcomes: [{ id: "india", label: "India", probabilityPercent: 61, color: "#1c4ea0" }, { id: "pakistan", label: "Pakistan", probabilityPercent: 39, color: "#01411c" }], volumeOz: 35400, closesAt: "2026-09-08T13:30:00.000Z", matchId: "t20i_ind_pak", contextTitle: "India vs Pakistan" }),
  defineMarket({ id: "wnba_nyl_lva_winner", sport: "basketball", leagueId: "wnba", leagueLabel: "WNBA", question: "New York Liberty vs Las Vegas Aces result", type: "match", outcomes: [{ id: "liberty", label: "New York Liberty", probabilityPercent: 54, color: "#6eceb2" }, { id: "aces", label: "Las Vegas Aces", probabilityPercent: 46, color: "#c8102e" }], volumeOz: 36700, closesAt: "2026-08-25T20:00:00.000Z", matchId: "wnba_nyl_lva", contextTitle: "New York Liberty vs Las Vegas Aces" }),
  defineMarket({ id: "wimbledon_2026_winner", sport: "tennis", leagueId: "wimbledon", leagueLabel: "WIMBLEDON", question: "Who wins the Wimbledon men’s final?", type: "match", outcomes: [{ id: "alcaraz", label: "Carlos Alcaraz", probabilityPercent: 52, color: "#f1bf00" }, { id: "sinner", label: "Jannik Sinner", probabilityPercent: 48, color: "#009246" }], volumeOz: 88300, closesAt: "2026-08-27T13:00:00.000Z", matchId: "wimbledon_mens_final_26", contextTitle: "Carlos Alcaraz vs Jannik Sinner" }),
  defineMarket({ id: "atp_alc_sin_winner", sport: "tennis", leagueId: "atp", leagueLabel: "ATP", question: "Carlos Alcaraz vs Jannik Sinner result", type: "match", outcomes: [{ id: "alcaraz", label: "Carlos Alcaraz", probabilityPercent: 55, color: "#f1bf00" }, { id: "sinner", label: "Jannik Sinner", probabilityPercent: 45, color: "#009246" }], volumeOz: 75200, closesAt: "2026-08-25T13:00:00.000Z", matchId: "atp_alc_sin", contextTitle: "Carlos Alcaraz vs Jannik Sinner" }),
  defineMarket({ id: "wta_swi_gau_winner", sport: "tennis", leagueId: "wta", leagueLabel: "WTA", question: "Iga Swiatek vs Coco Gauff result", type: "match", status: "live", outcomes: [{ id: "swiatek", label: "Iga Swiatek", probabilityPercent: 58, color: "#ffffff" }, { id: "gauff", label: "Coco Gauff", probabilityPercent: 42, color: "#3c3b6e" }], volumeOz: 44100, closesAt: "2026-08-25T16:00:00.000Z", matchId: "wta_swi_gau", contextTitle: "Iga Swiatek vs Coco Gauff", liveLabel: "SET 3" }),
  defineMarket({ id: "indy_gateway_winner", sport: "motorsport", leagueId: "indy", leagueLabel: "INDY", question: "Who wins the Gateway 500?", type: "match", outcomes: [{ id: "palou", label: "Alex Palou", probabilityPercent: 41, color: "#0033a0" }, { id: "oward", label: "Pato O’Ward", probabilityPercent: 34, color: "#ff8700" }, { id: "newgarden", label: "Josef Newgarden", probabilityPercent: 25, color: "#d71920" }], volumeOz: 82400, closesAt: "2026-08-30T18:00:00.000Z", matchId: "indy_gateway_500", contextTitle: "Gateway 500" }),
  defineMarket({ id: "indy_gateway_fastest_lap", sport: "motorsport", leagueId: "indy", leagueLabel: "INDY", question: "Who sets the fastest lap at Gateway?", type: "event", status: "voided", outcomes: [{ id: "palou", label: "Alex Palou", probabilityPercent: 38, color: "#0033a0" }, { id: "oward", label: "Pato O'Ward", probabilityPercent: 34, color: "#ff8700" }, { id: "field", label: "The field", probabilityPercent: 28, color: drawColor }], volumeOz: 12600, closesAt: "2026-08-30T18:00:00.000Z", matchId: "indy_gateway_500", contextTitle: "Gateway 500", voidReason: "Timing feed was unavailable", resultNote: "All stakes refunded" }),
];

export const pickMarkets: PickMarket[] = [...trendingMarkets.map(normalizedTrending), ...authoredMarkets];
const pickMarketIndex = new Map(pickMarkets.map((market) => [market.id, market]));
export const allPickMarketIds = pickMarkets.map((market) => market.id);
export function pickMarketById(id: string): PickMarket | undefined { return pickMarketIndex.get(id); }
/**
 * The markets on one fixture, in the order the match detail lists them: live
 * first, then what is still to come, then what has closed, then what has been
 * settled — and inside each band, whichever closes soonest.
 */
export function pickMarketsForMatch(matchId: string): PickMarket[] {
  const rank = (market: PickMarket): number => {
    switch (market.status) {
      case "live": return 0;
      case "closed":
      case "unresolved": return 2;
      case "settled":
      case "voided": return 3;
      default: return 1;
    }
  };
  return pickMarkets
    .filter((market) => market.matchId === matchId)
    .toSorted((a, b) => rank(a) - rank(b) || Date.parse(a.closesAt ?? "9999-12-31") - Date.parse(b.closesAt ?? "9999-12-31"));
}
export function pickMarketsForLeague(leagueId: string): PickMarket[] { return pickMarkets.filter((market) => market.leagueId === leagueId); }
export function hasLinkedFixture(market: PickMarket): boolean { return Boolean(market.matchId && matchById(market.matchId)); }

/**
 * A league's brand colour, worn by the mark on its market cards. Brand colour
 * is fixture data rather than a palette decision, so it lives with the
 * fixtures.
 */
export function pickLeagueColor(leagueId?: string): string {
  switch ((leagueId ?? "").toLowerCase()) {
    case "ipl":
      return "var(--ds-color-accent-cyan)";
    case "epl":
      return "#a855f7";
    case "fifa":
      return "#2856ff";
    default:
      return "var(--ds-color-accent-cyan)";
  }
}
