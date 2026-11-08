"use client";
import Link from "next/link";
import { useEditorialEntrance } from "../editorial-entrance";
import { personalPredictionStatus } from '../editorial-personal-predictions';
import type { SportMatch } from "@/domain/matches";
import { type PredictionQuiz, type UserPrediction, quizMaxReward } from "@/domain/predictions";
import { TeamBadge } from "./team-badge";
import styles from "./editorial-discovery.module.css";
import { DiscoveryChrome as EditorialChrome, DiscoveryVersus, DiscoveryQuestionProgress } from '@statoz/design-system/games/components/data-display/discovery-card';
import { EditorialStatus, editorialPlateClass, editorialSportStyle } from './editorial-presentation';
export function EditorialMission({ match, quiz, prediction, history = false }: {
    match: SportMatch;
    quiz: PredictionQuiz;
    prediction?: UserPrediction;
    history?: boolean;
}) {
    const entrance = useEditorialEntrance('mission:' + match.id + ':' + quiz.id);
    const answered = quiz.questions.filter(q => prediction?.answers[q.id] != null).length;
    return <Link ref={entrance} href={`/matches/${match.id}/predict/${quiz.id}`} className={`${editorialPlateClass} ${styles.mission}`} style={editorialSportStyle(match.sport)} data-kind="mission" aria-label={(history ? quiz.title + ": " : "Predict ") + match.home.name + " versus " + match.away.name}><EditorialChrome />
    <EditorialStatus sport={match.sport} label={history ? quiz.title : "XP prediction"} status={personalPredictionStatus(match, prediction)}/>{match.sport === "motorsport" ? <h3 className={styles.title}>{match.home.name}</h3> : <div className={styles.missionTeams}><TeamBadge team={match.home} size={32}/><DiscoveryVersus /><TeamBadge team={match.away} size={32}/></div>}
    <div className={styles.progressBlock}><p className={styles.answer}>{prediction?.status === "settled" ? (prediction.correctCount ?? 0) + " / " + quiz.questions.length + " correct" : answered + " / " + quiz.questions.length + " answered"}</p><DiscoveryQuestionProgress answered={answered} total={quiz.questions.length}/></div><p className={styles.reward}>{prediction?.status === "settled" ? "+" + prediction.rewardEarned + " XP" : "Up to " + quizMaxReward(quiz) + " XP"}</p>
  </Link>;
}
