"use client";

import { usePathname } from "next/navigation";

import { Breadcrumbs, type BreadcrumbItem } from "@statoz/design-system/games";

const HOME: BreadcrumbItem = { label: "HOME", href: "/" };

const segmentLabels: Record<string, string> = {
  basketball: "BASKETBALL",
  bug: "BUG REPORT",
  cricket: "CRICKET",
  feature: "FEATURE REQUEST",
  feedback: "FEEDBACK",
  football: "FOOTBALL",
  "football-bingo": "BINGO GRID",
  "football-chess": "FOOTBALL CHESS",
  "hoop-duel": "HOOP DUEL",
  mismatch: "DATA MISMATCH",
  motorsport: "MOTORSPORT",
  "penalty-shootout": "PENALTY SHOOTOUT",
  pick: "PICK",
  "pitch-duel": "FOT DUEL",
  predict: "PREDICT",
  shoutout: "SHOUTOUT",
  tennis: "TENNIS",
};

function labelFor(segment: string): string {
  if (segmentLabels[segment]) return segmentLabels[segment];

  try {
    return decodeURIComponent(segment).replaceAll("-", " ").toUpperCase();
  } catch {
    return segment.replaceAll("-", " ").toUpperCase();
  }
}

/** Maps every platform route to the user-facing hierarchy shown below the top bar. */
export function breadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const [section, detail, leaf, item] = pathname.split("/").filter(Boolean);
  if (!section) return [];

  switch (section) {
    case "cards":
      return [HOME, { label: "PROFILE", href: "/profile" }, { label: "ALL CARDS" }];
    case "decks":
      return detail
        ? [HOME, { label: "DECK LOCKER", href: "/decks" }, { label: `${labelFor(detail)} LOADOUT` }]
        : [HOME, { label: "DECK LOCKER" }];
    case "friends":
      return detail === "referrals"
        ? [HOME, { label: "FRIENDS", href: "/friends" }, { label: "REFER A FRIEND" }]
        : [HOME, { label: "PROFILE", href: "/profile" }, { label: "FRIENDS" }];
    case "games":
      return [HOME, { label: `${labelFor(detail ?? "games")} GAMES` }];
    case "how-to-play":
      return detail
        ? [HOME, { label: "HOW TO PLAY", href: "/how-to-play" }, { label: labelFor(detail) }]
        : [HOME, { label: "HOW TO PLAY" }];
    case "leaderboard":
    case "shop":
      return [];
    case "leagues":
      return leaf === "teams" && item
        ? [HOME, { label: `${labelFor(detail ?? "league")} HUB`, href: `/leagues/${detail}` }, { label: `${labelFor(item)} DETAILS` }]
        : [HOME, { label: `${labelFor(detail ?? "league")} HUB` }];
    case "matches":
      if (detail === "search") return [HOME, { label: "MATCH SEARCH" }];
      if (leaf === "circle") {
        return [
          HOME,
          { label: "MATCH DETAILS", href: `/matches/${detail}` },
          { label: "MATCH CIRCLE" },
        ];
      }
      return [HOME, { label: "MATCH DETAILS" }];
    case "picks":
      return detail
        ? [HOME, { label: "PICKS", href: "/picks" }, { label: "MARKET DETAILS" }]
        : [HOME, { label: "PICKS" }];
    case "profile":
      if (!detail) return [];
      if (detail === "history" && leaf) {
        return [
          HOME,
          { label: "PROFILE", href: "/profile" },
          { label: "HISTORY", href: "/profile/history" },
          { label: `${labelFor(leaf)} RESULTS` },
        ];
      }
      if (detail === "talk-to-statoz" && leaf) {
        return [
          HOME,
          { label: "PROFILE", href: "/profile" },
          { label: "TALK TO STATOZ", href: "/profile/talk-to-statoz" },
          { label: labelFor(leaf) },
        ];
      }
      if (detail === "talk-to-statoz") {
        return [HOME, { label: "PROFILE", href: "/profile" }, { label: "TALK TO STATOZ" }];
      }
      if (detail === "xp") {
        return [HOME, { label: "PROFILE", href: "/profile" }, { label: "XP PROGRESS" }];
      }
      return [HOME, { label: "PROFILE" }];
    default:
      return [HOME, { label: labelFor(leaf ?? detail ?? section) }];
  }
}

/** Desktop-only route context. Fullscreen and onboarding routes use other shells. */
export function PlatformBreadcrumbs() {
  const items = breadcrumbsForPath(usePathname());
  if (items.length === 0) return null;

  return (
    <Breadcrumbs
      items={items}
      className="hidden border-b border-line-subtle bg-surface/80 lg:block"
    />
  );
}
