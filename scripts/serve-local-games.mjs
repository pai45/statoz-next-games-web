import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve('public');
const port = Number(process.env.LOCAL_GAMES_PORT || 5240);
const origin = `http://127.0.0.1:${port}`;
const mime = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.wasm':'application/wasm', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.glb':'model/gltf-binary', '.jpg':'image/jpeg', '.webm':'audio/webm', '.wav':'audio/wav', '.mp3':'audio/mpeg', '.woff':'font/woff' };
function inside(base, relative) {
  const file = path.resolve(base, relative);
  if (file !== base && !file.startsWith(base + path.sep)) throw Error('Outside asset root');
  return file;
}
http.createServer((req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    const pathname = decodeURIComponent(url.pathname);
    const library = /^\/games\/([a-z0-9-]+)\/dissection\/(.+)$/.exec(pathname);
    let file = library && library[2] !== 'manifest.json'
      ? inside(path.resolve('.local-game-assets', library[1]), library[2])
      : inside(root, '.' + pathname);
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const stat = fs.statSync(file);
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    const embedded = /^\/embedded-games\/([a-z0-9-]+)\/index.html$/.exec(pathname);
    if (embedded) {
      const game = embedded[1], account = url.searchParams.get('account') === 'b' ? 'b' : 'a';
      const key = `statoz.local-preview.${game}.${account}`;
      const boot = { sessionId:randomUUID(), origin, assetRoot:`/games/${game}/`, storageScope:account.repeat(24), presentation:{schemaVersion:1,layout:'onscreen',fullscreen:false}, stores:{}, resultIds:[] };
      const injection = `window.__previewStorage=window.localStorage;window.__localPreviewMessages=[];window.StatozGame={postMessage(raw){const m=JSON.parse(raw);window.__localPreviewMessages.push(m);if(m.type==='save')window.__previewStorage.setItem(${JSON.stringify(key)},JSON.stringify(m.payload));if(m.type==='exit')location.href='/local-games.html';}};window.__STATOZ_BOOT__=Object.assign(${JSON.stringify(boot)},JSON.parse(window.__previewStorage.getItem(${JSON.stringify(key)})||'{}'));`;
      res.end(fs.readFileSync(file, 'utf8').replace('/*__STATOZ_BOOT__*/', injection));
      return;
    }
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(origin));
