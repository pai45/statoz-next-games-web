import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const before=process.argv.includes('--baseline'),dir='docs/penalty-shootout/evidence-model-v7/'+(before?'before':'after');await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const page=await browser.newPage({viewport:{width:1100,height:1000}});
if(before)await page.route('**/athlete*.glb',r=>r.fulfill({path:path.resolve('.cache/penalty-model-v7/baseline',new URL(r.request().url()).pathname.split('/').pop()),contentType:'model/gltf-binary'}));
await page.goto('http://127.0.0.1:3157/');await page.waitForFunction(()=>document.body.dataset.ready==='yes',null,{timeout:60000});
for(const [label,z] of [['glove-palm',.43],['glove-back',-.43]]){
 await page.evaluate(z=>{window.review.reset(3,'keeping');window.review.render();const s=window.review.scene,center=s.keeper.bones.get('hand_L').getWorldPosition(s.camera.position.clone());s.camera.position.set(center.x+.18,center.y+.08,center.z+z);s.camera.fov=31;s.camera.lookAt(center);s.camera.updateProjectionMatrix();s.renderer.render(s.scene,s.camera);},z);
 await page.screenshot({path:dir+'/'+label+'.png'});
}
for(const [label,angle] of [['jersey-quarter',.65],['jersey-side',1.45]]){
 await page.evaluate(angle=>{window.review.reset(1);window.review.view('shooter','body',angle);},angle);await page.screenshot({path:dir+'/'+label+'.png'});
}
console.log('Equipment detail captures saved');await page.goto('about:blank');await browser.close();
