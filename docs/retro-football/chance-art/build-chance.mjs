import {drawCharacter} from './draw-character.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),game=path.resolve(here,'../public');await fs.mkdir(here,{recursive:true});
const phases=[
 {id:'entry',lean:-8,arm:[[65,101],[89,114],[109,106]],plant:[[52,146],[44,177],[34,202],[49,208]],leg:[[66,146],[88,177],[91,210],[108,216]]},
 {id:'entry-alt',lean:-3,arm:[[65,101],[85,117],[105,111]],plant:[[52,146],[65,175],[79,208],[93,216]],leg:[[66,146],[54,167],[48,192],[62,197]]},
 {id:'ready',lean:0,arm:[[65,101],[84,115],[99,107]],leg:[[66,146],[87,177],[95,208],[110,211]]},
 {id:'windup',lean:-5,arm:[[65,101],[92,96],[110,87]],leg:[[66,146],[45,163],[23,183],[12,184]]},
 {id:'plant',lean:3,arm:[[65,101],[91,114],[108,103]],leg:[[66,146],[91,166],[114,184],[124,189]]},
 {id:'contact',lean:5,arm:[[65,101],[86,118],[103,110]],leg:[[66,146],[97,174],[119,195],[128,198]]},
 {id:'follow',lean:8,arm:[[65,101],[84,120],[99,115]],leg:[[66,146],[98,145],[116,126],[129,123]]},
 {id:'recover',lean:1,arm:[[65,101],[83,124],[94,136]],leg:[[66,146],[87,170],[90,201],[106,205]]},
];
const records=[],layers=[];const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [i,phase]of phases.entries())for(const [team,prefix]of [[0,''],[1,'orchard-']]){
 const support=phase.plant?.[3]??[83,218];
 const id=prefix+'close-'+phase.id,svg=drawCharacter(phase,team),png=await sharp(Buffer.from(svg)).png().toBuffer();await fs.writeFile(path.join(here,id+'.svg'),svg);await fs.writeFile(path.join(here,id+'.png'),png);
 const index=i*2+team,x=4+(index%6)*168,y=1536+Math.floor(index/6)*232;layers.push({input:png,left:x,top:y});records.push({id,width:160,height:224,atlas:[x,y,160,224],anchors:{ground:[70,218],ballContact:[128,198],kickingFoot:phase.leg[3],plantedFoot:support},sourceSha256:hash(png),approval:'reference',authorship:'Original StatOz revised rear-three-quarter foreground anatomy; tapered shaded limbs, fabric planes and layered copper hair. Composition informed by source study; no source pixels traced/extracted.'});
}
const registered=await fs.readFile(path.join(here,'registered-assets.json'),'utf8').then(JSON.parse).catch(()=>null);for(const record of records){const found=registered?.current.find(r=>r.file==='art/'+record.id+'.png'&&r.sha256===record.sourceSha256);if(found)record.sourceAssetId=found.assetId;}
const manifest=JSON.parse(await fs.readFile(path.join(game,'assets.json'),'utf8'));manifest.records=manifest.records.filter(r=>!r.id.includes('close-'));manifest.records.push(...records);const packed=await sharp(path.join(game,'team-atlas.png')).extract({left:0,top:0,width:1024,height:1536}).extend({bottom:1536,background:{r:0,g:0,b:0,alpha:0}}).composite(layers).png().toBuffer();
manifest.atlasSize=[1024,3072];manifest.version='football-chance-atlas-v2';manifest.atlasSha256=hash(packed);await fs.writeFile(path.join(game,'team-atlas.png'),packed);await fs.writeFile(path.join(game,'assets.json'),JSON.stringify(manifest,null,2));await fs.writeFile(path.join(here,'manifest.json'),JSON.stringify({schemaVersion:1,records,phases,approval:'reference',nativeTimingRecovered:false,contact:[128,198],source:'Saved Super Sidekicks 2 CHANCE composition study; original dedicated foreground polygons and palette, no enlarged pitch sprite'},null,2));
const review=await sharp({create:{width:8*160,height:448,channels:4,background:'#284e30'}}).composite(records.map((r,i)=>({input:path.join(here,r.id+'.png'),left:Math.floor(i/2)*160,top:(i%2)*224}))).png().toBuffer();await fs.writeFile(path.join(here,'review.png'),review);console.log('Sixteen original foreground frames built,95atlasregions.');
