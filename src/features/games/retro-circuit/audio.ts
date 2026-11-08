import type { RaceEvent, RaceSnapshot } from "./types";
export type CueName=RaceEvent["type"]|"engine"|"skid"|"music";
/** Shared deterministic synthesis source for exported WAVs and runtime buffers. No samples. */
export function synthesize(name:CueName,sampleRate=22050){
  const duration=name==="music"?12:name==="engine"?1:name==="skid"?.5:name==="finish"?1.6:name==="dnf"?1.2:.42;
  const samples=new Float32Array(Math.round(duration*sampleRate));
  const melody=[0,7,12,10,7,3,5,7,0,3,7,12,10,7,5,3,5,12,17,15,12,8,10,12,7,10,14,17,14,10,7,5];
  let noise=913;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate;let value=0;
    noise=(Math.imul(noise,1664525)+1013904223)>>>0;const n=noise/4294967296*2-1;
    if(name==="engine")value=.15*Math.sin(2*Math.PI*65*t)+.065*Math.sin(2*Math.PI*130*t)+.025*Math.sin(2*Math.PI*260*t);
    else if(name==="music"){
      const step=Math.floor(t/.375),local=(t%.375)/.375,freq=220*2**(melody[step%32]/12);
      const note=Math.sin(2*Math.PI*freq*t)+.22*Math.sin(2*Math.PI*freq*2*t);
      const kick=Math.sin(2*Math.PI*(55*t+4*(1-Math.exp(-24*(t%.75))))) * Math.exp(-18*(t%.75));
      value=.065*note*Math.sin(Math.PI*local)**2+.06*kick+.014*n*Math.exp(-36*(t%.375));
      value*=Math.min(1,t/.03,(duration-t)/.03);
    }else{
      const envelope=Math.sin(Math.PI*t/duration)**2*Math.exp(-t*3);
      const freq=name==="nitro"?250+900*t:name==="dnf"?280-130*t:name==="finish"?440*2**([0,4,7,12][Math.min(3,Math.floor(t/.3))]/12):name==="low-fuel"?880:name==="refuel"?330+Math.floor(t/.08)*110:name==="pit"?660:name==="go"?1046:523;
      value=(name==="collision"||name==="skid"?n*.27:name==="nitro"?n*.12+Math.sin(2*Math.PI*freq*t)*.15:Math.sin(2*Math.PI*freq*t)*.24)*envelope;
    }samples[i]=value;
  }return {samples,sampleRate,loop:name==="engine"||name==="music"||name==="skid"};
}
export class CircuitAudio {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private engine:AudioBufferSourceNode|null=null;
  private engineGain:GainNode|null=null;
  private music:AudioBufferSourceNode|null=null;
  private musicGain:GainNode|null=null;
  private voices:AudioBufferSourceNode[]=[];
  private buffers=new Map<CueName,AudioBuffer>();
  private disposed=false;
  musicOn=true;sfxOn=true;
  async unlock(){if(this.disposed)return;try{if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.65;this.master.connect(this.context.destination);}await this.context.resume();}catch{/* Silent gameplay remains fully functional. */}}
  private buffer(name:CueName){if(this.buffers.has(name))return this.buffers.get(name)!;const {samples,sampleRate}=synthesize(name);const buffer=this.context!.createBuffer(1,samples.length,sampleRate);buffer.copyToChannel(samples,0);this.buffers.set(name,buffer);return buffer;}
  private loop(name:"engine"|"music"){const source=this.context!.createBufferSource(),gain=this.context!.createGain();source.buffer=this.buffer(name);source.loop=true;source.connect(gain);gain.connect(this.master!);source.start();return {source,gain};}
  update(state:RaceSnapshot){
    if(!this.context||this.disposed)return;
    const active=state.phase==="racing"||state.phase==="countdown";
    if(!active){this.stopLoops();return;}
    if(this.sfxOn&&!this.engine){const loop=this.loop("engine");this.engine=loop.source;this.engineGain=loop.gain;}
    if(this.musicOn&&!this.music){const loop=this.loop("music");this.music=loop.source;this.musicGain=loop.gain;}
    if(this.engine){const kmh=state.player.speed*3.6,gear=Math.max(1,Math.min(5,Math.ceil(kmh/43))),rev=Math.max(0,Math.min(1,(kmh-(gear-1)*43)/43));this.engine.playbackRate.setTargetAtTime(.78+rev*1.02,this.context.currentTime,.08);this.engineGain!.gain.setTargetAtTime(this.sfxOn?.32:0,this.context.currentTime,.05);}
    if(this.musicGain)this.musicGain.gain.setTargetAtTime(this.musicOn?.6:0,this.context.currentTime,.05);
  }
  event(event:RaceEvent){if(!this.context||!this.sfxOn||this.disposed)return;if(this.voices.length>=6){try{this.voices.shift()!.stop();}catch{}}const source=this.context.createBufferSource();source.buffer=this.buffer(event.type);source.connect(this.master!);source.onended=()=>{source.disconnect();this.voices=this.voices.filter(v=>v!==source);};this.voices.push(source);source.start();}
  stopLoops(){for(const source of [this.engine,this.music])if(source){try{source.stop();source.disconnect();}catch{}}this.engineGain?.disconnect();this.musicGain?.disconnect();this.engine=this.music=null;this.engineGain=this.musicGain=null;}
  suspend(){this.stopLoops();for(const source of this.voices){try{source.stop();}catch{}}this.voices=[];}
  dispose(){if(this.disposed)return;this.suspend();this.disposed=true;void this.context?.close();this.buffers.clear();}
}
