/* Authored local host boundary. Original game state is owned by Construct. */
(()=>{
 const params=new URLSearchParams(location.search),session=params.get('session')||crypto.randomUUID(),scope=/^[a-f0-9]{24}$/.test(params.get('scope')||'')?params.get('scope'):'local-guest',prefix=`statoz.penalty-shooters-2.${scope}.`;
 let disposed=false;
 const emit=(type,payload={})=>{if(!disposed)parent.postMessage({protocol:'penalty-shooters-2-local',version:1,session,type,payload},location.origin);};
 const audioContexts=new Set();
 for(const key of ['AudioContext','webkitAudioContext']){const Native=window[key];if(Native)window[key]=new Proxy(Native,{construct(target,args,newTarget){const context=Reflect.construct(target,args,newTarget);audioContexts.add(context);return context;}});}
 const debug=window.__penaltyLocalDebug={ready:false,paused:false,scope,ticks:0,layout:'',globalVars:{},remote:[],gameplayStarted:false};
 const storage=window.localStorage,keys=()=>Object.keys(storage).filter(k=>k.startsWith(prefix));
 const scoped={getItem:k=>storage.getItem(prefix+k),setItem:(k,v)=>storage.setItem(prefix+k,String(v)),removeItem:k=>storage.removeItem(prefix+k),clear:()=>keys().forEach(k=>storage.removeItem(k)),key:i=>keys()[i]?.slice(prefix.length)??null,get length(){return keys().length;}};
 Object.defineProperty(window,'localStorage',{value:scoped});
 const factory=window.indexedDB,open=factory.open.bind(factory),drop=factory.deleteDatabase.bind(factory),databases=factory.databases?.bind(factory);
 factory.open=(name,...args)=>open(prefix+name,...args);factory.deleteDatabase=(name,...args)=>drop(prefix+name,...args);if(databases)factory.databases=async()=> (await databases()).filter(db=>db.name.startsWith(prefix));
 const sameOrigin=value=>{const url=new URL(value,location.href);return ['blob:','data:'].includes(url.protocol)||url.origin===location.origin;};
 const originalFetch=fetch.bind(window);window.fetch=(input,options)=>{const url=typeof input==='string'||input instanceof URL?String(input):input.url;if(!sameOrigin(url)){debug.remote.push(url);return Promise.reject(Error('Online services are disabled in local play.'));}return originalFetch(input,options);};
 const originalOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...args){if(!sameOrigin(url)){debug.remote.push(String(url));throw Error('Online service unavailable in local play.');}return originalOpen.call(this,method,url,...args);};
 window.open=()=>null;window.WebSocket=class{constructor(){throw Error('Online play unavailable in local mode.');}};
 let runtime=null,lastResult='',previousLayout='';
 const snapshot=()=>{if(!runtime)return;debug.ticks=runtime.tickCount;try{debug.layout=runtime.layout.name;}catch{}debug.globalVars=Object.fromEntries(Object.keys(runtime.globalVars).map(k=>[k,runtime.globalVars[k]]));};
 window.installPenaltyLocalRuntime=()=>runOnStartup(async r=>{runtime=r;window.__penaltyNativeRuntime=r;r.addEventListener('beforeprojectstart',()=>{debug.ready=true;emit('ready');});r.addEventListener('tick',()=>{snapshot();if(previousLayout==='ballFlight3'&&/beforeMatchGroups|knockout|trophy/i.test(debug.layout)){const g=debug.globalVars,id=JSON.stringify([debug.layout,g.COMPETITION_ROUND,g.tempResultPlayer,g.tempResultCPU,g.myTeamID]);if(id!==lastResult){lastResult=id;emit('result',{id:crypto.randomUUID(),score:g.tempResultPlayer,opponentScore:g.tempResultCPU,team:g.myTeamID,round:g.COMPETITION_ROUND,mode:'native-shootout'});}}previousLayout=debug.layout;});});
 const pause=()=>{if(disposed)return;runtime?.sdk.setSuspended(true);debug.paused=true;};const resume=()=>{if(disposed)return;runtime?.sdk.setSuspended(false);debug.paused=false;};
 // This shipped runtime has no supported RuntimeInterface.Release path. Suspend
 // through its public SDK and suspend audio; iframe removal discards the window.
 // Closing audio here races Construct's queued suspension callback.
 addEventListener('message',event=>{const m=event.data;if(event.source!==parent||event.origin!==location.origin||m?.protocol!=='penalty-shooters-2-local'||m.version!==1||m.session!==session||disposed)return;if(m.type==='pause')pause();else if(m.type==='resume')resume();else if(m.type==='dispose'){pause();disposed=true;debug.disposed=true;for(const context of audioContexts)if(context.state!=='closed')void context.suspend().catch(()=>{});audioContexts.clear();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();emit('interrupted');}});
 addEventListener('error',()=>emit('error',{message:'The local game could not continue.'}));
})();
