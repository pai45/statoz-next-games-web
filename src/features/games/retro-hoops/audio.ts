import type { GameEvent } from "./simulation";
import type { Settings } from "./persistence";
import {volume} from "./persistence";
export type Tone = {frequency:number;length:number;volume:number;type:OscillatorType;end?:number};
export const CUES:Record<string,Tone[]>={
  dribble:[{frequency:125,length:.09,volume:.12,type:"sine",end:45}],
  bounce:[{frequency:125,length:.09,volume:.12,type:"sine",end:45}],
  pass:[{frequency:550,length:.07,volume:.025,type:"triangle",end:160}],
  catch:[{frequency:240,length:.08,volume:.07,type:"triangle",end:80}],
  shoe:[{frequency:1200,length:.055,volume:.02,type:"triangle",end:400}],
  rim:[{frequency:470,length:.17,volume:.06,type:"square",end:320}],
  net:[{frequency:660,length:.18,volume:.045,type:"triangle",end:880},{frequency:990,length:.2,volume:.025,type:"sine"}],
  dunk:[{frequency:100,length:.22,volume:.09,type:"triangle",end:40}],
  block:[{frequency:240,length:.08,volume:.07,type:"triangle",end:80}],
  whistle:[{frequency:1600,length:.13,volume:.025,type:"sine",end:1300}],
  buzzer:[{frequency:155,length:.65,volume:.07,type:"square"}],
  super:[{frequency:140,length:.55,volume:.065,type:"sawtooth",end:840}],
  crowd:[{frequency:180,length:.35,volume:.018,type:"triangle",end:240},{frequency:270,length:.3,volume:.012,type:"triangle",end:190}],
  ui:[{frequency:880,length:.06,volume:.025,type:"triangle",end:1100}]
};
export const MUSIC_NOTES=[110,110,164.81,146.83,130.81,164.81,146.83,98];
/** Original procedural synthesis; never samples the reference recording. Eight voices maximum. */
export class HoopsAudio {
  private context:AudioContext|null=null;
  private sfxGain:GainNode|null=null;private musicGain:GainNode|null=null;
  private voices=new Set<OscillatorNode>();private timer:ReturnType<typeof setInterval>|null=null;private beat=0;
  settings:Settings={sfx:true,music:false};
  async unlock(){if(!this.context){this.context=new AudioContext();this.sfxGain=this.context.createGain();this.musicGain=this.context.createGain();this.sfxGain.connect(this.context.destination);this.musicGain.connect(this.context.destination);}this.configure(this.settings);await this.context.resume();this.syncMusic();}
  private tone(frequency:number,length:number,loudness:number,type:OscillatorType="sine",end=frequency,music=false) {
    const c=this.context;if(!c||c.state!=="running"||this.voices.size>=8)return;
    const oscillator=c.createOscillator(),gain=c.createGain(),t=c.currentTime;
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,t);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+length);
    gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(loudness,t+.004);gain.gain.exponentialRampToValueAtTime(.001,t+length);
    oscillator.connect(gain);gain.connect((music?this.musicGain:this.sfxGain)!);this.voices.add(oscillator);
    oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(t);oscillator.stop(t+length+.01);
  }
  events(events:GameEvent[]){if(!this.settings.sfx)return;for(const e of events){const key=e.type==="super-dunk"?"dunk":["rebound","intercept"].includes(e.type)?"catch":["reach","steal","land"].includes(e.type)?"shoe":e.type==="score"?"net":["shot-clock","out","inbound","tip","period-end","period-start"].includes(e.type)?"whistle":e.type;if(["buzzer","whistle"].includes(key)&&this.voices.size>=6){for(const voice of [...this.voices].slice(0,3)){try{voice.stop();}catch{}this.voices.delete(voice);}}
      const variation=["dribble","bounce","shoe","rim"].includes(key)?1+((e.id%3)-1)*.06:1;
      for(const cue of e.type==="score"?[key,"crowd"]:[key])for(const t of CUES[cue]||[])this.tone(t.frequency*variation,t.length,t.volume,t.type,t.end===undefined?undefined:t.end*variation);}}
  configure(settings:Settings){this.settings={...settings};const t=this.context?.currentTime||0;this.sfxGain?.gain.setValueAtTime(settings.sfx?volume(settings.sfxVolume,.7):0,t);this.musicGain?.gain.setValueAtTime(settings.music?volume(settings.musicVolume,.4):0,t);this.syncMusic();}
  private syncMusic(){if(this.timer){clearInterval(this.timer);this.timer=null;}if(this.settings.music&&this.context?.state==="running")this.timer=setInterval(()=>{this.tone(MUSIC_NOTES[this.beat++%MUSIC_NOTES.length],.19,.022,"triangle",undefined,true);if(this.beat%2===0)this.tone(55,.07,.045,"sine",30,true);},250);}
  pause(){if(this.timer){clearInterval(this.timer);this.timer=null;}for(const v of this.voices){try{v.stop();}catch{}}void this.context?.suspend();}
  async dispose(){this.pause();await this.context?.close();this.context=null;this.sfxGain=null;this.musicGain=null;}
}
