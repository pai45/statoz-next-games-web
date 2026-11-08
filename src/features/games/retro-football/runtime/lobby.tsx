/* eslint-disable @next/next/no-img-element -- Local identity SVGs also render in offline game bundles. */
import React,{useState} from 'react';
import './lobby.css';

/** Original lobby composition: reference menu hierarchy, existing invented clubs. */
export function ArcadeLobby({atlasUrl,onStart,onMenu}:{atlasUrl:string;onStart:()=>void;onMenu:()=>void}){
    const [help,setHelp]=useState(false);
    return <section className="arcade-lobby" aria-label="Pitchflare XI lobby">
        <div className="lobby-pattern" aria-hidden="true">{Array.from({length:18},(_,i)=><span key={i}>PITCHFLARE XI /</span>)}</div>
        <header className="lobby-header"><span>FOOTBALL ARCADE</span><span>1 PLAYER · EXHIBITION</span></header>
        <div className="lobby-copy"><span className="lobby-kicker">POCKET ARCADE / FOOTBALL</span><img src="../../assets/games/identity/retro-football.svg" alt="" width="110" height="80" style={{objectFit:"contain"}}/><h1>PITCHFLARE<br/><em>XI</em></h1><p>THE MATCH IS YOURS.</p><div className="lobby-format">11 V 11 <span> / </span> 2 × 90 SECONDS</div><button id="start" className="primary lobby-start" onClick={onStart}>KICK OFF <span aria-hidden="true">▶</span></button><button className="utility lobby-help" aria-expanded={help} aria-controls="lobby-details" onClick={()=>setHelp(v=>!v)}>{help?'VIEW MATCHUP':'HOW TO PLAY'}</button></div>
        <div className="lobby-match" id="lobby-details">
            <div className="lobby-section-title">{help?'THREE BUTTON FOOTBALL':'MATCH MENU'}<button className="utility" onClick={onMenu}>SETTINGS</button></div>
            {help?<div className="lobby-instructions"><h2>MOVE. PASS. SHOOT.</h2><p>Steer with the pad. Button labels change with play.</p><dl><div><dt>ATTACK</dt><dd>P pass · L loft · S shoot</dd></div><div><dt>DEFEND</dt><dd>T tackle · S switch · D slide</dd></div><div><dt>CHANCE</dt><dd>Arrow keys aim · S confirms</dd></div></dl><small>KEYBOARD: ARROW KEYS TO MOVE</small></div>:<><div className="lobby-teams">{(['HARBOUR','ORCHARD'] as const).map((team,i)=><article key={team} className={'lobby-team '+(i?'opponent':'player')}><div className="team-plate"><span>{i?'CPU':'P1 / YOU'}</span><b>{team}</b><small>{i?'UNITED':'ATHLETIC'}</small></div><div className="lobby-player" aria-hidden="true"><div style={{backgroundImage:`url("${atlasUrl}")`,backgroundPosition:`-${i?86:2}px -768px`}}/></div><span className="team-role">{i?'LOCAL AI':'YOUR TEAM'}</span></article>)}<b className="lobby-versus" aria-hidden="true">VS</b></div><div className="lobby-match-note">ONE STADIUM. ONE MATCH. ALL TO PLAY FOR.</div></>}
        </div>
        <footer className="lobby-footer"><span>LANDSCAPE + HEADPHONES</span><span>INVENTED CLUBS · LOCAL EXHIBITION</span></footer>
    </section>;
}
