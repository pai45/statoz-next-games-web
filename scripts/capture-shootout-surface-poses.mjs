import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const dir='docs/penalty-shootout/evidence-model-v6/poses';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1100,height:1000}});await page.goto('http://127.0.0.1:3156/');await page.waitForFunction(()=>document.body.dataset.ready==='yes',null,{timeout:60000});
for(const style of ['driven','placed','chip']){
 await page.evaluate(style=>{window.review.reset(1);window.review.step(1,{shoot:true,style});window.review.step(50,{shoot:true,style});window.review.step(1,{style});},style);
 let tick=0;for(const [label,time] of [['plant',108],['contact',120],['follow-through',138]]){
 await page.evaluate(({delta})=>{window.review.step(delta);window.review.view('shooter','body',1.2);},{delta:time-tick});tick=time;
 await page.screenshot({path:`${dir}/${style}-${label}.png`});
 }
}
await page.evaluate(()=>{window.review.reset(3,'keeping');window.review.step(1,{dive:{x:1,y:0}});});
let tick=0;for(const [label,time] of [['push-off',12],['extension',48],['late-dive',96],['recovery',230]]){
 await page.evaluate(delta=>{window.review.step(delta);window.review.view('keeper','body',.6);const scene=window.review.scene,center=scene.keeper.bones.get('hips').getWorldPosition(scene.camera.position.clone());center.y=Math.max(.65,center.y);scene.camera.position.set(center.x+3.4,center.y+1.1,center.z+3.4);scene.camera.lookAt(center);scene.renderer.render(scene.scene,scene.camera);},time-tick);tick=time;
 await page.screenshot({path:`${dir}/keeper-${label}.png`});
}
console.log('Thirteen shot/keeper pose captures saved');await page.goto('about:blank');await browser.close();
