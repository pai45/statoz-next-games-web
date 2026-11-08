import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const out='test-results/mobile-gameplay-refinements';await fs.mkdir(out,{recursive:true});
const root=path.resolve('public');
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/fixture'){
 const game=u.searchParams.get('game');assert.ok(['cricketer','penalty-cup'].includes(game));res.setHeader('content-type','text/html');res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><script>window.__STATOZ_BUNDLE_BOOT__=session=>JSON.stringify({sessionId:session,origin:location.origin,storageScope:'refinements',stores:{},resultIds:[]});</script><iframe allow="autoplay;gamepad" src="/embedded-games/${game}/index.html?session=refinements${game==='cricketer'?'&clock=manual':''}"></iframe>`);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));assert.ok(file.startsWith(root+path.sep));res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11']});const errors=[],checks=[];
const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
const app=process.env.GAMES_APP_ORIGIN||'http://localhost:3000';
const findGame=async id=>{for(let i=0;i<240;i++){const f=page.frames().find(f=>f.url().includes('/embedded-games/'+id+'/'));if(f)return f;await page.waitForTimeout(100);}throw Error('Game iframe did not attach: '+id);};
const shot=async(frame)=>{const b=frame.getByRole('button',{name:'Hold to shoot'});await b.dispatchEvent('pointerdown',{pointerId:1});await page.waitForTimeout(250);await b.dispatchEvent('pointerup',{pointerId:1});};
try{
 // Exercise the actual product's rotated viewport, then its mobile pedals.
 if(!process.argv.includes('--cup-only')){
 for(const [name,size] of [['landscape',{width:844,height:390}],['portrait',{width:390,height:844}]]){
  await page.setViewportSize(size);await page.goto(app+'/play/portfolio-formula',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>f.src.includes('/embedded-games/portfolio-formula/'))||document.querySelector('[data-mobile-game-frame]'),null,{timeout:120000});
  let frame;for(let i=0;i<120&&!frame;i++){frame=page.frames().find(f=>f.url().includes('/embedded-games/portfolio-formula/'));if(!frame)await page.waitForTimeout(250);}assert.ok(frame);
  await Promise.all(page.frames().map(f=>f.addStyleTag({content:'nextjs-portal{display:none!important}'})));
  await frame.getByRole('button',{name:/Quick Match/}).click();await frame.getByRole('button',{name:'Start race',exact:true}).click();
  await frame.waitForFunction(()=>window.__PORTFOLIO_FORMULA__().phase==='racing');
  assert.equal(await frame.evaluate(()=>window.__PORTFOLIO_FORMULA__().autoThrottle),false);await page.waitForTimeout(450);
  assert.ok(Math.abs(await frame.evaluate(()=>window.__PORTFOLIO_FORMULA__().speed))<.5);
  const gas=frame.getByRole('button',{name:'Accelerate',exact:true}),brake=frame.getByRole('button',{name:'Brake',exact:true});
  const boxes=await gas.evaluate(el=>{const a=el.getBoundingClientRect(),b=document.querySelector('[aria-label="Brake"]').getBoundingClientRect();return{gas:{x:a.x,width:a.width,bottom:a.bottom},brake:{x:b.x,width:b.width,bottom:b.bottom}};});assert.ok(boxes.gas.x>=boxes.brake.x+boxes.brake.width);assert.ok(Math.abs(boxes.gas.bottom-boxes.brake.bottom)<2);
  const g=await gas.boundingBox(),l=await frame.getByRole('button',{name:'Steer left',exact:true}).boundingBox();const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:g.x+g.width/2,y:g.y+g.height/2},{id:2,x:l.x+l.width/2,y:l.y+l.height/2}]});
  await page.waitForTimeout(600);console.log('Verified Formula '+name+' touch input');
  await frame.waitForFunction(()=>{const s=window.__PORTFOLIO_FORMULA__();return s.touch.throttle&&s.touch.left&&s.speed>3;},null,{timeout:10000});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frame.waitForFunction(()=>!window.__PORTFOLIO_FORMULA__().touch.throttle);
  assert.ok(await brake.isVisible());await page.screenshot({path:out+'/formula-'+name+'.png',timeout:60000});checks.push('Formula '+name+': manual side-by-side pedals and simultaneous steering/accelerator');
 }
 await page.setViewportSize({width:390,height:844});await page.goto(app+'/play/cricketer',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.querySelector('[data-mobile-game-frame]'),null,{timeout:120000});
 let cricket;for(let i=0;i<120&&!cricket;i++){cricket=page.frames().find(f=>f.url().includes('/embedded-games/cricketer/'));if(!cricket)await page.waitForTimeout(250);}assert.ok(cricket);await cricket.getByRole('button',{name:'BROWSE CHASES'}).waitFor();assert.ok(await cricket.evaluate(()=>innerWidth>innerHeight));await page.screenshot({path:out+'/cricketer-portrait-landscape.png',timeout:60000});checks.push('Cricketer actual product route opens in landscape on an upright phone');
 await page.setViewportSize({width:844,height:390});await page.goto(origin+'/fixture?game=cricketer',{waitUntil:'domcontentloaded'});cricket=await findGame('cricketer');await cricket.getByRole('button',{name:'BROWSE CHASES'}).click();await cricket.getByRole('button',{name:'First light, 5 runs from 5 balls',exact:true}).click();
 const advance=async t=>{await cricket.evaluate(t=>window.__CRICKETER_INSPECT__.advance(t),t);await page.waitForTimeout(100);};
 let s=await cricket.evaluate(()=>window.__CRICKETER_INSPECT__.snapshot().match);await advance(1.25+s.delivery.flight-.15);await cricket.getByRole('button',{name:'Bat '+s.delivery.side,exact:true}).tap();await advance(.2);assert.equal(await cricket.locator('[class*=feedback]').count(),0);await advance(2.5);assert.equal(await cricket.locator('[class*=feedback]').count(),0);await advance(.6);await cricket.getByText('SIX.',{exact:true}).waitFor();
 for(const side of ['left','right']){const r=await cricket.getByRole('button',{name:'Bat '+side,exact:true}).boundingBox();assert.equal(Math.round(r.width),88);assert.ok(r.x>=26&&r.x+r.width<=818);}await page.screenshot({path:out+'/cricketer-after-six.png',timeout:60000});checks.push('Cricketer result follows the completed shot; mobile buttons are 88px and inset 26px');
 // A three-run shot must finish running before the ball is received.
 await page.goto(origin+'/fixture?game=cricketer',{waitUntil:'domcontentloaded'});cricket=await findGame('cricketer');await cricket.getByRole('button',{name:'BROWSE CHASES'}).click();await cricket.getByRole('button',{name:'First light, 5 runs from 5 balls',exact:true}).click();
 s=await cricket.evaluate(()=>window.__CRICKETER_INSPECT__.snapshot().match);await advance(1.25+s.delivery.flight-.01);await cricket.getByRole('button',{name:'Bat '+s.delivery.side,exact:true}).tap();await advance(.04);
 s=await cricket.evaluate(()=>window.__CRICKETER_INSPECT__.snapshot().match);assert.equal(s.outcome.runs,3);await advance(7.2-s.age-.03);let view=await cricket.evaluate(()=>window.__CRICKETER_INSPECT__.view());assert.ok(Math.hypot(view.renderedBall[0]+1.2,view.renderedBall[2]-1.85)>.1,'return not yet received before final run');
 await advance(1.2);view=await cricket.evaluate(()=>window.__CRICKETER_INSPECT__.view());assert.ok(Math.hypot(view.renderedBall[0]+1.2,view.renderedBall[1]-.62,view.renderedBall[2]-1.85)<.02,'keeper receives return after completed runs');checks.push('Cricketer rendered return throw reaches keeper after all three runs');
 }
 await page.setViewportSize({width:844,height:390});
 await page.goto(origin+'/fixture?game=penalty-cup',{waitUntil:'domcontentloaded'});const cup=await findGame('penalty-cup');await cup.getByRole('button',{name:'Random Game',exact:true}).click();await cup.getByRole('button',{name:'Play',exact:true}).click();
 // Random Game chooses two countries directly, with the same shared match runtime.
 await cup.locator('[data-phase="preparation"]').waitFor();await shot(cup);await cup.locator('[data-kicks="1"]').waitFor();
 await cup.locator('[data-role="keeping"]').waitFor();await cup.getByRole('button',{name:'Dive right low',exact:true}).tap();await cup.locator('[data-keeper-motion="LowDive"]').waitFor();
 await page.screenshot({path:out+'/cup-push.png',timeout:60000});await page.waitForTimeout(350);await page.screenshot({path:out+'/cup-stretch.png',timeout:60000});await page.waitForTimeout(1600);await page.screenshot({path:out+'/cup-recovery.png',timeout:60000});checks.push('Cup touch save plays push, stretch, landing and recovery in the real runtime');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}catch(e){console.error(e);console.log(checks);await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),checks,errors},null,2));await page.screenshot({path:out+'/failure.png',timeout:20000}).catch(()=>{});throw e;}finally{await context.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
