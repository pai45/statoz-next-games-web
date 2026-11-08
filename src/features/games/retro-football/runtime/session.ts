import type { AssetManifest, Command, FootballResult, GameContext, GameSession, GameSettings } from './contracts';
import { DEFINITION } from './contracts';
import { FootballAudio } from './audio';
import { Simulation } from './simulation';
import { FootballRenderer } from './renderer';
export class FootballSession implements GameSession {
    readonly audio = new FootballAudio();
    readonly sim: Simulation;
    readonly renderer: FootballRenderer;
    settings: GameSettings;
    private previous: number | null = null;
    private accumulated = 0;
    private raf = 0;
    private disposed = false;
    private unavailable = false;
    private backgrounded = false;
    private resizeObserver:ResizeObserver;
    private framing:'wide'|'reference'='wide';
    private measuredWidth=384;
    setFraming(mode:'wide'|'reference'){
        this.framing=mode;this.sim.setViewportWidth(mode==='reference'?320:this.measuredWidth);this.renderer.resize(this.sim.viewportWidth);this.renderer.render(this.sim);
    }
    private listeners = new Set<() => void>();
    private resultSent = false;
    private eventCursor = 0;
    private controller = new AbortController();
    constructor(canvas: HTMLCanvasElement, manifest: AssetManifest, image: HTMLImageElement, readonly context: GameContext = {}) {
        this.sim = new Simulation(manifest);
        this.renderer = new FootballRenderer(canvas, manifest, image);
        this.resizeObserver=new ResizeObserver(entries=>{if(this.disposed)return;const r=entries[0]?.contentRect;if(!r||r.height<1)return;this.measuredWidth=224*r.width/r.height;this.setFraming(this.framing);});
        this.resizeObserver.observe(canvas.parentElement!);
        this.settings = { music: .4, sfx: .7 };
        this.setSettings(context.settings ?? {}, false);
        this.renderer.render(this.sim);
        this.raf = requestAnimationFrame(this.loop);
        canvas.addEventListener('webglcontextlost', event => {
            if (this.disposed)
                return;
            event.preventDefault();
            this.pause();
            this.unavailable = true;
            this.context.onError?.('Graphics context lost. Retry loading to continue.');
        }, { signal: this.controller.signal });
    }
    subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
    private publish() {
        this.renderer.render(this.sim);
        for (const event of this.sim.state.events) {
            const serial = Number(event.sequence);
            if (serial > this.eventCursor) {
                this.eventCursor = serial;
                this.audio.event(event);
                this.context.onEvent?.(structuredClone(event));
            }
        }
        this.audio.sync(this.backgrounded ? 'hidden' : this.sim.state.status);
        if (this.sim.state.status === 'complete') {
            if (!this.resultSent) {
                this.resultSent = true;
                this.context.onResult?.(this.result());
            }
        }
        for (const fn of this.listeners)
            fn();
    }
    result(): FootballResult { const s = this.sim.state; return { schemaVersion: 2, gameId: 'retro-football', mode: 'exhibition', airContacts: [...s.airContacts], airCollections: [...s.airCollections], outcome: s.score[0] === s.score[1] ? 'draw' : s.score[0] > s.score[1] ? 'win' : 'loss', score: [...s.score], halves: 2, activeSeconds: 180, passes: [...s.passes], shots: [...s.shots], saves: [...s.saves], rulesVersion: DEFINITION.rulesVersion, runtimeVersion: DEFINITION.runtimeVersion, assetVersion: DEFINITION.assetVersion }; }
    dispatch = (c: Command) => {
        if (this.disposed || this.unavailable)
            return;
        if(c.type!=='clear' && !(c.type==='hold'&&!c.value)) this.audio.unlock();
        const beforeRound = this.sim.state.round, beforeStatus = this.sim.state.status;
        this.sim.command(c);
        const newRound = this.sim.state.round !== beforeRound;
        if (this.sim.state.status !== beforeStatus || newRound) {
            this.previous = null;
            this.accumulated = 0;
        }
        if (newRound) {
            this.resultSent = false;
            this.eventCursor = 0;
        }
        this.publish();
        if(['start','resume'].includes(c.type))this.audio.ui();
    };
    step(ticks = 1) {
        if (this.disposed || this.unavailable)
            return;
        for (let n = 0; n < ticks; n++)
            this.sim.step();
        this.publish();
    }
    private loop = (now: number) => {
        if (this.disposed)
            return;
        if (this.sim.state.status === 'playing') {
            if (this.previous !== null)
                this.accumulated += Math.min(200, now - this.previous);
            const ticks = Math.min(12, Math.floor((this.accumulated + 1e-7) / (1000 / 60)));
            if (ticks) {
                this.step(ticks);
                this.accumulated -= ticks * 1000 / 60;
            }
            this.previous = now;
        }
        else
            this.previous = null;
        this.raf = requestAnimationFrame(this.loop);
    };
    start() { this.dispatch({ type: 'start' }); }
    pause() {
        if (this.sim.state.status === 'playing')
            this.dispatch({ type: 'pause' });
        else
            this.dispatch({ type: 'clear' });
    }
    resume() { this.dispatch({ type: 'resume' }); }
    setBackground(hidden: boolean) {
        if (this.disposed) return;
        this.backgrounded = hidden;
        if (hidden) this.pause();
        else this.audio.sync(this.sim.state.status);
    }
    restart() {
        if (this.disposed || this.unavailable)
            return;
        this.audio.unlock();
        this.sim.restart();
        this.previous = null;
        this.accumulated = 0;
        this.resultSent = false;
        this.eventCursor = 0;
        this.publish();
    }
    setSettings(value: Partial<GameSettings>, notify = true) {
        if (this.disposed) return;
        for (const key of ['music', 'sfx'] as const) {
            const v = value[key];
            if (v !== undefined && Number.isFinite(v))
                this.settings[key] = Math.max(0, Math.min(1, v));
        }
        this.audio.setSettings(this.settings);
        if (notify) this.context.onSettingsChange?.({...this.settings});
    }
    diagnostics() { return { ...this.renderer.diagnostics(), listeners: this.listeners.size, audio:this.audio.diagnostics(), pendingFrame: !this.disposed }; }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.controller.abort();
        this.resizeObserver.disconnect();
        cancelAnimationFrame(this.raf);
        this.sim.clear();
        this.listeners.clear();
        this.renderer.dispose();
        this.audio.dispose();
        this.previous = null;
        this.accumulated = 0;
    }
}
