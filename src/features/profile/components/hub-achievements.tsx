"use client";

import { useState, type CSSProperties } from "react";
import { FilterChips, Glyph, LockIcon, Progress, rarityVar, TrophyIcon } from "@statoz/design-system/games";
import { achievementCurrent, achievementProgress, isUnlocked } from "../data/achievements";
import { hubAchievements, showcaseSlots } from "../data/player-hub";
import { saveHubPreferences } from "../state/profile-identity";
import type { Achievement, AchievementStats, ProfileIdentity } from "../types";
import { HubSurface } from "./hub-surface";
import styles from "./player-hub.module.css";

export function HubBadge({ achievement, locked = false }: { achievement?: Achievement; locked?: boolean }) {
  return <span className={styles.badge} style={{ "--badge-color": achievement && !locked ? rarityVar(achievement.tier) : "var(--ds-color-border-strong)" } as CSSProperties} aria-hidden="true">
    {achievement && !locked ? <Glyph name={achievement.icon} size={28} /> : locked ? <LockIcon size={24} /> : <TrophyIcon size={26} />}
  </span>;
}

export function HubAchievements({ identity, stats }: { identity: ProfileIdentity; stats: AchievementStats }) {
  const [filter, setFilter] = useState("All"), [status, setStatus] = useState("");
  const catalog = hubAchievements(stats), earned = catalog.filter(achievement => isUnlocked(achievement, stats));
  const pinned = showcaseSlots(stats, identity.pinnedAchievementIds);
  const shown = catalog.filter(achievement => filter === "All" || (filter === "Earned" ? isUnlocked(achievement, stats) : !isUnlocked(achievement, stats)));

  function setSlot(index: number, id: string) {
    if (index < 0 || index > 2) return;
    const slots = Array.from({ length: 3 }, (_, slot) => pinned[slot]?.id ?? "");
    const previous = slots.indexOf(id);
    if (id && previous >= 0) slots[previous] = slots[index];
    slots[index] = id;
    setStatus(saveHubPreferences({ pinnedAchievementIds: slots }) ? "Showcase saved" : "Could not save. Try again on this device.");
  }

  return <section aria-labelledby="achievements-heading">
    <div className={styles.toolbar}><div><h2 id="achievements-heading" className={styles.panelTitle}>Your achievements</h2><p className={styles.muted}>{earned.length} earned · Your best moments, your choice.</p></div>
      <FilterChips options={["All", "Earned", "In progress"]} selected={filter} onSelect={setFilter} label="Achievement filters" /></div>
    <HubSurface accent="violet"><div className={styles.panel}><h3 className={styles.panelTitle}>Arrange your showcase</h3><p className={styles.muted}>Choose up to three earned trophies. Selecting an occupied trophy swaps its position.</p>
      <div className={styles.showcaseControls}>{Array.from({ length: 3 }, (_, index) => <label className={styles.slotControl} key={index}><span>Showcase slot {index + 1}</span><select className={styles.select} aria-label={`Showcase slot ${index + 1}`} value={pinned[index]?.id ?? ""} onChange={event => setSlot(index, event.target.value)}><option value="">Empty slot</option>{earned.map(achievement => <option key={achievement.id} value={achievement.id}>{achievement.title}</option>)}</select></label>)}</div>
    </div></HubSurface>
    <p role="status" className={styles.status}>{status}</p>
    <div className={styles.achievementGrid} style={{ marginTop: "var(--ds-space-24)" }}>
      {shown.map(achievement => {
        const unlocked = isUnlocked(achievement, stats), fraction = achievementProgress(achievement, stats);
        return <HubSurface key={achievement.id} accent={unlocked ? "gold" : "violet"}><article className={`${styles.panel} ${styles.achievementCard}`} id={`achievement-${achievement.id}`} data-earned={unlocked}>
          <HubBadge achievement={achievement} locked={!unlocked} />
          <div><h3>{achievement.title}</h3><p className={styles.muted}>{achievement.description}</p><p className={styles.rowDate}>{unlocked ? `Earned · ${achievement.tier}` : `${achievementCurrent(achievement, stats)} / ${achievement.target}`}</p></div>
          <div className={styles.achievementFooter}>
            {!unlocked ? <Progress value={fraction} label={`${achievement.title}: ${achievementCurrent(achievement, stats)} of ${achievement.target}`} accent="var(--ds-color-accent-gold)" /> : <>
              <label>Pin to<select className={styles.select} aria-label={`Pin ${achievement.title}`} value={pinned.findIndex(item => item?.id === achievement.id) < 0 ? "" : String(pinned.findIndex(item => item?.id === achievement.id))} onChange={event => event.target.value === "" ? setSlot(pinned.findIndex(item => item?.id === achievement.id), "") : setSlot(Number(event.target.value), achievement.id)}><option value="">Not pinned</option><option value="0">Slot 1</option><option value="1">Slot 2</option><option value="2">Slot 3</option></select></label>
              <button type="button" className={styles.textButton} disabled={identity.equippedTitleAchievementId === achievement.id} onClick={() => setStatus(saveHubPreferences({ equippedTitleAchievementId: achievement.id }) ? `Title equipped: ${achievement.title}` : "Could not save your title.")}>{identity.equippedTitleAchievementId === achievement.id ? "Title equipped" : "Use as title"}</button>
            </>}
          </div>
        </article></HubSurface>;
      })}
    </div>
    {shown.length === 0 ? <div className={styles.empty}><TrophyIcon size={32} /><h3>{filter === "Earned" ? "Your first trophy is waiting" : "Every achievement earned"}</h3><p className={styles.muted}>{filter === "Earned" ? "Complete a game to start working toward your first achievement." : "You have completed every available game achievement."}</p></div> : null}
  </section>;
}
