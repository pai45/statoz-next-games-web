import type { CSSProperties } from "react";

import type { SportTeam } from "@/domain/matches";

import styles from "./team-badge.module.css";

export type TeamBadgeProps = {
  team: SportTeam;
  size?: number;
};

/** The layered octagonal team crest used throughout the sport match pages. */
export function TeamBadge({ team, size = 46 }: TeamBadgeProps) {
  const lift = Math.max(3, Math.round(size * 0.11));
  const fontScale = team.shortName.length > 3 ? 0.2 : 0.24;
  const style = {
    width: size,
    height: size,
    "--team-primary": team.color,
    "--team-secondary": team.secondaryColor ?? team.color,
    "--team-ink": team.badgeTextColor ?? "var(--ds-color-text-default)",
    "--team-badge-lift": `${lift}px`,
    "--team-badge-font-size": `${Math.max(8, Math.round(size * fontScale))}px`,
  } as CSSProperties;

  return (
    <span className={styles.badge} style={style} role="img" aria-label={team.name}>
      <span aria-hidden className={styles.shadow} />
      <span className={styles.face}>{team.shortName}</span>
    </span>
  );
}
