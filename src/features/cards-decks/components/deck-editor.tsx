"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { Glyph } from "@statoz/design-system/games";
import type { PlayerCard as PlayerCardData, PlayerRole } from "@/domain/cards";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { AuthBoundary } from "@/features/auth";
import { equipCosmetic, useEconomy } from "@/features/economy";
import { basketballLiveries } from "@/features/games/basketball/data/liveries";
import { finalOverKits } from "@/features/games/final-over/data/kits";
import { grandPrixLiveries } from "@/features/games/grand-prix/data/liveries";
import { actionCardForId, playerCardForId } from "@/features/packs";

import { activeDeck, saveLoadout, useDecks, validateLoadout } from "../state/deck-store";
import type { SportLoadout } from "../types";
import { DeckActionCard, DeckPlayerCard } from "./deck-card";
import styles from "./deck-system.module.css";

const accents: Record<Sport, string> = {
  football: "var(--ds-color-accent-cyan)", cricket: "var(--ds-color-accent-cyan)",
  basketball: "var(--ds-color-accent-gold)", tennis: "var(--ds-color-accent-lime)",
  motorsport: "var(--ds-color-accent-racing)",
};
const icons = { football: "sports_soccer", cricket: "sports_cricket", basketball: "sports_basketball", tennis: "sports_tennis", motorsport: "sports_motorsports" } as const;
type Focus = { lane: string; index: number };
type PlayerOption = NonNullable<ReturnType<typeof playerCardForId>>;
type ActionOption = NonNullable<ReturnType<typeof actionCardForId>>;
type Pools = Record<string, PlayerOption[]>;

function blank(sport: Sport): SportLoadout {
  if (sport === "football") return { sport, attackers: [], defenders: [], keeperId: null, actionCardIds: [] };
  if (sport === "cricket") return { sport, batterIds: [] };
  if (sport === "basketball") return { sport, playerIds: [], starterId: null };
  if (sport === "tennis") return { sport, playerId: null };
  return { sport, driverId: null };
}
const clone = <T extends SportLoadout>(value: T): T => structuredClone(value);

function replaceAt(values: string[], index: number, id: string): string[] {
  const next = [...values];
  const previous = next.indexOf(id);
  const displaced = next[index];
  if (previous !== -1 && previous !== index) next[previous] = displaced;
  next[index] = id;
  return next.filter(Boolean);
}
const removeAt = (values: string[], index: number) => values.filter((_, current) => current !== index);
const safeReturnTo = (value?: string) => value?.startsWith("/") && !value.startsWith("//") ? value : "/decks";

export function DeckEditor({ sport, returnTo }: { sport: Sport; returnTo?: string }) {
  const searchParams = useSearchParams();
  const queryReturnTo = searchParams.get("returnTo") ?? undefined;
  const resolvedReturnTo = safeReturnTo(returnTo ?? queryReturnTo);

  return <AuthBoundary allowGuest intent="edit your loadout" message="Log in to manage owned cards and save an active lineup." returnTo={`/decks/${sport}`}><AuthenticatedDeckEditor sport={sport} returnTo={resolvedReturnTo} /></AuthBoundary>;
}

function AuthenticatedDeckEditor({ sport, returnTo }: { sport: Sport; returnTo: string }) {
  const router = useRouter();
  const economy = useEconomy();
  const decks = useDecks();
  const deck = activeDeck(decks);
  const saved = deck.loadouts[sport];
  const [draft, setDraft] = useState<SportLoadout>(() => clone(saved ?? blank(sport)));
  const [dirty, setDirty] = useState(false);
  const [focus, setFocus] = useState<Focus>(() => initialFocus(sport));
  const [message, setMessage] = useState("Select an owned card to assign the focused slot.");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dirty) setDraft(clone(saved ?? blank(sport)));
  }, [dirty, saved, sport, deck.id]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const players = useMemo(() => economy.owned.playerCardIds.map(playerCardForId).filter((card) => card !== undefined), [economy.owned.playerCardIds]);
  const actions = useMemo(() => economy.owned.actionCardIds.map(actionCardForId).filter((card) => card !== undefined), [economy.owned.actionCardIds]);
  const roles = Object.fromEntries(players.map((card) => [card.id, card.role])) as Partial<Record<string, PlayerRole>>;
  const errors = validateLoadout(draft, { playerCardIds: economy.owned.playerCardIds, actionCardIds: economy.owned.actionCardIds, roles });
  const pools: Pools = {
    attacker: players.filter((card) => card.role === "attacker"), defender: players.filter((card) => card.role === "defender"),
    goalkeeper: players.filter((card) => card.role === "goalkeeper"), batsman: players.filter((card) => card.role === "batsman"),
    basketballGuard: players.filter((card) => card.role === "basketballGuard"), basketballWing: players.filter((card) => card.role === "basketballWing"),
    basketballBig: players.filter((card) => card.role === "basketballBig"), tennisSingles: players.filter((card) => card.role === "tennisSingles"),
    driver: players.filter((card) => ["f1Driver", "f2Driver", "nascarDriver", "indycarDriver"].includes(card.role)),
  };
  function update(next: SportLoadout, nextFocus?: Focus) { setDraft(next); setDirty(true); setMessage("Unsaved changes."); if (nextFocus) setFocus(nextFocus); }
  function save() { if (errors.length) { setMessage(errors.join(" ")); return; } saveLoadout(sport, draft as never, deck.id); setDirty(false); router.push(returnTo); }
  function leave() { if (dirty && !window.confirm("Discard your unsaved loadout changes?")) return; router.push(returnTo); }
  const shared = { draft, focus, setFocus, update, pools, actions };

  return (
    <section className={styles.editor} style={{ "--deck-accent": accents[sport] } as CSSProperties}>
      <header className={styles.editorHeader}><button type="button" className={styles.backButton} onClick={leave} aria-label="Back without saving">‹</button><div><p>{`// ${editorSubtitle(sport)}`}</p><h1>{editorTitle(sport)}</h1></div><span className={styles.deckName}>{deck.name.toUpperCase()}</span></header>
      <div className={styles.systemStrip}><i /><Glyph name={icons[sport]} size={15} /><b>{sportModuleFor(sport).label.toUpperCase()} CHANNEL</b><span /><small>{errors.length === 0 ? "LOADOUT READY" : `${errors.length} CHECK${errors.length === 1 ? "" : "S"}`}</small></div>
      <div className={styles.editorGrid}><div className={styles.boardColumn}>
        {draft.sport === "football" ? <FootballBuilder {...shared} draft={draft} /> : null}
        {draft.sport === "cricket" ? <CricketBuilder {...shared} draft={draft} /> : null}
        {draft.sport === "basketball" ? <BasketballBuilder {...shared} draft={draft} /> : null}
        {draft.sport === "tennis" ? <TennisBuilder {...shared} draft={draft} /> : null}
        {draft.sport === "motorsport" ? <MotorsportBuilder {...shared} draft={draft} /> : null}
      </div></div>
      <footer className={styles.actionBar}><div><p aria-live="polite">{message}</p>{errors.length ? <span>{errors[0]}</span> : <span className={styles.valid}>EVERY SLOT IS LEGAL AND OWNED</span>}</div><button type="button" className={styles.secondaryButton} onClick={leave}>BACK</button><button type="button" className={styles.primaryButton} onClick={save} disabled={!dirty || errors.length > 0}>SAVE LOADOUT</button></footer>
    </section>
  );
}

function initialFocus(sport: Sport): Focus { return sport === "football" ? { lane: "attacker", index: 0 } : sport === "cricket" ? { lane: "batter", index: 0 } : sport === "basketball" ? { lane: "basketballGuard", index: 0 } : sport === "tennis" ? { lane: "tennisSingles", index: 0 } : { lane: "driver", index: 0 }; }
function editorTitle(sport: Sport) { return { football: "FOOTBALL DECK", cricket: "FINAL OVER SQUAD", basketball: "ROSTER DECK", tennis: "TENNIS DECK", motorsport: "RACING PIT DECK" }[sport]; }
function editorSubtitle(sport: Sport) { return { football: "5-A-SIDE + 6 ACTIONS", cricket: "5-BAT CHASE UNIT", basketball: "HOOP DUEL", tennis: "SINGLES ATHLETE", motorsport: "DRIVER + LIVERY" }[sport]; }
type BuilderProps<T extends SportLoadout> = { draft: T; focus: Focus; setFocus: (focus: Focus) => void; update: (draft: SportLoadout, focus?: Focus) => void; pools: Pools; actions: ActionOption[] };

function FootballBuilder({ draft, focus, setFocus, update, pools, actions }: BuilderProps<Extract<SportLoadout, { sport: "football" }>>) {
  const laneValues = focus.lane === "attacker" ? draft.attackers : focus.lane === "defender" ? draft.defenders : focus.lane === "action" ? draft.actionCardIds : draft.keeperId ? [draft.keeperId] : [];
  const pool = focus.lane === "action" ? [] : pools[focus.lane] ?? [];
  const selectedId = laneValues[focus.index] ?? null;
  const selectedCard = selectedId ? playerCardForId(selectedId) : undefined;
  const categories = draft.actionCardIds.map(actionCardForId).filter((card) => card !== undefined).map((card) => card.category);
  const coverage = categories.includes("attack") && categories.includes("defense");
  function assignPlayer(card: PlayerOption) {
    if (focus.lane === "attacker") update({ ...draft, attackers: replaceAt(draft.attackers, focus.index, card.id) }, { lane: "attacker", index: Math.min(focus.index + 1, 1) });
    if (focus.lane === "defender") update({ ...draft, defenders: replaceAt(draft.defenders, focus.index, card.id) }, { lane: "defender", index: Math.min(focus.index + 1, 1) });
    if (focus.lane === "keeper") update({ ...draft, keeperId: card.id });
  }
  function clear() {
    if (focus.lane === "attacker") update({ ...draft, attackers: removeAt(draft.attackers, focus.index) });
    if (focus.lane === "defender") update({ ...draft, defenders: removeAt(draft.defenders, focus.index) });
    if (focus.lane === "keeper") update({ ...draft, keeperId: null });
    if (focus.lane === "action") update({ ...draft, actionCardIds: removeAt(draft.actionCardIds, focus.index) });
  }
  return <>
    <HudSection title="5-A-SIDE DECK" status={draft.attackers.length === 2 && draft.defenders.length === 2 && draft.keeperId ? "READY" : "BUILD"}><div className={`${styles.sportBoard} ${styles.pitch}`}><SlotRow>{[0,1].map((index) => <DeckSlot key={`atk-${index}`} label={index ? "RS" : "LS"} cardId={draft.attackers[index]} selected={focus.lane === "attacker" && focus.index === index} onClick={() => setFocus({ lane: "attacker", index })} />)}</SlotRow><SlotRow>{[0,1].map((index) => <DeckSlot key={`def-${index}`} label={index ? "RCB" : "LCB"} cardId={draft.defenders[index]} selected={focus.lane === "defender" && focus.index === index} onClick={() => setFocus({ lane: "defender", index })} />)}</SlotRow><SlotRow><DeckSlot label="GK" cardId={draft.keeperId ?? undefined} selected={focus.lane === "keeper"} onClick={() => setFocus({ lane: "keeper", index: 0 })} /></SlotRow></div><div className={styles.actionStrip}>{Array.from({ length: 6 }, (_, index) => { const card = draft.actionCardIds[index] ? actionCardForId(draft.actionCardIds[index]) : undefined; return <MiniSlot key={index} label={`${index + 1}`} selected={focus.lane === "action" && focus.index === index} onClick={() => setFocus({ lane: "action", index })}>{card?.title ?? "+"}</MiniSlot>; })}</div>{!coverage && draft.actionCardIds.length ? <div className={styles.warning}>ACTION STRIP NEEDS BOTH ATTACK AND DEFENCE COVERAGE</div> : null}</HudSection>
    <PickerHeader lanes={[["attacker","ATTACK"],["defender","DEFEND"],["keeper","KEEPER"],["action","ACTION"]]} focus={focus} onFocus={setFocus} onClear={clear} />
    {selectedCard ? <Telemetry card={selectedCard} /> : null}
    {focus.lane === "action" ? <div className={styles.cardGrid}>{actions.map((card) => <DeckActionCard key={card.id} card={card} selected={selectedId === card.id} disabled={draft.actionCardIds.includes(card.id) && selectedId !== card.id} onClick={() => update({ ...draft, actionCardIds: replaceAt(draft.actionCardIds, focus.index, card.id) }, { lane: "action", index: Math.min(focus.index + 1, 5) })} />)}</div> : <PlayerPicker cards={pool} selectedId={selectedId} used={[...draft.attackers, ...draft.defenders, ...(draft.keeperId ? [draft.keeperId] : [])]} onSelect={assignPlayer} />}
  </>;
}

function CricketBuilder({ draft, focus, setFocus, update, pools }: BuilderProps<Extract<SportLoadout, { sport: "cricket" }>>) {
  const selectedId = draft.batterIds[focus.index] ?? null;
  return <><HudSection title="CHASE SQUAD" status={draft.batterIds.length === 5 ? "READY" : "BUILD"}><div className={`${styles.sportBoard} ${styles.crease}`}><div className={styles.fiveGrid}>{Array.from({ length: 5 }, (_, index) => <DeckSlot key={index} label={`BAT ${index + 1}`} cardId={draft.batterIds[index]} selected={focus.index === index} onClick={() => setFocus({ lane: "batter", index })} />)}</div></div></HudSection><PickerHeader lanes={Array.from({ length: 5 }, (_, index) => [`batter-${index}`, `${index + 1}`])} focus={{ lane: `batter-${focus.index}`, index: focus.index }} onFocus={(next) => setFocus({ lane: "batter", index: next.index })} onClear={() => update({ ...draft, batterIds: removeAt(draft.batterIds, focus.index) })} />{selectedId && playerCardForId(selectedId) ? <Telemetry card={playerCardForId(selectedId)!} labels={["OVR","TIMING","BOUNDARY","NERVE"]} /> : null}<PlayerPicker cards={pools.batsman} selectedId={selectedId} used={draft.batterIds} onSelect={(card) => update({ ...draft, batterIds: replaceAt(draft.batterIds, focus.index, card.id) }, { lane: "batter", index: Math.min(focus.index + 1, 4) })} /><CosmeticPicker kind="kit" title="MATCH KIT" items={finalOverKits.map((kit) => ({ id: kit.id, name: kit.name, primary: kit.primary, secondary: kit.secondary }))} /></>;
}

function BasketballBuilder({ draft, focus, setFocus, update, pools }: BuilderProps<Extract<SportLoadout, { sport: "basketball" }>>) {
  const roleNames = ["basketballGuard", "basketballWing", "basketballBig"];
  const index = Math.max(0, roleNames.indexOf(focus.lane));
  const selectedId = draft.playerIds[index] ?? null;
  return <><HudSection title="HOOP DUEL ROSTER" status={draft.playerIds.length === 3 && draft.starterId ? "READY" : "BUILD"}><div className={`${styles.sportBoard} ${styles.court}`}><SlotRow>{roleNames.map((role, roleIndex) => <DeckSlot key={role} label={["G","W","BIG"][roleIndex]} cardId={draft.playerIds[roleIndex]} selected={focus.lane === role} starter={draft.starterId === draft.playerIds[roleIndex]} onClick={() => setFocus({ lane: role, index: roleIndex })} onStarter={draft.playerIds[roleIndex] ? () => update({ ...draft, starterId: draft.playerIds[roleIndex] }) : undefined} />)}</SlotRow></div></HudSection><PickerHeader lanes={[["basketballGuard","G"],["basketballWing","W"],["basketballBig","BIG"]]} focus={focus} onFocus={setFocus} onClear={() => { const clearing = draft.playerIds[index]; const playerIds = removeAt(draft.playerIds, index); update({ ...draft, playerIds, starterId: draft.starterId === clearing ? playerIds[0] ?? null : draft.starterId }); }} />{selectedId && playerCardForId(selectedId) ? <Telemetry card={playerCardForId(selectedId)!} labels={["SPD","HANDLE","SHOT","DEF"]} /> : null}<PlayerPicker cards={pools[focus.lane] ?? []} selectedId={selectedId} used={draft.playerIds} onSelect={(card) => { const playerIds = replaceAt(draft.playerIds, index, card.id); const nextIndex = Math.min(index + 1, 2); update({ ...draft, playerIds, starterId: draft.starterId ?? card.id }, { lane: roleNames[nextIndex], index: nextIndex }); }} /><CosmeticPicker kind="jersey" title="TEAM JERSEY" items={basketballLiveries.map((team) => ({ id: team.id, name: team.name, primary: team.primary, secondary: team.secondary }))} /></>;
}

function TennisBuilder({ draft, focus, setFocus, update, pools }: BuilderProps<Extract<SportLoadout, { sport: "tennis" }>>) { const selected = draft.playerId ? playerCardForId(draft.playerId) : undefined; return <><HudSection title="BASELINE LOADOUT" status={selected ? "READY" : "BUILD"}><div className={`${styles.sportBoard} ${styles.tennisCourt}`}><DeckSlot label="SINGLES" cardId={draft.playerId ?? undefined} selected onClick={() => setFocus({ lane: "tennisSingles", index: 0 })} /></div></HudSection><PickerHeader lanes={[["tennisSingles", "SINGLES"]]} focus={focus} onFocus={setFocus} onClear={() => update({ sport: "tennis", playerId: null })} />{selected ? <Telemetry card={selected} labels={["SERVE","POWER","CONTROL","SPEED"]} /> : null}<SectionTitle title="OWNED ATHLETES" count={pools.tennisSingles.length} /><PlayerPicker cards={pools.tennisSingles} selectedId={draft.playerId} used={draft.playerId ? [draft.playerId] : []} onSelect={(card) => update({ sport: "tennis", playerId: card.id })} /></>; }
function MotorsportBuilder({ draft, focus, setFocus, update, pools }: BuilderProps<Extract<SportLoadout, { sport: "motorsport" }>>) { const selected = draft.driverId ? playerCardForId(draft.driverId) : undefined; return <><HudSection title="GRID SLOT 01" status={selected ? "READY" : "BUILD"}><div className={`${styles.sportBoard} ${styles.pitLane}`}><DeckSlot label="RACE DRIVER" cardId={draft.driverId ?? undefined} selected onClick={() => setFocus({ lane: "driver", index: 0 })} /></div></HudSection><PickerHeader lanes={[["driver", "DRIVER"]]} focus={focus} onFocus={setFocus} onClear={() => update({ sport: "motorsport", driverId: null })} />{selected ? <Telemetry card={selected} labels={["PACE","CONTROL","START","NERVE"]} /> : null}<SectionTitle title="YOUR DRIVERS" count={pools.driver.length} /><PlayerPicker cards={pools.driver} selectedId={draft.driverId} used={draft.driverId ? [draft.driverId] : []} onSelect={(card) => update({ sport: "motorsport", driverId: card.id })} /><CosmeticPicker kind="livery" title="RACE LIVERY" items={grandPrixLiveries.map((spec) => ({ id: spec.livery, name: spec.name, primary: spec.primary, secondary: spec.accent }))} /></>; }

function HudSection({ title, status, children }: { title: string; status: string; children: ReactNode }) { return <section className={styles.hudSection}><header><div><p>{"// ACTIVE PROFILE"}</p><h2>{title}</h2></div><b>{status}</b></header>{children}</section>; }
function SlotRow({ children }: { children: ReactNode }) { return <div className={styles.slotRow}>{children}</div>; }
function DeckSlot({ label, cardId, selected, starter, onClick, onStarter }: { label: string; cardId?: string; selected: boolean; starter?: boolean; onClick: () => void; onStarter?: () => void }) { const card = cardId ? playerCardForId(cardId) : undefined; return <div className={`${styles.deckSlot} ${selected ? styles.selectedSlot : ""}`}><button type="button" className={styles.slotButton} onClick={onClick} aria-pressed={selected} aria-label={`${label}${card ? `, ${card.name}` : ", empty"}`}><span>{label}</span>{card ? <DeckPlayerCard card={card} selected={selected} /> : <i><b>＋</b><small>SELECT CARD</small></i>}</button>{card && onStarter ? <button type="button" className={`${styles.starterButton} ${starter ? styles.isStarter : ""}`} onClick={onStarter}>{starter ? "★ STARTER" : "SET STARTER"}</button> : null}</div>; }
function MiniSlot({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" className={`${styles.miniSlot} ${selected ? styles.selectedMiniSlot : ""}`} onClick={onClick} aria-pressed={selected}><b>{label}</b><span>{children}</span></button>; }
function PickerHeader({ lanes, focus, onFocus, onClear }: { lanes: string[][]; focus: Focus; onFocus: (focus: Focus) => void; onClear: () => void }) {
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? lanes.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + lanes.length) % lanes.length;
    onFocus({ lane: lanes[next][0], index: next });
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[next]?.focus();
  }
  return <div className={styles.pickerHeader}><div role="tablist" aria-label="Deck slot group">{lanes.map(([lane, label], index) => <button key={lane} type="button" role="tab" aria-selected={focus.lane === lane} tabIndex={focus.lane === lane ? 0 : -1} onClick={() => onFocus({ lane, index })} onKeyDown={(event) => move(event, index)}>{label}</button>)}</div><button type="button" onClick={onClear}>CLEAR</button></div>;
}
function PlayerPicker({ cards, selectedId, used, onSelect }: { cards: PlayerOption[]; selectedId?: string | null; used: string[]; onSelect: (card: PlayerOption) => void }) { if (!cards.length) return <div className={styles.emptyPicker}>NO OWNED CARDS FOR THIS SLOT YET</div>; return <div className={styles.cardGrid}>{[...cards].sort((a,b) => b.rating-a.rating).map((card) => <DeckPlayerCard key={card.id} card={card} selected={selectedId === card.id} disabled={used.includes(card.id) && selectedId !== card.id} onClick={() => onSelect(card)} />)}</div>; }
function Telemetry({ card, labels = ["OVR","POWER","CONTROL","NERVE"] }: { card: PlayerCardData; labels?: string[] }) { const values = [card.rating, Math.min(99, card.rating+4), Math.min(99, card.rating+7), Math.max(1, card.rating-2)]; return <section className={styles.telemetry}><p>{`${card.trait.toUpperCase()} // ROLE TELEMETRY`}</p><div>{labels.map((label,index) => <span key={label}><b>{values[index]}</b><small>{label}</small></span>)}</div></section>; }
function SectionTitle({ title, count }: { title: string; count: number }) { return <div className={styles.sectionTitle}><h3>{title}</h3><span>{count} CARDS</span></div>; }
function CosmeticPicker({ kind, title, items }: { kind: "kit"|"jersey"|"livery"; title: string; items: { id:string; name:string; primary:string; secondary:string }[] }) { const economy=useEconomy(); const ownedKey=kind==="kit"?"kitIds":kind==="jersey"?"jerseyIds":"liveryIds"; const equippedKey=kind==="kit"?"kitId":kind==="jersey"?"jerseyId":"liveryId"; const owned=economy.owned[ownedKey]; const equipped=economy.equipped[equippedKey]; return <section className={styles.cosmetics}><SectionTitle title={title} count={owned.length}/><div>{items.map((item)=>{const unlocked=owned.includes(item.id);return <button key={item.id} type="button" disabled={!unlocked} aria-pressed={equipped===item.id} onClick={()=>equipCosmetic(kind,item.id)} title={unlocked?item.name:`${item.name} — locked`} style={{"--cosmetic-primary":item.primary,"--cosmetic-secondary":item.secondary} as CSSProperties}><i/><span>{item.name}</span></button>;})}</div></section>; }
