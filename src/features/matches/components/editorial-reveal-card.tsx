"use client";
import Link from 'next/link';
import type {SportMatch} from '@/domain/matches';
import type {PredictionQuiz} from '@/domain/predictions';
import {useEditorialEntrance} from '../editorial-entrance';
import styles from './editorial-discovery.module.css';

/** One thin reward entry; result settlement stays in the existing quiz route. */
export function EditorialRevealCard({match,quiz,onOpen}:{match:SportMatch;quiz:PredictionQuiz;onOpen?:()=>void}) {
  const entrance=useEditorialEntrance('reveal:'+match.id+':'+quiz.id);
  const identity=match.sport==='motorsport'?match.home.name:match.home.name+' vs '+match.away.name;
  const content=<><span>{identity}</span><span aria-hidden>›</span></>;
  const label='Reveal '+quiz.title+' for '+identity;
  return onOpen?<button ref={entrance} type="button" className={styles.reveal} onClick={onOpen} aria-label={label} data-kind="reveal">{content}</button>:
    <Link ref={entrance} href={'/matches/'+match.id+'/predict/'+quiz.id} className={styles.reveal} aria-label={label} data-kind="reveal">{content}</Link>;
}
