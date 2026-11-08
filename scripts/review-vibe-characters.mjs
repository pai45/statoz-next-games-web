import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=process.cwd(),out=path.join(root,'test-results/vibe-basketball/characters-v2');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:900,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3142/embedded-games/vibe-basketball/index.html?mode=three-point&lite=1');
 await page.waitForFunction(()=>window.__game?.mode==='three-point'&&document.getElementById('loading').classList.contains('done'));
 await page.waitForTimeout(600);
 const profiles=await page.evaluate(()=>window.__game.localPlayers.map(p=>p.rig.group.userData.characterDesign));
 await page.screenshot({path:path.join(out,'contest-lineup.png')});
 await page.addStyleTag({content:'#hud,#vibe-toolbar,#vibe-touch,#vibe-pause{display:none!important}'});
 for(let index=0;index<4;index++){
  await page.evaluate(index=>{
   const g=window.__game,p=g.localPlayers[index],c=g.cameraRig.camera;g.cameraRig.update=()=>{};
   c.position.set(p.pos.x,1.69,p.pos.z+1.05);c.lookAt(p.pos.x,1.70,p.pos.z);c.fov=32;c.updateProjectionMatrix();
   window.advanceTime(100);
  },index);
  await page.screenshot({path:path.join(out,profiles[index].name.toLowerCase()+'-face.png')});
  await page.evaluate(index=>{const g=window.__game,p=g.localPlayers[index],c=g.cameraRig.camera;c.position.set(p.pos.x,1.38,p.pos.z+3.1);c.lookAt(p.pos.x,.95,p.pos.z);c.fov=38;c.updateProjectionMatrix();window.advanceTime(100);},index);
  await page.screenshot({path:path.join(out,profiles[index].name.toLowerCase()+'-full.png')});
 }
 await page.goto('http://127.0.0.1:3142/embedded-games/vibe-basketball/index.html?mode=1v1&lite=1&cam=5');
 await page.waitForFunction(()=>window.__game?.players?.length===2);
 await page.waitForTimeout(650);
 await page.locator('[data-command=pause]').click();
 if(await page.locator('#vibe-pause a').count())throw Error('Credits link remains visible');
 await page.screenshot({path:path.join(out,'pause.png')});
 await page.locator('[data-command=resume]').click();
 await page.addStyleTag({content:'#hud,#vibe-toolbar,#vibe-touch,#vibe-pause{display:none!important}'});
 await page.evaluate(()=>{const g=window.__game,p=g.players[1],c=g.cameraRig.camera;g.cameraRig.update=()=>{};p.pos.set(0,0,7);p.facing=0;g.update=()=>{};p.rig.group.position.set(0,0,7);p.rig.group.rotation.y=0;p.rig.resetPose();p.rig.armature.updateMatrixWorld(true);c.position.set(0,1.69,8.05);c.lookAt(0,1.70,7);c.fov=32;c.updateProjectionMatrix();window.advanceTime(100);});
 await page.screenshot({path:path.join(out,'reyes-face.png')});
 if(errors.length)throw Error(errors.join('\n'));
 await fs.writeFile(path.join(out,'review.json'),JSON.stringify({profiles,errors,creditsLinkRemoved:true},null,2));
 console.log('Character close-ups and full-body captures saved; no runtime errors.');
}finally{await browser.close();}
