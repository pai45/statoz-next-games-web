"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRightIcon, FilterChips, GameIcon, Progress, SettingsIcon, TrophyIcon } from "@statoz/design-system/games";
import { loginHref, useAuthSession } from "@/features/auth";
import { useEconomy } from "@/features/economy";
import { allGamesInFeedOrder, gameEntryFor, useProfileGameSummaries, type GameId, type ProfileGameSummary } from "@/features/games";
import { achievementGame, nextHubAchievement, showcaseSlots } from "../data/player-hub";
import { achievementCurrent, achievementProgress } from "../data/achievements";
import { loadOrCreatePlayerTag, useIsHydrated, useProfileIdentity } from "../state/profile-identity";
import { usePlayerProgress } from "../state/player-progress";
import { HubHero } from "./hub-hero";
import { HubAchievements, HubBadge } from "./hub-achievements";
import { HubCareer, GameArtwork, GameMetrics, launchedLabel } from "./hub-career";
import { HubLocker } from "./hub-locker";
import { HubSurface } from "./hub-surface";
import { SettingsSheet } from "./profile-actions";
import styles from "./player-hub.module.css";

const tabs = ["Overview", "Career", "Achievements", "Locker"];

function HubPanel({ title, children, action, trophy = false, channel, accent = "cyan" }: { title: string; children: ReactNode; action?: ReactNode; trophy?: boolean; channel: string; accent?: "cyan" | "violet" | "gold" }) {
  return <HubSurface accent={accent}><section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}><span className={styles.panelIndex} aria-hidden="true">{channel}</span>{trophy ? <TrophyIcon size={20} /> : null}{title}</h2>{action}</div>{children}</section></HubSurface>;
}

function FeaturedGame({ gameId, summary }: { gameId?: GameId; summary?: ProfileGameSummary }) {
  if (!gameId) return <HubSurface accent="violet"><div className={styles.empty}><GameIcon size={36} /><p className={styles.eyebrow}>01 // YOUR NEXT CHAPTER</p><h2>Find your next favorite</h2><p className={styles.muted}>Your games, your records, your next great moment.</p><Link className={styles.primaryButton} href="/?view=all">Explore games</Link></div></HubSurface>;
  const entry = gameEntryFor(gameId);
  if (!entry) return null;
  return <HubSurface><section className={styles.feature} aria-label="Featured game"><GameArtwork gameId={gameId} feature /><span className={styles.featureReticle} aria-hidden="true" /><div className={styles.featureBody}><p className={styles.eyebrow}>01 // FEATURED GAME</p><h2 className={styles.featureName}>{entry.title}</h2><p className={styles.featureSubtitle}>{entry.subtitle}</p><GameMetrics summary={summary} /><Link className={styles.primaryButton} href={entry.href}><GameIcon size={18} /> Play game <ChevronRightIcon size={18} /></Link></div></section></HubSurface>;
}

export function PlayerHub({ initialTab = "Overview" }: { initialTab?: string }) {
  const router = useRouter(), params = useSearchParams(), session = useAuthSession();
  const identity = useProfileIdentity(), hydrated = useIsHydrated(), progress = usePlayerProgress(), economy = useEconomy(), summaries = useProfileGameSummaries();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { if (hydrated) loadOrCreatePlayerTag(); }, [hydrated, session.email]);
  const tab = tabs.find(tab => tab.toLowerCase() === params.get("tab")) ?? initialTab;
  const catalog = allGamesInFeedOrder();
  const featuredGame = catalog.find(id => id === identity.featuredGameId) ?? summaries.find(summary => summary.lastPlayedAt !== null)?.gameId;
  const pinned = showcaseSlots(progress.achievements, identity.pinnedAchievementIds), milestone = nextHubAchievement(progress.achievements);
  const recent = summaries.filter(summary => summary.lastPlayedAt !== null).slice(0, 3);
  function selectTab(value: string) {
    const query = new URLSearchParams(params.toString());
    query.set("tab", value.toLowerCase());
    router.push(`/profile?${query}`, { scroll: false });
  }
  return <div className={styles.page} data-player-hub>
    <div className={styles.masthead}>
      <div><p className={styles.eyebrow}>STATOZ GAMES / PERSONAL ARCHIVE</p><p className={styles.nexusTitle}>PLAYER<span>{" // "}</span>NEXUS</p></div>
      <div className={styles.archiveStamp}><span className={styles.signalBars} aria-hidden="true"><i /><i /><i /><i /></span><span>YOUR IDENTITY.<br />YOUR LEGACY.</span></div>
    </div>
    {session.status === "guest" ? <div className={styles.guest}><p className={styles.muted}>Playing as a guest · Progress stays in this browser.</p><Link className={styles.textButton} href={loginHref("/profile")}>Save to a local profile <ChevronRightIcon size={16} /></Link></div> : null}
    <HubHero identity={identity} progress={progress} frameId={economy.equipped.frameId} />
    <div className={styles.tabs}><FilterChips options={tabs} selected={tab} onSelect={selectTab} label="Profile sections" /><span className={styles.sectionCode} aria-hidden="true">0{tabs.indexOf(tab) + 1}<span> / {tab.toUpperCase()}</span></span></div>
    <div role="tabpanel" aria-label={tab} tabIndex={0} key={`${session.email ?? "guest"}-${tab}`}>
      {tab === "Overview" ? <div className={styles.overview}>
        <div className={styles.column}><FeaturedGame gameId={featuredGame} summary={summaries.find(summary => summary.gameId === featuredGame)} />
          <HubPanel title="Recently played" channel="02" action={<Link href="/profile?tab=career" className={styles.textButton}>View career <ChevronRightIcon size={16} /></Link>}>
            {recent.length ? <div className={styles.list}>{recent.map((summary, index) => <div className={styles.gameRow} key={summary.gameId}><span className={styles.rowIndex} aria-hidden="true">0{index + 1}</span><GameArtwork gameId={summary.gameId} /><div><h3 className={styles.rowName}>{gameEntryFor(summary.gameId)?.title}</h3><p className={styles.rowDate}>{launchedLabel(summary.lastPlayedAt)}</p></div><Link className={styles.iconButton} href={gameEntryFor(summary.gameId)?.href ?? "/?view=all"} aria-label={`Play ${gameEntryFor(summary.gameId)?.title}`}><ChevronRightIcon size={20} /></Link></div>)}</div> : <p className={styles.muted}>Your recently opened games will appear here. Discover a game to begin.</p>}
          </HubPanel>
        </div>
        <div className={styles.column}><HubPanel title="Trophy showcase" channel="03" accent="violet" trophy>
          <div className={styles.trophies}>{Array.from({ length: 3 }, (_, index) => <Link className={styles.trophy} key={index} href={pinned[index] ? `/profile?tab=achievements#achievement-${pinned[index].id}` : "/profile?tab=achievements"}><HubBadge achievement={pinned[index]} /><span className={styles.trophyName}>{pinned[index]?.title ?? "Your next trophy"}</span><span className={styles.trophySlot}>{pinned[index] ? "Earned" : `Slot ${index + 1}`}</span></Link>)}</div>
          <Link href="/profile?tab=achievements" className={styles.textButton}>Manage showcase <ChevronRightIcon size={16} /></Link>
        </HubPanel>
          <HubPanel title="Next achievement" channel="04" accent="gold" trophy>{milestone ? <><h3 className={styles.milestoneName}>{milestone.title}</h3><p className={styles.muted}>{milestone.description}</p><div className={styles.milestoneProgress}><Progress value={achievementProgress(milestone, progress.achievements)} label={`${milestone.title}: ${achievementCurrent(milestone, progress.achievements)} of ${milestone.target}`} accent="var(--ds-color-accent-gold)" /><p className={styles.rowDate}>{achievementCurrent(milestone, progress.achievements)} / {milestone.target} complete</p></div><Link className={styles.secondaryButton} href={gameEntryFor(achievementGame(milestone.id))?.href ?? "/?view=all"}>Play game <ChevronRightIcon size={16} /></Link></> : <p className={styles.muted}>Every available achievement earned. Your showcase tells the story.</p>}</HubPanel>
        </div>
      </div> : null}
      {tab === "Career" ? <HubCareer summaries={summaries} /> : null}
      {tab === "Achievements" ? <HubAchievements identity={identity} stats={progress.achievements} /> : null}
      {tab === "Locker" ? <HubLocker identity={identity} progress={progress} /> : null}
    </div>
    <footer className={styles.footer}><p className={styles.muted}>Your games. Your story.</p><div className={styles.footerLinks}><button type="button" onClick={() => setSettingsOpen(true)}><SettingsIcon size={18} /> Settings</button><Link href="/how-to-play">Help</Link><Link href="/profile/talk-to-statoz">Talk to StatOz</Link></div></footer>
    {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
  </div>;
}
