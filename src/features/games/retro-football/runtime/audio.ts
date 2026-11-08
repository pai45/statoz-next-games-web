import type { Contact, GameSettings } from './contracts';
export type AudioStatus = 'locked'|'loading'|'ready'|'unavailable'|'disposed';
const cues=['kick','tackle','save','whistle','ui','goal','result','menu','crowd'] as const;
type Cue=typeof cues[number];
/** Original assets; one event cursor lives in the session, with a bounded mix here. */
export class FootballAudio {
    status:AudioStatus='locked';
    private ctx:AudioContext|null=null;
    private master:GainNode|null=null;
    private limiter:DynamicsCompressorNode|null=null;
    private buffers=new Map<Cue,AudioBuffer>();
    private active=new Set<AudioBufferSourceNode>();
    private loop:AudioBufferSourceNode|null=null;
    private mode='ready';
    private settings:GameSettings={music:.4,sfx:.7};
    private disposed=false;
    private generation=0;
    private loading:Promise<void>|null=null;
    private played:Partial<Record<Cue,number>>={};
    private controller=new AbortController();
    constructor(private base=new URL('./audio/',import.meta.url)){}
    unlock(){
        if(this.disposed||this.status==='unavailable'||this.mode==='hidden')return;
        try{
            if(!this.ctx){
                this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.38;
                this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-12;this.limiter.knee.value=8;this.limiter.ratio.value=12;this.limiter.attack.value=.003;this.limiter.release.value=.12;
                this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);
            }
            void this.ctx.resume().catch(()=>this.fail());
            if(!this.loading){
                this.status='loading';const ctx=this.ctx;
                this.loading=Promise.all(cues.map(async id=>{const r=await fetch(new URL(id+'.wav',this.base),{signal:this.controller.signal});if(!r.ok)throw Error('Audio unavailable');const decoded=await ctx.decodeAudioData(await r.arrayBuffer());if(!this.disposed)this.buffers.set(id,decoded);})).then(()=>{if(!this.disposed){this.status='ready';this.sync(this.mode,true);}}).catch(()=>{if(!this.disposed)this.fail();});
            }
        }catch{this.fail();}
    }
    private fail(){this.status='unavailable';this.stop();}
    private play(id:Cue,loop=false){
        if(!this.ctx||!this.master||this.status!=='ready'||this.disposed)return null;
        const buffer=this.buffers.get(id),volume=id==='menu'||id==='result'?this.settings.music:this.settings.sfx*(id==='crowd'?.32:1);
        if(!buffer||volume===0||this.active.size>=4)return null;
        const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=loop;gain.gain.value=volume;source.connect(gain);gain.connect(this.master);this.active.add(source);
        source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();if(this.loop===source)this.loop=null;};source.start();this.played[id]=(this.played[id]??0)+1;return source;
    }
    private stop(){this.generation++;for(const source of this.active){try{source.stop();}catch{}source.disconnect();}this.active.clear();this.loop=null;}
    sync(mode:string,force=false){
        if(this.disposed)return;
        if(!force&&mode===this.mode)return;
        const returning=this.mode==='hidden'||this.mode==='paused';
        this.mode=mode;this.stop();
        if(mode==='paused'||mode==='hidden'){void this.ctx?.suspend().catch(()=>{});return;}
        if(this.ctx?.state==='suspended')void this.ctx.resume().catch(()=>{});
        if(mode==='playing')this.loop=this.play('crowd',true);
        else if(mode==='ready'||mode==='halftime'){this.loop=this.play('menu',true);if(mode==='halftime')this.play('whistle');}
        else if(mode==='complete'&&!returning){this.play('whistle');this.play('result');}
    }
    event(event:Readonly<Contact>){
        if(this.mode!=='playing')return;
        const kind=event.kind;
        if(kind==='pass'||kind==='shot'||kind==='keeper-punt')this.play('kick');
        else if(kind==='tackle-contact')this.play('tackle');
        else if(kind==='save')this.play('save');
        else if(kind==='goal')this.play('goal');
        else if(kind==='restart-awarded'||kind==='second-half')this.play('whistle');
    }
    ui(){this.play('ui');}
    setSettings(settings:GameSettings){this.settings={...settings};if(this.mode==='complete')this.stop();else this.sync(this.mode,true);}
    diagnostics(){return{status:this.status,active:this.active.size,context:this.ctx?.state??'none',played:{...this.played}};}
    dispose(){if(this.disposed)return;this.disposed=true;this.controller.abort();this.stop();this.buffers.clear();this.master?.disconnect();this.limiter?.disconnect();void this.ctx?.close().catch(()=>{});this.status='disposed';}
}
