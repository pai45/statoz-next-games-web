/** Rasterize exact self-hosted web fonts once; render.mjs reuses the PNG layers. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
let playwright;
for(const candidate of ['playwright',process.env.PLAYWRIGHT_PATH,path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){
  try{playwright=require(candidate);break;}catch{}
}
if(!playwright)throw new Error('Install playwright or set PLAYWRIGHT_PATH to rasterize typography.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const output=path.join(root,'scripts/media/onboarding/lettering');
await fs.mkdir(output,{recursive:true});
const browser=await playwright.chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  const fonts=await Promise.all(['orbitron','spaceGrotesk'].map(async name=>({name,data:(await fs.readFile(path.join(root,name === "spaceGrotesk" ? "src/app/fonts/space-grotesk-variable.ttf" : "src/app/fonts/orbitron-latin-variable.woff2"))).toString('base64')})));
  await page.setContent(`<style>${fonts.map(f=>`@font-face{font-family:${f.name};src:url(data:font/${f.name === "spaceGrotesk" ? "ttf" : "woff2"};base64,${f.data}) font-weight:${f.name === "spaceGrotesk" ? "300 700" : "400 900"};}`).join('')}</style>`);
  const tokens=await fs.readFile(path.join(root,'src/design-system/styles/tokens.css'),'utf8');
  const color=name=>tokens.match(new RegExp(`--ds-color-${name}:\\s*([^;]+);`))[1].trim();
  const entries=[
    ['ONE ARENA.',72,color('text-default'),true],['EVERY GAME.',72,color('accent-cyan'),true],
    ['StatOz',42,color('text-default'),true],['YOUR WORLD OF SPORT',18,color('text-muted'),false],
    ...['MESSI','RONALDO','KOHLI','HAMILTON','LEBRON'].map(n=>[n,22,color('text-default'),true]),
    ['FOOTBALL',24,color('accent-cyan'),true],['CRICKET',24,color('accent-gold'),true],
    ['FORMULA 1',24,color('accent-racing'),true],['BASKETBALL',24,color('accent-orange'),true],
  ];
  const manifest={};
  for(let i=0;i<entries.length;i++){
    const [text,size,fill,display]=entries[i];
    const result=await page.evaluate(async({text,size,fill,display})=>{
      const font=`900 ${size}px ${display?'orbitron':'spaceGrotesk'}`;
      await document.fonts.load(font);
      const canvas=document.createElement('canvas');
      let ctx=canvas.getContext('2d');ctx.font=font;
      const m=ctx.measureText(text),pad=4;
      canvas.width=Math.ceil(m.width)+pad*2;
      canvas.height=Math.ceil(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent)+pad*2;
      ctx=canvas.getContext('2d');ctx.font=font;ctx.fillStyle=fill;
      ctx.fillText(text,pad,Math.ceil(m.actualBoundingBoxAscent)+pad);
      return {data:canvas.toDataURL('image/png').split(',')[1],w:canvas.width,h:canvas.height};
    },{text,size,fill,display});
    const file=`${String(i).padStart(2,'0')}.png`;
    await fs.writeFile(path.join(output,file),Buffer.from(result.data,'base64'));
    manifest[`${text}:${size}:${fill}:${display}`]={file,w:result.w,h:result.h};
  }
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('Exact Orbitron and Space Grotesk lettering saved.');
}finally{await browser.close();}
