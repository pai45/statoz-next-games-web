"use client";

import Link from "next/link";

import { ForumIcon } from "@statoz/design-system/games";
import { compactMatchCircleCount, visibleCount, type SportMatch } from "@/domain/matches";

import { threadFor, useMatchCircle } from "../state/match-circle-store";
import styles from "./match-detail.module.css";

/**
 * The bar docked under the match tabs, and the way into the discussion.
 *
 * It is chrome, not a call to action: a quiet 62px rail with a cyan hairline
 * along its top edge, carrying the thread's post count. Every tab scrolls
 * above it, so it never covers what it sits beneath.
 */
export function MatchCircleCta({ match }: { match: SportMatch }) {
  const snapshot = useMatchCircle();
  const count = visibleCount(threadFor(snapshot, match));
  const label = compactMatchCircleCount(count);

  return (
    <Link
      href={`/matches/${match.id}/circle`}
      className={styles.circleCta}
      aria-label={`Open Match Circle, ${label} discussion posts for ${match.home.name} versus ${match.away.name}`}
    >
      <span className={styles.circleCtaInner}>
        <ForumIcon size={20} aria-hidden="true" />
        <span className={styles.circleLabel}>Match Circle</span>
        <span className={styles.circleCount} suppressHydrationWarning>
          {label}
        </span>
      </span>
    </Link>
  );
}
