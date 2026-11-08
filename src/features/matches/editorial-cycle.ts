import type { SportMatch } from '@/domain/matches';
import type { PickMarket } from '@/domain/predictions';
import { matchDiscovery } from '@statoz/design-system/games/tokens/match-discovery.generated';
/** Select IDs once after hydration; store updates refresh content without reshuffling it. */
export function selectEditorialCycles(fixtures:SportMatch[],markets:PickMarket[],priority:(m:SportMatch)=>number=()=>0) {
  const seen=new Set<string>();
  const excluded=new Set(selectFeaturedPicks(markets).map(m=>m.id));
  const priorities=new Map<string,number>();
  for(const fixture of fixtures)if(!priorities.has(fixture.id))priorities.set(fixture.id,priority(fixture));
  return matchDiscovery.sports.flatMap(sport=>{
    const unique=new Set<string>();
    const sorted=fixtures.filter(m=>m.sport===sport&&!seen.has(m.id)&&!unique.has(m.id)&&Boolean(unique.add(m.id))).sort((a,b)=>priorities.get(b.id)!-priorities.get(a.id)!||Number(b.status==='live')-Number(a.status==='live')||a.kickoff.localeCompare(b.kickoff)||a.id.localeCompare(b.id));
    const matches=sorted.slice(0,matchDiscovery.cycle.matches);matches.forEach(m=>seen.add(m.id));
    const compact=sorted.find(m=>!seen.has(m.id));if(compact)seen.add(compact.id);
    const missions=sorted.filter(m=>m.status==='scheduled').slice(0,matchDiscovery.cycle.missions);
    const future=selectSportFuture(sport,markets,excluded);
    const events=markets.filter(m=>m.sport===sport&&m.type==='event'&&m.outcomes.length>0).slice(0,matchDiscovery.cycle.events);
    return matches.length||events.length||missions.length||future ? [{sport,matches:matches.map(m=>m.id),compact:compact?.id,missions:missions.map(m=>m.id),events:events.map(m=>m.id),future:future?.id}] : [];
  });
}
export function selectFeaturedPicks(markets:PickMarket[]) {
  const seen=new Set<string>();
  return matchDiscovery.carouselSlots.flatMap(slot=>{
    const market=markets.find(m=>m.id===slot.preferred&&m.sport===slot.sport&&!seen.has(m.id)&&m.outcomes.length>0) ?? markets.find(m=>m.sport===slot.sport&&m.type==='match'&&!seen.has(m.id)&&m.outcomes.length>0);
    if(!market)return [];seen.add(market.id);return [market];
  });
}

/** One real available Future per sport; championship markets lead, then stable IDs. */
export function selectSportFuture(sport:string,markets:PickMarket[],excluded:ReadonlySet<string>=new Set()) {
 const pattern=new RegExp(matchDiscovery.selection.futurePriorityPattern,"i");
 const rank=(market:PickMarket)=>Number(market.status==="upcoming"||market.status==="live")*4+Number(pattern.test(market.question))*2;
 return markets.filter(m=>m.sport===sport&&m.type==="future"&&m.outcomes.length>0&&!excluded.has(m.id)).sort((a,b)=>rank(b)-rank(a)||a.id.localeCompare(b.id))[0];
}
