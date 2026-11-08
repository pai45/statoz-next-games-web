/** Bounded local reference observation. No native assets or gameplay state are modified. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createCricketerServer} from '../scripts/preview-cricketer.mjs';
const out=path.resolve('test-results/cricketer-reference');await fs.mkdir(out,{recursive:true});
const server=createCricketerServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11']});
const context=await browser.newContext({viewport:{width:960,height:540},hasTouch:true});const page=await context.newPage();const errors=[],samples=[],inputs=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/games/stick-cricket/unity/index.html?session=${randomUUID()}&scope=cccccccccccccccccccccccc`);
 await page.waitForFunction(()=>window.__stickCricketDebug?.ready,null,{timeout:100000});
 // Unity instance readiness precedes Addressables scene readiness. Wait for the visible Start button.
 let lesson=false;for(let attempt=0;attempt<90;attempt++){const png=await page.screenshot();const pixels=await sharp(png).extract({left:425,top:290,width:110,height:6}).removeAlpha().raw().toBuffer();let red=0;for(let i=0;i<pixels.length;i+=3)if(pixels[i]>110&&pixels[i]>pixels[i+1]*1.8&&pixels[i]>pixels[i+2]*1.8)red++;if(red>350){lesson=true;break;}await page.waitForTimeout(350);}if(!lesson)throw Error('Native lesson Start button was not observed');await page.screenshot({path:path.join(out,'native-lesson-ready.png')});
 await page.touchscreen.tap(480,275);await page.waitForTimeout(1200);await page.locator('canvas').focus();
 for(let trial=0;trial<2;trial++){
  const key=trial?'ArrowRight':'ArrowLeft',before=await page.evaluate(()=>({time:performance.now(),frames:window.__stickCricketDebug.frames}));
  await page.keyboard.press(key,{delay:70});inputs.push({key,...before});
  for(let i=0;i<9;i++){const state=await page.evaluate(()=>({time:performance.now(),frames:window.__stickCricketDebug.frames}));const file=`native-motion-trial-${trial}-${String(i).padStart(2,'0')}.png`;await page.screenshot({path:path.join(out,file)});samples.push({file,trial,...state,secondsAfterInput:(state.time-before.time)/1000});await page.waitForTimeout(75);}
  await page.waitForTimeout(1300);
 }
 await fs.copyFile(path.join(out,'observation.json'),path.join(out,'startup-only-observation.json')).catch(()=>{});
 await fs.writeFile(path.join(out,'observation.json'),JSON.stringify({source:'Installed local Stick Cricket Chase Unity 2.3.5 reference',lessonStartVisuallyObserved:lesson,inputs,samples,errors,limitations:['Samples are timestamped screenshots, not consecutive native frames.','This bounds visible input/motion cadence, not exact hit windows, C# logic, ball contact or native scoring formulas.','An earlier startup-only sample is preserved separately; it did not establish batting cadence.','Cricketer uses original authored tuning; these screenshots are not bundled into the game.']},null,2));console.log(JSON.stringify({samples:samples.length,inputs:inputs.length,errors}));
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
