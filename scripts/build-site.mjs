import {fixStaticPrefetch} from './fix-static-prefetch.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {unpack} from '@statoz/release-core/transfer';
import {digest,gh} from '@statoz/release-core/common';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{stdio:'inherit',env:{...process.env,GITHUB_PAGES:'true',NEXT_PUBLIC_BASE_PATH:'/statoz-next-games-web',NEXT_PUBLIC_GAME_CATALOGUE_URL:'https://pai45.github.io/statoz-next-games-web/game-library/catalogue.json',NEXT_TELEMETRY_DISABLED:'1'}});if(result.status)process.exit(result.status);
const config=JSON.parse(await fs.readFile('release.config.json','utf8')),library=config.gameLibrary;
if(library?.releaseTag&&library?.sha256){await fs.mkdir('.cache/accepted-library',{recursive:true});gh('pai45/statoz-next-games',['release','download',library.releaseTag,'--pattern','accepted.statozpack','--dir','.cache/accepted-library','--clobber']);const archive='.cache/accepted-library/accepted.statozpack';if(digest(await fs.readFile(archive))!==library.sha256)throw Error('Pinned Games library bytes changed');await unpack(archive,path.resolve('out/game-library'));}else console.log('Game catalogue not yet pinned. Host shell build succeeds; playable delivery acceptance remains pending.');

console.log('Created '+await fixStaticPrefetch('out')+' static segment URL aliases.');
