"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  ChevronLeftIcon,
  CloseIcon,
  KabaddiIcon,
  PersonPinCircleIcon,
  SearchIcon,
  SignalOffIcon,
  TrophyIcon,
  accentVar,
} from "@statoz/design-system/games";
import { AuthBoundary } from "@/features/auth";
import { GamePlayFeedback, useGamePlay, useGamePlayState } from "@/features/device-assets";
import { activeLoadout, isLoadoutComplete, useDecks } from "@/features/cards-decks";
import {
  isPro,
  resolveRival,
  rivalLevelFor,
  rivalRoster,
  rivalSeedByName,
  type RivalSeed,
} from "@/features/leaderboard";
import { RivalAvatar } from "@/features/leaderboard/components/rank-parts";
import {
  RivalDossierOverlay,
  useProfileIdentity,
  usePlayerStanding,
} from "@/features/profile";
import { formatInt, normaliseTag, playerTagForName } from "@/shared/utils";

import { toggleFriend, useFriends } from "../state/friends-store";
import { ReferralInviteCard } from "./referral-invite-card";
import { FriendRequestSent } from "./friend-request-sent";
import styles from "./friends.module.css";

/**
 * FRIENDS ARENA — search the rival network by tag or username, then add and
 * challenge friends from a single friends-scoped board.
 *
 * The field is the leaderboard's: the same fabricated roster, the same faces,
 * the same dossier behind a name. The only thing this screen owns is which of
 * them you have bookmarked.
 *
 * On a phone it is the app's column exactly. Once there is room the things you
 * *do* — invite, search — move into a sidebar and the board takes the rest,
 * rather than the column simply growing wider.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const violet = accentVar("violet");
const muted = "var(--ds-color-text-muted)";

/** How long a line of feedback stands before it clears itself. */
const toastMs = 1800;

export function FriendsArena() {
  return (
    <AuthBoundary
      intent="open the friends arena"
      message="Log in to add rivals as friends and challenge them."
      returnTo="/friends"
    >
      <FriendsArenaBoard />
    </AuthBoundary>
  );
}

type OpenRival = { name: string; rank: number; xp: number; pro: boolean };

/** A row on the friends board. A null seed is the player's own row. */
type BoardEntry = { seed: RivalSeed | null; xp: number };

function FriendsArenaBoard() {
  const play = useGamePlay();
  const download = useGamePlayState("pitch-duel");
  const decks = useDecks();
  const friends = useFriends();
  const identity = useProfileIdentity();
  const standing = usePlayerStanding();

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [sentName, setSentName] = useState<string | null>(null);
  const [openRival, setOpenRival] = useState<OpenRival | null>(null);

  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => setToast(null), toastMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /** Your own place in the wider field, for the dossier's head-to-head. */
  const userRank = useMemo(
    () => rivalRoster.filter((seed) => seed.base > standing.totalXp).length + 1,
    [standing.totalXp],
  );

  /** Friends only, ranked by the XP the whole app ranks them by, you among them. */
  const board = useMemo<BoardEntry[]>(() => {
    const entries: BoardEntry[] = rivalRoster
      .filter((seed) => friends.friends.includes(seed.name))
      .map((seed) => ({ seed, xp: seed.base }));
    entries.push({ seed: null, xp: standing.totalXp });
    return entries.sort((a, b) => b.xp - a.xp);
  }, [friends.friends, standing.totalXp]);

  function openDossier(name: string) {
    const seed = rivalSeedByName(name);
    if (!seed) return;
    setOpenRival({
      name: seed.name,
      rank: rivalRoster.findIndex((entry) => entry.name === name) + 1,
      xp: seed.base,
      pro: isPro(seed),
    });
  }

  function onToggleFriend(name: string) {
    const nowFriend = toggleFriend(name);
    if (nowFriend) setSentName(name);
    else setToast(`${name} removed from friends`);
  }

  function challenge(seed: RivalSeed) {
    if (!isLoadoutComplete(activeLoadout(decks, "football"))) {
      setToast("Build a match deck to challenge a friend.");
      return;
    }
    play("pitch-duel", "PITCH DUEL",
      `/play/pitch-duel?vs=${encodeURIComponent(seed.name)}&level=${rivalLevelFor(seed)}`,
    );
  }

  const searching = query.trim() !== "";

  return (
    <div className="min-h-full bg-background text-default">
      <header className="flex min-h-14 items-center gap-2 px-2 pt-2 lg:mx-auto lg:max-w-260 lg:px-6 lg:pt-4">
        <Link
          href="/profile"
          aria-label="Back to profile"
          className="grid h-9 w-9 place-items-center text-default hover:bg-overlay-subtle"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <div className="min-w-0">
          <h1
            className="truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p19, color: cyan, letterSpacing: "var(--ds-tracking-label)" }}
          >
            FRIENDS ARENA
          </h1>
          <p
            className="mt-1 font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p9, color: muted, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {"// SCOUT NETWORK"}
          </p>
        </div>
      </header>

      <div className={styles.page}>
        <div className="grid gap-3">
          <ReferralInviteCard />

          <div className={styles.searchRow}>
            <SearchIcon size={20} className={styles.searchGlyph} aria-hidden="true" />
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Player tag or username"
              aria-label="Search players by tag or username"
              enterKeyHint="search"
            />
            {query !== "" ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <CloseIcon size={18} />
              </button>
            ) : null}
          </div>

          {searching ? (
            <SearchResult
              query={query}
              playerTag={identity.playerTag}
              friends={friends.friends}
              onView={openDossier}
              onToggleFriend={onToggleFriend}
            />
          ) : null}
        </div>

        <section className="grid gap-3">
          <header className={styles.sectionHead}>
            <TrophyIcon size={18} style={{ color: gold }} aria-hidden="true" />
            <h2 className={styles.sectionTitle}>FRIENDS LEADERBOARD</h2>
            <span className={styles.sectionCount}>{`// ${friends.friends.length}`}</span>
          </header>

          <div className={styles.rows}>
            {board.map((entry, index) =>
              entry.seed === null ? (
                <FriendRow
                  key="you"
                  rank={index + 1}
                  name={standing.displayName}
                  xp={entry.xp}
                  isUser
                  avatarSrc={standing.avatarSrc}
                  frameColor={standing.frameColor}
                />
              ) : (
                <FriendRow
                  key={entry.seed.name}
                  rank={index + 1}
                  name={entry.seed.name}
                  xp={entry.xp}
                  pro={isPro(entry.seed)}
                  onOpen={() => openDossier(entry.seed!.name)}
                  onChallenge={() => challenge(entry.seed!)}
                />
              ),
            )}
          </div>

          {download.pending ? <p className={styles.hint} role="status">{download.label}</p> : null}
          <GamePlayFeedback game="pitch-duel" />
          {friends.friends.length === 0 ? (
            <p className={styles.hint}>
              Search a tag or username above to add your first rival.
            </p>
          ) : null}
        </section>

        {toast ? (
          <p className={`${styles.toast} spanFull`} role="status">
            {toast}
          </p>
        ) : null}
      </div>

      {openRival ? (
        <RivalDossierOverlay
          name={openRival.name}
          rank={openRival.rank}
          xp={openRival.xp}
          pro={openRival.pro}
          userRank={userRank}
          onClose={() => setOpenRival(null)}
        />
      ) : null}
      {sentName ? <FriendRequestSent name={sentName} onComplete={() => setSentName(null)} /> : null}
    </div>
  );
}

/* ---- What the search found ------------------------------------------------- */

function SearchResult({
  query,
  playerTag,
  friends,
  onView,
  onToggleFriend,
}: {
  query: string;
  playerTag: string | null;
  friends: string[];
  onView: (name: string) => void;
  onToggleFriend: (name: string) => void;
}) {
  const trimmed = query.trim();

  // Your own tag resolves to nobody: the point of it is to be handed out.
  if (playerTag !== null && normaliseTag(trimmed) === normaliseTag(playerTag)) {
    return (
      <Notice
        icon={<PersonPinCircleIcon size={20} />}
        accent={cyan}
        message="That's your own tag — share it so friends can add you."
      />
    );
  }

  const seed = resolveRival(trimmed);
  if (!seed) {
    return (
      <Notice
        icon={<SignalOffIcon size={20} />}
        accent={muted}
        message={`No player found for "${trimmed}".`}
      />
    );
  }

  const friend = friends.includes(seed.name);
  return (
    <article className={styles.resultCard}>
      <div className={styles.resultHead}>
        <RivalAvatar name={seed.name} size={54} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={styles.resultName}>{seed.name}</h3>
            {isPro(seed) ? <MiniTag label="PRO" color={violet} /> : null}
          </div>
          <p className={`${styles.resultMeta} ${styles.tabular}`}>
            {`LVL ${rivalLevelFor(seed)}  //  ${playerTagForName(seed.name)}`}
          </p>
        </div>
      </div>

      <div className={styles.resultActions}>
        <ActionButton label="VIEW" onSelect={() => onView(seed.name)} />
        <ActionButton
          label={friend ? "FRIEND ✓" : "ADD FRIEND"}
          primary={!friend}
          onSelect={() => onToggleFriend(seed.name)}
        />
      </div>
    </article>
  );
}

function Notice({
  icon,
  accent,
  message,
}: {
  icon: React.ReactNode;
  accent: string;
  message: string;
}) {
  return (
    <p className={styles.notice} style={{ "--notice-accent": accent } as CSSProperties} role="status">
      {icon}
      {message}
    </p>
  );
}

function ActionButton({
  label,
  primary = false,
  onSelect,
}: {
  label: string;
  primary?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="min-h-11 w-full font-display text-2xs font-black tracking-label transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        clipPath: "var(--ds-clip-compact-hud)",
        background: primary ? cyan : "var(--ds-color-background-elevated)",
        color: primary ? "var(--ds-color-text-inverse)" : "var(--ds-color-text-default)",
        boxShadow: primary ? undefined : "inset 0 0 0 1px var(--ds-color-border-strong)",
        outlineColor: cyan,
      }}
    >
      {label}
    </button>
  );
}

/* ---- One row of the friends board ------------------------------------------ */

function FriendRow({
  rank,
  name,
  xp,
  pro = false,
  isUser = false,
  avatarSrc,
  frameColor,
  onOpen,
  onChallenge,
}: {
  rank: number;
  name: string;
  xp: number;
  pro?: boolean;
  isUser?: boolean;
  avatarSrc?: string;
  frameColor?: string;
  onOpen?: () => void;
  onChallenge?: () => void;
}) {
  const body = (
    <>
      <span className={`${styles.rowRank} ${styles.tabular}`} style={{ color: rank <= 3 ? gold : muted }}>
        #{rank}
      </span>
      <RivalAvatar
        name={name}
        size={46}
        highlight={isUser}
        src={isUser ? avatarSrc : undefined}
        frameColor={isUser ? frameColor : undefined}
      />
      <span className={styles.rowIdentity}>
        <span className={styles.rowNameLine}>
          <span className={styles.rowName}>{name}</span>
          {isUser ? <MiniTag label="YOU" color={cyan} /> : pro ? <MiniTag label="PRO" color={violet} /> : null}
        </span>
        <span className={`${styles.rowXp} ${styles.tabular} block`}>{formatInt(xp)} XP</span>
      </span>
    </>
  );

  // Your own row opens nothing and is never challenged — it is you.
  if (isUser) {
    return <div className={`${styles.row} ${styles.rowUser}`}>{body}</div>;
  }

  return (
    <div className={styles.row}>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Open ${name}'s dossier`}
      >
        {body}
      </button>
      <button
        type="button"
        className={styles.vsChip}
        onClick={onChallenge}
        aria-label={`Challenge ${name}`}
      >
        <KabaddiIcon size={15} aria-hidden="true" />
        VS
      </button>
    </div>
  );
}

function MiniTag({ label, color }: { label: string; color: string }) {
  return (
    <span className={styles.miniTag} style={{ "--tag-color": color } as CSSProperties}>
      {label}
    </span>
  );
}
