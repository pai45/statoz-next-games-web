"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { publicAsset } from "@/shared/config";
import { gameReturnHref } from "../navigation";

/** Returns to the exact screen from which the current game was opened. */
export function useGameReturn(): () => void {
  const query = useSearchParams();
  const destination = gameReturnHref(query.get("returnTo"));
  // A landscape iframe has its own history. Use the launch URL, which also
  // survives a reload or a game opened in a new tab.
  return useCallback(() => {
    const target = window.frameElement?.hasAttribute("data-mobile-game-frame") ? window.parent : window;
    target.location.replace(publicAsset(destination));
  }, [destination]);
}
