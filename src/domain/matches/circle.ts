import type { Sport } from "../sports";

import type { SportMatch } from "./match";

/**
 * The discussion behind a fixture: one thread per match, top-level comments
 * with a single level of replies under each.
 *
 * A deleted comment is kept rather than removed, because a reply to it would
 * otherwise lose its context — it becomes a tombstone, and disappears entirely
 * once nothing is hanging off it.
 */

/** The longest a single post can be. */
export const matchCirclePostMaxLength = 500;

export type MatchCircleAuthor = {
  id: string;
  displayName: string;
  /** A face from the avatar catalogue. */
  avatarId: string;
  playerTag?: string;
};

export type MatchCirclePost = {
  id: string;
  threadKey: string;
  /** Set on a reply, naming the comment it hangs under. */
  parentId?: string;
  author: MatchCircleAuthor;
  text: string;
  /** ISO 8601. */
  createdAt: string;
  editedAt?: string;
  likes: number;
  likedBy: string[];
  isDeleted: boolean;
};

export type MatchCircleThread = {
  key: string;
  sport: Sport;
  leagueId: string;
  matchId: string;
  posts: MatchCirclePost[];
  seededAt: string;
  updatedAt: string;
};

/**
 * The key a thread is stored under. Motorsport still writes `f1`, so threads
 * saved before the sport was renamed are not orphaned.
 */
export function matchCircleThreadKey(match: SportMatch): string {
  const sport = match.sport === "motorsport" ? "f1" : match.sport;
  return `${sport}:${match.leagueId}:${match.id}`;
}

/** The count the call-to-action carries: 940, 1.2K, 3M. */
export function compactMatchCircleCount(count: number): string {
  if (count < 1000) return String(count);
  const [value, suffix] = count < 1_000_000 ? [count / 1000, "K"] : [count / 1_000_000, "M"];
  const rounded = Math.round(value);
  return `${value === rounded ? rounded : value.toFixed(1)}${suffix}`;
}

/**
 * Visible top-level comments, newest first. A deleted parent survives only
 * while it still has a visible reply beneath it.
 */
export function topLevelPosts(thread: MatchCircleThread): MatchCirclePost[] {
  const answered = new Set(
    thread.posts
      .filter((post) => post.parentId != null && !post.isDeleted)
      .map((post) => post.parentId as string),
  );
  return thread.posts
    .filter((post) => post.parentId == null && (!post.isDeleted || answered.has(post.id)))
    .toSorted((a, b) => {
      const byTime = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
    });
}

/** Visible replies to one comment, oldest first. */
export function repliesFor(thread: MatchCircleThread, parentId: string): MatchCirclePost[] {
  return thread.posts
    .filter((post) => post.parentId === parentId && !post.isDeleted)
    .toSorted((a, b) => {
      const byTime = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
    });
}

/** Everything still standing, replies included. */
export function visibleCount(thread: MatchCircleThread): number {
  return thread.posts.filter((post) => !post.isDeleted).length;
}

export function postById(
  thread: MatchCircleThread,
  postId: string,
): MatchCirclePost | undefined {
  return thread.posts.find((post) => post.id === postId);
}
