"use client";
import Link from "next/link";
import { useEditorialEntrance } from "../editorial-entrance";
import { matchDiscovery } from "@statoz/design-system/games/tokens/match-discovery.generated";
import { colors, liftForContrast } from "@statoz/design-system/games";
import { editorialPercentageInk } from "../editorial-accent";
import { marketCanBuy, type PickMarket, type PickPosition } from "@/domain/predictions";
import { matchDemoAnchor } from "@/mocks/matches";
import { useDemoNow } from "@/shared/hooks";
import styles from "./editorial-discovery.module.css";
import { deadlineLabel } from "../editorial-format";
import { DiscoveryChrome as EditorialChrome, DiscoveryOutcomeRow } from '@statoz/design-system/games/components/data-display/discovery-card';
import { EditorialStatus, editorialPlateClass, editorialSportStyle } from './editorial-presentation';
export function EditorialMarketCard({ market, positions = [], onPick, onClaim, featured = false }: {
    market: PickMarket;
    featured?: boolean;
    positions?: PickPosition[];
    onPick?: (market: PickMarket, id: string) => void;
    onClaim?: (position: PickPosition) => void;
}) {
    const now = useDemoNow(matchDemoAnchor) ?? Date.parse(matchDemoAnchor);
    const entrance = useEditorialEntrance('pick:' + market.id);
    const claimable = positions.find(p => p.status === "settleable");
    return <article ref={entrance} className={editorialPlateClass} style={editorialSportStyle(market.sport)} data-kind={market.type === "future" ? "future" : "pick"}><EditorialChrome /><EditorialStatus sport={market.sport} label={`${market.leagueLabel} · ${market.type === "future" ? "Future" : "Match Pick"}`} status={market.status ?? (market.resolved ? "settled" : undefined)} timing={deadlineLabel(market.closesAt, market.status, now) || (market.status === "live" ? market.liveLabel : undefined)}/>
    <Link href={`/picks/${market.id}`} className={styles.title}>{market.question}</Link>
    {!featured && market.contextTitle && <p className={styles.answer}>{market.contextTitle}</p>}
    <div className={styles.outcomes}>{(featured ? market.outcomes.slice(0, matchDiscovery.appearance.featuredOutcomes) : market.outcomes).map(outcome => { const fill = liftForContrast(outcome.color ?? colors.accent.cyan, { against: colors.fixture.base }); return <DiscoveryOutcomeRow key={outcome.id} disabled={!marketCanBuy(market) || !onPick} onClick={() => onPick?.(market, outcome.id)} label={outcome.label} percentage={outcome.probabilityPercent} fill={fill} ink={editorialPercentageInk(fill)}/>; })}</div>
    <div className={styles.marketFooter}><span>{market.volumeOz.toLocaleString("en-GB")} Oz volume{positions.length > 0 ? ` · ${positions.length} held` : ""}</span>{claimable && onClaim ? <button type="button" onClick={() => onClaim(claimable)}>Claim result ↗</button> : <Link href={`/picks/${market.id}`}>{market.type === "future" ? "View Future" : "View Pick"} ↗</Link>}</div>
  </article>;
}
