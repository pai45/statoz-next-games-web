import {execFileSync} from 'node:child_process';

// The maintained local editions. Original acquisition inputs remain unchanged.
for(const game of ['stick-cricket','archery-test','tennis-bits','soccer-real','f1-racing']){
  execFileSync(process.execPath,['scripts/build-game-bundles.mjs','--game='+game],{stdio:'inherit'});
}
