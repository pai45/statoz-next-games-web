"use client";
import {matchById,quizForMatch} from '@/mocks/matches';
import {usePredictions} from '@/features/predictions/state/prediction-store';
import {PredictionCarousel} from './prediction-carousel';
import {selectPersonalPredictions} from '../editorial-personal-predictions';
import {EditorialRevealCard} from './editorial-reveal-card';
import {EditorialMission} from './editorial-mission';
import styles from './editorial-discovery.module.css';

export function PersonalPredictions({showPlayed=true}:{showPlayed?:boolean}){
  const snapshot=usePredictions();
  const entries=selectPersonalPredictions(Object.values(snapshot.predictions),matchById,quizForMatch);
  const reveals=entries.filter(e=>e.reveal),played=showPlayed?entries.filter(e=>!e.reveal):[];
  if(!reveals.length&&!played.length)return null;
  return <div className={styles.cycle} data-testid="personal-predictions">
    {reveals.length>0&&<section className={styles.personalHistory} aria-label="Reveal results"><h2 className={styles.sectionTitle}>Reveal results</h2><PredictionCarousel id="personal-reveal" label="Reveal results cards">{reveals.map(e=><EditorialRevealCard key={e.key} match={e.match} quiz={e.quiz}/>)}</PredictionCarousel></section>}
    {played.length>0&&<section className={styles.personalHistory} aria-label="Your predictions"><h2 className={styles.sectionTitle}>Your predictions</h2><PredictionCarousel id="personal-played" label="Your prediction cards">{played.map(e=><EditorialMission key={e.key} match={e.match} quiz={e.quiz} prediction={e.prediction} history/>)}</PredictionCarousel></section>}
  </div>;
}
