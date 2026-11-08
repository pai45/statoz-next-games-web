"use client";

import { useMemo, useSyncExternalStore } from "react";

import { settleCoinReward } from "@/features/economy";

import type { ReferralEntry, ReferralTotals } from "../types";

/**
 * The player's invites, kept in browser storage.
 *
 * The app seeds two demo entries on first load so the screen has something to
 * show before anyone has actually been invited, and pays 500 Oz the moment a
 * pending invite turns into a join. Both are reproduced here; the payout goes
 * through the economy's settled-reward ledger, so an entry can only ever pay
 * once no matter how often it is replayed.
 */

const storageKey = "statoz.next.games-web.referrals.v1";

/** What one friend joining is worth. */
export const referralRewardOz = 500;

export type ReferralsSnapshot = {
  version: 1;
  hydrated: boolean;
  entries: ReferralEntry[];
};

/**
 * The two entries the demo opens with: one invite still out, one about to pay.
 *
 * The app dates these two and one day back from "now"; the web's are dated from
 * the day the browser first opens the screen, which is the same idea without a
 * server to disagree with.
 */
function seededEntries(): ReferralEntry[] {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return [
    {
      id: "ref-novaq",
      friendName: "NovaQ",
      status: "invited",
      createdAt: new Date(now - 2 * day).toISOString(),
      reward: 0,
    },
    {
      id: "ref-vortex",
      friendName: "Vortex",
      status: "pending",
      createdAt: new Date(now - day).toISOString(),
      reward: 0,
    },
  ];
}

const serverSnapshot: ReferralsSnapshot = Object.freeze({
  version: 1,
  hydrated: false,
  entries: Object.freeze([]) as unknown as ReferralEntry[],
});

let current: ReferralsSnapshot | null = null;
const listeners = new Set<() => void>();

function coerce(value: unknown): ReferralEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: ReferralEntry[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as Partial<ReferralEntry>;
    if (typeof record.id !== "string" || typeof record.friendName !== "string") continue;
    entries.push({
      id: record.id,
      friendName: record.friendName,
      status:
        record.status === "pending" || record.status === "rewarded" ? record.status : "invited",
      createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
      reward: typeof record.reward === "number" ? record.reward : 0,
    });
  }
  return entries;
}

function load(): ReferralsSnapshot {
  let entries: ReferralEntry[] | null = null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) entries = coerce((JSON.parse(raw) as { entries?: unknown }).entries);
  } catch {
    // A private window refusing storage keeps this session in memory.
  }
  return { ...serverSnapshot, hydrated: true, entries: entries ?? seededEntries() };
}

function getSnapshot(): ReferralsSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  current ??= load();
  return current;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function write(entries: ReferralEntry[]): ReferralsSnapshot {
  current = { ...getSnapshot(), hydrated: true, entries };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, entries }));
  } catch {
    // Storage refused; the entries still stand for this session.
  }
  notify();
  return current;
}

function onStorage(event: StorageEvent): void {
  if (event.key === storageKey || event.key === null) {
    current = load();
    notify();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useReferrals(): ReferralsSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function readReferrals(): ReferralsSnapshot {
  return getSnapshot();
}

export function referralTotals(snapshot: ReferralsSnapshot): ReferralTotals {
  return {
    invited: snapshot.entries.length,
    pending: snapshot.entries.filter((entry) => entry.status === "pending").length,
    rewarded: snapshot.entries.filter((entry) => entry.status === "rewarded").length,
    coinsEarned: snapshot.entries.reduce((sum, entry) => sum + entry.reward, 0),
  };
}

export function useReferralTotals(): ReferralTotals {
  const snapshot = useReferrals();
  return useMemo(() => referralTotals(snapshot), [snapshot]);
}

/** The player's own invite link, built from their shareable tag. */
export function referralLink(playerTag: string | null): string {
  return playerTag === null ? "" : `https://play.statoz.app/invite?ref=${playerTag}`;
}

/**
 * Turns the oldest pending invite into a join and pays for it.
 *
 * Returns the entry that was rewarded, or null when nothing was pending — the
 * caller only plays the celebration for a real payout.
 */
export function simulateFriendJoined(): ReferralEntry | null {
  const snapshot = getSnapshot();
  const index = snapshot.entries.findIndex((entry) => entry.status === "pending");
  if (index < 0) return null;

  const rewarded: ReferralEntry = {
    ...snapshot.entries[index],
    status: "rewarded",
    reward: referralRewardOz,
  };
  const entries = [...snapshot.entries];
  entries[index] = rewarded;
  write(entries);

  settleCoinReward({
    id: `referral-${rewarded.id}`,
    coins: referralRewardOz,
    title: "FRIEND REFERRAL",
    subtitle: rewarded.friendName,
  });
  return rewarded;
}

export function resetReferrals(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to the seeded pair.
  }
  current = null;
  notify();
}
