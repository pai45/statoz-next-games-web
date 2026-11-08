// Generated from the reviewed candidate runtime; one authoritative cricket simulation.
export function createCricketSimulation(DATA,environment={}){
const STEP=1000/120,G=.00022,RADIUS=240,CENTER={x:430,y:420},FAR={x:434,y:350},NEAR={x:434,y:475};
const MATCH_TEAMS=['Australia','England','India','New Zealand','Pakistan','South Africa','Sri Lanka','West Indies'];
const held=environment.held||Object.fromEntries(['left','right','up','down','loft','power'].map(k=>[k,new Set()])),settings=environment.settings||{line:'leg',style:'pace'};let S;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),mix=(a,b,t)=>a+(b-a)*t;
const render=()=>environment.onChange?.(S),restorePlayView=()=>environment.restorePlayView?.();
function clearHeld(){for(const set of Object.values(held))set.clear();}
function event(type,data={}){S.events.push({type,time:S.time,innings:S.innings,...data});if(S.events.length>180)S.events.shift();environment.onEvent?.(type,data,S);}
function random(){S.seed=(Math.imul(S.seed,1664525)+1013904223)>>>0;return S.seed/4294967296;}
// Original balanced eleven-player formation; positions are not recovered source coordinates.
function makeFielders(){return[['Keeper',424,245],['Slip',485,318],['Point',575,365],['Cover',555,455],['Mid off',500,540],['Mid on',355,540],['Square leg',285,410],['Fine leg',315,290],['Third man',550,260],['Long on',365,615],['Bowler',459,475]].map(([role,x,y],i)=>({id:i,role,x,y,mode:'idle',age:0,has:false}));}
function reset(){clearHeld();S={status:'idle',phase:'ready',paused:false,time:0,seed:6421,innings:1,match:{mode:'practice',overs:1,wicketLimit:3,playerTeam:'Harbour',opponentTeam:'Orchard',playerBatInnings:1},playerBatRuns:null,bowlAim:null,runs:0,wickets:0,legal:0,first:null,target:null,result:null,deliveryNumber:0,stance:0,readyPose:null,action:null,strokeQueue:null,freeze:0,ball:null,keeper:null,plan:null,age:0,fieldAge:0,fielders:makeFielders(),selected:0,manualSelected:false,possession:-1,gather:null,throwing:null,throwQueue:null,returnAge:0,completedRuns:0,provisionalChase:false,run:{moving:false,p:0,dir:1,parity:0,pending:0,requested:false},contact:null,pendingOutcome:null,settled:false,camera:{x:305,y:275},overlay:false,message:'NES controls: A ground shot, B aerial shot, D-pad places the stroke. Bat first, then bowl and field.',events:[]};settings.line='leg';settings.style='pace';}
function configureMatch(config){
 if(S.status!=='idle'||!config||!['practice','one-day','fast'].includes(config.mode))return false;
 const overs=config.mode==='practice'?1:Number(config.overs);
 if(config.mode!=='practice'&&![10,20,30,40,50].includes(overs))return false;
 let playerTeam=config.playerTeam,opponentTeam=config.opponentTeam;
 if(config.mode==='practice'){playerTeam='Harbour';opponentTeam='Orchard';}
 else if(config.mode==='fast'){
  if(Number.isInteger(config.seed))S.seed=config.seed>>>0;
  const home=Math.floor(random()*MATCH_TEAMS.length);
  const away=(home+1+Math.floor(random()*(MATCH_TEAMS.length-1)))%MATCH_TEAMS.length;
  playerTeam=MATCH_TEAMS[home];opponentTeam=MATCH_TEAMS[away];
 }else if(!MATCH_TEAMS.includes(playerTeam)||!MATCH_TEAMS.includes(opponentTeam)||playerTeam===opponentTeam)return false;
 S.match={mode:config.mode,overs,wicketLimit:config.mode==='practice'?3:10,playerTeam,opponentTeam,playerBatInnings:config.playerBatInnings===2?2:1};
 S.message=playerTeam+' v '+opponentTeam+' · '+overs+' over'+(overs===1?'':'s')+' per side';
 event('match-configured',{match:{...S.match}});render();return true;
}
function playerBatting(){return S.innings===S.match.playerBatInnings;}
function batterPose(){if(S.freeze>0&&S.contact)return DATA.families[S.contact.family].poses.find(p=>p.id===S.contact.pose);if(!S.action)return S.readyPose?DATA.poses[S.readyPose]:DATA.families.leg.guard;let age=S.action.age;const poses=DATA.families[S.action.family].poses;for(const p of poses){if(age<p.durationMs-1e-7)return p;age-=p.durationMs;}return poses.at(-1);}
function batterOrigin(p=batterPose()){return{x:400+p.origin[0]-98+S.stance,y:350+p.origin[1]-142};}
function batCells(p){const o=batterOrigin(p);return p.cells.map(([x,y])=>[o.x+x,o.y+y]);}
function pointSegment(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,q=dx*dx+dy*dy,t=q?clamp(((px-ax)*dx+(py-ay)*dy)/q,0,1):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
function intersect(ax,ay,bx,by,cx,cy,dx,dy){const cross=(x,y,u,v)=>x*v-y*u,r=cross(bx-ax,by-ay,dx-cx,dy-cy);if(Math.abs(r)<1e-10)return false;const t=cross(cx-ax,cy-ay,dx-cx,dy-cy)/r,u=cross(cx-ax,cy-ay,bx-ax,by-ay)/r;return t>=0&&t<=1&&u>=0&&u<=1;}
function sweptCell(a,b,x,y,r=1.5){const inside=p=>p.x>=x&&p.x<=x+1&&p.y>=y&&p.y<=y+1;if(inside(a)||inside(b))return true;const v=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];for(let i=0;i<4;i++){const c=v[i],d=v[(i+1)%4];if(intersect(a.x,a.y,b.x,b.y,...c,...d)||Math.min(pointSegment(a.x,a.y,...c,...d),pointSegment(b.x,b.y,...c,...d),pointSegment(...c,a.x,a.y,b.x,b.y),pointSegment(...d,a.x,a.y,b.x,b.y))<=r)return true;}return false;}
function contactFraction(a,b,p){if(!S.action||!p.active)return null;let lo=0,hi=1;const dy=b.y-a.y;if(Math.abs(dy)<1e-9){if(a.y<347||a.y>353)return null;}else{const u=(347-a.y)/dy,v=(353-a.y)/dy;lo=Math.max(0,Math.min(u,v));hi=Math.min(1,Math.max(u,v));if(lo>hi)return null;}
 const project=t=>({x:mix(a.x,b.x,t),y:mix(a.y-a.z,b.y-b.z,t)}),start=project(lo),cells=batCells(p),hits=t=>cells.some(([x,y])=>sweptCell(start,project(t),x,y));if(!hits(hi))return null;for(let n=0;n<20;n++){const m=(lo+hi)/2;if(hits(m))hi=m;else lo=m;}return hi;}
// Manual p15 documents aiming the landing arrow in any direction. Speed/range
// below are authored until the videos can support a measured reference calibration.
function landingPoint(){const f=DATA.families[S.plan.lane]||DATA.families.off,x=S.plan.lane==='wide'?477:400+f.target[0]-98;return S.plan.landing||{x:420+(x-420)*.67,y:432+(350-432)*.67,z:0};}
function aimDelivery(){/* The NES adapter captures a coarse intention on A/B, not a dragged SNES arrow. */}
function beginDelivery(){if(S.status!=='playing'||S.paused||S.pendingOutcome&&!S.settled||!['ready','dead'].includes(S.phase))return;clearHeld();S.phase='runup';S.age=0;S.ball=null;S.keeper=null;S.action=null;S.strokeQueue=null;S.contact=null;S.freeze=0;S.fieldAge=0;S.fielders=makeFielders();S.selected=0;S.manualSelected=false;S.possession=-1;S.gather=null;S.throwing=null;S.throwQueue=null;S.completedRuns=0;S.provisionalChase=false;S.pendingOutcome=null;S.settled=false;S.run={moving:false,p:0,dir:1,parity:0,pending:0,requested:false};S.deliveryNumber++;S.camera={x:305,y:275};S.plan={lane:playerBatting()?['leg','off','defend'][(S.deliveryNumber-1)%3]:settings.line,style:playerBatting()?(S.deliveryNumber%3?'pace':'spin'):settings.style,illegal:null};S.plan.landing=landingPoint();if(playerBatting())S.readyPose=DATA.families[S.plan.lane].guard.id;S.message=playerBatting()?'Read the ball · D-pad + A ground or B air. After contact, A runs.':'D-pad sets coarse bowl intention · press A or B.';event('delivery-start',{lane:S.plan.lane,style:S.plan.style});}
function primary(){
 if(S.paused||S.status==='result'||S.pendingOutcome&&!S.settled)return;
 if(S.status==='idle'||S.status==='intermission'||['ready','dead'].includes(S.phase))restorePlayView();
 if(playerBatting()&&S.phase==='delivery'&&!S.ball?.hit)return;
 if(S.status==='idle'){S.status='playing';if(playerBatting())beginDelivery();else{S.phase='ready';S.message='Tap or drag on the pitch to set the bounce point, then A fast or B slow.';event('innings-start',{first:true});}}
 else if(S.status==='intermission'){S.innings=2;S.runs=0;S.wickets=0;S.legal=0;S.deliveryNumber=0;S.readyPose=null;S.stance=0;S.status='playing';S.phase='ready';S.bowlAim=null;S.message=playerBatting()?'Read the ball · D-pad + A ground or B air.':'Tap or drag on the pitch to set the bounce point, then A fast or B slow. D-pad also places it.';event('innings-start',{target:S.target});if(playerBatting())beginDelivery();}
 else if(playerBatting()&&['ready','dead'].includes(S.phase))beginDelivery();
 render();
}
function inputDirection(){return{x:(held.right.size?1:0)-(held.left.size?1:0),y:(held.down.size?1:0)-(held.up.size?1:0)};}
// NES player reports establish directional ground/air intent, not native
// trajectory equations or input windows. The numeric mapping here is authored.
function nesShot(kind){if(!canStrike())return;const direction=inputDirection(),lane=S.plan.lane==='wide'?'off':S.plan.lane,family=kind==='air'&&lane==='defend'?'defendAir':lane;strike(family,false,{nesKind:kind,direction});}
const BOWL_DIRECTIONS={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}};
function bowlLanding(direction){return{x:direction.x<0?408:direction.x>0?456:432,y:direction.y<0?375:direction.y>0?416:397,z:0};}
function placeBowlPoint(x,y){
 if(S.paused||playerBatting()||S.status!=='playing'||!['ready','dead'].includes(S.phase)||!Number.isFinite(x)||!Number.isFinite(y))return false;
 const landing={x:Math.round(clamp(x,408,456)),y:Math.round(clamp(y,375,416)),z:0};
 const direction={x:Math.sign(landing.x-432),y:Math.sign(landing.y-397)};
 S.bowlAim={name:'point',direction,landing};S.camera={x:305,y:275};
 S.message='Bounce point set | A fast / B slow to deliver';
 event('nes-bowl-point',{point:{...landing}});render();return true;
}
function selectBowlDirection(name){
 if(S.paused||playerBatting()||S.status!=='playing'||!['ready','dead'].includes(S.phase)||!BOWL_DIRECTIONS[name])return false;
 if(S.bowlAim?.name===name)return true;
 const direction=BOWL_DIRECTIONS[name];S.bowlAim={name,direction:{...direction},landing:bowlLanding(direction)};S.camera={x:305,y:275};
 S.message=name.toUpperCase()+' selected · A fast / B slow to deliver';
 event('nes-bowl-direction',{name,point:{...S.bowlAim.landing}});render();return true;
}
function nesBowl(button='A'){
 if(S.paused||playerBatting()||S.status!=='playing'||!['ready','dead'].includes(S.phase)||!S.bowlAim||!['A','B'].includes(button))return false;
 const aim=S.bowlAim;beginDelivery();S.bowlAim=null;
 S.plan.landing={...aim.landing};
 S.plan.lane=aim.direction.x<0?'leg':aim.direction.x>0?'off':'defend';
 S.plan.style=button==='A'?'pace':'slow';
 S.plan.nesIntent={button,speed:button==='A'?'fast':'slow',direction:{...aim.direction},selected:aim.name,authored:true};
 S.plan.nesReleaseQueued=true;
 S.message=aim.name.toUpperCase()+' · '+S.plan.nesIntent.speed.toUpperCase()+' ball running in';
 event('nes-bowl-intent',{...S.plan.nesIntent,landing:{...S.plan.landing}});render();return true;
}
// Crease-constrained approach. Coordinates/holds are authored from the saved source view.
// Keep the front-foot ground anchor at or behind the near-end bowling crease.
function bowlerPosition(){return S.phase==='runup'?{x:459,y:mix(495,NEAR.y,clamp(S.age/500,0,1))}:{x:S.plan?.releaseOrigin?.x??459,y:S.plan?.releaseOrigin?.y??NEAR.y};}
function release(){if(S.phase!=='runup'||S.paused)return;const family=DATA.families[S.plan.lane]||DATA.families.off,[,y]=family.target;
 S.plan.duration=['spin','slow'].includes(S.plan.style)?1400:1100;S.plan.x=420+(landingPoint().x-420)/.67;S.plan.height=142-y;S.plan.illegal=!playerBatting()&&S.age>1100?'no-ball':S.plan.lane==='wide'?'wide':null;S.plan.extras=S.plan.illegal?1:0;
 const ground=bowlerPosition(),pose=DATA.actors['bowler-4'],anchor=pose.anchors.release;
 S.plan.releaseOrigin={x:ground.x+anchor.x-pose.ground[0],y:ground.y,z:pose.ground[1]-anchor.y};
 Object.assign(S.fielders[10],ground);
 S.fielders[0].x=S.plan.x-(16.67-13);S.phase='delivery';S.age=0;S.ball={...S.plan.releaseOrigin,vx:0,vy:0,vz:0,flightAge:0,hit:false,bounced:false};S.plan.aiAt=S.plan.duration-(family.activeStartMs+family.activeEndMs)/2+(random()-.5)*230;S.plan.aiLoft=random()<.32;S.plan.aiPower=random()<.28;event('release',{point:{...S.plan.releaseOrigin},illegal:S.plan.illegal,duration:S.plan.duration});S.message=(S.plan.illegal?S.plan.illegal.toUpperCase()+' · ':'')+(playerBatting()?'Ball live · choose stroke':'AI batting · prepare to field');if(S.innings===2&&S.runs+S.plan.extras>=S.target)resolve('Winning extra');}
function incomingAt(age){const t=age/S.plan.duration,bounce=.67,origin=S.plan.releaseOrigin;
 // Correct only the pre-bounce approach. Retain the accepted landing point,
 // post-bounce path, flight duration and batting/contact window exactly.
 const landing=landingPoint(),after=(t-bounce)/(1-bounce);
 return{x:t<=bounce?mix(origin.x,landing.x,t/bounce):mix(420,S.plan.x,t),y:t<=bounce?mix(origin.y,landing.y,t/bounce):mix(landing.y,350,after),z:t<=bounce?origin.z*(1-t/bounce):S.plan.height*(t-bounce)/(1-bounce)};}

function strokeTiming(family){const f=DATA.families[family];return f.timing||{leadMs:(f.activeStartMs+f.activeEndMs)/2,bufferMs:300,contactFreezeMs:40,settleMs:150};}
function battingAction(){if(!S.action)return{family:null,phase:'ready',pose:batterPose().id,ageMs:0};const p=batterPose();return{family:S.action.family,phase:S.freeze>0?'contact-freeze':S.action.age>=DATA.families[S.action.family].durationMs?'settle':p.phase||'stroke',pose:p.id,ageMs:S.action.age};}
function canStrike(ai=false){return S.status==='playing'&&!S.paused&&!S.pendingOutcome&&!S.settled&&S.phase==='delivery'&&!S.action&&!S.strokeQueue&&!S.ball?.hit&&(ai||playerBatting());}
function commitStroke(choice){S.strokeQueue=null;S.action={family:choice.family,age:0,loft:choice.loft,power:choice.power,nesKind:choice.nesKind,direction:choice.direction};event('stroke',{family:choice.family,loft:choice.loft,power:choice.power,ai:choice.ai,nesKind:choice.nesKind,direction:choice.direction});}
function strike(family,ai=false,nes={}){
 if(!canStrike(ai))return;
 const choice={family,loft:nes.nesKind?nes.nesKind==='air':ai?S.plan.aiLoft:held.loft.size>0,power:ai?S.plan.aiPower:held.power.size>0,ai,...nes};
 const remaining=S.plan.duration-S.ball.flightAge,timing=strokeTiming(family);
 if(!ai&&remaining>timing.leadMs+1e-7&&remaining<=timing.leadMs+timing.bufferMs+1e-7){S.strokeQueue=choice;event('stroke-queued',{...choice,remaining});}
 else commitStroke(choice);render();
}
function recovered(){return!S.action||S.action.age>=DATA.families[S.action.family].durationMs+strokeTiming(S.action.family).settleMs;}
function holdReturn(){if(S.action){S.readyPose=DATA.families[S.action.family].poses.at(-1).id;S.action=null;event('recovered',{pose:S.readyPose});}}
function requestRun(ai=false){if(S.paused||S.status!=='playing'||!S.ball?.hit||S.pendingOutcome||S.phase==='dead'||(!ai&&!playerBatting()))return;S.run.pending=Math.min(3,S.run.pending+1);S.run.requested=true;event('run-request',{pending:S.run.pending,ai});render();}
function reverseRun(){if(S.paused||!playerBatting()||!S.ball?.hit||S.pendingOutcome)return;S.run.pending=0;if(S.run.moving){S.run.dir=-S.run.dir;event('run-reverse',{direction:S.run.dir});}render();}
function runnerPositions(){const r=S.run;if(!r.departed){const p=batterPose(),o=batterOrigin(p);return[{id:0,x:o.x+p.ground[0],y:o.y+p.ground[1]},{id:1,x:412,y:479}];}if(!r.moving)return r.idlePositions;return r.from.map((p,i)=>({id:p.id,x:mix(p.x,r.to[i].x,clamp(r.p,0,1)),y:mix(p.y,r.to[i].y,clamp(r.p,0,1))}));}
function runners(dt){const r=S.run;if(S.pendingOutcome)return;if(!r.moving&&r.pending&&recovered()){holdReturn();r.from=runnerPositions();r.to=r.from.map((p,i)=>({id:p.id,x:i?449:416,y:(r.parity?i===0:i===1)?370:475}));r.pending--;r.moving=true;r.departed=true;r.p=0;r.dir=1;event('run-start',{from:r.from,to:r.to});}if(!r.moving)return;r.p+=r.dir*dt/1250;if(r.p>=1){r.idlePositions=r.to.map(p=>({...p}));r.p=0;r.moving=false;r.parity=1-r.parity;S.completedRuns++;event('run-completed',{completed:S.completedRuns});finishChaseIfSafe();}else if(r.p<=0&&r.dir<0){r.idlePositions=r.from.map(p=>({...p}));r.p=0;r.moving=false;r.dir=1;r.pending=0;event('run-returned');}}
// Completed runs cannot win while a legal airborne catch can still cancel them.
function finishChaseIfSafe(){if(S.pendingOutcome||S.settled||S.status!=='playing'||S.innings!==2||S.runs+S.completedRuns+(S.plan.extras||0)<S.target)return false;if(S.ball?.hit&&!S.ball.bounced&&S.plan.illegal!=='no-ball'){if(!S.provisionalChase)event('chase-provisional',{completed:S.completedRuns});S.provisionalChase=true;S.message='Target runs completed - awaiting airborne catch outcome';return false;}S.provisionalChase=false;resolve('Target reached');return true;}
function safeAt(end,positions=runnerPositions()){return positions.some(p=>p.x>=400&&p.x<=466&&(end==='striker'?p.y<=370:p.y>=NEAR.y));}
/** @param {string} label @param {string|null} [wicket] @param {number} [boundary] */
function resolve(label,wicket=null,boundary=0){if(S.pendingOutcome||S.settled||S.status!=='playing')return;S.strokeQueue=null;S.provisionalChase=false;S.pendingOutcome={label,wicket,boundary};if(recovered())finishDelivery();}
function finishDelivery(){if(!S.pendingOutcome||S.settled)return;holdReturn();S.settled=true;const o=S.pendingOutcome;if(S.run.moving)S.run.idlePositions=runnerPositions();S.runs+=(o.boundary||(o.wicket==='caught'?0:S.completedRuns))+(S.plan.extras||0);if(o.wicket)S.wickets++;if(!S.plan.illegal)S.legal++;S.phase='dead';S.run.moving=false;S.run.pending=0;S.message=o.label+' · '+S.wickets+'/'+S.runs+' WKTS/RUNS';clearHeld();event('dead-ball',{...o,runs:S.runs,wickets:S.wickets,legal:S.legal,illegal:S.plan.illegal});
 if(S.innings===2&&S.runs>=S.target){S.status='result';S.result=(playerBatting()?S.match.playerTeam:S.match.opponentTeam).toUpperCase()+' WIN';}else if(S.legal>=S.match.overs*6||S.wickets>=S.match.wicketLimit){if(S.innings===1){S.first=S.runs;S.target=S.first+1;S.status='intermission';S.message='Innings complete. '+(S.match.playerBatInnings===2?S.match.playerTeam:S.match.opponentTeam)+' need '+S.target+'.';event('innings-complete',{first:S.first,target:S.target});}else{S.status='result';S.result=S.runs===S.first?'TIE':(playerBatting()?S.match.opponentTeam:S.match.playerTeam).toUpperCase()+' WIN';}}
 if(playerBatting())S.playerBatRuns=S.runs;if(S.status==='result'){S.message=S.result+' · '+S.first+' v '+S.runs;event('match-result',{result:S.result,first:S.first,second:S.runs});}}
function fieldPose(f){if(f.id===0)return keeperPose();if(S.throwing?.from===f.id){const age=S.throwing.age;return age<80?'fielder-return-2':age<160?'fielder-return-3':age<220?'fielder-return-4':'fielder-return-5';}if(S.gather?.fielder===f.id)return S.gather.age<80?'fielder-return-0':'fielder-return-1';if(f.has)return f.holdPose||'fielder-return-3';if(f.mode==='run')return'fielder-run-'+(Math.floor(f.age/90)%8);return f.id===0?'keeper-stand':'fielder-1';}
function hand(f,id=fieldPose(f),kind='grip'){const r=DATA.actors[id],p=r.anchors?.[kind]||r.anchors?.grip;return p?{x:f.x+p.x-r.ground[0],y:f.y,z:r.ground[1]-p.y}:{x:f.x,y:f.y,z:14};}
function throwEnd(end,ai=false){if(S.possession===0)return;if(S.paused||S.status!=='playing'||S.phase!=='field'||S.pendingOutcome||(!ai&&playerBatting()))return;S.throwQueue=end;if(S.possession>=0&&!S.throwing){const f=S.fielders[S.possession];S.throwing={from:f.id,end,age:0,stage:'gather',origin:null,duration:null};f.mode='throw';event('throw-gather',{end,fielder:f.id});}render();}
function updateThrow(dt){const t=S.throwing;if(!t)return;t.age+=dt;const f=S.fielders[t.from],b=S.ball;if(t.stage==='gather'){Object.assign(b,hand(f));if(t.age>=160){t.stage='flight';t.origin=hand(f,'fielder-return-4','release');t.flightAge=0;t.duration=Math.max(180,distance(t.origin,t.end==='striker'?FAR:NEAR)/.36);Object.assign(b,t.origin);f.has=false;S.possession=-1;event('throw-release',{end:t.end,origin:{...t.origin},sprite:'fielder-return-4'});}return;}
 t.flightAge+=dt;const v=clamp(t.flightAge/t.duration,0,1),end=t.end==='striker'?FAR:NEAR;b.x=mix(t.origin.x,end.x,v);b.y=mix(t.origin.y,end.y,v);b.z=t.origin.z*(1-v)+Math.sin(Math.PI*v)*18;if(v>=1){const safe=safeAt(t.end);event('wicket-return',{end:t.end,safe,point:{x:b.x,y:b.y,z:b.z}});S.throwing=null;resolve(safe?'Return · crease held':'RUN OUT',safe?null:'run-out');}}
function fieldStep(dt){const b=S.ball;if(S.throwing){updateThrow(dt);return;}if(S.gather){const g=S.gather,f=S.fielders[g.fielder];g.age+=dt;const h=hand(f,'fielder-return-1'),v=clamp(g.age/160,0,1);b.x=mix(g.origin.x,h.x,v);b.y=mix(g.origin.y,h.y,v);b.z=mix(g.origin.z,h.z,v);if(v>=1){S.possession=f.id;f.has=true;f.mode='hold';f.holdPose='fielder-return-1';S.returnAge=0;event('pickup-contact',{fielder:f.id,point:{...h},method:'Original assisted gather lift to visible hand; native floor reach unverified'});S.gather=null;}return;}
 if(S.possession>=0){S.returnAge+=dt;const f=S.fielders[S.possession];Object.assign(b,hand(f));if(S.throwQueue||playerBatting()&&S.returnAge>300||S.returnAge>3000)throwEnd(S.throwQueue||(S.run.p>.5?'bowler':'striker'),true);return;}
 const before={x:b.x,y:b.y,z:b.z};b.x+=b.vx*dt;b.y+=b.vy*dt;b.z=Math.max(0,b.z+b.vz*dt-.5*G*dt*dt);b.vz-=G*dt;if(b.z===0&&b.vz<0){b.vz=Math.abs(b.vz)>.025?-b.vz*.36:0;b.vx*=.77;b.vy*=.77;if(!b.bounced){b.bounced=true;event('post-hit-bounce',{point:{x:b.x,y:b.y,z:0}});}}if(b.bounced&&finishChaseIfSafe())return;const friction=Math.max(0,1-(b.z<.1?.0007:.00004)*dt);b.vx*=friction;b.vy*=friction;
 if(distance(b,CENTER)>=RADIUS){resolve(b.bounced?'FOUR':'SIX',null,b.bounced?4:6);event('boundary',{value:b.bounced?4:6,point:{x:b.x,y:b.y,z:b.z}});return;}
 const closest=S.fielders.filter(f=>f.id!==0).map(f=>({i:f.id,d:distance(f,b)})).sort((a,c)=>a.d-c.d)[0].i;if(playerBatting()||!S.manualSelected&&!['left','right','up','down'].some(k=>held[k].size))S.selected=closest;
 for(const f of S.fielders){if(f.id===0)continue;f.age+=dt;let dx=0,dy=0;if(!playerBatting()&&f.id===S.selected){dx=(held.right.size?1:0)-(held.left.size?1:0);dy=(held.down.size?1:0)-(held.up.size?1:0);}if(!dx&&!dy&&f.id===closest){dx=b.x-f.x;dy=b.y-f.y;}const n=Math.hypot(dx,dy);if(n>.01&&(f.id===closest||f.id===S.selected)){const speed=.074,step=Math.min(n,speed*dt);f.x+=dx/n*step;f.y+=dy/n*step;f.mode='run';}else f.mode='idle';
  if(distance(f,b)<5.5){if(!b.bounced&&b.z>=8&&b.z<=20){const h=hand(f,'fielder-return-3');if(Math.hypot(b.x-h.x,b.y-h.y,b.z-h.z)<=7){S.possession=f.id;f.has=true;f.mode='hold';f.holdPose='fielder-return-3';S.returnAge=0;b.vx=b.vy=b.vz=0;Object.assign(b,h);event('catch-contact',{fielder:f.id,point:h});if(S.plan.illegal==='no-ball'){S.possession=f.id;f.has=true;f.mode='hold';f.holdPose='fielder-return-3';S.returnAge=0;b.vx=b.vy=b.vz=0;S.message='No-ball · live possession; running and run-out remain possible';event('no-ball-possession',{fielder:f.id});}else{S.message='CAUGHT - completing batting recovery';resolve('CAUGHT','caught');}return;}}if(b.z<=3){f.mode='pickup';S.gather={fielder:f.id,age:0,origin:{x:b.x,y:b.y,z:b.z}};b.vx=b.vy=b.vz=0;event('pickup-gather',{fielder:f.id,origin:{...S.gather.origin}});return;}}
 }
 if(!playerBatting()&&!S.run.requested&&S.fieldAge>450&&recovered()&&!S.pendingOutcome)requestRun(true);if(S.fieldAge>10000)resolve('Dead ball · field timeout');void before;
}
function hit(p,point){
 const a=S.action,b=S.ball;Object.assign(b,point,{hit:true,bounced:false,flightAge:0});
 if(a.nesKind){const d=a.direction||{x:0,y:0};b.vx=(d.x||({leg:-1,off:1,defend:0})[S.plan.lane])*.17;b.vy=d.y<0?.17:d.y>0?-.13:.075;b.vz=a.nesKind==='air'?.18:.05;}
 else{const scale=a.power?1.35:1;b.vx=({leg:-.17,off:.18,defend:.012})[a.family]*scale;b.vy=(a.family==='defend'?.075:.045)*scale;b.vz=(a.loft?.18:.05)*scale;}
 S.contact={pose:p.id,family:a.family,world:{...point},cells:batCells(p),time:S.time,loft:a.loft,power:a.power,nesKind:a.nesKind,direction:a.direction};
 S.freeze=strokeTiming(a.family).contactFreezeMs;S.message='CONTACT · '+(a.nesKind==='air'?'AIR':'GROUND')+' · A to run, B to return';
 event('contact',{pose:p.id,family:a.family,world:{...point},nesKind:a.nesKind,direction:a.direction,volume:'Opaque projected blade pixels, depth 347..353; original 2.5D proposal'});
}
function tick(dt){if(S.paused||S.status!=='playing'||dt<1e-7)return;if(S.freeze>0){const used=Math.min(dt,S.freeze);S.freeze-=used;tick(dt-used);return;}if(S.strokeQueue&&S.phase==='delivery'&&!S.ball.hit&&S.plan.duration-S.ball.flightAge<=strokeTiming(S.strokeQueue.family).leadMs+1e-7)commitStroke(S.strokeQueue);let slice=dt;const pose=batterPose();if(S.action){let end=0;for(const p of DATA.families[S.action.family].poses){end+=p.durationMs;if(end>S.action.age+1e-7){slice=Math.min(slice,end-S.action.age);break;}}}if(S.phase==='delivery'&&!S.ball.hit){if(S.strokeQueue){const untilCommit=S.plan.duration-strokeTiming(S.strokeQueue.family).leadMs-S.ball.flightAge;if(untilCommit>1e-7)slice=Math.min(slice,untilCommit);}const bounce=S.plan.duration*.67-S.ball.flightAge;if(bounce>1e-7)slice=Math.min(slice,bounce);if(!playerBatting()&&!S.action&&S.plan.aiAt>S.age+1e-7)slice=Math.min(slice,S.plan.aiAt-S.age);}
 S.time+=slice;S.age+=slice;if(S.action)S.action.age+=slice;
 if(S.pendingOutcome){if(recovered())finishDelivery();tick(dt-slice);return;}
 if(S.phase==='runup'){aimDelivery(slice);if((playerBatting()||S.plan.nesReleaseQueued)&&S.age>=500-1e-7)release();if(S.phase==='runup'&&playerBatting()){S.stance=clamp(S.stance+((held.right.size?1:0)-(held.left.size?1:0))*.025*slice,-12,12);}}
 else if(S.phase==='delivery'&&!S.ball.hit){const b=S.ball,before={x:b.x,y:b.y,z:b.z},after=incomingAt(b.flightAge+slice),fraction=contactFraction(before,after,pose);if(fraction!==null){const unused=slice*(1-fraction);S.time-=unused;S.age-=unused;if(S.action)S.action.age-=unused;b.flightAge+=slice*fraction;hit(pose,{x:mix(before.x,after.x,fraction),y:mix(before.y,after.y,fraction),z:mix(before.z,after.z,fraction)});tick(dt-slice+unused);return;}Object.assign(b,after);b.flightAge+=slice;if(!S.plan.deliveryBounced&&b.flightAge>=S.plan.duration*.67){S.plan.deliveryBounced=true;event('delivery-bounce',{point:{x:b.x,y:b.y,z:b.z}});}if(!playerBatting()&&!S.action&&S.age>=S.plan.aiAt)strike(S.plan.lane==='wide'?'off':S.plan.lane,true);if(b.y<347){const bowled=Math.abs(b.x-FAR.x)<=5.5&&b.z<=25&&!S.plan.illegal;if(bowled)resolve('BOWLED','bowled');else beginKeeperReceive();}}
 else if(S.phase==='keeper'){keeperStep(slice);}else if(S.ball?.hit&&(S.phase==='delivery'||S.phase==='field')){S.fieldAge+=slice;runners(slice);if(!S.pendingOutcome)fieldStep(slice);if(S.phase==='delivery'&&recovered()&&!S.pendingOutcome){holdReturn();S.phase='field';event('camera-handoff',{ball:{x:S.ball.x,y:S.ball.y,z:S.ball.z},reason:'Full source recovery completed'});}if(S.phase==='field'){const f=S.fielders[S.selected],ball=S.ball,screenBallY=ball.y-ball.z;
  // Source fielding frame 012 holds the marked fielder near centre, with the
  // ball free to approach an edge. Keep both visible when their span permits.
  const target={x:f.x-124,y:f.y-105};target.x=clamp(target.x,ball.x-244,ball.x-12);target.y=clamp(target.y,screenBallY-212,screenBallY-12);
  S.camera.x=mix(S.camera.x,clamp(target.x,0,704),Math.min(1,slice/180));S.camera.y=mix(S.camera.y,clamp(target.y,0,736),Math.min(1,slice/180));}}
 tick(dt-slice);
}

// Authored receive adaptation: source poses do not establish original collision/timing.
function keeperPose(){if(!S.keeper)return S.ball?.hit?'keeper-stand':'keeper-crouch';return S.keeper.stage==='flight'||S.keeper.holdAge<200?'keeper-receive-wide':S.keeper.holdAge<400?'keeper-receive-stand':'keeper-hold';}
function keeperGlove(id='keeper-receive-wide'){const p=DATA.actors[id],f=S.fielders[0];return{x:f.x+p.candidateGlove[0]-p.ground[0],y:f.y,z:p.ground[1]-p.candidateGlove[1]};}
function beginKeeperReceive(){if(S.ball.hit||S.run.moving||S.run.pending||S.pendingOutcome)throw Error('Unsupported live keeper reset');S.strokeQueue=null;S.message='Ball missed ? keeper receiving.';S.phase='keeper';S.keeper={stage:'flight',age:0,holdAge:0,origin:{x:S.ball.x,y:S.ball.y,z:S.ball.z},camera:{...S.camera},duration:750};event('keeper-approach',{origin:{...S.keeper.origin},target:keeperGlove(),authored:true});}
function keeperStep(dt){const k=S.keeper,b=S.ball;if(k.stage==='flight'){k.age=Math.min(k.duration,k.age+dt);const t=k.age/k.duration,h=keeperGlove();b.x=mix(k.origin.x,h.x,t);b.y=mix(k.origin.y,h.y,t);b.z=mix(k.origin.z,h.z,t)+Math.sin(Math.PI*t)*4;S.camera.x=mix(k.camera.x,clamp(h.x-128,0,600),t);S.camera.y=mix(k.camera.y,185,t);if(t>=1){k.stage='hold';k.holdAge=0;S.message='Keeper holds ? delivery settling.';S.possession=0;S.fielders[0].has=true;b.vx=b.vy=b.vz=0;event('keeper-receive',{point:{x:b.x,y:b.y,z:b.z},authoredAnchor:true});}return;}k.holdAge+=dt;const a=keeperGlove('keeper-receive-wide'),h=keeperGlove(k.holdAge<400?'keeper-receive-stand':'keeper-hold'),t=clamp((k.holdAge-200)/200,0,1);b.x=mix(a.x,h.x,t);b.y=h.y;b.z=mix(a.z,h.z,t);if(k.holdAge>=650&&recovered()){event('keeper-held',{point:{x:b.x,y:b.y,z:b.z},throw:false});resolve(S.plan.illegal?S.plan.illegal.toUpperCase():'DOT · keeper holds');}}


reset();return{teams:MATCH_TEAMS,playerBatting,strokeTiming,battingAction,landingPoint,bowlerPosition,clearHeld,event,random,makeFielders,reset,configureMatch,batterPose,batterOrigin,batCells,pointSegment,intersect,sweptCell,contactFraction,beginDelivery,primary,release,incomingAt,canStrike,commitStroke,strike,nesShot,nesBowl,placeBowlPoint,selectBowlDirection,inputDirection,recovered,holdReturn,requestRun,reverseRun,runnerPositions,runners,finishChaseIfSafe,safeAt,resolve,finishDelivery,fieldPose,hand,throwEnd,updateThrow,fieldStep,hit,tick,keeperPose,keeperGlove,beginKeeperReceive,keeperStep,get state(){return S;},get settings(){return settings;},get held(){return held;},advance(ms){if(!Number.isFinite(ms)||ms<0||ms>60000)throw Error('Invalid simulation advance');for(let n=ms;n>1e-7;){const d=Math.min(STEP,n);tick(d);n-=d;}render();}};}
