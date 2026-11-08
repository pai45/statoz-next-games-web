import type {GameContext,GameSession,GameSettings} from './contracts';
import {DEFINITION} from './contracts';
export const HOST_VERSION=1;
/** Same runtime for web and future WebView. Navigation/auth/storage belong to host. */
export function createHostBridge(){
    const params=new URL(location.href).searchParams,sessionId=params.get('session')??crypto.randomUUID();
    const embedded=window.parent!==window && params.get('host')==='web';
    const native=(window as unknown as {RetroFootballHost?:{postMessage:(json:string)=>void}}).RetroFootballHost;
    let session:GameSession|null=null,disposed=false,launched=!embedded,resultSequence=0;
    const controller=new AbortController();
    const send=(type:string,payload:unknown={})=>{
        if(disposed)return;
        const message={protocolVersion:HOST_VERSION,gameId:DEFINITION.id,sessionId,type,payload};
        if(embedded)parent.postMessage(message,location.origin);
        else native?.postMessage(JSON.stringify(message));
    };
    const settings=(value:unknown):Partial<GameSettings>|null=>{
        if(!value||typeof value!=='object')return null;
        const r=value as Record<string,unknown>,out:Partial<GameSettings>={};
        for(const k of ['music','sfx'] as const){if(r[k]!==undefined){if(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0||r[k]>1)return null;out[k]=r[k];}}
        return out;
    };
    const receive=(value:unknown)=>{
        if(disposed||!session||!value||typeof value!=='object')return;
        const m=value as Record<string,unknown>;
        if(m.protocolVersion!==HOST_VERSION||m.gameId!==DEFINITION.id||m.sessionId!==sessionId)return;
        if(m.type==='launch'){
            const config=settings(m.payload);if(!config)return;
            launched=true;session.setSettings(config);send('launched',DEFINITION);
        }else if(launched){
            if(m.type==='pause')session.pause();
            else if(m.type==='resume')session.resume();
            else if(m.type==='settings'){const config=settings(m.payload);if(config)session.setSettings(config);}
            else if(m.type==='dispose'){session.dispose();send('disposed');disposed=true;controller.abort();}
        }
    };
    window.addEventListener('message',e=>{if(embedded&&e.source===parent&&e.origin===location.origin)receive(e.data);},{signal:controller.signal});
    // Native host installs this API in its own trusted WebView, never a remote page.
    const adapter={receive};
    if(native)Object.assign(window,{retroFootballHostV1:adapter});
    const context:GameContext={onReady:created=>{session=created;send('ready',DEFINITION);},onResult:result=>send('result',{resultId:sessionId+':'+(++resultSequence),result}),onSettingsChange:value=>send('settings',value),onError:message=>send('error',{message}),onExit:embedded||native?()=>send('exit'):undefined};
    return{context,dispose(){if(disposed)return;disposed=true;controller.abort();session=null;if(native)delete (window as unknown as {retroFootballHostV1?:unknown}).retroFootballHostV1;}};
}
