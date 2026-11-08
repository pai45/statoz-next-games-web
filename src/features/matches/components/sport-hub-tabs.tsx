"use client";

import {
  accentVar,
  FlameIcon,
  MoreIcon,
  SearchIcon,
  UnderlineTabs,
  type UnderlineTab,
} from "@statoz/design-system/games";
import { sportModuleFor, sportOrder, sportTabColors, type Sport } from "@/domain/sports";

import { SportIcon } from "./sport-icon";

/** `null` is the Trending destination; a sport narrows the feed to that sport. */
export type SportHubSelection = Sport | null;

export type SportHubTabsProps = {
  selected: SportHubSelection;
  onSelect: (selection: SportHubSelection) => void;
  onMore?: () => void;
  onSearch?: () => void;
};

/** Motorsport stays in All Sports rather than crowding the shortcuts. */
const shortcuts: Sport[] = sportOrder.filter((sport) => sport === "football" || sport === "cricket" || sport === "basketball");

/** Browse strip above the feed: Trending, four sports, then All Sports. */
export function SportHubTabs({
  selected,
  onSelect,
  onMore,
  onSearch,
}: SportHubTabsProps) {
  const tabs: UnderlineTab[] = [
    { id: "trending", label: "TRENDING", icon: <FlameIcon size={21} /> },
    ...shortcuts.map((sport) => ({
      id: sport,
      label: sportModuleFor(sport).label.toUpperCase(),
      icon: <SportIcon sport={sport} size={21} />,
    })),
    {
      id: "all",
      label: "ALL SPORTS",
      icon: <MoreIcon size={21} />,
      action: onMore,
    },
  ];

  const shortcutIndex = selected === null ? -1 : shortcuts.indexOf(selected);
  const activeIndex = selected === null ? 0 : shortcutIndex >= 0 ? shortcutIndex + 1 : -1;
  const accent = accentVar(selected ? sportModuleFor(selected).accent : "cyan");
  const shortcutColors = sportTabColors.slice(0, shortcuts.length).map(accentVar);

  return (
    <UnderlineTabs
      label="Browse by sport"
      tabs={tabs}
      activeIndex={activeIndex}
      accent={accent}
      iconColors={[
        accentVar("cyan"),
        ...shortcutColors,
        accentVar("cyan"),
      ]}
      onChange={(index) => onSelect(index === 0 ? null : shortcuts[index - 1])}
      trailing={
        onSearch ? (
          <button
            type="button"
            onClick={onSearch}
            aria-label="Search teams and leagues"
            title="Search teams and leagues"
            className="grid size-11 place-items-center text-accent"
          >
            <SearchIcon size={22} />
          </button>
        ) : undefined
      }
    />
  );
}
