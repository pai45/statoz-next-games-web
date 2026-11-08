"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { Glyph, Progress } from "@statoz/design-system/games";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { AuthBoundary } from "@/features/auth";
import { useEconomy } from "@/features/economy";
import { actionCardForId, playerCardForId } from "@/features/packs";

import { activeDeck, applyDeck, createDeck, deleteDeck, isLoadoutComplete, renameDeck, useDecks } from "../state/deck-store";
import type { SportLoadout } from "../types";
import { DeckActionCard, DeckPlayerCard } from "./deck-card";
import styles from "./deck-system.module.css";

const icons = { football: "sports_soccer", cricket: "sports_cricket", basketball: "sports_basketball", tennis: "sports_tennis", motorsport: "sports_motorsports" } as const;

export function DeckLocker() {
  return <AuthBoundary allowGuest intent="manage your deck locker" message="Log in to create, apply, and edit saved squads." returnTo="/decks"><AuthenticatedLocker /></AuthBoundary>;
}

function AuthenticatedLocker() {
  const decks = useDecks();
  const economy = useEconomy();
  const active = activeDeck(decks);
  const ready = sportOrder.filter((sport) => isLoadoutComplete(active.loadouts[sport])).length;
  const firstNeedsWork = sportOrder.find((sport) => economy.starterClaims[sport] && !isLoadoutComplete(active.loadouts[sport]));
  const [sport, setSport] = useState<Sport>(firstNeedsWork ?? "football");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const accent = `var(--ds-color-accent-${sportModuleFor(sport).accent})`;

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? sportOrder.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + sportOrder.length) % sportOrder.length;
    setSport(sportOrder[next]);
    tabs.current[next]?.focus();
  }

  function beginRename(id: string, current: string) { setRenaming(id); setName(current); }
  function commitRename() { if (!renaming || !name.trim()) return; renameDeck(renaming, name); setRenaming(null); }
  function remove(id: string, label: string) { if (decks.slots.length <= 1) return; if (window.confirm(`Delete ${label}? This cannot be undone.`)) deleteDeck(id); }

  return (
    <section className={styles.locker} style={{ "--deck-accent": accent } as CSSProperties}>
      <header className={styles.lockerHeader}><div><p>{`// ${ready}/${sportOrder.length} SPORT CHANNELS READY`}</p><h1>DECK LOCKER</h1></div><span className={styles.deckName}>{active.name.toUpperCase()}</span></header>
      <div className={styles.lockerProgress}><Progress value={ready / sportOrder.length} accent={ready === sportOrder.length ? "var(--ds-color-success)" : accent} label={`${ready} of ${sportOrder.length} active loadouts ready`} /></div>

      <section className={styles.profileRail} aria-label="Named deck profiles">
        <header><h2>SQUAD PROFILES</h2><button type="button" onClick={() => createDeck()}>＋ NEW DECK</button></header>
        <div>{decks.slots.map((slot) => {
          const selected = slot.id === decks.activeDeckId;
          return <article key={slot.id} className={selected ? styles.activeProfile : ""}>
            {renaming === slot.id ? <form onSubmit={(event) => { event.preventDefault(); commitRename(); }}><label htmlFor={`deck-name-${slot.id}`}>Deck name</label><input id={`deck-name-${slot.id}`} value={name} maxLength={24} onChange={(event) => setName(event.target.value)} autoFocus /><button type="submit">SAVE</button></form> : <><button type="button" className={styles.profileApply} onClick={() => applyDeck(slot.id)} aria-pressed={selected}><b>{slot.name}</b><span>{sportOrder.filter((item) => isLoadoutComplete(slot.loadouts[item])).length}/5 READY</span></button><div><button type="button" onClick={() => beginRename(slot.id, slot.name)}>RENAME</button><button type="button" disabled={decks.slots.length <= 1} onClick={() => remove(slot.id, slot.name)}>DELETE</button></div></>}
          </article>;
        })}</div>
      </section>

      <div className={styles.sportTabs} role="tablist" aria-label="Sport loadouts">{sportOrder.map((item, index) => <button key={item} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" aria-selected={sport === item} tabIndex={sport === item ? 0 : -1} onClick={() => setSport(item)} onKeyDown={(event) => moveTab(event, index)} style={{ "--tab-accent": `var(--ds-color-accent-${sportModuleFor(item).accent})` } as CSSProperties}><Glyph name={icons[item]} size={21} /><span>{sportModuleFor(item).shortLabel}</span>{isLoadoutComplete(active.loadouts[item]) ? <i>✓</i> : null}</button>)}</div>
      <LockerSport sport={sport} loadout={active.loadouts[sport]} unlocked={Boolean(economy.starterClaims[sport])} cosmetic={sport === "cricket" ? economy.equipped.kitId : sport === "basketball" ? economy.equipped.jerseyId : sport === "motorsport" ? economy.equipped.liveryId ?? "gridLine" : null} />
    </section>
  );
}

function loadoutPlayerIds(loadout: SportLoadout | undefined): string[] {
  if (!loadout) return [];
  if (loadout.sport === "football") return [...loadout.attackers, ...loadout.defenders, ...(loadout.keeperId ? [loadout.keeperId] : [])];
  if (loadout.sport === "cricket") return loadout.batterIds;
  if (loadout.sport === "basketball") return loadout.playerIds;
  if (loadout.sport === "tennis") return loadout.playerId ? [loadout.playerId] : [];
  return loadout.driverId ? [loadout.driverId] : [];
}

function LockerSport({ sport, loadout, unlocked, cosmetic }: { sport: Sport; loadout?: SportLoadout; unlocked: boolean; cosmetic: string | null }) {
  const entry = sportModuleFor(sport);
  const accent = `var(--ds-color-accent-${entry.accent})`;
  if (!unlocked) return <section className={styles.lockedSport}><Glyph name={icons[sport]} size={52} /><p>{`// ${entry.label.toUpperCase()} CHANNEL LOCKED`}</p><h2>{entry.label.toUpperCase()} SQUAD LOCKED</h2><span>Claim the starter pack from this sport’s Games page to unlock its visual builder.</span><Link href={`/games/${sport}`}>PLAY {entry.label.toUpperCase()}</Link></section>;
  const players = loadoutPlayerIds(loadout).map(playerCardForId).filter((card) => card !== undefined);
  const actions = loadout?.sport === "football" ? loadout.actionCardIds.map(actionCardForId).filter((card) => card !== undefined) : [];
  const complete = isLoadoutComplete(loadout);
  return <section className={styles.loadoutSummary}>
    <header><div><p>{`// ${summaryKicker(sport)}`}</p><h2>{entry.label.toUpperCase()} LOADOUT</h2></div><b style={{ color: complete ? "var(--ds-color-success)" : accent }}>{complete ? "READY" : "NEEDS WORK"}</b></header>
    <div className={styles.summaryMeta}><span>{players.length}/{requiredPlayers(sport)} PLAYERS</span>{cosmetic ? <span>{cosmetic.toUpperCase()}</span> : null}{sport === "football" ? <span>{actions.length}/6 ACTIONS</span> : null}</div>
    <div className={styles.previewCards}>{players.length ? players.map((card) => <DeckPlayerCard key={card.id} card={card} selected={loadout?.sport === "basketball" && loadout.starterId === card.id} />) : <p>NO PLAYERS ASSIGNED TO THIS PROFILE</p>}</div>
    {actions.length ? <div className={styles.previewActions}>{actions.map((card) => <DeckActionCard key={card.id} card={card} />)}</div> : null}
    <Link className={styles.editLoadout} href={`/decks/${sport}`}>{complete ? "EDIT LOADOUT" : "BUILD LOADOUT"}</Link>
  </section>;
}

function requiredPlayers(sport: Sport) { return sport === "football" || sport === "cricket" ? 5 : sport === "basketball" ? 3 : 1; }
function summaryKicker(sport: Sport) { return { football: "5-A-SIDE + 6 ACTIONS", cricket: "FINAL OVER BATTING ORDER", basketball: "GUARD · WING · BIG", tennis: "SINGLES ATHLETE", motorsport: "DRIVER + LIVERY" }[sport]; }
