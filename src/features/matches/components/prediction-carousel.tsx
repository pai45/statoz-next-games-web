"use client";
import {useEffect,useRef,type ReactNode} from 'react';
import {useEditorialSingleColumn} from '../editorial-layout';
import styles from './editorial-discovery.module.css';

/** Shared manual rail for reveal entries and previously played predictions. */
export function PredictionCarousel({id,label,children}:{id:string;label:string;children:ReactNode[]}){
  const rail=useRef<HTMLDivElement>(null);
  const single=useEditorialSingleColumn();
  const storageKey='statoz.next.games-web.personal-carousel.'+id;
  useEffect(()=>{
    const node=rail.current;if(!node)return;
    let offset=0;try{offset=Number(sessionStorage.getItem(storageKey))||0;}catch{}
    const frame=requestAnimationFrame(()=>{node.scrollLeft=offset;});
    return()=>cancelAnimationFrame(frame);
  },[storageKey]);
  return <div ref={rail} className={styles.personalCarousel} data-single={single||undefined}
    data-testid={id+'-carousel'} role="region" aria-label={label} tabIndex={0}
    onScroll={e=>{try{sessionStorage.setItem(storageKey,String(e.currentTarget.scrollLeft));}catch{}}}
    onFocusCapture={e=>{if(e.target!==e.currentTarget)e.target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}}
    onKeyDown={e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const node=e.currentTarget;
      const step=(node.firstElementChild?.getBoundingClientRect().width??0)+parseFloat(getComputedStyle(node).columnGap);
      const left=e.key==='Home'?0:e.key==='End'?node.scrollWidth:node.scrollLeft+(e.key==='ArrowRight'?step:-step);
      node.scrollTo({left,behavior:'instant'});
    }}>
    {children.map((child,index)=><div key={index} className={styles.personalSlide}>{child}</div>)}
  </div>;
}
