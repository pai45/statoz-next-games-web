import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWithAssets } from './build-with-assets.mjs';
import { normalizeStaticSegments } from './normalize-static-segments.mjs';

const root = process.cwd();
const env = {
  ...process.env,
  GITHUB_PAGES: 'true',
  NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH && process.env.NEXT_PUBLIC_BASE_PATH !== '/'
    ? process.env.NEXT_PUBLIC_BASE_PATH : '/statoz-games-web',
};
await buildWithAssets(env);
const outDir = join(root, 'out');
if (existsSync(outDir)) {
  const result = await normalizeStaticSegments(outDir);
  console.log(`Static segment aliases: ${result.copied} added, ${result.segments} inspected.`);
  writeFileSync(join(outDir, '.nojekyll'), '');
}
