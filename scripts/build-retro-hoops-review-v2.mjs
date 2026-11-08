import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.resolve('test-results/retro-hoops-authored-v2');
await fs.mkdir(path.join(out,'reference'),{recursive:true});
const research='C:/Users/priya/OneDrive/Desktop/StatOz Designer/output/retro-hoops/gamelog-study-v1';
for(const range of ['0-53','53-113','113-173','173-233','233-283']){
 for(const file of ['excerpt.mp4','provenance.json','overview.png'])await fs.copyFile(path.join(research,'reference-study','_k8IIS9n3dk-'+range,file),path.join(out,'reference',range+'-'+file));
}
let html=await fs.readFile(path.join(out,'index.html'),'utf8');
html=html.replace('<h1>','<p><a href="game.html">Play handheld candidate</a> · <a href="action-review.html">Full action loops</a> · <a href="player-family.png">Authored character family</a> · <a href="fidelity-matrix.json">Evidence and gaps</a></p><h1>');
html=html.replace('<label>Reference frame',`<section><h2>Reference recording</h2><select id="sourceClip">${['0-53','53-113','113-173','173-233','233-283'].map(r=>`<option value="${r}">${r}s</option>`).join('')}</select><button id="sourceBack">Recording −1 interval</button><button id="sourceNext">Recording +1 interval</button><video id="sourceVideo" controls preload="metadata" style="display:block;max-width:640px;width:100%;image-rendering:pixelated" src="reference/0-53-excerpt.mp4"></video><p id="sourceTime"></p><p>Source seeks use the reported 59 fps stream. They do not establish native timing. The recording stays in this research tool.</p><label>Production scrub <input type="range" id="productionSeek" min="0" max="900" value="0"></label><button id="addMarker">Record paired event marker</button><pre id="eventMarkers"></pre></section><label>Reference frame`);
html=html.replace('</body>',`<script>
const video=document.querySelector('#sourceVideo'),clip=document.querySelector('#sourceClip'),markers=[];
clip.onchange=()=>{video.src='reference/'+clip.value+'-excerpt.mp4';};
document.querySelector('#sourceBack').onclick=()=>{video.pause();video.currentTime=Math.max(0,video.currentTime-1/59);};
document.querySelector('#sourceNext').onclick=()=>{video.pause();video.currentTime=Math.min(video.duration||Infinity,video.currentTime+1/59);};
video.ontimeupdate=()=>document.querySelector('#sourceTime').textContent='Decoded '+video.currentTime.toFixed(3)+'s / approximate source '+(Number(clip.value.split('-')[0])+video.currentTime).toFixed(3)+'s';
document.querySelector('#productionSeek').oninput=e=>{fidelityReview.reset();fidelityReview.advance(Number(e.target.value));};
document.querySelector('#addMarker').onclick=()=>{markers.push({clip:clip.value,decodedSourceSeconds:video.currentTime,productionTick:fidelityReview.sample().tick,label:document.querySelector('#landmark').value});document.querySelector('#eventMarkers').textContent=JSON.stringify(markers,null,2);};
</script></body>`);
if(!html.includes('const video='))html+=`<script>const v=document.querySelector('#sourceVideo'),c=document.querySelector('#sourceClip');c.onchange=()=>v.src='reference/'+c.value+'-excerpt.mp4';document.querySelector('#sourceBack').onclick=()=>{v.pause();v.currentTime=Math.max(0,v.currentTime-1/59)};document.querySelector('#sourceNext').onclick=()=>{v.pause();v.currentTime=Math.min(v.duration||Infinity,v.currentTime+1/59)};v.ontimeupdate=()=>document.querySelector('#sourceTime').textContent='Decoded '+v.currentTime.toFixed(3)+'s / approximate source '+(Number(c.value.split('-')[0])+v.currentTime).toFixed(3)+'s';const markers=[];document.querySelector('#productionSeek').oninput=e=>{fidelityReview.reset();fidelityReview.advance(Number(e.target.value))};document.querySelector('#addMarker').onclick=()=>{markers.push({clip:c.value,sourceSeconds:v.currentTime,tick:fidelityReview.sample().tick,label:document.querySelector('#landmark').value});document.querySelector('#eventMarkers').textContent=JSON.stringify(markers,null,2)};</script>`;
await fs.writeFile(path.join(out,'index.html'),html);
const specs=[
 ['movement','observed',[62,69],'Independent lanes, forward/diagonal locomotion and defensive recovery; 10 Hz samples.','approximate'],
 ['pass','observed',[68.7,69.7],'Gather ~68.77–68.84, release ~68.97–69.04, catch ~69.17–69.25; decoded recording.','approximate'],
 ['shot','observed',[37.5,38.7],'Teaching takeoff ~37.77, release ~37.97–38.11, landing ~38.58–38.65.','approximate'],
 ['dunk/restart','observed',[64.4,68.9],'Ball/rim contact, airborne follow-through, score and opposite possession.','approximate'],
 ['rebound/block','observed',[71,76],'Contested flight and next possession; contact partly occluded.','approximate'],
 ['dunk fake','documented',[148,153],'Instruction says press A during dunk to fake; exact window unknown.','approximate'],
 ['shot fake','observed',[278,283],'Instruction says press lightly; mobile second-press implementation is an explicit adaptation.','adapted'],
 ['periods','observed',[143,163],'First-half end, teaching interlude, second-half 2:00 reset.','matched structure'],
 ['results','observed',[270,278],'Win/loss and statistical score board. Original result layout and labels.','adapted'],
 ['camera/depth','observed',[62,76],'Ball-following horizontal camera and depth-dependent scaling; no native geometry recovered.','approximate'],
 ['special shot','observed',[237,253],'Full charge feedback, special attack/impact; complete native effect family not recovered.','approximate'],
 ['AI','inferred',[62,76],'Spacing, marking, rebound responsibilities; hidden decision algorithm unknown.','approximate'],
 ['native input windows','unknown',null,'No controller stream or controlled original copy.','unverified'],
 ['Steam revision parity','unknown',null,'Steam wrapper announcement is distinct from arcade recording. No verified Steam gameplay capture.','unverified'],
 ['character identity','authored',null,'Original geometry, palette maps, shading and motion; no source raster inputs.','adapted']
];
const matrix={version:2,steamApp:1189520,primaryTarget:'Steam release; revision/settings unverified',footage:'https://www.youtube.com/watch?v=_k8IIS9n3dk',cadence:'Selected stream reports 59 fps; not native timing',inspectedRanges:[[0,283]],completeMatchContinuouslyInspected:false,coverage:specs.map(([id,evidence,seconds,finding,status])=>({id,evidence,seconds,finding,status})),limits:['Original artwork needs visual approval against source; generated frame count is not parity evidence.','Later recording excerpts were inspected in coarse surveys; continuous native action timing is not verified.','Physical Android/iPhone validation unavailable; emulation is separate.','Native AI/probability/input values remain unverified.']};
await fs.writeFile(path.join(out,'fidelity-matrix.json'),JSON.stringify(matrix,null,2));
await fs.writeFile(path.join(root,'docs/retro-hoops-fidelity/fidelity-matrix-v2.json'),JSON.stringify(matrix,null,2));
const manifest=JSON.parse(await fs.readFile('public/games/retro-hoops/authored-v2/manifest.json'));
const credits={gameId:'retro-hoops',rulesVersion:'2.0.0',buildVersion:'fidelity-authored-v2-local',assetVersion:'2.0.0',art:{classification:'original authored geometry',approval:'pending visual review',source:'scripts/build-retro-hoops-authored.py',referenceMaterialInRuntime:false,historicalReferenceAssets:'Preserved separately; excluded from executable pack'},audio:{selection:'Existing original procedural synthesis; no third-party samples',provenance:'audio-provenance.json',listeningReview:'Prior user provisional approval; new full-mix review pending'},assets:manifest.atlasHashes,release:{localOnly:true,pushed:false,published:false}};
await fs.writeFile('public/games/retro-hoops/credits.json',JSON.stringify(credits,null,2));
await fs.writeFile(path.join(out,'credits.json'),JSON.stringify(credits,null,2));
const hashes={};for(const name of ['simulation.ts','game.tsx','renderer.ts','presentation.ts','off-ball.ts','reference-profile.ts','action-spec.ts'])hashes[name]=createHash('sha256').update(await fs.readFile(path.join(root,'src/features/games/retro-hoops',name))).digest('hex');
await fs.writeFile(path.join(out,'candidate-hashes.json'),JSON.stringify(hashes,null,2));
console.log(JSON.stringify({inspector:out,coverage:specs.length,originalFrames:manifest.frames.length}));
