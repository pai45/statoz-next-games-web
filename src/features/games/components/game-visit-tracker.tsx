"use client";
import { useEffect } from "react";
import { recordHomeGame } from "../state/home-recents";
import type { GameId } from "../types";

export function GameVisitTracker({ game }: { game: GameId }) {
  useEffect(() => { recordHomeGame(game); }, [game]);
  return null;
}
