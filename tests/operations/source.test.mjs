import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const m=JSON.parse(await fs.readFile(new URL('../../module.json',import.meta.url),'utf8')),r=JSON.parse(await fs.readFile(new URL('../../release.config.json',import.meta.url),'utf8')),p=JSON.parse(await fs.readFile(new URL('../../package.json',import.meta.url),'utf8'));
test('release destination is a distinct new repository',()=>{assert.match(m.repository,/^pai45\/statoz-next-/);assert.equal(r.repository,m.repository);assert.equal(r.branch,'main');});
test('only this module starts and root installs are not required',()=>{assert.equal(p.scripts.dev,'node scripts/statoz.mjs dev');assert.ok(m.port>=4400&&m.port<=4409);assert.equal(p.workspaces,undefined);});
test('production publication requires an accepted artifact',async()=>{const workflow=await fs.readFile(new URL('../../.github/workflows/release.yml',import.meta.url),'utf8');assert.ok(workflow.includes('verify-artifact.mjs'));assert.ok(!workflow.includes('npm run build'));assert.ok(!workflow.includes('on: [push]'));});
