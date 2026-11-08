import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'out'),prefix='/statoz-games-web';
const requests=[],errors=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.ttf':'font/ttf','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);requests.push(pathname);
  if(!pathname.startsWith(prefix+'/'))throw Error('Missing base path');
  let file=path.resolve(out,'.'+pathname.slice(prefix.length));if(!file.startsWith(out+path.sep))throw Error('Outside export');
  const stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:412,height:915}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const email='static-stadium@example.test';localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{[email]:{onboardingComplete:true}}}));
  localStorage.setItem('statoz.games.web.bundle.stadium-cricket.static-stadium%40example.test',JSON.stringify({schemaVersion:1,stores:{'cm-quality':'low'},resultIds:[]}));
 });
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+prefix+'/play/final-over/');await page.waitForURL(/\/play\/stadium-cricket\/?$/);
 await page.getByRole('button',{name:'Play Cricket'}).waitFor();assert.equal(await page.locator('h1').textContent(),'STADIUMCRICKET');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(root,'test-results/stadium-cricket/static-lobby-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Play Cricket'}).click();let frame=page.frames().find(frame=>frame!==page.mainFrame());await frame.waitForFunction(()=>window.CM?.ready,null,{timeout:90000});
 // Play starts directly without the source intro.
 assert.equal(await frame.locator('#intro').isVisible(),false);await frame.waitForFunction(()=>window.CM.snapshot().phase!=='intro');
 await frame.locator('body').press('p');assert.equal(await frame.evaluate(()=>window.CM.snapshot().paused),true);
 await frame.locator('body').press('p');assert.equal(await frame.evaluate(()=>window.CM.snapshot().paused),false);
 await frame.locator('body').press('c');assert.match(await frame.locator('#camera').textContent(),/broadcast/);
 await frame.locator('#sound').click();assert.equal(await frame.locator('#sound').getAttribute('aria-pressed'),'false');
 await frame.locator('#sound').click();assert.equal(await frame.locator('#sound').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:path.join(root,'test-results/stadium-cricket/static-game-mobile.png')});
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:path.join(root,'test-results/stadium-cricket/static-game-landscape.png')});
 await page.getByRole('button',{name:'← Lobby',exact:true}).click();
 // Deny only game storage: account authentication remains available.
 await page.evaluate(()=>{
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  Storage.prototype.getItem=function(key){if(key.includes('bundle.stadium-cricket'))throw new DOMException('Blocked','SecurityError');return get.call(this,key);};
  Storage.prototype.setItem=function(key,value){if(key.includes('bundle.stadium-cricket'))throw new DOMException('Blocked','QuotaExceededError');return set.call(this,key,value);};
 });
 await page.getByRole('button',{name:'Play Cricket'}).click();await page.getByRole('status').filter({hasText:'could not be saved'}).waitFor();
 frame=page.frames().find(frame=>frame!==page.mainFrame());await frame.waitForFunction(()=>window.CM?.ready,null,{timeout:90000});await frame.evaluate(()=>{const select=document.getElementById('quality');select.value='balanced';select.dispatchEvent(new Event('change'));});
 await page.getByRole('status').filter({hasText:'Progress could not be saved'}).waitFor();
 await page.getByRole('button',{name:'← Lobby',exact:true}).click();await page.getByRole('link',{name:'Back to Cricket',exact:true}).click();await page.waitForURL(/\/games\/cricket\/?$/);
 const broken=await browser.newPage();await broken.addInitScript(()=>{
  const email='static-stadium@example.test';localStorage.setItem('statoz.games.web.auth.v2',JSON.stringify({version:2,authenticated:true,email}));
  localStorage.setItem('statoz.games.web.accounts.v1',JSON.stringify({version:1,accounts:{[email]:{onboardingComplete:true}}}));
  const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};
 });
 await broken.goto(origin+prefix+'/play/stadium-cricket/');await broken.getByRole('button',{name:'Play Cricket'}).click();await broken.getByRole('alert').filter({hasText:'WebGL support'}).waitFor();await broken.close();
 assert.ok(requests.includes(prefix+'/embedded-games/stadium-cricket/index.html'));assert.deepEqual(errors,[]);
 const result={passed:true,checks:['static old URL forwarding','subdirectory assets','mobile lobby','original mobile UI','landscape original UI','source home link','return to cricket','unavailable storage remains playable','save failures visible','WebGL failure recovery'],requests:requests.filter(p=>/stadium-cricket|final-over/.test(p)),errors};
 await fs.writeFile(path.join(root,'test-results/stadium-cricket/static-validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
