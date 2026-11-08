"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, Glyph, MoreIcon } from "@statoz/design-system/games";
import { FuseCta } from "@statoz/design-system/games/components/actions/fuse-cta/fuse-cta";
import { FilterChips } from "@statoz/design-system/games/components/navigation/filter-chips";
import { DailyDrop } from "@/features/packs";
import { levelProgress } from "@/domain/progression";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";
import { useIsHydrated, type FinalOverStats } from "../state/final-over-progress";
import { finalOverTiers, tierBlurbs, tierLabels, tierRange, type FinalOverTier } from "../tuning";
import { FinalOverLobbyHero } from "./final-over-lobby-hero";
import styles from "./final-over-lobby.module.css";

export type FinalOverLobbyProps = {
  stats: FinalOverStats;
  tier: FinalOverTier;
  squadReady: boolean;
  onBack: () => void;
  onTierChange: (tier: FinalOverTier) => void;
  onPlay: () => void;
};

/** Presentation only: readiness, persistence and match creation stay with FinalOver. */
export function FinalOverLobby({ stats, tier, squadReady, onBack, onTierChange, onPlay }: FinalOverLobbyProps) {
  const [panel, setPanel] = useState<"difficulty" | "utilities" | null>(null);
  const hydrated = useIsHydrated();
  const band = levelProgress(stats.xp);
  const close = () => setPanel(null);
  return (
    <section className={styles.lobby} aria-labelledby="final-over-title">
      <header className={styles.header}>
        <Button variant="ghost" accent="var(--ds-color-text-subtle)" onClick={onBack} label="Back to cricket games"><Glyph name="chevron_left" size={24} /></Button>
        <Button variant="ghost" accent="var(--ds-color-text-subtle)" onClick={() => setPanel("utilities")} label="Final Over menu"><MoreIcon size={22} /></Button>
      </header>
      <div className={styles.scroll}>
        <div className={styles.hero}><FinalOverLobbyHero paused={panel !== null} /></div>
        <div className={styles.intro}>
          <div className={styles.identityShell}><div className={styles.identity}>
            <h1 id="final-over-title">FINAL OVER</h1>
          </div></div>
        </div>
      </div>
      <footer className={styles.dock}>
        <FuseCta label={squadReady ? "TAKE GUARD" : hydrated ? "BUILD SQUAD" : "LOADING SQUAD"} disabled={!hydrated} pending={!hydrated} onClick={squadReady ? onPlay : undefined} href={hydrated && !squadReady ? "/decks/cricket?returnTo=/play/final-over" : undefined} />
      </footer>
      <LobbyPanel open={panel === "difficulty"} title="Choose your chase" onClose={close}>
        <FilterChips label="Chase tier" options={finalOverTiers.map(t => tierLabels[t])} selected={tierLabels[tier]} onSelect={label => { const value = finalOverTiers.find(t => tierLabels[t] === label); if (value) onTierChange(value); }} />
        <div className={styles.tierDetail} aria-live="polite"><strong>{tierBlurbs[tier]}</strong><p>Target {tierRange(tier)} · Three overs</p></div>
        <Button fullWidth onClick={close}>READY</Button>
      </LobbyPanel>
      <LobbyPanel open={panel === "utilities"} title="Final Over" onClose={close}>
        <Button variant="surface" onClick={() => setPanel("difficulty")} label={`Chase difficulty: ${tierLabels[tier]}. Change difficulty`}>DIFFICULTY / {tierLabels[tier]}</Button>
        <div className={styles.level} aria-label={`Level ${band.level}, ${band.intoLevel} of ${band.levelSpan} XP`}><span>LEVEL {band.level}</span><span>{band.intoLevel}/{band.levelSpan} XP</span><progress value={band.fraction} max={1} aria-label="Level progress" /></div>
        <nav aria-label="Final Over tools" className={styles.tools}>
          <Link href="/decks/cricket?returnTo=/play/final-over">Cricket Deck <Glyph name="chevron_right" size={18} /></Link>
          <Link href="/profile/history/games">Match History <Glyph name="chevron_right" size={18} /></Link>
        <GameLeaderboardCta gameId="final-over" />
        </nav>
        {panel === "utilities" && <DailyDrop sport="cricket" />}
      </LobbyPanel>
    </section>
  );
}

function LobbyPanel({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.panelShell}><div className={styles.panel}>
      <div className={styles.panelHeading}><h2 id={titleId}>{title}</h2><Button variant="ghost" onClick={onClose} label="Close panel"><Glyph name="close" size={22} /></Button></div>
      {children}
    </div></div>
  </dialog>;
}

export { lobbyEnterMs } from "../constants";
