"use client";

import { useCallback, useState } from "react";

import {
  accentVar,
  feedbackVar,
  Glyph,
  hudChamferPath,
  withAlpha,
  type GlyphName,
} from "@statoz/design-system/games";

import type { HudSnapshot } from "../state/use-match-engine";
import {
  elevationLabels,
  shotDirectionLabels,
  type DeliveryLength,
  type DeliveryLine,
  type Elevation,
  type MatchPhase,
  type RiskLevel,
  type ShotDirection,
} from "../types";

import styles from "./final-over.module.css";

/**
 * The deck, which has two faces — the web port of `final_over_controls.dart`.
 *
 *   • while the ball is coming, a slim status strip. The hit is not a button:
 *     the player taps or swipes anywhere over the pitch (see
 *     `swing-surface.tsx`) — a tap drives it, a swipe places it, a flick up
 *     lofts it.
 *   • once you have hit it, do you run.
 *
 * Plates, not buttons. Pressed is an accent *fill*, never a glow — the only
 * glow down here is the RUN plate when the risk is real, because that is the
 * decision the whole game hangs on.
 */

export type FinalOverControlsProps = {
  hud: HudSnapshot;
  currentLine: DeliveryLine | null;
  currentLength: DeliveryLength | null;
  swingCommitted: boolean;
  showHints: boolean;
  rookieAssist: boolean;
  onRun: () => void;
  onHold: () => void;
  onTurnBack: () => void;
};

function isRunningPhase(phase: MatchPhase): boolean {
  return (
    phase === "runDecision" || phase === "runnersMoving" || phase === "throwInProgress"
  );
}

export function FinalOverControls(props: FinalOverControlsProps) {
  const { hud } = props;
  const running = isRunningPhase(hud.phase) || hud.canRun;

  return (
    <div
      className="px-3.5 pb-2.5 pt-1.5"
      style={{
        background: `linear-gradient(to top, ${withAlpha(
          "var(--ds-color-background-primary)",
          0.96,
        )}, ${withAlpha("var(--ds-color-background-primary)", 0.8)} 45%, ${withAlpha(
          "var(--ds-color-background-primary)",
          0,
        )})`,
        paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))",
      }}
    >
      <div key={running ? "run" : "bat"} className={styles.deckFace}>
        {running ? <RunningDeck {...props} /> : <BattingStrip {...props} />}
      </div>
    </div>
  );
}

/* ---- Batting ------------------------------------------------------------- */

function directionForLine(line: DeliveryLine): ShotDirection {
  if (line === "wideOff" || line === "off") return "offSide";
  if (line === "middle") return "straight";
  return "legSide";
}

function elevationForLength(length: DeliveryLength): Elevation | null {
  if (length === "yorker" || length === "full") return "ground";
  if (length === "short") return "loft";
  // A good length is a genuine choice; the assist declines to make it.
  return null;
}

type StripContent = {
  label: string;
  helper: string;
  icon: GlyphName;
  accent: string;
};

function stripContent(
  phase: MatchPhase,
  live: boolean,
  committed: boolean,
  verbose: boolean,
  recommendDirection: ShotDirection | null,
  recommendElevation: Elevation | null,
): StripContent {
  if (committed) {
    return {
      label: "SHOT PLAYED",
      helper: "TRACK THE BALL",
      icon: "check",
      accent: feedbackVar("success"),
    };
  }

  if (live) {
    const helper =
      recommendDirection !== null
        ? `TRY ${shotDirectionLabels[recommendDirection]}${
            recommendElevation !== null ? ` · ${elevationLabels[recommendElevation]}` : ""
          }`
        : verbose
          ? "SWIPE 4 WAYS · FLICK FAST TO LOFT"
          : "TAP OR SWIPE THE PITCH";
    return { label: "TAP TO HIT", helper, icon: "sports_cricket", accent: accentVar("cyan") };
  }

  switch (phase) {
    case "bowlerRunUp":
      return {
        label: "WATCH THE RELEASE",
        helper: "HIT AS IT REACHES THE BAT",
        icon: "visibility",
        accent: accentVar("cyan"),
      };
    case "incomingBall":
      return {
        label: "SWING CLOSED",
        helper: "THE BALL HAS PASSED",
        icon: "timer_off",
        accent: "var(--ds-color-text-muted)",
      };
    case "contact":
    case "cameraTransition":
    case "fieldPlay":
      return {
        label: "TRACK THE BALL",
        helper: "RUN WHEN THE CALL APPEARS",
        icon: "radar",
        accent: accentVar("cyan"),
      };
    default:
      return {
        label: "READ THE BALL",
        helper: "TAP FRONT · SWIPE L/R/BACK",
        icon: "sports_cricket",
        accent: "var(--ds-color-text-muted)",
      };
  }
}

function BattingStrip({
  hud,
  currentLine,
  currentLength,
  swingCommitted,
  showHints,
  rookieAssist,
}: FinalOverControlsProps) {
  const live = hud.canSwing;
  const assisting = rookieAssist && live && currentLine !== null && currentLength !== null;
  const content = stripContent(
    hud.phase,
    live,
    swingCommitted,
    showHints,
    assisting && currentLine !== null ? directionForLine(currentLine) : null,
    assisting && currentLength !== null ? elevationForLength(currentLength) : null,
  );

  return (
    <div
      aria-live="polite"
      className="flex h-[34px] items-center px-3"
      style={{
        clipPath: hudChamferPath(10, 3),
        background: withAlpha("var(--ds-color-background-elevated)", 0.88),
        border: `1px solid ${
          live ? withAlpha(content.accent, 0.55) : "var(--ds-color-border-strong)"
        }`,
      }}
    >
      <span className="shrink-0" style={{ color: content.accent }}>
        <Glyph name={content.icon} size={15} />
      </span>
      <span className="w-2" />
      <span
        className="shrink-0 font-display font-black leading-compact"
        style={{ fontSize: "var(--ds-text-xs)", letterSpacing: "var(--ds-tracking-display)" }}
      >
        {content.label}
      </span>
      <span className="w-2" />
      <span
        className="h-3 w-px shrink-0"
        style={{ background: "var(--ds-color-border-strong)" }}
      />
      <span className="w-2" />
      <span
        className="min-w-0 flex-1 truncate font-bold leading-compact"
        style={{
          color: live ? content.accent : "var(--ds-color-text-muted)",
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-tight)",
        }}
      >
        {content.helper}
      </span>
    </div>
  );
}

/* ---- Running ------------------------------------------------------------- */

function riskLabel(risk: RiskLevel): { label: string; color: string } {
  switch (risk) {
    case "safe":
      return { label: "SAFE", color: feedbackVar("success") };
    case "close":
      return { label: "CLOSE", color: accentVar("orange") };
    case "danger":
      return { label: "DANGER", color: feedbackVar("danger") };
  }
}

function RunningDeck({ hud, onRun, onHold, onTurnBack }: FinalOverControlsProps) {
  const { label, color } = riskLabel(hud.risk);
  const running = hud.runProgress > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <span
          className="flex items-center gap-1.5 px-2.5 py-[5px]"
          style={{
            background: withAlpha(color, 0.14),
            border: `1px solid ${withAlpha(color, 0.7)}`,
          }}
        >
          <span
            className="block size-1.5 rounded-full"
            style={{
              background: color,
              // The one place a dot glows: the run that could lose the chase.
              boxShadow: hud.risk === "danger" ? `0 0 7px ${withAlpha(color, 0.8)}` : undefined,
            }}
          />
          <span
            className="font-bold leading-compact"
            style={{ color, fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
          >
            {label}
          </span>
        </span>

        <span className="flex-1" />

        <span
          className="font-bold leading-compact text-muted ds-tabular"
          style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
        >
          {hud.completedRuns}/3 RUNS
        </span>
      </div>

      {running ? (
        <span
          className="mt-1.5 block h-1 w-full overflow-hidden"
          style={{ background: withAlpha("var(--ds-color-border-default)", 0.6) }}
        >
          <span
            className="block h-full"
            style={{ width: `${hud.runProgress * 100}%`, background: color }}
          />
        </span>
      ) : null}

      <div className="mt-2 flex gap-2">
        <div className="flex-2 basis-0 grow-[2]">
          <Plate
            label={hud.canTurnBack ? "TURN BACK" : "HOLD"}
            icon={hud.canTurnBack ? "u_turn_left" : "pan_tool"}
            accent="var(--ds-color-text-muted)"
            height={58}
            onPress={hud.canTurnBack ? onTurnBack : onHold}
          />
        </div>
        <div className="basis-0 grow-[3]">
          <Plate
            label={running ? "RUN AGAIN" : "RUN"}
            icon="directions_run"
            accent={color}
            height={58}
            big
            glow={hud.risk !== "safe"}
            onPress={onRun}
          />
        </div>
      </div>
    </div>
  );
}

/* ---- The plate ----------------------------------------------------------- */

type PlateProps = {
  label: string;
  icon: GlyphName;
  accent: string;
  height: number;
  big?: boolean;
  glow?: boolean;
  /** Fires on pointer *down*, always. */
  onPress: () => void;
};

function Plate({ label, icon, accent, height, big = false, glow = false, onPress }: PlateProps) {
  const [down, setDown] = useState(false);

  const press = useCallback(() => {
    setDown(true);
    onPress();
  }, [onPress]);

  const release = useCallback(() => setDown(false), []);

  return (
    <button
      type="button"
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      // Keyboard reaches the same action; the pointer path fires on down.
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          press();
        }
      }}
      onKeyUp={release}
      className={`${styles.plate} flex w-full cursor-pointer items-center justify-center gap-1.5`}
      style={{
        height,
        clipPath: hudChamferPath(10, 3),
        background: down
          ? withAlpha(accent, 0.26)
          : withAlpha("var(--ds-color-background-elevated)", 0.85),
        border: `${down ? 1.6 : 1}px solid ${withAlpha(accent, down ? 0.9 : 0.4)}`,
        color: down ? "var(--ds-color-text-default)" : accent,
        filter: glow ? `drop-shadow(0 0 12px ${withAlpha(accent, 0.5)})` : undefined,
      }}
    >
      <Glyph name={icon} size={big ? 17 : 14} />
      <span
        className="truncate font-display font-black leading-compact"
        style={{
          fontSize: big ? "var(--ds-text-md)" : "var(--ds-text-xs)",
          letterSpacing: "var(--ds-tracking-tight)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
