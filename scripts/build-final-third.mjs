// Packs the vendored Final Third build (vendor/final-third, see import-final-third.mjs)
// into one offline HTML document for the bundled-game iframe.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MIME = {'.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png'};

export async function verifyFinalThirdSource(root = process.cwd()) {
  const vendor = path.join(root, 'vendor/final-third');
  const manifest = JSON.parse(await fs.readFile(path.join(vendor, 'SOURCE.json'), 'utf8'));
  for (const [name, expected] of Object.entries(manifest.files)) {
    if (path.isAbsolute(name) || name.split(/[\\/]/).includes('..')) throw Error('Invalid Final Third path: ' + name);
    const bytes = await fs.readFile(path.join(vendor, name));
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error('Final Third vendor file changed: ' + name);
  }
  return manifest;
}

export async function buildFinalThird({prelude, root = process.cwd()}) {
  const manifest = await verifyFinalThirdSource(root);
  const dist = path.join(root, 'vendor/final-third/dist');
  let html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
  const escape = text => text.replaceAll('</script', '<\\/script');
  const dataUrl = async rel => `data:${MIME[path.extname(rel).toLowerCase()] ?? 'application/octet-stream'};base64,${(await fs.readFile(path.join(dist, rel))).toString('base64')}`;

  // Stylesheet: inline it, with its font files as data URLs.
  const cssTag = html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/);
  if (!cssTag) throw Error('Final Third stylesheet not found');
  let css = await fs.readFile(path.join(dist, cssTag[1]), 'utf8');
  for (const [match, file] of [...css.matchAll(/url\(\.\/([^)]+)\)/g)]) css = css.replace(match, `url(${await dataUrl('assets/' + file)})`);
  html = html.replace(cssTag[0], () => `<style>${css}</style>`);

  // Runtime files the game fetches: the athlete model and sounds.
  const assets = {};
  const runtimeFiles = Object.keys(manifest.files).filter(f => /^dist\/assets\/(?:athlete\.glb|audio\/.+)$/.test(f)).map(f => f.slice(5));
  if (!runtimeFiles.includes('assets/athlete.glb')) throw Error('Final Third model missing');
  for (const rel of runtimeFiles) assets[rel] = await dataUrl(rel);
  const shim = `(()=>{const assets=${JSON.stringify(assets)};const resolve=value=>{const text=String(value).split(/[?#]/)[0];if(text.startsWith('data:')||text.startsWith('blob:'))return text;const key=Object.keys(assets).find(k=>text===k||text.endsWith('/'+k));return key?assets[key]:null;};const original=fetch.bind(window);window.fetch=(value,options)=>{const request=typeof value==='string'?value:value instanceof URL?value.href:value.url;const url=resolve(request);return url?original(url,options):Promise.reject(Error('Remote resource blocked in offline game: '+String(request)));};})();`;

  // Game module: inline it after the host prelude and the asset shim.
  const jsTag = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/);
  if (!jsTag) throw Error('Final Third script not found');
  const js = await fs.readFile(path.join(dist, jsTag[1]), 'utf8');
  html = html.replace(jsTag[0], '');
  const credits = await fs.readFile(path.join(root, 'vendor/final-third/ASSETS.md'), 'utf8');
  html = html.replace('<html lang="en">', '<html lang="en" data-game="final-third">');
  html = html.replace('</body>', () => `<script type="application/json" id="final-third-credits">${escape(JSON.stringify(credits))}</script>${prelude}<script>${escape(shim)}</script><script type="module">${escape(js)}</script></body>`);
  if (!html.includes('data-game="final-third"')) throw Error('Final Third document root changed');
  return html;
}
