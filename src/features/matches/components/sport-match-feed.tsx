"use client";

import Link from "next/link";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useMemo, useRef, useState } from "react";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EventBusyIcon,
} from "@statoz/design-system/games";
import type { SportMatch } from "@/domain/matches";
import type { Sport } from "@/domain/sports";
import { useProfileIdentity } from "@/features/profile";
import { followableLeagues } from "@/mocks/onboarding";

import {
  fixturesForSport,
  leagueById,
  matchDemoAnchor,
} from "@/mocks/matches";
import type { MatchLeague } from "../types";
import { SportFixtureCard } from "./sport-fixture-card";
import styles from "./sport-match-feed.module.css";

const DAY_MS = 86_400_000;
const PREVIEW_COUNT = 3;

export function SportMatchFeed({ sport }: { sport: Sport }) {
  const identity = useProfileIdentity();
  const weekMode = sport === "motorsport";
  const fixtures = useMemo(() => fixturesForSport(sport), [sport]);
  const periods = useMemo(
    () => weekMode ? availableWeeks(fixtures) : availableDays(fixtures),
    [fixtures, weekMode],
  );
  const [selectedPeriod, setSelectedPeriod] = useState(() => initialPeriod(fixtures, weekMode));
  const [direction, setDirection] = useState<"left" | "right">("left");
  const favoriteClubs = followableLeagues.filter((league) => league.sport === sport && identity.favoriteTeams[league.id]).flatMap((league) => league.teams.filter((team) => team.id === identity.favoriteTeams[league.id]).map((team) => ({ ...team, leagueId: league.id })));
  const [selectedClubId, setSelectedClubId] = useState(() => favoriteClubs[0]?.id ?? "");
  const selectedClub = favoriteClubs.find((club) => club.id === selectedClubId) ?? favoriteClubs[0];
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const currentIndex = Math.max(0, periods.indexOf(selectedPeriod));
  const selectedStart = fromDateKey(selectedPeriod);
  const selectedEnd = weekMode ? addDays(selectedStart, 6) : selectedStart;
  const selectedCount = fixtures.filter((match) => {
    const date = fromDateKey(dateKey(match.kickoff));
    return date >= selectedStart && date <= selectedEnd;
  }).length;
  const periodFixtures = fixtures.filter((match) => {
    const date = fromDateKey(dateKey(match.kickoff));
    return weekMode ? date >= selectedStart && date <= selectedEnd : dateKey(match.kickoff) === selectedPeriod;
  });
  const pinned = selectedClub ? periodFixtures.filter((match) => fixtureHasClub(match, selectedClub.name, selectedClub.shortName)).sort(pinPriority)[0] : undefined;
  const visibleFixtures = fixtures
    .filter((match) => {
      const date = fromDateKey(dateKey(match.kickoff));
      if (weekMode) return date >= selectedStart && date <= selectedEnd;
      return date >= selectedStart;
    })
    .filter((match) => match.id !== pinned?.id)
    .sort((left, right) => Number(Boolean(selectedClub && fixtureHasClub(right, selectedClub.name, selectedClub.shortName))) - Number(Boolean(selectedClub && fixtureHasClub(left, selectedClub.name, selectedClub.shortName))) || compareKickoff(left, right));
  const groupedDays = groupByDay(visibleFixtures);

  function move(delta: number) {
    const next = periods[currentIndex + delta];
    if (!next) return;
    setDirection(delta < 0 ? "right" : "left");
    setSelectedPeriod(next);
  }

  function selectDate(value: string) {
    if (!value) return;
    const normalized = weekMode ? dateKey(mondayOf(fromDateKey(value))) : value;
    const next = periods.includes(normalized) ? normalized : closestPeriod(periods, normalized);
    setDirection(next < selectedPeriod ? "right" : "left");
    setSelectedPeriod(next);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) < 80 || Math.abs(x) <= Math.abs(y)) return;
    move(x < 0 ? 1 : -1);
  }

  const pickerMin = periods[0];
  const pickerMax = periods.length
    ? dateKey(addDays(fromDateKey(periods.at(-1)!), weekMode ? 6 : 0))
    : selectedPeriod;

  return (
    <div
      className={`${styles.feed} mx-auto w-full max-w-6xl`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      <MatchDayNavigator
        label={weekMode ? weekHeading(selectedStart) : dayHeading(selectedStart)}
        count={selectedCount}
        canPrevious={currentIndex > 0}
        canNext={currentIndex < periods.length - 1}
        onPrevious={() => move(-1)}
        onNext={() => move(1)}
        dateValue={selectedPeriod}
        dateMin={pickerMin}
        dateMax={pickerMax}
        weekMode={weekMode}
        onDateChange={selectDate}
      />

      <div key={`${sport}-${selectedPeriod}`} className="mt-3 flex flex-col gap-5">
        {pinned && selectedClub ? <section className={styles.clubPin}><header><b>YOUR CLUB</b>{pinned.status === "finished" ? null : <small>{pinned.status === "live" ? "LIVE NOW" : "KICKING OFF"}</small>}{favoriteClubs.length > 1 ? <select aria-label="Choose followed club" value={selectedClub.id} onChange={(event) => setSelectedClubId(event.target.value)}>{favoriteClubs.map((club) => <option key={`${club.leagueId}-${club.id}`} value={club.id}>{club.name}</option>)}</select> : null}</header><SportFixtureCard match={pinned} followedTeamName={selectedClub.name} /></section> : null}
        {groupedDays.length === 0 ? (
          <EmptyPeriod date={selectedStart} weekMode={weekMode} />
        ) : (
          groupedDays.map(([day, matches]) => (
            <DayGroup
              key={day}
              day={day}
              matches={matches}
              showDate={weekMode || day !== selectedPeriod}
              direction={direction}
            />
          ))
        )}
      </div>
    </div>
  );
}

function normalizedIdentity(value: string): string { return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ""); }
function fixtureHasClub(match: SportMatch, name: string, shortName: string): boolean {
  const aliases = [name, shortName].map(normalizedIdentity);
  return [match.home, match.away].some((team) => [team.name, team.shortName].map(normalizedIdentity).some((value) => aliases.includes(value) || value.includes(aliases[0]) || aliases[0].includes(value)));
}
function pinPriority(left: SportMatch, right: SportMatch): number {
  const rank = (match: SportMatch) => match.status === "live" ? 0 : match.status === "scheduled" ? 1 : 2;
  const state = rank(left) - rank(right);
  if (state) return state;
  return left.status === "finished" ? right.kickoff.localeCompare(left.kickoff) : left.kickoff.localeCompare(right.kickoff);
}

function MatchDayNavigator({
  label,
  count,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  dateValue,
  dateMin,
  dateMax,
  weekMode,
  onDateChange,
}: {
  label: string;
  count: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  dateValue: string;
  dateMin: string;
  dateMax: string;
  weekMode: boolean;
  onDateChange: (value: string) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-center">
      <NavigatorButton label={weekMode ? "Previous race week" : "Previous match day"} enabled={canPrevious} onClick={onPrevious}>
        <ChevronLeftIcon size={23} />
      </NavigatorButton>
      <div className="flex min-w-0 max-w-68 flex-1 items-center justify-center px-2" aria-live="polite">
        <span className="truncate font-display text-sm font-black tracking-display">{label}</span>
        <span className="ds-tabular ml-1.5 shrink-0 font-display text-sm font-extrabold text-muted">({count})</span>
        <span className={`${styles.datePicker} relative ml-1 grid size-11 shrink-0 place-items-center text-muted`} title={weekMode ? "Pick race week" : "Pick match day"}>
          <CalendarIcon size={18} />
          <input
            type="date"
            aria-label={weekMode ? "Pick race week" : "Pick match day"}
            value={dateValue}
            min={dateMin}
            max={dateMax}
            onChange={(event) => onDateChange(event.target.value)}
            className={styles.dateInput}
          />
        </span>
      </div>
      <NavigatorButton label={weekMode ? "Next race week" : "Next match day"} enabled={canNext} onClick={onNext}>
        <ChevronRightIcon size={23} />
      </NavigatorButton>
    </div>
  );
}

function NavigatorButton({
  label,
  enabled,
  onClick,
  children,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!enabled}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center text-cyan transition-colors disabled:text-muted/35"
    >
      {children}
    </button>
  );
}

function DayGroup({
  day,
  matches,
  showDate,
  direction,
}: {
  day: string;
  matches: SportMatch[];
  showDate: boolean;
  direction: "left" | "right";
}) {
  const leagues = groupByLeague(matches);
  let animationIndex = 0;
  return (
    <section aria-label={formatDayDivider(fromDateKey(day))}>
      {showDate ? (
        <h2 className="mb-4 mt-2 text-center font-display text-sm font-black tracking-display text-cyan">
          {formatDayDivider(fromDateKey(day))}
        </h2>
      ) : null}
      <div className="flex flex-col gap-5">
        {leagues.map(([league, leagueMatches]) => {
          const visible = leagueMatches.slice(0, PREVIEW_COUNT);
          const remaining = leagueMatches.length - PREVIEW_COUNT;
          const headingId = `league-${day}-${league.id}`;
          return (
            <section key={league.id} aria-labelledby={headingId}>
              <Link href={`/leagues/${league.id}`} className="mb-2 flex min-h-11 items-center gap-2.5 no-underline">
                <h3 id={headingId} className="ds-tabular shrink-0 font-display text-lg font-black tracking-mega text-cyan/85">
                  {league.shortCode}
                </h3>
                <span aria-hidden className="h-px flex-1" style={{ background: `color-mix(in srgb, ${league.accent} 25%, transparent)` }} />
                <span className="shrink-0 font-display text-2xs font-extrabold tracking-ultra text-muted">STANDING</span>
                <ChevronRightIcon size={13} className="shrink-0 text-cyan/70" />
              </Link>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((match) => {
                  const index = animationIndex++;
                  return (
                    <li
                      key={match.id}
                      className={styles.cardEnter}
                      style={{
                        "--fixture-index": index,
                        "--fixture-shift": direction === "left" ? "-16px" : "16px",
                      } as CSSProperties}
                    >
                      <SportFixtureCard match={match} />
                    </li>
                  );
                })}
              </ul>
              {remaining > 0 ? (
                <Link
                  href={`/leagues/${league.id}?tab=games`}
                  className="ml-auto mt-2 flex min-h-11 items-center gap-1 font-display text-2xs font-black tracking-ultra"
                  style={{ color: league.accent }}
                  aria-label={`View ${remaining} more ${league.name} games`}
                >
                  VIEW MORE
                  <ChevronRightIcon size={14} />
                </Link>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function EmptyPeriod({ date, weekMode }: { date: Date; weekMode: boolean }) {
  return (
    <div className="grid min-h-90 place-items-center text-center">
      <div className="flex max-w-sm flex-col items-center gap-3 text-muted">
        <EventBusyIcon size={34} className="text-cyan" />
        <p className="font-display text-sm font-black tracking-wide text-foreground">
          {weekMode ? "NO RACES THIS WEEK" : `NO GAMES ON ${formatMonthDay(date)}`}
        </p>
        <p className="text-sm leading-body">
          {weekMode ? "Swipe to another race week to find open predictions." : "Pick another match day to find open predictions."}
        </p>
        <CalendarIcon size={18} className="text-cyan/70" />
      </div>
    </div>
  );
}

function groupByDay(fixtures: SportMatch[]): Array<[string, SportMatch[]]> {
  const groups = new Map<string, SportMatch[]>();
  for (const match of fixtures) {
    const key = dateKey(match.kickoff);
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function groupByLeague(fixtures: SportMatch[]): Array<[MatchLeague, SportMatch[]]> {
  const ids = [...new Set(fixtures.map((match) => match.leagueId))];
  return ids.flatMap((id) => {
    const league = leagueById(id);
    if (!league) return [];
    return [[league, fixtures.filter((match) => match.leagueId === id)] as [MatchLeague, SportMatch[]]];
  });
}

function availableDays(fixtures: SportMatch[]): string[] {
  const anchor = new Date(matchDemoAnchor);
  const days = new Set<string>();
  for (let offset = -7; offset <= 4; offset += 1) days.add(dateKey(addDays(anchor, offset)));
  for (const match of fixtures) days.add(dateKey(match.kickoff));
  return [...days].sort();
}

function availableWeeks(fixtures: SportMatch[]): string[] {
  const anchorMonday = mondayOf(new Date(matchDemoAnchor));
  const weeks = new Set<string>([-7, 0, 7].map((offset) => dateKey(addDays(anchorMonday, offset))));
  for (const match of fixtures) weeks.add(dateKey(mondayOf(new Date(match.kickoff))));
  return [...weeks].sort();
}

function initialPeriod(fixtures: SportMatch[], weekMode: boolean): string {
  const anchor = new Date(matchDemoAnchor);
  const target = weekMode ? mondayOf(anchor) : anchor;
  const periods = weekMode ? availableWeeks(fixtures) : availableDays(fixtures);
  const key = dateKey(target);
  return periods.includes(key) ? key : closestPeriod(periods, key);
}

function closestPeriod(periods: string[], target: string): string {
  if (periods.length === 0) return target;
  const targetTime = fromDateKey(target).getTime();
  return periods.reduce((closest, candidate) => {
    const candidateDistance = Math.abs(fromDateKey(candidate).getTime() - targetTime);
    const closestDistance = Math.abs(fromDateKey(closest).getTime() - targetTime);
    return candidateDistance < closestDistance ? candidate : closest;
  });
}

function mondayOf(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();
  return addDays(result, day === 0 ? -6 : 1 - day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function dateKey(value: string | Date): string {
  return (typeof value === "string" ? new Date(value) : value).toISOString().slice(0, 10);
}

function fromDateKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function compareKickoff(left: SportMatch, right: SportMatch): number {
  return left.kickoff.localeCompare(right.kickoff);
}

function dayHeading(date: Date): string {
  const anchor = fromDateKey(dateKey(matchDemoAnchor));
  const delta = Math.round((date.getTime() - anchor.getTime()) / DAY_MS);
  if (delta === 0) return "TODAY";
  if (delta === 1) return "TOMORROW";
  if (delta === -1) return "YESTERDAY";
  return formatMonthDay(date);
}

function weekHeading(date: Date): string {
  const anchor = mondayOf(new Date(matchDemoAnchor));
  const delta = Math.round((date.getTime() - anchor.getTime()) / (DAY_MS * 7));
  if (delta === 0) return "THIS WEEK";
  if (delta === 1) return "NEXT WEEK";
  if (delta === -1) return "LAST WEEK";
  const end = addDays(date, 6);
  return `${formatMonthDay(date)} — ${formatMonthDay(end)}`;
}

function formatDayDivider(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date).toUpperCase();
}

function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", timeZone: "UTC" }).format(date).toUpperCase();
}
