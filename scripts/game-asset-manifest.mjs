import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runtime = /\.(?:avif|webp|png|jpe?g|svg|gif|woff2?|ttf|otf|mp3|ogg|wav|m4a|mp4|webm|glb|gltf|ktx2|bin|wasm|data|bundle|br|gz|zip|7z|xml|js|css|html|json)$/i;
const gameRuntime = /\.(?:html|js|css|json|wasm|data|bundle|br|gz|zip|7z|png|webp|jpe?g|svg|gif|xml|bin|glb|gltf|ktx2|woff2?|ttf|mp3|ogg|wav|webm|m4a)$/i;
// Runtime ownership is explicit. Self-contained embedded games do not also
// download their loose authoring assets. Cross-game/shared dependencies belong
// here, never in a wildcard that pulls the entire public tree into startup.
const packConfig = {
  'hoop-legacy': { embedded: true },
  'holdover': { embedded: true },
  'cricketer': { embedded: true },
  'yorker': { embedded: true },
  'penalty-cup': { embedded: true },
  'open-golf': { embedded: true, exportName: 'OpenGolf' },
  'pitch-rush': { embedded: true },
  'f1-racing': { embedded: true, prefixes: ['games/f1-racing/kenney/'] },
  'portfolio-formula': { embedded: true },
  'longbow': { embedded: true },
  'rim-rush': { embedded: true },
  'vibe-basketball': { embedded: true, exportName: 'VibeBasketball' },
  'pitch-duel': { exportName: 'PitchDuel', prefixes: ['games/pitch-duel/audio/', 'assets/games/pitch-duel/'], footballPortraits: true },
  'football-chess': { exportName: 'FootballChess' },
  'grand-prix-dash': { exportName: 'RallyDash' },
};

export async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    if (entry.isSymbolicLink()) throw Error('Linked asset: ' + entry.name);
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  }));
  return files.flat().sort();
}

const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
const normalizeBasePath = value => value.replace(/\/$/, '');
const withBasePath = (basePath, value) => basePath + (value.startsWith('/') ? value : '/' + value);

// Portraits load on demand. Pre-download only other referenced shop assets
// (including template paths), excluding alternate unused originals.
export function referencedShopFiles(source, files) {
  const selected = new Set();
  for (const match of source.matchAll(/\/assets\/shop\/[^"'`\r\n<>]+/g)) {
    const pattern = match[0].replace(/\$\{[^}]+\}/g, '*').split('?')[0];
    const expression = new RegExp('^' + pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$');
    for (const file of files) if (!file.startsWith('assets/shop/portraits/') && runtime.test(file) && !file.split('/').some(part => part.startsWith('.')) && expression.test('/' + file)) selected.add(file);
  }
  return selected;
}

async function registryGames(root) {
  const result = await build({
    stdin: { contents: `import { gameRegistry, gameForHref, playableGameHrefs } from './src/mocks/games/game-registry';
      export default Object.entries(gameRegistry).filter(([id, entry]) => gameForHref(entry.href)?.game === id)
        .map(([id, entry]) => ({id, href: entry.href, hrefs: playableGameHrefs().filter(href => gameForHref(href)?.game === id)}));`, resolveDir: root, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'esm', tsconfig: path.join(root, 'tsconfig.json'),
  });
  return (await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))).default;
}

function isCatalogAsset(file) {
  return file.startsWith('assets/games/covers/') || file.startsWith('assets/games/home/') ||
    file.startsWith('assets/games/identity/') || file.startsWith('assets/games/discovery/') ||
    /^assets\/games\/[^/]+\.(?:avif|webp|png|jpe?g|svg|gif)$/i.test(file);
}

function includeGamePublicFile(file) {
  if (!gameRuntime.test(file) || file.endsWith('assets-manifest.json')) return false;
  if (/^games\/[^/]+\/(?:dissection|originals|reference|source|previews?)(?:\/|\.)/i.test(file)) return false;
  if (/(?:^|\/)(?:CREDITS|NOTICE|LICENSE|PROVENANCE)(?:\.[^/]+)?$/i.test(file)) return false;
  return true;
}

function includeCorePublicFile(file) {
  if (file === 'favicon.ico' || file === 'offline-game.html') return true;
  if (isCatalogAsset(file)) return runtime.test(file);
  return /^(?:assets\/icons|assets\/avatars|assets\/sports)\//.test(file) && runtime.test(file);
}

function staticReferences(html, basePath) {
  const prefix = `${basePath}/_next/static/`;
  const results = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"?#]+)(?:[?#][^"]*)?"/g)) {
    const url = match[1];
    const start = url.indexOf(prefix);
    if (start >= 0) results.add(decodeURIComponent(url.slice(start + basePath.length + '/_next/'.length)));
  }
  return results;
}

async function readClientManifest(root) {
  const file = path.join(root, '.next/server/app/(fullscreen)/play/[...slug]/page_client-reference-manifest.js');
  const source = await fs.readFile(file, 'utf8');
  const assignment = source.lastIndexOf(' = ');
  if (assignment < 0) throw Error('Invalid play client-reference manifest');
  return JSON.parse(source.slice(assignment + 3).replace(/;\s*$/, ''));
}

async function gameClientChunks(root, exportName, clientManifest) {
  if (!exportName) return [];
  const loadable = JSON.parse(await fs.readFile(path.join(root, '.next/server/app/(fullscreen)/play/[...slug]/page/react-loadable-manifest.json'), 'utf8'));
  const launcher = Object.entries(clientManifest.clientModules).find(([name]) => name.replaceAll('\\', '/').endsWith('/src/features/games/components/game-launcher.tsx'))?.[1];
  if (!launcher) throw Error('Missing GameLauncher client reference');
  const expression = new RegExp('\\.then\\(\\w+=>\\w+\\.' + exportName + '\\),\\{loadableGenerated:\\{modules:\\[(\\d+)\\]');
  for (const chunk of launcher.chunks) {
    const relative = chunk.split('/_next/')[1];
    if (!relative?.startsWith('static/')) throw Error('Invalid Next client chunk path: ' + chunk);
    const text = await fs.readFile(path.join(root, '.next', relative), 'utf8');
    const match = expression.exec(text);
    if (match && loadable[match[1]]?.files?.length) return loadable[match[1]].files;
  }
  throw Error('Missing dynamic game chunk closure: ' + exportName);
}

async function routeSource(root, exportDir, href) {
  const slug = href.replace(/^\//, '');
  if (!slug) return path.join(exportDir ?? path.join(root, '.next/server/app'), 'index.html');
  const candidates = exportDir
    ? [path.join(exportDir, slug, 'index.html'), path.join(exportDir, slug + '.html')]
    : [path.join(root, '.next/server/app', slug + '.html'), path.join(root, '.next/server/app', slug, 'index.html')];
  for (const candidate of candidates) if (await fs.stat(candidate).catch(() => null)) return candidate;
  throw Error('Missing prerendered route: ' + href);
}

function manifestFor(packId, buildId, basePath, entryUrl, files, extra = {}) {
  const records = [...files.values()].sort((a, b) => a.url.localeCompare(b.url));
  return {
    schemaVersion: 2,
    packId,
    buildId,
    revision: hash(JSON.stringify(records)),
    basePath,
    entryUrl,
    totalBytes: records.reduce((sum, file) => sum + file.bytes, 0),
    files: records,
    ...extra,
  };
}

export async function generateAssetManifest({ root, buildId, basePath = '', exportDir }) {
  basePath = normalizeBasePath(basePath);
  if (basePath && !/^\/[\w/-]+$/.test(basePath)) throw Error('Invalid asset base path');
  const publicRoot = path.join(root, 'public');
  const removedGames = JSON.parse(await fs.readFile(path.join(root, 'src/domain/removed-games.json'), 'utf8'));
  const games = await registryGames(root);
  if (!games.length) throw Error('No enabled games found for device packs');
  for (const game of games) if (!packConfig[game.id]) throw Error('No offline pack ownership declared for game: ' + game.id);

  const publicFiles = (await walk(publicRoot)).map(file => path.relative(publicRoot, file).split(path.sep).join('/'));
  const portraitSources = await Promise.all(['portrait-assets.generated.ts', 'portrait-assets.card-game.generated.ts'].map(file => fs.readFile(path.join(root, 'src/features/packs/data', file), 'utf8')));
  const footballPortraits = new Set(portraitSources.flatMap(source => [...source.matchAll(/"\/assets\/shop\/portraits\/football\/([^"]+)"/g)].map(match => 'assets/shop/portraits/football/' + match[1])));
  for (const game of games) {
    for (const prefix of packConfig[game.id].prefixes ?? []) if (!publicFiles.some(file => file.startsWith(prefix))) throw Error('Missing game runtime directory: ' + prefix);
    if (packConfig[game.id].footballPortraits) for (const file of footballPortraits) if (!publicFiles.includes(file)) throw Error('Missing shared football portrait: ' + file);
  }
  const coreFiles = new Map();
  const gameFiles = new Map(games.map(game => [game.id, new Map()]));
  const recordCache = new Map();

  const record = async (file, url) => {
    const key = `${file}\0${url}`;
    if (!recordCache.has(key)) {
      const bytes = await fs.readFile(file);
      recordCache.set(key, { url, hash: hash(bytes), bytes: bytes.length });
    }
    return recordCache.get(key);
  };
  const add = async (collection, file, url) => {
    const item = await record(file, url);
    collection.set(item.url, item);
  };
  const addPublic = (collection, file) => add(collection, path.join(publicRoot, file), withBasePath(basePath, '/' + encodePath(file)));
  const addStatic = (collection, file) => add(collection, path.join(root, '.next', file), withBasePath(basePath, '/_next/' + encodePath(file)));

  for (const file of publicFiles) {
    if (file.startsWith('_game-assets/')) continue;
    if (removedGames.some(id => file.startsWith(`assets/games/${id}/`) || [`assets/games/${id}.`, `assets/games/covers/${id}.`, `assets/games/identity/${id}.`].some(prefix => file.startsWith(prefix)))) continue;
    if (includeCorePublicFile(file)) await addPublic(coreFiles, file);
    for (const game of games) {
      const config = packConfig[game.id];
      const owns = config.embedded && file.startsWith(`embedded-games/${game.id}/`) ||
        config.prefixes?.some(prefix => file.startsWith(prefix)) || config.footballPortraits && footballPortraits.has(file);
      if (owns && includeGamePublicFile(file)) await addPublic(gameFiles.get(game.id), file);
    }
  }

  const rootRoute = await routeSource(root, exportDir, '/');
  const rootHtml = await fs.readFile(rootRoute, 'utf8');
  await add(coreFiles, rootRoute, withBasePath(basePath, '/'));
  for (const file of staticReferences(rootHtml, basePath)) await addStatic(coreFiles, file);

  const clientManifest = await readClientManifest(root);
  for (const game of games) {
    const collection = gameFiles.get(game.id);
    if (packConfig[game.id].embedded) {
      const catalogFile = path.join(publicRoot, 'games', game.id, 'engine-assets/catalog.json');
      const catalog = await fs.readFile(catalogFile, 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (catalog) {
        await addPublic(collection, `games/${game.id}/engine-assets/catalog.json`);
        for (const asset of catalog.assets) {
          if (!asset.url.startsWith(`/games/${game.id}/`) || asset.url.includes('..')) throw Error('Asset catalog escapes its game');
          if (asset.url.startsWith(`/games/${game.id}/engine-assets/`)) await addPublic(collection, asset.url.slice(1));
          if (asset.metadata?.atlasUrl) await addPublic(collection, asset.metadata.atlasUrl.slice(1));
        }
      }
      const entry = await fs.readFile(path.join(publicRoot, 'embedded-games', game.id, 'index.html'), 'utf8').catch(error => { if (error.code === 'ENOENT') throw Error('Missing built game: ' + game.id); throw error; });
      const dependencies = entry.match(/<script type="application\/json" id="statoz-engine-dependencies">([^<]+)<\/script>/);
      if (dependencies) for (const file of JSON.parse(dependencies[1]).files) {
        if (!/^\/game-runtime\/[a-zA-Z0-9_./-]+\.(?:js|txt)$/.test(file.url) || file.url.includes('..')) throw Error('Invalid engine dependency');
        await addPublic(collection, file.url.slice(1));
      }
    }
    if (packConfig[game.id].embedded && !collection.has(withBasePath(basePath, `/embedded-games/${game.id}/index.html`))) throw Error('Missing built game: ' + game.id);
    for (const href of game.hrefs) {
      const route = await routeSource(root, exportDir, href);
      const html = await fs.readFile(route, 'utf8');
      await add(collection, route, withBasePath(basePath, href));
      for (const file of staticReferences(html, basePath)) await addStatic(collection, file);
    }
    for (const file of await gameClientChunks(root, packConfig[game.id].exportName, clientManifest)) await addStatic(collection, file);
    if (!collection.size) throw Error('Empty game asset pack: ' + game.id);
  }

  // CSS carries local font/image URLs that are not necessarily preloaded by the route.
  for (const files of [coreFiles, ...gameFiles.values()]) {
    for (const file of files.values()) if (file.url.includes('/_next/static/') && file.url.endsWith('.css')) {
      const css = await fs.readFile(path.join(root, '.next/static', file.url.split('/_next/static/')[1]), 'utf8');
      for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        if (/^(?:data:|https?:|#)/.test(match[1])) continue;
        const url = new URL(match[1], 'https://assets.invalid' + file.url).pathname;
        if (!url.startsWith(basePath + '/_next/static/')) continue;
        await addStatic(files, 'static/' + url.split('/_next/static/')[1]);
      }
    }
  }

  const core = manifestFor('core', buildId, basePath, withBasePath(basePath, '/'), coreFiles);
  const manifests = new Map();
  for (const game of games) manifests.set(game.id, manifestFor(
    `game:${game.id}`,
    buildId,
    basePath,
    withBasePath(basePath, game.href),
    gameFiles.get(game.id),
    { gameId: game.id, entryUrls: game.hrefs.map(href => withBasePath(basePath, href)) },
  ));

  const index = {
    schemaVersion: 2,
    buildId,
    basePath,
    core: { packId: core.packId, revision: core.revision, totalBytes: core.totalBytes, entryUrl: core.entryUrl, manifestUrl: withBasePath(basePath, `/_game-assets/${buildId}/core.json`) },
    games: Object.fromEntries(games.map(game => {
      const manifest = manifests.get(game.id);
      return [game.id, { packId: manifest.packId, revision: manifest.revision, totalBytes: manifest.totalBytes, entryUrl: manifest.entryUrl, manifestUrl: withBasePath(basePath, `/_game-assets/${buildId}/games/${game.id}.json`) }];
    })),
  };

  const destinations = [publicRoot, ...(exportDir ? [exportDir] : [])];
  for (const destination of destinations) {
    const directory = path.join(destination, '_game-assets', buildId);
    await fs.mkdir(path.join(directory, 'games'), { recursive: true });
    await fs.writeFile(path.join(directory, 'core.json'), JSON.stringify(core));
    for (const [id, manifest] of manifests) await fs.writeFile(path.join(directory, 'games', `${id}.json`), JSON.stringify(manifest));
    await fs.writeFile(path.join(directory, 'index.json'), JSON.stringify(index));
  }

  const gameBytes = [...manifests.values()].reduce((sum, manifest) => sum + manifest.totalBytes, 0);
  console.log(`Device core: ${core.files.length} files, ${(core.totalBytes / 1048576).toFixed(1)} MiB`);
  console.log(`Device games: ${manifests.size} packs, ${(gameBytes / 1048576).toFixed(1)} MiB before shared-file deduplication`);
  return { index, core, games: manifests };
}
