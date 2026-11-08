/**
 * Deterministic six-second, 30 fps CSS 3D motion renderer.
 * node scripts/media/onboarding/render.mjs [--preview] [--only=desktop|mobile]
 * Chromium renders the authored scene; Sharp creates posters; FFmpeg encodes.
 * Intermediate frames live in ignored build/onboarding/. No runtime web dependency.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import sharp from 'sharp';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const SOURCE=path.join(ROOT,'scripts/media/onboarding/sources');
const OUTPUT=path.join(ROOT,'public/assets/backgrounds/onboarding');
const BUILD=path.join(ROOT,'build/onboarding');
const PREVIEW=process.argv.includes('--preview');
const ONLY=process.argv.find(x=>x.startsWith('--only='))?.split('=')[1];
const FPS=30,FRAMES=180;
const require=createRequire(import.meta.url);
let playwright;
for(const candidate of ['playwright',process.env.PLAYWRIGHT_PATH,path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){
  try{playwright=require(candidate);break;}catch{}
}
if(!playwright)throw new Error('Install Playwright with Chromium or set PLAYWRIGHT_PATH to its package directory.');
const css=await fs.readFile(path.join(ROOT,'src/design-system/styles/tokens.css'),'utf8');
const color=name=>{const value=css.match(new RegExp(`--ds-color-${name}:\\s*([^;]+);`))?.[1];if(!value)throw new Error(`Missing color token ${name}`);return value.trim();};
const colors={navy:color('background-secondary'),dark:color('background-muted'),cyan:color('accent-cyan'),gold:color('accent-gold'),red:color('accent-racing'),orange:color('accent-orange'),white:color('text-default'),muted:color('text-muted')};
const uri=async(file,mime)=>`data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
const athletes=await Promise.all([
  ['messi','MESSI','FOOTBALL',colors.cyan],['ronaldo','RONALDO','FOOTBALL',colors.cyan],
  ['kohli','KOHLI','CRICKET',colors.gold],['hamilton','HAMILTON','FORMULA 1',colors.red],['lebron','LEBRON','BASKETBALL',colors.orange],
].map(async([id,name,sport,color])=>({id,name,sport,color,uri:await uri(path.join(SOURCE,`${id}.webp`),'image/webp')})));
const scene={tokens:css,colors,athletes,arena:await uri(path.join(SOURCE,'arena-v2.webp'),'image/webp'),logo:await uri(path.join(ROOT,'public/assets/icons/app_logo.png'),'image/png'),fonts:await Promise.all(['orbitron','spaceGrotesk'].map(async name=>({name,uri:await uri(path.join(ROOT,name === "spaceGrotesk" ? "src/app/fonts/space-grotesk-variable.ttf" : "src/app/fonts/orbitron-latin-variable.woff2"),name === "spaceGrotesk" ? "font/ttf" : "font/woff2")})))};
const template=await fs.readFile(path.join(ROOT,'scripts/media/onboarding/scene.html'),'utf8');
function ffmpegPath(){
  if(process.env.FFMPEG_PATH)return process.env.FFMPEG_PATH;
  try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});return 'ffmpeg';}catch{
    try{return execFileSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();}
    catch{throw new Error('Set FFMPEG_PATH to an FFmpeg executable with libx264 and libvpx-vp9.');}
  }
}
function encode(args){
  return new Promise((resolve,reject)=>{
    const child=spawn(ffmpegPath(),['-hide_banner','-loglevel','error','-y',...args],{stdio:['ignore','inherit','inherit'],windowsHide:true});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`FFmpeg exited ${code}`)));
  });
}
await fs.mkdir(OUTPUT,{recursive:true});await fs.mkdir(BUILD,{recursive:true});
const browser=await playwright.chromium.launch({headless:true});
try{
 for(const[name,width,height]of [['desktop',1080,1200],['mobile',900,720]]){
  if(ONLY&&name!==ONLY)continue;
  const frameDir=path.join(BUILD,name);await fs.mkdir(frameDir,{recursive:true});
  const html=template.replace('__SCENE_DATA__',JSON.stringify({...scene,width,height}));
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',error=>{throw error;});
  await page.setContent(html);await page.evaluate(()=>window.ready);
  const indices=PREVIEW?[0,16,30,49,62,75,88,102,120,138,146,160,174,179]:Array.from({length:FRAMES},(_,i)=>i);
  for(let j=0;j<indices.length;j++){
    const index=indices[j];await page.evaluate(t=>window.drawFrame(t),index/FPS);
    const buffer=await page.screenshot({path:path.join(frameDir,`${String(index).padStart(3,'0')}.png`),type:'png'});
    if(index===146)await sharp(buffer).webp({quality:91}).toFile(path.join(OUTPUT,`${name}-poster.webp`));
    if(j%30===0)console.log(`${name}: ${j+1}/${indices.length} frames`);
  }
  await page.close();if(PREVIEW)continue;
  const input=['-framerate',String(FPS),'-i',path.join(frameDir,'%03d.png'),'-frames:v',String(FRAMES),'-an'];
  await encode([...input,'-c:v','libvpx-vp9','-b:v','0','-crf',name==='mobile'?'33':'31','-row-mt','1','-threads','4','-pix_fmt','yuv420p',path.join(OUTPUT,`${name}.webm`)]);
  await encode([...input,'-c:v','libx264','-crf',name==='mobile'?'25':'23','-preset','slow','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart',path.join(OUTPUT,`${name}.mp4`)]);
  for(const format of ['webm','mp4'])console.log(`${name}.${format}: ${((await fs.stat(path.join(OUTPUT,`${name}.${format}`))).size/1e6).toFixed(2)} MB`);
 }
}finally{await browser.close();}
console.log(PREVIEW?'V2 storyboard frames and posters ready.':'V2 videos and posters ready.');
