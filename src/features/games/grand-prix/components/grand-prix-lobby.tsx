"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { DailyDrop } from "@/features/packs";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/games";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";

import {
  circuitCardGapPx,
  circuitCardWidthPx,
  lobbyCircuitDelayMs,
  lobbyHeroDelayMs,
  lobbyLapsDelayMs,
  lobbyLinksDelayMs,
  lobbyPlayDelayMs,
  lobbyRecordDelayMs,
} from "../constants";
import { grandPrixCircuits } from "../data/circuits";
import { grandPrixLiverySpec } from "../data/liveries";
import {
  bestLapMs,
  type GrandPrixStats,
} from "../state/grand-prix-progress";
import {
  formatLapTime,
  grandPrixXpMultiplier,
  type GrandPrixCircuitId,
  type GrandPrixLivery,
} from "../types";

import { LiveryLocker } from "./livery-locker";
import styles from "./grand-prix.module.css";

/**
 * The Grand Prix Dash lobby — the web port of `grand_prix_lobby_screen.dart`.
 *
 * The pit-lane strip, the wordmark, the circuit you pick, how far you are going
 * and what that pays, then START RACE. Beat for beat the Flutter screen, with
 * two things moved because the web files them elsewhere: the career record,
 * which Flutter hides behind a Match History screen the web does not have, sits
 * where the Flutter record panel's own layout put it; and the livery locker,
 * which Flutter keeps in a Pit Deck screen whose other half — the driver — is
 * the web's loadout editor.
 */

const racing = accentVar("racing");
const cyan = accentVar("cyan");
const gold = accentVar("gold");
const amber = accentVar("orange");
const success = feedbackVar("success");

function rise(delayMs: number): CSSProperties {
  return { "--rise-delay": `${delayMs}ms` } as CSSProperties;
}

const lapOptions = [
  { laps: 1, title: "SPRINT" },
  { laps: 3, title: "GRAND PRIX" },
  { laps: 5, title: "ENDURANCE" },
];

export type GrandPrixLobbyProps = {
  stats: GrandPrixStats;
  livery: GrandPrixLivery;
  ownedLiveryIds: readonly string[];
  /** Whether the loadout has a driver signed. */
  driverReady: boolean;
  driverName: string | null;
  onBack: () => void;
  loadoutHref: string;
  onSelectCircuit: (circuit: GrandPrixCircuitId) => void;
  onSelectLaps: (laps: number) => void;
  onSelectLivery: (livery: GrandPrixLivery) => void;
  onStart: () => void;
};

export function GrandPrixLobby({
  stats,
  livery,
  ownedLiveryIds,
  driverReady,
  driverName,
  onBack,
  loadoutHref,
  onSelectCircuit,
  onSelectLaps,
  onSelectLivery,
  onStart,
}: GrandPrixLobbyProps) {
  const liverySpec = grandPrixLiverySpec(livery);
  const circuit =
    grandPrixCircuits.find((entry) => entry.id === stats.lastCircuit) ??
    grandPrixCircuits[2];

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden">
      {/* A quiet pit-lane wash behind the column, so the lobby is somewhere. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 60% at 50% 0%, ${withAlpha(racing, 0.1)} 0%, transparent 60%),
             radial-gradient(90% 50% at 50% 100%, ${withAlpha(cyan, 0.06)} 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex w-full max-w-115 flex-1 flex-col justify-center px-5 py-6">
        {/* Pit-lane strip. */}
        <div className={styles.rise} style={rise(0)}>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`${styles.pitLaneOpen} size-1.75 rounded-full`}
              style={{ backgroundColor: success }}
            />
            <span
              className="font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p9, letterSpacing: "2px", color: success }}
            >
              PIT LANE OPEN
            </span>
            <span
              aria-hidden
              className="h-px flex-1"
              style={{ backgroundColor: withAlpha(racing, 0.16) }}
            />
            <span
              className="font-display font-black leading-none text-muted"
              style={{ fontSize: typography.sizeRem.p8_5, letterSpacing: "1.2px" }}
            >
              SYS://GP_DASH v1.0.0
            </span>
          </div>
        </div>

        {/* Hero. */}
        <div className={`${styles.rise} mt-4`} style={rise(lobbyHeroDelayMs)}>
          <div className="flex items-center gap-4">
            <span
              className={`${styles.emblemPulse} grid size-19 shrink-0 place-items-center rounded-full`}
              aria-hidden
              style={{
                color: racing,
                backgroundColor: withAlpha("#0d111a", 0.5),
                border: `1px solid ${withAlpha(racing, 0.26)}`,
              }}
            >
              <Glyph name="sports_motorsports" size={38} />
            </span>

            <div className="min-w-0 flex-1">
              <h1
                className="font-display font-black leading-none"
                style={{
                  fontSize: typography.sizeRem.p21,
                  letterSpacing: "1.2px",
                  textShadow: `0 0 14px ${withAlpha(racing, 0.45)}`,
                }}
              >
                GRAND PRIX DASH
              </h1>
              <p
                className="mt-1.5 font-display font-black leading-tight text-muted"
                style={{ fontSize: typography.sizeRem.p9, letterSpacing: "2.2px" }}
              >
                1·3·5 LAPS · 20 CARS · LIGHTS OUT
              </p>
              <span
                className="mt-2.5 inline-block px-2 py-0.5 font-display font-black leading-none"
                style={{
                  fontSize: typography.sizeRem.p8,
                  letterSpacing: "1.2px",
                  color: stats.wins > 0 ? gold : racing,
                  border: `1px solid ${withAlpha(stats.wins > 0 ? gold : racing, 0.5)}`,
                }}
              >
                {stats.wins > 0
                  ? `${stats.wins} RACE WINS`
                  : stats.races > 0
                    ? `${stats.races} RACES IN`
                    : "ROOKIE SEASON"}
              </span>
            </div>
          </div>
        </div>

        {/* Career record. */}
        {stats.races > 0 ? (
          <div className={`${styles.rise} mt-4.5`} style={rise(lobbyRecordDelayMs)}>
            <div
              className="flex px-3.5 py-3"
              style={{
                backgroundColor: "var(--ds-color-background-elevated)",
                border: `1px solid ${withAlpha(racing, 0.3)}`,
              }}
            >
              <RecordStat label="RACES" value={`${stats.races}`} />
              <RecordStat label="WINS" value={`${stats.wins}`} accent={gold} />
              <RecordStat label="PODIUMS" value={`${stats.podiums}`} />
              <RecordStat
                label="BEST"
                value={stats.bestPosition > 0 ? `P${stats.bestPosition}` : "—"}
                accent={cyan}
              />
              <RecordStat
                label="STREAK"
                value={`${stats.currentStreak}`}
                accent={stats.currentStreak > 0 ? success : undefined}
              />
            </div>
          </div>
        ) : null}

        {/* Circuit. */}
        <div className={`${styles.rise} mt-5`} style={rise(lobbyCircuitDelayMs)}>
          <SectionLabel>CIRCUIT</SectionLabel>
          <CircuitStrip
            selected={stats.lastCircuit}
            stats={stats}
            laps={stats.lastLaps}
            onSelect={onSelectCircuit}
          />
        </div>

        {/* Race distance. */}
        <div className={`${styles.rise} mt-5`} style={rise(lobbyLapsDelayMs)}>
          <SectionLabel>RACE DISTANCE</SectionLabel>
          <div className="mt-2.5 flex gap-2">
            {lapOptions.map((option) => {
              const selected = option.laps === stats.lastLaps;
              const multiplier = grandPrixXpMultiplier(option.laps);
              return (
                <button
                  key={option.laps}
                  type="button"
                  onClick={() => onSelectLaps(option.laps)}
                  aria-pressed={selected}
                  className="flex-1 cursor-pointer px-2.5 py-2.5 transition-colors duration-180"
                  style={{
                    backgroundColor: selected
                      ? `color-mix(in srgb, ${racing} 10%, var(--ds-color-background-elevated))`
                      : "var(--ds-color-background-elevated)",
                    border: `${selected ? 1.6 : 1}px solid ${
                      selected
                        ? racing
                        : "color-mix(in srgb, var(--ds-color-border-default) 60%, transparent)"
                    }`,
                  }}
                >
                  <span className="flex items-baseline justify-center">
                    <span
                      className="font-display font-black leading-none tabular-nums"
                      style={{
                        fontSize: typography.sizeRem.p22,
                        color: selected ? racing : "var(--ds-color-text-default)",
                      }}
                    >
                      {option.laps}
                    </span>
                    <span
                      className="font-display font-black leading-none text-muted"
                      style={{ fontSize: typography.sizeRem.p9, letterSpacing: "0.8px" }}
                    >
                      {option.laps === 1 ? " LAP" : " LAPS"}
                    </span>
                  </span>
                  <span
                    className="mt-1 block truncate font-display font-black leading-none"
                    style={{
                      fontSize: typography.sizeRem.p7,
                      letterSpacing: "1.1px",
                      color: selected
                        ? "var(--ds-color-text-default)"
                        : "var(--ds-color-text-muted)",
                    }}
                  >
                    {option.title}
                  </span>
                  <span
                    className="mt-1.75 inline-block px-1.5 py-0.5 font-display font-black leading-none"
                    style={{
                      fontSize: typography.sizeRem.p8,
                      letterSpacing: "1.2px",
                      color: multiplier > 1 ? gold : "var(--ds-color-text-muted)",
                      border: `1px solid ${withAlpha(
                        multiplier > 1 ? gold : "#90a1b9",
                        0.5,
                      )}`,
                    }}
                  >
                    XP ×{multiplier}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The one action that matters. */}
        <div className={`${styles.rise} mt-5.5`} style={rise(lobbyPlayDelayMs)}>
          <button
            type="button"
            onClick={onStart}
            disabled={!driverReady}
            className="w-full cursor-pointer px-4 py-3.5 text-center transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: withAlpha(racing, 0.14),
              border: `1.6px solid ${racing}`,
              boxShadow: driverReady ? `0 0 22px -6px ${withAlpha(racing, 0.5)}` : undefined,
            }}
          >
            <span className="flex items-center justify-center gap-2" style={{ color: racing }}>
              <Glyph name="sports_motorsports" size={18} />
              <span
                className="font-display font-black leading-none"
                style={{ fontSize: typography.sizeRem.p15, letterSpacing: "2px" }}
              >
                START RACE
              </span>
            </span>
            <span
              className="mt-1.5 block font-display font-black leading-none text-muted"
              style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.2px" }}
            >
              {driverReady
                ? `${circuit.name} · ${stats.lastLaps === 1 ? "1 LAP" : `${stats.lastLaps} LAPS`} · ${liverySpec.name}`
                : "SIGN A DRIVER IN YOUR LOADOUT"}
            </span>
          </button>
          <p
            className="mt-2 text-center leading-body text-muted"
            style={{ fontSize: typography.sizeRem.p10 }}
          >
            {driverReady && driverName !== null
              ? `${driverName.toUpperCase()} IN THE COCKPIT · ${circuit.flavor}`
              : circuit.flavor}
          </p>
        </div>

        {/* Livery. */}
        <div className={`${styles.rise} mt-5`} style={rise(lobbyPlayDelayMs + 40)}>
          <LiveryLocker
            selected={livery}
            ownedLiveryIds={ownedLiveryIds}
            onSelect={onSelectLivery}
          />
        </div>

        {/* How it drives. */}
        <div className={`${styles.rise} mt-5`} style={rise(lobbyLinksDelayMs)}>
          <div
            className="px-3.5 py-3"
            style={{
              backgroundColor: withAlpha("#0d111a", 0.5),
              border: "1px solid var(--ds-color-border-muted)",
            }}
          >
            <p
              className="font-display font-black leading-none text-muted"
              style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.8px" }}
            >
              HOW TO RACE
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-[length:var(--ds-size-p11)] leading-body text-muted">
              <li>Hit ACCEL the instant the five lights go out — early is a jump start</li>
              <li>◀ ▶ steer · the road pulls you wide, so steer into every corner</li>
              <li>BRAKE before the amber boards or the tyres scrub your speed away</li>
              <li>Sit in a tow down the straights, and keep off the grass</li>
              <li>Keyboard: ← → steer · ↑ or space accelerate · ↓ brake · Esc leaves</li>
            </ul>
          </div>
        </div>

        <div
          className={`${styles.rise} mt-4 flex items-center justify-center gap-4`}
          style={rise(lobbyLinksDelayMs + 60)}
        >
          <LobbyLink href={loadoutHref}>PIT DECK</LobbyLink>
          <span aria-hidden className="size-0.75 rounded-full bg-border" />
          <LobbyLink href="/shop">LIVERY SHOP</LobbyLink>
          <span aria-hidden className="size-0.75 rounded-full bg-border" />
          <LobbyLink onClick={onBack}>ALL RACING GAMES</LobbyLink>
        </div>
        <div className="mt-4"><GameLeaderboardCta gameId="grand-prix-dash" /></div>
        <DailyDrop sport="motorsport" />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      className="font-display font-black leading-none text-muted"
      style={{ fontSize: typography.sizeRem.p9, letterSpacing: "2px" }}
    >
      {children}
    </p>
  );
}

function LobbyLink({ href, onClick, children }: { href?: string; onClick?: () => void; children: string }) {
  const className = "py-2 font-display font-black leading-none text-muted underline-offset-4 hover:underline";
  const style = { fontSize: typography.sizeRem.p9, letterSpacing: "1.8px" };
  if (onClick) return <button type="button" onClick={onClick} className={className} style={style}>{children}</button>;
  if (!href) return null;
  return (
    <Link
      href={href}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}

function RecordStat({
  label,
  value,
  accent = "var(--ds-color-text-default)",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <span
        className="truncate font-display font-black leading-none tabular-nums"
        style={{ fontSize: typography.sizeRem.p17, color: accent }}
      >
        {value}
      </span>
      <span
        className="mt-0.75 whitespace-nowrap font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p7, letterSpacing: "0.8px" }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * The circuit strip.
 *
 * It opens with the remembered circuit in view rather than always at the start
 * of the list, which is the one piece of behaviour the Flutter picker has that
 * a plain overflow row would lose.
 */
function CircuitStrip({
  selected,
  stats,
  laps,
  onSelect,
}: {
  selected: GrandPrixCircuitId;
  stats: GrandPrixStats;
  laps: number;
  onSelect: (circuit: GrandPrixCircuitId) => void;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    const strip = stripRef.current;
    if (strip === null || scrolled.current) return;
    scrolled.current = true;
    const index = grandPrixCircuits.findIndex((circuit) => circuit.id === selected);
    const extent = circuitCardWidthPx + circuitCardGapPx;
    strip.scrollLeft = Math.max(
      0,
      Math.min(index * extent - 24, extent * (grandPrixCircuits.length - 1)),
    );
  }, [selected]);

  return (
    <div
      ref={stripRef}
      className={`${styles.circuitStrip} -mx-5 mt-2.5 flex gap-2.5 overflow-x-auto px-5 pb-1`}
    >
      {grandPrixCircuits.map((circuit) => {
        const isSelected = circuit.id === selected;
        const best = bestLapMs(stats, circuit.id, laps);
        return (
          <button
            key={circuit.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(circuit.id)}
            className="flex h-35 shrink-0 cursor-pointer flex-col items-start p-3 text-left transition-colors duration-180"
            style={{
              width: circuitCardWidthPx,
              backgroundColor: isSelected
                ? `color-mix(in srgb, ${racing} 10%, var(--ds-color-background-elevated))`
                : "var(--ds-color-background-elevated)",
              border: `${isSelected ? 1.6 : 1}px solid ${
                isSelected
                  ? racing
                  : "color-mix(in srgb, var(--ds-color-border-default) 60%, transparent)"
              }`,
            }}
          >
            <span
              className="w-full truncate font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p11,
                letterSpacing: "0.8px",
                color: isSelected ? racing : "var(--ds-color-text-default)",
              }}
            >
              {circuit.name}
            </span>
            <span
              className="mt-1.5 px-1.5 py-0.5 font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p8,
                letterSpacing: "1.2px",
                color: isSelected ? racing : "var(--ds-color-text-muted)",
                border: `1px solid ${withAlpha(isSelected ? racing : "#90a1b9", 0.5)}`,
              }}
            >
              {circuit.character}
            </span>
            <span
              className="mt-2 leading-none"
              style={{ fontSize: typography.sizeRem.p11, letterSpacing: "2px", color: withAlpha(amber, 0.9) }}
              aria-label={`Difficulty ${circuit.difficultyStars} of 4`}
            >
              {"★".repeat(circuit.difficultyStars)}
              {"☆".repeat(4 - circuit.difficultyStars)}
            </span>
            <span className="flex-1" />
            <span
              className="font-display font-black leading-none tabular-nums"
              style={{
                fontSize: typography.sizeRem.p9,
                letterSpacing: "1px",
                color: best !== null ? cyan : "var(--ds-color-text-muted)",
              }}
            >
              BEST {formatLapTime(best)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
