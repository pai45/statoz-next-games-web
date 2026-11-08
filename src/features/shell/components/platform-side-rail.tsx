"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";

import { Avatar, BrandIcon, FlameIcon, PlusIcon } from "@statoz/design-system/games";
import { levelProgress } from "@/domain/progression";
import { useEconomy } from "@/features/economy";
import { usePlayerStanding } from "@/features/profile/standing";
import { currentStreak, useIsStreakHydrated, useStreakSnapshot } from "@/features/streaks";
import { navDestinations } from "@/shared/config";
import { formatInt } from "@/shared/utils";

import { PlatformNav } from "./platform-nav";
import styles from "./platform-side-rail.module.css";

const editable = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * The wide-screen command rail: brand, the player's level card, the main menu
 * (keys 1–4 also open it), and a status dock for streak and coins.
 */
export function PlatformSideRail() {
  const root = useRef<HTMLDivElement>(null), router = useRouter();
  const player = usePlayerStanding(), band = levelProgress(player.totalXp);
  const economy = useEconomy(), streakSnapshot = useStreakSnapshot(), streakReady = useIsStreakHydrated();
  const streak = currentStreak(streakSnapshot, "overall");

  // Keys 1–4 open the menu destinations while the rail is on screen and nothing else wants the key.
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const destination = /^[1-9]$/.test(event.key) ? navDestinations[Number(event.key) - 1] : undefined;
      if (!destination || !root.current?.getClientRects().length) return;
      if ((event.target as Element | null)?.closest?.(editable) || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      router.push(destination.href);
    };
    window.addEventListener("keydown", open);
    return () => window.removeEventListener("keydown", open);
  }, [router]);

  return (
    <div ref={root} className={styles.rail} data-side-rail>
      <Link href="/" className={styles.brand} aria-label="StatOz home">
        <BrandIcon name="logo" size={34} alt="" />
        <span><b>StatOz</b><small>Play · Collect · Climb</small></span>
      </Link>

      <Link href="/profile" className={styles.player} style={{"--frame": player.frameColor ?? "var(--ds-color-accent-violet)"} as CSSProperties}
        aria-label={`${player.displayName}, level ${band.level}, ${formatInt(band.intoLevel)} of ${formatInt(band.levelSpan)} XP. Open profile`}>
        <span className={styles.playerEdge}>
          <span className={styles.playerPlate}>
            <Avatar src={player.avatarSrc} alt="" size={44} ring="var(--frame)" ringWidth={2} />
            <span className={styles.playerText}>
              <span className={styles.playerName}>{player.displayName}</span>
              <span className={styles.levelRow}>
                <span className={styles.levelChip}>LV {band.level}</span>
                <span className={styles.xpLabel}>{formatInt(band.toNextLevel)} XP to go</span>
              </span>
            </span>
            <span className={styles.xpTrack} aria-hidden="true"><span style={{"--xp": band.fraction} as CSSProperties} /></span>
          </span>
        </span>
      </Link>

      <p className={styles.section} aria-hidden="true">Main menu</p>
      <PlatformNav orientation="rail" className={styles.nav} />

      <div className={styles.dock}>
        <Link href="/streaks" className={styles.stat} aria-label={streakReady ? `Daily streak: ${streak} days` : "Daily streak"}>
          <FlameIcon size={20} className={styles.flame} />
          <span className={styles.statText}><b>{streakReady ? formatInt(streak) : "—"}</b><small>Day streak</small></span>
        </Link>
        <Link href="/shop?tab=coins" className={styles.stat} aria-label={`${formatInt(economy.coins)} Oz Coins. Add coins`}>
          <BrandIcon name="ozCoins" size={20} alt="" />
          <span className={styles.statText}><b>{formatInt(economy.coins)}</b><small>Oz Coins</small></span>
          <span className={styles.add} aria-hidden="true"><PlusIcon size={14} /></span>
        </Link>
      </div>
    </div>
  );
}
