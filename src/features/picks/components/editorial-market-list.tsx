"use client";
import type {PickMarket,PickPosition} from '@/domain/predictions';
import {EditorialEventsPanel} from '@/features/matches/components/editorial-discovery';
import {PickMarketCard} from './pick-market-card';
import styles from './picks.module.css';
export function EditorialMarketList({markets,positionsFor,onPick,onClaim}:{markets:PickMarket[];positionsFor:(id:string)=>PickPosition[];onPick:(market:PickMarket,id:string)=>void;onClaim:(position:PickPosition)=>void}){
  const used=new Set<string>();const panels=markets.flatMap(market=>{
    if(used.has(market.id))return [];
    if(market.type==='event'&&market.sport!=='tennis'){
      const rows=markets.filter(m=>m.type==='event'&&m.sport===market.sport&&!used.has(m.id)).slice(0,3);rows.forEach(m=>used.add(m.id));return [<EditorialEventsPanel key={market.id} markets={rows}/>];
    }
    used.add(market.id);return [<PickMarketCard key={market.id} market={market} positions={positionsFor(market.id)} onPick={onPick} onClaim={onClaim}/>];
  });return <div className={styles.grid}>{panels}</div>;
}
