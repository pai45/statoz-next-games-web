import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
let prepared;
export const engineExternals = ['@statoz/game-engine', '@statoz/game-engine/core', '@statoz/game-engine/audio', '@statoz/game-engine/input', '@statoz/game-engine/render-2d', '@statoz/game-engine/render-3d'];
const moduleNames = { '@statoz/game-engine': 'core', '@statoz/game-engine/core': 'core', '@statoz/game-engine/audio': 'audio', '@statoz/game-engine/input': 'input', '@statoz/game-engine/render-2d': 'render2d', '@statoz/game-engine/render-3d': 'render3d' };
export function prepareEngineRuntime() {
  return prepared ??= (async () => {
    const output = path.join(root, 'public/game-runtime');
    const result = await build({ absWorkingDir: root, entryPoints: { core: 'packages/game-engine/core/index.ts', audio: 'packages/game-engine/core/audio.ts', input: 'packages/game-engine/core/input.ts', render2d: 'packages/game-engine/render-2d/index.ts', render3d: 'packages/game-engine/render-3d/index.ts' }, outdir: output, entryNames: '[name]-[hash]', chunkNames: 'chunks/[name]-[hash]', bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, sourcemap: false, write: false, metafile: true, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'warning' });
    const files = new Map();
    for (const file of result.outputFiles) {
      if (!file.path.startsWith(output + path.sep)) throw Error('Engine output escaped its directory');
      await fs.mkdir(path.dirname(file.path), { recursive: true }); await fs.writeFile(file.path, file.contents);
      const key = path.relative(root, file.path).replaceAll('\\', '/');
      files.set(key, { url: '/' + path.relative(path.join(root, 'public'), file.path).replaceAll('\\', '/'), hash: createHash('sha256').update(file.contents).digest('hex'), bytes: file.contents.length, gzipBytes: gzipSync(file.contents).length, brotliBytes: brotliCompressSync(file.contents, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length });
    }
    const entries = {};
    for (const [name, source] of Object.entries({ core: 'core/index.ts', audio: 'core/audio.ts', input: 'core/input.ts', render2d: 'render-2d/index.ts', render3d: 'render-3d/index.ts' })) {
      const entry = Object.entries(result.metafile.outputs).find(([, info]) => info.entryPoint?.replaceAll('\\', '/').endsWith('/' + source));
      if (!entry) throw Error('Missing engine module: ' + name);
      const seen = new Set();
      const visit = file => { if (seen.has(file)) return; seen.add(file); for (const dependency of result.metafile.outputs[file]?.imports ?? []) if (!dependency.external) visit(dependency.path); };
      visit(entry[0]); entries[name] = { url: files.get(entry[0]).url, files: [...seen].map(file => files.get(file)).filter(Boolean) };
    }
    const require = createRequire(path.join(root, 'packages/game-engine/package.json'));
    const notices = [];
    for (const name of ['three','pixi.js','@dimforge/rapier2d-compat','@dimforge/rapier3d-compat']) {
      let directory = path.dirname(require.resolve(name)), license;
      for (let i=0;i<4;i++) { license = await fs.readFile(path.join(directory, 'LICENSE'), 'utf8').catch(error => { if (error.code==='ENOENT') return null; throw error; }); if (license) break; directory=path.dirname(directory); }
      if (!license) throw Error('Missing runtime license: '+name);
      notices.push(name + '\n\n' + license);
    }
    const license = Buffer.from(notices.join('\n\n---\n\n'));
    const hash = createHash('sha256').update(license).digest('hex'), name = `LICENSES-${hash.slice(0,16)}.txt`;
    await fs.writeFile(path.join(output, name), license);
    const notice = {url:'/game-runtime/'+name, hash, bytes:license.length, gzipBytes:gzipSync(license).length, brotliBytes:brotliCompressSync(license).length};
    for (const entry of Object.values(entries)) entry.files.push(notice);
    const manifest = { schemaVersion: 1, engineApiVersion: 1, entries };
    await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n'); return manifest;
  })();
}
export async function engineModulePrelude(modules = ['core', 'audio', 'input']) {
  const manifest = await prepareEngineRuntime(), files = [...new Map(modules.flatMap(name => manifest.entries[name].files).map(file => [file.url, file])).values()];
  const imports = Object.fromEntries(Object.entries(moduleNames).filter(([, name]) => modules.includes(name)).map(([specifier, name]) => [specifier, manifest.entries[name].url]));
  // The host asset root carries the deployment base path, including static exports.
  const install = `(()=>{const boot=window.__STATOZ_BOOT__||{},base=boot.assetRoot||((location.pathname.includes('/embedded-games/')?location.pathname.split('/embedded-games/')[0]:'')+'/games/'+document.documentElement.dataset.game+'/'),origin=boot.origin||location.origin,assetBase=new URL(base,origin+'/'),prefix=new URL('../../',assetBase).pathname,map=${JSON.stringify(imports)};for(const key in map)map[key]=prefix+map[key].slice(1);const tag=document.createElement('script');tag.type='importmap';tag.textContent=JSON.stringify({imports:map});document.currentScript.after(tag);})();`;
  return `<script type="application/json" id="statoz-engine-dependencies">${JSON.stringify({ modules, files })}</script><script>${install}</script>`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await prepareEngineRuntime();
  console.log('Shared engine: ' + Object.entries(manifest.entries).map(([name, entry]) => `${name} ${Math.round(entry.files.reduce((sum, file) => sum + file.bytes, 0) / 1024)} KiB`).join(', '));
}
