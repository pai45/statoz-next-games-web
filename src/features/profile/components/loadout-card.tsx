"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import Link from "next/link";

import {
  accentVar,
  CheckIcon,
  feedbackVar,
  InventoryIcon,
  Progress,
  withAlpha,
} from "@statoz/design-system/games";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import {
  activeDeck,
  isLoadoutComplete,
  useDecks,
} from "@/features/cards-decks";
import { SportIcon } from "@/features/matches";

import { ProfilePanel } from "./profile-panel";

/**
 * ALL DECKS — how many of the five sports have a squad behind them.
 *
 * Readiness is derived from the active named profile, matching the loadout that
 * gates each deck-dependent game. The panel links into the shared Deck Locker.
 */

const cyan = accentVar("cyan");
const success = feedbackVar("success");

export function LoadoutCard() {
  const decks = useDecks();
  const deck = activeDeck(decks);
  const ready = sportOrder.filter((sport) =>
    isLoadoutComplete(deck.loadouts[sport]),
  );
  const allReady = ready.length === sportOrder.length;
  const accent = allReady ? success : cyan;

  return (
    <ProfilePanel borderColor={withAlpha(cyan, 0.52)}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10.5 shrink-0 place-items-center border"
            style={{
              color: cyan,
              background: withAlpha(cyan, 0.1),
              borderColor: withAlpha(cyan, 0.46),
            }}
          >
            <InventoryIcon size={21} />
          </span>

          <div className="min-w-0 flex-1">
            <h2
              className="font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p11,
                letterSpacing: "var(--ds-tracking-wide)",
              }}
            >
              ALL DECKS
            </h2>
            <p
              className="mt-1 truncate font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p8,
                letterSpacing: "var(--ds-tracking-label)",
                color: cyan,
              }}
            >
              {allReady
                ? "// EVERY SQUAD CLAIMED"
                : ready.length === 0
                  ? "// NO SQUAD CLAIMED YET"
                  : `// ${sportModuleFor(ready[ready.length - 1]).label.toUpperCase()} SQUAD READY`}
            </p>
          </div>

          <span
            className="ds-tabular font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p17, color: accent }}
          >
            {ready.length}/{sportOrder.length}
          </span>
        </div>

        <ul className="mt-3.5 flex gap-2">
          {sportOrder.map((sport) => (
            <li key={sport} className="min-w-0 flex-1">
              <SportReadyNode
                sport={sport}
                ready={isLoadoutComplete(deck.loadouts[sport])}
              />
            </li>
          ))}
        </ul>

        <div className="mt-3">
          <Progress
            value={ready.length / sportOrder.length}
            accent={accent}
            label={`${ready.length} of ${sportOrder.length} squads claimed`}
          />
        </div>

        <p
          className="mt-2 font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p7, letterSpacing: "var(--ds-tracking-label)" }}
        >
          {allReady
            ? "EVERY SPORT LOADOUT IS LOCKED AND READY"
            : "OPEN A SPORT’S STARTER PACK TO FIELD ITS SQUAD"}
        </p>
      </div>
    </ProfilePanel>
  );
}

function SportReadyNode({ sport, ready }: { sport: Sport; ready: boolean }) {
  const entry = sportModuleFor(sport);
  const accent = accentVar(entry.accent);

  return (
    <Link
      href={`/decks/${sport}`}
      className="relative grid h-9.5 place-items-center border"
      style={{
        background: ready
          ? `color-mix(in srgb, ${accent} 12%, var(--ds-color-background-elevated))`
          : withAlpha("var(--ds-color-background-primary)", 0.44),
        borderColor: ready
          ? withAlpha(accent, 0.65)
          : "var(--ds-color-border-strong)",
      }}
    >
      <SportIcon
        sport={sport}
        size={19}
        title={`${entry.label}${ready ? " squad ready" : " squad not claimed"}`}
        style={{ color: ready ? accent : "var(--ds-color-text-muted)" }}
      />
      {ready ? (
        <CheckIcon
          size={9}
          className="absolute right-0.75 top-0.75"
          style={{ color: success }}
        />
      ) : null}
    </Link>
  );
}
