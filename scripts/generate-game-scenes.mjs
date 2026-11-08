// Compatibility entry point. See artwork:sync and artwork:check.
import './sync-game-discovery.mjs';
import { generate, writeOrCheck } from './sync-game-discovery.mjs';
import path from 'node:path';
const {files}=generate(path.resolve('scripts/game-discovery-source'),null,process.cwd());
writeOrCheck(files,process.argv.includes('--check'));
console.log('Generated filled game scenes from the shared discovery family.');
