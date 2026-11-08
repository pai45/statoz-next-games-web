import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const appRoot = process.cwd();
const flutterRoot = join(appRoot, "..", "flutter_projects", "card_game");
const sourceAssets = join(flutterRoot, "assets");
const targetAssets = join(appRoot, "public", "assets", "shop");

if (!existsSync(sourceAssets)) {
  throw new Error(`Flutter assets were not found at ${sourceAssets}`);
}

const portraitFolders = {
  football: "player_images",
  cricket: "cricketer_images",
  basketball: "basketball_player_images",
  tennis: "tennis_player_images",
  motorsport: "racing_driver_images",
};

mkdirSync(targetAssets, { recursive: true });
for (const [sport, folder] of Object.entries(portraitFolders)) {
  cpSync(join(sourceAssets, folder), join(targetAssets, "portraits", sport), {
    recursive: true,
    force: true,
  });
}
cpSync(join(sourceAssets, "coins"), join(targetAssets, "coins"), { recursive: true, force: true });
cpSync(join(sourceAssets, "packs"), join(targetAssets, "packs"), { recursive: true, force: true });

const backgroundTarget = join(targetAssets, "banners");
mkdirSync(backgroundTarget, { recursive: true });
for (const file of readdirSync(join(sourceAssets, "backgrounds"))) {
  if (file.startsWith("shop_banner_") || file.startsWith("profile_banner_")) {
    cpSync(join(sourceAssets, "backgrounds", file), join(backgroundTarget, file), { force: true });
  }
}

const catalogFiles = {
  football: "football-cards.ts",
  cricket: "cricket-cards.ts",
  basketball: "basketball-cards.ts",
  tennis: "tennis-cards.ts",
  motorsport: "racing-cards.ts",
};
const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const entries = [];

for (const [sport, catalogFile] of Object.entries(catalogFiles)) {
  const source = readFileSync(join(appRoot, "src", "features", "packs", "data", catalogFile), "utf8");
  const files = readdirSync(join(sourceAssets, portraitFolders[sport]))
    .filter((file) => /\.(png|webp|jpe?g)$/i.test(file))
    .map((file) => ({ file, key: normalize(basename(file, extname(file))) }));
  const cards = [...source.matchAll(/\{ id: "([^"]+)", name: "([^"]+)", shortName: "([^"]+)"/g)];
  for (const [, id, name, shortName] of cards) {
    const keys = [normalize(name), normalize(shortName), normalize(id.replace(/^(cricket|basketball|tennis|racing)-/, ""))];
    const match = files.find(({ key }) => keys.includes(key)) ?? files.find(({ key }) => keys.some((candidate) => candidate.length > 5 && (key.includes(candidate) || candidate.includes(key))));
    if (match) entries.push([id, `/assets/shop/portraits/${sport}/${match.file}`]);
  }
}

const output = `/* Generated from the Flutter asset catalog by scripts/sync-shop-assets.mjs. */\nexport const portraitAssets: Readonly<Record<string, string>> = ${JSON.stringify(Object.fromEntries(entries), null, 2)};\n`;
writeFileSync(join(appRoot, "src", "features", "packs", "data", "portrait-assets.generated.ts"), output);

const leaguesSource = readFileSync(join(flutterRoot, "lib", "data", "followable_leagues.dart"), "utf8");
const frames = [];
let cursor = 0;
while ((cursor = leaguesSource.indexOf("FollowableLeague(", cursor)) >= 0) {
  let depth = 0;
  const open = leaguesSource.indexOf("(", cursor);
  let end = open;
  for (; end < leaguesSource.length; end += 1) {
    if (leaguesSource[end] === "(") depth += 1;
    if (leaguesSource[end] === ")") depth -= 1;
    if (depth === 0 && end > cursor) break;
  }
  const block = leaguesSource.slice(cursor, end + 1);
  const sport = block.match(/sport: Sport\.(\w+)/)?.[1];
  const leagueId = block.match(/league: League\([\s\S]*?id: '([^']+)'/)?.[1];
  if (sport && leagueId) {
    for (const match of block.matchAll(/SportTeam\([\s\S]*?id: '([^']+)'[\s\S]*?name: '([^']+)'[\s\S]*?shortName: '([^']+)'[\s\S]*?color: Color\(0x(ff[0-9a-fA-F]{6})\)[\s\S]*?\)/g)) {
      const [, teamId, label, shortLabel, color] = match;
      frames.push({ id: `frame_${teamId}`, teamId, label, shortLabel, leagueId, sport, color: `#${color.slice(2)}`, price: 150 });
    }
  }
  cursor = end + 1;
}
const shopDataTarget = join(appRoot, "src", "mocks", "shop");
mkdirSync(shopDataTarget, { recursive: true });
writeFileSync(
  join(shopDataTarget, "frames.generated.ts"),
  `/* Generated from Flutter followable_leagues.dart by scripts/sync-shop-assets.mjs. */\nexport const shopFrames = ${JSON.stringify(frames, null, 2)} as const;\n`,
);
console.log(`Copied shop artwork, matched ${entries.length} card portraits, and ported ${frames.length} frames.`);
