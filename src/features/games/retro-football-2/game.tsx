"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {mountRetroPresentation} from "../shared/retro/runtime";
import {RetroPresentationSettings} from "../shared/retro/settings";
import {HoopsJoystick} from "../retro-hoops/joystick";
type ArcadeEvent = {type: string; payload: Record<string, unknown>};
type FootballGameProps = {onExit: () => void; onEvent?: (event: ArcadeEvent) => void; hostCommand?: {id: number; type: "pause" | "resume" | "dispose"}};
import {ARCADE, FootballArcadeInput} from "./input";
import styles from "./screen.module.css";

type Boot = {assetRoot?: string; storageScope?: string; origin?: string};
type RuntimeWindow = Window & {__retroFootball2Unlock?: () => void};
const PREFS = "statoz.next.games-web.retro-football-2.controls.v1";
type Preferences = {scale: number; leftHanded: boolean; volume: number};
const defaults: Preferences = {scale: 1, leftHanded: false, volume: 0.65};

export function RetroFootball2Game({onExit, onEvent, hostCommand}: FootballGameProps) {
  const shell = useRef<HTMLElement>(null), frame = useRef<HTMLIFrameElement>(null), session = useRef("");
  const [started, setStarted] = useState(false), [ready, setReady] = useState(false), [booted, setBooted] = useState(false);
  const [paused, setPaused] = useState(false), [options, setOptions] = useState(false), [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0), [source, setSource] = useState("");
  const [prefs, setPrefs] = useState(defaults);
  const state = useRef({ready, booted, paused, started, options}); state.current = {ready, booted, paused, started, options};
  const events = useRef(onEvent); events.current = onEvent;
  const send = useCallback((type: string, extra: Record<string, unknown> = {}) => {
    const element = frame.current;
    if (!element?.src || !session.current) return;
    element.contentWindow?.postMessage({protocol: "retro-football-2-local", version: 1, session: session.current, type, ...extra}, new URL(element.src).origin);
  }, []);
  const input = useRef<FootballArcadeInput | null>(null);
  if (!input.current) input.current = new FootballArcadeInput((button, value) => send("input", {button, value}));
  const getInput = useCallback(() => input.current, []);
  const release = useCallback(() => { input.current?.clear(); send("release"); shell.current?.querySelectorAll("[data-held]").forEach(element => element.removeAttribute("data-held")); }, [send]);
  const pause = useCallback(() => { release(); send("pause"); setPaused(true); }, [release, send]);
  const unlockAudio = () => { try { (frame.current?.contentWindow as RuntimeWindow | null)?.__retroFootball2Unlock?.(); } catch { /* Runtime may still be loading. */ } };
  const resume = () => { unlockAudio(); send("resume"); setPaused(false); };

  useEffect(() => mountRetroPresentation(shell.current!, () => { if (state.current.started) pause(); }), [pause]);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(PREFS) || "null"); if (value) setPrefs({scale: typeof value.scale === "number" ? Math.max(0.85, Math.min(1.25, value.scale)) : 1, leftHanded: value.leftHanded === true, volume: typeof value.volume === "number" ? Math.max(0, Math.min(1, value.volume)) : 0.65}); } catch { /* Temporary play when storage is unavailable. */ }
  }, []);
  useEffect(() => { send("volume", {value: prefs.volume}); }, [prefs.volume, ready, send]);
  useEffect(() => {
    if (!started) return;
    const boot = (window as Window & {__STATOZ_BOOT__?: Boot}).__STATOZ_BOOT__;
    session.current = crypto.randomUUID();
    const base = boot?.assetRoot ?? `${location.pathname.split(/\/embedded-games\/|\/play\//)[0]}/games/retro-football-2/`;
    const url = new URL("arcade/index.html", new URL(base, document.baseURI));
    url.searchParams.set("session", session.current); url.searchParams.set("scope", boot?.storageScope ?? "guest");
    setSource(url.href);
    const receive = (event: MessageEvent) => {
      const value = event.data;
      if (event.source !== frame.current?.contentWindow || event.origin !== url.origin || value?.protocol !== "retro-football-2-local" || value.version !== 1 || value.session !== session.current) return;
      if (value.type === "ready") { setReady(true); send("start"); events.current?.({type: "ready", payload: {gameId: "retro-football-2", title: "Retro Football 2", emulator: "EmulatorJS 4.2.3 / FBNeo"}}); }
      if (value.type === "booted") setBooted(true);
      if (value.type === "interrupted") pause();
      if (value.type === "error") { release(); setError(typeof value.payload?.message === "string" ? value.payload.message : "The arcade could not start."); }
    };
    window.addEventListener("message", receive);
    const timeout = window.setTimeout(() => { if (!state.current.ready) { release(); setError("The local arcade files did not finish loading. Retry loading."); } }, 95000);
    return () => { window.clearTimeout(timeout); release(); send("dispose"); window.removeEventListener("message", receive); };
  }, [attempt, started, pause, release, send]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const editable = event.target instanceof HTMLElement && !!event.target.closest("input,select,textarea,[contenteditable=true]");
      if (event.target instanceof HTMLElement && event.target.closest("button") && ["Enter", "Space"].includes(event.code)) return;
      if (editable || !state.current.started) return;
      if (event.type === "keydown" && !event.repeat && ["Escape", "KeyP"].includes(event.code)) { event.preventDefault(); if (!state.current.options) { if (state.current.paused) { send("resume"); setPaused(false); } else pause(); } return; }
      if (!state.current.ready || !state.current.booted || state.current.paused || state.current.options) return;
      if (input.current?.key(event.code, event.type === "keydown")) event.preventDefault();
    };
    const blur = () => { if (state.current.started && !state.current.paused) pause(); else release(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", key); window.addEventListener("keyup", key); window.addEventListener("blur", blur); document.addEventListener("visibilitychange", visibility);
    return () => { release(); window.removeEventListener("keydown", key); window.removeEventListener("keyup", key); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", visibility); };
  }, [pause, release, send]);
  useEffect(() => { if (hostCommand?.type === "pause") pause(); else if (hostCommand?.type === "resume" && state.current.started) { send("resume"); setPaused(false); } }, [hostCommand, pause, send]);
  useEffect(() => {
    if (!options) return;
    const previous = document.activeElement, dialog = shell.current?.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); setOptions(false); }
      if (event.key === "Tab" && dialog) { const controls = [...dialog.querySelectorAll<HTMLElement>("button,input,select")]; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); if (previous instanceof HTMLElement) previous.focus(); };
  }, [options]);
  const change = (next: Preferences) => { setPrefs(next); try { localStorage.setItem(PREFS, JSON.stringify(next)); } catch { /* Preferences remain usable for this visit. */ } };
  const active = ready && booted && !paused && !options && !error;
  const button = (action: "shoot" | "pass" | "short", face: string, label: string) => <button className={styles.action} disabled={!active} data-control={action} aria-label={label} onContextMenu={event => event.preventDefault()}
    onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.held = "true"; unlockAudio(); input.current?.down(`touch:${event.pointerId}`, ARCADE[action]); }}
    onPointerUp={event => { delete event.currentTarget.dataset.held; input.current?.up(`touch:${event.pointerId}`); }}
    onPointerCancel={event => { delete event.currentTarget.dataset.held; input.current?.up(`touch:${event.pointerId}`, true); }}
    onLostPointerCapture={event => { if (event.currentTarget.dataset.held) { delete event.currentTarget.dataset.held; input.current?.up(`touch:${event.pointerId}`, true); } }}><b>{face}</b><small>{label}</small></button>;
  const start = () => { setError(""); if (started) { setReady(false); setBooted(false); setPaused(false); setAttempt(value => value + 1); } else setStarted(true); };
  return <section ref={shell} data-retro-frame data-retro-football-2 data-controls-active={active} data-left-handed={prefs.leftHanded} className={styles.root} style={{"--control-scale": prefs.scale} as React.CSSProperties} aria-label="Retro Football 2 arcade football">
    <div data-retro-console className={styles.console}>
      <header className={styles.header}><button onClick={() => { release(); send("dispose"); events.current?.({type: "exit", payload: {}}); onExit(); }}>Exit</button><h1>RETRO FOOTBALL 2 <small>NEO GEO / FOOTBALL</small></h1><div className={styles.utilities}>
        <button disabled={!active} onClick={() => { unlockAudio(); send("coin"); }} aria-label="Insert coin">Coin</button><button disabled={!active} onClick={() => { unlockAudio(); send("start-only"); }} aria-label="Arcade Start">Start</button>
        <button disabled={!ready} onClick={() => paused ? resume() : pause()}>{paused ? "Resume" : "Pause"}</button><button aria-label="Settings" onClick={() => { if (started) pause(); setOptions(true); }}>Settings</button></div></header>
      <aside data-retro-grip="left" className={styles.leftGrip} aria-label="Movement controls"><HoopsJoystick input={getInput} disabled={!active}/><span data-retro-decoration className={styles.gripLabel}>8-WAY CONTROL</span></aside>
      <main data-retro-display className={styles.display}>
        {source && <iframe ref={frame} src={source} title="Retro Football 2 arcade engine" allow="autoplay; gamepad" tabIndex={-1} className={styles.engine} onError={() => setError("The local arcade files could not load.")}/>}
        {(!started || !ready || error || paused) && <div className={styles.overlay} role={error ? "alert" : "status"}>
          <span className={styles.kicker}>SUPER SIDEKICKS 2 / LOCAL ARCADE</span><h2>{error ? "ARCADE UNAVAILABLE" : !started ? "RETRO FOOTBALL 2" : paused ? "PAUSED" : "LOADING RETRO FOOTBALL 2"}</h2>
          {error ? <><p>{error}</p><button onClick={start}>Retry loading</button></> : !started ? <><p>Move with the stick. A: shoot / low pass or slide. B: high pass or tackle. C: short pass or switch player. A confirms selections; Start finishes team-name entry.</p><button onClick={start}>Play Retro Football 2</button><small>A credit and Start are sent after the arcade boots.</small></> : paused ? <button onClick={resume}>Resume game</button> : <p>Loading the local arcade engine and cartridgeâ€¦</p>}
        </div>}
      </main>
      <aside data-retro-grip="right" className={styles.rightGrip} aria-label="Action controls"><div className={styles.actions}>{button("short", "C", "Pass / switch")}{button("pass", "B", "Lob / tackle")}{button("shoot", "A", "Shot / slide")}</div><span data-retro-decoration className={styles.gripLabel}>HOLD / RELEASE TO PLAY</span></aside>
      <footer data-retro-decoration className={styles.footer}>RETRO FOOTBALL 2 Â· LOCAL ARCADE</footer>
    </div>
    {options && <div className={styles.backdrop}><section className={styles.settings} role="dialog" aria-modal="true" aria-label="Retro Football 2 settings"><h2>RETRO FOOTBALL 2 SETTINGS</h2><button onClick={() => setOptions(false)}>Back to game</button><RetroPresentationSettings/>
      <label>Touch button size<input aria-label="Touch button size" type="range" min="0.85" max="1.25" step="0.05" value={prefs.scale} onChange={event => change({...prefs, scale: Number(event.target.value)})}/></label>
      <label>Left-handed controls<input type="checkbox" checked={prefs.leftHanded} onChange={event => { release(); change({...prefs, leftHanded: event.target.checked}); }}/></label>
      <label>Game volume<input aria-label="Game volume" type="range" min="0" max="1" step="0.05" value={prefs.volume} onChange={event => change({...prefs, volume: Number(event.target.value)})}/></label>
      <p>Move: arrows / WASD. A: J or Z. B: K or X. C: L or C. Coin: Right Shift or 5. Start: Enter. Pause: P or Escape.</p><p>Original arcade rules and sound. Coin adds an emulated credit; it has no payment function.</p><small>After changing settings, resume when ready.</small></section></div>}
  </section>;
}
