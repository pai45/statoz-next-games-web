import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const out=path.resolve('test-results/retro-hoops-authored-v2/audio');await fs.mkdir(out,{recursive:true});
const bundled=await build({stdin:{contents:`import{CUES,MUSIC_NOTES}from'./src/features/games/retro-hoops/audio';import{createMatch,step}from'./src/features/games/retro-hoops/simulation';window.audioReviewData={CUES,MUSIC_NOTES};const s=createMatch(17,true,{opening:true});const events=[];for(let i=0;i<22000&&s.phase!=='result';i++){step(s);for(const e of s.events)events.push(e);}window.audioReviewData.events=events;`,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try{
 await page.addScriptTag({content:bundled.outputFiles[0].text});
 const result=await page.evaluate(async()=>{
  const {CUES,MUSIC_NOTES,events}=window.audioReviewData,rate=22050;
  async function render(sequence,duration,music=false){
   const context=new OfflineAudioContext(1,Math.ceil(duration*rate),rate);
   const tone=(t,start,factor=1)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=t.type;oscillator.frequency.setValueAtTime(t.frequency*factor,start);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,(t.end??t.frequency)*factor),start+t.length);gain.gain.setValueAtTime(.001,start);gain.gain.linearRampToValueAtTime(t.volume*.7,start+.004);gain.gain.exponentialRampToValueAtTime(.001,start+t.length);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+t.length+.01);};
   for(const event of sequence){const key=event.type==='super-dunk'?'dunk':['rebound','intercept'].includes(event.type)?'catch':['reach','steal','land'].includes(event.type)?'shoe':event.type==='score'?'net':['shot-clock','out','inbound','tip','period-end','period-start'].includes(event.type)?'whistle':event.type;
    const start=event.time??event.tick/60;for(const cue of event.type==='score'?[key,'crowd']:[key])for(const t of CUES[cue]??[])if(start+t.length<duration)tone(t,start);
   }
   if(music)for(let i=0;i*.25<duration-.3;i++){tone({frequency:MUSIC_NOTES[i%MUSIC_NOTES.length],length:.19,volume:.022*.4/.7,type:'triangle'},i*.25);if(i%2)tone({frequency:55,length:.07,volume:.045*.4/.7,type:'sine',end:30},i*.25);}
   const buffer=await context.startRendering(),samples=buffer.getChannelData(0);let peak=0,sum=0;for(const v of samples){peak=Math.max(peak,Math.abs(v));sum+=v*v;}
   const data=new ArrayBuffer(44+samples.length*2),view=new DataView(data);const str=(offset,value)=>[...value].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));str(0,'RIFF');view.setUint32(4,36+samples.length*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,samples.length*2,true);samples.forEach((v,i)=>view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,v))*32767),true));const bytes=new Uint8Array(data);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return{base64:btoa(binary),peak,rms:Math.sqrt(sum/samples.length),duration};
  }
  const cues={};for(const key of Object.keys(CUES))cues[key]=await render([{type:key,time:.1}],1.2);
  return{cues,music:await render([],8.2,true),mix:await render(events.filter(e=>e.tick<60*35),36,true),events:events.filter(e=>e.tick<60*35),note:'Offline rendering uses the runtime oscillator/envelope definitions and simulated events. It does not exercise live overlap limits and cannot establish listening approval.'};
 });
 const records=[];for(const [name,record]of [...Object.entries(result.cues),['music',result.music],['gameplay-mix',result.mix]]){await fs.writeFile(path.join(out,name+'.wav'),Buffer.from(record.base64,'base64'));records.push({name,peak:record.peak,rms:record.rms,duration:record.duration,clipped:record.peak>=1});}
 await fs.writeFile(path.join(out,'review.json'),JSON.stringify({records,note:result.note,listeningPerformed:false,provisionalApproval:'User previously approved original audio for now; revised mix still requires listening',events:result.events},null,2));
 await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Retro Hoops original audio review</title><style>body{background:#292d24;color:#eee5ca;font:16px monospace;max-width:800px;margin:24px auto}audio{display:block;width:100%;margin:8px 0 24px}a{color:#f2cb71}</style><h1>Original Retro Hoops audio</h1><p>No reference recordings or third-party samples. Waveform checks are separate from listening approval.</p><a href="../game.html">Play match</a>${records.map(r=>`<h2>${r.name}</h2><audio controls src="${r.name}.wav"></audio>`).join('')}`);
 console.log(JSON.stringify({cues:records.length,clipped:records.filter(r=>r.clipped).length,listeningPerformed:false}));
}finally{await browser.close();}
