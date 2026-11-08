import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root = process.cwd();
const cache = path.join(root, '.cache/hoop-legacy-athletes');
const spec = JSON.parse(await fs.readFile('tools/hoop-legacy-athletes/sources.json', 'utf8'));
const lock = JSON.parse(await fs.readFile('tools/hoop-legacy-athletes/sources.lock.json', 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function download(url, target, expected) {
  const old = await fs.readFile(target).catch(() => null);
  if (old && hash(old) === expected) return;
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(120000)});
      if (!response.ok) throw Error(`HTTP ${response.status}: ${url}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (hash(bytes) !== expected) throw Error('Pinned checksum mismatch: ' + url);
      await fs.mkdir(path.dirname(target), {recursive: true});
      await fs.writeFile(target, bytes);
      return;
    } catch (value) {error = value;}
  }
  throw error;
}
if (process.argv.includes('--system')) {
  const item = lock.items.systemAssets;
  const url = spec.systemAssets.url.replace('http:', 'https:');
  console.log('Fetching pinned CC0 system asset archive');
  await download(url, path.join(cache, 'system-assets.zip'), item.sha256);
} else {
  const item = lock.items.makehuman;
  const entries = Object.entries(item.files);
  let next = 0, completed = 0;
  const base = `https://raw.githubusercontent.com/${spec.makehuman.repo}/${spec.makehuman.commit}`;
  await Promise.all(Array.from({length: 8}, async () => {
    while (next < entries.length) {
      const [file, expected] = entries[next++];
      const location = file.startsWith('LICENSE') ? file : spec.makehuman.root + '/' + file;
      await download(base + '/' + location, path.join(cache, 'makehuman', file), expected);
      if (++completed % 50 === 0) console.log(`Verified ${completed}/${entries.length} MakeHuman inputs`);
    }
  }));
  console.log(`Verified all ${completed} pinned CC0 data files`);
}
