"use client";

import { usePathname } from "next/navigation";

import {
  accentVar,
  NavMarkIcon,
  NavRail,
  type NavRailItem,
} from "@statoz/design-system/games";
import { navDestinations, type NavDestinationId } from "@/shared/config";

export type PlatformNavProps = {
  /** Overrides the destination derived from the URL. */
  activeId?: NavDestinationId;
  orientation?: "bar" | "rail";
  /** Narrow icon rail for a phone held sideways. */
  compact?: boolean;
  className?: string;
};

const icons: Record<NavDestinationId, React.ReactNode> = {
  sports: <NavMarkIcon mark="games" size={20} />,
  quiz: <NavMarkIcon mark="quiz" size={20} />,
  shop: <NavMarkIcon mark="shop" size={20} />,
  leaderboard: <NavMarkIcon mark="top" size={20} />,
  profile: <NavMarkIcon mark="profile" size={20} />,
};

/** Platform destinations share one violet accent so no single tab dominates. */
const NAV_ACCENT = accentVar("violet");

/**
 * Which destination the current URL belongs to.
 *
 * Longest matching href wins, so `/profile/history` still lights PROFILE, and
 * the root href is only ever an exact match — otherwise it would claim every
 * page in the app.
 */
function destinationForPath(pathname: string): NavDestinationId {
  let best: NavDestinationId = "sports";
  let bestLength = 0;

  for (const destination of navDestinations) {
    if (destination.href === "/") continue;
    const matches =
      pathname === destination.href ||
      pathname.startsWith(`${destination.href}/`);
    if (matches && destination.href.length > bestLength) {
      best = destination.id;
      bestLength = destination.href.length;
    }
  }

  return best;
}

/** The platform's primary navigation, in either presentation. */
export function PlatformNav({
  activeId,
  orientation = "bar",
  compact = false,
  className,
}: PlatformNavProps) {
  const pathname = usePathname();
  const active = activeId ?? (destinationForPath(pathname));

  const items: NavRailItem[] = navDestinations.map((destination) => ({
    id: destination.id,
    label: destination.label,
    icon: icons[destination.id],
    accent: NAV_ACCENT,
    href: destination.href,
  }));

  return (
    <NavRail
      label="Primary"
      items={items}
      activeId={active}
      orientation={orientation}
      compact={compact}
      className={className}
    />
  );
}
