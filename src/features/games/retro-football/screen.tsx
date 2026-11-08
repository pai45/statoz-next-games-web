"use client";
import {useEffect, useRef, useState} from "react";
import {useGameReturn} from "../shared/hooks/use-game-return";
import {publicAsset} from "@/shared/config";
import {useAuthSession} from "@/features/auth";
import type {GameLauncherProps} from "../components/game-launcher";
import {FOOTBALL_ID, FOOTBALL_PROTOCOL, readEnvelope, readResult, readSettings} from "./protocol";
import {readArchive, writeArchive} from "./persistence";
import styles from "./screen.module.css";

export function RetroFootball({entry}: GameLauncherProps) {
  const account = useAuthSession().email;
  const frame = useRef<HTMLIFrameElement>(null), leave = useGameReturn();
  const [attempt, setAttempt] = useState(0), [error, setError] = useState("");
  const [launch, setLaunch] = useState<{id: string; src: string} | null>(null), [ready, setReady] = useState(false);
  useEffect(() => {
    const id = crypto.randomUUID();
    let active = true, launched = false;
    let storage: Storage | null = null;
    try {storage = window.localStorage;} catch {}
    let archive = readArchive(storage);
    const completed = new Set<string>();
    const send = (type: string, payload: unknown = {}) => frame.current?.contentWindow?.postMessage({protocolVersion: FOOTBALL_PROTOCOL, gameId: FOOTBALL_ID, sessionId: id, type, payload}, location.origin);
    const timeout = window.setTimeout(() => {if(active && !launched)setError("Retro Football could not load. Check your connection and retry.");}, 25000);
    const receive = (event: MessageEvent) => {
      if (!active || event.source !== frame.current?.contentWindow || event.origin !== location.origin) return;
      // Account switching replaces the shared player records before React remounts.
      // Ignore a late message from the former account during that interval.
      if (storage) {
        try {
          const current = JSON.parse(storage.getItem("statoz.next.games-web.auth.v2") ?? "null");
          if (current?.version !== 2 || current?.authenticated !== true || current?.email?.trim().toLowerCase() !== account) return;
        } catch {return;}
      }
      const message = readEnvelope(event.data, id);
      if (!message) return;
      if (message.type === "ready") {
        send("launch", archive.settings);launched = true;setReady(true);setError("");window.clearTimeout(timeout);
      } else if (message.type === "error") {
        setError("Retro Football could not continue. Retry loading or return to football.");setReady(false);
      } else if (launched) {
        if (message.type === "settings") {
          const settings = readSettings(message.payload);
          if (settings) {archive = {...archive, settings};writeArchive(storage, archive);}
        } else if (message.type === "result") {
          const payload = message.payload as {resultId?:unknown;result?:unknown} | null;
          const result = readResult(payload?.result), resultId = payload?.resultId;
          if (result && typeof resultId === "string" && resultId.startsWith(id+":") && resultId.length <= 160 && !completed.has(resultId)) {
            completed.add(resultId);archive = {...archive, results: [...archive.results, {id: resultId, completedAt: new Date().toISOString(), result}].slice(-20)};
            writeArchive(storage, archive);
          }
        } else if (message.type === "exit") leave();
      }
    };
    const background = () => {if(document.hidden)send("pause");};
    window.addEventListener("message", receive);document.addEventListener("visibilitychange", background);
    // Listener is installed before the iframe can announce ready.
    setLaunch({id, src: publicAsset(`/games/retro-football/index.html?host=web&session=${encodeURIComponent(id)}`)});
    return () => {active = false;window.clearTimeout(timeout);send("dispose");window.removeEventListener("message", receive);document.removeEventListener("visibilitychange", background);};
  }, [attempt, leave, account]);
  return <section className={styles.root} aria-label={entry.title}>
    {launch && <iframe key={launch.id} ref={frame} src={launch.src} title="Retro Football exhibition" className={styles.frame} allow="autoplay; fullscreen" allowFullScreen onError={() => setError("Retro Football could not load. Please retry.")} />}
    {(!ready || error) && <div className={styles.notice} role={error ? "alert" : "status"}>
      <p>{error || "LOADING RETRO FOOTBALL…"}</p>
      {error && <button type="button" onClick={() => {setReady(false);setError("");setAttempt(n => n+1);}}>Retry loading</button>}
      <button type="button" onClick={leave}>Back to Games</button>
    </div>}
  </section>;
}
