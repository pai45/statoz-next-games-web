"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import {
  CheckIcon,
  FootballIcon,
  GridViewIcon,
  HistoryIcon,
  InsightsIcon,
  MicIcon,
  SwapHorizIcon,
  accentVar,
} from "@statoz/design-system/games";
import type {
  MatchDetailCommentary,
  MatchDetailScoreboard,
  MatchDetailTimelineEvent,
  SportMatch,
} from "@/domain/matches";

import { EmptyPanel, SectionHeading, StatsRow } from "./match-stats-shell";
import styles from "./match-stats.module.css";
import detail from "./match-detail.module.css";

/**
 * The three sections every sport's report shares: the event log, the
 * play-by-play, and the two lineups.
 */

export function TimelineList({
  match,
  events,
}: {
  match: SportMatch;
  events: MatchDetailTimelineEvent[];
}) {
  if (events.length === 0) {
    return (
      <EmptyPanel
        icon={HistoryIcon}
        spark={FootballIcon}
        title="Event log pending"
        message="Goals, cards and substitutions will be tracked here."
      />
    );
  }
  if (match.sport === "football") {
    return <FootballTimeline match={match} events={events} />;
  }
  return (
    <div className={styles.tight}>
      <SectionHeading label="MATCH EVENT LOG" />
      {events.map((event) => {
        const color = event.side === "home" ? match.home.color : match.away.color;
        return (
          <StatsRow key={`${event.minute}-${event.player}`} accent={color}>
            <span className={styles.eventRow}>
              <i className={styles.eventSide} style={{ background: color }} aria-hidden="true" />
              <b className={styles.eventMinute}>{event.minute}</b>
              <span className={styles.eventCopy}>
                <strong>{event.player}</strong>
                {event.secondary ? <small>{event.secondary}</small> : null}
              </span>
              <EventGlyph type={event.type} />
            </span>
          </StatsRow>
        );
      })}
    </div>
  );
}

function EventGlyph({ type }: { type: MatchDetailTimelineEvent["type"] }) {
  if (type === "goal" || type === "score") return <FootballIcon size={16} aria-hidden="true" />;
  if (type === "substitution") return <CheckIcon size={16} aria-hidden="true" style={{ color: accentVar("lime") }} />;
  return (
    <span
      aria-hidden="true"
      style={{
        width: "12px",
        height: "16px",
        background: type === "red" ? "var(--ds-color-danger)" : "var(--ds-color-accent-gold)",
      }}
    />
  );
}

export function CommentaryView({
  commentary,
  match,
}: {
  commentary: MatchDetailCommentary[];
  match?: SportMatch;
}) {
  if (commentary.length === 0) {
    return (
      <EmptyPanel
        icon={MicIcon}
        spark={InsightsIcon}
        title="Match comms silent"
        message="The play-by-play channel opens once commentary is available."
      />
    );
  }
  return (
    <div className={styles.commentary}>
      <header className={styles.logHeader}>
        <h3>LIVE MATCH COMMS</h3>
        <span>{commentary.length} ENTRIES</span>
      </header>
      <ol className={styles.commentaryList}>
        {commentary.map((item, index) => {
          const sequence = item.sequence ?? index;
          const teamName = item.teamName
            ?? (item.side === "home" ? match?.home.name : item.side === "away" ? match?.away.name : undefined);
          const channel = [teamName, item.kind?.replaceAll("-", " ")]
            .filter(Boolean)
            .join(" // ")
            .toUpperCase();
          return (
            <li key={`${sequence}-${item.minute}-${item.text}`} className={styles.commentaryRow}>
              <span className={styles.commentaryStamp}>
                <b>{item.minute || "—"}</b>
                <small>SEQ {String(sequence).padStart(3, "0")}</small>
              </span>
              <span className={styles.commentaryRule} aria-hidden="true" />
              <span className={styles.commentaryCopy}>
                {channel ? <strong>{channel}</strong> : null}
                <span>{item.text}</span>
                {item.players?.length ? <small>PLAYERS // {item.players.join(" · ")}</small> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FootballTimeline({ match, events }: { match: SportMatch; events: MatchDetailTimelineEvent[] }) {
  const homeColor = match.home.secondaryTextColor ?? match.home.color;
  const awayColor = match.away.secondaryTextColor ?? match.away.color;

  return (
    <section className={styles.matchTimeline}>
      <header className={styles.logHeader}>
        <h3>MATCH TIMELINE</h3>
        <span>{String(events.length).padStart(3, "0")} EVENTS</span>
      </header>
      <div className={styles.timelineMoments}>
        {events.map((event, index) => event.marker ? (
          <TimelinePeriod key={`${event.label}-${event.minute}-${index}`} event={event} />
        ) : (
          <TimelineMoment
            key={`${event.minute}-${event.player}-${index}`}
            event={event}
            accent={event.side === "home" ? homeColor : awayColor}
          />
        ))}
      </div>
    </section>
  );
}

function TimelinePeriod({ event }: { event: MatchDetailTimelineEvent }) {
  return (
    <div className={styles.timelinePeriod}>
      <i aria-hidden="true" />
      <span aria-hidden="true" className={styles.timelineTarget} />
      <b>{event.label ?? "MATCH EVENT"}{event.scoreDisplay ? ` ${event.scoreDisplay}` : ""}</b>
      <i aria-hidden="true" />
    </div>
  );
}

function TimelineMoment({ event, accent }: { event: MatchDetailTimelineEvent; accent: string }) {
  const [open, setOpen] = useState(false);
  const isHome = event.side === "home";
  const body = <TimelineEventBody event={event} accent={accent} home={isHome} />;
  const cells = (
    <>
      <span className={styles.timelineTeamCell}>{isHome ? body : null}</span>
      <span className={styles.timelineSpine} data-goal={event.type === "goal" || undefined}>
        <b style={{ "--event-accent": accent } as CSSProperties}><span>{event.minute}</span></b>
      </span>
      <span className={styles.timelineTeamCell}>{isHome ? null : body}</span>
    </>
  );

  return (
    <div className={styles.timelineMoment} style={{ "--event-accent": accent } as CSSProperties}>
      {event.description ? (
        <button
          type="button"
          className={styles.timelineMain}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          {cells}
        </button>
      ) : <div className={styles.timelineMain}>{cells}</div>}
      {open && event.description ? (
        <div className={styles.timelineReport} data-side={isHome ? "home" : "away"}>
          <p>{event.description}</p>
        </div>
      ) : null}
    </div>
  );
}

function TimelineEventBody({
  event,
  accent,
  home,
}: {
  event: MatchDetailTimelineEvent;
  accent: string;
  home: boolean;
}) {
  const glyph = <TimelineEventGlyph type={event.type} accent={accent} />;
  return (
    <span className={styles.timelineBody} data-side={home ? "home" : "away"}>
      {home ? null : glyph}
      <span className={styles.timelineEventCopy}>
        {event.type === "substitution" ? (
          <>
            <strong data-in>{event.player.toUpperCase()}</strong>
            {event.secondary ? <strong data-out>{event.secondary.toUpperCase()}</strong> : null}
          </>
        ) : (
          <>
            <strong>{event.player.toUpperCase()}</strong>
            {event.type === "goal" && event.scoreDisplay ? <b style={{ color: accent }}>{event.scoreDisplay}</b> : null}
            {event.secondary ? <small>ASSIST {event.secondary.toUpperCase()}</small> : null}
          </>
        )}
      </span>
      {home ? glyph : null}
    </span>
  );
}

function TimelineEventGlyph({ type, accent }: { type: MatchDetailTimelineEvent["type"]; accent: string }) {
  let mark: ReactNode;
  if (type === "goal" || type === "score") mark = <FootballIcon size={15} aria-hidden="true" />;
  else if (type === "substitution") mark = <SwapHorizIcon size={15} aria-hidden="true" />;
  else mark = <i className={styles.timelineCard} data-card={type} aria-hidden="true" />;
  const tone = type === "yellow"
    ? "var(--ds-color-accent-gold)"
    : type === "red"
      ? "var(--ds-color-danger)"
      : type === "substitution"
        ? "var(--ds-color-accent-lime)"
        : accent;
  return (
    <span className={styles.timelineGlyph} style={{ "--event-tone": tone } as CSSProperties}>
      <span>{mark}</span>
    </span>
  );
}

export function LineupsView({
  match,
  scoreboard,
  heading,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
  heading?: string;
}) {
  const label =
    heading ??
    (match.sport === "motorsport"
      ? "STARTING GRID"
      : match.sport === "cricket"
        ? "PLAYING XI"
        : match.sport === "basketball"
          ? "STARTING FIVE"
          : "LINEUPS");
  return (
    <div className={detail.lineupView}>
      <header className={detail.lineupHeader}>
        <GridViewIcon size={18} />
        <span>{label}</span>
      </header>
      <div className={detail.lineupPitch}>
        <LineupColumn
          team={match.home.name}
          shortName={match.home.shortName}
          color={match.home.color}
          lineup={scoreboard.homeLineup}
        />
        <LineupColumn
          team={match.away.name}
          shortName={match.away.shortName}
          color={match.away.color}
          lineup={scoreboard.awayLineup}
          alignEnd
        />
      </div>
    </div>
  );
}

function LineupColumn({
  team,
  shortName,
  color,
  lineup,
  alignEnd = false,
}: {
  team: string;
  shortName: string;
  color: string;
  lineup: MatchDetailScoreboard["homeLineup"];
  alignEnd?: boolean;
}) {
  return (
    <section
      className={[detail.lineupColumn, alignEnd ? detail.lineupColumnAway : ""].join(" ")}
      style={{ "--team-color": color } as CSSProperties}
    >
      <header>
        <span>{shortName}</span>
        <small>{lineup.formation}</small>
      </header>
      <h2>{team}</h2>
      <ol>
        {lineup.players.map((player) => (
          <li key={`${team}-${player.number}`}>
            <span>{player.number}</span>
            <div>
              <strong>{player.name}</strong>
              <small>
                {player.role}
                {player.captain ? " · C" : ""}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
