"use client";

import { useCallback, useState } from "react";

import { GameKickoffCountdown } from "./game-kickoff-countdown";
import { GameMatchmakingView } from "./game-matchmaking-view";
import type { GameMatchmakingConfig } from "./types";

/**
 * Queue, rival, countdown — everything between pressing play and the first
 * ball, for every head-to-head mode in the app.
 *
 * The port of Flutter's `GameMatchGate`. Modes hand it who is playing and what
 * the stamp says; it hands back `onReady` when the game should take over, or
 * `onCancel` if the player left the queue.
 */

export type GameMatchGateProps = {
  config: GameMatchmakingConfig;
  /** The countdown finished — start the match. */
  onReady: () => void;
  onCancel: () => void;
  /** The stamp the countdown ends on: `KICK OFF!`, `TIP OFF!`, `PLAY!`. */
  goLabel?: string;
};

export function GameMatchGate({
  config,
  onReady,
  onCancel,
  goLabel = "GO!",
}: GameMatchGateProps) {
  const [countdown, setCountdown] = useState(false);
  const onMatched = useCallback(() => setCountdown(true), []);

  if (countdown) {
    return (
      <GameKickoffCountdown
        goLabel={goLabel}
        backgroundAsset={config.backgroundAsset}
        onComplete={onReady}
      />
    );
  }

  return (
    <GameMatchmakingView
      config={config}
      onMatched={onMatched}
      onCancel={onCancel}
    />
  );
}
