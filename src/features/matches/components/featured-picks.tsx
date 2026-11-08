"use client";
import { matchDiscovery } from "@statoz/design-system/games/tokens/match-discovery.generated";
import { useRef, useState } from "react";
import { type PickMarket } from "@/domain/predictions";
import styles from "./editorial-discovery.module.css";
import { useEffect } from 'react';
import { EditorialMarketCard } from './editorial-market-card';
export function FeaturedPicks({ markets, onPick }: {
    markets: PickMarket[];
    onPick: (market: PickMarket, id: string) => void;
}) {
    const rail = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);
    const marketIds = markets.map(m => m.id).join(',');
    useEffect(() => { const node = rail.current; if (!node)
        return; let saved = 0; try {
        saved = Number(sessionStorage.getItem('statoz.next.games-web.featured-pick-slide')) || 0;
    }
    catch { } const frame = requestAnimationFrame(() => { const index = Math.max(0, Math.min(saved, markets.length - 1)); const child = node.children[index] as HTMLElement | undefined; if (child) {
        node.scrollLeft = child.offsetLeft - node.offsetLeft - matchDiscovery.layout.page;
    } }); return () => cancelAnimationFrame(frame); }, [marketIds, markets.length]);
    if (!markets.length)
        return null;
    function move(index: number) { const next = Math.max(0, Math.min(markets.length - 1, index)); rail.current?.children[next]?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "start" }); setActive(next); try {
        sessionStorage.setItem("statoz.next.games-web.featured-pick-slide", String(next));
    }
    catch { } }
    return <section className={styles.featured} aria-label="Featured winner Picks">
    <div className={styles.carousel} ref={rail} tabIndex={0} onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        move(active + (e.key === "ArrowRight" ? 1 : -1));
    } }} onScroll={e => { const node = e.currentTarget; const width = (node.children[0] as HTMLElement)?.offsetWidth + 16; const index = Math.round(node.scrollLeft / width); if (index !== active) {
        setActive(index);
        try {
            sessionStorage.setItem("statoz.next.games-web.featured-pick-slide", String(index));
        }
        catch { }
    } }}>
      {markets.map(market => <div className={styles.slide} key={market.id}><EditorialMarketCard market={market} onPick={onPick} featured/></div>)}
    </div><div className={styles.indicators}>{markets.map((market, i) => <button type="button" key={market.id} aria-label={`Show featured Pick ${i + 1}`} aria-current={i === active ? "true" : undefined} onClick={() => move(i)}/>)}</div>
  </section>;
}
