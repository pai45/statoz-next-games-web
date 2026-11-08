"use client";

import { useSyncExternalStore } from "react";

import type { Sport } from "@/domain/sports";
import type { PlayerRole } from "@/domain/cards";
import { readEconomy, useEconomy } from "@/features/economy";

import type {
  DeckLoadouts,
  DeckSlot,
  DeckSnapshot,
  LoadoutFor,
  SportLoadout,
} from "../types";

const storageKey = "statoz.next.games-web.decks.v2";
const legacyStorageKey = "statoz.next.games-web.decks.v1";
const initialSlot: DeckSlot = Object.freeze({ id: "slot-1", name: "My Squad", loadouts: {} });
const emptyDecks: DeckSnapshot = Object.freeze({
  version: 2,
  activeDeckId: initialSlot.id,
  slots: [initialSlot],
});
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: DeckSnapshot = emptyDecks;

function stringList(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))].slice(
        0,
        limit,
      )
    : [];
}

function coerceLoadout(sport: Sport, value: unknown): SportLoadout | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (sport === "football") {
    return {
      sport,
      attackers: stringList(record.attackers, 2),
      defenders: stringList(record.defenders, 2),
      keeperId: typeof record.keeperId === "string" ? record.keeperId : null,
      actionCardIds: stringList(record.actionCardIds, 6),
    };
  }
  if (sport === "cricket") {
    return { sport, batterIds: stringList(record.batterIds, 5) };
  }
  if (sport === "basketball") {
    const playerIds = stringList(record.playerIds, 3);
    const starter =
      typeof record.starterId === "string" && playerIds.includes(record.starterId)
        ? record.starterId
        : playerIds[0] ?? null;
    return { sport, playerIds, starterId: starter };
  }
  if (sport === "tennis") {
    return {
      sport,
      playerId: typeof record.playerId === "string" ? record.playerId : null,
    };
  }
  return {
    sport,
    driverId: typeof record.driverId === "string" ? record.driverId : null,
  };
}

function coerceLoadouts(value: unknown): DeckLoadouts {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const loadouts: DeckLoadouts = {};
  for (const sport of ["football", "cricket", "basketball", "tennis", "motorsport"] as const) {
    const loadout = coerceLoadout(sport, source[sport]);
    if (loadout) Object.assign(loadouts, { [sport]: loadout });
  }
  return loadouts;
}

function coerce(value: unknown): DeckSnapshot {
  if (!value || typeof value !== "object") return emptyDecks;
  const record = value as Record<string, unknown>;
  if (record.version === 2 && Array.isArray(record.slots)) {
    const slots = record.slots.flatMap((value, index): DeckSlot[] => {
      if (!value || typeof value !== "object") return [];
      const slot = value as Record<string, unknown>;
      const id = typeof slot.id === "string" && slot.id ? slot.id : `slot-${index + 1}`;
      const rawName = typeof slot.name === "string" ? slot.name.trim() : "";
      return [{ id, name: rawName.slice(0, 24) || `Squad ${index + 1}`, loadouts: coerceLoadouts(slot.loadouts) }];
    });
    if (slots.length === 0) return emptyDecks;
    const requested = typeof record.activeDeckId === "string" ? record.activeDeckId : "";
    return {
      version: 2,
      activeDeckId: slots.some((slot) => slot.id === requested) ? requested : slots[0].id,
      slots,
    };
  }
  // V1 stored one unnamed active loadout map. Preserve it as the first profile.
  const loadouts = coerceLoadouts(record.loadouts);
  return { version: 2, activeDeckId: "slot-1", slots: [{ ...initialSlot, loadouts }] };
}

function readRaw(): string | null {
  try {
    const current = window.localStorage.getItem(storageKey);
    if (current !== null) return `v2:${current}`;
    const legacy = window.localStorage.getItem(legacyStorageKey);
    return legacy === null ? null : `v1:${legacy}`;
  } catch {
    return null;
  }
}

function claimSeeded(snapshot: DeckSnapshot): DeckSnapshot {
  const economy = readEconomy();
  const active = activeDeck(snapshot);
  const loadouts = { ...active.loadouts };
  let changed = false;
  for (const sport of [
    "football",
    "cricket",
    "basketball",
    "tennis",
    "motorsport",
  ] as const) {
    const claim = economy.starterClaims[sport];
    if (claim && !isLoadoutComplete(loadouts[sport])) {
      Object.assign(loadouts, {
        [sport]: loadoutFromClaim(
          sport,
          claim.playerCardIds,
          claim.actionCardIds,
        ),
      });
      changed = true;
    }
  }
  return changed
    ? {
        ...snapshot,
        slots: snapshot.slots.map((slot) => slot.id === active.id ? { ...slot, loadouts } : slot),
      }
    : snapshot;
}

function getSnapshot(): DeckSnapshot {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed = raw ? coerce(JSON.parse(raw.slice(3))) : emptyDecks;
    cachedValue = claimSeeded(parsed);
    if (raw?.startsWith("v1:") || cachedValue !== parsed) {
      const serialized = JSON.stringify(cachedValue);
      window.localStorage.setItem(storageKey, serialized);
      cachedRaw = `v2:${serialized}`;
    }
  } catch {
    cachedValue = claimSeeded(emptyDecks);
    if (cachedValue !== emptyDecks) {
      const serialized = JSON.stringify(cachedValue);
      try {
        window.localStorage.setItem(storageKey, serialized);
        cachedRaw = `v2:${serialized}`;
      } catch {
        // Keep the repaired snapshot in memory when browser storage is blocked.
      }
    }
  }
  return cachedValue;
}

function notify(): void {
  cachedRaw = null;
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === legacyStorageKey || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: DeckSnapshot): DeckSnapshot {
  const safe = coerce(next);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(safe));
  } catch {
    cachedValue = safe;
  }
  notify();
  return safe;
}

export function useDecks(): DeckSnapshot {
  // Keep this store subscribed while the economy settles after a starter claim.
  useEconomy();
  return useSyncExternalStore(subscribe, getSnapshot, () => emptyDecks);
}

export function readDecks(): DeckSnapshot {
  if (typeof window === "undefined") return emptyDecks;
  return getSnapshot();
}

export function saveLoadout<S extends Sport>(
  sport: S,
  loadout: LoadoutFor<S>,
  deckId?: string,
): DeckSnapshot {
  const current = readDecks();
  const targetId = deckId ?? current.activeDeckId;
  return write({
    ...current,
    activeDeckId: targetId,
    slots: current.slots.map((slot) => slot.id === targetId
      ? { ...slot, loadouts: { ...slot.loadouts, [sport]: loadout } }
      : slot),
  });
}

export function seedLoadoutFromClaim(
  sport: Sport,
  playerCardIds: string[],
  actionCardIds: string[] = [],
): DeckSnapshot {
  const current = readDecks();
  const active = activeDeck(current);
  // A pre-existing blank or partial draft must not block the one-time starter
  // grant from producing a playable deck. Keep a complete custom loadout, but
  // replace an incomplete one with the role-ordered starter pack.
  if (isLoadoutComplete(active.loadouts[sport])) return current;
  return write({
    ...current,
    slots: current.slots.map((slot) => slot.id === active.id ? {
      ...slot,
      loadouts: {
        ...slot.loadouts,
        [sport]: loadoutFromClaim(sport, playerCardIds, actionCardIds),
      },
    } : slot),
  });
}

export function activeDeck(snapshot: DeckSnapshot): DeckSlot {
  return snapshot.slots.find((slot) => slot.id === snapshot.activeDeckId) ?? snapshot.slots[0] ?? initialSlot;
}

export function activeLoadout<S extends Sport>(snapshot: DeckSnapshot, sport: S): LoadoutFor<S> | undefined {
  return activeDeck(snapshot).loadouts[sport] as LoadoutFor<S> | undefined;
}

export function applyDeck(deckId: string): DeckSnapshot {
  const current = readDecks();
  if (!current.slots.some((slot) => slot.id === deckId)) return current;
  return write({ ...current, activeDeckId: deckId });
}

export function createDeck(): DeckSnapshot {
  const current = readDecks();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `slot-${crypto.randomUUID()}`
    : `slot-${Date.now()}`;
  const slot: DeckSlot = { id, name: `Squad ${current.slots.length + 1}`, loadouts: {} };
  return write({ ...current, activeDeckId: id, slots: [...current.slots, slot] });
}

export function renameDeck(deckId: string, name: string): DeckSnapshot {
  const current = readDecks();
  const safeName = name.trim().slice(0, 24);
  if (!safeName) return current;
  return write({
    ...current,
    slots: current.slots.map((slot) => slot.id === deckId ? { ...slot, name: safeName } : slot),
  });
}

export function deleteDeck(deckId: string): DeckSnapshot {
  const current = readDecks();
  if (current.slots.length <= 1 || !current.slots.some((slot) => slot.id === deckId)) return current;
  const slots = current.slots.filter((slot) => slot.id !== deckId);
  return write({
    ...current,
    slots,
    activeDeckId: current.activeDeckId === deckId ? slots[0].id : current.activeDeckId,
  });
}

export function loadoutFromClaim(
  sport: Sport,
  players: string[],
  actions: string[] = [],
): SportLoadout {
  if (sport === "football") {
    return {
      sport,
      attackers: players.slice(0, 2),
      defenders: players.slice(2, 4),
      keeperId: players[4] ?? null,
      actionCardIds: actions.slice(0, 6),
    };
  }
  if (sport === "cricket") return { sport, batterIds: players.slice(0, 5) };
  if (sport === "basketball") {
    const playerIds = players.slice(0, 3);
    return { sport, playerIds, starterId: playerIds[0] ?? null };
  }
  if (sport === "tennis") return { sport, playerId: players[0] ?? null };
  return { sport, driverId: players[0] ?? null };
}

export function isLoadoutComplete(loadout: SportLoadout | undefined): boolean {
  if (!loadout) return false;
  if (loadout.sport === "football") {
    return (
      loadout.attackers.length === 2 &&
      loadout.defenders.length === 2 &&
      loadout.keeperId !== null &&
      loadout.actionCardIds.length === 6
    );
  }
  if (loadout.sport === "cricket") return loadout.batterIds.length === 5;
  if (loadout.sport === "basketball") {
    return (
      loadout.playerIds.length === 3 &&
      loadout.starterId !== null &&
      loadout.playerIds.includes(loadout.starterId)
    );
  }
  if (loadout.sport === "tennis") return loadout.playerId !== null;
  return loadout.driverId !== null;
}

export function validateLoadout(
  loadout: SportLoadout | undefined,
  inventory: {
    playerCardIds: string[];
    actionCardIds: string[];
    roles?: Partial<Record<string, PlayerRole>>;
  },
): string[] {
  if (!loadout) return ["No loadout has been saved."];
  const errors: string[] = [];
  const players = loadout.sport === "football"
    ? [...loadout.attackers, ...loadout.defenders, ...(loadout.keeperId ? [loadout.keeperId] : [])]
    : loadout.sport === "cricket" ? loadout.batterIds
      : loadout.sport === "basketball" ? loadout.playerIds
        : loadout.sport === "tennis" ? (loadout.playerId ? [loadout.playerId] : [])
          : loadout.driverId ? [loadout.driverId] : [];
  if (!isLoadoutComplete(loadout)) errors.push("Fill every required slot.");
  if (new Set(players).size !== players.length) errors.push("A player can only occupy one slot.");
  if (players.some((id) => !inventory.playerCardIds.includes(id))) errors.push("Remove cards that are no longer owned.");

  if (loadout.sport === "football") {
    if (new Set(loadout.actionCardIds).size !== loadout.actionCardIds.length) errors.push("Action cards cannot repeat.");
    if (loadout.actionCardIds.some((id) => !inventory.actionCardIds.includes(id))) errors.push("Remove action cards that are no longer owned.");
    if (loadout.attackers.some((id) => inventory.roles?.[id] !== "attacker")) errors.push("Attacker slots require attacker cards.");
    if (loadout.defenders.some((id) => inventory.roles?.[id] !== "defender")) errors.push("Defender slots require defender cards.");
    if (loadout.keeperId && inventory.roles?.[loadout.keeperId] !== "goalkeeper") errors.push("The keeper slot requires a goalkeeper.");
  }
  if (loadout.sport === "cricket" && loadout.batterIds.some((id) => inventory.roles?.[id] !== "batsman")) errors.push("The cricket lineup accepts batters only.");
  if (loadout.sport === "basketball") {
    const required: PlayerRole[] = ["basketballGuard", "basketballWing", "basketballBig"];
    if (loadout.playerIds.some((id, index) => inventory.roles?.[id] !== required[index])) errors.push("Select one guard, one wing, and one big.");
  }
  if (loadout.sport === "tennis" && loadout.playerId && inventory.roles?.[loadout.playerId] !== "tennisSingles") errors.push("Select a tennis athlete.");
  if (loadout.sport === "motorsport" && loadout.driverId && !["f1Driver", "f2Driver", "nascarDriver", "indycarDriver"].includes(inventory.roles?.[loadout.driverId] ?? "")) errors.push("Select a motorsport driver.");
  return [...new Set(errors)];
}
