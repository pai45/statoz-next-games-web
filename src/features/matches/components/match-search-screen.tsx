"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import {
  AccentPanel,
  ArrowLeftIcon,
  BoltIcon,
  NoDataState,
  RadarIcon,
  SearchField,
  SearchIcon,
  SignalOffIcon,
  TrophyIcon,
} from "@statoz/design-system/games";
import type { SportMatch, SportTeam } from "@/domain/matches";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { matchLeagues, sportFixtures } from "@/mocks/matches";

import { SportFixtureCard } from "./sport-fixture-card";
import { SportIcon } from "./sport-icon";

type SearchEntityKind = "league" | "team";

type MatchSearchGroup = {
  key: string;
  kind: SearchEntityKind;
  title: string;
  code: string;
  sport: Sport;
  accent: string;
  fixtures: SportMatch[];
  rank: number;
};

/** Match and league finder ported from the Flutter card-game app. */
export function MatchSearchScreen() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const groups = useMemo(
    () => normalizedQuery.length < 2 ? [] : groupsForQuery(normalizedQuery),
    [normalizedQuery],
  );
  const fixtureCount = groups.reduce(
    (total, group) => total + group.fixtures.length,
    0,
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-line-muted bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center px-2 sm:px-4">
          <Link
            href="/"
            aria-label="Back to matches"
            title="Back to matches"
            className="grid size-11 shrink-0 place-items-center text-cyan transition-colors hover:brightness-125"
          >
            <ArrowLeftIcon size={22} />
          </Link>
          <span aria-hidden className="mr-2 font-display text-xl font-black text-cyan">/</span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-black leading-none tracking-wide">
              MATCH SEARCH
            </h1>
            <p className="mt-1 truncate font-display text-2xs font-extrabold tracking-ultra text-muted">
              {"// TEAM + LEAGUE FINDER"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <div className="shrink-0 px-4 pb-2 pt-4 sm:px-6">
          <SearchField
            ref={inputRef}
            label="Search teams and leagues"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            autoFocus
            enterKeyHint="search"
            placeholder="Search team or league"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
          {normalizedQuery.length === 0 ? (
            <NoDataState
              icon={RadarIcon}
              spark={SearchIcon}
              title="Scan the fixture network"
              message="Search every loaded sport by team name, team code, league name, or league code."
              className="min-h-56"
            />
          ) : normalizedQuery.length < 2 ? (
            <NoDataState
              icon={SearchIcon}
              spark={BoltIcon}
              title="Add one more signal"
              message="Enter at least two characters to start searching the fixture network."
              className="min-h-56"
            />
          ) : groups.length === 0 ? (
            <NoDataState
              icon={SignalOffIcon}
              spark={RadarIcon}
              title="No match found"
              message={`No available fixture uses “${query.trim()}”. Try a team code or league abbreviation.`}
              className="min-h-56"
            />
          ) : (
            <div aria-live="polite">
              <div className="mb-4 flex min-h-8 items-center gap-2.5">
                <h2 className="shrink-0 font-display text-2xs font-black tracking-max text-cyan">
                  SIGNALS FOUND
                </h2>
                <span aria-hidden className="h-px flex-1 bg-line-muted" />
                <span className="ds-tabular shrink-0 font-display text-2xs font-extrabold tracking-wide text-muted">
                  {groups.length} ENTITIES {"//"} {fixtureCount} FIXTURES
                </span>
              </div>

              <div className="flex flex-col gap-5">
                {groups.map((group) => (
                  <section key={`${group.kind}-${group.key}`}>
                    <SearchGroupHeader group={group} />
                    <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {group.fixtures.map((match) => (
                        <li key={match.id}>
                          <SportFixtureCard match={match} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SearchGroupHeader({ group }: { group: MatchSearchGroup }) {
  const sport = sportModuleFor(group.sport);
  return (
    <AccentPanel accent={group.accent}>
      <div className="flex min-h-15 items-center gap-2.5 px-3 py-2.5">
        <span className="shrink-0" style={{ color: group.accent }}>
          {group.kind === "league" ? (
            <TrophyIcon size={21} />
          ) : (
            <SportIcon sport={group.sport} size={21} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xs font-extrabold tracking-wide text-muted">
            {group.kind.toUpperCase()} {"//"} {sport.label.toUpperCase()}
          </p>
          <h3 className="mt-1 truncate font-display text-md font-black tracking-label">
            {group.title.toUpperCase()}
          </h3>
        </div>
        <span
          className="ds-tabular shrink-0 font-display text-2xs font-black tracking-label"
          style={{ color: group.accent }}
        >
          {group.code.toUpperCase()} {"//"} {group.fixtures.length}
        </span>
      </div>
    </AccentPanel>
  );
}

function groupsForQuery(query: string): MatchSearchGroup[] {
  const groups: MatchSearchGroup[] = [];

  for (const league of matchLeagues) {
    const fixtures = sportFixtures
      .filter((fixture) => fixture.leagueId === league.id)
      .sort(compareKickoff);
    if (fixtures.length === 0) continue;
    const rank = queryRank(query, [league.name, league.shortCode]);
    if (rank === null) continue;
    groups.push({
      key: league.id,
      kind: "league",
      title: league.name,
      code: league.shortCode,
      sport: league.sport,
      accent: league.accent,
      fixtures,
      rank,
    });
  }

  const teams = new Map<string, { team: SportTeam; sport: Sport }>();
  for (const fixture of sportFixtures) {
    teams.set(`${fixture.sport}:${fixture.home.id}`, {
      team: fixture.home,
      sport: fixture.sport,
    });
    teams.set(`${fixture.sport}:${fixture.away.id}`, {
      team: fixture.away,
      sport: fixture.sport,
    });
  }

  for (const [key, candidate] of teams) {
    const rank = queryRank(query, [candidate.team.name, candidate.team.shortName]);
    if (rank === null) continue;
    groups.push({
      key,
      kind: "team",
      title: candidate.team.name,
      code: candidate.team.shortName,
      sport: candidate.sport,
      accent: candidate.team.color,
      fixtures: sportFixtures
        .filter(
          (fixture) => fixture.sport === candidate.sport
            && (fixture.home.id === candidate.team.id || fixture.away.id === candidate.team.id),
        )
        .sort(compareKickoff),
      rank,
    });
  }

  return groups.sort((left, right) => {
    const kindOrder = (left.kind === "league" ? 0 : 1) - (right.kind === "league" ? 0 : 1);
    return kindOrder || left.rank - right.rank || left.title.localeCompare(right.title);
  });
}

function queryRank(query: string, values: string[]): number | null {
  let best = 3;
  for (const raw of values) {
    const value = raw.trim().toLocaleLowerCase();
    if (value === query) best = 0;
    else if (value.startsWith(query)) best = Math.min(best, 1);
    else if (value.includes(query)) best = Math.min(best, 2);
  }
  return best === 3 ? null : best;
}

function compareKickoff(left: SportMatch, right: SportMatch): number {
  return left.kickoff.localeCompare(right.kickoff);
}
