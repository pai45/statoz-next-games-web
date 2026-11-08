"use client";
import Link from 'next/link';
import { useEditorialEntrance } from '../editorial-entrance';
import { gameRegistry } from '@/mocks/games';
import type { GameId } from '@/features/games/types';
import { GameScene } from '@/features/games/components/game-scenes';
import { useRequireAuth, useAuthSession } from '@/features/auth';
import { editorialPlateClass, EditorialStatus, EditorialChrome, editorialSportStyle } from './editorial-discovery';
import styles from './editorial-discovery.module.css';
export function SportQuiz({ sport }: {
    sport: string;
}) {
    const entrance = useEditorialEntrance('quiz:' + sport);
    const game = (sport + '-quiz') as GameId, entry = gameRegistry[game], session = useAuthSession(), requireAuth = useRequireAuth();
    if (!entry)
        return null;
    const content = <><EditorialChrome /><EditorialStatus label={sport} sport={sport}/><div className={styles.quizArt}><GameScene game={game}/></div><h3 className={styles.title}>{entry.title}</h3><div className={styles.action}>Play quiz <span aria-hidden>↗</span></div></>;
    return session.status === 'authenticated' ? <Link ref={entrance} className={editorialPlateClass} style={editorialSportStyle(sport)} href={entry.href} data-kind="quiz">{content}</Link> : <button ref={entrance} type="button" className={editorialPlateClass} style={editorialSportStyle(sport)} data-kind="quiz" onClick={() => requireAuth({ intent: 'play', message: 'Log in to play ' + entry.title + '.', returnTo: entry.href })}>{content}</button>;
}
