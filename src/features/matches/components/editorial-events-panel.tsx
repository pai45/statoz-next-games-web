"use client";
import Link from "next/link";
import { useEditorialEntrance } from "../editorial-entrance";
import { colors, liftForContrast } from "@statoz/design-system/games";
import { latestDeltaFor, leadingOutcome, type PickMarket } from "@/domain/predictions";
import { matchDemoAnchor } from "@/mocks/matches";
import { useDemoNow } from "@/shared/hooks";
import styles from "./editorial-discovery.module.css";
import { deadlineLabel } from "../editorial-format";
import { DiscoveryChrome as EditorialChrome } from '@statoz/design-system/games/components/data-display/discovery-card';
import { EditorialStatus, editorialPlateClass, editorialSportStyle } from './editorial-presentation';
export function EditorialEventsPanel({ markets }: {
    markets: PickMarket[];
}) {
    const now = useDemoNow(matchDemoAnchor) ?? Date.parse(matchDemoAnchor);
    const entrance = useEditorialEntrance('events:' + markets.map(m => m.id).join(','));
    if (!markets.length)
        return null;
    return <section ref={entrance} className={`${editorialPlateClass} ${styles.events}`} style={editorialSportStyle(markets[0].sport)} aria-label={`${markets[0].sport} Events`} data-kind="events">
    <EditorialChrome /><h3 className={styles.sectionTitle}>Events</h3>
    {markets.map(market => {
            const leader = leadingOutcome(market), delta = latestDeltaFor(market, leader.id);
            return <Link key={market.id} href={`/picks/${market.id}`} className={styles.eventRow}>
      <EditorialStatus sport={market.sport} label={market.leagueLabel} status={market.status ?? (market.resolved ? "settled" : undefined)} timing={deadlineLabel(market.closesAt, market.status, now) || (market.status === "live" ? market.liveLabel : undefined)}/>
      <div className={styles.eventBody}><div><p className={styles.question}>{market.question}</p><p className={styles.answer}>{leader.label}</p></div><div className={styles.probability}><span className={styles.eventPrice} style={{ color: liftForContrast(leader.color ?? colors.accent.cyan, { against: colors.fixture.strip, ratio: 4.5 }) }}>{leader.probabilityPercent}%</span>{delta !== undefined && <span className={styles.delta} data-direction={delta < 0 ? "down" : delta > 0 ? "up" : "flat"}>{delta > 0 ? "+" : ""}{delta} pp</span>}</div></div>
    </Link>;
        })}
  </section>;
}
