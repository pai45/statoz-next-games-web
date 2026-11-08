"use client";

import { useState, type CSSProperties } from "react";

import {
  FilterChips,
  FootballIcon,
  GroupsIcon,
  MyLocationIcon,
  NoDataState,
  StadiumIcon,
  StyleIcon,
  SwapHorizIcon,
} from "@statoz/design-system/games";
import type {
  MatchDetailLineup,
  MatchDetailPlayer,
  MatchDetailScoreboard,
  MatchPlayerDossier,
  SportMatch,
  SportTeam,
} from "@/domain/matches";

import { MatchPlayerSheet } from "./match-player-sheet";
import { TeamBadge } from "./team-badge";
import styles from "./match-pitch.module.css";

/**
 * The team sheet as a board rather than a list: one side at a time, its shape
 * laid out on the surface it plays on, and the bench under it.
 *
 * The formation string is the layout — "4-3-3" is a back four, a midfield
 * three and a front three — so the rows come from the data rather than from a
 * per-fixture arrangement.
 */
export function MatchPitchView({
  match,
  scoreboard,
}: {
  match: SportMatch;
  scoreboard: MatchDetailScoreboard;
}) {
  const [showHome, setShowHome] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const home = scoreboard.homeLineup;
  const away = scoreboard.awayLineup;

  if (home.players.length === 0 && away.players.length === 0) {
    return (
      <NoDataState
        icon={GroupsIcon}
        spark={StadiumIcon}
        title="Lineups not locked"
        message="Confirmed formations and squad roles will appear here."
      />
    );
  }

  const team = showHome ? match.home : match.away;
  const lineup = showHome ? home : away;
  const teamColor = team.secondaryTextColor ?? team.color;
  const dossiers = (scoreboard.players ?? []).filter((player) => player.teamId === team.id);

  return (
    <div className={styles.view} style={{ "--team-color": teamColor } as CSSProperties}>
      <FilterChips
        label="Team sheet"
        options={[match.home.shortName, match.away.shortName]}
        selected={team.shortName}
        accent="var(--team-color)"
        onSelect={(value) => {
          setShowHome(value === match.home.shortName);
          setSelectedPlayer(null);
        }}
      />

      <div className={styles.scroll} key={team.id}>
        <IdentityPanel team={team} lineup={lineup} />
        <Board
          lineup={lineup}
          basketball={match.sport === "basketball"}
          players={dossiers}
          onSelect={match.sport === "football" ? setSelectedPlayer : undefined}
        />
        <BenchPanel
          lineup={lineup}
          players={dossiers}
          onSelect={match.sport === "football" ? setSelectedPlayer : undefined}
        />
      </div>
      {selectedPlayer ? (
        <MatchPlayerSheet
          key={`${team.id}-${selectedPlayer}`}
          team={team}
          lineup={lineup}
          dossiers={dossiers}
          selectedName={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      ) : null}
    </div>
  );
}

/** Who is out, in what shape, and whether the sheet is official. */
function IdentityPanel({ team, lineup }: { team: SportTeam; lineup: MatchDetailLineup }) {
  const squad = lineup.players.length + lineup.substitutes.length;
  return (
    <section className={styles.panel}>
      <div className={styles.identity}>
        <TeamBadge team={team} size={48} />
        <span className={styles.identityCopy}>
          <strong>{team.name.toUpperCase()}</strong>
          <small>
            {lineup.formation} FORMATION // {squad} PLAYER SQUAD
          </small>
        </span>
        <span
          className={styles.sheetState}
          style={
            {
              "--state-color": lineup.confirmed
                ? "var(--ds-color-success)"
                : "var(--ds-color-accent-gold)",
            } as CSSProperties
          }
        >
          {lineup.confirmed ? "CONFIRMED" : "PROJECTED"}
        </span>
      </div>
    </section>
  );
}

/**
 * The surface and the shape on it. The keeper is a row of one, and every
 * number in the formation is a row after that.
 */
function Board({
  lineup,
  basketball,
  players,
  onSelect,
}: {
  lineup: MatchDetailLineup;
  basketball: boolean;
  players: MatchPlayerDossier[];
  onSelect?: (name: string) => void;
}) {
  const counts = [1, ...lineup.formation.split("-").map((part) => Number.parseInt(part, 10) || 0)];
  const starters = [...lineup.players].sort((a, b) => (a.formationPlace ?? 999) - (b.formationPlace ?? 999));
  const rows: MatchDetailPlayer[][] = [];
  let cursor = 0;
  for (const count of counts) {
    const end = Math.min(cursor + count, starters.length);
    rows.push(starters.slice(cursor, end));
    cursor = end;
  }
  if (cursor < starters.length) rows.push(starters.slice(cursor));

  return (
    <section className={`${styles.panel} ${styles.boardPanel}`}>
      <div className={[styles.pitch, basketball ? styles.pitchCourt : ""].filter(Boolean).join(" ")}>
        <span aria-hidden className={styles.markings} />
        <span aria-hidden className={styles.goalAreas} />
        <span aria-hidden className={styles.centreCircle} />
        <span aria-hidden className={styles.centreSpot} />
        <div className={styles.rows}>
          {rows.map((row, index) => (
            <div key={index} className={styles.row}>
              {row.map((player) => (
                <PitchPlayer
                  key={`${player.number}-${player.name}`}
                  player={player}
                  dossier={players.find((candidate) => candidate.name === player.name)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PitchPlayer({
  player,
  dossier,
  onSelect,
}: {
  player: MatchDetailPlayer;
  dossier?: MatchPlayerDossier;
  onSelect?: (name: string) => void;
}) {
  const content = (
    <>
      <span className={styles.playerBadge}>
      <b className={styles.playerNumber}>{player.number}</b>
        {dossier ? <PlayerMarks player={dossier} /> : null}
      </span>
      <span className={styles.playerName}>{player.shortName ?? shortName(player.name)}</span>
    </>
  );
  return onSelect ? (
    <button type="button" className={styles.player} onClick={() => onSelect(player.name)} aria-label={`Open ${player.name} match dossier`}>
      {content}
    </button>
  ) : <span className={styles.player}>{content}</span>;
}

/** "Chelsea Mason" reads as "Mason" on a shirt-sized plate. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function BenchPanel({
  lineup,
  players,
  onSelect,
}: {
  lineup: MatchDetailLineup;
  players: MatchPlayerDossier[];
  onSelect?: (name: string) => void;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.benchHead}>
        <b>BENCH UNIT</b>
        <small>{String(lineup.substitutes.length).padStart(2, "0")} AVAILABLE</small>
      </div>
      {lineup.substitutes.length === 0 ? (
        <p className={styles.benchEmpty}>No substitutes supplied.</p>
      ) : (
        <div className={styles.bench}>
          {lineup.substitutes.map((player) => {
            const dossier = players.find((candidate) => candidate.name === player.name);
            const content = <>
              <b>{player.number}</b>
              <span>
                <strong>{player.shortName ?? shortName(player.name)}</strong>
                <small>{player.role.toUpperCase()}</small>
              </span>
              {dossier ? <PlayerMarks player={dossier} /> : null}
            </>;
            return onSelect ? (
              <button key={`${player.number}-${player.name}`} type="button" className={styles.benchTile} onClick={() => onSelect(player.name)}>
                {content}
              </button>
            ) : (
              <span key={`${player.number}-${player.name}`} className={styles.benchTile}>{content}</span>
            );
          })}
        </div>
      )}
    </section>
  );
}

function statValue(player: MatchPlayerDossier, label: string): number {
  return Number(player.stats.find((stat) => stat.label === label)?.value ?? 0) || 0;
}

/** Match marks pinned to a shirt badge, with the goal as the only glow. */
function PlayerMarks({ player }: { player: MatchPlayerDossier }) {
  const goals = Math.min(3, statValue(player, "TOTAL GOALS"));
  const assists = statValue(player, "GOAL ASSISTS");
  const red = statValue(player, "RED CARDS");
  const yellow = statValue(player, "YELLOW CARDS");
  const substitutions = statValue(player, "SUB INS");
  if (!goals && !assists && !red && !yellow && !substitutions) return null;
  return (
    <span className={styles.playerMarks} aria-label="Match events">
      {Array.from({ length: goals }, (_, index) => <i key={`goal-${index}`} data-tone="goal"><FootballIcon size={8} /></i>)}
      {assists ? <i data-tone="assist"><MyLocationIcon size={8} /></i> : null}
      {red ? <i data-tone="red"><StyleIcon size={8} /></i> : yellow ? <i data-tone="yellow"><StyleIcon size={8} /></i> : null}
      {substitutions ? <i data-tone="sub"><SwapHorizIcon size={8} /></i> : null}
    </span>
  );
}
