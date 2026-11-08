"use client";

import { useId, useMemo, useRef, useState } from "react";

import type { PlayerCard } from "@/domain/cards";
import {
  accentVar,
  Glyph,
  glyphRegistry,
  withAlpha,
  type GlyphName,
} from "@statoz/design-system/games";

import { searchPlayers } from "../engine/archive";

import { Label } from "./guess-chrome";
import styles from "./guess-player.module.css";

/**
 * The player database — the web port of the screen's `RawAutocomplete`.
 *
 * A combobox rather than a plain field: the eight names the search offers are
 * the only valid guesses, so the list is the input. Typing after a pick clears
 * it, which is what stops a name being locked in that the field no longer says.
 *
 * The app has no keyboard here at all. Arrow keys, Enter, and Escape are the
 * port's, along with the roles that make the list readable to a screen reader.
 */

export type PlayerSearchProps = {
  players: PlayerCard[];
  guessedPlayerIds: string[];
  selected: PlayerCard | null;
  onSelect: (player: PlayerCard | null) => void;
  onSubmit: () => void;
  onGiveUp: () => void;
  /** True once the attempts are spent: the field closes, the way out does not. */
  disabled: boolean;
};

/** A card carries its glyph as a string, so the name is checked, not trusted. */
function toGlyph(name: string): GlyphName {
  return name in glyphRegistry ? (name as GlyphName) : "bolt";
}

export function PlayerSearch({
  players,
  guessedPlayerIds,
  selected,
  onSelect,
  onSubmit,
  onGiveUp,
  disabled,
}: PlayerSearchProps) {
  const cyan = accentVar("cyan");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const results = useMemo(
    () => searchPlayers(players, query, guessedPlayerIds),
    [players, query, guessedPlayerIds],
  );
  const showList = open && !disabled && results.length > 0 && selected === null;

  const choose = (player: PlayerCard) => {
    onSelect(player);
    setQuery(player.name);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (showList && results[active] !== undefined) choose(results[active]);
      else if (selected !== null) onSubmit();
      return;
    }
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <Label className="flex-1" tracking="var(--ds-tracking-mega)">
          PLAYER DATABASE
        </Label>
        <button
          type="button"
          onClick={onGiveUp}
          aria-label="Give up and reveal player"
          className={`${styles.link} cursor-pointer px-1`}
        >
          <Label tracking="var(--ds-tracking-mega)">GIVE UP</Label>
        </button>
      </div>

      <div className="relative mt-2">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: cyan }}
        >
          <Glyph name="search" size={18} />
        </span>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList ? `${listId}-option-${active}` : undefined
          }
          aria-label="Search player"
          placeholder="SEARCH PLAYER"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
            if (selected !== null) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-12 w-full pl-11 pr-11 font-bold leading-compact outline-none disabled:cursor-not-allowed"
          style={{
            background: "var(--ds-color-background-secondary)",
            border: `1px solid ${selected === null ? "var(--ds-color-border-subtle)" : cyan}`,
            fontSize: "var(--ds-text-sm)",
          }}
        />

        {selected !== null ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
            style={{ color: cyan }}
          >
            <Glyph name="verified" size={18} />
          </span>
        ) : query === "" ? null : (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSelect(null);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className={`${styles.link} absolute right-1 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center text-muted`}
          >
            <Glyph name="close" size={18} />
          </button>
        )}

        {showList ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching players"
            className="absolute inset-x-0 top-full z-20 max-h-49 overflow-y-auto"
            style={{
              background: "var(--ds-color-background-secondary)",
              border: `1px solid ${withAlpha(cyan, 0.55)}`,
            }}
          >
            {results.map((player, index) => (
              <li
                key={player.id}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === active}
              >
                <button
                  type="button"
                  data-active={index === active}
                  // Chosen on pointer-down so the field never loses focus first.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(player);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`${styles.option} flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left`}
                  style={{
                    borderTop:
                      index === 0 ? undefined : "1px solid var(--ds-color-border-subtle)",
                  }}
                >
                  <span
                    className="shrink-0"
                    style={{ color: index === active ? accentVar("pink") : cyan }}
                  >
                    <Glyph name={toGlyph(player.icon)} size={16} />
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate font-bold leading-compact"
                    style={{ fontSize: "var(--ds-text-sm)" }}
                  >
                    {player.name}
                  </span>
                  <Label className="shrink-0" tracking="var(--ds-tracking-mega)">
                    {player.position}
                  </Label>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
