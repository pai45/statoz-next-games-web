import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH?pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href:'playwright');
const out=path.resolve('test-results',process.argv[2]||'retro-hoops-team-ai-v1'),checks=[],errors=[];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1080}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.HOOPS_TEAM_REVIEW_URL||'http://127.0.0.1:8935/');
 await page.waitForFunction(()=>window.fidelityReview?.loaded);
 for(const team of ['0','1'])for(const scenario of ['support','loose','shot']){
  await page.locator('#team').selectOption(team);
  await page.locator('#scenario').selectOption(scenario);
  await page.locator('#auto').check();
  await page.locator('#reset').click();
  const trace=[];
  for(let i=0;i<8;i++){
   await page.evaluate(()=>fidelityReview.advance(15));
   const sample=await page.evaluate(()=>fidelityReview.sample());
   assert.ok(sample.actors.every(a=>Number.isFinite(a.x+a.y+a.z)));
   trace.push(sample);
   await page.screenshot({path:path.join(out,`${scenario}-${team}-${i}.png`),fullPage:true});
  }
  assert.ok(trace.some(s=>s.actors.some(a=>a.id!==0&&a.moving)), 'non-selected movement');
  checks.push({team,scenario,passed:true,ticks:120});
  await fs.writeFile(path.join(out,`${scenario}-${team}-trace.json`),JSON.stringify(trace,null,2));
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'browser-checks.json'),JSON.stringify({checks,errors,physicalDevice:false},null,2));
 console.log(JSON.stringify({checks:checks.length,errors}));
}finally{await browser.close();}
