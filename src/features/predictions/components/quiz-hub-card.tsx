"use client";

import type { CSSProperties, ComponentType } from "react";

import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  GroupsIcon,
  InsightsIcon,
  LockIcon,
  MedalIcon,
  MoreIcon,
  PaidIcon,
  PremiumIcon,
  ScheduleIcon,
  TrophyIcon,
  type IconProps,
} from "@statoz/design-system/games";
import type { SportMatch } from "@/domain/matches";
import { scorelineContestPrizes, type PredictionQuiz, type UserPrediction } from "@/domain/predictions";

import { resolveQuizHubVisual, type ContestMeta, type QuizHubIcon } from "../hub-visual";
import styles from "./predictions.module.css";
import {EditorialRevealCard} from "@/features/matches/components/editorial-reveal-card";

/**
 * One quiz set, as an objective card.
 *
 * The whole of its logic is `resolveQuizHubVisual`; this draws what it returns.
 * A barred card is still a button — pressing it says why rather than doing
 * nothing, which is how the app answers a tap it cannot honour.
 */

const ctaIcons: Record<QuizHubIcon, ComponentType<IconProps>> = {
  bolt: BoltIcon,
  edit: EditIcon,
  lock: LockIcon,
  lockClock: ScheduleIcon,
  vote: GroupsIcon,
  reveal: PremiumIcon,
  medal: MedalIcon,
  done: CheckIcon,
  stats: InsightsIcon,
};

export type QuizHubCardProps = {
  match: SportMatch;
  quiz: PredictionQuiz;
  index: number;
  prediction: UserPrediction | undefined;
  coins?: number;
  /** The demo clock, so a fixture does not read as kicked off before its time. */
  now?: number;
  onOpen: () => void;
  onBlocked: (message: string) => void;
};

export function QuizHubCard({
  match,
  quiz,
  index,
  prediction,
  coins,
  now,
  onOpen,
  onBlocked,
}: QuizHubCardProps) {
  const visual = resolveQuizHubVisual(match, quiz, prediction, { coins, now });
  if (visual.glow && match.sport !== "tennis") return <EditorialRevealCard match={match} quiz={quiz} onOpen={onOpen}/>;
  const CtaIcon = ctaIcons[visual.ctaIcon];

  return (
    <button
      type="button"
      className={[
        styles.hubCard,
        visual.glow ? styles.hubGlow : "",
        visual.blocked ? styles.hubBlocked : "",
      ].filter(Boolean).join(" ")}
      style={{
        "--hub-accent": visual.accent,
        "--home-color": match.home.color,
        "--away-color": match.away.color,
      } as CSSProperties}
      aria-label={`Open ${quiz.title}`}
      onClick={() =>
        visual.blocked
          ? onBlocked(visual.blockedMessage ?? "This quiz is not available right now.")
          : onOpen()
      }
    >
      <span className={styles.hubShadow} aria-hidden="true" />
      <span className={styles.hubFrame}>
        <span className={[styles.indexPlate, styles.tabular].join(" ")}>
          {String(index).padStart(2, "0")}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className="min-w-0 flex-1">
              <span className={`${styles.hubTag} block`}>{visual.tag}</span>
              <span className={`${styles.hubTitle} block`}>{quiz.title}</span>
            </span>
            <span
              className={[styles.rewardPill, styles.tabular].join(" ")}
              style={{ "--pill-color": visual.rewardColor } as CSSProperties}
            >
              {visual.rewardText}
            </span>
          </span>

          {quiz.subtitle ? <span className={`${styles.hubSubtitle} block truncate`}>{quiz.subtitle}</span> : null}

          {visual.contest ? <ContestStrip meta={visual.contest} /> : null}

          <span
            className={`${styles.hubTrack} block`}
            role="progressbar"
            aria-valuenow={Math.round(visual.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${Math.min(100, Math.max(0, visual.progress * 100))}%`, "--track-accent": visual.progressAccent } as CSSProperties} />
          </span>

          <span className={`${styles.hubDivider} block`} aria-hidden="true" />

          <span className={styles.hubCta}>
            <CtaIcon size={14} aria-hidden="true" />
            <span className={`${styles.hubCtaText} ${styles.tabular}`}>{visual.ctaText}</span>
            {visual.outcomes ? (
              <OutcomeDots outcomes={visual.outcomes} />
            ) : visual.showChevron ? (
              <span className={styles.chevronChip} aria-hidden="true">
                <ArrowRightIcon size={15} />
              </span>
            ) : null}
          </span>

          {visual.blocked && visual.blockedMessage ? (
            <span className={`${styles.blockedNote} block`}>{visual.blockedMessage}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

const outcomeColors = {
  correct: "var(--ds-color-success)",
  wrong: "var(--ds-color-danger)",
  void: "var(--ds-color-text-muted)",
};

function OutcomeDots({ outcomes }: { outcomes: Array<"correct" | "wrong" | "void"> }) {
  return (
    <span className={styles.outcomeDots}>
      {outcomes.map((outcome, index) => {
        const Glyph = outcome === "correct" ? CheckIcon : outcome === "wrong" ? CloseIcon : MoreIcon;
        return (
          <span
            key={index}
            className={styles.outcomeDot}
            style={{ "--dot-color": outcomeColors[outcome] } as CSSProperties}
          >
            <Glyph size={9} aria-hidden="true" />
          </span>
        );
      })}
    </span>
  );
}

/**
 * The paid contest's ribbon: entry state on the left, the prize pool on the
 * right — or, once settled, the finish and the coins won. Flat chips only; the
 * reveal owns the moment, so the hub stays calm.
 */
function ContestStrip({ meta }: { meta: ContestMeta }) {
  if (meta.settled) {
    const won = meta.prizeOz > 0;
    return (
      <span className={styles.contestStrip}>
        <Chip
          icon={TrophyIcon}
          label={meta.rank > 0 ? `FINISHED #${meta.rank}` : "FINISHED"}
          color={won ? "var(--ds-color-accent-gold)" : "var(--ds-color-text-muted)"}
        />
        {won ? (
          <Chip icon={PaidIcon} label={`+${meta.prizeOz}`} color="var(--ds-color-accent-gold)" filled />
        ) : (
          <Chip label="NO PRIZE" color="var(--ds-color-text-muted)" />
        )}
      </span>
    );
  }

  const entry = meta.paid
    ? <Chip icon={CheckIcon} label="ENTRY PAID" color="var(--ds-color-accent-lime)" />
    : meta.affordable
      ? <Chip icon={PaidIcon} label={`-${meta.fee} OZ ENTRY`} color="var(--ds-color-accent-cyan)" />
      : <Chip icon={LockIcon} label={`NEED ${meta.fee} OZ`} color="var(--ds-color-text-muted)" />;

  return (
    <span className={styles.contestStrip}>
      {entry}
      <Chip icon={TrophyIcon} label={scorelineContestPrizes.join(" · ")} color="var(--ds-color-accent-gold)" />
    </span>
  );
}

function Chip({
  icon: Icon,
  label,
  color,
  filled = false,
}: {
  icon?: ComponentType<IconProps>;
  label: string;
  color: string;
  filled?: boolean;
}) {
  return (
    <span
      className={[styles.contestChip, styles.tabular, filled ? styles.contestChipFilled : ""].filter(Boolean).join(" ")}
      style={{ "--chip-color": color } as CSSProperties}
    >
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
