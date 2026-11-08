"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {mountRetroPresentation} from "../shared/retro/runtime";
import {RetroPresentationSettings} from "../shared/retro/settings";
type ArcadeEvent = {type: string; payload: Record<string, unknown>};
type CricketGameProps = {onExit: () => void; onEvent?: (event: ArcadeEvent) => void; hostCommand?: {id: number; type: "pause" | "resume" | "dispose"}};
import {CricketInput} from "./input";
import styles from "./screen.module.css";

type Boot = {assetRoot?: string; storageScope?: string; origin?: string};
type RuntimeWindow = Window & {__stickCricketUnlock?: () => void};
const PREFS = "statoz.next.games-web.stick-cricket.controls.v1";
type Preferences = {scale: number; leftHanded: boolean; volume: number};
const defaults: Preferences = {scale: 1, leftHanded: false, volume: 0.65};

export function StickCricketGame({onExit, onEvent, hostCommand}: CricketGameProps) {
  const shell = useRef<HTMLElement>(null), frame = useRef<HTMLIFrameElement>(null), session = useRef("");
  const [ready, setReady] = useState(false), [booted, setBooted] = useState(false);
  const [paused, setPaused] = useState(false), [options, setOptions] = useState(false), [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0), [source, setSource] = useState("");
  const [prefs, setPrefs] = useState(defaults);
  const display = useRef<HTMLElement>(null);
  const [size, setSize] = useState({width: 640, height: 360});
  useEffect(() => { const node=display.current; if (!node) return; const observer=new ResizeObserver(([entry]) => { const width=Math.min(entry.contentRect.width,entry.contentRect.height*16/9); setSize({width,height:width*9/16}); }); observer.observe(node); return () => observer.disconnect(); }, []);
  const state = useRef({ready, booted, paused, options}); state.current = {ready, booted, paused, options};
  const events = useRef(onEvent); events.current = onEvent;
  const send = useCallback((type: string, extra: Record<string, unknown> = {}) => {
    const element = frame.current;
    if (!element?.src || !session.current) return;
    element.contentWindow?.postMessage({protocol: "stick-cricket-local", version: 1, session: session.current, type, ...extra}, new URL(element.src).origin);
  }, []);
  const input = useRef<CricketInput | null>(null);
  if (!input.current) input.current = new CricketInput((direction, value) => send("input", {direction, value}));
  
  const release = useCallback(() => { input.current?.clear(); send("release"); shell.current?.querySelectorAll("[data-held]").forEach(element => element.removeAttribute("data-held")); }, [send]);
  const pause = useCallback(() => { release(); send("pause"); setPaused(true); }, [release, send]);
  const unlockAudio = () => { try { (frame.current?.contentWindow as RuntimeWindow | null)?.__stickCricketUnlock?.(); } catch { /* Runtime may still be loading. */ } };
  const resume = () => { unlockAudio(); send("resume"); setPaused(false); };

  useEffect(() => mountRetroPresentation(shell.current!, () => { if (state.current.ready) pause(); }), [pause]);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(PREFS) || "null"); if (value) setPrefs({scale: typeof value.scale === "number" ? Math.max(0.85, Math.min(1.25, value.scale)) : 1, leftHanded: value.leftHanded === true, volume: typeof value.volume === "number" ? Math.max(0, Math.min(1, value.volume)) : 0.65}); } catch { /* Temporary play when storage is unavailable. */ }
  }, []);
  useEffect(() => { send("volume", {value: prefs.volume}); }, [prefs.volume, ready, send]);
  useEffect(() => {
    const boot = (window as Window & {__STATOZ_BOOT__?: Boot}).__STATOZ_BOOT__;
    session.current = crypto.randomUUID();
    const base = boot?.assetRoot ?? `${location.pathname.split(/\/embedded-games\/|\/play\//)[0]}/games/stick-cricket/`;
    const url = new URL("unity/index.html", new URL(base, document.baseURI));
    url.searchParams.set("session", session.current); url.searchParams.set("scope", boot?.storageScope ?? "guest");
    setSource(url.href);
    const receive = (event: MessageEvent) => {
      const value = event.data;
      if (event.source !== frame.current?.contentWindow || event.origin !== url.origin || value?.protocol !== "stick-cricket-local" || value.version !== 1 || value.session !== session.current) return;
      if (value.type === "ready") { setReady(true); setBooted(true); events.current?.({type: "ready", payload: {gameId: "stick-cricket", title: "Stick Cricket", engine: "Unity 6000.0.69f1 / Stick Cricket Chase 2.3.5"}}); }
      if (value.type === "booted") setBooted(true);
      if (value.type === "interrupted") pause();
      if (value.type === "error") { release(); setError(typeof value.payload?.message === "string" ? value.payload.message : "The arcade could not start."); }
    };
    window.addEventListener("message", receive);
    const timeout = window.setTimeout(() => { if (!state.current.ready) { release(); setError("The local game files did not finish loading. Retry loading."); } }, 120000);
    return () => { window.clearTimeout(timeout); release(); send("dispose"); window.removeEventListener("message", receive); };
  }, [attempt, pause, release, send]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const editable = event.target instanceof HTMLElement && !!event.target.closest("input,select,textarea,[contenteditable=true]");
      if (event.target instanceof HTMLElement && event.target.closest("button") && ["Enter", "Space"].includes(event.code)) return;
      if (editable || !state.current.ready) return;
      if (event.type === "keydown" && !event.repeat && ["Escape", "KeyP"].includes(event.code)) { event.preventDefault(); if (!state.current.options) { if (state.current.paused) { send("resume"); setPaused(false); } else pause(); } return; }
      if (!state.current.ready || !state.current.booted || state.current.paused || state.current.options) return;
      if (input.current?.key(event.code, event.type === "keydown")) event.preventDefault();
    };
    const blur = () => { if (document.hasFocus() && !document.hidden) return; if (state.current.ready && !state.current.paused) pause(); else release(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", key); window.addEventListener("keyup", key); window.addEventListener("blur", blur); document.addEventListener("visibilitychange", visibility);
    return () => { release(); window.removeEventListener("keydown", key); window.removeEventListener("keyup", key); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", visibility); };
  }, [pause, release, send]);
  useEffect(() => { if (hostCommand?.type === "pause") pause(); else if (hostCommand?.type === "resume" && state.current.ready) { send("resume"); setPaused(false); } }, [hostCommand, pause, send]);
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
  const button = (direction: "left" | "right") => <button className={styles.action} disabled={!active} data-control={direction} aria-label={`Bat ${direction}`} onContextMenu={event => event.preventDefault()}
    onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.held = "true"; unlockAudio(); input.current?.down(`touch:${event.pointerId}`, direction); }}
    onPointerUp={event => { delete event.currentTarget.dataset.held; input.current?.up(`touch:${event.pointerId}`); }}
    onPointerCancel={event => { delete event.currentTarget.dataset.held; input.current?.up(`touch:${event.pointerId}`, true); }}
    onLostPointerCapture={event => { if (event.currentTarget.dataset.held) { delete event.currentTarget.dataset.held; input.current?.up(`touch:${event.pointerId}`, true); } }}><b>{direction === "left" ? "\u25c0" : "\u25b6"}</b><small>BAT {direction.toUpperCase()}</small></button>;
  const start = () => { setError(""); setReady(false); setBooted(false); setPaused(false); setAttempt(value => value + 1); };
  return <section ref={shell} data-retro-frame data-stick-cricket data-controls-active={active} data-left-handed={prefs.leftHanded} className={styles.root} style={{"--control-scale": prefs.scale} as React.CSSProperties} aria-label="Stick Cricket cricket batting">
    <div data-retro-console className={styles.console}>
      <header className={styles.header}><button onClick={() => { release(); send("dispose"); onExit(); }}>Exit</button><h1>STICK CRICKET <small>TIMING / CRICKET</small></h1><div className={styles.utilities}>
        <button disabled={!ready} onClick={() => paused ? resume() : pause()}>{paused ? "Resume" : "Pause"}</button><button aria-label="Settings" onClick={() => { if (ready) pause(); setOptions(true); }}>Settings</button></div></header>
      <aside data-retro-grip="left" className={styles.leftGrip} aria-label="Left batting control">{button("left")}</aside>
      <main ref={display} data-retro-display className={styles.display}>
        {source && <iframe ref={frame} src={source} title="Stick Cricket native game engine" allow="autoplay; gamepad" tabIndex={-1} className={styles.engine} style={{width:size.width,height:size.height}} onError={() => setError("The local game files could not load.")}/>}
        {(!ready || error || paused) && <div className={styles.overlay} role={error ? "alert" : "status"}>
          <h2>{error ? "GAME UNAVAILABLE" : paused ? "PAUSED" : "LOADING STICK CRICKET"}</h2>
          {error ? <><p>{error}</p><button onClick={start}>Retry loading</button></> : paused ? <button onClick={resume}>Resume game</button> : <p>Loading the local game and stadium...</p>}
        </div>}

      </main>
      <aside data-retro-grip="right" className={styles.rightGrip} aria-label="Right batting control">{button("right")}</aside>
      <footer data-retro-decoration className={styles.footer}>STICK CRICKET Â· LOCAL GAME</footer>
    </div>
    {options && <div className={styles.backdrop}><section className={styles.settings} role="dialog" aria-modal="true" aria-label="Stick Cricket settings"><h2>STICK CRICKET SETTINGS</h2><button onClick={() => setOptions(false)}>Back to game</button><RetroPresentationSettings/>
      <label>Touch button size<input aria-label="Touch button size" type="range" min="0.85" max="1.25" step="0.05" value={prefs.scale} onChange={event => change({...prefs, scale: Number(event.target.value)})}/></label>
      <label>Game volume<input aria-label="Game volume" type="range" min="0" max="1" step="0.05" value={prefs.volume} onChange={event => change({...prefs, volume: Number(event.target.value)})}/></label>
      <p>Bat left: Left arrow / A. Bat right: Right arrow / D. Pause: P or Escape. Tap the native menus directly. On-screen mode uses the original game&apos;s large batting arrows.</p><p>Progress stays on this device for this account. Platform advertising and online sign-in are unavailable in local play; ad rewards are not granted.</p><small>After changing settings, resume when ready.</small></section></div>}
  </section>;
}
