"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import {
  accentVar,
  ChevronRightIcon,
  CopyIcon,
  EditIcon,
  GroupsIcon,
  withAlpha,
} from "@statoz/design-system/games";
import {
  levelFromXp,
  trackShortLabels,
  type ProgressTrack,
  type TrackXp,
} from "@/domain/progression";
import { avatarOptionById, BannerVisual, profileBannerOptionById } from "@/features/onboarding";
import { useEconomy } from "@/features/economy";
import { useFriendCounts } from "@/features/friends";
import { allPlayerCards, portraitForCard } from "@/features/packs";
import { AvatarFrameRing, BannerArt, shopBanners, shopFrames } from "@/features/shop";
import { publicAsset } from "@/shared/config";

import type { PlayerProgress } from "../state/player-progress";
import { LevelChip, XpMeter } from "./level-badges";
import { ProfilePanel } from "./profile-panel";
import styles from "./profile.module.css";

/**
 * The dossier hero: a banner strip, an avatar overlapping it, the player's name
 * and greeble line, the glowing level chip, the XP meter, the mastery strip and
 * the shareable player tag.
 *
 * The phone keeps the app's exact geometry — a 206px banner, the card starting
 * 120px down, the avatar at 28/72 — but as flow rather than a fixed 420px
 * `Stack`, so nothing clips when a track label or a name runs long. Once there
 * is room the identity and the meters sit side by side instead of stacked,
 * which is the one thing a phone could never do.
 *
 * Per the glow rule this is the only lit part of the page: the level chip and
 * the XP meter carry the accent, and every other surface stays matte.
 */

const cyan = accentVar("cyan");
const violet = accentVar("violet");
const success = "var(--ds-color-success)";

export type ProfileHeroProps = {
  progress: PlayerProgress;
  displayName: string;
  avatarId: string;
  bannerId: string;
  playerTag: string | null;
  onEditAvatar: () => void;
  onEditBanner: () => void;
};

export function ProfileHero({
  progress,
  displayName,
  avatarId,
  bannerId,
  playerTag,
  onEditAvatar,
  onEditBanner,
}: ProfileHeroProps) {
  const economy = useEconomy();
  const banner = profileBannerOptionById(bannerId);
  const avatar = avatarOptionById(avatarId);
  const purchasedCard = allPlayerCards.find((card) => card.id === avatarId && economy.owned.avatarIds.includes(card.id));
  const purchasedBanner = shopBanners.find((entry) => entry.id === bannerId && economy.owned.bannerIds.includes(entry.id));
  const frame = economy.equipped.frameId ? shopFrames.find((entry) => entry.id === economy.equipped.frameId) : null;

  return (
    <section className="relative">
      {/* Banner. Flat art with a blend into the page, so the card below it
          appears to sit on the same surface rather than on a photograph. */}
      <div className="absolute inset-x-0 top-0 h-51.5 overflow-hidden lg:h-60">
        {purchasedBanner ? (
          <div className="absolute inset-0">
            <BannerArt banner={purchasedBanner} />
          </div>
        ) : (
          <BannerVisual banner={banner} />
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-19"
          style={{
            background: `linear-gradient(to bottom,
              ${withAlpha("var(--ds-color-background-primary)", 0)} 0%,
              ${withAlpha("var(--ds-color-background-primary)", 0.72)} 62%,
              var(--ds-color-background-primary) 100%)`,
          }}
        />
        <EditButton
          label="Edit banner"
          onClick={onEditBanner}
          className="absolute right-3 top-3"
        />
      </div>

      <div className="relative px-2 pt-30 lg:px-0 lg:pt-33">
        <ProfilePanel>
          {/* The panel clips its content to the chamfer, so everything inside
              is positioned against the panel itself rather than against a
              padded box the chip would hang outside of. */}
          <div className="relative">
            <Link
              href="/profile/xp"
              className="absolute right-4 top-4.5 flex min-h-11 items-center lg:right-6"
              aria-label={`View XP progress, level ${progress.level}`}
            >
              <LevelChip level={progress.level} />
            </Link>

            <div className="px-5 pb-5 pt-19 lg:flex lg:items-start lg:gap-10 lg:px-7 lg:pt-21">
              <div className="min-w-0 lg:flex-1">
                <h1
                  className="font-display font-black leading-none"
                  style={{
                    fontSize: typography.sizeRem.p24,
                    letterSpacing: "var(--ds-tracking-label)",
                  }}
                >
                  {displayName}
                </h1>
                <p
                  className="mt-1 font-display font-black leading-none text-muted"
                  style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)" }}
                >
                  OPERATIVE // ID 0001
                </p>

                <div className="mt-4.5 lg:max-w-90">
                  <XpMeter band={progress.band} />
                </div>
              </div>

              <div className="mt-3 lg:mt-0 lg:min-w-0 lg:flex-1">
                <MasteryStrip xpByTrack={progress.xpByTrack} tracks={progress.tracks} />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                  <PlayerTagPill tag={playerTag} />
                  <FriendsPill />
                </div>
              </div>
            </div>
          </div>
        </ProfilePanel>
      </div>

      {/* The avatar straddles the banner and the card, so it sits outside both. */}
      <div className="absolute left-7 top-18 lg:left-10 lg:top-21">
        <Avatar src={purchasedCard ? portraitForCard(purchasedCard)! : avatar.src} label={purchasedCard?.shortName ?? avatar.label} frameColor={frame?.color} onEdit={onEditAvatar} />
      </div>
    </section>
  );
}

/* ---- Banner and avatar chrome -------------------------------------------- */

function EditButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "grid size-8 cursor-pointer place-items-center border transition-colors",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        color: cyan,
        // The app's CTA edge is a dark teal; the palette reaches it as cyan
        // held well back, which is what a hairline over this ground wants.
        borderColor: withAlpha(cyan, 0.55),
        background: withAlpha("var(--ds-color-background-primary)", 0.86),
      }}
    >
      <EditIcon size={16} />
    </button>
  );
}

function Avatar({
  src,
  label,
  frameColor,
  onEdit,
}: {
  src: string;
  label: string;
  frameColor?: string;
  onEdit: () => void;
}) {
  return (
    <div className="relative size-26 lg:size-32">
      <div
        className="absolute bottom-0 left-0 size-24 overflow-hidden lg:size-30"
        style={{
          background: "var(--ds-color-background-elevated)",
          border: `2px solid ${cyan}`,
          // The player's own face is a legitimate focal element, so it is the
          // one thing besides the level chip allowed a bloom.
          boxShadow: `0 4px 0 var(--ds-color-fixture-shadow), 0 0 18px -6px ${withAlpha(cyan, 0.75)}`,
        }}
      >
        <AvatarFrameRing color={frameColor} glow className="h-full w-full">
          <Image
            src={publicAsset(src)}
            alt={label}
            fill
            sizes="8rem"
            className="object-cover object-top"
          />
        </AvatarFrameRing>
      </div>

      <EditButton
        label="Edit avatar"
        onClick={onEdit}
        className="absolute right-0 top-0"
      />
    </div>
  );
}

/* ---- Level, XP, mastery --------------------------------------------------- */

/**
 * The level badge — a raised plate, lit by a top-to-bottom fill and a soft dark
 * shadow rather than a neon halo, so it reads as hardware sitting proud of the
 * card.
 */
/**
 * One chip per track carrying XP. Flat and matte — the level chip stays the
 * focus — and absent entirely until a mode has actually been played.
 */
function MasteryStrip({
  xpByTrack,
  tracks,
}: {
  xpByTrack: TrackXp;
  tracks: ProgressTrack[];
}) {
  return (
    <div>
      <p
        className="font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        MASTERY
      </p>
      {tracks.length === 0 ? (
        <p
          className="mt-2 font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          PLAY A MODE TO START A TRACK
        </p>
      ) : (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
          {tracks.map((track) => (
            <li key={track} className="shrink-0">
              <Link
                href={`/profile/xp?track=${track}`}
                className="flex min-h-11 items-center"
                aria-label={`View ${trackShortLabels[track]} XP progress, level ${levelFromXp(xpByTrack[track] ?? 0)}`}
              >
                <MasteryChip
                  label={trackShortLabels[track]}
                  level={levelFromXp(xpByTrack[track] ?? 0)}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MasteryChip({ label, level }: { label: string; level: number }) {
  return (
    <span
      className="relative inline-flex"
      aria-label={`${label} level ${level}`}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: withAlpha("var(--ds-color-border-default)", 0.9),
        }}
      />
      <span
        aria-hidden
        className="absolute inset-px"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: "var(--ds-color-background-elevated)",
        }}
      />
      <span className="relative flex items-baseline gap-1.5 px-2.5 py-1.5">
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p8, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          {label}
        </span>
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p14, color: cyan }}
        >
          L{level}
        </span>
      </span>
    </span>
  );
}

/* ---- The way into the arena ----------------------------------------------- */

/**
 * How many friends you have, how many are on, and the way through to them.
 *
 * Interactive, so it takes a faint cyan edge — but no glow: the level chip and
 * the XP meter own the hero's light.
 */
function FriendsPill() {
  const counts = useFriendCounts();

  return (
    <Link
      href="/friends"
      className="flex h-8.5 items-center gap-2 px-2.75 transition-colors duration-150 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        clipPath: "var(--ds-clip-field)",
        background: "color-mix(in srgb, var(--ds-color-background-elevated) 55%, transparent)",
        boxShadow: `inset 0 0 0 1px ${withAlpha(cyan, 0.42)}`,
        outlineColor: cyan,
      }}
      aria-label={`Open the friends arena: ${counts.total} friends, ${counts.online} online`}
    >
      <GroupsIcon size={17} style={{ color: cyan }} />
      <span
        className="font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-label)" }}
      >
        FRIENDS
      </span>
      <CountBadge value={counts.total} color={violet} />
      {counts.online > 0 ? <CountBadge value={counts.online} color={success} dot /> : null}
      <ChevronRightIcon size={16} style={{ color: "var(--ds-color-text-muted)" }} />
    </Link>
  );
}

/** Violet counts the squad; a green dot counts who is on right now. */
function CountBadge({
  value,
  color,
  dot = false,
}: {
  value: number;
  color: string;
  dot?: boolean;
}) {
  return (
    <span
      className="ds-tabular flex items-center gap-1 py-0.5 font-display font-black leading-none"
      style={{
        paddingLeft: dot ? "5px" : "7px",
        paddingRight: "7px",
        fontSize: typography.sizeRem.p11,
        color,
        background: withAlpha(color, 0.16),
        boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.55)}`,
      }}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      {value}
    </span>
  );
}

/* ---- The player tag ------------------------------------------------------- */

/**
 * The player's own shareable tag. Tap to copy it; another player pastes it to
 * find you.
 *
 * Flutter confirms with a `SnackBar`; the web says so in place and politely,
 * which needs no host surface and never covers the thing you just copied.
 */
function PlayerTagPill({ tag }: { tag: string | null }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    if (tag === null) return;
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
    } catch {
      // A browser can refuse the clipboard outright; the tag is still on screen
      // to be read off, so there is nothing to recover from.
    }
  }, [tag]);

  const style: CSSProperties = {
    fontSize: typography.sizeRem.p16,
    letterSpacing: "var(--ds-tracking-tight)",
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={copy}
        disabled={tag === null}
        aria-label={tag === null ? "Player tag loading" : `Copy player tag ${tag}`}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 disabled:cursor-default"
      >
        <span
          className="ds-tabular truncate font-semibold leading-none"
          style={style}
        >
          {tag ?? "••••-••••"}
        </span>
        <CopyIcon size={16} style={{ color: withAlpha(cyan, 0.85) }} />
      </button>

      {copied ? (
        <span
          role="status"
          className={`${styles.copied} font-display font-black leading-none`}
          style={{
            fontSize: typography.sizeRem.p8,
            letterSpacing: "var(--ds-tracking-wide)",
            color: cyan,
          }}
        >
          COPIED
        </span>
      ) : null}
    </div>
  );
}
