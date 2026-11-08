import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const appRoot = process.cwd();
const flutterRoot = join(appRoot, "..", "flutter_projects", "card_game");
const sourceRoot = join(flutterRoot, "assets", "data");
const snapshotRoot = join(appRoot, "src", "mocks", "snapshots", "card-game");
const paletteSource = join(flutterRoot, "tool", "data", "team_palettes.json");
const paletteTarget = join(appRoot, "scripts", "data", "card-game", "team-palettes.json");
const runtimePaletteTarget = join(appRoot, "src", "mocks", "identity", "team-palettes.generated.ts");
const runtimePortraitTarget = join(appRoot, "src", "features", "packs", "data", "portrait-assets.card-game.generated.ts");
const checkOnly = process.argv.includes("--check");

const portraitFolders = {
  football: "player_images",
  cricket: "cricketer_images",
  basketball: "basketball_player_images",
  tennis: "tennis_player_images",
  motorsport: "racing_driver_images",
};

const snapshots = [
  "basketball-revamp.json",
  "cricket-league-stats.json",
  "cricket-revamp.json",
  "f1-italian-gp.json",
  "f1-league-standings.json",
  "football-league-seasons.json",
  "football-league-stats.json",
  "football-revamp.json",
  "nba-league-stats.json",
];

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableJson(value[key])]),
  );
}

function normalizedJson(path) {
  return `${JSON.stringify(stableJson(JSON.parse(readFileSync(path, "utf8"))), null, 2)}\n`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const left = luminance(first); const right = luminance(second);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function sourceFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? sourceFiles(join(root, entry.name)) : entry.name.endsWith(".ts") && entry.name !== "team-palettes.generated.ts" ? [join(root, entry.name)] : []);
}

function validateSnapshot(file, data) {
  assert(data && typeof data === "object", `${file}: expected an object`);
  if (file === "football-revamp.json") {
    assert(data.espnEventId === "401879318", `${file}: expected Fulham-Chelsea event 401879318`);
    assert(data.teams?.[0]?.name === "Fulham" && data.teams?.[1]?.name === "Chelsea", `${file}: unexpected teams or home/away order`);
    assert(data.matchDetails?.score?.display === "2-3", `${file}: unexpected final score`);
    assert(new Set(data.teams.flatMap((team) => team.players.map((player) => String(player.id)))).size === data.teams.flatMap((team) => team.players).length, `${file}: duplicate roster player id`);
  }
  if (file === "cricket-revamp.json") {
    assert(data.espnEventId === "1535465", `${file}: expected RCB-GT event 1535465`);
    assert(data.teams?.[0]?.name === "Royal Challengers Bengaluru" && data.teams?.[1]?.name === "Gujarat Titans", `${file}: unexpected teams or home/away order`);
    assert(data.deliveries?.length === 233, `${file}: expected 233 verified deliveries`);
    const rosterIds = data.teams.flatMap((team) => team.players.map((player) => String(player.id)));
    assert(rosterIds.length === 24 && new Set(rosterIds).size === 24 && rosterIds.every((id) => data.playerStats[id]), `${file}: roster/player-stat link failed`);
  }
  if (file === "basketball-revamp.json") {
    assert(data.teams?.[0]?.name === "San Antonio Spurs" && data.teams?.[1]?.name === "New York Knicks", `${file}: unexpected teams or home/away order`);
    assert(data.matchDetails?.score?.display === "90-94", `${file}: unexpected final score`);
    assert(data.teams.flatMap((team) => team.players).length === 30, `${file}: expected 30-player box score`);
    assert(data.playByPlay.every((play) => !play.coordinate || play.coordinate.x >= 0 && play.coordinate.x <= 50), `${file}: shot x outside ESPN half-court frame`);
  }
  if (file.endsWith("league-stats.json")) {
    assert(Array.isArray(data.leagues) && data.leagues.length > 0, `${file}: missing leagues`);
    for (const league of data.leagues) {
      assert(Array.isArray(league.teams) && league.teams.length > 0, `${file}: league has no teams`);
      const teamIds = new Set(league.teams.map((team) => String(team.id)));
      assert(teamIds.size === league.teams.length, `${file}: duplicate team id`);
      const standingGroups = league.conferences
        ? league.conferences.flatMap((conference) => conference.standings ?? [])
        : league.standings ?? [];
      for (const row of standingGroups) {
        assert(teamIds.has(String(row.teamId)), `${file}: standing references unknown team ${row.teamId}`);
      }
      for (const board of league.leaders ?? []) {
        for (const leader of board.leaders ?? []) {
          assert(teamIds.has(String(leader.teamId)), `${file}: leader references unknown team ${leader.teamId}`);
        }
      }
      const fixtureIds = (league.fixtures ?? []).map((fixture) => String(fixture.id));
      assert(new Set(fixtureIds).size === fixtureIds.length, `${file}: duplicate fixture id`);
    }
  }
  if (file === "f1-italian-gp.json") {
    assert(data.race?.id === "600057442", `${file}: unexpected race id`);
    assert(data.race?.circuit?.laps === 53, `${file}: unexpected lap count`);
    assert(data.sessions?.length === 5, `${file}: expected five sessions`);
    const race = data.sessions.find((session) => session.type?.abbreviation === "Race");
    assert(race?.classification?.[0]?.driverId === "5829", `${file}: unexpected winner`);
  }
}

for (const file of snapshots) {
  const source = join(sourceRoot, file);
  const target = join(snapshotRoot, file);
  assert(existsSync(source), `Missing Flutter snapshot: ${source}`);
  const parsed = JSON.parse(readFileSync(source, "utf8"));
  validateSnapshot(file, parsed);
  const expected = normalizedJson(source);
  if (checkOnly) {
    assert(existsSync(target), `Missing vendored snapshot: ${target}`);
    assert(readFileSync(target, "utf8") === expected, `${file}: vendored snapshot is stale`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, expected);
  }
}

assert(existsSync(paletteSource), `Missing palette source: ${paletteSource}`);
const palettes = JSON.parse(readFileSync(paletteSource, "utf8"));
assert(Array.isArray(palettes) && palettes.length === 6248, "Expected 6,248 team palettes");
for (const palette of palettes) {
  for (const key of ["primaryColor", "secondaryColor", "textColor", "secondaryTextColor"]) {
    assert(/^#[0-9a-f]{6}$/i.test(palette[key]), `Invalid ${key} for ${palette.id}`);
  }
  assert(["#0D111A", "#0F172B", "#1D293D", "#10192D"].every((surface) => contrast(palette.secondaryTextColor, surface) >= 4.5), `Secondary text is not AA-safe for ${palette.name}`);
}
const expectedPalettes = normalizedJson(paletteSource);
if (checkOnly) {
  assert(existsSync(paletteTarget), `Missing vendored palette: ${paletteTarget}`);
  assert(readFileSync(paletteTarget, "utf8") === expectedPalettes, "Vendored palette is stale");
} else {
  mkdirSync(dirname(paletteTarget), { recursive: true });
  writeFileSync(paletteTarget, expectedPalettes);
}

const referenceHaystack = [
  ...snapshots.map((file) => readFileSync(join(snapshotRoot, file), "utf8")),
  ...sourceFiles(join(appRoot, "src", "mocks", "matches")).map((file) => readFileSync(file, "utf8")),
  ...sourceFiles(join(appRoot, "src", "mocks", "leagues")).map((file) => readFileSync(file, "utf8")),
  readFileSync(join(appRoot, "src", "mocks", "shop", "frames.generated.ts"), "utf8"),
].join("\n");
const runtimePalettes = palettes.filter((palette) => palette.name && referenceHaystack.includes(JSON.stringify(palette.name)));
const runtimeSource = `/* Generated by scripts/sync-card-game-snapshots.mjs. */\nexport const teamPaletteRegistry = ${JSON.stringify(runtimePalettes, null, 2)} as const;\n\nexport type TeamPalette = (typeof teamPaletteRegistry)[number];\nconst key = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");\nexport function resolveTeamPalette(input: { sport: string; name: string; abbreviation?: string; competition?: string }): TeamPalette | undefined {\n  const aliases = [input.name, input.abbreviation ?? ""].map(key).filter(Boolean);\n  const competition = key(input.competition ?? "");\n  return teamPaletteRegistry.find((palette) => key(palette.sport) === key(input.sport) && (!competition || key(palette.tournament) === competition) && aliases.some((alias) => [palette.name, palette.displayName, palette.abbreviation].map(key).includes(alias)))\n    ?? teamPaletteRegistry.find((palette) => key(palette.sport) === key(input.sport) && aliases.some((alias) => [palette.name, palette.displayName, palette.abbreviation].map(key).includes(alias)));\n}\n`;
if (checkOnly) {
  assert(existsSync(runtimePaletteTarget), `Missing runtime palette registry: ${runtimePaletteTarget}`);
  assert(readFileSync(runtimePaletteTarget, "utf8") === runtimeSource, "Runtime palette registry is stale");
} else {
  mkdirSync(dirname(runtimePaletteTarget), { recursive: true });
  writeFileSync(runtimePaletteTarget, runtimeSource);
}

if (!checkOnly) {
  const sourcePortraitRoot = join(flutterRoot, "assets");
  for (const [sport, folder] of Object.entries(portraitFolders)) {
    const source = join(sourcePortraitRoot, folder);
    const target = join(appRoot, "public", "assets", "shop", "portraits", sport);
    mkdirSync(target, { recursive: true });
    for (const file of (await import("node:fs")).readdirSync(source)) {
      copyFileSync(join(source, file), join(target, file));
    }
  }
}

const normalizeIdentity = (value) => value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
const packSources = sourceFiles(join(appRoot, "src", "mocks", "packs"));
const cards = packSources.flatMap((path) => {
  const source = readFileSync(path, "utf8");
  return [...source.matchAll(/id:\s*"([^"]+)"[^\n]*?name:\s*"([^"]+)"/g)].map((match) => ({ id: match[1], name: match[2] }));
});
const portraitCandidates = Object.entries(portraitFolders).flatMap(([sport, folder]) => readdirSync(join(flutterRoot, "assets", folder)).map((file) => ({
  sport,
  file,
  key: normalizeIdentity(file.replace(/\.[^.]+$/, "").replace(/^\d+[_ -]+/, "")),
})));
const portraitRegistry = Object.fromEntries(cards.flatMap((card) => {
  const matches = portraitCandidates.filter((candidate) => candidate.key === normalizeIdentity(card.name));
  if (matches.length !== 1) return [];
  const match = matches[0];
  return [[card.id, `/assets/shop/portraits/${match.sport}/${match.file}`]];
}).sort(([left], [right]) => left.localeCompare(right)));
const portraitsByName = {};
for (const candidate of portraitCandidates.sort((left, right) => left.file.localeCompare(right.file))) {
  const identityKey = `${candidate.sport}:${candidate.key}`;
  portraitsByName[identityKey] ??= `/assets/shop/portraits/${candidate.sport}/${candidate.file}`;
}
const portraitSource = `/* Generated by scripts/sync-card-game-snapshots.mjs. */\nexport const cardGamePortraitAssets: Readonly<Record<string, string>> = ${JSON.stringify(portraitRegistry, null, 2)};\n\nconst cardGamePortraitsByName: Readonly<Record<string, string>> = ${JSON.stringify(portraitsByName, null, 2)};\nconst portraitKey = (value: string) => value.toLocaleLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "");\nexport function cardGamePortraitFor(sport: string, name: string): string | undefined { return cardGamePortraitsByName[\`${"${sport}"}:\${portraitKey(name)}\`]; }\n`;
if (checkOnly) {
  assert(existsSync(runtimePortraitTarget), `Missing generated portrait registry: ${runtimePortraitTarget}`);
  assert(readFileSync(runtimePortraitTarget, "utf8") === portraitSource, "Generated portrait registry is stale");
} else {
  mkdirSync(dirname(runtimePortraitTarget), { recursive: true });
  writeFileSync(runtimePortraitTarget, portraitSource);
}

const historySource = readFileSync(join(appRoot, "src", "mocks", "profile", "history.ts"), "utf8");
const demoIds = [...historySource.matchAll(/\["(demo-[^"]+)"/g)].map((match) => match[1]);
assert(demoIds.length === 28 && new Set(demoIds).size === 28, "Demo history must contain 28 unique September 3-9 records");
assert(historySource.includes("filter((record) => !record.isDemo)"), "Achievement history must exclude demo records");

const f1TrackStyles = readFileSync(join(appRoot, "src", "features", "matches", "components", "f1-track-map-screen.module.css"), "utf8");
assert(f1TrackStyles.includes("top: 82.7396%") && f1TrackStyles.includes("left: 78.04375%"), "Italian GP start/finish marker changed");

console.log(`${checkOnly ? "Verified" : "Synced"} ${snapshots.length} snapshots, ${palettes.length} source palettes, ${runtimePalettes.length} runtime identities, and ${Object.keys(portraitRegistry).length} exact portraits.`);
