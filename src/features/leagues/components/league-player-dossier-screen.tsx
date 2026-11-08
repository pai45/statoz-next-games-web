"use client";

import Image from "next/image";

import { HudPanel } from "@statoz/design-system/games";
import type { LeaguePlayerProfile } from "@/domain/leagues";
import { TeamBadge } from "@/features/matches";

import { DetailTopBar, SectionHeading } from "./league-hub-screen";
import styles from "./league-player-dossier.module.css";

export function LeaguePlayerDossierScreen({ profile }: { profile: LeaguePlayerProfile }) {
  const groups = profile.stats.reduce((result, stat) => {
    const existing = result.get(stat.group) ?? [];
    existing.push(stat);
    result.set(stat.group, existing);
    return result;
  }, new Map<string, LeaguePlayerProfile["stats"]>());
  return (
    <div className={styles.page}>
      <DetailTopBar title="SEASON DOSSIER" fallback={`/leagues/${profile.leagueId}`} />
      <main className={styles.content}>
        <HudPanel accent={profile.team.color} className={styles.hero}>
          {profile.image ? <Image src={profile.image} alt="" width={112} height={112} unoptimized className={styles.portrait} /> : <TeamBadge team={profile.team} size={92} />}
          <div><p>{profile.team.name}</p><h1>{profile.name}</h1><span>{[profile.number ? `#${profile.number}` : null, profile.role, profile.nationality, profile.age ? `AGE ${profile.age}` : null].filter(Boolean).join(" // ")}</span></div>
        </HudPanel>
        {[...groups.entries()].map(([group, stats]) => <section key={group}><SectionHeading label={group} /><div className={styles.grid}>{stats.map((stat) => <article key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></article>)}</div></section>)}
        {!profile.stats.length ? <p className={styles.empty}>This snapshot identifies the competitor but does not publish a season stat split.</p> : null}
      </main>
    </div>
  );
}
