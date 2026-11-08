import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {createHash} from 'node:crypto';
const root=process.cwd(),base=path.join(root,'src/features/games/retro-football/assets'),out=path.join(root,'docs/retro-football/motion-assets'),game=path.join(root,'public/games/retro-football');
await fs.mkdir(out,{recursive:true});const manifest=JSON.parse(await fs.readFile(path.join(base,'base-manifest.json'),'utf8'));const originals=manifest.records.slice();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),atlas=await sharp(path.join(base,'base-atlas.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true}),layers=[],ledger=[];
for(const [index,name]of ['run-n-0','run-n-1','run-s-0','run-s-1'].entries()){
 const record=originals.find(r=>r.id===name),[ax,ay,w,h]=record.atlas,[gx,gy]=record.anchors.ground;
 const padded=Buffer.alloc(80*84*4),dx=36-gx,dy=74-gy;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const source=((ay+y)*atlas.info.width+ax+x)*4,dest=((y+dy)*80+x+dx)*4;atlas.data.copy(padded,dest,source,source+4);}
 const edited=Buffer.from(padded),changes=[],mask=Buffer.alloc(padded.length);
 const movable=(x,y)=>y>=48||(y>=29&&y<48&&Math.abs(x-36)>=7);
 for(let y=0;y<84;y++)for(let x=0;x<80;x++)if(movable(x,y)){const target=(y*80+x)*4,source=(y*80+(72-x))*4;if(72-x>=0&&72-x<80)padded.copy(edited,target,source,source+4);else edited.fill(0,target,target+4);}
 for(let y=0;y<84;y++)for(let x=0;x<80;x++){const offset=(y*80+x)*4,before=[...padded.subarray(offset,offset+4)],after=[...edited.subarray(offset,offset+4)];if(before.some((c,i)=>c!==after[i])){changes.push({x,y,before,after});mask.set([255,80,160,255],offset);}}
 const id=name.replace(/([01])$/,n=>String(Number(n)+2));
 const anchors=Object.fromEntries(Object.entries(record.anchors).map(([key,[x,y]])=>[key,[x+dx,y+dy]]));
 for(const [key,point]of Object.entries(anchors))if(movable(point[0],point[1]))anchors[key]=[72-point[0],point[1]];
 await sharp(padded,{raw:{width:80,height:84,channels:4}}).png().toFile(path.join(out,id+'-base.png'));
 await sharp(mask,{raw:{width:80,height:84,channels:4}}).png().toFile(path.join(out,id+'-edit-mask.png'));
 await fs.writeFile(path.join(out,id+'-edits.json'),JSON.stringify(changes));
 for(const [team,prefix]of [[0,''],[1,'orchard-']]){
  // Reuse exact existing kit palette mapping from the corresponding parent PNG.
  const data=Buffer.from(edited);
  if(team){const alternate=originals.find(r=>r.id==='orchard-'+name),[ox,oy]=alternate.atlas,palette=new Map();for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=((ay+y)*atlas.info.width+ax+x)*4,b=((oy+y)*atlas.info.width+ox+x)*4;palette.set([...atlas.data.subarray(a,a+4)].join(','),[...atlas.data.subarray(b,b+4)]);}
   for(let o=0;o<data.length;o+=4){const rgba=palette.get([...data.subarray(o,o+4)].join(','));if(rgba)data.set(rgba,o);}
  }
  const poseId=prefix+id,file=poseId+'.png',png=await sharp(data,{raw:{width:80,height:84,channels:4}}).png().toBuffer();await fs.writeFile(path.join(out,file),png);
  const x=4+(index*2+team)*88,y=1400;layers.push({input:png,left:x,top:y});manifest.records.push({id:poseId,width:80,height:84,anchors,atlas:[x,y,80,84],sourceAssetId:record.sourceAssetId,sourceSha256:digest(png),approval:'reference'});
  ledger.push({id:poseId,file,sha256:digest(png),parentPose:prefix+name,parentAtlasRegion:team?originals.find(r=>r.id==='orchard-'+name).atlas:record.atlas,anchors,method:'Native integer-grid counter-stride: preserve head/torso, exchange lower legs and outer arm clusters. Authored adaptation; no recovered native phase/timing claim.'});
 }
}
for(const facing of ['N','S'])manifest.movement.cycles[facing]=[0,1,2,3].map(i=>({id:'run-'+facing.toLowerCase()+'-'+i,mirror:false}));
manifest.movement.timing='Distance-based .72 world units per pose. Four authored phases; original two source poses plus counter-strides with stable head/torso. Native timing unverified.';
const registered=await fs.readFile(path.join(root,'docs/retro-football/registered-handheld-assets.json'),'utf8').then(JSON.parse).catch(()=>null);
for(const record of manifest.records.slice(originals.length)){const item=registered?.current.find(r=>r.file==='motion-assets/'+record.id+'.png'&&r.sha256===record.sourceSha256);if(item){record.parentSourceAssetId=record.sourceAssetId;record.sourceAssetId=item.assetId;}}
const packed=await sharp(path.join(base,'base-atlas.png')).composite(layers).png().toBuffer();manifest.atlasSha256=digest(packed);manifest.version='football-handheld-atlas-v1';manifest.parents['handheld-motion']='docs/retro-football/motion-assets/manifest.json';await fs.writeFile(path.join(game,'team-atlas.png'),packed);await fs.writeFile(path.join(game,'assets.json'),JSON.stringify(manifest,null,2));
const review=await sharp({create:{width:4*100,height:2*96,channels:4,background:'#0f172b'}}).composite(ledger.map((r,i)=>({input:path.join(out,r.file),left:Math.floor(i/2)*100,top:(i%2)*96}))).png().toBuffer();await fs.writeFile(path.join(out,'native-review.png'),review);
await sharp(review).resize(800,384,{kernel:'nearest'}).png().toFile(path.join(out,'enlarged-review.png'));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({schemaVersion:1,records:ledger,approval:'reference',source:'Source-derived Super Sidekicks 2 family; unchanged parent pixels outside declared edit clusters',nativeTimingRecovered:false},null,2));console.log('Eight stable-head counter-strides built; 79 native atlas regions.');
