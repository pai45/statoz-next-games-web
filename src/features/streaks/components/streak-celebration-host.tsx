"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon, Progress, accentVar } from "@statoz/design-system/games";
import { useAuthSession } from "@/features/auth";
import { PackRevealSequence, type PackRevealItem } from "@/features/packs";
import { useProfileIdentity } from "@/features/profile";
import { useCountUp, useFullScreenMomentActive } from "@/shared/hooks";

import { streakMilestoneFor, streakMilestones } from "../data/milestones";
import { claimStreakMilestone } from "../rewards";
import { consumeStreakCelebration, useStreakSnapshot } from "../state/streak-store";
import type { StreakCelebration } from "../types";
import { StreakFlame } from "./streak-flame";
import styles from "./streak-celebration.module.css";

const activityLabels = {
  predict: "PREDICTION LOCKED",
  pick: "PICK PLACED",
  pitchDuel: "PITCH DUEL COMPLETE",
  penaltyShootout: "SHOOTOUT COMPLETE",
  guessPlayer: "PLAYER GUESSED",
} as const;

export function StreakCelebrationHost() {
  const session = useAuthSession();
  const snapshot = useStreakSnapshot();
  const profile = useProfileIdentity();
  // A feature's own moment — a sealed prediction, a locked pick — owns the
  // screen while it plays; the streak waits its turn rather than covering it.
  const momentActive = useFullScreenMomentActive();
  const celebration =
    session.status === "authenticated" && !momentActive ? snapshot.celebrationQueue[0] : undefined;
  const [reveal, setReveal] = useState<{ items: PackRevealItem[]; label: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!celebration) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [celebration]);

  useEffect(() => {
    if (!celebration || celebration.kind !== "daily") return;
    const timer = window.setTimeout(() => consumeStreakCelebration(celebration.id), 2600);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  if (reveal) {
    return <PackRevealSequence items={reveal.items} completeLabel={reveal.label} actionLabel="CONTINUE" onComplete={() => setReveal(null)} />;
  }
  if (!celebration) return null;

  function claim(days: number) {
    const result = claimStreakMilestone(days, profile.primarySport);
    if (result.ok && result.kind === "cards") setReveal({ items: result.items, label: result.label });
  }

  return (
    <div
      className={`${styles.backdrop} fixed inset-0 z-[65] grid place-items-center p-4`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && celebration.kind === "daily") consumeStreakCelebration(celebration.id);
        if (event.key === "Tab" && celebration.kind === "daily") event.preventDefault();
      }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="streak-celebration-title" className={`${styles.panel} w-full max-w-sm px-6 pb-6 pt-5 text-center`}>
        <span className={styles.ring} aria-hidden />
        <span className={styles.ringDelayed} aria-hidden />
        {celebration.kind === "daily" ? <DailyCelebration celebration={celebration} /> : <MilestoneCelebration celebration={celebration} claim={claim} />}
      </div>
    </div>
  );
}

function DailyCelebration({ celebration }: { celebration: Extract<StreakCelebration, { kind: "daily" }> }) {
  const value = useCountUp(celebration.streak, 650);
  const next = streakMilestones.find((milestone) => milestone.days > celebration.streak);
  const previous = [...streakMilestones].reverse().find((milestone) => milestone.days <= celebration.streak)?.days ?? 0;
  const progress = next ? (celebration.streak - previous) / (next.days - previous) : 1;
  return (
    <>
      <p className="font-display text-micro font-black tracking-max text-gold">DAILY STREAK</p>
      <div className={`${styles.icon} relative mx-auto mt-1 w-fit`}><StreakFlame size={132} loop={false} /></div>
      <div className={`${styles.number} -mt-6`}><strong className="ds-tabular font-display text-celebration font-black leading-compact text-gold">{value}</strong><p id="streak-celebration-title" className="font-display text-xs font-black tracking-max">{celebration.streak === 1 ? "DAY" : "DAYS"}</p></div>
      <div className={`${styles.content} mt-5`}><p className="font-display text-xs font-black tracking-ultra text-success"><CheckIcon size={16} className="mr-1 inline" />{activityLabels[celebration.activity]}</p>{next ? <div className="mt-5 text-left"><div className="mb-2 flex justify-between font-display text-micro font-black tracking-wide text-muted"><span>NEXT · {next.rewardLabel}</span><span>{next.days - celebration.streak} DAYS</span></div><Progress value={progress} accent={accentVar("gold")} label="Progress to next milestone" height={8} /></div> : null}</div>
    </>
  );
}

function MilestoneCelebration({ celebration, claim }: { celebration: Extract<StreakCelebration, { kind: "milestone" }>; claim: (days: number) => void }) {
  const milestone = streakMilestoneFor(celebration.days);
  const value = useCountUp(celebration.days, 650);
  if (!milestone) return null;
  return (
    <>
      <p className="font-display text-micro font-black tracking-max text-gold">MILESTONE UNLOCKED</p>
      <div className={`${styles.icon} relative mx-auto mt-1 w-fit`}><StreakFlame size={132} loop={false} /></div>
      <div className={`${styles.number} -mt-6`}><strong className="ds-tabular font-display text-celebration font-black leading-compact text-gold">{value}</strong><p id="streak-celebration-title" className="font-display text-xs font-black tracking-max">DAYS</p></div>
      <div className={`${styles.content} mt-5`}><h2 className="font-display text-lg font-black tracking-wide">{milestone.title}</h2><p className="mt-2 text-sm font-bold text-gold">{milestone.rewardLabel}</p><button type="button" autoFocus onClick={() => claim(milestone.days)} className="mt-6 h-12 w-full bg-gold font-display text-xs font-black tracking-wide text-inverse hover:brightness-110">CLAIM REWARD</button></div>
    </>
  );
}

