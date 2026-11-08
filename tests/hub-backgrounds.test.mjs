import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateHubBackgrounds,writeOrCheck} from '../scripts/sync-hub-backgrounds.mjs';
import {scenes} from '../scripts/hub-background-source/artwork.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('all six worlds ship self-contained portrait/wide artwork with identical Flutter copies',()=>{
  const flutterRoot=path.join(os.tmpdir(),'statoz-hub-parity');
  const {files,data}=generateHubBackgrounds(root,flutterRoot);
  assert.deepEqual(Object.keys(data.themes).sort(),['basketball','cricket','football','motorsport','tennis','trending']);
  const scenes=new Set();
  for(const theme of Object.keys(data.themes))for(const [format,[width,height]]of Object.entries(data.formats)){
    const webFile=path.join(root,`public/assets/backgrounds/hub/${theme}-${format}.svg`);
    const nativeFile=path.join(flutterRoot,`assets/backgrounds/hub/${theme}-${format}.svg`);
    const svg=files.get(webFile);
    assert.equal(fs.readFileSync(webFile,'utf8'),svg,'committed artwork must match the source');
    assert.equal(files.get(nativeFile),svg,'both platforms receive the exact same scene');
    assert.match(svg,new RegExp(`viewBox="0 0 ${width} ${height}"`));
    assert.doesNotMatch(svg,/<script|<image|<text|foreignObject|href=|var\(/i);
    assert.doesNotMatch(svg,/\b(?:ACCENT|SURFACE|BASE|EDGE|M_[A-Z_]+)\b/);
    assert(svg.length<60000,'keep worlds inexpensive to preload');
    scenes.add(svg);
  }
  assert.equal(scenes.size,12,'every world and aspect has its own composition');
  writeOrCheck(generateHubBackgrounds(root).files,true);
});

test('football goal feet sit on the end line and racing car follows the road',()=>{
  const football=scenes.football();
  const coords=(svg,attribute)=>{
    const d=svg.match(new RegExp(`<path ${attribute}="true" d="([^"]+)"`))?.[1];
    assert(d,`missing geometry anchor: ${attribute}`);
    const values=d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    return Array.from({length:values.length/2},(_,i)=>values.slice(i*2,i*2+2));
  };
  const boundary=coords(football,'data-pitch-boundary'),mouth=coords(football,'data-goal-mouth');
  const [a,b]=boundary.slice(1,3),direction=[b[0]-a[0],b[1]-a[1]];
  for(const foot of [mouth[0],mouth.at(-1)]){
    const relative=[foot[0]-a[0],foot[1]-a[1]];
    const distance=Math.abs(direction[0]*relative[1]-direction[1]*relative[0])/Math.hypot(...direction);
    assert(distance<.03,'goal posts must touch the actual projected end line');
    const position=(relative[0]*direction[0]+relative[1]*direction[1])/(direction[0]**2+direction[1]**2);
    assert(position>0&&position<1,'goal must stay within the end line');
  }
  const racing=scenes.motorsport(),road=coords(racing,'data-road-edges');
  const matrix=racing.match(/data-racing-car="true" transform="matrix\(([^)]+)\)/)[1].split(' ').map(Number);
  const [xx,xy,yx,yy,tx,ty]=matrix;
  const forward=[-yx,-yy],tangent=[road[1][0]-road[0][0],road[1][1]-road[0][1]];
  const cross=Math.abs(forward[0]*tangent[1]-forward[1]*tangent[0])/Math.hypot(...tangent);
  assert(cross/Math.hypot(...forward)<.006,'car longitudinal axis must follow the road');
  assert(forward[0]*tangent[0]+forward[1]*tangent[1]>0,'car must face along the road');
  const transverse=[road[2][0]-road[0][0],road[2][1]-road[0][1]];
  assert(Math.abs(xx*transverse[1]-xy*transverse[0])/(Math.hypot(xx,xy)*Math.hypot(...transverse))<.006,'car width must use the road perspective');
  const determinant=tangent[0]*transverse[1]-tangent[1]*transverse[0];
  const tyres=[...racing.matchAll(/<path d="M(-?\d+),(-?\d+) h48 v83 h-48 Z" fill="M_RUBBER"/g)];
  assert.equal(tyres.length,4);
  for(const [,x,y]of tyres)for(const [dx,dy]of [[0,0],[48,0],[48,83],[0,83]]){
    const px=xx*(+x+dx)+yx*(+y+dy)+tx-road[0][0],py=xy*(+x+dx)+yy*(+y+dy)+ty-road[0][1];
    const u=(px*transverse[1]-py*transverse[0])/determinant,v=(tangent[0]*py-tangent[1]*px)/determinant;
    assert(u>.02&&u<.98&&v>.02&&v<.98,'all tyre contact corners must stay inside the asphalt');
  }
});

test('stale output fails without overwriting it; regeneration repairs it',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hub-background-check-'));
  try{
    const file=path.join(dir,'world.svg'),files=new Map([[file,'new artwork']]);
    fs.writeFileSync(file,'outdated artwork');
    assert.throws(()=>writeOrCheck(files,true),/Stale hub backgrounds/);
    assert.equal(fs.readFileSync(file,'utf8'),'outdated artwork');
    writeOrCheck(files,false);
    assert.doesNotThrow(()=>writeOrCheck(files,true));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
