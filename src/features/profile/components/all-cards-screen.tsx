"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import {
  ActionCard,
  ArrowLeftIcon,
  CloseIcon,
  CopyIcon,
  Glyph,
  PlayerCard,
  UnderlineTabs,
  accentVar,
  glyphRegistry,
  type GlyphName,
} from "@statoz/design-system/games";
import {
  playerRoleLabels,
  playerRoleSports,
  type ActionCard as ActionCardData,
  type CardTier,
  type PlayerCard as PlayerCardData,
  type PlayerRole,
} from "@/domain/cards";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { AuthBoundary } from "@/features/auth";
import { useEconomy } from "@/features/economy";
import { actionCardForId, playerCardForId, portraitForCard } from "@/features/packs";

import styles from "./all-cards-screen.module.css";

type Filter = "ALL" | "ATK" | "DEF" | "GK" | "ACT" | "BAT" | "BOWL" | "G" | "W" | "BIG" | "F1" | "F2" | "NASCAR" | "INDY";
type CollectionItem =
  | { kind: "player"; card: PlayerCardData }
  | { kind: "action"; card: ActionCardData };

const roleAccents: Record<PlayerRole, string> = {
  attacker: accentVar("cyan"), defender: accentVar("violet"), goalkeeper: accentVar("gold"), batsman: accentVar("cyan"), bowler: accentVar("violet"), basketballGuard: accentVar("gold"), basketballWing: accentVar("cyan"), basketballBig: accentVar("violet"), tennisSingles: accentVar("lime"), f1Driver: accentVar("racing"), f2Driver: accentVar("racing"), nascarDriver: accentVar("racing"), indycarDriver: accentVar("racing"),
};

const filtersBySport: Record<Sport, Filter[]> = {
  football: ["ALL", "ATK", "DEF", "GK", "ACT"], cricket: ["ALL", "BAT", "BOWL"], basketball: ["ALL", "G", "W", "BIG"], tennis: ["ALL"], motorsport: ["ALL", "F1", "F2", "NASCAR", "INDY"],
};

const filterAccents: Record<Filter, string> = {
  ALL: accentVar("cyan"), ATK: accentVar("lime"), DEF: accentVar("violet"), GK: accentVar("gold"), ACT: accentVar("pink"), BAT: accentVar("lime"), BOWL: accentVar("violet"), G: accentVar("gold"), W: accentVar("cyan"), BIG: accentVar("violet"), F1: accentVar("racing"), F2: accentVar("racing"), NASCAR: accentVar("racing"), INDY: accentVar("racing"),
};

function glyph(name: string): GlyphName { return name in glyphRegistry ? name as GlyphName : "bolt"; }

function marksFor(card: PlayerCardData): "none" | "cricket" | "basketball" | "tennis" | "motorsport" {
  const sport = playerRoleSports[card.role];
  return sport === "football" ? "none" : sport;
}

function cardMatches(card: PlayerCardData, filter: Filter): boolean {
  const roles: Partial<Record<Filter, PlayerRole>> = { ATK: "attacker", DEF: "defender", GK: "goalkeeper", BAT: "batsman", BOWL: "bowler", G: "basketballGuard", W: "basketballWing", BIG: "basketballBig", F1: "f1Driver", F2: "f2Driver", NASCAR: "nascarDriver", INDY: "indycarDriver" };
  return !roles[filter] || card.role === roles[filter];
}

/** Flutter's collection screen: owned cards, rating ordered, and football actions at the tail. */
export function AllCardsScreen() {
  return <AuthBoundary intent="view your card collection" message="Log in to see the cards you have collected." returnTo="/cards"><Collection /></AuthBoundary>;
}

function Collection() {
  const router = useRouter();
  const economy = useEconomy();
  const [sport, setSport] = useState<Sport>("football");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selected, setSelected] = useState<CollectionItem | null>(null);
  const accent = accentVar(sportModuleFor(sport).accent);
  const filters = filtersBySport[sport];
  const items = useMemo(() => {
    const players = economy.owned.playerCardIds.map(playerCardForId).filter((card): card is PlayerCardData => Boolean(card)).filter((card) => playerRoleSports[card.role] === sport).filter((card) => filter !== "ACT" && cardMatches(card, filter)).sort((a, b) => b.rating - a.rating).map((card): CollectionItem => ({ kind: "player", card }));
    const actions = sport === "football" && (filter === "ALL" || filter === "ACT") ? economy.owned.actionCardIds.map(actionCardForId).filter((card): card is ActionCardData => Boolean(card)).map((card): CollectionItem => ({ kind: "action", card })) : [];
    return [...players, ...actions];
  }, [economy.owned.actionCardIds, economy.owned.playerCardIds, filter, sport]);

  return <section className="flex min-h-0 flex-1 flex-col">
    <header className="flex shrink-0 items-center gap-3 border-b border-line-muted px-4 py-3 sm:px-6">
      <button type="button" onClick={() => router.back()} aria-label="Back to profile" className="grid size-11 cursor-pointer place-items-center text-muted transition-colors hover:text-foreground"><ArrowLeftIcon size={22} /></button>
      <div><h1 className="font-display text-lg font-black leading-none tracking-wide">ALL CARDS</h1><p className="mt-1 font-display text-2xs font-black tracking-ultra text-muted">{"// YOUR COLLECTION"}</p></div>
    </header>
    <UnderlineTabs tabs={sportOrder.map((entry) => ({ id: entry, label: sportModuleFor(entry).label.toUpperCase(), icon: <SportTab sport={entry} />, showLabel: true }))} activeIndex={sportOrder.indexOf(sport)} onChange={(index) => { setSport(sportOrder[index]); setFilter("ALL"); }} accent={accent} iconColors={sportOrder.map((entry) => accentVar(sportModuleFor(entry).accent))} label="Collection sports" minTabWidth={94} />
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-line-muted px-4 py-2.5 sm:px-6">
      {filters.map((entry) => <FilterChip key={entry} filter={entry} selected={filter === entry} onClick={() => setFilter(entry)} />)}
      <span className="ml-auto shrink-0 pl-3 font-display text-2xs font-bold tracking-wide text-muted">{items.length} CARDS</span>
    </div>
    {items.length ? <div className={styles.grid}>{items.map((item) => <div key={item.card.id} className={styles.cell}>{item.kind === "player" ? <PlayerCard name={item.card.shortName} roleLabel={playerRoleLabels[item.card.role]} position={item.card.position} countryCode={item.card.countryCode} rating={item.card.rating} trait={item.card.trait} tier={item.card.tier} icon={glyph(item.card.icon)} portraitSrc={portraitForCard(item.card)} roleAccent={roleAccents[item.card.role]} markings={marksFor(item.card)} size="md" onClick={() => setSelected(item)} /> : <ActionCard title={item.card.title} category={item.card.category} tier={item.card.tier} effect={item.card.effect} power={item.card.power} risky={item.card.risky} icon={glyph(item.card.icon)} size="md" onClick={() => setSelected(item)} />}</div>)}</div> : <div className="grid flex-1 place-items-center px-6 text-center"><p className="font-display text-2xs font-black tracking-ultra text-muted">NO {sportModuleFor(sport).label.toUpperCase()} CARDS YET</p></div>}
    {selected ? <CardDetail item={selected} onClose={() => setSelected(null)} /> : null}
  </section>;
}

function SportTab({ sport }: { sport: Sport }) {
  const icon = { football: "sports_soccer", cricket: "sports_cricket", basketball: "sports_basketball", tennis: "sports_tennis", motorsport: "sports_motorsports" } as const;
  return <Glyph name={icon[sport]} size={17} />;
}

function FilterChip({ filter, selected, onClick }: { filter: Filter; selected: boolean; onClick: () => void }) {
  const accent = filterAccents[filter];
  return <button type="button" onClick={onClick} aria-pressed={selected} className="h-7 shrink-0 cursor-pointer border px-2.5 font-display text-2xs font-black tracking-wide transition-colors" style={{ color: selected ? accent : `color-mix(in srgb, ${accent} 60%, transparent)`, background: selected ? `color-mix(in srgb, ${accent} 18%, transparent)` : "transparent", borderColor: selected ? accent : `color-mix(in srgb, ${accent} 35%, transparent)`, borderWidth: selected ? "1.5px" : "1px" }}>{filter}</button>;
}

function CardDetail({ item, onClose }: { item: CollectionItem; onClose: () => void }) {
  const [shared, setShared] = useState(false);
  // Keep the detail template shared; every field below remains behind the
  // discriminating `item.kind` branch that selected its card family.
  const card = item.card as PlayerCardData & ActionCardData;
  const tier: CardTier = card.tier;
  const rarityAccent = `var(--ds-color-rarity-${tier}-base)`;
  const rarityLabel = tier.toUpperCase();
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", keydown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", keydown); document.body.style.overflow = previous; };
  }, [onClose]);
  async function share() {
    const title = item.kind === "player" ? card.name : card.title;
    const text = item.kind === "player" ? `${card.name} · ${card.rating} OVR · ${rarityLabel}` : `${card.title} · +${card.power} PWR · ${rarityLabel}`;
    try { if (navigator.share) await navigator.share({ title, text }); else await navigator.clipboard.writeText(text); setShared(true); window.setTimeout(() => setShared(false), 1800); } catch { /* A dismissed native share sheet needs no notice. */ }
  }
  return createPortal(<div className={styles.scrim} role="presentation">
    <button type="button" aria-label="Close card details" className="absolute inset-0 cursor-default" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-label={`${item.kind === "player" ? card.name : card.title} card details`} className={styles.detail} style={{ "--detail-accent": rarityAccent } as CSSProperties}>
      <div aria-hidden className={styles.rings} />
      <button type="button" onClick={share} aria-label="Share card" className={styles.cornerButton} style={{ left: "-5px", color: rarityAccent }}><CopyIcon size={18} /></button>
      <button type="button" onClick={onClose} aria-label="Close card details" className={styles.cornerButton} style={{ right: "-5px", color: "var(--ds-color-text-muted)" }}><CloseIcon size={20} /></button>
      <p className="border-b py-3 text-center font-display text-2xs font-black tracking-ultra" style={{ color: rarityAccent, borderColor: `color-mix(in srgb, ${rarityAccent} 55%, transparent)` }}>{rarityLabel}</p>
      <div className="flex flex-col items-center px-5 pb-5 pt-5">
        {item.kind === "player" ? <PlayerCard name={card.shortName} roleLabel={playerRoleLabels[card.role]} position={card.position} countryCode={card.countryCode} rating={card.rating} trait={card.trait} tier={card.tier} icon={glyph(card.icon)} portraitSrc={portraitForCard(card)} roleAccent={roleAccents[card.role]} markings={marksFor(card)} size="lg" selected /> : <ActionCard title={card.title} category={card.category} tier={card.tier} effect={card.effect} power={card.power} risky={card.risky} icon={glyph(card.icon)} size="lg" selected />}
        <h2 className="mt-4 text-center font-display text-base font-black tracking-wide">{(item.kind === "player" ? card.name : card.title).toUpperCase()}</h2>
        <p className="mt-1 text-center font-display text-2xs font-bold tracking-ultra text-muted">{item.kind === "player" ? `${card.position}  ·  ${card.country.toUpperCase()}` : card.category.toUpperCase()}</p>
        <div className="mt-4 flex w-full gap-2"><DetailStat label={item.kind === "player" ? "OVR" : "PWR"} value={item.kind === "player" ? String(card.rating) : `+${card.power}`} color={rarityAccent} /><DetailStat label={item.kind === "player" ? "TRAIT" : "EFFECT"} value={item.kind === "player" ? card.trait : card.effect} color={accentVar("cyan")} /></div>
        <p aria-live="polite" className="mt-3 min-h-3 font-display text-2xs font-black tracking-wide" style={{ color: rarityAccent }}>{shared ? "CARD READY TO SHARE" : ""}</p>
      </div>
      <div aria-hidden className={styles.detailBar} />
    </section>
  </div>, document.body);
}

function DetailStat({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="min-w-0 flex-1 border px-2 py-2 text-center" style={{ borderColor: `color-mix(in srgb, ${color} 55%, transparent)`, background: `color-mix(in srgb, ${color} 8%, var(--ds-color-background-secondary))` }}><p className="font-display text-2xs font-black tracking-wide" style={{ color }}>{label}</p><p className="mt-1 line-clamp-2 font-display text-2xs font-bold leading-tight text-foreground">{value.toUpperCase()}</p></div>;
}
