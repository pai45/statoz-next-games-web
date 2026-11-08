"use client";

import { useSyncExternalStore } from "react";

import type { Sport } from "@/domain/sports";
import { randomPlayerTag } from "@/shared/utils";

import type { ProfileIdentity } from "../types";
import { parseProfilePreferences, type ProfilePreferences } from "./profile-preferences";

/**
 * Who the player is, kept in this browser.
 *
 * Flutter spreads the same values over eight `SecureGameStorage` keys and reads
 * them back with a `Future` per widget, which is why its profile flickers in a
 * field at a time. One record read synchronously is both simpler and steadier,
 * and it means a half-finished write can never leave the avatar disagreeing
 * with the banner.
 *
 * Built on the versioned-key, frozen-default, cached-parse shape the packs
 * feature established, so every browser-local store in the app behaves the
 * same way.
 */

const storageKey = "statoz.next.games-web.profile.v1";

/** What an untouched browser looks like — and what the server always sees. */
const noIdentity: ProfileIdentity = Object.freeze({
  displayName: "",
  avatarId: "",
  bannerId: "",
  primarySport: "football",
  followedLeagueIds: Object.freeze([]) as unknown as string[],
  favoriteTeams: Object.freeze({}) as Record<string, string>,
  playerTag: null,
  timeZoneId: null,
});

/**
 * `useSyncExternalStore` compares snapshots by reference, so the parsed value is
 * cached and only replaced when the stored text actually changes.
 */
let cachedRaw: string | null = null;
let cachedValue: ProfileIdentity = noIdentity;

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // A private window can refuse storage outright. Nobody is set up, then.
    return null;
  }
}

/** Narrows whatever was stored, field by field, to the record we expect. */
function parse(raw: string): ProfileIdentity {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return noIdentity;
  const record = parsed as Record<string, unknown>;

  const teams: Record<string, string> = {};
  if (record.favoriteTeams && typeof record.favoriteTeams === "object") {
    for (const [league, team] of Object.entries(
      record.favoriteTeams as Record<string, unknown>,
    )) {
      if (typeof team === "string") teams[league] = team;
    }
  }

  return {
    ...parseProfilePreferences(record),
    displayName: typeof record.displayName === "string" ? record.displayName.trim() : "",
    avatarId: typeof record.avatarId === "string" ? record.avatarId : "",
    bannerId: typeof record.bannerId === "string" ? record.bannerId : "",
    primarySport:
      typeof record.primarySport === "string"
        ? (record.primarySport as Sport)
        : "football",
    followedLeagueIds: Array.isArray(record.followedLeagueIds)
      ? record.followedLeagueIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    favoriteTeams: teams,
    playerTag: typeof record.playerTag === "string" ? record.playerTag : null,
    timeZoneId: typeof record.timeZoneId === "string" ? record.timeZoneId : null,
  };
}

function getSnapshot(): ProfileIdentity {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  if (!raw) {
    cachedValue = noIdentity;
    return cachedValue;
  }

  try {
    cachedValue = parse(raw);
  } catch {
    // Unreadable state is treated as no state rather than crashing the route.
    cachedValue = noIdentity;
  }
  return cachedValue;
}

function getServerSnapshot(): ProfileIdentity {
  return noIdentity;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Editing the profile in another tab should settle this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: ProfileIdentity): boolean {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    return false;
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
  return true;
}

/** Merges a partial edit into what is already stored. */
function patch(changes: Partial<ProfileIdentity>): void {
  write({ ...getSnapshot(), ...changes });
}

/* ---- The player tag ------------------------------------------------------ */

/**
 * The player's tag, minting one on first call.
 *
 * Browser-only: the mint draws a random seed, so calling it during a server
 * render would produce a tag the client then disagrees with.
 */
export function loadOrCreatePlayerTag(): string {
  const current = getSnapshot();
  if (current.playerTag) return current.playerTag;
  const tag = randomPlayerTag();
  patch({ playerTag: tag });
  return tag;
}

/* ---- Hooks and writers --------------------------------------------------- */

const neverChanges = () => () => {};

/**
 * False on the server and through the first client render, true afterwards.
 *
 * The profile needs it twice: the tag is minted lazily, and an identity read
 * before hydration is the empty one, which would otherwise paint a set-up
 * player as brand new for a frame.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

/** Everything this browser knows about the player. */
export function useProfileIdentity(): ProfileIdentity {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function readProfileIdentity(): ProfileIdentity {
  return getSnapshot();
}

export function saveAvatar(avatarId: string): void {
  patch({ avatarId });
}

export function saveBanner(bannerId: string): void {
  patch({ bannerId });
}

/** One identity write for the Locker, without touching XP or game saves. */
export function saveHubPreferences(changes: ProfilePreferences & Partial<Pick<ProfileIdentity, "avatarId" | "bannerId">>): boolean {
  return write({ ...getSnapshot(), ...changes });
}

export function saveTimeZone(timeZoneId: string): void {
  patch({ timeZoneId });
}

/** The clubs editor commits all three of its fields together or not at all. */
export function saveFollowing(following: {
  primarySport: Sport;
  followedLeagueIds: string[];
  favoriteTeams: Record<string, string>;
}): void {
  patch(following);
}

/** What finishing onboarding hands over, in one write. */
export function saveProfileSetup(setup: {
  displayName: string;
  avatarId: string;
  bannerId: string;
  primarySport: Sport;
  followedLeagueIds: string[];
  favoriteTeams: Record<string, string>;
}): void {
  patch(setup);
}

/**
 * Forgets the setup choices and nothing else — the same promise the log-out
 * dialog makes. Cards, matches and mode progress live in their own keys and are
 * untouched.
 */
export function resetProfileIdentity(): void {
  write(noIdentity);
}
