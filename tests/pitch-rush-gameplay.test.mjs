import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {GAMEPLAY_RATE,adaptSimulation,adaptKicks} from '../src/features/games/pitch-rush/gameplay.mjs';
const root=process.cwd();
const built=await build({stdin:{contents:`export {humanIntent} from './src/features/games/pitch-rush/source/src/game/sim.js';export {kickBall} from './src/features/games/pitch-rush/source/src/game/kick.js';export {createMatch} from './src/features/games/pitch-rush/source/src/game/state.js';export {BTN,CHARGE_MAX} from './src/features/games/pitch-rush/source/src/constants.js';`,resolveDir:root},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'actual-gameplay-adaptation',setup(b){
  b.onLoad({filter:/[\\/]game[\\/]sim\.js$/},async args=>({contents:adaptSimulation(await fs.readFile(args.path,'utf8'))+'\nexport {humanIntent};',loader:'js'}));
  b.onLoad({filter:/[\\/]game[\\/]kick\.js$/},async args=>({contents:adaptKicks(await fs.readFile(args.path,'utf8')),loader:'js'}));
}}]});
const {humanIntent,kickBall,createMatch,BTN,CHARGE_MAX}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function setup(){
  const s=createMatch({humans:[true,false]}),p=s.teams[0].players[9];
  s.phase='play';s.teams[0].controlled=9;s.teams[0].prevMask=0;
  Object.assign(p,{x:400,y:700,dirX:Math.SQRT1_2,dirY:-Math.SQRT1_2,vx:90,vy:60,charging:false,charge:0});
  s.ball.owner={team:0,idx:9};return {s,p};
}
test('pace is 25 percent slower without changing fixed simulation tick size',async()=>{
  assert.equal(GAMEPLAY_RATE,.75);
  assert.match(await fs.readFile('scripts/build-pitch-rush.mjs','utf8'),/game\.acc \+= elapsed \* \$\{GAMEPLAY_RATE\}/);
});
for(const charge of [3,CHARGE_MAX+30])for(const [label,mask,x,y] of [['up',BTN.UP,0,-1],['down',BTN.DOWN,0,1],['left',BTN.LEFT,-1,0],['right',BTN.RIGHT,1,0],['diagonal',BTN.UP|BTN.RIGHT,Math.SQRT1_2,-Math.SQRT1_2]]){
  test(`${charge===3?'pass':'shot'} follows selected ${label} direction exactly on release`,()=>{
    const {s,p}=setup();
    humanIntent(s,0,9,BTN.FIRE|BTN.UP);s.teams[0].prevMask=BTN.FIRE|BTN.UP;
    let intent;
    for(let i=0;i<charge;i++)intent=humanIntent(s,0,9,BTN.FIRE|mask);
    assert.equal(intent.kick,null,'Holding at maximum power must wait for release');
    assert.ok(p.charge<=CHARGE_MAX);
    // Returning the stick to centre retains the last chosen aim.
    const kick=humanIntent(s,0,9,0).kick;assert.ok(kick);
    assert.ok(Math.abs(kick.dx-x)<1e-10);assert.ok(Math.abs(kick.dy-y)<1e-10);
    kickBall(s,0,9,kick.dx,kick.dy,kick.power,kick.lift);
    const length=Math.hypot(s.ball.vx,s.ball.vy);
    assert.ok(Math.abs(s.ball.vx/length-x)<1e-10,'Movement momentum must not change horizontal aim');
    assert.ok(Math.abs(s.ball.vy/length-y)<1e-10,'Movement momentum must not change vertical aim');
  });
}
test('direction may change on the actual release tick; no teammate snapping',()=>{
  const {s}=setup();humanIntent(s,0,9,BTN.FIRE|BTN.UP);
  s.teams[0].players[8].x=580;s.teams[0].players[8].y=720;
  const kick=humanIntent(s,0,9,BTN.RIGHT).kick;
  assert.equal(kick.dx,1);assert.equal(kick.dy,0);
});
test('losing possession cancels charge without kicking',()=>{
  const {s,p}=setup();humanIntent(s,0,9,BTN.FIRE|BTN.UP);s.ball.owner=null;
  assert.equal(humanIntent(s,0,9,0).kick,null);assert.equal(p.charging,false);
});
