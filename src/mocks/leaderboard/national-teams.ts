import type { TeamSeed } from "@/domain/leaderboard";

/**
 * The tournament board's TEAMS field: sixteen national sides with the points
 * and movements the app ships. Their colours are the real national identity
 * colours, which is why they are hex literals rather than palette tokens — a
 * crest is the team's colour, not the product's.
 *
 * Argentina is flagged as the side the player backs, exactly as the app ships
 * it. A team board ranks teams rather than players, so unlike the players
 * board there is no live standing to put in its place.
 */
export const nationalTeams: TeamSeed[] = [
  {
    team: { id: "fra", name: "France", shortName: "FRA", color: "#1b4fd7" },
    score: 1877,
    movement: 2,
  },
  {
    team: { id: "esp", name: "Spain", shortName: "ESP", color: "#d71920" },
    score: 1876,
    movement: -1,
  },
  {
    team: { id: "arg", name: "Argentina", shortName: "ARG", color: "#74acdf" },
    score: 1875,
    movement: -1,
    isBacked: true,
  },
  {
    team: { id: "eng", name: "England", shortName: "ENG", color: "#f5f5f5" },
    score: 1813,
    movement: 0,
  },
  {
    team: { id: "por", name: "Portugal", shortName: "POR", color: "#006600" },
    score: 1764,
    movement: 1,
  },
  {
    team: { id: "bra", name: "Brazil", shortName: "BRA", color: "#ffdf00" },
    score: 1761,
    movement: -1,
  },
  {
    team: { id: "ned", name: "Netherlands", shortName: "NED", color: "#ff7f00" },
    score: 1756,
    movement: 0,
  },
  {
    team: { id: "mar", name: "Morocco", shortName: "MAR", color: "#c1272d" },
    score: 1738,
    movement: 1,
  },
  {
    team: { id: "bel", name: "Belgium", shortName: "BEL", color: "#fdda24" },
    score: 1735,
    movement: 0,
  },
  {
    team: { id: "ger", name: "Germany", shortName: "GER", color: "#111111" },
    score: 1730,
    movement: 0,
  },
  {
    team: { id: "cro", name: "Croatia", shortName: "CRO", color: "#e31b23" },
    score: 1717,
    movement: 1,
  },
  {
    team: { id: "mex", name: "Mexico", shortName: "MEX", color: "#006847" },
    score: 1706,
    movement: 1,
  },
  {
    team: {
      id: "usa",
      name: "United States",
      shortName: "USA",
      color: "#3c3b6e",
    },
    score: 1698,
    movement: 2,
  },
  {
    team: { id: "uru", name: "Uruguay", shortName: "URU", color: "#7bb9e8" },
    score: 1687,
    movement: -1,
  },
  {
    team: { id: "col", name: "Colombia", shortName: "COL", color: "#ffd100" },
    score: 1684,
    movement: 1,
  },
  {
    team: { id: "jpn", name: "Japan", shortName: "JPN", color: "#0033a0" },
    score: 1672,
    movement: 0,
  },
];
