import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fixStaticPrefetch} from '../../scripts/fix-static-prefetch.mjs';
test('Windows static export serves the exact segment URL requested by the browser',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'statoz-static-'));try{const source=path.join(root,'how-to-play/longbow/__next.!KHBsYXRmb3JtKQ/how-to-play/$d$mode/__PAGE__.txt'),alias=path.join(root,'how-to-play/longbow/__next.!KHBsYXRmb3JtKQ.how-to-play.$d$mode.__PAGE__.txt');await fs.mkdir(path.dirname(source),{recursive:true});await fs.writeFile(source,'accepted RSC bytes');assert.equal(await fixStaticPrefetch(root),1);assert.equal(await fs.readFile(alias,'utf8'),'accepted RSC bytes');assert.equal(await fixStaticPrefetch(root),0);await fs.writeFile(alias,'unrelated bytes');await assert.rejects(()=>fixStaticPrefetch(root),/Conflicting/);}finally{await fs.rm(root,{recursive:true,force:true});}});
