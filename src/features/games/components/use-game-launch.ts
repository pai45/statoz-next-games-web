"use client";
import { gameForHref, type GameEntry } from "@/mocks/games";
import { useGamePlayAction, useGamePlayState } from "@/features/device-assets";
import type { MouseEventHandler } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { gameLaunchHref } from "../shared/navigation";

/**
 * Games open directly for guests and signed-in players alike.
 */
export type GameLaunch = { href: string; onClick: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> } & ReturnType<typeof useGamePlayState>;

export function useGameLaunch(entry: GameEntry): GameLaunch {
  const pathname = usePathname(), query = useSearchParams();
  const href = gameLaunchHref(entry.href, pathname + (query.size ? `?${query}` : ""));
  const onClick = useGamePlayAction(gameForHref(entry.href)?.game ?? "", entry.title, href);
  const state = useGamePlayState(gameForHref(entry.href)?.game ?? "");
  return { href, onClick, ...state };
}
