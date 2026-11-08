import {engineExternals,engineModulePrelude} from './build-game-engine.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

/** Keep the supplied game's CSS and runtime isolated from the host product. */
export async function buildHoldover({ prelude }) {
  const directory = path.resolve('src/features/games/holdover/source');
  const result = await build({
    entryPoints: [path.join(directory, 'src/main.tsx')], bundle: true, write: false,
    format: 'esm', external: engineExternals, platform: 'browser', target: 'es2022', jsx: 'automatic', minify: true,
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false' },
    tsconfig: path.join(directory, 'tsconfig.json'), logLevel: 'warning', loader: { '.css': 'empty' },
  });
  const cssPath = path.join(directory, 'src/index.css');
  let css = await fs.readFile(cssPath, 'utf8');
  for (const match of [...css.matchAll(/url\(['"]?(\.\/fonts\/[^'")]+)['"]?\)/g)]) {
    const bytes = await fs.readFile(path.resolve(directory, 'src', match[1]));
    const mime = match[1].endsWith('.ttf') ? 'font/ttf' : 'font/woff2';
    css = css.replace(match[0], `url(data:${mime};base64,${bytes.toString('base64')})`);
  }
  const compiled = await postcss([tailwind({ base: directory, optimize: true })]).process(css, { from: cssPath });
  const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
  return `<!doctype html><html lang="en" data-game="holdover"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Holdover</title><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}*{box-sizing:border-box}button{touch-action:manipulation}${compiled.css}</style></head><body><div id="root"></div>${prelude}${await engineModulePrelude(['core','audio'])}<script type="module">${js}</script></body></html>`;
}
