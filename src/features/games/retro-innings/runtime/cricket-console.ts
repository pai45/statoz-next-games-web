/* eslint-disable @typescript-eslint/no-explicit-any -- Legacy debug state/optional offline host are external boundaries. */
/** A DOM shell around existing controls. Every gameplay button retains its owner,
 * event handlers and simulation action; no secondary input or scoring engine.
 */
import {mountRetroPresentation} from "../../shared/retro/runtime";
export function installCricketConsole() {
  const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const old = document.querySelector('body > main')!;
  const shell = document.createElement('main');
  shell.id = 'console';shell.setAttribute('data-retro-frame','');
  shell.setAttribute('aria-label', 'Creasefire Six handheld cricket console');
  shell.innerHTML = `
    <header class="console-top"><span class="console-wordmark"><img src="../../assets/games/identity/retro-innings.svg" alt="" width="45" height="33" style="vertical-align:middle"> POCKET <b>CREASEFIRE SIX</b></span>
      <span class="console-private">PRIVATE PREVIEW</span>
      <nav aria-label="Console"><button id="console-home">HOME</button><button id="console-menu" aria-haspopup="dialog">SETTINGS</button><button id="console-exit">EXIT</button></nav>
    </header>
    <div class="console-body" data-retro-console>
      <section class="grip grip-left" data-retro-grip="left" aria-label="Movement and running">
        <p data-retro-decoration class="grip-label">DIRECTION</p><div id="console-pad" class="console-pad"></div>
        <div id="console-left-actions" class="console-left-actions"></div>
        <div data-retro-decoration class="speaker" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </section>
      <section class="screen-bay" data-retro-display aria-label="Cricket screen">
        <div class="screen-lip"><span><i></i> MATCH / LIVE</span><span id="console-score" aria-label="Match score"></span></div>
        <div id="console-display"></div>
        <div class="screen-caption"><span id="console-cue"></span><span id="console-over"></span></div>
      </section>
      <section class="grip grip-right" data-retro-grip="right" aria-label="Batting and bowling">
        <p data-retro-decoration class="grip-label">A / B ACTIONS</p><div id="console-strokes" class="console-strokes"></div>
        <div id="console-right-actions" class="console-right-actions"></div>
        <div data-retro-decoration class="speaker" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </section>
    </div>
    <footer class="console-bottom"><span id="console-feedback" role="status"></span><span class="keyboard-hint">A GROUND / B AIR · D-PAD PLACE</span></footer>
    <p class="rotate-hint">Rotate your phone to landscape for the full console.</p>
    <dialog id="console-dialog" aria-labelledby="console-dialog-title"><header><h2 id="console-dialog-title">MATCH MENU</h2><button id="console-close">RETURN TO GAME</button></header>
      <p>Choose a short practice match or a longer limited-over match in the lobby. The toss decides who bats first. The source-style score reads wickets / runs.</p>
      <retro-presentation-settings></retro-presentation-settings><div id="console-settings"></div><details><summary>Controls &amp; reference notes</summary><p>Before contact, A plays a ground shot and B an airborne shot; hold the D-pad for direction. After contact, A runs and B returns. During bowling, tap or drag on the pitch to place the bounce point (or use the D-pad), then press A for a fast ball or B for a slow ball. Field with the D-pad; after pickup, A returns to the keeper end and B to the bowler end. C switches fielders as an accessibility adaptation. Esc pauses.</p><p>Source-derived reference art; private preview. Keeper receives and holds. Keeper pursuit, throw and dive remain unfinished. NES shot angles, bowling speeds, exact timing, field-return assignments and shortened rules are authored or unverified adaptations.</p></details>
      <p id="console-error" role="alert"></p></dialog>`;
  document.body.appendChild(shell);
  const lobby=document.createElement('section');lobby.className='cricket-lobby';lobby.id='cricket-lobby';lobby.setAttribute('aria-label','Creasefire Six home lobby');
  lobby.innerHTML=`<div class="lobby-pattern" aria-hidden="true">${'CREASEFIRE SIX / '.repeat(22)}</div>
    <header><span>CRICKET ARCADE</span><span>1 PLAYER / MATCH SETUP</span></header>
    <div class="lobby-copy"><span class="lobby-kicker">POCKET ARCADE / CRICKET</span><img src="../../assets/games/identity/retro-innings.svg" alt="Creasefire Six" width="110" height="80" style="object-fit:contain"><h1>CREASEFIRE<br><em>SIX</em></h1><p>TAKE YOUR GUARD.</p><div class="lobby-format" id="lobby-format">1 OVER EACH / 3 WICKETS</div>
    <button id="lobby-play" class="lobby-start">PLAY MATCH <span aria-hidden="true">▶</span></button><button id="lobby-help" class="lobby-help" aria-expanded="false" aria-controls="lobby-details">HOW TO PLAY</button><button id="lobby-new" class="lobby-new" hidden>NEW MATCH / END CURRENT</button></div>
    <section class="lobby-match" id="lobby-details"><div class="lobby-match-title"><span id="lobby-panel-title">MATCH MENU</span><button id="lobby-settings" class="lobby-settings">SETTINGS</button></div>
    <div id="lobby-matchup"><div class="lobby-setup"><label>GAME<select id="lobby-mode"><option value="practice">PRACTICE / 1 OVER</option><option value="one-day">ONE-DAY MATCH</option><option value="fast">FAST MATCH</option></select></label><label>OVERS PER SIDE<select id="lobby-overs"><option>10</option><option>20</option><option>30</option><option>40</option><option>50</option></select></label><label>YOUR TEAM<select id="lobby-player-team"></select></label><label>OPPONENT<select id="lobby-opponent-team"></select></label></div><div class="lobby-teams"><article class="lobby-team"><b id="lobby-player-name">HARBOUR</b><canvas id="lobby-batter" width="100" height="100" aria-label="Batter preview"></canvas><small>P1 / TOSS BEFORE PLAY</small></article><article class="lobby-team"><b id="lobby-opponent-name">ORCHARD</b><canvas id="lobby-bowler" width="100" height="100" aria-label="Bowler preview"></canvas><small>LOCAL AI</small></article><strong class="lobby-versus">VS</strong></div><div class="lobby-note" id="lobby-validation">PRACTICE / INVENTED CLUBS</div></div>
    <div id="lobby-instructions" class="lobby-instructions" hidden><h2>BAT. RUN. DEFEND.</h2><p>One-Day selects two of the manual's eight countries and 10, 20, 30, 40 or 50 overs. Fast Match chooses both sides for you. Practice keeps the original one-over, three-wicket trial. Limited-over matches start with a coin toss.</p><p><strong>A / GROUND</strong> keeps the ball low. <strong>B / AIR</strong> lifts it with catch risk. Hold a D-pad direction as you strike to place the shot.</p><p>After contact, <strong>A / B</strong> runs / returns. Only completed runs count.</p><p>During your bowling turn, tap or drag on the pitch to place the bounce point. The D-pad also sets a point. Then press <strong>A / FAST</strong> or <strong>B / SLOW</strong> to deliver. Field with the pad; after pickup A throws to keeper end and B to bowler end.</p><p>SNES match features are being added around the previously chosen NES A/B action controls. Squad editing, World Series, Test Match and two-player play are still in development.</p></div></section>
    <footer><span>LANDSCAPE / HANDHELD CRICKET</span><span>PRIVATE REFERENCE PREVIEW</span></footer>`;
  get('console-display').closest('.console-body')!.appendChild(lobby);
  const toss=document.createElement('section');toss.id='cricket-toss';toss.setAttribute('role','dialog');toss.setAttribute('aria-modal','true');toss.setAttribute('aria-labelledby','toss-title');toss.hidden=true;
  toss.innerHTML='<h2 id="toss-title">COIN TOSS</h2><p id="toss-copy">CALL HEADS OR TAILS</p><div id="toss-call"><button id="toss-heads">HEADS</button><button id="toss-tails">TAILS</button></div><div id="toss-choice" hidden><button id="toss-bat">BAT FIRST</button><button id="toss-bowl">BOWL FIRST</button></div><button id="toss-continue" hidden>START MATCH</button><button id="toss-cancel">BACK TO SETUP</button>';
  document.body.appendChild(toss);
  const move = (id: string, parent: string, label?: string) => {
    const element = get(id); if (!element) return;
    if (label) { element.setAttribute('aria-label', label); element.dataset.consoleLabel = label; }
    get(parent).appendChild(element);
  };
  for (const [id, label] of [['up','Up'],['left','Left'],['right','Right'],['down','Down']]) move(id, 'console-pad', label);
  // The two NES action buttons are the only active stroke controls.
  for (const id of ['nesA','nesB']) move(id, 'console-strokes');
  for (const id of ['primary','switch']) move(id, 'console-right-actions');
  move('viewport','console-display');
  // A hidden legacy host retains IDs used by the original state renderer. There is
  // still one control of each kind and one authoritative input binding.
  old.setAttribute('aria-hidden', 'true'); (old as HTMLElement).hidden = true;
  for (const id of ['pause','restart','bowlControls','sfx','music','volume','record','fatal']) move(id,'console-settings');
  const volume = get<HTMLInputElement>('volume'); volume.setAttribute('aria-label','Audio volume');
  const volumeLabel=document.createElement('label');volumeLabel.textContent='Audio volume';volume.before(volumeLabel);volumeLabel.appendChild(volume);
  const dialog = get<HTMLDialogElement>('console-dialog');
  let inLobby=true;
  let before: HTMLElement | null = null;
  let resumeOnClose = false;
  const pauseIfPlaying = () => {
    const s = window.gameState as any;
    if (s?.status === 'playing' && !s.paused) get<HTMLButtonElement>('pause').click();
  };
  const openMenu = () => { before = document.activeElement as HTMLElement;const s=window.gameState as any;resumeOnClose=s?.status==='playing'&&!s.paused;pauseIfPlaying(); if (!dialog.open) dialog.showModal(); };
  const closeMenu = () => { dialog.close();const s=window.gameState as any;if(resumeOnClose&&s?.paused)get<HTMLButtonElement>('pause').click();resumeOnClose=false;before?.focus(); };
  get('console-menu').onclick = openMenu;
  get('lobby-settings').onclick = openMenu;
  get('console-close').onclick = closeMenu;
  // Closing an explicitly opened menu resumes only the pause owned by that menu.
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(); }
  });
  get('console-exit').onclick = () => {
    pauseIfPlaying();
    const embedded = (window as any).__STATOZ_HOST__;
    if (embedded) embedded.emit('exit');
    else if (window.parent !== window) window.parent.postMessage({type:'statoz.next.games-web.retro-innings:exit',version:1},window.location.origin);
    else { openMenu(); get('console-error').textContent='Standalone preview. Close this tab to exit, or return to the game.'; }
  };
  const teams=((window as any).matchLab.teams as string[]);
  for(const id of ['lobby-player-team','lobby-opponent-team'])get<HTMLSelectElement>(id).innerHTML=teams.map(name=>`<option value="${name}">${name.toUpperCase()}</option>`).join('');
  get<HTMLSelectElement>('lobby-player-team').value='Australia';
  get<HTMLSelectElement>('lobby-opponent-team').value='England';
  let tossDecision:number|null=null;
  const syncSetup=()=>{
    tossDecision=null;
    const mode=get<HTMLSelectElement>('lobby-mode').value,practice=mode==='practice',fast=mode==='fast';
    const home=get<HTMLSelectElement>('lobby-player-team').value,away=get<HTMLSelectElement>('lobby-opponent-team').value;
    get<HTMLSelectElement>('lobby-overs').disabled=practice;
    get<HTMLSelectElement>('lobby-player-team').disabled=practice||fast;
    get<HTMLSelectElement>('lobby-opponent-team').disabled=practice||fast;
    get('lobby-player-name').textContent=practice?'HARBOUR':fast?'RANDOM':home.toUpperCase();
    get('lobby-opponent-name').textContent=practice?'ORCHARD':fast?'RANDOM':away.toUpperCase();
    get('lobby-format').textContent=practice?'1 OVER EACH / 3 WICKETS':get<HTMLSelectElement>('lobby-overs').value+' OVERS EACH / 10 WICKETS';
    get('lobby-validation').textContent=mode==='one-day'&&home===away?'CHOOSE TWO DIFFERENT TEAMS':practice?'PRACTICE / INVENTED CLUBS':fast?'COMPUTER CHOOSES TWO SIDES':'SELECTED TEAMS / INVENTED PLAYER ROSTER';
  };
  for(const id of ['lobby-mode','lobby-overs','lobby-player-team','lobby-opponent-team'])get(id).addEventListener('change',syncSetup);
  syncSetup();
  const configureFromLobby=()=>{
    const mode=get<HTMLSelectElement>('lobby-mode').value;
    const entropy=new Uint32Array(1);crypto.getRandomValues(entropy);
    const config={mode,overs:Number(get<HTMLSelectElement>('lobby-overs').value),playerTeam:get<HTMLSelectElement>('lobby-player-team').value,opponentTeam:get<HTMLSelectElement>('lobby-opponent-team').value,playerBatInnings:tossDecision??1,seed:entropy[0]};
    if((window as any).matchLab.configureMatch(config))return true;
    get('lobby-validation').textContent='CHOOSE TWO DIFFERENT TEAMS';return false;
  };
  const applyLobby=()=>{
    shell.dataset.lobby=String(inLobby);lobby.hidden=!inLobby;
    for(const element of Array.from(shell.querySelectorAll<HTMLElement>('.grip,.screen-bay')))element.inert=inLobby;
    const s=window.gameState as any,continuing=s?.status==='playing'||s?.status==='intermission';
    get('lobby-play').innerHTML=(continuing?'RESUME MATCH':'PLAY MATCH')+' <span aria-hidden="true">▶</span>';
    get('lobby-new').hidden=!continuing;
    get('console-close').textContent=inLobby?'BACK TO LOBBY':'RETURN TO GAME';
    get('console-dialog-title').textContent=inLobby?'LOBBY SETTINGS':'MATCH MENU';
  };
  const start=()=>{
    if(dialog.open)return;const s=window.gameState as any;
    if(s.status!=='playing'&&s.status!=='intermission'&&get<HTMLSelectElement>('lobby-mode').value==='one-day'&&get<HTMLSelectElement>('lobby-player-team').value===get<HTMLSelectElement>('lobby-opponent-team').value){get('lobby-validation').textContent='CHOOSE TWO DIFFERENT TEAMS';return;}
    if(s.status!=='playing'&&s.status!=='intermission'&&get<HTMLSelectElement>('lobby-mode').value!=='practice'&&tossDecision===null){toss.hidden=false;get('toss-heads').focus();return;}
    if(s.status==='result')get<HTMLButtonElement>('restart').click();
    if((window.gameState as any).status==='idle'&&!configureFromLobby())return;
    tossDecision=null;
    toss.hidden=true;
    get('toss-call').hidden=false;get('toss-choice').hidden=true;get('toss-continue').hidden=true;get('toss-copy').textContent='CALL HEADS OR TAILS';
    inLobby=false;applyLobby();
    if((window.gameState as any).paused)get<HTMLButtonElement>('pause').click();
    if((window.gameState as any).status==='idle')get<HTMLButtonElement>('primary').click();
    get('primary').focus();
  };
  get('lobby-play').onclick=start;
  get('lobby-new').onclick=()=>{get<HTMLButtonElement>('restart').click();tossDecision=null;start();};
  const callCoin=(calledHeads:boolean)=>{
    const coin=new Uint8Array(1);crypto.getRandomValues(coin);const heads=(coin[0]&1)===0;
    get('toss-call').hidden=true;get('toss-copy').textContent=(heads?'HEADS':'TAILS')+' · '+(heads===calledHeads?'YOU WON. CHOOSE WHO BATS FIRST.':'OPPONENT WON THE TOSS.');
    if(heads===calledHeads)get('toss-choice').hidden=false;
    else{const choice=new Uint8Array(1);crypto.getRandomValues(choice);tossDecision=(choice[0]&1)===0?1:2;get('toss-copy').textContent+=' '+(tossDecision===1?'YOU BAT FIRST.':'YOU BOWL FIRST.');get('toss-continue').hidden=false;}
  };
  get('toss-heads').onclick=()=>callCoin(true);get('toss-tails').onclick=()=>callCoin(false);
  get('toss-bat').onclick=()=>{tossDecision=1;get('toss-choice').hidden=true;get('toss-copy').textContent='YOU BAT FIRST.';get('toss-continue').hidden=false;};
  get('toss-bowl').onclick=()=>{tossDecision=2;get('toss-choice').hidden=true;get('toss-copy').textContent='YOU BOWL FIRST.';get('toss-continue').hidden=false;};
  get('toss-continue').onclick=start;
  const cancelToss=()=>{toss.hidden=true;tossDecision=null;get('toss-call').hidden=false;get('toss-choice').hidden=true;get('toss-continue').hidden=true;get('toss-copy').textContent='CALL HEADS OR TAILS';get('lobby-play').focus();};
  get('toss-cancel').onclick=cancelToss;toss.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelToss();return;}
    if(e.key==='Tab'){
      const buttons=Array.from(toss.querySelectorAll<HTMLButtonElement>('button')).filter(button=>!button.hidden&&!button.closest('[hidden]'));
      const first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  get('console-home').onclick=()=>{pauseIfPlaying();inLobby=true;applyLobby();get('lobby-play').focus();};
  get('lobby-help').onclick=()=>{
    const help=get('lobby-instructions'),show=help.hidden;help.hidden=!show;get('lobby-matchup').hidden=show;
    get('lobby-help').setAttribute('aria-expanded',String(show));get('lobby-help').textContent=show?'VIEW MATCHUP':'HOW TO PLAY';get('lobby-panel-title').textContent=show?'HOW TO PLAY':'MATCH MENU';
  };
  // Scope document shortcuts while the lobby owns input. Native settings/button
  // keys still work; gameplay cannot begin behind the home screen.
  const lobbyKeys=(event:KeyboardEvent)=>{
    if(!inLobby||dialog.open||!toss.hidden)return;
    if((event.target as HTMLElement).closest('button,input,select,summary')){
      if(!['Space','Enter','Tab','ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();}return;
    }
    if(['Space','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyB','KeyN','KeyC','Escape'].includes(event.code)){
      event.preventDefault();event.stopImmediatePropagation();if(!event.repeat&&['Space','Enter'].includes(event.code))start();
    }
  };
  document.addEventListener('keydown',lobbyKeys,true);
  const art=(window as any).presentationBridge;
  for(const [id,record,image]of [['lobby-batter',art.data.families.leg.guard,art.images.bat],['lobby-bowler',art.data.actors['bowler-ready'],art.images.actors]]){
    const c=get<HTMLCanvasElement>(id),ctx=c.getContext('2d')!,r=record as any,a=r.atlas,scale=Math.min(2,90/a[3]);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,...a as [number,number,number,number],(100-a[2]*scale)/2,96-a[3]*scale,a[2]*scale,a[3]*scale);
  }
  applyLobby();
  const fit = () => {
    const box = get('console-display').getBoundingClientRect();
    const available = Math.min(box.width / 256, box.height / 224);
    // Integer scale when there is room. Fractional nearest-neighbour fitting on
    // short phones avoids the old 1x/224px cap while preserving 8:7 geometry.
    const scale = available >= 2 ? Math.floor(available) : available;
    for (const id of ['game','referenceGame']) {
      const canvas = get<HTMLCanvasElement>(id);
      if (canvas) { canvas.style.width = Math.floor(256 * scale) + 'px'; canvas.style.height = Math.floor(224 * scale) + 'px'; }
    }
  };
  const observer=new ResizeObserver(fit);observer.observe(get('console-display'));
  const sync = () => {
    const s=window.gameState as any;if(!s)return;
    const batting=s.innings===s.match.playerBatInnings;
    get('console-score').textContent=(batting?s.match.playerTeam:s.match.opponentTeam).toUpperCase()+' '+s.wickets+'/'+s.runs+' WKTS/RUNS';
    get('console-over').textContent=Math.floor(s.legal/6)+'.'+s.legal%6+' OV'+(s.target?' · T'+s.target:'');
    get('console-cue').textContent=s.paused?'PAUSED':s.battingCue?.text||'';
    get('console-feedback').textContent=s.message;
    const keyboardHint=shell.querySelector<HTMLElement>('.keyboard-hint');
    if(keyboardHint)keyboardHint.textContent=batting?'A GROUND / B AIR · D-PAD PLACE':'TAP PITCH → A FAST / B SLOW';
    shell.dataset.innings=String(s.innings);shell.dataset.phase=s.phase;shell.dataset.paused=String(s.paused);
    get('switch').hidden=batting||!s.ball?.hit;
    applyLobby();
    fit();
  };
  const disposePresentation=mountRetroPresentation(shell,()=>window.dispatchEvent(new Event('retro-pause')));
  const dispose=()=>{disposePresentation();observer.disconnect();document.removeEventListener('keydown',lobbyKeys,true);};
  window.addEventListener('pagehide',dispose,{once:true});
  fit();sync();return {fit,sync,dispose};
}
