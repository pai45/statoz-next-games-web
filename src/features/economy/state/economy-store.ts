"use client";

import { useSyncExternalStore } from "react";

import type { Sport } from "@/domain/sports";

import type {
  EconomyItemKind,
  EconomyOwned,
  EconomySnapshot,
  EconomyTransaction,
  PurchaseResult,
  StarterClaim,
} from "../types";

const storageKey = "statoz.next.games-web.economy.v1";
const legacyPacksKey = "statoz.next.games-web.packs.v1";
const transactionLimit = 250;
const rewardGuardLimit = 512;

const freeAvatarIds = [
  "adams",
  "bellingham",
  "raphinha",
  "camavinga",
  "ndiaye",
  "rodri",
];
const freeBannerIds = ["south_africa", "green_red", "korea", "czech"];

const emptyOwned = (): EconomyOwned => ({
  playerCardIds: [],
  actionCardIds: [],
  avatarIds: [...freeAvatarIds],
  bannerIds: [...freeBannerIds],
  frameIds: [],
  kitIds: ["voltage"],
  jerseyIds: ["statoz"],
  liveryIds: ["gridLine"],
});

function freshEconomy(): EconomySnapshot {
  return {
    version: 1,
    coins: 1000,
    owned: emptyOwned(),
    equipped: {
      avatarId: "adams",
      bannerId: "south_africa",
      frameId: null,
      kitId: "voltage",
      jerseyId: "statoz",
      liveryId: "gridLine",
    },
    starterClaims: {},
    dailyDropLastClaimedAt: null,
    transactions: [
      {
        id: "opening-balance",
        at: new Date(0).toISOString(),
        kind: "openingBalance",
        delta: 1000,
        balanceAfter: 1000,
        title: "OPENING BALANCE",
      },
    ],
    settledRewardIds: [],
  };
}

const serverSnapshot: EconomySnapshot = Object.freeze(freshEconomy());
const listeners = new Set<() => void>();
let cachedSignature: string | null = null;
let cachedValue: EconomySnapshot = serverSnapshot;
let volatileSnapshot: EconomySnapshot | null = null;
let storageUnavailable = false;

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : [];
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function coerceClaim(value: unknown): StarterClaim | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    claimedAt:
      typeof record.claimedAt === "string"
        ? record.claimedAt
        : new Date(0).toISOString(),
    playerCardIds: stringList(record.playerCardIds),
    actionCardIds: stringList(record.actionCardIds),
  };
}

function coerceClaims(value: unknown): EconomySnapshot["starterClaims"] {
  if (!value || typeof value !== "object") return {};
  const claims: EconomySnapshot["starterClaims"] = {};
  for (const sport of [
    "football",
    "cricket",
    "basketball",
    "tennis",
    "motorsport",
  ] as const) {
    const claim = coerceClaim((value as Record<string, unknown>)[sport]);
    if (claim) claims[sport] = claim;
  }
  return claims;
}

function coerceTransactions(value: unknown): EconomyTransaction[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is EconomyTransaction =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as EconomyTransaction).id === "string" &&
        typeof (entry as EconomyTransaction).delta === "number",
    )
    .slice(0, transactionLimit);
}

function mergeUnique(...lists: string[][]): string[] {
  return [...new Set(lists.flat())];
}

function coerceEconomy(value: unknown): EconomySnapshot {
  const defaults = freshEconomy();
  if (!value || typeof value !== "object") return defaults;
  const record = value as Record<string, unknown>;
  const owned =
    record.owned && typeof record.owned === "object"
      ? (record.owned as Record<string, unknown>)
      : {};
  const equipped =
    record.equipped && typeof record.equipped === "object"
      ? (record.equipped as Record<string, unknown>)
      : {};

  return {
    version: 1,
    coins: nonNegativeInteger(record.coins, defaults.coins),
    owned: {
      playerCardIds: stringList(owned.playerCardIds),
      actionCardIds: stringList(owned.actionCardIds),
      avatarIds: mergeUnique(freeAvatarIds, stringList(owned.avatarIds)),
      bannerIds: mergeUnique(freeBannerIds, stringList(owned.bannerIds)),
      frameIds: stringList(owned.frameIds),
      kitIds: mergeUnique(["voltage"], stringList(owned.kitIds)),
      jerseyIds: mergeUnique(["statoz"], stringList(owned.jerseyIds)),
      liveryIds: mergeUnique(["gridLine"], stringList(owned.liveryIds)),
    },
    equipped: {
      avatarId:
        typeof equipped.avatarId === "string" ? equipped.avatarId : "adams",
      bannerId:
        typeof equipped.bannerId === "string"
          ? equipped.bannerId
          : "south_africa",
      frameId: typeof equipped.frameId === "string" ? equipped.frameId : null,
      kitId: typeof equipped.kitId === "string" ? equipped.kitId : "voltage",
      jerseyId:
        typeof equipped.jerseyId === "string" ? equipped.jerseyId : "statoz",
      liveryId:
        typeof equipped.liveryId === "string" ? equipped.liveryId : "gridLine",
    },
    starterClaims: coerceClaims(record.starterClaims),
    dailyDropLastClaimedAt: typeof record.dailyDropLastClaimedAt === "number" &&
      Number.isFinite(record.dailyDropLastClaimedAt) && record.dailyDropLastClaimedAt >= 0
      ? record.dailyDropLastClaimedAt : null,
    transactions: coerceTransactions(record.transactions),
    settledRewardIds: stringList(record.settledRewardIds).slice(
      -rewardGuardLimit,
    ),
  };
}

function readStorage(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    storageUnavailable = false;
    return value;
  } catch {
    storageUnavailable = true;
    return null;
  }
}

function mergeLegacyClaims(
  snapshot: EconomySnapshot,
  legacyRaw: string | null,
): EconomySnapshot {
  if (!legacyRaw) return snapshot;
  let legacy: EconomySnapshot["starterClaims"];
  try {
    legacy = coerceClaims(JSON.parse(legacyRaw));
  } catch {
    return snapshot;
  }

  const claims = { ...legacy, ...snapshot.starterClaims };
  const claimValues = Object.values(claims).filter(
    (claim): claim is StarterClaim => claim !== undefined,
  );
  return {
    ...snapshot,
    owned: {
      ...snapshot.owned,
      playerCardIds: mergeUnique(
        snapshot.owned.playerCardIds,
        ...claimValues.map((claim) => claim.playerCardIds),
      ),
      actionCardIds: mergeUnique(
        snapshot.owned.actionCardIds,
        ...claimValues.map((claim) => claim.actionCardIds),
      ),
    },
    starterClaims: claims,
  };
}

function getSnapshot(): EconomySnapshot {
  // Some privacy modes and embedded browsers expose localStorage but reject
  // reads/writes. Keep the latest in-memory state alive rather than resetting
  // the wallet after every notification.
  if (storageUnavailable && volatileSnapshot) return volatileSnapshot;
  const raw = readStorage(storageKey);
  const legacyRaw = readStorage(legacyPacksKey);
  const signature = `${raw ?? ""}\u0000${legacyRaw ?? ""}`;
  if (signature === cachedSignature) return cachedValue;
  cachedSignature = signature;

  try {
    cachedValue = mergeLegacyClaims(
      raw ? coerceEconomy(JSON.parse(raw)) : freshEconomy(),
      legacyRaw,
    );
  } catch {
    cachedValue = mergeLegacyClaims(freshEconomy(), legacyRaw);
  }
  return cachedValue;
}

function notify(): void {
  cachedSignature = null;
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === storageKey ||
      event.key === legacyPacksKey ||
      event.key === null
    ) {
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: EconomySnapshot): EconomySnapshot {
  const safe = coerceEconomy(next);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(safe));
    volatileSnapshot = null;
    storageUnavailable = false;
  } catch {
    volatileSnapshot = safe;
    storageUnavailable = true;
    cachedValue = safe;
  }
  notify();
  return safe;
}

function transaction(
  snapshot: EconomySnapshot,
  entry: Omit<EconomyTransaction, "at" | "balanceAfter">,
): EconomyTransaction[] {
  return [
    {
      ...entry,
      at: new Date().toISOString(),
      balanceAfter: snapshot.coins + entry.delta,
    },
    ...snapshot.transactions,
  ].slice(0, transactionLimit);
}

const ownedKey: Record<EconomyItemKind, keyof EconomyOwned> = {
  playerCard: "playerCardIds",
  actionCard: "actionCardIds",
  avatar: "avatarIds",
  banner: "bannerIds",
  frame: "frameIds",
  kit: "kitIds",
  jersey: "jerseyIds",
  livery: "liveryIds",
};

export function readEconomy(): EconomySnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  return getSnapshot();
}

export function useEconomy(): EconomySnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function useIsEconomyHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function owns(kind: EconomyItemKind, id: string): boolean {
  return readEconomy().owned[ownedKey[kind]].includes(id);
}

export function purchaseItem(input: {
  kind: EconomyItemKind;
  id: string;
  price: number;
  title: string;
  simulatedInr?: boolean;
}): PurchaseResult {
  const current = readEconomy();
  const key = ownedKey[input.kind];
  if (current.owned[key].includes(input.id)) {
    return { ok: false, reason: "owned", snapshot: current };
  }
  const price = Math.max(0, Math.floor(input.price));
  if (!input.simulatedInr && current.coins < price) {
    return { ok: false, reason: "insufficient", snapshot: current };
  }
  const delta = input.simulatedInr ? 0 : -price;
  const next = write({
    ...current,
    coins: current.coins + delta,
    owned: { ...current.owned, [key]: [...current.owned[key], input.id] },
    transactions: transaction(current, {
      id: `purchase-${input.kind}-${input.id}-${Date.now()}`,
      kind: "purchase",
      delta,
      title: input.simulatedInr ? "DEMO PURCHASE" : "SHOP PURCHASE",
      subtitle: input.title,
    }),
  });
  return { ok: true, snapshot: next };
}

/**
 * Charges coins for something that grants no item — a quiz set's entry fee.
 *
 * `purchaseItem` is the wrong shape for it: there is nothing to own afterwards
 * and nothing to refuse as already-owned, so a second attempt at the same set
 * must be allowed to charge again. The only way this fails is not affording it.
 */
export function spendCoins(input: {
  id: string;
  coins: number;
  title: string;
  subtitle?: string;
}): PurchaseResult {
  const current = readEconomy();
  const price = Math.max(0, Math.floor(input.coins));
  if (current.coins < price) {
    return { ok: false, reason: "insufficient", snapshot: current };
  }
  const next = write({
    ...current,
    coins: current.coins - price,
    transactions: transaction(current, {
      id: `${input.id}-${Date.now()}`,
      kind: "purchase",
      delta: -price,
      title: input.title,
      subtitle: input.subtitle,
    }),
  });
  return { ok: true, snapshot: next };
}

export function addCoinTopUp(input: {
  id: string;
  coins: number;
  title: string;
}): EconomySnapshot {
  const current = readEconomy();
  const amount = Math.max(0, Math.floor(input.coins));
  return write({
    ...current,
    coins: current.coins + amount,
    transactions: transaction(current, {
      id: `top-up-${input.id}-${Date.now()}`,
      kind: "topUp",
      delta: amount,
      title: "DEMO COIN TOP-UP",
      subtitle: input.title,
    }),
  });
}

/** One shared daily claim; inventory and cooldown are committed together. */
export function claimDailyDrop(input: {
  sport: Sport;
  playerCardIds: string[];
  actionCardIds: string[];
}): boolean {
  const current = readEconomy();
  const now = Date.now();
  if (current.dailyDropLastClaimedAt !== null &&
      now - current.dailyDropLastClaimedAt < 24 * 60 * 60 * 1000) return false;
  if (input.playerCardIds.length + input.actionCardIds.length !== 1) return false;
  write({
    ...current,
    dailyDropLastClaimedAt: now,
    owned: {
      ...current.owned,
      playerCardIds: mergeUnique(current.owned.playerCardIds, input.playerCardIds),
      actionCardIds: mergeUnique(current.owned.actionCardIds, input.actionCardIds),
    },
    transactions: transaction(current, {
      id: `daily-drop-${now}`,
      kind: "grant",
      delta: 0,
      title: "DAILY DROP",
      subtitle: input.sport.toUpperCase(),
    }),
  });
  return true;
}

export function grantCards(input: {
  /** Stable id for one-time grants such as a streak milestone. */
  id?: string;
  playerCardIds?: string[];
  actionCardIds?: string[];
  title: string;
}): EconomySnapshot {
  const current = readEconomy();
  if (input.id && current.settledRewardIds.includes(input.id)) return current;
  return write({
    ...current,
    settledRewardIds: input.id
      ? [...current.settledRewardIds, input.id].slice(-rewardGuardLimit)
      : current.settledRewardIds,
    owned: {
      ...current.owned,
      playerCardIds: mergeUnique(
        current.owned.playerCardIds,
        input.playerCardIds ?? [],
      ),
      actionCardIds: mergeUnique(
        current.owned.actionCardIds,
        input.actionCardIds ?? [],
      ),
    },
    transactions: transaction(current, {
      id: input.id ? `grant-${input.id}` : `grant-${Date.now()}`,
      kind: "grant",
      delta: 0,
      title: input.title,
    }),
  });
}

/** Atomically pays for a repeatable pack and grants its unique inventory ids. */
export function purchasePack(input: {
  id: string;
  price: number;
  title: string;
  playerCardIds: string[];
  actionCardIds: string[];
  simulatedInr?: boolean;
}): PurchaseResult {
  const current = readEconomy();
  const price = Math.max(0, Math.floor(input.price));
  if (!input.simulatedInr && current.coins < price) {
    return { ok: false, reason: "insufficient", snapshot: current };
  }
  const delta = input.simulatedInr ? 0 : -price;
  const next = write({
    ...current,
    coins: current.coins + delta,
    owned: {
      ...current.owned,
      playerCardIds: mergeUnique(current.owned.playerCardIds, input.playerCardIds),
      actionCardIds: mergeUnique(current.owned.actionCardIds, input.actionCardIds),
    },
    transactions: transaction(current, {
      id: `pack-${input.id}-${Date.now()}`,
      kind: "purchase",
      delta,
      title: input.simulatedInr ? "DEMO PACK PURCHASE" : "PACK PURCHASE",
      subtitle: input.title,
    }),
  });
  return { ok: true, snapshot: next };
}

export function claimStarterPack(
  sport: Sport,
  claim: StarterClaim,
): EconomySnapshot {
  const current = readEconomy();
  if (current.starterClaims[sport]) return current;
  return write({
    ...current,
    owned: {
      ...current.owned,
      playerCardIds: mergeUnique(
        current.owned.playerCardIds,
        claim.playerCardIds,
      ),
      actionCardIds: mergeUnique(
        current.owned.actionCardIds,
        claim.actionCardIds,
      ),
    },
    starterClaims: { ...current.starterClaims, [sport]: claim },
    transactions: transaction(current, {
      id: `starter-${sport}`,
      kind: "grant",
      delta: 0,
      title: "STARTER PACK",
      subtitle: sport.toUpperCase(),
    }),
  });
}

export function settleCoinReward(input: {
  id: string;
  coins: number;
  title: string;
  subtitle?: string;
}): EconomySnapshot {
  const current = readEconomy();
  if (current.settledRewardIds.includes(input.id)) return current;
  const amount = Math.max(0, Math.floor(input.coins));
  return write({
    ...current,
    coins: current.coins + amount,
    settledRewardIds: [...current.settledRewardIds, input.id].slice(
      -rewardGuardLimit,
    ),
    transactions: transaction(current, {
      id: `reward-${input.id}`,
      kind: "reward",
      delta: amount,
      title: input.title,
      subtitle: input.subtitle,
    }),
  });
}

export function equipCosmetic(
  kind: "avatar" | "banner" | "frame" | "kit" | "jersey" | "livery",
  id: string | null,
): EconomySnapshot {
  const current = readEconomy();
  if (kind !== "frame" && id === null) return current;
  if (id !== null && !owns(kind, id)) return current;
  const equippedKey = `${kind}Id` as keyof EconomySnapshot["equipped"];
  return write({
    ...current,
    equipped: { ...current.equipped, [equippedKey]: id },
  });
}

export function resetEconomy(): void {
  write(freshEconomy());
}

/** Clears only the first-entry gates; inventory and wallet remain recoverable. */
export function resetStarterClaims(): EconomySnapshot {
  const current = readEconomy();
  return write({ ...current, starterClaims: {} });
}
