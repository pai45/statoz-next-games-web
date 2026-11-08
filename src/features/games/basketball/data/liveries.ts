/**
 * The kits the rigs wear — the web port of `data/basketball_teams.dart`.
 *
 * A livery is three content colours: the jersey body, its trim, and the accent
 * that carries the number and the shoe. They are brand colours, so they are
 * data here rather than design tokens, exactly as Final Over holds its kits.
 *
 * Flutter sells the other twelve in the Shop, which the web has no equivalent
 * of; the player always wears STATOZ and the CPU draws one of the rest.
 */

export type BasketballLivery = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
};

export const basketballLiveries: BasketballLivery[] = [
  {
    id: "statoz",
    name: "STATOZ",
    primary: "#0b4f5c", // deep teal body
    secondary: "#061018", // near-black trim
    accent: "#35e0ff", // cyan number/stripe
  },
  { id: "lakers", name: "Los Angeles", primary: "#fdb927", secondary: "#552583", accent: "#000000" },
  { id: "bulls", name: "Chicago", primary: "#ce1141", secondary: "#000000", accent: "#ffffff" },
  { id: "celtics", name: "Boston", primary: "#007a33", secondary: "#ffffff", accent: "#000000" },
  { id: "warriors", name: "Golden State", primary: "#1d428a", secondary: "#ffc72c", accent: "#ffffff" },
  { id: "heat", name: "Miami", primary: "#98002e", secondary: "#f9a01b", accent: "#000000" },
  { id: "knicks", name: "New York", primary: "#f58426", secondary: "#006bb6", accent: "#ffffff" },
  { id: "nets", name: "Brooklyn", primary: "#000000", secondary: "#ffffff", accent: "#707271" },
  { id: "spurs", name: "San Antonio", primary: "#c4ced4", secondary: "#000000", accent: "#ef426f" },
  { id: "suns", name: "Phoenix", primary: "#1d1160", secondary: "#e56020", accent: "#f9ad1b" },
  { id: "bucks", name: "Milwaukee", primary: "#00471b", secondary: "#eee1c6", accent: "#ffffff" },
  { id: "mavs", name: "Dallas", primary: "#00538c", secondary: "#b8c4ca", accent: "#ffffff" },
  { id: "nuggets", name: "Denver", primary: "#0e2240", secondary: "#fec524", accent: "#8b2131" },
];

/** The one kit every player starts with — and, on the web, always wears. */
export const freeLiveryId = "statoz";

export function liveryById(id: string): BasketballLivery {
  return basketballLiveries.find((team) => team.id === id) ?? basketballLiveries[0];
}

/** The rival's kit. Never the player's, so the two sides always read apart. */
export function rivalLiveryId(playerLiveryId: string, roll: number): string {
  const rivals = basketballLiveries.filter((team) => team.id !== playerLiveryId);
  return rivals[Math.floor(roll * rivals.length) % rivals.length].id;
}

/** The three-letter code the arena banners print for a livery. */
export function liveryCode(id: string): string {
  return id.slice(0, 3).toUpperCase();
}
