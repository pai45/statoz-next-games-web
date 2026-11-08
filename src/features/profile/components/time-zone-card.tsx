"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useState, useSyncExternalStore } from "react";

import {
  accentVar,
  ChevronRightIcon,
  GlobeIcon,
  RadioBlankIcon,
  RadioCheckedIcon,
  ScheduleIcon,
  withAlpha,
} from "@statoz/design-system/games";

import {
  deviceTimeZoneDescription,
  deviceTimeZoneId,
  timeZoneOptionById,
  timeZoneOptions,
} from "../data/time-zones";
import { saveTimeZone } from "../state/profile-identity";

import { ProfileOverlay } from "./profile-overlay";
import { ProfilePanel } from "./profile-panel";

/**
 * SET UP YOUR LOCAL TIME ZONE — what every kick-off on the app is printed in.
 *
 * The device option is resolved in an effect rather than during render: the
 * server has no idea what zone the player is in, and reading it while rendering
 * would make the markup disagree with the browser.
 */

const cyan = accentVar("cyan");

export type TimeZoneCardProps = {
  selectedId: string | null;
};

export function TimeZoneCard({ selectedId }: TimeZoneCardProps) {
  const [picking, setPicking] = useState(false);
  const deviceZone = useDeviceTimeZone();

  const chosen = selectedId !== null;
  const subtitle = !chosen
    ? "Choose your local time zone"
    : selectedId === deviceTimeZoneId
      ? `Device · ${deviceZone}`
      : describe(selectedId);

  return (
    <>
      <ProfilePanel
        interactive
        borderColor={chosen ? withAlpha(cyan, 0.58) : undefined}
      >
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full cursor-pointer items-center gap-3.25 py-3.5 pl-3.5 pr-3 text-left"
        >
          <span
            aria-hidden
            className="grid size-10.5 shrink-0 place-items-center border"
            style={{
              color: cyan,
              background: withAlpha(cyan, 0.1),
              borderColor: withAlpha(cyan, 0.46),
            }}
          >
            <GlobeIcon size={21} />
          </span>

          <span className="min-w-0 flex-1">
            <span
              className="block font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-label)" }}
            >
              SET UP YOUR LOCAL TIME ZONE
            </span>
            <span
              className="mt-1.25 block truncate text-xs leading-none"
              style={{
                color: chosen ? cyan : "var(--ds-color-text-muted)",
              }}
            >
              {subtitle}
            </span>
          </span>

          <ChevronRightIcon size={21} style={{ color: cyan }} />
        </button>
      </ProfilePanel>

      {picking ? (
        <TimeZonePicker
          selectedId={selectedId}
          deviceZone={deviceZone}
          onClose={() => setPicking(false)}
          onSelect={(id) => {
            saveTimeZone(id);
            setPicking(false);
          }}
        />
      ) : null}
    </>
  );
}

function describe(id: string): string {
  const option = timeZoneOptionById(id);
  return option ? `${option.label} · ${option.utcOffset}` : "Choose your local time zone";
}

const neverChanges = () => () => {};

/**
 * The browser's own zone.
 *
 * Read through a store rather than an effect because that is what it is: an
 * external system the server cannot see. The server snapshot is empty, so the
 * markup matches, and the real answer arrives on hydration.
 */
function useDeviceTimeZone(): string {
  return useSyncExternalStore(
    neverChanges,
    () => deviceTimeZoneDescription(),
    () => "",
  );
}

function TimeZonePicker({
  selectedId,
  deviceZone,
  onClose,
  onSelect,
}: {
  selectedId: string | null;
  deviceZone: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <ProfileOverlay
      title="SELECT TIME ZONE"
      icon={<ScheduleIcon size={18} />}
      onClose={onClose}
    >
      <div role="radiogroup" aria-label="Time zone" className="py-2">
        <TimeZoneOptionRow
          label="Use device time zone"
          subtitle={deviceZone || "Reading the browser…"}
          selected={selectedId === deviceTimeZoneId}
          onSelect={() => onSelect(deviceTimeZoneId)}
        />

        <p
          className="px-4.5 pb-1.5 pt-3 font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          OR CHOOSE A CITY
        </p>

        {timeZoneOptions.map((option) => (
          <TimeZoneOptionRow
            key={option.id}
            label={option.label}
            subtitle={option.utcOffset}
            selected={selectedId === option.id}
            onSelect={() => onSelect(option.id)}
          />
        ))}
      </div>
    </ProfileOverlay>
  );
}

function TimeZoneOptionRow({
  label,
  subtitle,
  selected,
  onSelect,
}: {
  label: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const Radio = selected ? RadioCheckedIcon : RadioBlankIcon;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-3 py-2.75 pl-4.5 pr-4 text-left transition-colors hover:bg-white/4"
      style={{ background: selected ? withAlpha(cyan, 0.08) : undefined }}
    >
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-md font-semibold leading-none"
          style={{ color: selected ? cyan : "var(--ds-color-text-default)" }}
        >
          {label}
        </span>
        <span className="mt-0.75 block truncate text-xs leading-none text-muted">
          {subtitle}
        </span>
      </span>
      <Radio
        size={19}
        style={{ color: selected ? cyan : "var(--ds-color-text-muted)" }}
      />
    </button>
  );
}
