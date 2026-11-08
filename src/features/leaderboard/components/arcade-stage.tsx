"use client";

import type { LeaderboardStanding } from "../types";
import { ArcadePodium } from "./arcade-podium";
import styles from "./podium.module.css";

export function ArcadeStage({ entries, master, onOpen, onContributions }: {
  entries: LeaderboardStanding[]; master: boolean;
  onOpen: (entry: LeaderboardStanding) => void; onContributions: (entry: LeaderboardStanding) => void;
}) {
  return <section className={styles.stage} aria-label="Arcade high scores" data-arcade-stage>
    <ArcadePodium entries={entries.slice(0, 3)} master={master} onOpen={onOpen} onContributions={onContributions} />
  </section>;
}
