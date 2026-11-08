import fs from'node:fs/promises';import path from'node:path';import http from'node:http';import assert from'node:assert/strict';
const{chromium}=await import('@playwright/test');
const root=path.resolve('out'),out=path.resolve('test-results',process.env.HOOPS_REVIEW_VARIANT||'street-hoop-route',process.env.HOOPS_REMOTE_ORIGIN?'live':'static');await fs.mkdir(out,{recursive:true});const prefix='/statoz-games-web';
const server=http.createServer(async(req,res)=>{try{const url=decodeURIComponent(req.url.split('?')[0]);if(!url.startsWith(prefix+'/'))throw Error();let file=path.resolve(root,'.'+url.slice(prefix.length));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.data':'application/octet-stream','.7z':'application/octet-stream','.zip':'application/zip','.wasm':'application/wasm','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.txt':'text/plain','.woff2':'font/woff2','.ttf':'font/ttf'})[path.extname(file)]||'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.env.HOOPS_REMOTE_ORIGIN||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[],failed=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
try{
 await page.goto(origin+prefix+'/play/retro-hoops/');
 const surface=page.frameLocator('iframe[data-mobile-game-frame]');
 await surface.frameLocator('iframe').getByRole('button',{name:'Play Street Hoop',exact:true}).waitFor();checks.push('Guest launcher renders without changing existing account policy');
 const email='street-hoop-review@example.invalid';
 await page.evaluate(email=>{const p='statoz.games.web.';localStorage.setItem(p+'auth.v2',JSON.stringify({version:2,authenticated:true,email}));localStorage.setItem(p+'accounts.v1',JSON.stringify({version:1,accounts:{[email]:{onboardingComplete:true}}}));localStorage.setItem(p+'account-data-owner.v1',email);},email);
 await page.goto(origin+prefix+'/games/basketball/');await page.locator('a[href$="/play/retro-hoops"],a[href$="/play/retro-hoops/"]').waitFor();assert.ok((await page.locator('body').innerText()).includes('STREET'));
 await page.goto(origin+prefix+'/play/retro-hoops/');
 const frame=surface.frameLocator('iframe[allow="autoplay; fullscreen"]');
 await frame.getByRole('button',{name:'Play Street Hoop',exact:true}).click();
 await page.waitForFunction(()=>{const host=document.querySelector('iframe[data-mobile-game-frame]');const bundle=host?.contentDocument?.querySelector('iframe[allow="autoplay; fullscreen"]');return bundle?.contentDocument?.querySelector('iframe')?.contentWindow?.__streetHoopDebug?.ready;},null,{timeout:90000});
 const native=page.frames().find(f=>f.url().includes('/street-hoop/index.html'));
 assert.ok(native.url().includes(prefix+'/games/retro-hoops/street-hoop/'));
 const {createHash}=await import('node:crypto');
 assert.equal(await native.evaluate(()=>__streetHoopDebug.scope),createHash('sha256').update(email).digest('hex').slice(0,24));
 checks.push('Authenticated nested game loads local assets under deployment base path and isolates native storage by account');
 await page.screenshot({path:path.join(out,'authenticated-street-hoop.png')});
 await frame.getByRole('button',{name:'Exit',exact:true}).click();await page.waitForURL('**/games/basketball/**');checks.push('Exit returns to basketball catalog');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(path.join(out,'checks.json'),JSON.stringify({checks,errors,failed,physicalDevice:false},null,2));console.log(JSON.stringify({checks,errors,failed}));
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,failed,error:error.stack},null,2));await page.screenshot({path:path.join(out,'failure.png')});throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
