import type { Action, AssetManifest, Command, Contact, MatchState, Player, Point, Pose, Restart, Team, View, World } from './contracts';
import { clamp, DT, fromSpace, HALF_TICKS, length, project, root, space, sweep, goalSpace, fromGoalSpace, GOAL_HEIGHT, PITCH, PITCH_EXTENT, pitchPose, CONTACT } from './geometry';
import { KEEPER, keeperPose } from './keeper';
import {movementFacing,movementView} from './animation';
import {followingCamera} from './presentation';
import {GOAL_VIEW} from './close-view';
const FORMATION: Point[] = [{ x: 4, y: 34 }, { x: 24, y: 10 }, { x: 21, y: 26 }, { x: 21, y: 42 }, { x: 24, y: 58 }, { x: 43, y: 10 }, { x: 40, y: 26 }, { x: 40, y: 42 }, { x: 43, y: 58 }, { x: 62, y: 25 }, { x: 62, y: 43 }];
const TACKLE: [
    string,
    number
][] = [['tackle-windup', 8], ['tackle-entry', 12], ['tackle-slide', 8], ['tackle-follow', 8], ['tackle-sit', 8], ['tackle-crouch', 6], ['tackle-rise', 6], ['tackle-recover-ready', 8], ['compress', 6], ['settle', 6], ['ready', 8]];
const opposite = (t: Team): Team => t === 0 ? 1 : 0;
export class Simulation {
    viewportWidth=384;
    setViewportWidth(width:number){const next=clamp(Math.round(width),320,640);this.state.camera.x=clamp(this.state.camera.x+(this.viewportWidth-next)/2,0,PITCH_EXTENT.width-next);this.viewportWidth=next;}
    state: MatchState;
    private poses: Map<string, Pose>;
    constructor(readonly assets: AssetManifest, readonly options: { keeperCatches?:boolean } = {}) { this.poses = new Map(assets.records.map(p => [p.id, p])); this.state = this.initial(1); this.formation(0); }
    private initial(round: number): MatchState { return { aerial: null, shotView: null, airContacts: [0, 0], airCollections: [0, 0], status: 'ready', phase: 'restart', tick: 0, eventSerial: 0, round, seed: 4811, half: 1, halfTicks: 0, score: [0, 0], players: [], selected: 9, owner: null, ball: { x: 52.5, y: 34, z: 0, vx: 0, vy: 0, vz: 0 }, lastTouch: 0, lastKicker: null, releaseTick: -999, restart: null, goalAge: 0, held: { left: false, right: false, up: false, down: false }, inputSources: { left: [], right: [], up: [], down: [] }, events: [], message: 'Two 90-second halves. Harbour attacks right first. Start exhibition.', passes: [0, 0], shots: [0, 0], saves: [0, 0], possessionTicks: [0, 0], camera: { x: project({x:52.5,y:34}).x-this.viewportWidth/2, y: project({x:52.5,y:34}).y-113 }, pendingKickoff: 0, noDoubleTouch: null, lastContact: null }; }
    attack(team: Team) { return (team === 0) === (this.state.half === 1) ? 1 : -1; }
    private emit(kind: string, detail: Partial<Contact> = {}) {
        const s = this.state, event = { kind, tick: s.tick, sequence: ++s.eventSerial, ...detail };
        s.events.push(event);
        if (s.events.length > 80)
            s.events.shift();
        s.lastContact = event;
    }
    private random() { let n = this.state.seed; n ^= n << 13; n ^= n >>> 17; n ^= n << 5; this.state.seed = n >>> 0; return this.state.seed / 4294967296; }
    clear() {
        const s = this.state;
        for (const k of ['left', 'right', 'up', 'down'] as const) {
            s.held[k] = false;
            s.inputSources[k] = [];
        }
    }
    restart() { this.state = this.initial(this.state.round + 1); this.formation(0); }
    snapshot() { return structuredClone(this.state); }
    private formation(kickoff: Team) {
        const s = this.state;
        s.players = [];
        for (const team of [0, 1] as const)
            for (let slot = 0; slot < 11; slot++) {
                const f = FORMATION[slot], d = this.attack(team);
                let x = d === 1 ? f.x : 105 - f.x;
                if (slot > 0)
                    x = team === kickoff ? (d === 1 ? Math.min(x, 48) : Math.max(x, 57)) : (d === 1 ? Math.min(x, 42) : Math.max(x, 63));
                const home = { x: d === 1 ? f.x : 105 - f.x, y: f.y };
                s.players.push({ id: team * 11 + slot, team, role: slot === 0 ? 'keeper' : 'outfield', slot, x, y: f.y, facing: d === 1 ? 'E' : 'W', moving: false, motionAge: 0, home, action: null, cooldown: 0, decisionTick: s.tick + 20 + slot * 5 });
            }
        // Local kickoff composition calibrated from the reference: nearby outlets and wide defenders.
        const place=(team:Team,slot:number,progress:number,y:number)=>{const p=s.players[team*11+slot];p.x=this.attack(team)===1?progress:105-progress;p.y=y;};
        place(kickoff,9,52.5,34);place(kickoff,10,48.5,34);place(kickoff,5,48.2,26);
        place(opposite(kickoff),5,47,22);place(opposite(kickoff),8,52,58);
        s.selected = 9;
    }
    private setBall(p: World) { Object.assign(this.state.ball, p, { vx: 0, vy: 0, vz: 0 }); }
    private beginRestart(kind: Restart['kind'], team: Team, point: Point) {
        const s = this.state;
        this.exitShotView('restart');
        s.aerial = null;
        this.clear();
        s.phase = 'restart';
        s.owner = null;
        s.noDoubleTouch = null;
        for (const p of s.players) {
            p.action = null;
            delete p.keeperCycle;
            delete p.contactView;
            delete p.aiCarryY;
            p.moving = false;
        }
        const eligible = s.players.filter(p => p.team === team && (kind === 'goal-kick' ? p.role === 'keeper' : p.role === 'outfield'));
        const taker = eligible.sort((a, b) => length(a, point) - length(b, point) || a.id - b.id)[0];
        const p = point;
        s.restart = { kind, team, point: { ...p }, taker: taker.id, age: 0 };
        taker.x = p.x;
        taker.y = p.y;
        taker.cooldown = 0;
        taker.facing = this.attack(team) === 1 ? 'E' : 'W';
        for (const other of s.players) {
            if (other === taker)
                continue;
            const distance = length(other, p), minimum = other.team !== team ? (kind === 'kickoff' ? 10 : 9.15) : 4;
            if (distance < minimum) {
                const angle = Math.atan2(other.y - p.y, other.x - p.x);
                other.x = clamp(p.x + Math.cos(angle) * minimum, 2, 103);
                other.y = clamp(p.y + Math.sin(angle) * minimum, 2, 66);
            }
            if (kind === 'goal-kick' && other.team !== team) {
                other.x = this.attack(team) === 1 ? Math.max(19, other.x) : Math.min(86, other.x);
            }
        }
        if (team === 0)
            s.selected = taker.id;
        this.setBall({ ...p, z: 0 });
        s.message = `${kind.toUpperCase()} — ${team === 0 ? 'Harbour: P pass / L loft / S shoot' : 'Orchard preparing'}.`;
        this.emit('restart-awarded', { restart: kind, team, point: { ...point }, player: taker.id });
    }
    private kickoff(team: Team) { this.formation(team); this.beginRestart('kickoff', team, { x: 52.5, y: 34 }); }
    command(c: Command) {
        const s = this.state;
        if (c.type === 'clear') {
            this.clear();
            return;
        }
        if (c.type === 'pause') {
            if (s.status === 'playing') {
                s.status = 'paused';
                this.clear();
            }
            else if (s.status === 'paused')
                s.status = 'playing';
            return;
        }
        if (c.type === 'resume') {
            if (s.status === 'paused')
                s.status = 'playing';
            return;
        }
        if (c.type === 'start') {
            if (s.status === 'ready') {
                s.status = 'playing';
                this.kickoff(0);
            }
            else if (s.status === 'halftime') {
                s.half = 2;
                s.halfTicks = 0;
                s.status = 'playing';
                this.kickoff(1);
                this.emit('second-half');
                s.message = 'Second half — Harbour attacks LEFT. Orchard kickoff.';
            }
            return;
        }
        if (c.type === 'next') {
            if (s.status === 'complete')
                this.restart();
            return;
        }
        if (s.status !== 'playing')
            return;
        if (c.type === 'hold') {
            if (c.value && s.shotView && s.shotView.phase !== 'aim')
                return;
            const sources = s.inputSources[c.key];
            if (c.value && !sources.includes(c.source))
                sources.push(c.source);
            if (!c.value)
                s.inputSources[c.key] = sources.filter(v => v !== c.source);
            s.held[c.key] = s.inputSources[c.key].length > 0;
            return;
        }
        if (s.phase === 'goal')
            return;
        const p = s.players[s.selected];
        if (['pass','loft','shoot','tackle','switch','slide'].includes(c.type)) {
            if (s.shotView?.phase === 'aim') { if(c.type==='shoot')this.confirmChance(); return; }
            if(s.shotView)return;
            if(s.phase==='restart'){if(s.restart?.team===0&&!p.action)this.takeRestart(c.type==='loft',c.type==='shoot');return;}
            if(c.type==='switch'){if(s.owner!==s.selected)this.command({type:'C'});return;}
            if(p.action||p.keeperCycle||p.cooldown>0)return;
            if(s.owner===p.id){
                if(c.type==='pass')this.kick(p,'pass');
                else if(c.type==='loft')this.kick(p,'loft');
                else if(c.type==='shoot'){if(this.canChance(p))this.beginChance(p);else this.kick(p,'shot');}
            }else if(c.type==='tackle'){
                if(s.owner===null&&s.aerial?.controlledBy===null)this.control(p);
                else this.tackle(p,'standing');
            }else if(c.type==='slide')this.tackle(p,'slide');
            return;
        }
        if (s.shotView?.phase === 'aim') {
            if (c.type === 'A')
                this.confirmChance();
            return;
        }
        if (s.shotView)
            return;
        if (s.phase === 'restart') {
            const r = s.restart!;
            if (r.team !== 0 || p.action)
                return;
            this.takeRestart(c.type === 'B');
            return;
        }
        if (p.action || p.keeperCycle || p.cooldown > 0)
            return;
        if (s.owner === p.id) {
            if (c.type === 'A') {
                if(this.attackProgress(p) > 70 && this.canChance(p))this.beginChance(p);
                else this.kick(p, this.attackProgress(p) > 70 ? 'shot' : 'pass');
            }
            else
                this.kick(p, c.type === 'B' ? 'loft' : 'pass', c.type === 'C');
        }
        else if (c.type === 'C') {
            const candidates = s.players.filter(v => v.team === 0 && v.role === 'outfield' && !v.action).sort((a, b) => length(a, s.ball) - length(b, s.ball) || a.id - b.id);
            const i = candidates.findIndex(v => v.id === s.selected);
            s.selected = candidates[(i + 1) % Math.min(3, candidates.length)].id;
        }
        else if (c.type === 'A' && s.owner === null && s.aerial?.controlledBy === null)
            this.control(p);
        else if (c.type === 'A' || c.type === 'B')
            this.tackle(p);
    }
    attackingControls(){const s=this.state;return !!s.shotView||s.phase==='restart'&&s.restart?.team===0||s.owner===s.selected;}
    shootPrompt(){const s=this.state,p=s.players[s.selected];return s.status==='playing'&&s.phase==='open'&&!s.shotView&&s.owner===p.id&&!p.action&&p.cooldown===0&&this.attackProgress(p)>70;}
    private attackProgress(p: Player) { return this.attack(p.team) === 1 ? p.x : 105 - p.x; }
    primaryAction(): 'SHOOT'|'SHOT'|'CHANCE'|'PASS'|'THROW'|'KICK'|'CONTROL'|'TACKLE'{
        const s=this.state,p=s.players[s.selected];
        if(s.shotView?.phase==='aim')return 'SHOOT';
        if(s.shotView)return 'SHOT';
        if(s.phase==='restart')return s.restart?.kind==='throw-in'?'THROW':'KICK';
        if(s.owner===p.id)return this.attackProgress(p)>70?(this.canChance(p)?'CHANCE':'SHOOT'):'PASS';
        return s.owner===null&&s.aerial?.controlledBy===null?'CONTROL':'TACKLE';
    }
    secondaryAction(){const s=this.state;return s.shotView?'WATCH':s.phase==='restart'?(s.restart?.kind==='throw-in'?'THROW':'LOFT'):s.owner===s.selected?'LOFT':'SLIDE';}
    tertiaryAction(){const s=this.state;return s.shotView?'WATCH':s.phase==='restart'?'KICK':s.owner===s.selected?'SHORT':'SWITCH';}
    private target(p: Player, short = false): Player { const s = this.state, d = this.attack(p.team), input = this.direction(), hasInput = p.team === 0 && p.id === s.selected && length(input, { x: 0, y: 0 }) > .1; return s.players.filter(v => v.team === p.team && v.role === 'outfield' && v.id !== p.id && !v.action).sort((a, b) => { const score = (q: Player) => { const dist = length(p, q), vx = (q.x - p.x) / Math.max(1, dist), vy = (q.y - p.y) / Math.max(1, dist); return dist * (short ? 1.4 : .35) - (hasInput ? (vx * input.x + vy * input.y) * 18 : (q.x - p.x) * d * .6); }; return score(a) - score(b) || a.id - b.id; })[0]; }
    private direction(): Point { const h = this.state.held, x = Number(h.right) - Number(h.left), y = Number(h.down) - Number(h.up), n = Math.hypot(x, y); return n ? { x: x / n, y: y / n } : { x: 0, y: 0 }; }
    private kick(p: Player, kind: 'pass' | 'loft' | 'shot', short = false, outlet?: Player) {
        if (p.action || p.cooldown > 0 || this.state.owner !== p.id)
            return;
        if (kind === 'shot' && !this.state.shotView && this.canChance(p)) {
            this.beginChance(p, false);
            return;
        }
        const camera = this.state.shotView;
        const q = kind === 'shot' ? { x: this.attack(p.team) === 1 ? 108 : -3, y: camera && camera.shooter === p.id ? 34 + (camera.aim.x - GOAL_VIEW.centreX) / GOAL_VIEW.lateralScale : clamp(34 + (p.team === 0 && p.id === this.state.selected && this.state.held.up ? -6 : p.team === 0 && p.id === this.state.selected && this.state.held.down ? 6 : (this.random() - .5) * 5), 28, 40) } : outlet ?? this.target(p, short);
        p.action = { kind, age: 0, target: { x: q.x, y: q.y }, targetPlayer: 'id' in q ? q.id : undefined, released: false, hit: false, direction: { x: this.attack(p.team), y: 0 } };
        p.facing = this.attack(p.team) === 1 ? 'E' : 'W';
    }
    private takeRestart(loft = false, shot = false) { const s = this.state, r = s.restart!, p = s.players[r.taker]; const target = this.target(p, true), shotRestart=r.kind!=='throw-in'&&(r.kind==='penalty'||shot); p.action = { kind: r.kind === 'throw-in' ? 'throw' : shotRestart ? 'shot' : loft ? 'loft' : 'pass', age: 0, target: shotRestart ? { x: this.attack(p.team) === 1 ? 108 : -3, y: 34 } : { x: target.x, y: target.y }, released: false, hit: false, direction: { x: this.attack(p.team), y: 0 } }; }
    private tackle(p: Player, tackleStyle: 'standing'|'slide' = 'slide') {
        if (p.role === 'keeper' || p.action || p.cooldown > 0)
            return;
        const input = this.direction(), v = p.team === 0 && p.id === this.state.selected && length(input, { x: 0, y: 0 }) > .1 ? input : { x: signed(this.state.ball.x - p.x), y: 0 };
        p.facing = v.x >= 0 ? 'E' : 'W';
        p.action = { tackleStyle, kind: 'tackle', age: 0, target: { x: 0, y: 0 }, released: false, hit: false, direction: { x: v.x >= 0 ? 1 : -1, y: 0 } };
    }
    view(p: Player): View {
        let pose: string, mirror = false;
        const a = p.action;
        if (p.contactView)
            return p.contactView.view;
        if (p.role === 'keeper') {
            if (p.keeperCycle) return {pose:'keeper-'+keeperPose(p.keeperCycle.age),mirror:this.attack(p.team)<0};
            const v = this.state.shotView;
            if (v?.keeper === p.id) {
                const dive = Math.abs(v.aim.x - GOAL_VIEW.centreX) >= 26;
                return { pose: dive ? (v.age < 30 ? 'keeper-01' : 'keeper-03') : 'keeper-00', mirror: v.aim.x < GOAL_VIEW.centreX };
            }
            const incoming = this.state.ball.vx * this.attack(p.team) < -8 && Math.abs(this.state.ball.x - p.x) < 20;
            if (this.options.keeperCatches!==false && this.poses.has('keeper-reach') && !v) {
                const b=this.state.ball, slow=Math.hypot(b.vx,b.vy)<=KEEPER.maxCatchSpeed && b.z>=KEEPER.minimumHeight && b.z<=KEEPER.maximumHeight;
                if(slow && b.vx*this.attack(p.team)<-1 && Math.abs(b.x-p.x)<18) return {pose:'keeper-reach',mirror:this.attack(p.team)<0};
                if(!incoming) return {pose:'keeper-ready',mirror:this.attack(p.team)<0};
            }
            pose = incoming && this.state.ball.z < 24 ? 'keeper-03' : 'keeper-00';
            mirror = pose === 'keeper-03' ? this.attack(p.team) < 0 : this.attack(p.team) > 0;
            return { pose, mirror };
        }
        if (a?.kind === 'tackle') {
            let n = a.age;
            pose = 'ready';
            for (const [id, ticks] of a.tackleStyle==='standing'?[['compress',8],['settle',8],['ready',14]] as [string,number][]:TACKLE) {
                if (n < ticks) {
                    pose = id;
                    break;
                }
                n -= ticks;
            }
            mirror = a.direction.x < 0;
        }
        else if (a?.kind === 'control') {
            pose = a.age < 20 ? 'signal' : a.age < 28 ? 'crouch' : a.age < (a.tackleStyle==='standing'?16:36) ? 'compress' : a.age < 44 ? 'settle' : 'ready';
            mirror = a.direction.x > 0;
        }
        else if (a?.kind === 'stagger') {
            // Original short reaction assembled from admitted recovery poses.
            // These are not recovered native tackle-victim animation timings.
            pose = a.age < 6 ? 'crouch' : a.age < 12 ? 'compress' : a.age < 18 ? 'settle' : 'ready';
            mirror = a.direction.x > 0;
        }
        else if (a?.kind === 'throw') {
            pose = a.age < 4 ? 'throw-hold' : a.age < 12 ? 'throw-overhead' : a.age < 18 ? 'throw-release' : 'throw-follow';
            mirror = a.target.x < p.x;
        }
        else if (a) {
            pose = a.age < 12 ? 'kick-prep' : a.age < 18 ? 'kick-contact' : a.age < 26 ? 'kick-follow' : 'settle';
            mirror = a.target.x < p.x;
        }
        else {
            const v = movementView(p,this.assets);
            pose = v.pose;
            mirror = v.mirror;
        }
        return { pose: p.team === 1 ? 'orchard-' + pose : pose, mirror };
    }
    anchor(p: Player, name = 'foot', v = this.view(p)): World {
        const source=this.poses.get(v.pose)!,closeHands=this.state.shotView?.keeper===p.id&&(name==='leftHand'||name==='rightHand');
        const pose = closeHands?source:pitchPose(source);
        const [gx, gy] = pose.anchors.ground;
        const a = pose.anchors[name] ?? pose.anchors.boot ?? pose.anchors.foot ?? pose.anchors.ground;
        const q = root(p);
        const camera = this.state.shotView;
        if (camera?.keeper === p.id && (name === 'leftHand' || name === 'rightHand'))
            return { x: p.x, y: (Math.round(GOAL_VIEW.centreX + (p.y - 34) * GOAL_VIEW.lateralScale) + (v.mirror ? gx - a[0] - 1 : a[0] - gx) - GOAL_VIEW.centreX) / GOAL_VIEW.lateralScale + 34, z: Math.max(0, gy - a[1]) };
        return { x: (q.x - PITCH.x + (v.mirror ? gx - a[0] - 1 : a[0] - gx)) / PITCH.scaleX, y: (q.y - PITCH.y) / PITCH.scaleY, z: Math.max(0, gy - a[1]) };
    }
    private throwAnchor(p: Player): World { return this.anchor(p, 'ball'); }
    private attach(p: Player) { const q = this.anchor(p,p.keeperCycle&&!p.keeperCycle.dropped?'ball':p.action?.kind==='throw'?'ball':'foot'); this.setBall(q); }
    private canSecure(p:Player, ball:World, incoming:typeof this.state.ball){
        const s=this.state;
        if(this.options.keeperCatches===false||s.shotView||s.owner!==null||p.keeperCycle||!this.poses.has('keeper-standing-secure'))return false;
        if(incoming.vx*this.attack(p.team)>=-1||Math.hypot(incoming.vx,incoming.vy)>KEEPER.maxCatchSpeed||Math.abs(incoming.vz)>KEEPER.maxVerticalSpeed||ball.z<KEEPER.minimumHeight||ball.z>KEEPER.maximumHeight)return false;
        const grip=this.anchor(p,'ball',{pose:'keeper-standing-secure',mirror:this.attack(p.team)<0});
        return Math.hypot((grip.x-ball.x)*PITCH.scaleX,(grip.y-ball.y)*PITCH.scaleY,grip.z-ball.z)<=KEEPER.gripRadius;
    }
    private secureKeeper(p:Player, contact:World){
        const s=this.state;p.keeperCycle={age:0,dropped:false,punted:false,releaseTick:-1};p.action=null;delete p.contactView;p.cooldown=0;p.moving=false;
        s.owner=p.id;s.aerial=null;s.noDoubleTouch=null;s.lastTouch=p.team;s.lastKicker=p.id;s.releaseTick=s.tick;s.saves[p.team]++;
        this.attach(p);this.emit('keeper-secure',{player:p.id,team:p.team,worldBall:{...contact},resolvedGrip:{...s.ball},pose:this.view(p).pose});s.message='CAUGHT - keeper preparing distribution.';
    }
    private advanceKeeper(p:Player){
        const s=this.state,c=p.keeperCycle!;c.age++;p.moving=false;
        if(!c.dropped && s.owner!==p.id){delete p.keeperCycle;p.cooldown=24;this.emit('keeper-hold-interrupted',{player:p.id});return;}
        if(c.dropped&&!c.punted&&(s.owner!==null||s.lastKicker!==p.id)){delete p.keeperCycle;p.cooldown=24;this.emit('keeper-drop-interrupted',{player:p.id});return;}
        if(c.age>=46&&c.age<58&&!c.dropped)this.move(p,{x:p.x+this.attack(p.team),y:p.y},KEEPER.carrySpeed);
        if(c.age===KEEPER.dropAge){
            // Ball release is real. The predicted boot is a delivery target only;
            // only the later swept boot contact can apply outgoing punt velocity.
            const start={...s.ball},v={pose:'keeper-punt',mirror:this.attack(p.team)<0},foot=this.anchor(p,'kickingFoot',v),target={...foot,x:foot.x+this.attack(p.team)*3/PITCH.scaleX};
            const n=KEEPER.puntAge-KEEPER.dropAge+1,r=Math.pow(.995,.5),factor=DT*(1-Math.pow(r,n))/(1-r);
            s.owner=null;s.aerial=null;c.dropped=true;c.releaseTick=s.tick;s.lastTouch=p.team;s.lastKicker=p.id;s.releaseTick=s.tick;
            s.ball.vx=(target.x-start.x)/factor;s.ball.vy=(target.y-start.y)/factor;s.ball.vz=(target.z-start.z+KEEPER.gravity*DT*DT*n*(n-1)/2)/(n*DT);
            this.emit('keeper-drop',{player:p.id,team:p.team,worldPoint:start,target,pose:'keeper-release-prep'});s.message='Keeper drop - ball in play.';
        }
        if(c.age===KEEPER.puntEnd&&!c.punted){this.emit('keeper-punt-missed',{player:p.id});s.message='Loose ball - keeper missed distribution.';}
        if(c.age>=KEEPER.endAge){delete p.keeperCycle;p.cooldown=1;this.emit('keeper-recovered',{player:p.id});}
    }
    private puntKeeper(p:Player, ball:World){
        const s=this.state,c=p.keeperCycle!;c.punted=true;this.setBall(ball);
        const target=this.target(p),dx=target.x-ball.x,dy=target.y-ball.y,distance=Math.max(.5,Math.hypot(dx,dy));
        s.ball.vx=dx/distance*25;s.ball.vy=dy/distance*25;s.ball.vz=80;s.owner=null;s.aerial=null;s.lastTouch=p.team;s.lastKicker=p.id;s.releaseTick=s.tick;s.passes[p.team]++;
        this.emit('keeper-punt',{player:p.id,team:p.team,targetPlayer:target.id,worldPoint:ball,pose:this.view(p).pose,anchor:'kickingFoot'});s.message='Keeper distribution - play on.';
    }
    private release(p: Player, a: Action) {
        const s = this.state;
        if (s.owner !== p.id && !(s.phase === 'restart' && s.restart?.taker === p.id)) {
            a.cancelled = true;
            this.emit('delivery-cancelled', { player: p.id, reason: 'possession-lost' });
            return;
        }
        const start = a.kind === 'throw' ? this.throwAnchor(p) : this.anchor(p);
        this.setBall(start);
        const dx = a.target.x - start.x, dy = a.target.y - start.y, dist = Math.max(.5, Math.hypot(dx, dy));
        let speed = a.kind === 'shot' ? 31 : a.kind === 'loft' ? 23 : 22;
        if (a.kind === 'throw')
            speed = 14;
        const flight = dist / speed;
        s.ball.vx = dx / dist * speed;
        s.ball.vy = dy / dist * speed;
        s.ball.vz = a.kind === 'loft' ? Math.min(230, flight * 140) : a.kind === 'throw' ? 30 : a.kind === 'shot' ? 60 : 0;
        s.owner = null;
        s.aerial = null;
        if (a.kind === 'loft')
            this.loft(p, a, start);
        if (a.kind === 'shot' && s.shotView?.shooter === p.id) {
            const v = s.shotView;
            v.phase = 'flight';
            v.age = 0;
            const depth = this.attack(p.team) === 1 ? 105 - start.x : start.x;
            const steps = Math.max(1, Math.ceil(depth / Math.max(.01, Math.abs(s.ball.vx)) / DT)), r = Math.pow(.995, .5), distanceFactor = DT * (1 - Math.pow(r, steps)) / (1 - r), seconds = steps * DT;
            const targetDepth = this.attack(p.team) === 1 ? 105 : -0;
            const lateral = 34 + (v.aim.x - GOAL_VIEW.centreX) / GOAL_VIEW.lateralScale;
            s.ball.vx = (targetDepth - start.x) / distanceFactor;
            s.ball.vy = (lateral - start.y) / distanceFactor;
            s.ball.vz = ((v.planeY - v.aim.y) - start.z + 140 * seconds * seconds) / seconds;
        }
        else if (a.kind !== 'shot')
            this.exitShotView('delivery');
        s.lastTouch = p.team;
        s.lastKicker = p.id;
        s.releaseTick = s.tick;
        a.released = true;
        if (a.kind === 'shot')
            s.shots[p.team]++;
        else
            s.passes[p.team]++;
        if (s.phase === 'restart') {
            s.phase = 'open';
            s.restart = null;
            s.noDoubleTouch = p.id;
        }
        this.emit(a.kind === 'shot' ? 'shot' : 'pass', { player: p.id, team: p.team, pose: this.view(p).pose, mirror: this.view(p).mirror, anchor: a.kind === 'throw' ? 'ball' : 'foot', worldPoint: { ...start }, delivery: a.kind, point: project(start) });
        s.message = a.kind === 'shot' ? 'SHOT — keeper and rebound in play.' : 'Ball in play — move to receive, S to switch.';
    }
    private move(p: Player, target: Point, speed: number) {
        // Restart takers may stand at y=0/68 or x=.5/104.5, outside the
        // normal running inset. Bound the destination, then spend the same
        // movement budget on returning; clamping the new root teleports them.
        target = { x: clamp(target.x, 1, 104), y: clamp(target.y, 1, 67) };
        const d = length(p, target), step = Math.min(d, speed * DT), was = p.moving;
        p.moving = d > .1;
        if (!p.moving)
            return;
        if (!was)
            p.motionAge = 0;
        else
            p.motionAge++;
        const dx = (target.x - p.x) / d, dy = (target.y - p.y) / d;
        p.strideDistance = !was ? 0 : (p.strideDistance ?? 0) + step;
        p.x += dx * step;
        p.y += dy * step;
        p.facing = movementFacing(p.facing,dx,dy);
    }
    private forecastCarrier(carrier: Player, age: number): Player {
        const moving = carrier.moving && !carrier.action && this.state.shotView?.shooter !== carrier.id;
        const velocity = moving ? { x: carrier.facing === 'E' ? 7.2 : carrier.facing === 'W' ? -7.2 : 0, y: carrier.facing === 'S' ? 7.2 : carrier.facing === 'N' ? -7.2 : 0 } : { x: 0, y: 0 };
        const actor = { ...carrier, x: clamp(carrier.x + velocity.x * age * DT, 1, 104), y: clamp(carrier.y + velocity.y * age * DT, 1, 67), motionAge: carrier.motionAge + (moving ? age : 0) };
        if (actor.action) actor.action = { ...actor.action, age: actor.action.age + age };
        if (actor.contactView && actor.contactView.ticks <= age) delete actor.contactView;
        return actor;
    }
    private pressurePoint(p: Player, carrier: Player): Point {
        const movingAcross = carrier.moving && !carrier.action && (carrier.facing === 'E' || carrier.facing === 'W');
        // If an immediate challenge is unavailable, approach an actual boot
        // starting position. Running onto the carrier's root can leave a slider
        // permanently too close to reach a stationary ball with the active boot.
        const direction = movingAcross ? (carrier.facing === 'E' ? 1 : -1) : signed(this.state.ball.x - p.x);
        const entry = pitchPose(this.poses.get(p.team === 0 ? 'tackle-entry' : 'orchard-tackle-entry')!), g = entry.anchors.ground, boot = entry.anchors.boot;
        const dx = (direction < 0 ? g[0] - boot[0] - 1 : boot[0] - g[0]) / PITCH.scaleX;
        const ball = this.anchor(this.forecastCarrier(carrier, 8));
        return { x: ball.x - dx - direction * 9 * DT, y: ball.y };
    }
    private challengeLooksReachable(p: Player, carrier: Player) {
        // A decision forecast, never a contact grant. Only the visible carrier
        // facing/action is extrapolated; future input and seeded choices are not read.
        const direction = signed(this.state.ball.x - p.x);
        const futureDefender = (age: number): Player => {
            const actor = { ...p, x: clamp(p.x + direction * Math.max(0, age - 7) * 9 * DT, Math.min(1, p.x), Math.max(104, p.x)), action: { kind: 'tackle' as const, age, target: { x: 0, y: 0 }, released: false, hit: false, direction: { x: direction, y: 0 } } };
            if (actor.contactView && actor.contactView.ticks <= age) delete actor.contactView;
            return actor;
        };
        for (let age = 8; age < 20; age++) {
            const a = futureDefender(age - 1), b = futureDefender(age), oldCarrier = this.forecastCarrier(carrier, age - 1), nextCarrier = this.forecastCarrier(carrier, age);
            const boot = sweep(space(this.anchor(a)), space(this.anchor(b)), space(this.anchor(oldCarrier)), space(this.anchor(nextCarrier)), CONTACT.boot);
            const body = sweep(space({ ...a, z: 0 }), space({ ...b, z: 0 }), space({ ...oldCarrier, z: 0 }), space({ ...nextCarrier, z: 0 }), CONTACT.body);
            if (body && (!boot || body.fraction < boot.fraction)) return false;
            if (boot) return true;
        }
        return false;
    }
    private openOutlet(p: Player): Player | undefined {
        const opponents = this.state.players.filter(v => v.team !== p.team), d = this.attack(p.team);
        const options = this.state.players.filter(q => q.team === p.team && q.role === 'outfield' && q.id !== p.id && !q.action && q.cooldown <= 0).flatMap(q => {
            const dx = q.x - p.x, dy = q.y - p.y, distance = Math.hypot(dx, dy), progress = dx * d;
            if (distance < 5 || distance > 32 || progress < 2) return [];
            const clearance = Math.min(...opponents.map(v => length(v, q)));
            if (clearance < 3) return [];
            const blocked = opponents.some(v => {
                const fraction = ((v.x - p.x) * dx + (v.y - p.y) * dy) / (distance * distance);
                return fraction > .12 && fraction < .92 && Math.hypot(v.x - p.x - dx * fraction, v.y - p.y - dy * fraction) < 2.4;
            });
            return blocked ? [] : [{ player: q, score: progress * .8 - distance * .15 + Math.min(clearance, 8) * .4 }];
        });
        options.sort((a,b) => b.score - a.score || a.player.id - b.player.id);
        return options[0]?.player;
    }
    private ai(p: Player) {
        const s = this.state;
        if (p.action || p.cooldown > 0)
            return;
        const view = s.shotView;
        if (view?.keeper === p.id) {
            p.moving = false;
            if (view.phase === 'flight' && view.age > 16) {
                const pose = this.poses.get(this.view(p).pose)!, g = pose.anchors.ground, h = pose.anchors[Math.abs(view.aim.x - GOAL_VIEW.centreX) >= 26 ? 'leftHand' : 'rightHand'], offset = view.aim.x < GOAL_VIEW.centreX ? g[0] - h[0] - 1 : h[0] - g[0];
                this.move(p, { x: p.x, y: clamp(34 + (view.aim.x - offset - GOAL_VIEW.centreX) / GOAL_VIEW.lateralScale, 25, 43) }, 39 / GOAL_VIEW.lateralScale);
            }
            return;
        }
        if (s.aerial && s.aerial.controlledBy === null && s.owner === null) {
            const b = s.ball, upper = this.anchor(p, 'upperTorso', { pose: p.team === 0 ? 'signal' : 'orchard-signal', mirror: b.x > p.x }), forecast = { x: b.x + b.vx * .2, y: b.y + b.vy * .2, z: b.z + b.vz * .2 - 54 * .04 };
            if (p.role === 'outfield' && Math.hypot((forecast.x - upper.x) * PITCH.scaleX, (forecast.y - upper.y) * PITCH.scaleY, forecast.z - upper.z) < 15) {
                this.control(p);
                return;
            }
            if (s.aerial.target === p.id) {
                this.move(p, s.aerial.spot, 7.2);
                return;
            }
        }
        const d = this.attack(p.team), owner = s.owner === null ? null : s.players[s.owner];
        if (p.role === 'keeper') {
            const own = d === 1 ? 3 : 102;
            this.move(p, { x: own, y: clamp(s.ball.y, 27, 41) }, 6.8);
            return;
        }
        if (owner?.id === p.id) {
            if (s.tick >= p.decisionTick) {
                const threat = s.players.filter(v => v.team !== p.team && length(v,p) < 6 && Math.abs(v.y-p.y) < 3.5).sort((a,b) => length(a,p)-length(b,p) || a.id-b.id)[0];
                const away = threat ? p.y === threat.y ? (p.slot % 2 ? 1 : -1) : signed(p.y-threat.y) : 0;
                p.aiCarryY = threat ? clamp(p.y + away * 6,12,56) : clamp(34 + (p.home.y-34)*.3,12,56);
            }
            this.move(p, { x: p.x + d * 10, y: p.aiCarryY ?? clamp(34 + (p.home.y - 34) * .3, 12, 56) }, 7.2);
            if (s.tick >= p.decisionTick) {
                p.decisionTick = s.tick + 36;
                if (this.attackProgress(p) > 75)
                    this.kick(p, 'shot');
                else {
                    const near = s.players.some(v => v.team !== p.team && (length(v,p) < 3 || (length(v,p) < 6 && (v.x-p.x)*d > 0 && Math.abs(v.y-p.y)<3.5)));
                    const outlet = this.openOutlet(p);
                    if (outlet && (near || this.random() < .12))
                        this.kick(p, length(p, outlet) > 18 && this.random() < .25 ? 'loft' : 'pass', false, outlet);
                }
            }
            return;
        }
        const candidates = s.players.filter(v => v.team === p.team && v.role === 'outfield' && !v.action && v.cooldown <= 0).sort((a, b) => length(a, s.ball) - length(b, s.ball) || a.id - b.id), chaser = candidates[0]?.id === p.id;
        if (chaser && (!owner || owner.team !== p.team)) {
            if (owner && length(p, owner) < 9 && s.tick >= p.decisionTick && this.challengeLooksReachable(p, owner)) {
                p.decisionTick = s.tick + 90;
                this.tackle(p);
                return;
            }
            this.move(p, owner ? this.pressurePoint(p, owner) : s.ball, 7.2);
            if (owner && length(p, owner) < 9 && s.tick >= p.decisionTick) {
                p.decisionTick = s.tick + 6;
                if (this.challengeLooksReachable(p, owner)) {
                    p.decisionTick = s.tick + 90;
                    this.tackle(p);
                }
            }
            return;
        }
        if (owner && owner.team !== p.team && candidates[1]?.id === p.id) {
            // A second ready defender stays goal-side while the first presses.
            // After a contact/release the ordinary loose-ball ranking takes over.
            this.move(p, { x: owner.x - d * 5, y: clamp(owner.y + (p.home.y < owner.y ? -1.5 : 1.5), 3, 65) }, 7.2);
            return;
        }
        const pressure = owner?.team === p.team ? 10 : -4, shift = clamp((s.ball.x - 52.5) * .22, -12, 12), mark = s.players.find(v => v.team !== p.team && v.slot === p.slot);
        let target = { x: clamp(p.home.x + shift + d * pressure, 5, 100), y: clamp(p.home.y + (s.ball.y - 34) * .18, 4, 64) };
        if (owner && owner.team !== p.team && mark && length(p, mark) < 14)
            target = { x: mark.x - d * 3, y: mark.y };
        this.move(p, target, 7.2);
    }
    private canChance(p: Player) { const keeper = this.state.players[opposite(p.team) * 11], d = this.attack(p.team); return this.attackProgress(p) > 70 && p.y >= 20 && p.y <= 48 && (keeper.x - p.x) * d > 2; }
    private beginChance(p: Player, human = true) {
        const s = this.state;
        if (s.owner !== p.id || p.action || s.shotView)
            return;
        const keeper = s.players[opposite(p.team) * 11], direction = this.attack(p.team), depth = Math.max(3, (keeper.x - p.x) * direction), scale = clamp(GOAL_VIEW.separation / depth, 1, 16), keeperDepth = direction === 1 ? 105 - keeper.x : keeper.x,planeY=GOAL_VIEW.keeperY-keeperDepth*scale;
        s.shotView = { direction, phase: 'aim', shooter: p.id, keeper: keeper.id, team: p.team, age: 0, aim: human ? { x: GOAL_VIEW.centreX, y: planeY-32 } : { x: GOAL_VIEW.centreX-75 + this.random() * 150, y: planeY-10-this.random()*50 }, depthScale: scale, planeY };
        p.moving = false;
        this.clear();
        this.emit('shooting-camera-enter', { player: p.id, team: p.team, direction });
        s.message = 'CHANCE - aim with arrow keys, S to shoot (auto release after 1.5 seconds).';
        if (!human)
            this.confirmChance();
    }
    private confirmChance() { const s = this.state, v = s.shotView; if (!v || v.phase !== 'aim')
        return; const p = s.players[v.shooter]; if (s.owner !== p.id || p.action) {
        this.exitShotView('possession-lost');
        return;
    } v.phase = 'windup'; v.age = 0; this.clear(); this.kick(p, 'shot'); }
    private exitShotView(reason: string) { const s = this.state, v = s.shotView; if (!v)
        return; s.shotView = null; const keeper = s.players[v.keeper]; if (keeper?.contactView)
        keeper.contactView.view = { pose: keeper.contactView.view.pose, mirror: this.attack(keeper.team) < 0 }; this.clear(); this.emit('shooting-camera-return', { reason, ball: { ...s.ball } }); }
    private updateShotView() {
        const s = this.state, v = s.shotView;
        if (!v)
            return;
        v.age++;
        if ((v.phase === 'aim' || v.phase === 'windup') && s.owner !== v.shooter) {
            this.exitShotView('possession-lost');
            return;
        }
        if (v.phase === 'aim') {
            const d = this.direction();
            v.aim.x = clamp(v.aim.x + d.x * 66 * DT, 24, 226);
            v.aim.y = clamp(v.aim.y + d.y * 66 * DT, 5, 120);
            if (v.age >= 90)
                this.confirmChance();
        }
        if (v.phase === 'parry' && v.age >= 16)
            this.exitShotView('parry');
        if (v.phase === 'goal' && v.age >= 45)
            this.exitShotView('goal');
    }
    private control(p: Player) { const s = this.state; if (p.role !== 'outfield' || p.action || p.cooldown || s.owner !== null || !s.aerial || s.aerial.controlledBy !== null)
        return; p.moving = false; p.motionAge = 0; delete p.contactView; p.action = { kind: 'control', age: 0, target: { x: 0, y: 0 }, released: false, hit: false, direction: { x: s.ball.x > p.x ? 1 : -1, y: 0 } }; if (p.team === 0 && p.id === s.selected)
        this.clear(); this.emit('upper-body-control-start', { player: p.id }); s.message = 'CONTROL - time the upper-body contact, then recover.'; }
    private loft(p: Player, a: Action, start: World) {
        const s = this.state, receiver = a.targetPlayer === undefined ? s.players.filter(q => q.team === p.team && q.role === 'outfield' && q.id !== p.id).sort((x, y) => length(x, a.target) - length(y, a.target))[0] : s.players[a.targetPlayer];
        const mirror = start.x > receiver.x, spot = { x: receiver.x, y: receiver.y }, target = this.anchor(receiver, 'upperTorso', { pose: receiver.team === 0 ? 'signal' : 'orchard-signal', mirror });
        const seconds = 64 / 60, r = Math.pow(.995, .5), factor = DT * (1 - Math.pow(r, 64)) / (1 - r);
        s.ball.vx = (target.x - start.x) / factor;
        s.ball.vy = (target.y - start.y) / factor;
        s.ball.vz = (target.z - start.z + 54 * seconds * seconds) / seconds;
        s.aerial = { kicker: p.id, target: receiver.id, spot, age: 0, controlledBy: null };
        if (p.team === 0) {
            s.selected = receiver.id;
            this.clear();
        }
        s.message = 'LOFT - T controls the aerial ball; S switches player.';
    }
    step() {
        const s = this.state;
        if (s.status !== 'playing')
            return;
        s.tick++;
        this.updateShotView();
        if (s.phase === 'goal') {
            if (++s.goalAge >= 120) {
                this.kickoff(s.pendingKickoff);
            }
            this.updateCamera();
            return;
        }
        if (s.phase === 'restart') {
            const r = s.restart!;
            r.age++;
            const p = s.players[r.taker];
            if (r.team === 1 && r.age >= 60 && !p.action)
                this.takeRestart(r.kind === 'corner');
            if (p.action) {
                p.action.age++;
                if (p.action.kind === 'throw' && p.action.age <= 12) this.setBall(this.throwAnchor(p));
                if (p.action.age === 12) {
                    if (p.action.kind !== 'throw') {
                        const foot = this.anchor(p);
                        p.x += r.point.x - foot.x;
                        p.y += r.point.y - foot.y;
                    }
                    this.release(p, p.action);
                }
            }
            this.updateCamera();
            return;
        }
        const cameraAtStart=s.shotView;
        const previous = s.players.map(p => ({ position:{x:p.x,y:p.y},upper: this.anchor(p, 'upperTorso'), foot: this.anchor(p), body: { ...p, z: 25 }, hands: p.role === 'keeper' ? ['leftHand', 'rightHand'].map(name => ({ name, point: this.anchor(p, name) })) : [] }));
        const oldBall = { ...s.ball };
        for (const p of s.players) {
            if (p.cooldown > 0)
                p.cooldown--;
            if (p.contactView && --p.contactView.ticks <= 0)
                delete p.contactView;
            const a = p.action;
            if (p.keeperCycle) {
                this.advanceKeeper(p);
            }
            else if (a) {
                a.age++;
                p.moving = false;
                if (a.kind === 'control') {
                    if (a.age >= 54) {
                        const v = this.view(p);
                        p.action = null;
                        p.cooldown = 1;
                        p.contactView = { view: v, ticks: 2 };
                        this.emit('upper-body-recovery-complete', { player: p.id, hit: a.hit });
                    }
                }
                else if (a.kind === 'stagger') {
                    if (a.age >= 24) {
                        const v = this.view(p);
                        p.action = null;
                        p.cooldown = 1;
                        p.contactView = { view: v, ticks: 2 };
                        this.emit('stagger-recovered', { player: p.id, team: p.team });
                    }
                }
                else if (a.kind === 'tackle') {
                    if (a.age >= 8 && a.age < 36) {
                        // Corner takers can still be outside the running inset.
                        // A tackle must not snap them across that inset either.
                        p.x = clamp(p.x + a.direction.x * (a.tackleStyle==='standing'?3:9) * DT, Math.min(1, p.x), Math.max(104, p.x));
                        p.moving = true;
                    }
                    if (a.age >= (a.tackleStyle==='standing'?30:84)) {
                        p.action = null;
                        p.cooldown = 1;
                        this.emit('recovered', { player: p.id });
                    }
                }
                else {
                    if (!a.released && !a.cancelled && a.age >= 12)
                        this.release(p, a);
                    if (a.age >= 30) {
                        p.action = null;
                        p.cooldown = 1;
                    }
                }
            }
            else if (s.shotView?.shooter === p.id) {
                p.moving = false;
            }
            else if (p.id === s.selected && p.team === 0 && p.role === 'outfield') {
                const v = this.direction();
                if (s.shotView?.phase === 'aim' && s.shotView.shooter === p.id) {
                    p.moving = false;
                    continue;
                }
                this.move(p, { x: p.x + v.x * 10, y: p.y + v.y * 10 }, 7.2);
            }
            else
                this.ai(p);
        }
        // Entering a different projection is instantaneous, not a hand movement.
        // AI can request CHANCE midway through this loop, so both collision ends
        // must use that new mapping and its current pose, with the old world root.
        if(s.shotView&&cameraAtStart!==s.shotView){const keeper=s.players[s.shotView.keeper],before=previous[keeper.id],pose=this.view(keeper);before.hands=['leftHand','rightHand'].map(name=>({name,point:this.anchor({...keeper,...before.position},name,pose)}));}
        if (s.owner !== null) {
            const owner = s.players[s.owner];
            this.attach(owner);
            s.possessionTicks[owner.team]++;
        }
        else {
            const b = s.ball;
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            b.z += b.vz * DT;
            const controlled = s.aerial?.controlledBy !== null && !!s.aerial;
            b.vz -= (controlled ? 270 : s.aerial ? 108 : 280) * DT;
            if (s.aerial)
                s.aerial.age++;
            if (controlled && b.z <= 1) {
                b.z = 1;
                b.vz = 0;
            }
            if (b.z < 0) {
                if (s.aerial && s.aerial.controlledBy === null) {
                    this.emit('aerial-bounce');
                    s.aerial = null;
                }
                b.z = 0;
                b.vz = Math.abs(b.vz) > 25 ? -b.vz * .38 : 0;
            }
            const drag = Math.pow(controlled ? .92 : b.z > 1 ? .995 : .985, DT * 30);
            b.vx *= drag;
            b.vy *= drag;
        }
        // Goal/boundary crossings and player contacts share one time interval. Earlier event wins.
        const boundary = this.boundary(oldBall, s.ball);
        const contacts: {
            fraction: number;
            p: Player;
            kind: string;
            anchor: string;
            point: World;
            ball: World;
            distance: number;
            segment?: Contact['segment'];
        }[] = [];
        for (const p of s.players) {
            if (p.id === s.owner)
                continue;
            const a = p.action, old = previous[p.id], isKicker = p.id === s.lastKicker && s.tick - s.releaseTick < 24;
            if (p.role === 'keeper') {
                const cycle=p.keeperCycle;
                if(cycle){
                    if(cycle.dropped&&!cycle.punted&&s.owner===null&&cycle.age>=KEEPER.puntAge&&cycle.age<KEEPER.puntEnd){
                        const view=this.view(p),before=this.anchor({...p,...old.position},'kickingFoot',view),after=this.anchor(p,'kickingFoot',view),hit=sweep(space(before),space(after),space(oldBall),space(s.ball),4);
                        if(hit)contacts.push({...hit,p,kind:'keeper-punt-contact',anchor:'kickingFoot',point:fromSpace(hit.anchor),ball:fromSpace(hit.ball),segment:{anchorStart:space(before),anchorEnd:space(after),ballStart:space(oldBall),ballEnd:space(s.ball),radius:4}});
                    }
                    continue;
                }
                const own = this.attack(p.team) === 1 ? s.ball.x < 17 : s.ball.x > 88;
                if (!own || s.ball.y < 20 || s.ball.y > 48 || isKicker || p.cooldown > 0)
                    continue;
                // A changed raster pose/projection is not a swept hand movement.
                const currentView=this.view(p);
                const hands=['leftHand','rightHand'].map(name=>({name,point:this.anchor({...p,...old.position},name,currentView)}));
                for (const h of hands) {
                    const metric = s.shotView?.keeper === p.id ? (q: World) => goalSpace(q, s.shotView!) : space;
                    const radius = s.shotView?.keeper === p.id ? 6 : CONTACT.receive;
                    const hit = sweep(metric(h.point), metric(this.anchor(p, h.name)), metric(oldBall), metric(s.ball), radius);
                    if (hit)
                        contacts.push({ ...hit, p, kind: 'save', anchor: h.name, point: s.shotView?.keeper === p.id ? fromGoalSpace(hit.anchor, s.shotView) : fromSpace(hit.anchor), ball: s.shotView?.keeper === p.id ? fromGoalSpace(hit.ball, s.shotView) : fromSpace(hit.ball), segment: { anchorStart: metric(h.point), anchorEnd: metric(this.anchor(p, h.name)), ballStart: metric(oldBall), ballEnd: metric(s.ball), radius } });
                }
                continue;
            }
            if (a?.kind === 'control' && a.age >= 8 && a.age < 20 && !a.hit && s.aerial?.controlledBy === null) {
                const hit = sweep(space(old.upper), space(this.anchor(p, 'upperTorso')), space(oldBall), space(s.ball), CONTACT.upper);
                if (hit)
                    contacts.push({ ...hit, p, kind: 'upper-body-contact', anchor: 'upperTorso', point: fromSpace(hit.anchor), ball: fromSpace(hit.ball), segment: { anchorStart: space(old.upper), anchorEnd: space(this.anchor(p, 'upperTorso')), ballStart: space(oldBall), ballEnd: space(s.ball), radius: CONTACT.upper } });
                continue;
            }
            if (a?.kind === 'tackle' && a.age >= 8 && a.age < 36 && !a.hit) {
                const hit = sweep(space(old.foot), space(this.anchor(p)), space(oldBall), space(s.ball), CONTACT.boot);
                if (hit)
                    contacts.push({ ...hit, p, kind: 'tackle-contact', anchor: 'boot', point: fromSpace(hit.anchor), ball: fromSpace(hit.ball) });
                const owner = s.owner === null ? null : s.players[s.owner];
                if (owner && owner.team !== p.team) {
                    const body = sweep(space({ ...previous[p.id].body, z: 0 }), space({ ...p, z: 0 }), space({ ...previous[owner.id].body, z: 0 }), space({ ...owner, z: 0 }), CONTACT.body);
                    if (body)
                        contacts.push({ ...body, p, kind: 'foul', anchor: 'body', point: { x: p.x, y: p.y, z: 0 }, ball: { x: s.ball.x, y: s.ball.y, z: s.ball.z } });
                }
                continue;
            }
            if (a || p.cooldown > 0 || isKicker || s.owner !== null || s.ball.z > 6 || oldBall.z > 12)
                continue;
            const hit = sweep(space(old.foot), space(this.anchor(p)), space(oldBall), space(s.ball), CONTACT.receive);
            if (hit)
                contacts.push({ ...hit, p, kind: 'receive', anchor: 'foot', point: fromSpace(hit.anchor), ball: fromSpace(hit.ball) });
        }
        contacts.sort((a, b) => a.fraction - b.fraction || (a.kind === 'tackle-contact' ? -1 : b.kind === 'tackle-contact' ? 1 : a.p.id - b.p.id));
        const hit = contacts[0];
        if (boundary && (!hit || boundary.fraction < hit.fraction)) {
            this.applyBoundary(boundary);
        }
        else if (hit) {
            const p = hit.p;
            if (s.noDoubleTouch !== null && s.noDoubleTouch !== p.id)
                s.noDoubleTouch = null;
            const doubleTouch = hit.kind !== 'foul' && s.noDoubleTouch === p.id;
            this.emit(doubleTouch ? 'restart-double-touch' : hit.kind === 'receive' && s.aerial?.controlledBy === p.id ? 'aerial-foot-collection' : hit.kind, { segment: hit.segment, contactSpace: s.shotView?.keeper === p.id ? 'goal-pixels' : 'pitch-pixels', attemptedContact: hit.kind, player: p.id, team: p.team, pose: this.view(p).pose, mirror: this.view(p).mirror, anchor: hit.anchor, worldPoint: hit.point, worldBall: hit.ball, distance: hit.distance, fraction: hit.fraction });
            if (doubleTouch) {
                this.beginRestart('free-kick', opposite(p.team), { x: p.x, y: p.y });
                s.message = 'Second touch after restart - free kick.';
            }
            else if (hit.kind === 'foul') {
                p.action!.hit = true;
                const victim = opposite(p.team), penalty = (this.attack(victim) === 1 ? p.x > 88 : p.x < 17) && p.y > 20 && p.y < 48;
                this.beginRestart(penalty ? 'penalty' : 'free-kick', victim, penalty ? { x: this.attack(victim) === 1 ? 94 : 11, y: 34 } : { x: p.x, y: p.y });
            }
            else if (hit.kind === 'upper-body-contact') {
                p.action!.hit = true;
                s.aerial!.controlledBy = p.id;
                s.airContacts[p.team]++;
                s.lastTouch = p.team;
                this.setBall(hit.ball);
                s.ball.vx = (p.action!.direction.x > 0 ? 2.4 : -2.4) / PITCH.scaleX;
                s.ball.vz = 0;
                s.message = 'CONTROL CONTACT - complete recovery before collecting.';
            }
            else if(hit.kind==='keeper-punt-contact') {
                this.puntKeeper(p,hit.ball);
            }
            else if (hit.kind === 'save' && this.canSecure(p,hit.ball,oldBall)) {
                this.secureKeeper(p,hit.ball);
            }
            else if (hit.kind === 'save') {
                p.contactView = { view: this.view(p), ticks: 60 };
                s.aerial = null;
                if (s.shotView) {
                    s.shotView.phase = 'parry';
                    s.shotView.age = 0;
                    this.emit('close-keeper-parry', { player: p.id, viewPoint: goalSpace(this.anchor(p, hit.anchor), s.shotView) });
                }
                p.contactView = { view: this.view(p), ticks: 60 };
                s.saves[p.team]++;
                s.owner = null;
                s.lastTouch = p.team;
                s.lastKicker = p.id;
                s.releaseTick = s.tick;
                this.setBall(this.anchor(p, hit.anchor));
                s.ball.vx = this.attack(p.team) * 12;
                s.ball.vy = (s.ball.y < 34 ? -1 : 1) * 5;
                s.ball.vz = 40;
                p.cooldown = 60;
                s.message = 'SAVE — live rebound.';
            }
            else if (hit.kind === 'tackle-contact') {
                const victim = s.owner === null ? null : s.players[s.owner];
                p.action!.hit = true;
                s.aerial = null;
                this.exitShotView('tackle');
                s.owner = null;
                s.lastTouch = p.team;
                this.setBall(this.anchor(p));
                s.ball.vx = p.action!.direction.x * 6;
                s.ball.vz = 22;
                s.lastKicker = p.id;
                s.releaseTick = s.tick;
                if (victim && victim.team !== p.team) {
                    if (victim.action && !victim.action.released && !victim.action.cancelled)
                        this.emit('delivery-cancelled', { player: victim.id, reason: 'tackled' });
                    victim.action = { kind: 'stagger', age: 0, target: { x: 0, y: 0 }, released: false, hit: false, direction: { x: victim.facing === 'E' ? 1 : victim.facing === 'W' ? -1 : this.attack(victim.team), y: 0 } };
                    victim.moving = false;
                    delete victim.contactView;
                    delete victim.aiCarryY;
                    this.emit('stagger-start', { player: victim.id, team: victim.team, tackler: p.id });
                }
                s.message = 'Tackle contact — recover before collecting.';
            }
            else {
                if (s.aerial?.controlledBy === p.id)
                    s.airCollections[p.team]++;
                s.aerial = null;
                this.exitShotView('possession');
                s.owner = p.id;
                delete p.aiCarryY;
                p.decisionTick = Math.min(p.decisionTick, s.tick + 6);
                s.lastTouch = p.team;
                s.noDoubleTouch = null;
                if (p.team === 0)
                    s.selected = p.id;
                this.attach(p);
                s.message = p.team === 0 ? 'HARBOUR possession — P pass, L loft, S shoot.' : 'ORCHARD possession — T tackle, S switch, D slide.';
            }
        }
        else if (boundary)
            this.applyBoundary(boundary);
        // A goal crossing on the last live tick counts before the whistle. No later shot continuation.
        s.halfTicks++;
        if (s.halfTicks >= HALF_TICKS)
            this.endPeriod();
        this.updateCamera();
    }
    private boundary(a: World, b: World) {
        const r = .5, candidates: {
            fraction: number;
            edge: 'left' | 'right' | 'top' | 'bottom';
            point: World;
        }[] = [];
        for (const [axis, limit, edge] of [['x', -r, 'left'], ['x', 105 + r, 'right'], ['y', -r, 'top'], ['y', 68 + r, 'bottom']] as const) {
            const end = b[axis], start = a[axis];
            if ((limit < 0 ? end < limit : end > limit) && end !== start) {
                const t = (limit - start) / (end - start);
                if (t >= 0 && t <= 1)
                    candidates.push({ fraction: t, edge, point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t } });
            }
        }
        return candidates.sort((a, b) => a.fraction - b.fraction)[0] ?? null;
    }
    private applyBoundary(b: {
        edge: 'left' | 'right' | 'top' | 'bottom';
        point: World;
    }) {
        const s = this.state, p = b.point;
        if (b.edge === 'top' || b.edge === 'bottom') {
            this.beginRestart('throw-in', opposite(s.lastTouch), { x: clamp(p.x, 1, 104), y: b.edge === 'top' ? 0 : 68 });
            return;
        }
        const scoring: Team = (b.edge === 'right') === (s.half === 1) ? 0 : 1, defending = opposite(scoring);
        if (p.y >= PITCH.goalTop && p.y <= PITCH.goalBottom && p.z <= GOAL_HEIGHT - 3) {
            s.score[scoring]++;
            s.owner = null;
            s.phase = 'goal';
            if (s.shotView) {
                s.shotView.phase = 'goal';
                s.shotView.age = 0;
            }
            s.goalAge = 0;
            s.pendingKickoff = defending;
            this.clear();
            for (const actor of s.players) {
                actor.action = null;
                delete actor.keeperCycle;
                actor.moving = false;
            }
            this.setBall(p);
            this.emit('goal', { team: scoring, score: [...s.score] });
            s.message = `GOAL ${scoring === 0 ? 'HARBOUR' : 'ORCHARD'} — ${s.score[0]} : ${s.score[1]}`;
        }
        else if (s.lastTouch === defending)
            this.beginRestart('corner', scoring, { x: b.edge === 'right' ? 104.5 : .5, y: p.y < 34 ? .5 : 67.5 });
        else
            this.beginRestart('goal-kick', defending, { x: b.edge === 'right' ? 99 : 6, y: 34 });
    }
    private endPeriod() {
        const s = this.state;
        this.exitShotView('whistle');
        s.aerial = null;
        this.clear();
        s.owner = null;
        s.restart = null;
        s.noDoubleTouch = null;
        for (const p of s.players) {
            p.action = null;
            delete p.keeperCycle;
            delete p.contactView;
            p.moving = false;
        }
        Object.assign(s.ball, { vx: 0, vy: 0, vz: 0 });
        if (s.half === 1) {
            s.status = 'halftime';
            s.message = `HALFTIME ${s.score[0]} : ${s.score[1]} — Continue to switch ends.`;
            this.emit('halftime');
        }
        else {
            s.status = 'complete';
            s.message = `FULL TIME ${s.score[0]} : ${s.score[1]} — ${s.score[0] === s.score[1] ? 'DRAW' : s.score[0] > s.score[1] ? 'HARBOUR WINS' : 'ORCHARD WINS'}.`;
            this.emit('fulltime');
        }
    }
    private updateCamera() { const s=this.state,q=project(s.ball),focus=s.owner===null?q:project(s.players[s.owner]);const velocity=s.owner===null?{x:s.ball.vx*PITCH.scaleX,y:s.ball.vy*PITCH.scaleY}:this.state.players[s.owner].moving?{x:(this.state.players[s.owner].facing==='W'?-7.2:this.state.players[s.owner].facing==='E'?7.2:0)*PITCH.scaleX,y:0}:{x:0,y:0};s.camera=followingCamera(focus,velocity,s.camera,this.viewportWidth); }
}
const signed = (n: number) => n >= 0 ? 1 : -1;
