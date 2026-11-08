"use client";

import { useRouter } from "next/navigation";

import { ChevronLeftIcon, HudPanel } from "@statoz/design-system/games";
import type { MatchPlayerDossier, SportMatch } from "@/domain/matches";

import { TeamBadge } from "./team-badge";
import styles from "./match-player-dossier.module.css";

export function MatchPlayerDossierScreen({ match, player }: { match: SportMatch; player: MatchPlayerDossier }) {
  const router = useRouter();
  const team = player.teamId === match.home.id ? match.home : match.away;
  return <div className={styles.page} style={{ "--player-accent": team.color } as React.CSSProperties}>
    <header><button type="button" onClick={() => router.back()} aria-label="Go back"><ChevronLeftIcon size={20} /></button><strong>MATCH DOSSIER</strong></header>
    <main>
      <HudPanel accent={team.color} className={styles.hero}><TeamBadge team={team} size={76} /><span><small>{team.name}</small><h1>{player.name}</h1><p>{[player.number ? `#${player.number}` : null, player.role].filter(Boolean).join(" // ")}</p></span></HudPanel>
      <section><h2>MATCH OUTPUT</h2><div className={styles.stats}>{player.stats.map((stat) => <article key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong></article>)}</div></section>
      {player.inningsTape ? <section><h2>INNINGS TAPE</h2><div className={styles.tape}>{player.inningsTape.length ? player.inningsTape.map((event) => <article key={`${event.marker}-${event.text}`} data-kind={event.kind}><b>{event.marker}</b><span>{event.text}</span></article>) : <p>No published deliveries involve this player.</p>}</div></section> : <section><h2>TOUCH HEATMAP</h2><div className={styles.pitch}>{player.heatmap?.map((point, index) => <i key={`${point.x}-${point.y}-${index}`} style={{ left: `${point.x}%`, top: `${point.y}%`, opacity: Math.min(1, .28 + point.intensity * .18) }} />)}</div></section>}
    </main>
  </div>;
}
