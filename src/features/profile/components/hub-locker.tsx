"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { CheckIcon, FilterChips } from "@statoz/design-system/games";
import { equipCosmetic, useEconomy } from "@/features/economy";
import { allGamesInFeedOrder, gameEntryFor, type GameId } from "@/features/games";
import { avatarOptionById, avatarOptions, profileBannerOptions } from "@/features/onboarding";
import { allPlayerCards, portraitForCard } from "@/features/packs";
import { shopBanners, shopFrames } from "@/features/shop";
import { publicAsset } from "@/shared/config";
import { hubAchievements } from "../data/player-hub";
import { isUnlocked } from "../data/achievements";
import { saveHubPreferences } from "../state/profile-identity";
import type { PlayerProgress } from "../state/player-progress";
import type { ProfileIdentity } from "../types";
import { GameArtwork } from "./hub-career";
import { HubBanner, HubHero } from "./hub-hero";
import { HubSurface } from "./hub-surface";
import styles from "./player-hub.module.css";

export function HubLocker({ identity, progress }: { identity: ProfileIdentity; progress: PlayerProgress }) {
  const economy = useEconomy();
  const [draft, setDraft] = useState(() => ({ ...identity, avatarId: identity.avatarId || avatarOptionById("").id, bannerId: identity.bannerId || profileBannerOptions[0].id }));
  const [frameId, setFrameId] = useState(economy.equipped.frameId);
  const [category, setCategory] = useState("Avatars"), [status, setStatus] = useState("");
  const ownedCards = allPlayerCards.filter(card => economy.owned.avatarIds.includes(card.id) && portraitForCard(card));
  const avatars = [...avatarOptions, ...ownedCards.map(card => ({ id: card.id, label: card.shortName, src: portraitForCard(card)! }))];
  const bannerIds = [...new Set([...profileBannerOptions.map(banner => banner.id), ...shopBanners.filter(banner => economy.owned.bannerIds.includes(banner.id)).map(banner => banner.id)])];
  const earned = hubAchievements(progress.achievements).filter(achievement => isUnlocked(achievement, progress.achievements));
  const change = (changes: Partial<ProfileIdentity>) => { setDraft(current => ({ ...current, ...changes })); setStatus(""); };
  const dirty = draft.avatarId !== (identity.avatarId || avatarOptionById("").id) || draft.bannerId !== (identity.bannerId || profileBannerOptions[0].id) || frameId !== economy.equipped.frameId || (draft.equippedTitleAchievementId ?? null) !== (identity.equippedTitleAchievementId ?? null) || (draft.featuredGameId ?? null) !== (identity.featuredGameId ?? null);
  function cancel() {
    setDraft({ ...identity, avatarId: identity.avatarId || avatarOptionById("").id, bannerId: identity.bannerId || profileBannerOptions[0].id });
    setFrameId(economy.equipped.frameId); setStatus("Changes cancelled");
  }
  function save() {
    if (!saveHubPreferences({ avatarId: draft.avatarId, bannerId: draft.bannerId, featuredGameId: draft.featuredGameId ?? null, equippedTitleAchievementId: draft.equippedTitleAchievementId ?? null })) { setStatus("Could not save. Your previous player card is unchanged."); return; }
    equipCosmetic("avatar", draft.avatarId); equipCosmetic("banner", draft.bannerId); equipCosmetic("frame", frameId);
    setStatus("Saved. Your player card is ready.");
  }
  function option(id: string, label: string, selected: boolean, onClick: () => void, art?: React.ReactNode) {
    return <button key={id} type="button" aria-label={label} aria-pressed={selected} className={styles.option} onClick={onClick}>{art ? <span className={styles.optionArt}>{art}</span> : null}<span>{label}{selected ? " · Selected" : ""}</span></button>;
  }
  return <section aria-labelledby="locker-heading"><div className={styles.toolbar}><div><h2 className={styles.panelTitle} id="locker-heading">Make it yours</h2><p className={styles.muted}>Preview your look. Save when it feels right.</p></div><Link className={styles.secondaryButton} href="/shop">Visit Shop</Link></div>
    <div className={styles.locker}>
      <aside className={styles.lockerPreview}><HubHero identity={draft} progress={progress} frameId={frameId} preview /></aside>
      <div className={styles.lockerEditor}><HubSurface accent="pink"><div className={styles.panel}>
        <FilterChips options={["Avatars", "Frames", "Banners", "Titles", "Featured game"]} selected={category} onSelect={setCategory} label="Locker categories" />
        <div className={styles.optionGrid} role="group" aria-label={`Owned ${category.toLowerCase()}`}>
          {category === "Avatars" ? avatars.map(avatar => option(avatar.id, avatar.label, draft.avatarId === avatar.id, () => change({ avatarId: avatar.id }), <Image src={publicAsset(avatar.src)} alt="" fill sizes="120px" />)) : null}
          {category === "Frames" ? <>{option("none", "No frame", frameId === null, () => { setFrameId(null); setStatus(""); }, <span className={styles.frameSample} />)}{shopFrames.filter(frame => economy.owned.frameIds.includes(frame.id)).map(frame => option(frame.id, frame.label, frameId === frame.id, () => { setFrameId(frame.id); setStatus(""); }, <span className={styles.frameSample} style={{ "--frame-color": frame.color } as CSSProperties} />))}</> : null}
          {category === "Banners" ? bannerIds.map(id => option(id, shopBanners.find(banner => banner.id === id)?.label ?? profileBannerOptions.find(banner => banner.id === id)?.label ?? id, draft.bannerId === id, () => change({ bannerId: id }), <HubBanner bannerId={id} />)) : null}
          {category === "Titles" ? <>{option("default", "StatOz Player", !draft.equippedTitleAchievementId, () => change({ equippedTitleAchievementId: null }))}{earned.map(achievement => option(achievement.id, achievement.title, draft.equippedTitleAchievementId === achievement.id, () => change({ equippedTitleAchievementId: achievement.id })))}</> : null}
          {category === "Featured game" ? <>{option("recent", "Most recently played", !draft.featuredGameId, () => change({ featuredGameId: null }))}{allGamesInFeedOrder().filter(gameId => Boolean(gameEntryFor(gameId))).map(gameId => option(gameId, gameEntryFor(gameId)?.title ?? gameId, draft.featuredGameId === gameId, () => change({ featuredGameId: gameId }), <GameArtwork gameId={gameId as GameId} feature />))}</> : null}
        </div>
        {category === "Titles" && earned.length === 0 ? <p className={styles.muted}>Earn a game achievement to unlock its title.</p> : null}
        {category === "Frames" && economy.owned.frameIds.length === 0 ? <p className={styles.muted}>Your owned frames will appear here. Find more in the Shop.</p> : null}
      </div></HubSurface></div>
    </div>
    <div className={styles.saveBar}><p role="status" className={styles.status}>{status.startsWith("Saved") ? <CheckIcon size={18} aria-hidden="true" /> : null} {status || (dirty ? "Unsaved changes" : "Your equipped look")}</p><div className={styles.saveActions}><button type="button" className={styles.secondaryButton} onClick={cancel} disabled={!dirty}>Cancel</button><button type="button" className={styles.primaryButton} onClick={save} disabled={!dirty}>Save changes</button></div></div>
  </section>;
}
