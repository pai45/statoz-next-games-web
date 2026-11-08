/* eslint-disable @next/next/no-img-element -- Local identity SVGs also render in offline game bundles. */
"use client";

import { useEffect, useRef, useState } from "react";
import { useGameReturn } from "../shared/hooks/use-game-return";
import { Button } from "@statoz/design-system/games";
import { useAuthSession } from "@/features/auth";
import { publicAsset } from "@/shared/config";
import type { GameLauncherProps } from "../components/game-launcher";
import styles from "./screen.module.css";

export function RetroInnings({ entry }: GameLauncherProps) {
  const session = useAuthSession();
  // Account changes discard the old live session before another player's records load.
  return <PrivateCricket key={session.email ?? "guest"} title={entry.title} />;
}

function PrivateCricket({ title }: { title: string }) {
  const leave = useGameReturn();
  const [active, setActive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <section className={styles.root} aria-label={`${title} private cricket preview`}>
    <header className={styles.header}>
      <p className="ds-type-hud-label">CREASEFIRE SIX / PRIVATE PREVIEW</p>
      <Button variant="surface" onClick={leave}>
        {active ? "Exit game" : "Back to Games"}
      </Button>
    </header>
    {active ? <CricketSession key={attempt} onRetry={() => setAttempt(n => n + 1)} /> :
      <main className={styles.intro}>
        <p className="ds-type-hud-label">CRICKET / ONE OVER EACH</p>
        <img src={publicAsset("/assets/games/identity/retro-innings.svg")} alt="" width="120" height="88"/><h1 className="ds-type-heading">CREASEFIRE SIX</h1>
        <p>Choose Practice, Fast Match or One-Day Match, with team and over selection for One-Day. Bat with A for a ground shot or B for an aerial shot; hold a direction to place it. When bowling, tap or drag on the pitch to set the bounce point, then press A for fast or B for slow. Esc pauses.</p>
        <Button onClick={() => setActive(true)}>Load private game</Button>
        <p className={styles.note}>This preview uses source-derived reference artwork. It remains private. Sound starts off; enable it in Audio &amp; help. Settings and match records are saved locally for your account.</p>
      </main>}
  </section>;
}

function CricketSession({ onRetry }: { onRetry: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const timer = window.setTimeout(() => setFailed(true), 15000);
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== element.contentWindow) return;
      if (event.data?.type !== "statoz.next.games-web.retro-innings:ready" || event.data?.version !== 1) return;
      window.clearTimeout(timer);
      setReady(true);
      setFailed(false);
      element.focus();
    };
    window.addEventListener("message", receive);
    // Install the trusted ready listener before starting the bundled game request.
    element.src = publicAsset("/games/retro-innings/index.html");
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", receive);
    };
  }, []);
  return <div className={styles.session}>
    <iframe ref={frame} title="Retro Innings private cricket game" className={styles.frame}
      allow="autoplay" onError={() => setFailed(true)} />
    {(!ready || failed) && <div className={styles.notice} role={failed ? "alert" : "status"}>
      <p>{failed ? "Cricket could not load. Retry or return to Cricket." : "Loading private cricket preview..."}</p>
      {failed && <Button onClick={onRetry}>Retry load</Button>}
    </div>}
  </div>;
}
