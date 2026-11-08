import type {
  LeagueHubSnapshot,
  LeagueLeaderCategory,
  LeagueStandingColumn,
  LeagueStandingRow,
} from "@/domain/leagues";
import type { SportTeam } from "@/domain/matches";
import type { Sport } from "@/domain/sports";
import { snapshotLeagueHubs } from "./snapshots";

type TeamSeed = readonly [id: string, name: string, short: string, color: string, secondary?: string, ink?: string];
type LeagueSeed = {
  id: string;
  sport: Sport;
  name: string;
  shortCode: string;
  accent: string;
  seasonLabel: string;
  teams: readonly TeamSeed[];
};

const cyan = "var(--ds-color-accent-cyan)";
const lime = "var(--ds-color-accent-lime)";
const orange = "var(--ds-color-accent-orange)";
const violet = "var(--ds-color-accent-violet)";
const blue = "var(--ds-color-accent-blue)";
const racing = "var(--ds-color-accent-racing)";

const mlsEast: readonly TeamSeed[] = [
  ["nsh", "Nashville SC", "NSH", "#f6e500", "#1f1646", "#081019"],
  ["mia", "Inter Miami CF", "MIA", "#231f20", "#f7b5cd"],
  ["chi", "Chicago Fire FC", "CHI", "#8fd3f4", "#ef3340", "#081019"],
  ["ne", "New England Revolution", "NE", "#0a2240", "#ce0e2d"],
  ["clt", "Charlotte FC", "CLT", "#1f8acb", "#101820", "#081019"],
  ["cin", "FC Cincinnati", "CIN", "#0b3d91", "#f05323"],
  ["nyc", "New York City FC", "NYC", "#9bc9eb", "#6cace4", "#081019"],
  ["rbny", "Red Bull New York", "RBNY", "#d50032", "#ffd400"],
  ["orl", "Orlando City SC", "ORL", "#61259e", "#f5a800"],
  ["tor", "Toronto FC", "TOR", "#c8102e", "#455560"],
  ["dc", "D.C. United", "DC", "#101010", "#ef2b2d"],
  ["phi", "Philadelphia Union", "PHI", "#071b2c", "#b9975b"],
  ["atl", "Atlanta United", "ATL", "#a71930", "#80000b"],
  ["clb", "Columbus Crew", "CLB", "#101010", "#fef200"],
  ["mtl", "CF Montreal", "MTL", "#00529b", "#000000"],
];

const mlsWest: readonly TeamSeed[] = [
  ["sd", "San Diego FC", "SD", "#0b233f", "#00c2cb"],
  ["van", "Vancouver Whitecaps", "VAN", "#ffffff", "#9dc2e3", "#081019"],
  ["min", "Minnesota United", "MIN", "#7a8691", "#8cd2f4", "#081019"],
  ["sea", "Seattle Sounders", "SEA", "#236192", "#5d9732"],
  ["lafc", "Los Angeles FC", "LAFC", "#101010", "#c39e6d"],
  ["por", "Portland Timbers", "POR", "#004812", "#d69a00"],
  ["aus", "Austin FC", "ATX", "#00b140", "#101820", "#081019"],
  ["col", "Colorado Rapids", "COL", "#862633", "#8bb8e8"],
  ["dal", "FC Dallas", "DAL", "#bf0d3e", "#003087"],
  ["rsl", "Real Salt Lake", "RSL", "#013a81", "#b30838"],
  ["stl", "St. Louis CITY SC", "STL", "#e40046", "#001f5b"],
  ["skc", "Sporting Kansas City", "SKC", "#002f65", "#91b0cf"],
  ["hou", "Houston Dynamo", "HOU", "#f68712", "#101820", "#081019"],
  ["lag", "LA Galaxy", "LA", "#00245d", "#f2c75c"],
  ["sj", "San Jose Earthquakes", "SJ", "#0067b1", "#101820"],
];

const seeds: readonly LeagueSeed[] = [
  { id: "mls", sport: "football", name: "Major League Soccer", shortCode: "MLS", accent: cyan, seasonLabel: "2026 MLS", teams: [...mlsEast, ...mlsWest] },
  { id: "epl", sport: "football", name: "Premier League", shortCode: "EPL", accent: cyan, seasonLabel: "2026/27 PREMIER LEAGUE", teams: [
    ["arsenal", "Arsenal", "ARS", "#ef0107", "#ffffff"], ["villa", "Aston Villa", "AVL", "#670e36", "#95bfe5"], ["bournemouth", "Bournemouth", "BOU", "#da291c", "#101820"], ["brentford", "Brentford", "BRE", "#e30613", "#ffffff"], ["brighton", "Brighton", "BHA", "#0057b8", "#ffcd00"], ["burnley", "Burnley", "BUR", "#6c1d45", "#99d6ea"], ["chelsea", "Chelsea", "CHE", "#034694", "#ffffff"], ["palace", "Crystal Palace", "CRY", "#1b458f", "#c4122e"], ["everton", "Everton", "EVE", "#003399", "#ffffff"], ["fulham", "Fulham", "FUL", "#ffffff", "#cc0000", "#081019"], ["leeds", "Leeds United", "LEE", "#ffcd00", "#1d428a", "#081019"], ["liverpool", "Liverpool", "LIV", "#c8102e", "#00b2a9"], ["man-city", "Manchester City", "MCI", "#6cabdd", "#1c2c5b", "#081019"], ["man-utd", "Manchester United", "MUN", "#da291c", "#fbe122"], ["newcastle", "Newcastle United", "NEW", "#241f20", "#ffffff"], ["forest", "Nottingham Forest", "NFO", "#dd0000", "#ffffff"], ["sunderland", "Sunderland", "SUN", "#eb172b", "#ffffff"], ["spurs", "Tottenham Hotspur", "TOT", "#132257", "#ffffff"], ["west-ham", "West Ham United", "WHU", "#7a263a", "#1bb1e7"], ["wolves", "Wolverhampton", "WOL", "#fdb913", "#231f20", "#081019"]
  ] },
  { id: "fifa", sport: "football", name: "World Cup", shortCode: "FIFA", accent: lime, seasonLabel: "2026 WORLD CUP", teams: [
    ["arg", "Argentina", "ARG", "#75aadb", "#ffffff", "#081019"], ["bra", "Brazil", "BRA", "#ffdf00", "#009c3b", "#081019"], ["england", "England", "ENG", "#ffffff", "#cf081f", "#081019"], ["france", "France", "FRA", "#1e5aa8", "#ef4135"], ["esp", "Spain", "ESP", "#aa151b", "#f1bf00"], ["ger", "Germany", "GER", "#ffffff", "#000000", "#081019"], ["por", "Portugal", "POR", "#046a38", "#da291c"], ["ned", "Netherlands", "NED", "#f36c21", "#ffffff", "#081019"], ["ita", "Italy", "ITA", "#0066b3", "#ffffff"], ["bel", "Belgium", "BEL", "#ef3340", "#ffcd00"], ["cro", "Croatia", "CRO", "#ff0000", "#ffffff"], ["uru", "Uruguay", "URU", "#5cbfeb", "#ffffff", "#081019"], ["usa", "United States", "USA", "#3c3b6e", "#b22234"], ["mex", "Mexico", "MEX", "#006847", "#ce1126"], ["jpn", "Japan", "JPN", "#001e62", "#ffffff"], ["kor", "South Korea", "KOR", "#cd2e3a", "#0047a0"]
  ] },
  { id: "ipl", sport: "cricket", name: "Indian Premier League", shortCode: "IPL", accent: violet, seasonLabel: "2026 IPL", teams: [
    ["chennai", "Chennai Super Kings", "CSK", "#ffff3c", "#0081c8", "#081019"], ["mumbai", "Mumbai Indians", "MI", "#004ba0", "#d1ab3e"], ["bengaluru", "Royal Challengers Bengaluru", "RCB", "#d71920", "#f6c344"], ["rajasthan", "Rajasthan Royals", "RR", "#254aa5", "#ea1a85"], ["kolkata", "Kolkata Knight Riders", "KKR", "#3a225d", "#f2c94c"], ["hyderabad", "Sunrisers Hyderabad", "SRH", "#f26522", "#101820", "#081019"], ["delhi", "Delhi Capitals", "DC", "#17449b", "#ef1b2d"], ["punjab", "Punjab Kings", "PBKS", "#ed1b24", "#dcb65a"], ["lucknow", "Lucknow Super Giants", "LSG", "#0057e2", "#00a9e0"], ["gujarat", "Gujarat Titans", "GT", "#1b2133", "#c7a15a"]
  ] },
  { id: "t20i", sport: "cricket", name: "International T20", shortCode: "T20I", accent: orange, seasonLabel: "2026 T20 INTERNATIONAL", teams: [
    ["india", "India", "IND", "#1c4ea0", "#ff9933"], ["australia", "Australia", "AUS", "#ffcd00", "#00843d", "#081019"], ["england", "England", "ENG", "#ffffff", "#cf081f", "#081019"], ["pakistan", "Pakistan", "PAK", "#01411c", "#ffffff"], ["new-zealand", "New Zealand", "NZ", "#101010", "#ffffff"], ["south-africa", "South Africa", "SA", "#007749", "#ffb81c"], ["west-indies", "West Indies", "WI", "#7a0016", "#f9d616"], ["sri-lanka", "Sri Lanka", "SL", "#002b54", "#ffbe29"], ["bangladesh", "Bangladesh", "BAN", "#006a4e", "#f42a41"], ["afghanistan", "Afghanistan", "AFG", "#0066b3", "#d32011"]
  ] },
  { id: "wnba", sport: "basketball", name: "Women’s National Basketball Association", shortCode: "WNBA", accent: orange, seasonLabel: "2026 WNBA", teams: [
    ["liberty", "New York Liberty", "NYL", "#6eceb2", "#000000", "#081019"], ["lynx", "Minnesota Lynx", "MIN", "#236192", "#78be20"], ["aces", "Las Vegas Aces", "LVA", "#c8102e", "#c5c7c9"], ["mercury", "Phoenix Mercury", "PHX", "#3c286e", "#f05023"], ["storm", "Seattle Storm", "SEA", "#2c5234", "#fee11a"], ["fever", "Indiana Fever", "IND", "#002d62", "#e03a3e"], ["dream", "Atlanta Dream", "ATL", "#c8102e", "#418fde"], ["wings", "Dallas Wings", "DAL", "#002b5c", "#c4d600"], ["sky", "Chicago Sky", "CHI", "#5091cd", "#ffd520", "#081019"], ["sparks", "Los Angeles Sparks", "LAS", "#552583", "#ffc72c"], ["mystics", "Washington Mystics", "WAS", "#e31837", "#002b5c"], ["sun", "Connecticut Sun", "CON", "#f05023", "#0a2240", "#081019"]
  ] },
  { id: "nba", sport: "basketball", name: "National Basketball Association", shortCode: "NBA", accent: racing, seasonLabel: "2026/27 NBA", teams: [
    ["celtics", "Boston Celtics", "BOS", "#007a33", "#ba9653"], ["knicks", "New York Knicks", "NYK", "#006bb6", "#f58426"], ["bucks", "Milwaukee Bucks", "MIL", "#00471b", "#eee1c6"], ["cavaliers", "Cleveland Cavaliers", "CLE", "#860038", "#fdbb30"], ["heat", "Miami Heat", "MIA", "#98002e", "#f9a01b"], ["sixers", "Philadelphia 76ers", "PHI", "#006bb6", "#ed174c"], ["pacers", "Indiana Pacers", "IND", "#002d62", "#fdbb30"], ["bulls", "Chicago Bulls", "CHI", "#ce1141", "#000000"], ["thunder", "Oklahoma City Thunder", "OKC", "#007ac1", "#ef3b24"], ["nuggets", "Denver Nuggets", "DEN", "#0e2240", "#fec524"], ["lakers", "Los Angeles Lakers", "LAL", "#552583", "#f9a01b"], ["warriors", "Golden State Warriors", "GSW", "#1d428a", "#ffc72c"], ["rockets", "Houston Rockets", "HOU", "#ce1141", "#000000"], ["clippers", "LA Clippers", "LAC", "#c8102e", "#1d428a"], ["mavericks", "Dallas Mavericks", "DAL", "#00538c", "#002b5e"], ["grizzlies", "Memphis Grizzlies", "MEM", "#5d76a9", "#12173f"]
  ] },
  { id: "wimbledon", sport: "tennis", name: "Wimbledon", shortCode: "WIM", accent: lime, seasonLabel: "2026 WIMBLEDON", teams: tennisSeeds() },
  { id: "atp", sport: "tennis", name: "ATP Tour", shortCode: "ATP", accent: blue, seasonLabel: "2026 ATP TOUR", teams: tennisSeeds() },
  { id: "wta", sport: "tennis", name: "WTA Tour", shortCode: "WTA", accent: violet, seasonLabel: "2026 WTA TOUR", teams: wtaSeeds() },
  { id: "f1", sport: "motorsport", name: "Formula 1", shortCode: "F1", accent: racing, seasonLabel: "2026 FORMULA 1", teams: racingSeeds() },
  { id: "indy", sport: "motorsport", name: "IndyCar", shortCode: "INDY", accent: blue, seasonLabel: "2026 INDYCAR", teams: indySeeds() },
];

function tennisSeeds(): readonly TeamSeed[] { return [
  ["alcaraz", "Carlos Alcaraz", "ESP", "#f1bf00", "#aa151b", "#081019"], ["sinner", "Jannik Sinner", "ITA", "#009246", "#ce2b37"], ["djokovic", "Novak Djokovic", "SRB", "#0c4076", "#c6363c"], ["zverev", "Alexander Zverev", "GER", "#101010", "#dd0000"], ["fritz", "Taylor Fritz", "USA", "#3c3b6e", "#b22234"], ["draper", "Jack Draper", "GBR", "#012169", "#c8102e"], ["de-minaur", "Alex de Minaur", "AUS", "#00843d", "#ffcd00"], ["musetti", "Lorenzo Musetti", "ITA", "#009246", "#ce2b37"], ["rune", "Holger Rune", "DEN", "#c60c30", "#ffffff"], ["medvedev", "Daniil Medvedev", "MED", "#1e5aa8", "#ffffff"], ["rublev", "Andrey Rublev", "RUB", "#d52b1e", "#ffffff"], ["paul", "Tommy Paul", "USA", "#3c3b6e", "#b22234"]
]; }

function wtaSeeds(): readonly TeamSeed[] { return [
  ["sabalenka", "Aryna Sabalenka", "SAB", "#d22730", "#ffffff"], ["swiatek", "Iga Swiatek", "POL", "#ffffff", "#dc143c", "#081019"], ["gauff", "Coco Gauff", "USA", "#3c3b6e", "#b22234"], ["pegula", "Jessica Pegula", "USA", "#3c3b6e", "#b22234"], ["rybakina", "Elena Rybakina", "KAZ", "#00afca", "#f4ec1c", "#081019"], ["paolini", "Jasmine Paolini", "ITA", "#009246", "#ce2b37"], ["keys", "Madison Keys", "USA", "#3c3b6e", "#b22234"], ["andreeva", "Mirra Andreeva", "AND", "#436f4d", "#ffffff"], ["zheng", "Qinwen Zheng", "CHN", "#de2910", "#ffde00"], ["navarro", "Emma Navarro", "USA", "#3c3b6e", "#b22234"], ["badosa", "Paula Badosa", "ESP", "#aa151b", "#f1bf00"], ["osaka", "Naomi Osaka", "JPN", "#001e62", "#ffffff"]
]; }

function racingSeeds(): readonly TeamSeed[] { return [
  ["verstappen", "Max Verstappen", "VER", "#1e41ff", "#f42d29"], ["norris", "Lando Norris", "NOR", "#ff8700", "#101820", "#081019"], ["leclerc", "Charles Leclerc", "LEC", "#dc0000", "#ffd100"], ["piastri", "Oscar Piastri", "PIA", "#ff8700", "#101820", "#081019"], ["russell", "George Russell", "RUS", "#00d2be", "#101820", "#081019"], ["hamilton", "Lewis Hamilton", "HAM", "#dc0000", "#ffd100"], ["antonelli", "Kimi Antonelli", "ANT", "#00d2be", "#101820", "#081019"], ["alonso", "Fernando Alonso", "ALO", "#006f62", "#cedc00"], ["sainz", "Carlos Sainz", "SAI", "#005aff", "#ffffff"], ["gasly", "Pierre Gasly", "GAS", "#ff87bc", "#005ba9", "#081019"]
]; }

function indySeeds(): readonly TeamSeed[] { return [
  ["palou", "Alex Palou", "PAL", "#0033a0", "#e4002b"], ["oward", "Pato O’Ward", "OWA", "#ff8700", "#101820", "#081019"], ["newgarden", "Josef Newgarden", "NEW", "#d71920", "#f5c400"], ["dixon", "Scott Dixon", "DIX", "#0033a0", "#e4002b"], ["lundgaard", "Christian Lundgaard", "LUN", "#ff8700", "#101820", "#081019"], ["herta", "Colton Herta", "HER", "#ed1c24", "#00529b"], ["kirkwood", "Kyle Kirkwood", "KIR", "#ed1c24", "#00529b"], ["ericsson", "Marcus Ericsson", "ERI", "#ed1c24", "#00529b"], ["power", "Will Power", "POW", "#d71920", "#f5c400"], ["mclaughlin", "Scott McLaughlin", "MCL", "#d71920", "#f5c400"], ["rosenqvist", "Felix Rosenqvist", "ROS", "#6d2077", "#ffffff"], ["malukas", "David Malukas", "MAL", "#0057b8", "#ffffff"]
]; }

function team(seed: TeamSeed): SportTeam {
  return { id: seed[0], name: seed[1], shortName: seed[2], color: seed[3], secondaryColor: seed[4], badgeTextColor: seed[5] };
}

const columnsBySport: Record<Sport, LeagueStandingColumn[]> = {
  football: [column("p", "P"), column("w", "W"), column("d", "D"), column("l", "L"), column("f", "F"), column("a", "A"), column("gd", "GD"), column("pts", "PTS", true)],
  cricket: [column("p", "P"), column("w", "W"), column("l", "L"), column("nrr", "NRR"), column("pts", "PTS", true)],
  basketball: [column("p", "P"), column("w", "W"), column("l", "L"), column("pct", "PCT"), column("diff", "DIFF", true)],
  tennis: [column("p", "P"), column("w", "W"), column("l", "L"), column("pts", "PTS", true)],
  motorsport: [column("races", "R"), column("wins", "W"), column("podiums", "POD"), column("pts", "PTS", true)],
};

function column(id: string, label: string, emphasis = false): LeagueStandingColumn { return { id, label, emphasis }; }

function generatedMetrics(sport: Sport, rank: number, count: number): Record<string, string | number> {
  if (sport === "football") {
    const p = 22; const w = Math.max(4, 17 - rank); const d = 2 + (rank % 5); const l = p - w - d; const f = Math.max(20, 49 - rank * 2); const a = 17 + rank * 2;
    return { p, w, d, l, f, a, gd: `${f - a >= 0 ? "+" : ""}${f - a}`, pts: w * 3 + d };
  }
  if (sport === "cricket") { const p = 14; const w = Math.max(3, 12 - rank); return { p, w, l: p - w, nrr: `${rank < count / 2 ? "+" : ""}${(1.42 - rank * .17).toFixed(2)}`, pts: w * 2 }; }
  if (sport === "basketball") { const p = 40; const w = Math.max(12, 34 - rank); const l = p - w; return { p, w, l, pct: (w / p).toFixed(3).slice(1), diff: `${(13.2 - rank * 1.4) >= 0 ? "+" : ""}${(13.2 - rank * 1.4).toFixed(1)}` }; }
  if (sport === "tennis") { const p = 42; const w = Math.max(18, 39 - rank); return { p, w, l: p - w, pts: Math.max(850, 10800 - rank * 675) }; }
  return { races: 16, wins: Math.max(0, 7 - Math.floor(rank / 2)), podiums: Math.max(1, 13 - rank), pts: Math.max(20, 346 - rank * 27) };
}

function generatedRows(seed: LeagueSeed, competitors: SportTeam[]): LeagueStandingRow[] {
  return competitors.map((competitor, index) => {
    const rank = index + 1;
    const qualifying = seed.sport === "motorsport" ? rank <= 3 : rank <= Math.max(4, Math.floor(competitors.length * .55));
    const zone = qualifying ? { label: seed.sport === "football" ? "PLAYOFFS" : "QUALIFIED", color: seed.accent } : undefined;
    return { rank, competitor, rankChange: rank % 4 === 0 ? -1 : rank % 5 === 0 ? 1 : 0, form: "WWDLW", metrics: generatedMetrics(seed.sport, rank, competitors.length), zone };
  });
}

const mlsEastMetrics: readonly (readonly [number, number, number, number, number, number, string, number])[] = [
  [22,16,4,2,47,17,"+30",52], [22,12,6,4,56,41,"+15",42], [21,11,4,6,39,28,"+11",37], [22,11,4,7,36,27,"+9",37], [22,10,5,7,40,32,"+8",35], [22,8,7,7,49,51,"-2",31], [22,7,7,8,36,31,"+5",28], [22,7,5,10,32,46,"-14",26], [22,7,4,11,37,54,"-17",25], [22,5,10,7,32,38,"-6",25], [22,5,10,7,28,36,"-8",25], [22,6,6,10,34,39,"-5",24], [22,6,3,13,25,38,"-13",21], [22,5,5,12,29,40,"-11",20], [22,4,6,12,24,39,"-15",18]
];

function mlsRows(competitors: SportTeam[], west = false): LeagueStandingRow[] {
  return competitors.map((competitor, index) => {
    const rank = index + 1;
    const metrics = west ? generatedMetrics("football", rank + 1, competitors.length) : (() => { const m = mlsEastMetrics[index]; return { p:m[0],w:m[1],d:m[2],l:m[3],f:m[4],a:m[5],gd:m[6],pts:m[7] }; })();
    const zone = rank <= 7 ? { label: "ROUND ONE", color: "var(--ds-color-success)" } : rank <= 9 ? { label: "WILD CARD", color: "var(--ds-color-text-muted)" } : undefined;
    return { rank, competitor, rankChange: 0, form: "WWDLW", metrics, zone };
  });
}

const namesBySport: Record<Sport, readonly string[]> = {
  football: ["Lionel Messi", "Petar Musa", "Nicolás Fernández", "Evander", "Prince Owusu", "Brian White", "Sam Surridge", "Hugo Cuypers", "Tai Baribo", "Denis Bouanga"],
  cricket: ["Virat Kohli", "Shubman Gill", "Travis Head", "Suryakumar Yadav", "Jos Buttler", "Jasprit Bumrah", "Rashid Khan", "Kuldeep Yadav", "Pat Cummins", "Hardik Pandya"],
  basketball: ["A’ja Wilson", "Nikola Jokić", "Breanna Stewart", "Luka Dončić", "Caitlin Clark", "Shai Gilgeous-Alexander", "Sabrina Ionescu", "Jayson Tatum", "Napheesa Collier", "Stephen Curry"],
  tennis: ["Carlos Alcaraz", "Jannik Sinner", "Aryna Sabalenka", "Iga Swiatek", "Coco Gauff", "Novak Djokovic", "Elena Rybakina", "Alexander Zverev", "Jessica Pegula", "Taylor Fritz"],
  motorsport: ["Max Verstappen", "Lando Norris", "Alex Palou", "Charles Leclerc", "Pato O’Ward", "Oscar Piastri", "Scott Dixon", "George Russell", "Josef Newgarden", "Lewis Hamilton"],
};

const categoriesBySport: Record<Sport, readonly (readonly [string, string, string, LeagueLeaderCategory["accent"]])[]> = {
  football: [["goals","GOALS","GOALS SCORED","league"],["assists","ASSISTS","ASSISTS","league"],["target","ON TARGET","SHOTS ON TARGET","league"],["shots","SHOTS","TOTAL SHOTS","league"]],
  cricket: [["runs","RUNS","RUNS SCORED","league"],["wickets","WICKETS","WICKETS TAKEN","success"],["strike","STRIKE RATE","STRIKE RATE","orange"],["sixes","SIXES","SIXES HIT","league"]],
  basketball: [["points","POINTS","POINTS PER GAME","league"],["assists","ASSISTS","ASSISTS PER GAME","league"],["rebounds","REBOUNDS","REBOUNDS PER GAME","success"],["steals","STEALS","STEALS PER GAME","orange"]],
  tennis: [["wins","WINS","MATCH WINS","league"],["aces","ACES","ACES SERVED","league"],["serve","1ST SERVE","FIRST SERVE %","success"],["breaks","BREAKS","BREAK POINTS WON","orange"]],
  motorsport: [["wins","WINS","RACE WINS","league"],["podiums","PODIUMS","PODIUM FINISHES","league"],["poles","POLES","POLE POSITIONS","orange"],["fastest","FASTEST","FASTEST LAPS","success"]],
};

function leaders(seed: LeagueSeed, competitors: SportTeam[]): LeagueLeaderCategory[] {
  const names = namesBySport[seed.sport];
  return categoriesBySport[seed.sport].map(([id, label, unitLabel, accent], categoryIndex) => ({
    id, label, unitLabel, accent,
    leaders: Array.from({ length: Math.min(10, competitors.length) }, (_, index) => {
      const value = Math.max(1, 18 - index - categoryIndex * 2);
      return { id: `${seed.id}-${id}-${index + 1}`, name: names[(index + categoryIndex) % names.length], competitor: competitors[(index * 2 + categoryIndex) % competitors.length], value, displayValue: String(value), detail: index === 0 ? `MATCHES: ${Math.max(16, 19 - categoryIndex)} // ${unitLabel.split(" ")[0]}: ${value}` : undefined };
    }),
  }));
}

const generatedLeagueHubSnapshots: LeagueHubSnapshot[] = seeds.map((seed) => {
  const competitors = seed.teams.map(team);
  const groups = seed.id === "mls"
    ? [
        { id: "east", label: "Eastern Conference", shortLabel: "EAST", rows: mlsRows(competitors.slice(0, 15)) },
        { id: "west", label: "Western Conference", shortLabel: "WEST", rows: mlsRows(competitors.slice(15), true) },
      ]
    : [{ id: "all", label: "All competitors", shortLabel: "TABLE", rows: generatedRows(seed, competitors) }];
  return {
    kind: "team",
    id: seed.id,
    sport: seed.sport,
    name: seed.name,
    shortCode: seed.shortCode,
    accent: seed.accent,
    seasonLabel: seed.seasonLabel,
    columns: columnsBySport[seed.sport],
    groups,
    leaderCategories: leaders(seed, competitors),
    statGroups: [],
    seasons: [{ year: 2026, label: seed.seasonLabel, current: true }],
  };
});

const snapshotIds = new Set(snapshotLeagueHubs.map((snapshot) => snapshot.id));
export const leagueHubSnapshots: LeagueHubSnapshot[] = [
  ...generatedLeagueHubSnapshots.filter((snapshot) => !snapshotIds.has(snapshot.id)),
  ...snapshotLeagueHubs,
];

const snapshotIndex = new Map(leagueHubSnapshots.map((snapshot) => [snapshot.id, snapshot]));
export const allLeagueHubIds = leagueHubSnapshots.map((snapshot) => snapshot.id);
export function leagueHubById(id: string): LeagueHubSnapshot | undefined { return snapshotIndex.get(id); }
export function leagueTeamById(leagueId: string, teamId: string): SportTeam | undefined {
  return leagueHubById(leagueId)?.groups.flatMap((group) => group.rows).find((row) => row.competitor.id === teamId)?.competitor;
}
