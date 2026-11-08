"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { CheckIcon, CopyIcon, EditIcon, Progress } from "@statoz/design-system/games";
import { avatarOptionById, BannerVisual, profileBannerOptionById } from "@/features/onboarding";
import { allPlayerCards, portraitForCard } from "@/features/packs";
import { BannerArt, shopBanners, shopFrames } from "@/features/shop";
import { useEconomy } from "@/features/economy";
import { publicAsset } from "@/shared/config";
import type { ProfileIdentity } from "../types";
import type { PlayerProgress } from "../state/player-progress";
import { earnedProfileTitle } from "../data/player-hub";
import styles from "./player-hub.module.css";

export function HubBanner({ bannerId }: { bannerId: string }) {
  const economy = useEconomy();
  const purchased = shopBanners.find(banner => banner.id === bannerId && economy.owned.bannerIds.includes(bannerId));
  return purchased?.assetSrc ? <Image src={publicAsset(purchased.assetSrc)} alt="" fill loading="eager" sizes="100vw" className={styles.bannerImage} onError={event => { event.currentTarget.style.visibility = "hidden"; }} /> : purchased ? <BannerArt banner={purchased} /> : <BannerVisual banner={profileBannerOptionById(bannerId)} />;
}
export function HubAvatar({ avatarId, frameId }: { avatarId: string; frameId: string | null }) {
  const economy = useEconomy();
  const card = allPlayerCards.find(card => card.id === avatarId && economy.owned.avatarIds.includes(card.id));
  const source = (card && portraitForCard(card)) || avatarOptionById(avatarId).src;
  const frame = shopFrames.find(frame => frame.id === frameId && economy.owned.frameIds.includes(frame.id));
  return <div className={styles.avatar} style={frame ? { "--hub-frame": frame.color } as CSSProperties : undefined}><div className={styles.avatarFace}><Image key={source} src={publicAsset(source)} alt="Player avatar" fill loading="eager" sizes="128px" className={styles.avatarImage} onError={event => { event.currentTarget.style.visibility = "hidden"; }} /></div><span className={styles.avatarCorner} aria-hidden="true" /></div>;
}
export function HubHero({ identity, progress, frameId, preview = false }: { identity: ProfileIdentity; progress: PlayerProgress; frameId: string | null; preview?: boolean }) {
  const [copyStatus, setCopyStatus] = useState("");
  async function copyTag() {
    if (!identity.playerTag) return;
    try { await navigator.clipboard.writeText(identity.playerTag); setCopyStatus("Copied"); }
    catch { setCopyStatus("Select the player tag to copy it"); }
  }
  const name = identity.displayName || "PLAYER ONE";
  return <section className={`${styles.hero} ${preview ? styles.heroPreview : ""}`} aria-label={preview ? "Player card preview" : "Player identity"}>
    <div className={styles.heroArt} aria-hidden="true"><HubBanner bannerId={identity.bannerId} /></div><div className={styles.heroScrim} />
    <div className={styles.heroScanlines} aria-hidden="true" />
    <div className={styles.heroSystemBar} aria-hidden="true"><span>IDENTITY // 01</span><span>STATOZ PLAYER ARCHIVE <i /></span></div>
    <div className={styles.heroContent}>
      <HubAvatar avatarId={identity.avatarId} frameId={frameId} />
      <div className={styles.identity}><p className={styles.eyebrow}>CROSS-GAME PLAYER IDENTITY</p>
        {preview ? <h3 className={styles.playerName} title={name}>{name}</h3> : <h1 className={styles.playerName} title={name}>{name}</h1>}
        <p className={styles.playerTitle}>{earnedProfileTitle(progress.achievements, identity.equippedTitleAchievementId)}</p>
        <div className={styles.tagRow}><span className={styles.playerTag}>{identity.playerTag ?? "Player tag loading…"}</span>
          {!preview && identity.playerTag ? <button className={styles.iconButton} type="button" aria-label="Copy player tag" onClick={copyTag}>{copyStatus === "Copied" ? <CheckIcon size={16} /> : <CopyIcon size={16} />}</button> : null}
          <span role="status" className={styles.copyStatus}>{copyStatus}</span></div>
      </div>
      <div className={styles.levelArea}><Link href="/profile/xp" className={styles.levelLink} aria-label={`Account level ${progress.level}. View XP progress`}>
        <span className={styles.levelCrest}><small>LEVEL</small><strong>{progress.level}</strong></span>
        <span className={styles.levelText}><strong>{progress.totalXp.toLocaleString()} XP</strong><span>{progress.band.toNextLevel.toLocaleString()} to level {progress.level + 1}</span></span></Link>
        <div className={styles.xpProgress}><Progress value={progress.band.fraction} label={`${progress.band.intoLevel} of ${progress.band.levelSpan} XP into level ${progress.level}`} accent="var(--ds-color-accent-cyan)" height={7} /></div>
        {!preview ? <Link className={styles.secondaryButton} href="/profile?tab=locker"><EditIcon size={16} /> Customize</Link> : null}
      </div>
    </div>
    <div className={styles.heroBottomRail} aria-hidden="true"><span>PLAY. PROGRESS. REPEAT.</span><span className={styles.hazardStrip} /><span>GAMES // PROFILE</span></div>
  </section>;
}
