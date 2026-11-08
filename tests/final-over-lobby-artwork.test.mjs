import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {animation,poster,scene,ballAt,ANCHORS,BATTER_POSITION,PITCH_CENTER,WICKETS,batterAt,bowlerAt} from '../scripts/final-over-lobby-source/artwork.mjs';
import {BATTER,BOWLER,drawCharacter} from '../scripts/final-over-lobby-source/characters.mjs';

test('pixel scene ships only offline rectangle vectors with reproducible production snapshots',async()=>{
 const art=animation();assert.equal(art.fr,30);assert.equal(art.op,360);assert.equal(art.w,192);assert.equal(art.h,256);
 assert.ok(art.assets.every(a=>a.layers&& !('p' in a)));
 assert.ok(art.layers.every(l=>l.ty===0));
 assert.doesNotMatch(JSON.stringify(art),/data:image|https?:/);
 for(const asset of art.assets)for(const group of asset.layers[0].shapes)for(const item of group.it)if(item.ty==='rc'){
  const [x,y]=item.p.k,[w,h]=item.s.k;assert.ok(Number.isInteger(x-w/2)&&Number.isInteger(y-h/2));assert.ok(Number.isInteger(w)&&Number.isInteger(h));
 }
 assert.deepEqual(JSON.parse(await readFile(new URL('../public/assets/games/lobbies/final-over.json',import.meta.url),'utf8')),art);
 assert.equal(await readFile(new URL('../public/assets/games/lobbies/final-over-poster.svg',import.meta.url),'utf8'),poster());
 assert.doesNotMatch(poster(),/<image|<filter|<linearGradient|href=/);
});
test('both character designs have enough unique complete poses and consistent bat geometry',()=>{
 for(const [kind,poses,min]of [['batter',BATTER,18],['bowler',BOWLER,24]]){
  assert.ok(new Set(poses.map((_,i)=>JSON.stringify(drawCharacter(kind,i).image.packed()))).size>=min);
 }
 for(let i=0;i<BATTER.length;i++){
  const {image,anchors}=drawCharacter('batter',i);
  for(const p of [anchors.tip,anchors.face])assert.ok(p[0]>=0&&p[1]>=0&&p[0]<image.w&&p[1]<image.h,`${BATTER[i].name} clips the bat`);
  assert.ok(Math.abs(Math.hypot(anchors.tip[0]-anchors.grip[0],anchors.tip[1]-anchors.grip[1])-43)<.001);
 }
});
test('delivery shares release/bounce/contact anchors and the complete scene closes exactly',()=>{
 assert.deepEqual(ballAt(114),ANCHORS.release);assert.deepEqual(ballAt(125),ANCHORS.bounce);assert.deepEqual(ballAt(132),ANCHORS.contact);assert.deepEqual(ballAt(181),ANCHORS.landing);
 assert.ok(ballAt(126)[1]<ballAt(125)[1],'the ball must visibly rise after bouncing');
 assert.deepEqual(ANCHORS.contact,drawCharacter('batter',batterAt(132)).anchors.face.map((v,i)=>Math.round(v+BATTER_POSITION[i])));
 assert.equal(bowlerAt(114).pose,14);
 assert.deepEqual(scene(0).cells,scene(360).cells);
 const art=animation();
 const opacityAt=(p,f)=>p.a?p.k.findLast(k=>k.t<=f).s[0]:p.k;
 for(let f=0;f<360;f++)for(const prefix of ['Batsman /','Bowler /'])assert.equal(art.layers.filter(l=>l.nm.startsWith(prefix)&&opacityAt(l.ks.o,f)===100).length,1,`${prefix} visibility at ${f}`);
});

test('wickets share the pitch centre and the batting stride plants clear of them',()=>{
 for(const wicket of WICKETS)assert.equal(wicket.x+wicket.spacing,PITCH_CENTER);
 const guard=BATTER[0],contact=BATTER[batterAt(132)];
 assert.ok(contact.nearFoot[1]<guard.nearFoot[1],'front foot steps up the pitch');
 assert.ok(contact.nearFoot[0]+BATTER_POSITION[0]+8<WICKETS[1].x,'front shoe clears the near stumps');
 assert.deepEqual(contact.farFoot,guard.farFoot,'rear toe stays planted through contact');
 for(let i=7;i<=16;i++)assert.deepEqual(BATTER[i].nearFoot,contact.nearFoot,'front foot stays planted through the shot');
});

test('compact arms keep a two-handed grip and the shot passes continuously through contact',()=>{
 const active=[6,7,8,23,9,24,10,11,12,13,14];
 for(let i=1;i<active.length;i++)assert.ok(BATTER[active[i]].bat<BATTER[active[i-1]].bat,'blade direction reverses inside the active swing');
 for(let i=0;i<BATTER.length;i++){
  const {anchors}=drawCharacter('batter',i);
  for(let arm=0;arm<2;arm++){
   for(const [a,b]of [[anchors.shoulders[arm],anchors.elbows[arm]],[anchors.elbows[arm],anchors.hands[arm]]])assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<=16,'stretched arm');
   assert.ok(Math.abs(Math.hypot(anchors.hands[arm][0]-anchors.grip[0],anchors.hands[arm][1]-anchors.grip[1])-3)<1,'hand detached from handle');
  }
 }
 for(const i of [8,23,9,24,10,11,12])assert.deepEqual(BATTER[i].head,[65,32],'head shifts through impact');
 assert.ok(BATTER[18].nearFoot[1]<BATTER[17].nearFoot[1],'recovery must lift the foot before stepping back');
});

test('distance bowler retains fixed sprite dimensions and locked support-foot anchors',()=>{
 let plantedFrames=0;
 for(let f=0;f<=360;f++){
  const b=bowlerAt(f),sprite=drawCharacter('bowler',b.pose,{distance:true});
  assert.deepEqual([sprite.image.w,sprite.image.h,b.scale],[45,52,1]);
  if(b.planted){const foot=sprite.anchors[`${b.planted.side}Foot`];assert.deepEqual(foot.map((v,i)=>v+b.pos[i]),b.planted.point);plantedFrames++;}
 }
 assert.ok(plantedFrames>100);
 const b=bowlerAt(114),hand=drawCharacter('bowler',b.pose,{distance:true}).anchors.release;
 assert.deepEqual(hand.map((v,i)=>v+b.pos[i]),ANCHORS.release);
});

test('the blade stays clear of both arms outside the shared handle grip in every pose',()=>{
 for(let i=0;i<BATTER.length;i++){
  const r=drawCharacter('batter',i,{inspect:true}),hits=[];
  for(let n=0;n<r.image.cells.length;n++)if(r.armMask.cells[n]&&r.bladeMask.cells[n]&&Math.hypot(n%r.image.w-r.anchors.grip[0],Math.floor(n/r.image.w)-r.anchors.grip[1])>11)hits.push(n);
  assert.equal(hits.length,0,`${BATTER[i].name}: blade intersects arm pixels`);
 }
});

