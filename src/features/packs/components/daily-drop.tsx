"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Glyph } from "@statoz/design-system/games";
import type { Sport } from "@/domain/sports";
import { claimDailyDrop, useEconomy, useIsEconomyHydrated } from "@/features/economy";
import { useFullScreenMoment } from "@/shared/hooks";
import { rollDailyDrop } from "../data/daily-drop";
import type { PackRevealItem } from "../types";
import { PackRevealSequence } from "./pack-reveal-sequence";
import styles from "./daily-drop.module.css";

export function DailyDrop({
  sport,
  actionLabel = "BACK TO GAME",
}: {
  sport: Sport;
  /** The reveal's exit button, naming where the player returns to. */
  actionLabel?: string;
}) {
  const { dailyDropLastClaimedAt } = useEconomy();
  const hydrated = useIsEconomyHydrated();
  const [now, setNow] = useState(0);
  const [item, setItem] = useState<PackRevealItem | null>(null);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    tick();
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); };
  }, []);
  const remaining = dailyDropLastClaimedAt === null ? 0 :
    Math.max(0, dailyDropLastClaimedAt + 86_400_000 - now);
  const ready = hydrated && now > 0 && remaining === 0 && !item;
  const seconds = Math.ceil(remaining / 1000);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, "0")).join(":");

  async function open() {
    if (!ready) return;
    const claim = () => {
      const reward = rollDailyDrop(sport);
      if (!reward) { setError("No cards available. Please try again later."); return; }
      if (claimDailyDrop({ sport,
        playerCardIds: reward.kind === "player" ? [reward.card.id] : [],
        actionCardIds: reward.kind === "action" ? [reward.card.id] : [],
      })) { setError(""); setItem(reward); }
    };
    // Serialize claims made in different tabs where Web Locks are supported.
    if (navigator.locks) await navigator.locks.request("statoz-daily-drop", claim);
    else claim();
  }

  return (
    <div ref={root} tabIndex={-1} className={styles.root}>
      <button type="button" className={styles.button} disabled={!ready} onClick={() => void open()}>
        <span className={styles.inner}>
          <Glyph name="style" size={24} />
          <span><small>DAILY DROP</small>
            <b>{!hydrated || now === 0 ? "LOADING DROP…" : remaining > 0 ? `NEXT DROP IN ${countdown}` : "OPEN DAILY DROP"}</b>
            <em>{remaining > 0 ? "You've claimed today's card — come back tomorrow" : "A free card is waiting"}</em>
          </span>
        </span>
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {item ? createPortal(<DailyDropReveal item={item} actionLabel={actionLabel} onComplete={() => {
        setItem(null);
        root.current?.focus();
      }} />, document.body) : null}
    </div>
  );
}

function DailyDropReveal({ item, actionLabel, onComplete }: { item: PackRevealItem; actionLabel: string; onComplete: () => void }) {
  useFullScreenMoment();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-label="Daily drop reward" onCancel={onComplete}>
    <PackRevealSequence items={[item]} completeLabel="DAILY DROP CLAIMED" actionLabel={actionLabel} onComplete={onComplete} />
  </dialog>;
}
