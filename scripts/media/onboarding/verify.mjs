import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
let pw;
for(const candidate of ['playwright',process.env.PLAYWRIGHT_PATH,path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){
  try{pw=require(candidate);break;}catch{}
}
if(!pw)throw new Error('Install playwright or set PLAYWRIGHT_PATH.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=path.join(root,'build/onboarding/qa');
await fs.mkdir(out,{recursive:true});
const base=process.env.ONBOARDING_QA_URL||'http://127.0.0.1:3000/login';
const report=[];
const browser=await pw.chromium.launch({headless:true});
async function context(options={}){
  const ctx=await browser.newContext(options);
  const page=await ctx.newPage();
  const requests=[];
  page.on('request',r=>{if(/onboarding\/.*\.(webm|mp4)/.test(r.url()))requests.push(r.url());});
  return {ctx,page,requests};
}
async function waitPlaying(page){
  await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.readyState>=2;});
}
async function freeze(page){
  await page.locator('video').evaluate(v=>new Promise(resolve=>{
    v.pause();v.addEventListener('seeked',resolve,{once:true});v.currentTime=146/30;
  }));
}
async function visiblePoster(page){
  return page.locator('picture img').evaluate(el=>el.complete&&el.naturalWidth>0);
}
try{
  for(const [width,height] of [[1280,720],[1440,900],[360,800],[390,844],[430,932]]){
    const {ctx,page,requests}=await context({viewport:{width,height}});
    try{
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base);await waitPlaying(page);
      const mode=width<1024?'mobile':'desktop';
      assert(requests.length>0);assert(requests.every(u=>u.includes(`/${mode}.`)),`Wrong video fetched at ${width}`);
      const info=await page.locator('video').evaluate(v=>({src:v.currentSrc,w:v.videoWidth,h:v.videoHeight,duration:v.duration,muted:v.muted,loop:v.loop,inline:v.playsInline}));
      assert.equal(info.w,mode==='mobile'?900:1080);assert.equal(info.h,mode==='mobile'?720:1200);
      assert(Math.abs(info.duration-6)<.1);assert(info.muted&&info.loop&&info.inline);
      const geometry=await page.evaluate(()=>{
        const v=document.querySelector('video').parentElement.getBoundingClientRect();
        const f=document.querySelector('input[type=email]').getBoundingClientRect();
        return {video:{x:v.x,y:v.y,w:v.width,h:v.height,right:v.right,bottom:v.bottom},form:{x:f.x,y:f.y},overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert(!geometry.overflow);
      if(mode==='mobile'){
        assert(Math.abs(geometry.video.w/geometry.video.h-1.25)<.01);
        assert(geometry.form.y>=geometry.video.bottom);
      }else assert(geometry.form.x>=geometry.video.right);
      await page.getByRole('button',{name:'Pause onboarding animation'}).click();
      assert(await page.locator('video').evaluate(v=>v.paused));
      await page.getByRole('button',{name:'Play onboarding animation'}).focus();
      await page.keyboard.press('Enter');await waitPlaying(page);
      await freeze(page);await page.screenshot({path:path.join(out,`${width}.png`),fullPage:true});
      assert.deepEqual(errors,[]);
      report.push({test:`viewport ${width}x${height}`,status:'passed',...info,requests,geometry});
      console.log(`PASS viewport ${width}x${height}`);
    }finally{await ctx.close();}
  }
  {
    const {ctx,page,requests}=await context({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await page.goto(base);await page.getByRole('button',{name:'Play onboarding animation'}).waitFor();
    assert.equal(await page.locator('video').count(),0);assert.equal(requests.length,0);assert(await visiblePoster(page));
    await page.screenshot({path:path.join(out,'reduced-motion.png'),fullPage:true});
    await page.getByRole('button',{name:'Play onboarding animation'}).click();await waitPlaying(page);
    const previousVideo=await page.locator('video').elementHandle();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(previous=>document.querySelector('video')!==previous,previousVideo);
    await previousVideo.dispose();await waitPlaying(page);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('video'));
    report.push({test:'Reduced motion: poster only, explicit play, live preference updates',status:'passed'});console.log('PASS reduced motion');await ctx.close();
  }
  {
    const {ctx,page}=await context({viewport:{width:390,height:844}});
    await page.goto(base);await waitPlaying(page);
    await page.setViewportSize({width:1280,height:720});
    await page.waitForFunction(()=>document.querySelector('video')?.currentSrc.includes('/desktop.'));await waitPlaying(page);
    assert.equal(await page.locator('video').count(),1);
    await page.setViewportSize({width:430,height:932});
    await page.waitForFunction(()=>document.querySelector('video')?.currentSrc.includes('/mobile.'));await waitPlaying(page);
    report.push({test:'Breakpoint changes remount a single correct video',status:'passed'});console.log('PASS breakpoint changes');await ctx.close();
  }
  {
    const {ctx,page,requests}=await context({viewport:{width:390,height:844}});
    await page.route('**/onboarding/*.webm',route=>route.abort());
    await page.goto(base);await waitPlaying(page);
    assert((await page.locator('video').evaluate(v=>v.currentSrc)).endsWith('mobile.mp4'));
    report.push({test:'WebM failure plays MP4 fallback',status:'passed',requests});console.log('PASS MP4 fallback');await ctx.close();
  }
  {
    const {ctx,page}=await context({viewport:{width:390,height:844}});
    await page.route(/onboarding\/.*\.(webm|mp4)/,route=>route.abort());
    await page.goto(base);await page.waitForFunction(()=>!document.querySelector('video')&&document.querySelector('picture img')?.complete);
    assert(await visiblePoster(page));assert.equal(await page.getByRole('button',{name:/onboarding animation/}).count(),0);
    await page.screenshot({path:path.join(out,'failed-media.png'),fullPage:true});
    report.push({test:'Both video sources fail: poster remains visible',status:'passed'});console.log('PASS source failure');await ctx.close();
  }
  {
    const {ctx,page}=await context({viewport:{width:390,height:844}});
    await page.addInitScript(()=>{
      HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Blocked for test','NotAllowedError'));};
      document.addEventListener('play',event=>event.target.pause(),true);
    });
    await page.goto(base);await page.getByRole('button',{name:'Play onboarding animation'}).waitFor();
    assert(await visiblePoster(page));
    report.push({test:'Autoplay rejection retains poster and Play control',status:'passed'});console.log('PASS autoplay rejection');await ctx.close();
  }
}finally{await browser.close();}
const webkit=await pw.webkit.launch({headless:true});
try{
  const page=await webkit.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.goto(base);
  await page.waitForFunction(()=>{
    const v=document.querySelector('video');
    return (v&&!v.paused&&v.readyState>=2)||(!v&&document.querySelector('picture img')?.complete);
  });
  if(await page.locator('video').count()) {
    await waitPlaying(page);await freeze(page);
    report.push({test:'Mobile WebKit inline autoplay and seek',status:'passed'});console.log('PASS mobile WebKit');
  } else {
    const probe=await page.evaluate(async()=>{
      const results=[];
      for(const ext of ['mp4','webm']){
        const video=document.createElement('video');video.muted=true;video.playsInline=true;
        document.body.append(video);video.src=`/assets/backgrounds/onboarding/mobile.${ext}`;
        try{await video.play();results.push({format:ext,code:0});}
        catch{results.push({format:ext,code:video.error?.code});}
        video.remove();
      }
      return results;
    });
    assert(probe.every(result=>result.code===4),'Unexpected WebKit playback failure');
    assert(await visiblePoster(page));
    report.push({test:'Mobile WebKit',status:'limited',detail:'Local WebKit rejects both formats with MEDIA_ERR_SRC_NOT_SUPPORTED in standalone players. Poster fallback verified; Safari playback not confirmed.',probe});
    console.log('LIMITED WebKit: both standalone codecs rejected; poster fallback passed');
  }
  await page.screenshot({path:path.join(out,'webkit-mobile.png'),fullPage:true});
}finally{await webkit.close();}
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${report.filter(r=>r.status==='passed').length} scenarios passed; ${report.filter(r=>r.status==='limited').length} limited by runtime. Screenshots and report: ${out}`);
