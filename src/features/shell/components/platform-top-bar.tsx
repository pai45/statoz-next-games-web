"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Avatar, BrandIcon, FlameIcon, GridViewIcon, NavMarkIcon } from "@statoz/design-system/games";
import { useEconomy } from "@/features/economy";
import { usePlayerStanding } from "@/features/profile/standing";
import { currentStreak, useIsStreakHydrated, useStreakSnapshot } from "@/features/streaks";
import { formatInt } from "@/shared/utils";
import styles from "./platform-top-bar.module.css";

export type PlatformTopBarProps = { title?: string; coins?: number; accent?: string };
const commands = [
  { id: "games", label: "Games", href: "/", icon: <NavMarkIcon mark="games" size={20} /> },
  { id: "library", label: "Library", href: "/?view=all", icon: <GridViewIcon size={19} /> },
  { id: "shop", label: "Shop", href: "/shop", icon: <NavMarkIcon mark="shop" size={20} /> },
  { id: "leaderboard", label: "Leaderboard", href: "/leaderboard", icon: <NavMarkIcon mark="top" size={20} /> },
];

/** One navigation and status surface, shared by every platform destination. */
export function PlatformTopBar({ coins }: PlatformTopBarProps) {
  const pathname = usePathname(), query = useSearchParams(), router = useRouter();
  const player = usePlayerStanding(), economy = useEconomy();
  const streakSnapshot = useStreakSnapshot(), streakReady = useIsStreakHydrated();
  const streak = currentStreak(streakSnapshot, "overall");
  const library = pathname === "/" && query.get("view") === "all";
  const libraryParams = new URLSearchParams(pathname === "/" ? query.toString() : "");
  libraryParams.set("view", "all");
  const libraryHref = `/?${libraryParams}`;
  const active = library ? "library" : pathname.startsWith("/shop") ? "shop" : pathname.startsWith("/leaderboard") ? "leaderboard" : pathname === "/" || pathname.startsWith("/games/") ? "games" : "";
  const coinParams = new URLSearchParams({ tab: "coins" });
  if (pathname.startsWith("/shop") && query.get("sport")) coinParams.set("sport", query.get("sport")!);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if ((event.target as Element | null)?.closest("input, textarea, select, [contenteditable='true']") || document.querySelector("dialog[open]")) return;
      const command = commands[Number(event.key) - 1];
      if (!/^[1-4]$/.test(event.key) || !command) return;
      event.preventDefault(); router.push(command.id === "library" ? libraryHref : command.href, { scroll: command.id !== "library" });
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [router, libraryHref]);

  return <header className={styles.bar} data-platform-command-bar>
    <Link href="/" className={styles.brand} aria-label="StatOz home"><BrandIcon name="logo" size={30} alt="" /><span>StatOz<small>GAMES</small></span></Link>
    <nav aria-label="Primary" className={styles.nav}>
      {commands.map(command => <Link key={command.id} href={command.id === "library" ? libraryHref : command.href} scroll={command.id !== "library"} prefetch={false} aria-label={command.label} title={command.label} aria-current={active === command.id ? "page" : undefined} className={styles.command}>
        {command.icon}<span>{command.label}</span>
      </Link>)}
    </nav>
    <div className={styles.utilities}>
      <Link href="/streaks" className={styles.stat} aria-label={`Daily streak: ${streakReady ? streak : 0} days`}><FlameIcon size={20} /><span>{streakReady ? formatInt(streak) : "—"}</span></Link>
      <Link href={`/shop?${coinParams}`} className={styles.wallet} aria-label={`${formatInt(coins ?? economy.coins)} Oz Coins. Add coins`}>
        <BrandIcon name="ozCoins" size={18} alt="" /><b data-shop-wallet={coins ?? economy.coins}>{formatInt(coins ?? economy.coins)}</b><span className={styles.plus} aria-hidden="true">+</span>
      </Link>
      <Link href="/profile" className={styles.profile} aria-label={`${player.displayName}, level ${player.level}. Open profile`} aria-current={pathname.startsWith("/profile") ? "page" : undefined}>
        <Avatar src={player.avatarSrc} alt="" size={32} ring={player.frameColor ?? "var(--ds-color-accent-violet)"} ringWidth={1} />
      </Link>
    </div>
  </header>;
}
