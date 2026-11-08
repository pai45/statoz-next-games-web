"use client";
import { matchById, quizzesForMatch } from '@/mocks/matches';
import { pickMarkets, pickMarketById } from '@/mocks/picks';
import { selectFeaturedPicks } from '../editorial-cycle';
import { FeaturedPicks } from './featured-picks';
import { usePredictions, predictionFor } from '@/features/predictions/state/prediction-store';
import { useProfileIdentity } from '@/features/profile/state/profile-identity';
import { usePickTrading } from '@/features/picks/components/pick-trading';
import { EditorialMarketCard, EditorialMatchCard, EditorialEventsPanel, EditorialMission } from './editorial-discovery';
import { useEditorialSingleColumn } from "../editorial-layout";
import styles from './editorial-discovery.module.css';
import tokens from '@statoz/design-system/games/tokens/match-discovery.module.css';
import { SportQuiz } from './editorial-sport-quiz';
import { useEditorialCycles } from './use-editorial-cycles';
import { PersonalPredictions } from './personal-predictions';
// Frozen ID order per mounted feed; actual prediction values stay subscribed.
export function TrendingFeed() {
    const predictions = usePredictions(), profile = useProfileIdentity(), trading = usePickTrading();
    const singleColumn = useEditorialSingleColumn();
    const cycles = useEditorialCycles(profile, predictions);
    const featured = selectFeaturedPicks(pickMarkets);
    return <div className={`${styles.feed} ${tokens.editorialTokens}`} data-testid="match-trending-feed"><FeaturedPicks markets={featured} onPick={trading.openTrade}/><PersonalPredictions showPlayed={false}/>{cycles.map(cycle => <section className={styles.cycle} key={cycle.sport} aria-label={cycle.sport + ' discovery'} data-sport={cycle.sport}>
    {cycle.matches.length > 0 && <div className={styles.matches}>{cycle.matches.map(id => { const match = matchById(id); return match ? <EditorialMatchCard key={id} match={match}/> : null; })}</div>}
    <EditorialEventsPanel markets={cycle.events.flatMap(id => { const m = pickMarketById(id); return m ? [m] : []; })}/>
    <div className={styles.grid} data-single={singleColumn || undefined}><SportQuiz sport={cycle.sport}/>{cycle.compact && matchById(cycle.compact) && <EditorialMatchCard match={matchById(cycle.compact)!} compact/>}{cycle.missions.flatMap(id => { const match = matchById(id); if (!match)
            return []; const quiz = quizzesForMatch(match).find(q => (q.entryFee ?? 0) === 0); return quiz && !predictionFor(predictions, id, quiz.id) ? [<EditorialMission key={id + '::' + quiz.id} match={match} quiz={quiz} prediction={predictionFor(predictions, id, quiz.id)}/>] : []; })}</div>
    {cycle.future && pickMarketById(cycle.future) && <EditorialMarketCard market={pickMarketById(cycle.future)!} featured onPick={trading.openTrade}/>}
  </section>)}{trading.overlays}</div>;
}
