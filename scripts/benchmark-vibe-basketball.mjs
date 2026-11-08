import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=process.cwd(),out=path.join(root,'test-results/vibe-basketball/performance');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'public','.'+p);if(!f.startsWith(path.join(root,'public')+path.sep))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.glb':'model/gltf-binary'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.VIBE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
const report={hardware:'Headless Windows Chrome / SwiftShader; not a physical mobile GPU',runs:[]};
try{
 for(const mode of ['1v1','three-point']){
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const b=window.__frameBench={frames:[],draws:0,triangles:0,mutations:0,last:0,active:false};
   for(const Class of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
    if(!Class)continue;
    for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
     const original=Class.prototype[name];if(!original)continue;
     Class.prototype[name]=function(...args){if(b.active){b.draws++;if(args[0]===4)b.triangles+=(name.includes('Elements')?args[1]:args[2])*(name.endsWith('Instanced')?args.at(-1):1)/3;}return original.apply(this,args);};
    }
   }
   const raf=window.requestAnimationFrame.bind(window);
   window.requestAnimationFrame=callback=>raf(time=>{
    if(callback.name!=='frame'||!b.active){callback(time);return;}
    b.draws=0;b.triangles=0;const start=performance.now();callback(time);
    b.frames.push({ms:performance.now()-start,interval:b.last?time-b.last:0,draws:b.draws,triangles:b.triangles});b.last=time;
   });
   document.addEventListener('DOMContentLoaded',()=>new MutationObserver(changes=>{if(b.active)b.mutations+=changes.length;}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true}));
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/embedded-games/vibe-basketball/index.html?mode=${mode}${mode==='1v1'?'&attract=1':''}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('done'),null,{timeout:120000});
  if(mode==='three-point'){await page.locator('[data-player-count="4"]').click();await page.locator('[data-rack="top"]').click();}
  await page.waitForTimeout(1600);
  await page.evaluate(()=>{window.__frameBench.active=true;});await page.waitForTimeout(2500);
  const result=await page.evaluate(()=>{
   const b=window.__frameBench;b.active=false;const data=b.frames;
   const avg=field=>data.reduce((sum,f)=>sum+f[field],0)/Math.max(1,data.length);
   const intervals=data.slice(1).map(f=>f.interval).sort((a,b)=>a-b),canvas=document.querySelector('#app canvas');
   return {frames:data.length,averageCpuMs:avg('ms'),averageDraws:avg('draws'),averageTriangles:avg('triangles'),averageFrameInterval:intervals.reduce((a,b)=>a+b,0)/Math.max(1,intervals.length),p95Interval:intervals[Math.floor(intervals.length*.95)],mutations:b.mutations,buffer:[canvas.width,canvas.height],profile:window.__VIBE_PERFORMANCE__?.snapshot?.()};
  });
  report.runs.push({mode,...result,errors});console.log(JSON.stringify({mode,...result,errors}));
  await page.screenshot({path:path.join(out,`${process.env.VIBE_BENCH_LABEL||'after'}-${mode}.png`)});await page.close();
 }
 await fs.writeFile(path.join(out,(process.env.VIBE_BENCH_LABEL||'after')+'.json'),JSON.stringify(report,null,2));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
