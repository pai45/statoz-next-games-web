"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { GamePlayFeedback, useGamePlay, useGamePlayState } from "@/features/device-assets";
import { useEffect, useState, type ReactNode } from "react";

import {
  accentVar,
  Avatar,
  BoltIcon,
  CheckIcon,
  feedbackVar,
  GameIcon,
  MatchIcon,
  PersonSearchIcon,
  PickIcon,
  PlusIcon,
  withAlpha,
} from "@statoz/design-system/games";
import { activeLoadout, isLoadoutComplete, useDecks } from "@/features/cards-decks";
import { FriendRequestSent, isFriend, toggleFriend, useFriends } from "@/features/friends";
import { avatarForName } from "@/features/onboarding";

import { rivalDossier, type RivalDossier } from "../data/rival-dossier";
import { usePlayerProgress } from "../state/player-progress";
import type { ProfileStat } from "../types";

import { AchievementShowcase } from "./achievement-showcase";
import { LevelChip, XpMeter } from "./level-badges";
import { ProfileOverlay } from "./profile-overlay";
import { ProfilePanel } from "./profile-panel";
import { StatBand } from "./stat-band";

/**
 * A leaderboard rival's scouting dossier, framed as a head-to-head.
 *
 * The app pushes this as a route because a phone has nowhere else to put it.
 * Here it is an overlay over the board you opened it from, which keeps your own
 * rank on screen behind it — the comparison the card is making.
 *
 * Everything in it is derived: the rival's face from their name, their whole
 * career from `rivalDossier`, and their badges from the same catalogue that
 * measures yours. Nothing is stored, so a rival can never drift out of step
 * with the board that listed them.
 *
 * The app's two actions are here: CHALLENGE starts a Pitch Duel themed as this
 * rival, and ADD FRIEND bookmarks them into the arena's board.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const lime = accentVar("lime");
const orange = accentVar("orange");
const violet = accentVar("violet");

export type RivalDossierOverlayProps = {
  name: string;
  /** The rival's place on the board that opened this. */
  rank: number;
  /** Their canonical XP — the seed the whole dossier is scouted from. */
  xp: number;
  pro?: boolean;
  /** Your own place on that same board, for the head-to-head. */
  userRank: number | null;
  /** Optional selected ladder/period; canonical XP remains profile information. */
  rankContext?: string;
  onClose: () => void;
};

export function RivalDossierOverlay({
  name,
  rank,
  xp,
  pro = false,
  userRank,
  rankContext,
  onClose,
}: RivalDossierOverlayProps) {
  const rival = rivalDossier({ name, xp, pro });
  const you = usePlayerProgress();

  const gameStats: ProfileStat[] = [
    { label: "MATCHES", value: rival.matchesPlayed },
    { label: "WIN %", value: rival.winRate, suffix: "%" },
    { label: "DRAWS", value: rival.draws },
  ];

  const predictStats: ProfileStat[] = [
    { label: "PLAYED", value: rival.predictionsMade },
    { label: "ACCURACY", value: rival.predictionAccuracy, suffix: "%" },
    { label: "CORRECT", value: rival.correctPredictions },
  ];

  const pickStats: ProfileStat[] = [
    { label: "PICKS", value: rival.picksPlaced },
    { label: "WIN RATE", value: rival.pickWinRate, suffix: "%" },
    { label: "ACTIVE", value: rival.activePicks },
  ];

  return (
    <ProfileOverlay
      title="RIVAL DOSSIER"
      accent={violet}
      icon={<PersonSearchIcon size={18} />}
      size="full"
      onClose={onClose}
    >
      <div className="flex flex-col gap-3.5 p-4">
        <RivalHero name={name} rank={rank} pro={pro} rival={rival} />
        {rankContext ? <p className="text-xs text-muted">{rankContext} · leaderboard position</p> : null}

        <RivalActions name={name} level={rival.level} />

        <VsYouCard
          rows={[
            ...(userRank === null ? [] : [{ label: rankContext ? "BOARD RANK" : "RANK", rival: rank, you: userRank, lowerIsBetter: true }]),
            { label: "LEVEL", rival: rival.level, you: you.level },
            {
              label: "WIN %",
              rival: rival.winRate,
              you: you.career.winRate,
              suffix: "%",
            },
          ]}
        />

        <AchievementShowcase stats={rival.achievements} />

        <StatBand
          title="GAMES"
          accent={orange}
          icon={<GameIcon size={20} />}
          stats={gameStats}
          streak={rival.bestStreak}
        />
        <StatBand
          title="PREDICTS"
          accent={cyan}
          icon={<MatchIcon size={20} />}
          stats={predictStats}
        />
        <StatBand
          title="PICKS"
          accent={lime}
          icon={<PickIcon size={20} />}
          stats={pickStats}
        />
      </div>
    </ProfileOverlay>
  );
}

/**
 * CHALLENGE and ADD FRIEND — the app's pair, in its order.
 *
 * CHALLENGE is the focal plate and ADD FRIEND the calm one, the same way the
 * quiz dock pairs NEXT with PREVIOUS. A challenge with no deck behind it says
 * so rather than starting a match the player cannot field.
 */
function RivalActions({
  name,
  level,
}: {
  name: string;
  level: number;
}) {
  const play = useGamePlay();
  const download = useGamePlayState("pitch-duel");
  const decks = useDecks();
  const friends = useFriends();
  const [notice, setNotice] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const friend = isFriend(friends, name);

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function challenge() {
    if (!isLoadoutComplete(activeLoadout(decks, "football"))) {
      setNotice("Build a match deck to challenge a rival.");
      return;
    }
    play("pitch-duel", "PITCH DUEL", `/play/pitch-duel?vs=${encodeURIComponent(name)}&level=${level}`);
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-3.5">
        <ActionPlate label={download.state ? download.label : "CHALLENGE"} pending={download.pending} icon={<BoltIcon size={16} />} focal onSelect={challenge} />
        <ActionPlate
          label={friend ? "FRIEND ✓" : "ADD FRIEND"}
          icon={friend ? <CheckIcon size={16} /> : <PlusIcon size={16} />}
          onSelect={() => {
            const nowFriend = toggleFriend(name);
            if (nowFriend) setRequestSent(true);
            else setNotice(`${name} removed from friends`);
          }}
        />
      </div>
      <GamePlayFeedback game="pitch-duel" />
      {notice ? (
        <p className="text-center text-xs text-muted" role="status">
          {notice}
        </p>
      ) : null}
      {requestSent ? <FriendRequestSent name={name} onComplete={() => setRequestSent(false)} /> : null}
    </div>
  );
}

function ActionPlate({
  label,
  icon,
  focal = false,
  pending = false,
  onSelect,
}: {
  label: string;
  icon: ReactNode;
  focal?: boolean;
  pending?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={pending}
      aria-busy={pending || undefined}
      className="flex min-h-11.5 items-center justify-center gap-2 font-display text-2xs font-black tracking-label transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        clipPath: "var(--ds-clip-compact-hud)",
        background: focal ? cyan : "var(--ds-color-background-elevated)",
        color: focal ? "var(--ds-color-text-inverse)" : "var(--ds-color-text-default)",
        boxShadow: focal ? undefined : "inset 0 0 0 1px var(--ds-color-border-strong)",
        outlineColor: cyan,
      }}
    >
      {label}
      {icon}
    </button>
  );
}

function RivalHero({
  name,
  rank,
  pro,
  rival,
}: {
  name: string;
  rank: number;
  pro: boolean;
  rival: RivalDossier;
}) {
  return (
    <ProfilePanel>
      <div className="px-4 pb-4.5 pt-4">
        <div className="flex items-start gap-3.5">
          <Avatar
            src={avatarForName(name).src}
            alt=""
            size={76}
            ring={withAlpha(violet, 0.9)}
            ringWidth={2}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className="min-w-0 truncate font-display font-black leading-none"
                style={{
                  fontSize: typography.sizeRem.p22,
                  letterSpacing: "var(--ds-tracking-tight)",
                }}
              >
                {name}
              </h3>
              {pro ? <ProChip /> : null}
            </div>
            <p
              className="mt-1 truncate font-display font-black leading-none text-muted"
              style={{
                fontSize: typography.sizeRem.p10,
                letterSpacing: "var(--ds-tracking-ultra)",
              }}
            >
              OPERATIVE // RANK {rank.toString().padStart(2, "0")}
            </p>
          </div>

          <LevelChip level={rival.level} />
        </div>

        <div className="mt-4">
          <XpMeter band={rival.band} />
        </div>
      </div>
    </ProfilePanel>
  );
}

function ProChip() {
  return (
    <span
      className="shrink-0 rounded-sm border px-1.75 py-0.75 font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p9,
        letterSpacing: "var(--ds-tracking-ultra)",
        color: violet,
        background: withAlpha(violet, 0.16),
        borderColor: withAlpha(violet, 0.6),
      }}
    >
      PRO
    </span>
  );
}

type VsRow = {
  label: string;
  rival: number;
  you: number;
  /** A rank is better when it is smaller. */
  lowerIsBetter?: boolean;
  suffix?: string;
};

/**
 * The head-to-head: rival on the left, you on the right, and the delta between
 * them tinted by who leads. Deliberately matte — the hero above owns the only
 * glow on this surface.
 */
function VsYouCard({ rows }: { rows: VsRow[] }) {
  return (
    <ProfilePanel>
      <div className="p-3.5">
        <div className="flex items-center gap-2">
          <BoltIcon size={18} style={{ color: gold }} />
          <h3
            className="flex-1 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p15,
              letterSpacing: "var(--ds-tracking-wide)",
            }}
          >
            VS YOU
          </h3>
          <span
            className="font-display font-black leading-none text-muted"
            style={{
              fontSize: typography.sizeRem.p9,
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            HEAD-TO-HEAD
          </span>
        </div>

        <div className="mt-3">
          {rows.map((row, index) => (
            <div key={row.label}>
              {index > 0 ? <hr className="h-px border-0 bg-line-muted" /> : null}
              <VsLine row={row} />
            </div>
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}

function VsLine({ row }: { row: VsRow }) {
  const { label, rival, you, lowerIsBetter = false, suffix = "" } = row;
  const tie = you === rival;
  const youLead = lowerIsBetter ? you < rival : you > rival;
  const magnitude = Math.abs(you - rival);

  return (
    <div className="flex items-center py-2.25">
      <span
        className="ds-tabular w-13.5 shrink-0 font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p18 }}
      >
        {rival}
        {suffix}
      </span>

      <div className="flex min-w-0 flex-1 flex-col items-center">
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          {label}
        </span>
        <span
          className="ds-tabular mt-0.5 font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p11,
            letterSpacing: "var(--ds-tracking-ultra)",
            color: tie
              ? "var(--ds-color-text-muted)"
              : youLead
                ? feedbackVar("success")
                : orange,
          }}
        >
          {tie ? "—" : `${youLead ? "▲" : "▼"} ${magnitude}`}
        </span>
      </div>

      <span
        className="ds-tabular w-13.5 shrink-0 text-right font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p18 }}
      >
        {you}
        {suffix}
      </span>
    </div>
  );
}
