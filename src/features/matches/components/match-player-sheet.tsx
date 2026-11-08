"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";

import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, FilterChips } from "@statoz/design-system/games";
import type {
  MatchDetailLineup,
  MatchDetailPlayer,
  MatchPlayerDossier,
  SportTeam,
} from "@/domain/matches";

import { TeamBadge } from "./team-badge";
import styles from "./match-player-sheet.module.css";

type SquadPlayer = {
  roster: MatchDetailPlayer;
  dossier?: MatchPlayerDossier;
};

const ranges = ["FULL", "1ST", "2ND"];

export function MatchPlayerSheet({
  team,
  lineup,
  dossiers,
  selectedName,
  onClose,
}: {
  team: SportTeam;
  lineup: MatchDetailLineup;
  dossiers: MatchPlayerDossier[];
  selectedName: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const accent = team.secondaryTextColor ?? team.color;
  const squad = useMemo<SquadPlayer[]>(
    () => [...lineup.players, ...lineup.substitutes].map((roster) => ({
      roster,
      dossier: dossiers.find((candidate) => candidate.name === roster.name),
    })),
    [dossiers, lineup.players, lineup.substitutes],
  );
  const selectedIndex = squad.findIndex((player) => player.roster.name === selectedName);
  const [index, setIndex] = useState(selectedIndex < 0 ? 0 : selectedIndex);
  const [range, setRange] = useState("FULL");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, [selectedName]);

  const player = squad[index];
  const move = (direction: -1 | 1) => {
    if (!squad.length) return;
    setIndex((current) => (current + direction + squad.length) % squad.length);
    setRange("FULL");
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      }}
      style={{ "--player-accent": accent } as CSSProperties}
    >
      <div className={styles.edge}>
        <div className={styles.sheet}>
          <header className={styles.sheetHeader}>
            <strong id={titleId}>MATCH DOSSIER</strong>
            <i aria-hidden="true" />
            <button type="button" onClick={onClose} aria-label="Close match dossier">
              <CloseIcon size={16} />
            </button>
          </header>

          {player ? <PlayerCard key={player.roster.name} player={player} team={team} range={range} onRange={setRange} /> : null}

          <footer className={styles.pager}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous player"><ChevronLeftIcon size={16} /></button>
            <span>BROWSE NEXT PLAYER // {index + 1} OF {squad.length}</span>
            <button type="button" onClick={() => move(1)} aria-label="Next player"><ChevronRightIcon size={16} /></button>
          </footer>
        </div>
      </div>
    </dialog>
  );
}

function PlayerCard({
  player,
  team,
  range,
  onRange,
}: {
  player: SquadPlayer;
  team: SportTeam;
  range: string;
  onRange: (range: string) => void;
}) {
  const { roster, dossier } = player;
  const heatmap = (dossier?.heatmap ?? []).filter((point) => (
    range === "FULL" || point.period === (range === "1ST" ? 1 : 2)
  ));
  const appearances = statNumber(dossier, "APPEARANCES");
  const played = appearances > 0;
  const touches = dossier?.heatmap?.length ?? 0;
  const finalThird = (dossier?.heatmap ?? []).filter((point) => point.x >= 66).length;
  const territory = touches
    ? Math.round((dossier?.heatmap ?? []).reduce((sum, point) => sum + point.x, 0) / touches)
    : null;

  return (
    <div className={styles.content}>
      <section className={styles.identity}>
        <span className={styles.numberGhost} aria-hidden="true">{roster.number}</span>
        <TeamBadge team={team} size={66} />
        <span className={styles.identityCopy}>
          <h2>{roster.name.toUpperCase()}</h2>
          <p>{roster.role.toUpperCase()} {"//"} #{roster.number} {"//"} {team.shortName.toUpperCase()}</p>
          <span className={styles.statuses}>
            <b>{lineupRole(roster)}</b>
            <b data-muted>{played ? "MATCH DATA" : "UNUSED"}</b>
          </span>
        </span>
      </section>

      {dossier ? (
        <>
          <section className={styles.metrics} aria-label="Player impact">
            <Metric label="TOUCHES" value={String(touches)} accent={touches > 0} />
            <Metric label="xG" value="—" />
            <Metric label="FINAL 3RD" value={touches ? String(finalThird) : "—"} />
            <Metric label="TERRITORY" value={territory == null ? "—" : `${territory}%`} />
          </section>

          <section className={styles.block}>
            <h3>HEAT MAP</h3>
            <FilterChips options={ranges} selected={range} onSelect={onRange} label="Heat map period" className={styles.rangeTabs} />
            <div className={styles.heatPanel}>
              <div className={styles.heatPitch}>
                <PitchMarkings />
                {heatmap.map((point, pointIndex) => (
                  <i
                    key={`${point.x}-${point.y}-${point.period}-${pointIndex}`}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  />
                ))}
                {!heatmap.length ? <span className={styles.noTouches}>{played ? "NO TRACKED TOUCHES" : "UNUSED SUBSTITUTE"}</span> : null}
              </div>
              <small>TRACKED TOUCH DENSITY // ATTACKING →</small>
            </div>
          </section>

          <section className={styles.block}>
            <h3>MATCH OUTPUT</h3>
            <div className={styles.stats}>
              {dossier.stats.map((stat) => (
                <span key={stat.label} data-scored={Number(stat.value) > 0 || undefined}>
                  <small>{stat.label}</small>
                  <b>{stat.value}</b>
                </span>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.noSheet}>
          <h3>NO MATCH SHEET</h3>
          <p>This fixture has no per-player data from the feed yet.</p>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <span><small>{label}</small><b data-accent={accent || undefined}>{value}</b></span>;
}

function statNumber(player: MatchPlayerDossier | undefined, label: string): number {
  return Number(player?.stats.find((stat) => stat.label === label)?.value ?? 0) || 0;
}

function lineupRole(player: MatchDetailPlayer): string {
  return player.formationPlace ? "STARTER" : "SUBSTITUTE";
}

function PitchMarkings() {
  return (
    <svg viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true">
      <rect x=".5" y=".5" width="104" height="67" />
      <path d="M52.5 .5V67.5M.5 13.84H17V54.16H.5M104.5 13.84H88V54.16H104.5" />
      <circle cx="52.5" cy="34" r="9.15" />
    </svg>
  );
}
