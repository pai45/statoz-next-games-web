import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {hoopLegacyPlugin} from '../../scripts/build-hoop-legacy.mjs';
import {writeComparison} from './comparison.mjs';

const root=process.cwd(),output=path.resolve('test-results/hoop-legacy-athletes');
await fs.mkdir(output,{recursive:true});
const bundle=await build({entryPoints:['tools/hoop-legacy-athletes/review.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:false,
  tsconfig:'src/features/games/hoop-legacy/source/tsconfig.json',define:{'import.meta.env.DEV':'false','import.meta.env.BASE_URL':'"/embedded-games/hoop-legacy/assets/"','process.env.NODE_ENV':'"production"'},plugins:[hoopLegacyPlugin()]});
const script=bundle.outputFiles[0].text;
const font=await fs.readFile('src/features/games/hoop-legacy/source/node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-900-italic.woff2');
const normalFont=await fs.readFile('src/features/games/hoop-legacy/source/node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-900-normal.woff2');
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(`<!doctype html><html><head><style>@font-face{font-family:'Barlow Condensed';font-weight:900;font-style:italic;src:url(data:font/woff2;base64,${font.toString('base64')})}@font-face{font-family:'Barlow Condensed';font-weight:900;font-style:normal;src:url(data:font/woff2;base64,${normalFont.toString('base64')})}html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}</style></head><body><div id="root"></div><script type="module" src="/review.js"></script></body></html>`);return;}
  if(pathname==='/review.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(script);return;}
  const file=path.resolve(root,'public','.'+decodeURIComponent(pathname));
  if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
  try{const data=await fs.readFile(file);res.writeHead(200,{'content-type':({'.json':'application/json','.webp':'image/webp','.glb':'model/gltf-binary','.png':'image/png','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],reports={};
if(process.argv.includes('--authored-only')||process.argv.includes('--baseline-only')) {
  const previous=await fs.readFile(path.join(output,'review.json'),'utf8').then(JSON.parse).catch(()=>null);
  if(previous?.reports)Object.assign(reports,previous.reports);
}
try {
  const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text().slice(0,500));}});
  page.setDefaultTimeout(120000);
  if(process.argv.includes('--deformation-only')) {
    await page.goto(origin+'/?quality=medium',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    const result=await page.evaluate(()=>window.review.deformation());
    await fs.writeFile(path.join(output,'deformation.json'),JSON.stringify({errors,...result},null,2));
    await page.screenshot({path:path.join(output,'deformation.png'),timeout:120000});
    console.log(JSON.stringify({maxRoundTripError:result.maxRoundTripError,maxExtent:result.maxExtent,uniformMaterials:result.uniformMaterials,geometry:result.geometry,uniqueGeometryBytes:result.uniqueGeometryBytes}));
    assert.deepEqual(errors,[]);assert.ok(result.maxRoundTripError<.00001,'detail swaps preserve skinned vertices at translated/rotated court positions');assert.ok(result.maxExtent<4&&result.maxCoordinate<4,'posed athletes remain human-sized and attached to their root');assert.equal(result.uniformMaterials,1,'detail swaps reuse team-print materials');
    assert.equal(result.sharedGameGeometry,true,'low/desktop tiers reuse identical geometry');assert.ok(result.uniqueGeometryBytes<36*1048576,'decoded geometry memory budget');
  } else {
  for(const baseline of process.argv.includes('--baseline-only')?[true]:process.argv.includes('--authored-only')?[false]:[true,false]) {
    await page.goto(origin+'/?'+(baseline?'baseline&':'')+'quality=medium',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:120000});
    const prefix=baseline?'before':'after';
    for(const [name,options]of Object.entries({body:{},face:{view:'face'},feet:{view:'feet'},back:{view:'back'},defense:{pose:'defense'},run:{pose:'run'},shoot:{pose:'shoot'},roster:{roster:true},broadcast:{view:'broadcast'}})) {
      reports[prefix+'-'+name]=await page.evaluate(options=>window.review.show(options),options);
      await page.screenshot({path:path.join(output,prefix+'-'+name+'.png'),timeout:120000});
      console.log(prefix+'-'+name,JSON.stringify(reports[prefix+'-'+name].players.map(p=>({authored:p.authored,triangles:p.triangles,detail:p.detail}))));
    }
    reports[prefix+'-motion']=await page.evaluate(()=>window.review.motion());
    const motion=reports[prefix+'-motion'];console.log(prefix+'-motion',JSON.stringify(motion));
    assert.equal(motion.finite,true);assert.ok(motion.minimumHips>=.34);assert.ok(motion.maxPalmGap<=.06);assert.ok(motion.plantedDrift<.005);assert.ok(motion.swapBoneError<.000001);
    if(!baseline&&process.argv.includes('--coverage')) {
      for(const hair of 'bald buzz fade waves afro hightop twists braids locs bun'.split(' ')) {
        reports['hair-'+hair]=await page.evaluate(hair=>window.review.show({hair,view:'face'}),hair);
        await page.screenshot({path:path.join(output,'hair-'+hair+'.png'),timeout:120000});
      }
      for(const [i,skin]of ['#4a2c21','#74432c','#a96f4b','#dba47a','#f0c49b'].entries())for(const index of [0,3,7]) {
        reports[`skin-${i}-head-${index}`]=await page.evaluate(options=>window.review.show(options),{skin,index,view:'face'});
        if(index===0)await page.screenshot({path:path.join(output,`skin-${i}.png`),timeout:120000});
      }
    }
  }
  await fs.writeFile(path.join(output,'review.json'),JSON.stringify({errors,reports},null,2));
  assert.deepEqual(errors,[]);
  await writeComparison(output);
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
