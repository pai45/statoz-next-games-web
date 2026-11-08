import {mountRetroPresentation} from '../../shared/retro/runtime';
import {RetroPresentationSettings} from '../../shared/retro/settings';
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FootballSession} from './session';
import {loadAssets} from './assets';
import {bindInput} from './input';
import {createHostBridge} from './host';
import {DEFINITION,type GameContext} from './contracts';
import {VIEW} from './presentation';
import './handheld.css';
import {ArcadeLobby} from './lobby';
import './arcade-skin.css';

type Debug={session:FootballSession|null;ready:boolean;mounts:number;disposals:number;lastDisposal:ReturnType<FootballSession['diagnostics']>|null;step:(n:number)=>void;restart:()=>void;dispose:()=>void;remount:()=>void};
declare global{interface Window{productionLab:Debug;gameState:unknown;}}
const debug:Debug={session:null,ready:false,mounts:0,disposals:0,lastDisposal:null,step:n=>debug.session?.step(n),restart:()=>debug.session?.restart(),dispose:()=>{},remount:()=>{}};
window.productionLab=debug;


function Game({context,manifestUrl}:{context:GameContext;manifestUrl:URL}){
    const root=useRef<HTMLElement>(null),canvas=useRef<HTMLCanvasElement>(null),session=useRef<FootballSession|null>(null);
    const [engine,setEngine]=useState<FootballSession|null>(null);
    const [revision,redraw]=useState(0),[mount,remount]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState('');
    const [menu,setMenu]=useState(false);
    const [reference,setReference]=useState(false),[atlasUrl,setAtlasUrl]=useState('');
    useEffect(()=>{engine?.setFraming(reference?'reference':'wide');},[engine,reference]);
    const menuButton=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDivElement>(null);
    useEffect(()=>{
        const abort=new AbortController();let unbind=()=>{},unsubscribe=()=>{};debug.ready=false;
        loadAssets(manifestUrl,abort.signal).then(({manifest,image})=>{
            if(abort.signal.aborted)return;
            const created=new FootballSession(canvas.current!,manifest,image,{...context,onError:message=>{setError(message);setReady(false);debug.ready=false;context.onError?.(message);}});
            setAtlasUrl(image.src);session.current=created;setEngine(created);debug.session=created;debug.mounts++;
            unbind=bindInput(root.current!,created);unsubscribe=created.subscribe(()=>{window.gameState=created.sim.snapshot();redraw(n=>n+1);});
            window.gameState=created.sim.snapshot();context.onReady?.(created);setReady(true);debug.ready=true;
        }).catch(cause=>{if(!abort.signal.aborted){setError(cause instanceof Error?cause.message:'The game could not load.');context.onError?.('Retro Football could not load.');}});
        return()=>{abort.abort();unbind();unsubscribe();const old=session.current;if(old){old.dispose();debug.lastDisposal=old.diagnostics();debug.disposals++;}session.current=null;debug.session=null;debug.ready=false;};
    },[context,manifestUrl,mount]);
    const reload=()=>{setReady(false);setError('');setEngine(null);remount(n=>n+1);};
    useEffect(()=>{debug.remount=()=>{setReady(false);setError('');setEngine(null);remount(n=>n+1);};return()=>{debug.remount=()=>{};};},[]);
    useEffect(()=>mountRetroPresentation(root.current!,()=>session.current?.pause()),[]);
    useEffect(()=>{
        if(!menu)return;
        const element=dialog.current;const items=element?.querySelectorAll<HTMLElement>('button,input,select');items?.[0]?.focus();
        const key=(e:KeyboardEvent)=>{
            if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setMenu(false);menuButton.current?.focus();}
            if(e.key==='Tab'&&items?.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
        };
        document.addEventListener('keydown',key,true);return()=>document.removeEventListener('keydown',key,true);
    },[menu]);
    const s=engine?.sim.state,playing=s?.status==='playing',remaining=s?Math.max(0,90-Math.floor(s.halfTicks/60)):90;
    const attack=engine?.sim.attackingControls()??true;
    const buttons=attack?[{type:'pass',key:'P',label:'PASS'},{type:'loft',key:'L',label:'LOFT'},{type:'shoot',key:'S',label:'SHOOT'}] as const:[{type:'tackle',key:'T',label:'TACKLE'},{type:'switch',key:'S',label:'SWITCH'},{type:'slide',key:'D',label:'SLIDE'}] as const;
    const lobby=ready&&!error&&s?.status==='ready';
    const blocked=!ready||!playing||s?.phase==='goal'||!!s?.shotView&&s.shotView.phase!=='aim';
    const status=error?'LOAD ERROR':!ready?'LOADING':s?.status==='playing'?s.shotView?({aim:'CHANCE',windup:'SHOOT',flight:'SHOT',parry:'SAVE',goal:'GOAL!'})[s.shotView.phase]:s.phase==='restart'?'KICK OFF':s.phase==='goal'?'GOAL!':'EXHIBITION':s?.status.toUpperCase();
    const start=()=>{setMenu(false);if(s?.status==='paused')session.current?.resume();else session.current?.start();};
    const openMenu=()=>{session.current?.pause();setMenu(true);};
    const exit=()=>{session.current?.pause();if(context.onExit)context.onExit();else{session.current?.restart();setMenu(false);}};
    return <main ref={root} data-retro-frame className={'handheld '+(reference?'reference-view ':'')+(lobby?'in-lobby':'')} data-render={revision}>
        <div className="console-edge"><div className="console-body" data-retro-console>
            <header className="console-brand"><span>POCKET<span className="brand-sub">SPORTS ARCADE</span></span><span className="brand-game">PITCHFLARE XI</span><span className="power-light">POWER <i/></span></header>
            <aside className="left-grip" data-retro-grip="left" aria-label="Directional controls">
                <span data-retro-decoration className="grip-caption">DIRECTION</span>
                <div className="dpad" data-stick aria-label="Eight-way movement pad" aria-disabled={blocked}>{(['up','left','down','right'] as const).map(direction=><button key={direction} className={'direction '+direction} data-hold={direction} disabled={blocked} data-pressed={s?.held[direction]?'true':undefined} aria-label={'Move '+direction}>{({up:'▲',left:'◀',down:'▼',right:'▶'})[direction]}</button>)}<span className="pad-centre"/></div>
                <div data-retro-decoration className="speaker" aria-hidden="true"><i/><i/><i/><i/></div>
                <span data-retro-decoration className="control-help">ARROW KEYS</span>
            </aside>
            <section className="screen-bezel" data-retro-display aria-label="Game display"><div className="glass">
                <canvas key={mount} width={VIEW.width} height={VIEW.height} ref={canvas} aria-label="Retro Football live pitch"/>
                <div className="scoreboard" aria-label="Match score and clock"><span className="team-name harbour">HARBOUR <b id="home-score">{s?.score[0]??0}</b></span><span className="clock-block"><small>HALF {s?.half??1}</small><b id="clock">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</b></span><span className="team-name orchard"><b id="away-score">{s?.score[1]??0}</b> ORCHARD</span></div>
                <span id="state" className="game-state">{status}</span>
                {s?.phase==='goal'&&<div className="goal-banner">GOAL!</div>}
                <div className="radar" hidden={!!s?.shotView} aria-label="Pitch overview"><i className="halfway"/>{s?.players.map(p=><i key={p.id} className={'dot '+(p.team===0?'harbour':'orchard')+(p.id===s.selected?' selected':'')} style={{left:p.x/105*100+'%',top:p.y/68*100+'%'}}/>)}{s&&<i className="radar-ball" style={{left:s.ball.x/105*100+'%',top:s.ball.y/68*100+'%'}}/>}</div>
                <p className="match-message" id="message" role="status">{error||s?.message||'Loading the stadium…'}</p>
                {(!ready||error||s?.status!=='playing')&&!lobby&&!menu&&<div className="game-overlay"><section className="title-card">
                    <span className="cartridge-label">ARCADE FOOTBALL</span><h1>{s?.status==='complete'?'FULL TIME':s?.status==='halftime'?'HALF TIME':s?.status==='paused'?'PAUSED':'PITCHFLARE XI'}</h1>
                    <p>{error||(!ready?'Loading your cartridge…':s?.status==='complete'?`${s.score[0]} : ${s.score[1]} · ${s.score[0]===s.score[1]?'DRAW':s.score[0]>s.score[1]?'HARBOUR WINS':'ORCHARD WINS'}`:s?.status==='halftime'?'Switch ends. One more half.':'HARBOUR ATHLETIC × ORCHARD UNITED')}</p>
                    {error?<button id="retry" className="primary" onClick={reload}>RETRY CARTRIDGE</button>:s?.status==='complete'?<button id="restart" className="primary" onClick={()=>{session.current?.restart();session.current?.start();}}>REMATCH</button>:<button id="start" className="primary" disabled={!ready} onClick={start}>{s?.status==='paused'?'RESUME MATCH':s?.status==='halftime'?'SECOND HALF':'KICK OFF'}</button>}
                    <small>11 V 11 · TWO 90-SECOND HALVES</small>
                </section></div>}
            </div></section>
            <aside className="right-grip" data-retro-grip="right" aria-label="Action controls"><span data-retro-decoration className="grip-caption">THREE BUTTON PLAY</span>
                <div className="action-cluster">{buttons.map(({type,key,label},i)=><button key={i} className={'action action-'+(['A','B','C'][i])} id={['A','B','C'][i]} data-action={type} disabled={blocked||!!s?.shotView&&type!=='shoot'} aria-label={label+' ('+key+')'} onClick={e=>{if(e.detail===0)session.current?.dispatch({type});}}><b>{key}</b><small>{label}</small></button>)}</div>
                <span data-retro-decoration className="control-help">{attack?'P / L / S':'T / S / D'}</span>
            </aside>
            {lobby&&<ArcadeLobby atlasUrl={atlasUrl} onStart={start} onMenu={openMenu}/>}
            <footer className="console-footer"><button ref={menuButton} className="utility" id="menu" onClick={openMenu}>SETTINGS</button><button className="utility" id="pause" disabled={!ready||!['playing','paused'].includes(s?.status||'')} onClick={()=>session.current?.dispatch({type:'pause'})}>{s?.status==='paused'?'RESUME':'PAUSE'}</button><span className="footer-status">{s?.half===2?'◀':'▶'} HARBOUR ATTACKS {s?.half===2?'LEFT':'RIGHT'}</span><button className="utility" id="exit" onClick={exit}>EXIT</button></footer>
        </div></div>
        {menu&&<div className="menu-backdrop"><div ref={dialog} className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="menu-title"><span className="cartridge-label">POCKET ARCADE</span><h2 id="menu-title">{lobby?'LOBBY SETTINGS':'MATCH MENU'}</h2><button className="primary" onClick={()=>{setMenu(false);if(s?.status==='paused')session.current?.resume();}}>{lobby?'BACK TO LOBBY':'BACK TO GAME'}</button>
            <RetroPresentationSettings/><div className="audio-settings">{(['music','sfx'] as const).map(key=><label key={key}>{key==='music'?'Music':'Sound effects'}<input aria-label={key==='music'?'Music volume':'Sound effects volume'} type="range" min="0" max="1" step=".05" value={engine?.settings[key]??.4} onChange={e=>{session.current?.audio.unlock();session.current?.setSettings({[key]:Number(e.currentTarget.value)});redraw(n=>n+1);}}/></label>)}</div>
            <button id="framing" className="utility" aria-pressed={reference} onClick={()=>setReference(v=>!v)}>VIEW: {reference?'REFERENCE 320 × 224':'WIDE HANDHELD'}</button>
            <p>Slide your thumb across the pad for eight-way movement. Keep steering while pressing A, B or C.</p>
            <p>Move / aim: arrow keys. Attack: P pass, L loft, S shoot. Defence: T tackle, S switch, D slide. S confirms a CHANCE shot.</p><p className="review-note">Invented clubs. Source-derived reference art. Original sound. Local exhibition.</p>
            {!lobby&&<button className="utility" onClick={()=>{session.current?.restart();setMenu(false);}}>RESTART MATCH</button>}<button className="utility" onClick={exit}>EXIT TO GAMES</button>
        </div></div>}
    </main>;
}
export function mountFootball(element:HTMLElement,context:GameContext={},manifestUrl=new URL('./assets.json',import.meta.url)){
    const root=createRoot(element);let disposed=false;root.render(<Game context={context} manifestUrl={manifestUrl}/>);
    return{definition:DEFINITION,dispose(){if(disposed)return;disposed=true;root.unmount();}};
}
const element=document.getElementById('game');if(element){const bridge=createHostBridge(),mounted=mountFootball(element,bridge.context,new URL('./assets.json',import.meta.url));debug.dispose=()=>{bridge.dispose();mounted.dispose();};}
