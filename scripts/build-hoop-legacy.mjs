import {engineExternals,engineModulePrelude} from './build-game-engine.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const directory = path.resolve('src/features/games/hoop-legacy/source');
export async function verifyHoopLegacySource() {
  const source = JSON.parse(await fs.readFile(path.join(directory, 'SOURCE.json'), 'utf8'));
  for (const [file, expected] of Object.entries(source.files)) {
    const bytes = await fs.readFile(path.join(directory, file));
    const allowed = source.localOverrides?.[file]?.sha256 ?? expected;
    if (createHash('sha256').update(bytes).digest('hex') !== allowed) throw Error('Hoop Legacy source changed: ' + file);
  }
  return source;
}

/** Keep the supplied React/Three runtime and fonts isolated from the host. */
export async function buildHoopLegacy({prelude}) {
  await verifyHoopLegacySource();
  const fonts = (await fs.readFile(path.join(directory, 'src/main.tsx'), 'utf8'))
    .split('\n').filter(line => line.startsWith("import '@fontsource/" )).join('\n');
  const result = await build({
    stdin: {contents: fonts + '\nimport "./statoz/entry.tsx";', resolveDir: directory, loader: 'tsx'},
    bundle: true, write: false, outdir: 'bundle', format: 'esm', external: engineExternals, platform: 'browser',
    target: 'es2022', jsx: 'automatic', minify: true,
    tsconfig: path.join(directory, 'tsconfig.json'),
    define: {'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false',
      'import.meta.env.BASE_URL': '"./assets/"'},
    loader: {'.woff2': 'dataurl', '.woff': 'dataurl'},
    plugins: [hoopLegacyPlugin()],
  });
  const cssPath = path.join(directory, 'src/index.css');
  const css = await postcss([tailwind({base: directory, optimize: true})])
    .process(await fs.readFile(cssPath, 'utf8'), {from: cssPath});
  const fontCss = result.outputFiles.find(file => file.path.endsWith('.css'))?.text || '';
  const js = result.outputFiles.find(file => file.path.endsWith('.js')).text.replaceAll('</script', '<\\/script');
  const output = path.resolve('public/embedded-games/hoop-legacy/assets');
  await fs.mkdir(output, {recursive: true});
  await fs.cp(path.join(directory, 'public'), output, {recursive: true});
  const authoredSource=path.resolve('public/games/hoop-legacy/athletes'),authoredOutput=path.join(output,'athletes-v2');
  await fs.cp(authoredSource,authoredOutput,{recursive:true});
  // Remove only stale generated files from this game's dedicated asset mirror.
  const pruneMirror=async (relative='')=>{
    for(const entry of await fs.readdir(path.join(authoredOutput,relative),{withFileTypes:true})) {
      if(entry.isSymbolicLink())throw Error('Linked athlete output');
      const next=path.join(relative,entry.name);
      if(entry.isDirectory())await pruneMirror(next);
      else if(!await fs.stat(path.join(authoredSource,next)).catch(()=>null))await fs.unlink(path.join(authoredOutput,next));
    }
  };
  await pruneMirror();
  const notices = [];
  notices.push(await fs.readFile(path.resolve('public/games/hoop-legacy/athletes/LICENSES.txt'),'utf8'));
  for (const file of ['NOTICE.md', 'public/athletes/LICENSES.md', 'node_modules/three/LICENSE',
    'node_modules/react/LICENSE', 'node_modules/react-dom/LICENSE', 'node_modules/lucide-react/LICENSE',
    'node_modules/@fontsource/barlow/LICENSE', 'node_modules/@fontsource/barlow-condensed/LICENSE']) {
    notices.push(file + '\n\n' + await fs.readFile(path.join(directory, file), 'utf8'));
  }
  await fs.writeFile(path.resolve('public/embedded-games/hoop-legacy/LICENSES.txt'), notices.join('\n\n---\n\n'));
  return `<!doctype html><html lang="en" data-game="hoop-legacy"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Hoop Legacy</title><style>${fontCss}\n${css.css}\nhtml,body,#root{margin:0;width:100%;height:100%;overflow:hidden}.host-return{position:fixed;z-index:110;top:max(env(safe-area-inset-top),10px);right:max(env(safe-area-inset-right),12px);border:1px solid #ffffff40;border-radius:999px;background:#05070bd9;color:white;padding:10px 16px;font:600 14px Barlow,sans-serif}.host-return:focus-visible{outline:2px solid #ff5b14;outline-offset:3px}</style></head><body><div id="root"></div>${prelude}${await engineModulePrelude(['core','audio'])}<script type="module">${js}</script></body></html>`;
}

export function hoopLegacyPlugin() { return {name: 'hoop-legacy-host-lifecycle', setup(builder) {
      builder.onLoad({filter: /[/\\]world[/\\]Character\.ts$/}, async ({path: file}) => {
        const authored=path.join(directory,'statoz/athletes/character.ts').replaceAll('\\','/');
        const contents=await fs.readFile(file,'utf8');
        return {contents:`import {constructAuthored} from ${JSON.stringify(authored)};\n`+contents.replace('  constructor(look: CharacterLook) {','  constructor(look: CharacterLook) {\n    const authored = constructAuthored(look); if (authored) return authored as unknown as Character;'),loader:'ts'};
      });
      builder.onLoad({filter: /[/\\]sim[/\\]Showcase\.ts$/},async({path:file})=>({
        contents:(await fs.readFile(file,'utf8')).replace('    this.athlete = a','    void a.char.setDetail?.("hero")\n    this.athlete = a'),loader:'ts',
      }));
      builder.onLoad({filter: /[/\\]sim[/\\]Match\.ts$/},async({path:file})=>({
        contents:(await fs.readFile(file,'utf8'))
          .replace('    this.director.lineupPlayer(a)','    for (const player of this.athletes) void player.char.setDetail?.(player === a ? "hero" : "game")\n    this.director.lineupPlayer(a)')
          .replace('    this.replayScorer = p.scorer','    for (const player of this.athletes) void player.char.setDetail?.(player === p.scorer ? "hero" : "game")\n    this.replayScorer = p.scorer')
          .replace('    this.replayScorer = null','    for (const player of this.athletes) void player.char.setDetail?.("game")\n    this.replayScorer = null')
          .replace('    this.gameOverAt = this.elapsed','    const featured = [...this.athletes].sort((a,b) => b.stats.pts-a.stats.pts)[0]\n    for (const player of this.athletes) void player.char.setDetail?.(player === featured ? "hero" : "game")\n    this.gameOverAt = this.elapsed')
          .replace('    this.phase = p','    if (!["intro","replay","over"].includes(p)) for (const player of this.athletes) void player.char.setDetail?.("game")\n    this.phase = p'),loader:'ts',
      }));
      builder.onLoad({filter: /[/\\]engine[/\\]Engine\.ts$/}, async ({path: file}) => {
        let contents = await fs.readFile(file, 'utf8');
        contents=`import {authoredStats} from ${JSON.stringify(path.join(directory,'statoz/athletes/assets.ts').replaceAll('\\','/'))};\n`+contents;
        contents=`import {syncAuthoredQuality} from ${JSON.stringify(path.join(directory,'statoz/athletes/character.ts').replaceAll('\\','/'))};\n`+contents;
        // Separate host suspension from the game's own pause state and pause menu.
        contents = contents.replace('  paused = false', '  hostPaused = false\n  paused = false')
          .replace('    this.input.update()', '    if (!this.hostPaused) this.input.update()')
          .replace('    if (!this.paused) {', '    if (!this.paused && !this.hostPaused) {')
          .replaceAll('    setCharacterQuality(level)','    setCharacterQuality(level)\n    syncAuthoredQuality(level)')
          .replace('    prewarmCharacterAssets()','    if (!authoredStats.ready) prewarmCharacterAssets()');
        return {contents, loader: 'ts'};
      });
      builder.onLoad({filter: /[/\\]src[/\\]App\.tsx$/}, async ({path: file}) => ({
        contents: `import {preloadAthletes} from ${JSON.stringify(path.join(directory,'statoz/athletes/assets.ts').replaceAll('\\','/'))};\n`+(await fs.readFile(file, 'utf8'))
          .replace('void Promise.race([fonts, timeout]).then(() => {','void Promise.race([fonts, timeout]).then(async () => {\n      if (cancelled) return;\n      await preloadAthletes();')
          .replace('        console.error(err)',
          '        window.__STATOZ_HOST__?.emit("error", {message: "Hoop Legacy could not start WebGL"})\n        console.error(err)'),
        loader: 'tsx',
      }));
    }}; }
