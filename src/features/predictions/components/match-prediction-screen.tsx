"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

import { ArrowLeftIcon } from "@statoz/design-system/games";
import type { SportMatch, SportTeam } from "@/domain/matches";
import type { PredictionQuiz } from "@/domain/predictions";
import { AuthBoundary } from "@/features/auth";
import { formatKickoffTime } from "@/shared/utils";

import { PredictionQuizScreen } from "./match-predict-tab";
import styles from "./predictions.module.css";

/** The route-owned quiz shell: no platform chrome, one fixture, one decision. */
export function MatchPredictionScreen({
  match,
  quiz,
}: {
  match: SportMatch;
  quiz: PredictionQuiz;
}) {
  const router = useRouter();
  const returnTo = `/matches/${match.id}/predict/${quiz.id}`;

  return (
    <AuthBoundary
      intent="predict"
      message="Log in to answer match missions and save your prediction history."
      returnTo={returnTo}
      fullScreen
    >
      <div className={styles.fullscreenViewport} data-prediction-fullscreen>
        <header className={styles.quizTopBar}>
          <div className={styles.quizTopBarInner}>
            <Link
              href={`/matches/${match.id}`}
              aria-label="Back to matches"
              className={styles.quizBack}
            >
              <ArrowLeftIcon size={23} aria-hidden="true" />
              <span>Back to Matches</span>
            </Link>
          </div>
        </header>

        <FixtureHeader match={match} />

        <div className={styles.fullscreenQuizBody}>
          <PredictionQuizScreen
            match={match}
            quiz={quiz}
            showAllQuizzes={false}
            onBackToHub={() => router.push(`/matches/${match.id}`)}
            onOpenPicks={() => router.push(`/matches/${match.id}#picks`)}
          />
        </div>
      </div>
    </AuthBoundary>
  );
}

function FixtureHeader({ match }: { match: SportMatch }) {
  if (match.sport === "motorsport") {
    return (
      <section className={styles.quizFixture} aria-label="Race summary">
        <div className={styles.quizFixtureBracket}>
          <span className={styles.quizFixtureStatus} style={{ color: statusColor(match) }}>
            {statusText(match)}
          </span>
          <strong className={styles.quizRaceName}>{match.home.name.toUpperCase()}</strong>
          <SplitBar match={match} />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.quizFixture} aria-label="Match summary">
      <div className={styles.quizFixtureBracket}>
        <time
          dateTime={match.status === "scheduled" ? match.kickoff : undefined}
          className={styles.quizFixtureStatus}
          style={{ color: statusColor(match) }}
        >
          {statusText(match)}
        </time>
        <div className={styles.quizFixtureTeams}>
          <QuizTeamBadge team={match.home} />
          <strong className={styles.quizTeamName}>{match.home.name}</strong>
          <span className={styles.quizFixtureVs}>-</span>
          <strong className={`${styles.quizTeamName} ${styles.quizTeamNameAway}`}>
            {match.away.name}
          </strong>
          <QuizTeamBadge team={match.away} away />
        </div>
        <SplitBar match={match} />
      </div>
    </section>
  );
}

function QuizTeamBadge({ team, away = false }: { team: SportTeam; away?: boolean }) {
  return (
    <span
      className={`${styles.quizTeamBadge} ${away ? styles.quizTeamBadgeAway : ""}`}
      style={{
        "--quiz-team-primary": team.color,
        "--quiz-team-secondary": team.secondaryColor ?? team.color,
        "--quiz-team-ink": team.badgeTextColor ?? "var(--ds-color-text-default)",
      } as CSSProperties}
      role="img"
      aria-label={team.name}
    >
      <span aria-hidden>{team.shortName}</span>
    </span>
  );
}

function SplitBar({ match }: { match: SportMatch }) {
  return (
    <span className={styles.quizFixtureSplit} aria-hidden="true">
      <i style={{ background: match.home.color }} />
      <i style={{ background: match.away.color }} />
    </span>
  );
}

function statusColor(match: SportMatch): string {
  if (match.status === "live") return "var(--ds-color-danger)";
  if (match.status === "finished") return "var(--ds-color-text-muted)";
  return "var(--ds-color-accent-gold)";
}

function statusText(match: SportMatch): string {
  if (match.status === "live") {
    return match.liveMinute == null ? "LIVE" : `LIVE ${match.liveMinute}'`;
  }
  if (match.status === "finished") return "FINISHED";
  return formatKickoffTime(match.kickoff);
}
