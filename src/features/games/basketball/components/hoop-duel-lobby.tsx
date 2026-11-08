"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { accentVar, Glyph, withAlpha } from "@statoz/design-system/games";
import { levelProgress } from "@/domain/progression";
import { publicAsset } from "@/shared/config/base-path";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";

import {
  lobbyActionsDelayMs,
  lobbyDifficultyDelayMs,
  lobbyHeroDelayMs,
  lobbyLinksDelayMs,
  lobbyPlayDelayMs,
} from "../constants";
import type { HoopDuelStats } from "../state/hoop-duel-progress";
import {
  basketballDifficulties,
  basketballDifficultyLabels,
  type BasketballDifficulty,
} from "../types";

import styles from "./hoop-duel.module.css";

const gold = accentVar("gold");

function rise(delayMs: number): CSSProperties {
  return { "--rise-delay": `${delayMs}ms` } as CSSProperties;
}

const difficultyBlurbs: Record<BasketballDifficulty, string> = {
  rookie: "Forgiving",
  pro: "Balanced",
  allStar: "Ruthless",
};

export type HoopDuelLobbyProps = {
  stats: HoopDuelStats;
  squadReady: boolean;
  starterName: string | null;
  onBack: () => void;
  onDifficultyChange: (difficulty: BasketballDifficulty) => void;
  onPlay: () => void;
};

/** Web port of card_game's BasketballLobbyScreen. */
export function HoopDuelLobby({
  stats,
  squadReady,
  starterName,
  onBack,
  onDifficultyChange,
  onPlay,
}: HoopDuelLobbyProps) {
  const band = levelProgress(stats.xp);

  return (
    <main
      className={styles.lobbyShell}
      aria-labelledby="hoop-duel-title"
      style={{
        "--hoop-arena-image": `url("${publicAsset("/assets/games/hoop-duel/hoop-arena.jpg")}")`,
      } as CSSProperties}
    >
      <header className={styles.lobbyTopBar}>
        <button type="button" onClick={onBack} aria-label="Back to basketball games">
          <Glyph name="chevron_left" size={23} />
        </button>
        <div
          className={styles.lobbyLevel}
          aria-label={`Level ${band.level}, ${band.intoLevel} of ${band.levelSpan} XP`}
        >
          <span>LVL</span>
          <b>{band.level}</b>
          <i aria-hidden><span style={{ width: `${band.fraction * 100}%` }} /></i>
          <small>{band.intoLevel}/{band.levelSpan}</small>
          <Glyph name="chevron_right" size={15} />
        </div>
      </header>

      <section className={styles.lobbyContent}>
        <div className={styles.rise} style={rise(0)}>
          <div className={styles.statusStrip}>
            <i aria-hidden />
            <b>COURT OPEN</b>
            <span aria-hidden />
            <small>SYS://HOOP_DUEL v1.0.0</small>
          </div>
        </div>

        <div className={`${styles.rise} ${styles.lobbyHero}`} style={rise(lobbyHeroDelayMs)}>
          <span className={styles.hoopEmblem} aria-hidden>
            <Glyph name="sports_basketball" size={38} />
          </span>
          <div>
            <h1 id="hoop-duel-title">HOOP DUEL</h1>
            <p>TWO HALVES · SHOT CLOCK · FIRST TO OUTSCORE</p>
            <span
              className={styles.freshLegs}
              style={{
                color: stats.wins > 0 ? gold : "var(--ds-color-text-muted)",
                borderColor: withAlpha(stats.wins > 0 ? gold : "var(--ds-color-text-muted)", 0.5),
              }}
            >
              {stats.wins > 0
                ? `${stats.wins} WINS`
                : stats.games > 0
                  ? `${stats.games} GAMES IN`
                  : "FRESH LEGS"}
            </span>
          </div>
        </div>

        <div className={`${styles.rise} ${styles.difficulty}`} style={rise(lobbyDifficultyDelayMs)}>
          <p>DIFFICULTY</p>
          <div>
            {basketballDifficulties.map((difficulty) => {
              const selected = difficulty === stats.difficulty;
              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => onDifficultyChange(difficulty)}
                  aria-pressed={selected}
                >
                  <b>{basketballDifficultyLabels[difficulty]}</b>
                  <small>{difficultyBlurbs[difficulty]}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${styles.rise} ${styles.playWrap}`} style={rise(lobbyPlayDelayMs)}>
          <button
            type="button"
            onClick={onPlay}
            disabled={!squadReady}
            className={styles.tipOffButton}
          >
            <span className={styles.tipOffIcon} aria-hidden>
              <Glyph name="sports_basketball" size={22} />
            </span>
            <i aria-hidden />
            <span className={styles.tipOffCopy}>
              <b>TIP OFF</b>
              <small>
                {squadReady && starterName !== null
                  ? `${starterName.toUpperCase()} STARTS · ${basketballDifficultyLabels[stats.difficulty]} · STATOZ`
                  : "OPEN YOUR STARTER PACK TO FIELD A ROSTER"}
              </small>
            </span>
          </button>
        </div>

        <div className={`${styles.rise} ${styles.lobbyActions}`} style={rise(lobbyActionsDelayMs)}>
          <Link href="/decks/basketball?returnTo=/play/hoop-duel">DECK BUILDER</Link>
          <Link href="/profile/history/games">MATCH HISTORY</Link>
        </div>

        <Link
          href="/how-to-play/hoop-duel"
          className={`${styles.rise} ${styles.howToLink}`}
          style={rise(lobbyLinksDelayMs)}
        >
          HOW TO PLAY
        </Link>
        <GameLeaderboardCta gameId="hoop-duel" />
      </section>
    </main>
  );
}
