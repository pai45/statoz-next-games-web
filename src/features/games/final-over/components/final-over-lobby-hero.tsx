"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { LottieHandle } from "lottie-react";
import { publicAsset } from "@/shared/config/base-path";
import styles from "./final-over-lobby.module.css";

const Animation = dynamic(() => import("lottie-react").then(module => module.Lottie), { ssr: false });

/** The poster renders immediately; motion is decorative and never gates play. */
export function FinalOverLobbyHero({ paused }: { paused: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const player = useRef<LottieHandle>(null);
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState({ width: 192, height: 256, left: 0, top: 0 });
  useEffect(() => {
    const sync = () => {
      const box = root.current?.getBoundingClientRect();
      if (!box) return;
      const dpr = window.devicePixelRatio || 1;
      const scale = Math.max(1, Math.round(Math.min(box.width / 192, box.height / 256) * dpr)) / dpr;
      const width = 192 * scale, height = 256 * scale;
      setStage({ width, height, left: Math.round((box.width - width) * dpr / 2) / dpr, top: Math.round((box.height - height) * dpr) / dpr });
    };
    const observer = new ResizeObserver(sync);
    if (root.current) observer.observe(root.current);
    window.addEventListener("resize", sync);
    sync();
    return () => { observer.disconnect(); window.removeEventListener("resize", sync); };
  }, []);
  const [reduced, setReduced] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReduced(query.matches); setVisible(!document.hidden); };
    sync();
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { query.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting)));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const playing = visible && inView && !paused && !reduced && !failed;
  useEffect(() => {
    if (!ready) return;
    if (playing) player.current?.play(); else player.current?.pause();
  }, [playing, ready]);
  return <div ref={root} className={styles.illustration} aria-hidden="true" data-playing={playing && ready}>
    <div className={styles.pixelStage} style={stage}>
    {/* Authored SVG poster and vector Lottie share the same path source. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.poster} style={{objectFit: "contain", objectPosition: "center bottom"}} src={publicAsset("/assets/games/lobbies/final-over-poster.svg")} width={192} height={256} alt="" />
    {!reduced && !failed && <Animation src={publicAsset("/assets/games/lobbies/final-over.json")} lottieRef={player} autoplay={false} loop rendererSettings={{ preserveAspectRatio: "none" }} className={styles.animation} style={{ opacity: ready ? 1 : 0 }} subscriptions={{ ready: () => { setReady(true); if (playing) player.current?.play(); }, error: () => setFailed(true) }} />}
    </div>
  </div>;
}
