"use client";

import { useMemo, useSyncExternalStore } from "react";

import { rivalIsOnline } from "@/features/leaderboard";

/**
 * The player's friends list, kept in browser storage.
 *
 * There is no backend, so a friend is a personal bookmark: a rival's display
 * name, added from the arena's search or from their dossier. The store keeps
 * the same shape the other features use — a versioned key, a frozen server
 * snapshot, and a `storage` listener so a second tab moves this one.
 */

const storageKey = "statoz.next.games-web.friends.v1";

export type FriendsSnapshot = {
  version: 1;
  hydrated: boolean;
  /** Display names, in the order they were added. */
  friends: string[];
};

const serverSnapshot: FriendsSnapshot = Object.freeze({
  version: 1,
  hydrated: false,
  friends: Object.freeze([]) as unknown as string[],
});

let current: FriendsSnapshot | null = null;
const listeners = new Set<() => void>();

function coerce(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value.filter((entry): entry is string => typeof entry === "string");
  // A name can only appear once; a duplicate would rank twice on the board.
  return [...new Set(names)];
}

function load(): FriendsSnapshot {
  let friends: string[] = [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) friends = coerce((JSON.parse(raw) as { friends?: unknown }).friends);
  } catch {
    // A private window refusing storage keeps this session in memory.
  }
  return { ...serverSnapshot, hydrated: true, friends };
}

function getSnapshot(): FriendsSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  current ??= load();
  return current;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function write(friends: string[]): FriendsSnapshot {
  current = { ...getSnapshot(), hydrated: true, friends };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, friends }));
  } catch {
    // Storage refused; the list still stands for this session.
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

export function useFriends(): FriendsSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function readFriends(): FriendsSnapshot {
  return getSnapshot();
}

export function isFriend(snapshot: FriendsSnapshot, name: string): boolean {
  return snapshot.friends.includes(name);
}

export function addFriend(name: string): void {
  const snapshot = getSnapshot();
  if (snapshot.friends.includes(name)) return;
  write([...snapshot.friends, name]);
}

export function removeFriend(name: string): void {
  const snapshot = getSnapshot();
  if (!snapshot.friends.includes(name)) return;
  write(snapshot.friends.filter((friend) => friend !== name));
}

/**
 * Adds the friend if absent, removes them if present, and reports the new
 * membership so the caller can say which of the two just happened.
 */
export function toggleFriend(name: string): boolean {
  const nowFriend = !getSnapshot().friends.includes(name);
  if (nowFriend) addFriend(name);
  else removeFriend(name);
  return nowFriend;
}

export function resetFriends(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to an empty list.
  }
  current = null;
  notify();
}

export type FriendCounts = { total: number; online: number };

/** What the profile's FRIENDS pill counts. */
export function useFriendCounts(): FriendCounts {
  const snapshot = useFriends();
  return useMemo(
    () => ({
      total: snapshot.friends.length,
      online: snapshot.friends.filter(rivalIsOnline).length,
    }),
    [snapshot],
  );
}
