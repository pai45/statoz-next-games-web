// Copies a Final Third production build into vendor/final-third and records its file hashes.
// One-way import; nothing is written back to the source project.
//
//   (in the final-third project)  npm run build
//   node scripts/import-final-third.mjs <path-to-final-third>
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const source = path.resolve(process.argv[2] ?? '../final-third');
const root = process.cwd();
const target = path.join(root, 'vendor/final-third');
const dist = path.join(source, 'dist');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, {withFileTypes: true})) {
    if (e.isSymbolicLink()) throw Error('Linked file in Final Third build: ' + e.name);
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

await fs.access(path.join(dist, 'index.html')).catch(() => { throw Error('No build at ' + dist + '. Run npm run build in Final Third first.'); });
await fs.rm(target, {recursive: true, force: true});
await fs.mkdir(path.join(target, 'dist'), {recursive: true});
const files = {};
for (const file of await walk(dist)) {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  const bytes = await fs.readFile(file);
  await fs.mkdir(path.dirname(path.join(target, 'dist', rel)), {recursive: true});
  await fs.writeFile(path.join(target, 'dist', rel), bytes);
  files['dist/' + rel] = hash(bytes);
}
for (const [from, to] of [['ASSETS.md', 'ASSETS.md'], ['src/fonts/OFL.txt', 'OFL-barlow-condensed.txt']]) {
  const bytes = await fs.readFile(path.join(source, from));
  await fs.writeFile(path.join(target, to), bytes);
  files[to] = hash(bytes);
}
const pkg = JSON.parse(await fs.readFile(path.join(source, 'package.json'), 'utf8'));
await fs.writeFile(path.join(target, 'SOURCE.json'), JSON.stringify({
  project: 'final-third', version: pkg.version, importedAt: new Date().toISOString(), files,
}, null, 2) + '\n');
console.log(`Imported Final Third ${pkg.version}: ${Object.keys(files).length} files`);
