"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useState, type CSSProperties } from "react";

import {
  accentVar,
  ChevronRightIcon,
  Glyph,
  LockIcon,
  Progress,
  rarityVar,
  TrophyIcon,
  withAlpha,
} from "@statoz/design-system/games";

import {
  achievementCurrent,
  achievementGroupLabels,
  achievementGroups,
  achievementsForGroup,
  achievementProgress,
  isUnlocked,
  previewAchievements,
  unlockedAchievementCount,
  unlockedCountForGroup,
} from "../data/achievements";
import type { Achievement, AchievementGroup, AchievementStats } from "../types";

import { ProfileOverlay } from "./profile-overlay";
import { ProfilePanel } from "./profile-panel";
import styles from "./profile.module.css";

/**
 * The achievements teaser: the unlocked count, and a row of badges led by the
 * ones already earned.
 *
 * Flutter's header arrow pushes a whole screen. There is no such route here, so
 * the card opens its own catalogue instead — same content, same grouping, and
 * no placeholder route activated to reach it. Badges stagger in on first paint,
 * which is the gratification beat the app spends its animation controller on.
 */

const gold = accentVar("gold");
const previewCount = 4;

export type AchievementShowcaseProps = {
  stats: AchievementStats;
};

export function AchievementShowcase({ stats }: AchievementShowcaseProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Achievement | null>(null);

  const total = achievementCatalogSize();
  const unlocked = unlockedAchievementCount(stats);
  const preview = previewAchievements(stats, previewCount);

  return (
    <>
      <ProfilePanel>
        <div className="px-4 pb-4.5 pt-4">
          <div className="flex items-center gap-2.25">
            <TrophyIcon size={18} style={{ color: gold }} />
            <h2
              className="font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p16, letterSpacing: "var(--ds-tracking-label)" }}
            >
              ACHIEVEMENTS
            </h2>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ml-auto flex cursor-pointer items-center gap-1 transition-opacity hover:opacity-80"
              style={{ color: gold }}
              aria-label={`View all achievements, ${unlocked} of ${total} unlocked`}
            >
              <span
                className="ds-tabular font-display font-black leading-none"
                style={{ fontSize: typography.sizeRem.p13, letterSpacing: "var(--ds-tracking-label)" }}
              >
                {unlocked} / {total}
              </span>
              <ChevronRightIcon size={20} />
            </button>
          </div>

          <ul className="mt-3.5 flex justify-between gap-2">
            {preview.map((achievement, index) => (
              <li
                key={achievement.id}
                className={styles.badgeIn}
                style={{ "--enter-delay": `${index * 90}ms` } as CSSProperties}
              >
                <AchievementBadge
                  achievement={achievement}
                  stats={stats}
                  onOpen={() => setDetail(achievement)}
                />
              </li>
            ))}
          </ul>
        </div>
      </ProfilePanel>

      {open ? (
        <AchievementCatalogue
          stats={stats}
          onClose={() => setOpen(false)}
          onOpenDetail={setDetail}
        />
      ) : null}

      {detail ? (
        <AchievementDetail
          achievement={detail}
          stats={stats}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </>
  );
}

function achievementCatalogSize(): number {
  return achievementGroups.reduce(
    (sum, group) => sum + achievementsForGroup(group).length,
    0,
  );
}

/* ---- One badge ------------------------------------------------------------ */

const badgeWidth = 74;

/**
 * A cut-corner tier-coloured plate, the title, and a thin bar while the badge
 * is still being worked towards. Matte at rest: the profile's focal glow lives
 * on the hero, so an earned badge reads through fill and edge alone.
 */
export function AchievementBadge({
  achievement,
  stats,
  onOpen,
}: {
  achievement: Achievement;
  stats: AchievementStats;
  onOpen: () => void;
}) {
  const unlocked = isUnlocked(achievement, stats);
  const progress = achievementProgress(achievement, stats);
  const started = !unlocked && progress > 0;
  const tier = rarityVar(achievement.tier);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${styles.pressable} block cursor-pointer`}
      style={{ width: badgeWidth }}
      aria-label={`${achievement.title}. ${unlocked ? "Unlocked" : `${Math.round(progress * 100)}% complete`}`}
    >
      <span className="relative grid size-15 place-items-center">
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            clipPath: "var(--ds-clip-panel)",
            background: unlocked ? withAlpha(tier, 0.85) : withAlpha("var(--ds-color-border-strong)", 0.3),
          }}
        />
        <span
          aria-hidden
          className="absolute"
          style={{
            inset: unlocked ? "1.5px" : "1px",
            clipPath: "var(--ds-clip-panel)",
            background: unlocked
              ? `color-mix(in srgb, ${tier} 16%, var(--ds-color-background-secondary))`
              : withAlpha("var(--ds-color-background-secondary)", 0.55),
          }}
        />
        <Glyph
          name={achievement.icon}
          size={26}
          style={{
            position: "relative",
            color: unlocked ? tier : withAlpha("var(--ds-color-text-muted)", 0.45),
          }}
        />
        {!unlocked && !started ? (
          <LockIcon
            size={11}
            className="absolute bottom-0.75 right-0.75"
            style={{ color: withAlpha("var(--ds-color-text-muted)", 0.55) }}
          />
        ) : null}
      </span>

      <span
        className="mt-1.75 flex h-6 items-start justify-center font-display font-black leading-tight"
        style={{
          fontSize: typography.sizeRem.p8,
          letterSpacing: "var(--ds-tracking-tight)",
          color: unlocked
            ? "var(--ds-color-text-default)"
            : withAlpha("var(--ds-color-text-muted)", 0.7),
        }}
      >
        <span className="line-clamp-2 text-center">
          {achievement.title.toUpperCase()}
        </span>
      </span>

      {started ? (
        <span className="mt-1.25 block">
          <Progress
            value={progress}
            accent={tier}
            label={`${achievement.title} progress`}
            height={3}
          />
        </span>
      ) : null}
    </button>
  );
}

/* ---- The full catalogue ---------------------------------------------------- */

function AchievementCatalogue({
  stats,
  onClose,
  onOpenDetail,
}: {
  stats: AchievementStats;
  onClose: () => void;
  onOpenDetail: (achievement: Achievement) => void;
}) {
  const [group, setGroup] = useState<AchievementGroup>("games");
  const badges = achievementsForGroup(group);

  return (
    <ProfileOverlay
      title="ACHIEVEMENTS"
      accent={gold}
      icon={<TrophyIcon size={17} />}
      size="full"
      onClose={onClose}
    >
      <div
        role="tablist"
        aria-label="Achievement groups"
        className="flex border-b border-line-muted"
      >
        {achievementGroups.map((entry) => {
          const active = entry === group;
          return (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setGroup(entry)}
              className="relative min-h-10 flex-1 cursor-pointer py-3.5 font-display font-black leading-none transition-colors"
              style={{
                fontSize: typography.sizeRem.p10,
                letterSpacing: "var(--ds-tracking-wide)",
                color: active ? gold : "var(--ds-color-text-muted)",
                background: active ? withAlpha(gold, 0.07) : "transparent",
              }}
            >
              {achievementGroupLabels[entry]}
              <span
                className="ds-tabular ml-1.5 opacity-70"
                style={{ fontSize: typography.sizeRem.p9 }}
              >
                {unlockedCountForGroup(stats, entry)}/
                {achievementsForGroup(entry).length}
              </span>
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-[18%] bottom-0 h-0.75"
                  style={{ background: gold, boxShadow: `0 0 10px ${gold}` }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <ul className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-5 px-4 py-5 sm:grid-cols-5">
        {badges.map((achievement) => (
          <li key={achievement.id}>
            <AchievementBadge
              achievement={achievement}
              stats={stats}
              onOpen={() => onOpenDetail(achievement)}
            />
          </li>
        ))}
      </ul>
    </ProfileOverlay>
  );
}

/* ---- One badge, up close --------------------------------------------------- */

function AchievementDetail({
  achievement,
  stats,
  onClose,
}: {
  achievement: Achievement;
  stats: AchievementStats;
  onClose: () => void;
}) {
  const unlocked = isUnlocked(achievement, stats);
  const tier = rarityVar(achievement.tier);
  const current = achievementCurrent(achievement, stats);

  return (
    <ProfileOverlay
      title={unlocked ? "UNLOCKED" : "IN PROGRESS"}
      accent={tier}
      size="dialog"
      onClose={onClose}
    >
      <div className="flex flex-col items-center px-6 pb-7 pt-5 text-center">
        <span className="relative grid size-20 place-items-center">
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              clipPath: "var(--ds-clip-panel)",
              background: unlocked ? withAlpha(tier, 0.85) : withAlpha("var(--ds-color-border-strong)", 0.3),
            }}
          />
          <span
            aria-hidden
            className="absolute inset-[1.5px]"
            style={{
              clipPath: "var(--ds-clip-panel)",
              background: `color-mix(in srgb, ${tier} ${unlocked ? 16 : 5}%, var(--ds-color-background-secondary))`,
            }}
          />
          <Glyph
            name={achievement.icon}
            size={34}
            style={{
              position: "relative",
              color: unlocked ? tier : withAlpha("var(--ds-color-text-muted)", 0.5),
            }}
          />
        </span>

        <h3
          className="mt-4 font-display font-black leading-tight"
          style={{ fontSize: typography.sizeRem.p17, letterSpacing: "var(--ds-tracking-label)" }}
        >
          {achievement.title.toUpperCase()}
        </h3>
        <p className="mt-2 text-sm leading-body text-muted">
          {achievement.description}
        </p>

        <span
          className="mt-3 px-2 py-0.5 font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p8,
            letterSpacing: "var(--ds-tracking-wide)",
            color: tier,
            border: `1px solid ${withAlpha(tier, 0.5)}`,
          }}
        >
          {achievement.tier.toUpperCase()}
        </span>

        {achievement.target > 1 ? (
          <div className="mt-5 w-full">
            <div className="flex items-baseline justify-between">
              <span
                className="font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)" }}
              >
                PROGRESS
              </span>
              <span
                className="ds-tabular font-display font-black leading-none"
                style={{ fontSize: typography.sizeRem.p11, color: tier }}
              >
                {current} / {achievement.target}
              </span>
            </div>
            <div className="mt-2">
              <Progress
                value={achievementProgress(achievement, stats)}
                accent={tier}
                label={`${achievement.title} progress`}
                height={5}
              />
            </div>
          </div>
        ) : null}
      </div>
    </ProfileOverlay>
  );
}
