"use client";
import {useEffect, useMemo, useSyncExternalStore} from 'react';
import {sportFixtures, matchById} from '@/mocks/matches';
import {pickMarkets, pickMarketById} from '@/mocks/picks';
import type {usePredictions} from '@/features/predictions/state/prediction-store';
import type {useProfileIdentity} from '@/features/profile/state/profile-identity';
import {selectEditorialCycles} from '../editorial-cycle';

const cacheKey='statoz.next.games-web.match-editorial-cycles.v2';
const subscribe=()=>()=>{};
type Cycles=ReturnType<typeof selectEditorialCycles>;

function restoredCycles():Cycles|undefined {
 try {
  const saved=JSON.parse(sessionStorage.getItem(cacheKey)??'null');
  if(!Array.isArray(saved)||!saved.length)return;
  const valid=saved.every(c=>
   c && ['football','cricket','basketball','motorsport'].includes(c.sport) &&
   Array.isArray(c.matches) && c.matches.every((id:string)=>matchById(id)?.sport===c.sport) &&
   (c.compact==null||matchById(c.compact)?.sport===c.sport) &&
   Array.isArray(c.missions) && c.missions.every((id:string)=>matchById(id)?.sport===c.sport) &&
   Array.isArray(c.events) && c.events.every((id:string)=>pickMarketById(id)?.sport===c.sport) &&
   (c.future==null||(pickMarketById(c.future)?.sport===c.sport&&pickMarketById(c.future)?.type==='future'))
  );
  if(valid)return saved as Cycles;
 } catch { /* Unavailable storage or obsolete data falls back to current selection. */ }
}

/** Freeze IDs on hydration/return; callers still subscribe to live record values. */
export function useEditorialCycles(profile:ReturnType<typeof useProfileIdentity>,predictions:ReturnType<typeof usePredictions>) {
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 const cycles=useMemo(()=>{
  const saved=hydrated?restoredCycles():undefined;
  if(saved)return saved;
  const followed=new Set(profile.followedLeagueIds);
  const editable=new Set(Object.values(predictions.predictions).filter(p=>p.status==='open').map(p=>p.matchId));
  return selectEditorialCycles(sportFixtures,pickMarkets,m=>
   Number(profile.favoriteTeams[m.leagueId]===m.home.id||profile.favoriteTeams[m.leagueId]===m.away.id)*4+
   Number(followed.has(m.leagueId))*2+Number(editable.has(m.id))
  );
  // Personalization changes update content, but must not reshuffle a mounted feed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[hydrated]);
 useEffect(()=>{
  if(hydrated)try{sessionStorage.setItem(cacheKey,JSON.stringify(cycles));}catch{}
 },[cycles,hydrated]);
 return cycles;
}
