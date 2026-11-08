"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent, type WheelEvent } from "react";

import { ChevronLeftIcon } from "@statoz/design-system/games";
import type { F1RaceReport } from "@/domain/matches";

import styles from "./f1-track-map-screen.module.css";

type Transform = { x: number; y: number; scale: number };

export function F1TrackMapScreen({ report }: { report: F1RaceReport }) {
  const router = useRouter();
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [selection, setSelection] = useState<"lap" | "line">("lap");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const previousDistance = useRef<number | null>(null);
  const lastTap = useRef(0);

  const clampScale = (value: number) => Math.min(6, Math.max(1, value));
  function reset() { setTransform({ x: 0, y: 0, scale: 1 }); }
  function zoom(delta: number) {
    setTransform((current) => ({ ...current, scale: clampScale(current.scale + delta) }));
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = [...pointers.current.values()];
    if (active.length === 2) {
      const distance = Math.hypot(active[0].x - active[1].x, active[0].y - active[1].y);
      if (previousDistance.current !== null) {
        const change = distance / Math.max(1, previousDistance.current);
        setTransform((current) => ({ ...current, scale: clampScale(current.scale * change) }));
      }
      previousDistance.current = distance;
      return;
    }
    setTransform((current) => current.scale === 1 ? current : ({ ...current, x: current.x + event.clientX - previous.x, y: current.y + event.clientY - previous.y }));
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) previousDistance.current = null;
  }
  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      setTransform((current) => current.scale > 1 ? { x: 0, y: 0, scale: 1 } : { x: 0, y: 0, scale: 3 });
    } else {
      setSelection("lap");
    }
    lastTap.current = now;
  }
  function wheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoom(event.deltaY < 0 ? 0.45 : -0.45);
  }

  return (
    <div className={styles.page}>
      <header><button type="button" onClick={() => router.back()} aria-label="Go back"><ChevronLeftIcon size={20} /></button><span><small>{report.abbreviation} // {report.season}</small><strong>{report.circuit.fullName}</strong></span><button type="button" onClick={reset}>RESET</button></header>
      <main>
        <div className={styles.viewport} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} onClick={handleTap} onDoubleClick={(event) => { event.preventDefault(); setTransform((current) => current.scale > 1 ? { x: 0, y: 0, scale: 1 } : { x: 0, y: 0, scale: 3 }); }} role="application" aria-label="Interactive Monza circuit map. Drag to pan, pinch or use the mouse wheel to zoom, and double activate to zoom or reset.">
          <div className={styles.world} style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}>
            <Image src={report.circuit.asset} alt={`Track diagram of ${report.circuit.fullName}`} width={1600} height={960} unoptimized draggable={false} />
            <button type="button" className={styles.marker} data-selected={selection === "line" || undefined} style={{ transform: `translate(-50%, -50%) scale(${1 / transform.scale})` }} onClick={(event) => { event.stopPropagation(); setSelection("line"); }} aria-label="Start and finish line"><span>▦</span></button>
          </div>
        </div>
        <div className={styles.controls}><button type="button" onClick={() => zoom(-0.5)} aria-label="Zoom out">−</button><output>{Math.round(transform.scale * 100)}%</output><button type="button" onClick={() => zoom(0.5)} aria-label="Zoom in">+</button></div>
        <section className={styles.readout} aria-live="polite">
          <small>{selection === "line" ? "START / FINISH" : "THE LAP"}</small>
          {selection === "lap" ? <><h1>{report.circuit.distanceKm} KM RACE DISTANCE</h1><p>{report.circuit.lengthKm} KM clockwise lap · {report.circuit.turns} turns · established {report.circuit.established}</p></> : <><h1>{report.pole.name} ON POLE</h1><p>{report.winner.name} won from P{report.winner.grid}. Biggest gain: {report.biggestGain.name}, P{report.biggestGain.grid} to P{report.biggestGain.position}.</p></>}
        </section>
      </main>
    </div>
  );
}
