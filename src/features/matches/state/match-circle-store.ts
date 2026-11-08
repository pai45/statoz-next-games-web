"use client";

import { useSyncExternalStore } from "react";

import {
  matchCirclePostMaxLength,
  matchCircleThreadKey,
  postById,
  type MatchCircleAuthor,
  type MatchCirclePost,
  type MatchCircleThread,
  type SportMatch,
} from "@/domain/matches";
import { seedMatchCircleThread } from "@/mocks/matches";

/**
 * Every match discussion this browser holds, keyed by thread.
 *
 * A thread is seeded the first time a fixture is opened and then belongs to
 * the player: their comments, replies, likes, edits and deletions all live
 * here. The seeded regulars never change, so a thread always has something in
 * it to answer.
 */

export type MatchCircleSnapshot = {
  version: 1;
  hydrated: boolean;
  threads: Record<string, MatchCircleThread>;
};

export type CircleWriteResult = { ok: true } | { ok: false; reason: string };

const storageKey = "statoz.next.games-web.matchcircle.v1";
const listeners = new Set<() => void>();
const serverSnapshot: MatchCircleSnapshot = Object.freeze({
  version: 1,
  hydrated: false,
  threads: Object.freeze({}) as Record<string, MatchCircleThread>,
});
let current: MatchCircleSnapshot | null = null;

function coerce(value: unknown): Record<string, MatchCircleThread> {
  if (value == null || typeof value !== "object") return {};
  const threads: Record<string, MatchCircleThread> = {};
  for (const [key, thread] of Object.entries(value as Record<string, unknown>)) {
    if (thread == null || typeof thread !== "object") continue;
    const candidate = thread as MatchCircleThread;
    if (typeof candidate.key !== "string" || !Array.isArray(candidate.posts)) continue;
    threads[key] = candidate;
  }
  return threads;
}

function load(): MatchCircleSnapshot {
  let threads: Record<string, MatchCircleThread> = {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) threads = coerce((JSON.parse(raw) as { threads?: unknown }).threads);
  } catch {
    // Private mode keeps the conversation in memory for this session.
  }
  return { ...serverSnapshot, hydrated: true, threads };
}

function getSnapshot(): MatchCircleSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  current ??= load();
  return current;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function write(threads: Record<string, MatchCircleThread>): void {
  current = { ...getSnapshot(), hydrated: true, threads };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, threads }));
  } catch {
    // Keep the in-memory state; the next read falls back to the seed.
  }
  notify();
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

function onStorage(event: StorageEvent): void {
  if (event.key !== storageKey && event.key !== null) return;
  current = load();
  notify();
}

export function useMatchCircle(): MatchCircleSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

/**
 * The thread for a fixture. Seeded on the spot when the player has never
 * opened it, so reading is enough to have a conversation to join.
 */
export function threadFor(snapshot: MatchCircleSnapshot, match: SportMatch): MatchCircleThread {
  const stored = snapshot.threads[matchCircleThreadKey(match)];
  if (!stored) return seedMatchCircleThread(match);
  // A thread written before the sport and league were recorded gets them back.
  return stored.sport && stored.leagueId
    ? stored
    : { ...stored, sport: match.sport, leagueId: match.leagueId };
}

/* ---- Writing --------------------------------------------------------------- */

/**
 * Every write goes through here: it reads the thread, lets the caller either
 * refuse or hand back the next set of posts, and only then persists. A refusal
 * leaves the stored thread exactly as it was, which is what lets a composer
 * keep its draft while the screen shows why nothing happened.
 */
function commit(
  match: SportMatch,
  next: (thread: MatchCircleThread) => MatchCirclePost[] | CircleWriteResult,
): CircleWriteResult {
  const snapshot = getSnapshot();
  const thread = threadFor(snapshot, match);
  const result = next(thread);
  if (!Array.isArray(result)) return result;
  write({
    ...snapshot.threads,
    [thread.key]: { ...thread, posts: result, updatedAt: new Date().toISOString() },
  });
  return { ok: true };
}

const gone: CircleWriteResult = { ok: false, reason: "That comment is no longer available." };
const notYours: CircleWriteResult = {
  ok: false,
  reason: "You can only change your own comments.",
};

function validate(text: string): CircleWriteResult {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, reason: "Write something first." };
  if (trimmed.length > matchCirclePostMaxLength) {
    return { ok: false, reason: "Comments can be up to 500 characters." };
  }
  return { ok: true };
}

/** The post a write names, or the reason it cannot be written to. */
function livePost(
  thread: MatchCircleThread,
  postId: string,
): MatchCirclePost | CircleWriteResult {
  const post = postById(thread, postId);
  return post && !post.isDeleted ? post : gone;
}

function newPost(
  thread: MatchCircleThread,
  author: MatchCircleAuthor,
  text: string,
  parentId?: string,
): MatchCirclePost {
  return {
    id: `${thread.key}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    threadKey: thread.key,
    parentId,
    author,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: [],
    isDeleted: false,
  };
}

export function addComment(
  match: SportMatch,
  author: MatchCircleAuthor,
  text: string,
): CircleWriteResult {
  const checked = validate(text);
  if (!checked.ok) return checked;
  return commit(match, (thread) => [...thread.posts, newPost(thread, author, text)]);
}

/**
 * A reply hangs off a top-level comment and nothing else, so the thread never
 * grows a third level. The screen re-points a reply-to-a-reply at the comment
 * they share; this refuses anything that still arrives pointing at a reply.
 */
export function addReply(
  match: SportMatch,
  author: MatchCircleAuthor,
  parentId: string,
  text: string,
): CircleWriteResult {
  const checked = validate(text);
  if (!checked.ok) return checked;
  return commit(match, (thread) => {
    const parent = livePost(thread, parentId);
    if (!("id" in parent)) return parent;
    if (parent.parentId != null) {
      return { ok: false, reason: "Replies can only be added to a main comment." };
    }
    return [...thread.posts, newPost(thread, author, text, parent.id)];
  });
}

export function toggleLike(
  match: SportMatch,
  authorId: string,
  postId: string,
): CircleWriteResult {
  return commit(match, (thread) => {
    const target = livePost(thread, postId);
    if (!("id" in target)) return target;
    const liked = target.likedBy.includes(authorId);
    return thread.posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            likes: liked ? Math.max(0, post.likes - 1) : post.likes + 1,
            likedBy: liked
              ? post.likedBy.filter((id) => id !== authorId)
              : [...post.likedBy, authorId],
          }
        : post,
    );
  });
}

export function editPost(
  match: SportMatch,
  authorId: string,
  postId: string,
  text: string,
): CircleWriteResult {
  const checked = validate(text);
  if (!checked.ok) return checked;
  return commit(match, (thread) => {
    const target = livePost(thread, postId);
    if (!("id" in target)) return target;
    if (target.author.id !== authorId) return notYours;
    return thread.posts.map((post) =>
      post.id === postId
        ? { ...post, text: text.trim(), editedAt: new Date().toISOString() }
        : post,
    );
  });
}

/**
 * Deleting removes a post outright, except a comment that still has replies
 * under it: that one stays as a tombstone so the answers keep their question.
 * Removing the last of those replies takes the tombstone with it.
 */
export function deletePost(
  match: SportMatch,
  authorId: string,
  postId: string,
): CircleWriteResult {
  return commit(match, (thread) => {
    const target = livePost(thread, postId);
    if (!("id" in target)) return target;
    if (target.author.id !== authorId) return notYours;

    const remaining = thread.posts.filter((post) => post.id !== postId);
    const answered = (parentId: string) =>
      remaining.some((post) => post.parentId === parentId && !post.isDeleted);

    if (target.parentId != null) {
      const parentId = target.parentId;
      return answered(parentId)
        ? remaining
        : remaining.filter((post) => !(post.id === parentId && post.isDeleted));
    }

    return answered(postId)
      ? thread.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                text: "",
                editedAt: undefined,
                likes: 0,
                likedBy: [],
                isDeleted: true,
              }
            : post,
        )
      : remaining;
  });
}
