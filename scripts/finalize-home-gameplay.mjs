import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='public/assets/games/home/gameplay';
const names=(await fs.readdir(root)).filter(file=>file.endsWith('.json')&&file!=='PROVENANCE.json').sort();
const ffmpeg=process.env.FFMPEG_PATH||execFileSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
const assets=[];
for(const name of names){
 const entry=JSON.parse(await fs.readFile(root+'/'+name,'utf8'));
 const bytes=await fs.readFile(root+'/'+entry.file);
 if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Hash mismatch '+name);
 execFileSync(ffmpeg,['-v','error','-i',root+'/'+entry.file,'-f','null','-'],{stdio:'pipe'});
 entry.sourceNotices=[];
 for(const file of [`public/games/${entry.gameId}/PROVENANCE.json`,`public/games/${entry.gameId}/provenance.json`,`public/assets/games/${entry.gameId}/PROVENANCE.json`]){
  if(await fs.stat(file).catch(()=>null))entry.sourceNotices.push('/'+file.slice(7));
 }
 assets.push(entry);
}
if(assets.length!==15)throw Error('Expected all fifteen enabled games; found '+assets.length);
await fs.writeFile(root+'/PROVENANCE.json',JSON.stringify({version:1,created:'2026-11-06',description:'Original silent recordings of the local playable games. Source artwork, code and asset notices remain with their games; original game styles are unchanged.',assets},null,2)+'\n');
await fs.writeFile(root+'/CREDITS.txt',`STATOZ GAMEPLAY PREVIEW CREDITS\n\nThese silent eight-second clips were recorded from the local games using Playwright, then resized and color graded with FFmpeg. No third-party video or music was downloaded. Original game source notices remain in the game-owned PROVENANCE.json files referenced by PROVENANCE.json in this folder.\n\nCRICKETER AND YORKER CHARACTER CREDIT\nVirat Kohli Cricket Batting Animation - Low Poly by bhagathartworks\nhttps://sketchfab.com/3d-models/virat-kohli-cricket-batting-animation-low-poly-a21f5e7ee14f4b6aa5cf6c94a1016932\nLicensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/\nGame adaptations include fictional kits, replaced materials, independently authored details and animation/rig integration; the videos show those adapted game versions, with edited framing and contrast/saturation. No athlete endorsement is implied. See /games/cricketer/PROVENANCE.json and /games/yorker/PROVENANCE.json for complete asset credits and adaptation details.\n\nOTHER GAME NOTICES\n${assets.map(asset=>asset.gameId+': '+(asset.sourceNotices.join(', ')||'Original procedural game visuals; see game documentation.')).join('\n')}\n`);
console.log(`Decoded and verified ${assets.length} clips, ${(assets.reduce((sum,a)=>sum+a.bytes,0)/1048576).toFixed(1)} MiB total.`);
