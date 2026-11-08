import fs from 'node:fs/promises';
import {digest} from './common.mjs';
import {unpack} from './transfer.mjs';
const [archive,directory]=process.argv.slice(2),sha=process.env.EXPECTED_SHA256;if(!/^[a-f0-9]{64}$/.test(sha||'')||digest(await fs.readFile(archive))!==sha)throw Error('Accepted archive hash mismatch');const header=await unpack(archive,directory,{maxBytes:800*1024*1024});const m=header.metadata;if(m.sourceCommit!==process.env.EXPECTED_COMMIT||m.requestId!==process.env.EXPECTED_REQUEST||m.repository!==process.env.GITHUB_REPOSITORY||!m.validation?.passed||m.validation.source!==m.sourceCommit)throw Error('Release source or validation identity mismatch');console.log('Verified '+header.files.length+' exact accepted files; no build performed in Actions.');
