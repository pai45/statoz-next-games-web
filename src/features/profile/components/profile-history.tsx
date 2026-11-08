"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import {
  accentVar,
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  GameIcon,
  MatchIcon,
  MoreIcon,
  PickIcon,
  TrendingUpIcon,
  UnderlineTabs,
  type UnderlineTab,
} from "@statoz/design-system/games";
import type { SportTeam } from "@/domain/matches";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { AuthBoundary } from "@/features/auth";
import { AdSlot } from "@/features/ads";
import { GameScene, gameEntryFor } from "@/features/games";
import { matchById, SportIcon } from "@/features/matches";
import {
  formatKickoffDate,
  formatKickoffTime,
  formatOzCompact,
} from "@/shared/utils";

import {
  gameHistoryRecords,
  pickHistoryRecords,
  predictionHistoryRecords,
  type GameHistoryRecord,
  type HistorySection,
  type HistoryStatus,
  type PickHistoryRecord,
  type PredictionHistoryRecord,
} from "@/mocks/profile";

import styles from "./profile-history.module.css";

type PredictionFilter =
  | "all"
  | "won"
  | "lost"
  | "live"
  | "pending"
  | "unresolved";

type PickFilter = PredictionFilter | "voided";

const predictFilters: Array<{ id: PredictionFilter; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "won", label: "WON" },
  { id: "lost", label: "LOST" },
  { id: "live", label: "LIVE" },
  { id: "pending", label: "PENDING" },
  { id: "unresolved", label: "UNRESOLVED" },
];

const pickFilters: Array<{ id: PickFilter; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "won", label: "WON" },
  { id: "lost", label: "LOST" },
  { id: "live", label: "LIVE" },
  { id: "pending", label: "PENDING" },
  { id: "unresolved", label: "REVIEW" },
  { id: "voided", label: "REFUND" },
];

const sectionConfig: Record<
  HistorySection,
  { title: string; eyebrow: string; accent: string; icon: ReactNode }
> = {
  predict: {
    title: "MY MATCHES HISTORY",
    eyebrow: "PREDICT // ARCHIVE",
    accent: accentVar("violet"),
    icon: <MatchIcon size={20} />,
  },
  pick: {
    title: "MY PICKS HISTORY",
    eyebrow: "PICK // LEDGER",
    accent: accentVar("lime"),
    icon: <PickIcon size={20} />,
  },
  games: {
    title: "MATCH ARCHIVE",
    eyebrow: "GAMES // CAREER LOG",
    accent: accentVar("cyan"),
    icon: <GameIcon size={20} />,
  },
};

const resultColor: Record<GameHistoryRecord["result"], string> = {
  won: "var(--ds-color-success)",
  draw: "var(--ds-color-warning)",
  lost: "var(--ds-color-danger)",
};

export type ProfileHistoryScreenProps = {
  section: HistorySection;
};

/**
 * The responsive web port of the Flutter history surfaces. The route owns the
 * section; this client slice owns only the filters and the game detail panel.
 */
export function ProfileHistoryScreen({ section }: ProfileHistoryScreenProps) {
  return (
    <AuthBoundary allowGuest
      intent="view your history"
      message="Log in to review your predictions, picks, and game results."
      returnTo={`/profile/history/${section}`}
    >
      <ProfileHistoryArchive section={section} />
    </AuthBoundary>
  );
}

function ProfileHistoryArchive({ section }: ProfileHistoryScreenProps) {
  const config = sectionConfig[section];
  const [sport, setSport] = useState<Sport>(sportOrder[0]);
  const [predictFilter, setPredictFilter] = useState<PredictionFilter>("all");
  const [pickFilter, setPickFilter] = useState<PickFilter>("all");
  const [selectedGame, setSelectedGame] = useState<GameHistoryRecord | null>(null);

  useEffect(() => {
    if (!selectedGame) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedGame(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedGame]);

  const tabs: UnderlineTab[] = sportOrder.map((item) => ({
    id: item,
    label: sportModuleFor(item).label.toUpperCase(),
    icon: <SportIcon sport={item} size={20} />,
  }));

  const filteredPredict = predictionHistoryRecords.filter(
    (record) =>
      record.sport === sport &&
      (predictFilter === "all" || record.status === predictFilter),
  );
  const sportPredict = predictionHistoryRecords.filter((record) => record.sport === sport);

  const filteredPicks = pickHistoryRecords.filter(
    (record) =>
      record.sport === sport &&
      (pickFilter === "all" || record.status === pickFilter),
  );
  const sportPicks = pickHistoryRecords.filter((record) => record.sport === sport);

  const filteredGames = gameHistoryRecords.filter((record) => record.sport === sport);

  const content =
    section === "predict" ? (
      <PredictionHistory
        records={filteredPredict}
        allRecords={sportPredict}
        activeFilter={predictFilter}
        accent={config.accent}
        onFilterChange={setPredictFilter}
      />
    ) : section === "pick" ? (
      <PickHistory
        records={filteredPicks}
        allRecords={sportPicks}
        activeFilter={pickFilter}
        accent={config.accent}
        onFilterChange={setPickFilter}
      />
    ) : (
      <GameHistory
        records={filteredGames}
        accent={config.accent}
        onSelect={setSelectedGame}
      />
    );

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/profile" className={styles.backButton} aria-label="Back to profile">
            <ChevronLeftIcon size={20} />
          </Link>
          <span className={styles.headerRule} aria-hidden />
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>{config.eyebrow}</span>
            <div className={styles.titleLine}>
              <span aria-hidden className={styles.titleIcon} style={{ color: config.accent }}>
                {config.icon}
              </span>
              <h1 className={styles.title}>{config.title}</h1>
            </div>
          </div>
          <Link href="/profile" className={styles.profileLink}>
            PROFILE
            <ChevronRightIcon size={15} />
          </Link>
        </header>

        <UnderlineTabs
          label="History sport"
          tabs={tabs}
          activeIndex={sportOrder.indexOf(sport)}
          onChange={(index) => setSport(sportOrder[index])}
          accent={config.accent}
          iconColors={sportOrder.map((item) =>
            accentVar(sportModuleFor(item).accent),
          )}
          minTabWidth={72}
          className={styles.sportTabs}
        />

        <main className={styles.main}>
          {content}
        </main>
      </div>

      {selectedGame ? (
        <GameHistoryDetail record={selectedGame} onClose={() => setSelectedGame(null)} />
      ) : null}
    </div>
  );
}

function PredictionHistory({
  records,
  allRecords,
  activeFilter,
  accent,
  onFilterChange,
}: {
  records: PredictionHistoryRecord[];
  allRecords: PredictionHistoryRecord[];
  activeFilter: PredictionFilter;
  accent: string;
  onFilterChange: (filter: PredictionFilter) => void;
}) {
  const totalAnswers = allRecords.reduce((sum, record) => sum + record.answered, 0);
  const correctAnswers = allRecords.reduce((sum, record) => sum + record.correct, 0);
  const accuracy = totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100);

  return (
    <HistoryBody
      accent={accent}
      stats={[
        { label: "MATCHES", value: `${allRecords.length}` },
        { label: "ACCURACY", value: `${accuracy}%` },
        { label: "RANK", value: "122" },
      ]}
      filters={
        <FilterBar
          filters={predictFilters}
          counts={Object.fromEntries(
            predictFilters.map(({ id }) => [
              id,
              id === "all"
                ? allRecords.length
                : allRecords.filter((record) => record.status === id).length,
            ]),
          )}
          active={activeFilter}
          accent={accent}
          onChange={onFilterChange}
        />
      }
      empty={
        records.length === 0 ? (
          <EmptyHistory
            accent={accent}
            title={allRecords.length > 0 ? `NO ${filterLabel(activeFilter)} ENTRIES` : "NO QUIZZES YET"}
            message={
              allRecords.length > 0
                ? "Switch filters to review the quizzes already played."
                : "Play a prediction quiz and it will land here."
            }
          />
        ) : null
      }
      singleColumn
    >
      {records.map((record) => (
        <PredictionCard key={record.id} record={record} accent={accent} />
      ))}
    </HistoryBody>
  );
}

function PickHistory({
  records,
  allRecords,
  activeFilter,
  accent,
  onFilterChange,
}: {
  records: PickHistoryRecord[];
  allRecords: PickHistoryRecord[];
  activeFilter: PickFilter;
  accent: string;
  onFilterChange: (filter: PickFilter) => void;
}) {
  const exposure = allRecords
    .filter((record) => !isFinalPick(record.status))
    .reduce((sum, record) => sum + record.stakeOz, 0);
  const profit = allRecords
    .filter((record) => isFinalPick(record.status))
    .reduce((sum, record) => sum + record.payoutOz - record.stakeOz, 0);

  return (
    <HistoryBody
      accent={accent}
      stats={[
        { label: "PICKS", value: `${allRecords.length}` },
        { label: "EXPOSURE", value: formatOzCompact(exposure) },
        {
          label: "PROFIT",
          value: `${profit >= 0 ? "+" : "−"}${formatOzCompact(Math.abs(profit))}`,
          valueColor:
            profit > 0
              ? "var(--ds-color-success)"
              : profit < 0
                ? "var(--ds-color-danger)"
                : undefined,
        },
      ]}
      filters={
        <FilterBar
          filters={pickFilters}
          counts={Object.fromEntries(
            pickFilters.map(({ id }) => [
              id,
              id === "all"
                ? allRecords.length
                : allRecords.filter((record) => record.status === id).length,
            ]),
          )}
          active={activeFilter}
          accent={accent}
          onChange={onFilterChange}
        />
      }
      empty={
        records.length === 0 ? (
          <EmptyHistory
            accent={accent}
            title={allRecords.length > 0 ? `NO ${filterLabel(activeFilter)} ENTRIES` : "NO PICKS YET"}
            message={
              allRecords.length > 0
                ? "Switch filters to review the positions already on your board."
                : "Place a pick and it will show up here."
            }
          />
        ) : null
      }
    >
      {records.map((record) => (
        <PickCard key={record.id} record={record} accent={accent} />
      ))}
    </HistoryBody>
  );
}

function GameHistory({
  records,
  accent,
  onSelect,
}: {
  records: GameHistoryRecord[];
  accent: string;
  onSelect: (record: GameHistoryRecord) => void;
}) {
  const wins = records.filter((record) => record.result === "won").length;
  const draws = records.filter((record) => record.result === "draw").length;
  const losses = records.filter((record) => record.result === "lost").length;
  const winRate = records.length === 0 ? 0 : Math.round((wins / records.length) * 100);

  return (
    <HistoryBody
      accent={accent}
      summary={<GameSummary wins={wins} draws={draws} losses={losses} winRate={winRate} />}
      distribution={
        <div className={styles.distribution} aria-label={`${wins} wins, ${draws} draws, ${losses} losses`}>
          {wins > 0 ? <span style={{ flex: wins, background: resultColor.won }} /> : null}
          {draws > 0 ? <span style={{ flex: draws, background: resultColor.draw }} /> : null}
          {losses > 0 ? <span style={{ flex: losses, background: resultColor.lost }} /> : null}
        </div>
      }
      empty={
        records.length === 0 ? (
          <EmptyHistory
            accent={accent}
            title="NO GAMES ARCHIVED YET"
            message="Finish a game and its result will land in this career log."
          />
        ) : null
      }
    >
      {records.map((record) => (
        <GameCard key={record.id} record={record} onSelect={onSelect} />
      ))}
    </HistoryBody>
  );
}

function HistoryBody({
  accent,
  stats,
  summary,
  filters,
  distribution,
  empty,
  singleColumn = false,
  children,
}: {
  accent: string;
  stats?: Array<{ label: string; value: string; valueColor?: string }>;
  summary?: ReactNode;
  filters?: ReactNode;
  distribution?: ReactNode;
  empty: ReactNode;
  singleColumn?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.body}>
      {summary ?? (
        <div className={styles.statsGrid}>
          {stats?.map((stat) => (
            <HistoryStatCell key={stat.label} {...stat} accent={accent} />
          ))}
        </div>
      )}
      {distribution ? <div className={styles.distributionWrap}>{distribution}</div> : null}
      {filters ? <div className={styles.filters}>{filters}</div> : null}
      {empty ? empty : <>
        <div className={styles.adSlot}><AdSlot placement="history-feed" /></div>
        <div className={`${styles.recordsGrid} ${singleColumn ? styles.recordsSingle : ""}`}>
          {children}
        </div>
      </>}
    </div>
  );
}

function GameSummary({
  wins,
  draws,
  losses,
  winRate,
}: {
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
}) {
  return (
    <div className={styles.gameSummary}>
      <div className={styles.gameResultCells}>
        <GameResultCell label="W" value={wins} color="var(--ds-color-success)" />
        <GameResultCell label="D" value={draws} color="var(--ds-color-warning)" />
        <GameResultCell label="L" value={losses} color="var(--ds-color-danger)" />
      </div>
      <div className={styles.gameRate}>
        <strong>{winRate}%</strong>
        <span>WIN RATE</span>
      </div>
    </div>
  );
}

function GameResultCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={styles.gameResultCell}>
      <span style={{ color }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function HistoryStatCell({
  label,
  value,
  valueColor,
  accent,
}: {
  label: string;
  value: string;
  valueColor?: string;
  accent: string;
}) {
  return (
    <div className={styles.statCell} style={{ "--cell-accent": accent } as CSSProperties}>
      <span aria-hidden className={styles.statEdge} />
      <span aria-hidden className={styles.statFill} />
      <div className={styles.statContent}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue} style={{ color: valueColor }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function FilterBar<T extends string>({
  filters,
  counts,
  active,
  accent,
  onChange,
}: {
  filters: Array<{ id: T; label: string }>;
  counts: Record<string, number>;
  active: T;
  accent: string;
  onChange: (filter: T) => void;
}) {
  return (
    <div className={styles.filterScroller} role="group" aria-label="History filters">
      {filters.map((filter) => {
        const selected = filter.id === active;
        return (
          <button
            key={filter.id}
            type="button"
            className={styles.filterChip}
            data-active={selected}
            style={{ "--chip-accent": accent } as CSSProperties}
            aria-pressed={selected}
            onClick={() => onChange(filter.id)}
          >
            <span>{filter.label}</span>
            <span className={styles.filterCount}>{counts[filter.id] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

function PredictionCard({
  record,
  accent,
}: {
  record: PredictionHistoryRecord;
  accent: string;
}) {
  const match = matchById(record.matchId);
  if (!match) return null;
  const reviewReady = record.status === "unresolved";

  return (
    <article
      className={`${styles.fixtureCard} ${styles.predictionCard}`}
      style={{ "--card-accent": accent, "--state-color": statusColor(record.status) } as CSSProperties}
    >
      <div aria-hidden className={styles.cardLift} />
      <div className={`${styles.cardTag} ${styles.predictionStatus}`}>
        {statusLabel(record.status)}
      </div>
      <div className={styles.cardFrame}>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            <span>{match.leagueLabel}</span>
          </div>
          <Matchup match={match} />
        </div>
        <div
          className={`${styles.cardStrip} ${styles.predictionStrip} ${reviewReady ? styles.reviewStrip : ""}`}
        >
          {reviewReady ? (
            <span className={styles.reviewAction}>
              <CalendarIcon size={14} aria-hidden="true" />
              RESULTS READY – TAP TO REVEAL
            </span>
          ) : (
            <>
              <span className={styles.predictionReward}>
                {record.status === "won" ? <TrendingUpIcon size={13} aria-hidden="true" /> : null}
                {record.status === "won"
                  ? `+${record.potentialXp} XP`
                  : `POTENTIAL +${record.potentialXp} XP`}
              </span>
              <span
                className={styles.quizMarks}
                aria-label={`${record.correct} of ${record.questions} answers correct`}
              >
                {Array.from({ length: record.questions }, (_, index) => (
                  <i key={index} data-correct={index < record.correct} aria-hidden="true">
                    ·
                  </i>
                ))}
              </span>
            </>
          )}
        </div>
      </div>
      <Link
        href={`/matches/${match.id}`}
        className={styles.stretchedLink}
        aria-label={`${match.home.name} versus ${match.away.name}, ${statusLabel(record.status)}`}
      />
    </article>
  );
}

function PickCard({
  record,
  accent,
}: {
  record: PickHistoryRecord;
  accent: string;
}) {
  const match = matchById(record.matchId);
  if (!match) return null;
  const profit = record.payoutOz - record.stakeOz;

  return (
    <article
      className={styles.fixtureCard}
      style={{ "--card-accent": accent, "--state-color": statusColor(record.status) } as CSSProperties}
    >
      <div aria-hidden className={styles.cardLift} />
      <div className={styles.cardFrame}>
        <div className={styles.cardBody}>
          <div className={styles.cardTag} style={{ color: statusColor(record.status) }}>
            {statusLabel(record.status)}
          </div>
          <div className={styles.cardMeta}>
            <span>{match.leagueLabel}</span>
            <time dateTime={record.submittedAt}>{formatKickoffDate(record.submittedAt)}</time>
          </div>
          <h2 className={styles.pickQuestion}>{record.market}</h2>
          <div className={styles.pickOutcome}>
            <span className={styles.outcomeMarker} style={{ background: accent }} />
            <span className={styles.outcomeLabel}>HELD {record.outcome}</span>
            <span className={styles.outcomeProbability}>{record.probability}%</span>
          </div>
          <p className={styles.cardNote}>{record.note}</p>
        </div>
        <div className={styles.cardStrip}>
          <span className={styles.stripText}>STAKE {formatOzCompact(record.stakeOz)} OZ</span>
          <span className={profit >= 0 ? styles.stripSuccess : styles.stripDanger}>
            {record.status === "won" ? (
              <>
                <TrendingUpIcon size={13} /> +{formatOzCompact(profit)} OZ
              </>
            ) : record.status === "voided" ? (
              "STAKE RETURNED"
            ) : (
              `MAX ${formatOzCompact(record.payoutOz || Math.round(record.stakeOz / (record.probability / 100)))} OZ`
            )}
          </span>
        </div>
      </div>
      <Link
        href={`/matches/${match.id}`}
        className={styles.stretchedLink}
        aria-label={`${record.market}, ${record.outcome}, ${statusLabel(record.status)}`}
      />
    </article>
  );
}

function Matchup({ match }: { match: NonNullable<ReturnType<typeof matchById>> }) {
  const hasScore = match.homeScore != null || match.awayScore != null;

  return (
    <div className={styles.matchup}>
      <TeamLockup team={match.home} />
      <div className={styles.scoreCenter}>
        <span className={styles.score}>
          {hasScore ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}` : "-"}
        </span>
        {match.status === "live" ? <span className={styles.liveCopy}>IN PLAY</span> : null}
      </div>
      <TeamLockup team={match.away} alignEnd />
    </div>
  );
}

function TeamLockup({ team, alignEnd = false }: { team: SportTeam; alignEnd?: boolean }) {
  return (
    <div className={`${styles.teamLockup} ${alignEnd ? styles.teamLockupEnd : ""}`}>
      <span
        className={styles.teamBadge}
        style={
          {
            "--badge-primary": team.color,
            "--badge-secondary": team.secondaryColor ?? team.color,
            "--badge-text": team.badgeTextColor ?? "var(--ds-color-text-default)",
          } as CSSProperties
        }
        aria-hidden
      >
        {team.shortName}
      </span>
      <span className={styles.teamName}>{team.name}</span>
    </div>
  );
}

function GameCard({
  record,
  onSelect,
}: {
  record: GameHistoryRecord;
  onSelect: (record: GameHistoryRecord) => void;
}) {
  const entry = gameEntryFor(record.game);
  const accent = accentVar(entry?.accent ?? "cyan");

  return (
    <button
      type="button"
      className={styles.gameCard}
      style={{ "--card-accent": accent } as CSSProperties}
      onClick={() => onSelect(record)}
      aria-label={`View ${entry?.title ?? "game"} result against ${record.opponent}`}
    >
      <span className={styles.gameScene} aria-hidden>
        <GameScene game={record.game} opacity={0.18} washed={false} />
      </span>
      <span className={styles.gameCardTop}>
        <span className={styles.gameType} style={{ color: accent }}>
          <GameIcon size={15} /> {entry?.title ?? "GAME"}
        </span>
        <span className={styles.gameDate}>{formatKickoffDate(record.playedAt)}</span>
      </span>
      <span className={styles.gameOpponent}>{record.opponent}</span>
      <span className={styles.gameScoreline}>
        <span className={styles.gameScore}>{record.playerScore}</span>
        <span className={styles.gameDivider}>:</span>
        <span className={styles.gameScoreMuted}>{record.opponentScore}</span>
      </span>
      <span className={styles.gameFooter}>
        <span style={{ color: resultColor[record.result] }}>{resultLabel(record.result)}</span>
        <span>{record.streak > 0 ? `${record.streak} STREAK` : "ARCHIVED"}</span>
      </span>
    </button>
  );
}

function GameHistoryDetail({
  record,
  onClose,
}: {
  record: GameHistoryRecord;
  onClose: () => void;
}) {
  const entry = gameEntryFor(record.game);
  const color = resultColor[record.result];
  const titleId = `game-history-detail-${record.id}`;

  return (
    <div className={styles.dialogScrim} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHeader}>
          <div>
            <span className={styles.eyebrow}>MATCH RESULT // ARCHIVED</span>
            <h2 id={titleId}>{entry?.title ?? "GAME RESULT"}</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close game result">
            <CloseIcon size={19} />
          </button>
        </div>
        <div className={styles.dialogScore}>
          <div>
            <span className={styles.dialogLabel}>PLAYER</span>
            <strong>{record.playerScore}</strong>
          </div>
          <span className={styles.dialogVersus}>VS</span>
          <div className={styles.dialogAway}>
            <span className={styles.dialogLabel}>OPPONENT</span>
            <strong>{record.opponentScore}</strong>
          </div>
        </div>
        <div className={styles.dialogResult} style={{ color }}>
          <CheckIcon size={16} /> {resultLabel(record.result)}
        </div>
        <p className={styles.dialogNote}>{record.note}</p>
        <dl className={styles.dialogFacts}>
          <div>
            <dt>OPPONENT</dt>
            <dd>{record.opponent}</dd>
          </div>
          <div>
            <dt>PLAYED</dt>
            <dd>
              {formatKickoffDate(record.playedAt)} · {formatKickoffTime(record.playedAt)} UTC
            </dd>
          </div>
          <div>
            <dt>RUN</dt>
            <dd>{record.streak > 0 ? `${record.streak} WINS` : "NO ACTIVE RUN"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function EmptyHistory({
  accent,
  title,
  message,
}: {
  accent: string;
  title: string;
  message: string;
}) {
  return (
    <div className={styles.emptyState} style={{ "--empty-accent": accent } as CSSProperties}>
      <div className={styles.emptyIcon} aria-hidden>
        <MoreIcon size={24} />
      </div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function filterLabel(filter: PredictionFilter | PickFilter): string {
  if (filter === "unresolved") return "REVIEW";
  if (filter === "voided") return "REFUND";
  return filter.toUpperCase();
}

function isFinalPick(status: HistoryStatus): boolean {
  return status === "won" || status === "lost" || status === "voided";
}

function statusLabel(status: HistoryStatus): string {
  switch (status) {
    case "won":
      return "WON";
    case "lost":
      return "LOST";
    case "live":
      return "LIVE";
    case "pending":
      return "PENDING";
    case "unresolved":
      return "REVIEW";
    case "voided":
      return "REFUND";
  }
}

function statusColor(status: HistoryStatus): string {
  switch (status) {
    case "won":
      return "var(--ds-color-success)";
    case "lost":
      return "var(--ds-color-danger)";
    case "live":
      return "var(--ds-color-danger)";
    case "pending":
      return "var(--ds-color-fixture-kickoff)";
    case "unresolved":
      return "var(--ds-color-warning)";
    case "voided":
      return "var(--ds-color-text-muted)";
  }
}

function resultLabel(result: GameHistoryRecord["result"]): string {
  return result === "won" ? "VICTORY" : result === "lost" ? "DEFEAT" : "DRAW";
}
