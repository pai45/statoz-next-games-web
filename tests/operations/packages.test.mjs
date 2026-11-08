import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const root=new URL('../../',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('packages.lock.json',root),'utf8')),lock=JSON.parse(await fs.readFile(new URL('package-lock.json',root),'utf8'));
for(const pkg of manifest.packages)test('pinned package bytes: '+pkg.name,async()=>{const bytes=await fs.readFile(new URL(pkg.file,root));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),pkg.sha256);assert.equal(lock.packages['node_modules/'+pkg.name].version,pkg.version);if(pkg.integrity)assert.equal('sha512-'+crypto.createHash('sha512').update(bytes).digest('base64'),pkg.integrity);});
