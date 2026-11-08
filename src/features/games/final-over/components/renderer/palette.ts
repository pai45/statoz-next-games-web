/**
 * The renderer's colours, and the only place in the module that holds one.
 *
 * A 2D canvas cannot read `var(--ds-*)`, so the design-system tokens are
 * resolved once against the document and handed to the draw functions as plain
 * strings. Nothing under `renderer/` may write a colour of its own — if a value
 * is missing it belongs here, either as a token read or as scene art.
 *
 * "Scene art" is the second half of this file: the sky, the turf, the strip,
 * the sightscreen, the ball. Those are the painted world, the way a team's
 * brand colour is data — not palette decisions, and not tokens the rest of the
 * app should be able to reach for.
 */

import { finalOverKits, type FinalOverKit, type FinalOverLook } from "../../data/kits";

export type ScenePalette = {
  /* Design-system tokens. */
  background: string;
  panel: string;
  panelDeep: string;
  cyan: string;
  violet: string;
  lime: string;
  amber: string;
  gold: string;
  danger: string;
  success: string;
  border: string;
  line: string;
  muted: string;
  text: string;

  /* Scene art. */
  skyTop: string;
  skyMid: string;
  skyDeep: string;
  standRoof: string;
  crowdDark: string;
  sightscreenEdge: string;
  sightscreenFace: string;
  sightscreenSeam: string;
  sightscreenLeg: string;
  turfNear: string;
  turfMid: string;
  turfFar: string;
  turfAboveInner: string;
  turfAboveOuter: string;
  aboveBackdrop: string;
  pitchFar: string;
  pitchNear: string;
  pitchAbove: string;
  stump: string;
  ball: string;
  batHandle: string;
  batBladeEdge: string;
  batBlade: string;
  batSpine: string;
  batOutline: string;
  rigShadow: string;
  umpireHat: string;

  /**
   * The display family, already resolved.
   *
   * `ctx.font` is parsed by the canvas, not the cascade — a `var()` in it is
   * invalid and the whole assignment is silently dropped, leaving 10px sans.
   * So the family is read out of the computed style here and the draw calls
   * build their font strings from this.
   */
  displayFont: string;
};

const tokenNames = {
  background: "--ds-color-background-primary",
  panel: "--ds-color-background-elevated",
  panelDeep: "--ds-color-background-secondary",
  cyan: "--ds-color-accent-cyan",
  violet: "--ds-color-accent-violet",
  lime: "--ds-color-accent-lime",
  amber: "--ds-color-accent-orange",
  gold: "--ds-color-accent-gold",
  danger: "--ds-color-danger",
  success: "--ds-color-success",
  border: "--ds-color-border-default",
  line: "--ds-color-border-strong",
  muted: "--ds-color-text-muted",
  text: "--ds-color-text-default",
} as const;

const displayFontProperty = "--ds-font-display";
const displayFontFallback = '"Orbitron", "Space Grotesk", system-ui, sans-serif';

/**
 * The token values as they stand in `tokens.css`. Used on the server and as
 * the fallback when a custom property reads back empty, which happens in a
 * detached canvas and during thumbnail capture.
 */
const tokenFallbacks: Record<keyof typeof tokenNames, string> = {
  background: "#0d111a",
  panel: "#1d293d",
  panelDeep: "#0f172b",
  cyan: "#5cdfff",
  violet: "#c27aff",
  lime: "#51ff94",
  amber: "#ff8904",
  gold: "#fdc700",
  danger: "#ff4d4d",
  success: "#05df72",
  border: "#314158",
  line: "#45556c",
  muted: "#90a1b9",
  text: "#ffffff",
};

/** The painted world. Not tokens, and deliberately not reachable as tokens. */
const sceneArt = {
  skyTop: "#0b1c2b",
  skyMid: "#07131f",
  skyDeep: "#030912",
  standRoof: "#0f2334",
  crowdDark: "#243449",
  sightscreenEdge: "#b9c4ce",
  sightscreenFace: "#d6dee6",
  sightscreenSeam: "#9aa6b2",
  sightscreenLeg: "#0b1420",
  turfNear: "#06262d",
  turfMid: "#0c3338",
  turfFar: "#174348",
  turfAboveInner: "#17454a",
  turfAboveOuter: "#0b3036",
  aboveBackdrop: "#060b12",
  pitchFar: "#6e5a3c",
  pitchNear: "#9c7f52",
  pitchAbove: "#8a6e45",
  stump: "#e8ecf3",
  ball: "#c4342b",
  batHandle: "#23282f",
  batBladeEdge: "#6b4a22",
  batBlade: "#f3e6c8",
  batSpine: "#fff9ea",
  batOutline: "#5a3e1c",
  rigShadow: "#05070b",
  umpireHat: "#141b2b",
} as const;

/**
 * Reads the live token values. Called on mount and whenever the theme changes,
 * never per frame — `getComputedStyle` forces a style flush.
 */
export function readScenePalette(): ScenePalette {
  const resolved = { ...tokenFallbacks };
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const styles = window.getComputedStyle(document.documentElement);
      for (const key of Object.keys(tokenNames) as (keyof typeof tokenNames)[]) {
        const value = styles.getPropertyValue(tokenNames[key]).trim();
        if (value !== "") resolved[key] = value;
      }
    } catch {
      // A detached document or a browser refusing style reads: fallbacks stand.
    }
  }
  let displayFont = displayFontFallback;
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const value = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(displayFontProperty)
        .trim();
      if (value !== "") displayFont = value;
    } catch {
      // Fallback stands.
    }
  }

  return { ...resolved, ...sceneArt, displayFont };
}

/* ---- Colour maths -------------------------------------------------------- */

type Rgb = { r: number; g: number; b: number };

function parseColor(color: string): Rgb {
  const value = color.trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((character) => character + character)
            .join("")
        : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  const numbers = value.match(/[\d.]+/g);
  if (numbers !== null && numbers.length >= 3) {
    return { r: Number(numbers[0]), g: Number(numbers[1]), b: Number(numbers[2]) };
  }
  return { r: 255, g: 255, b: 255 };
}

/** `Color.withValues(alpha:)`, which is most of what the Flutter source does. */
export function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = parseColor(color);
  const clamped = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function mixColors(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return `rgb(${Math.round(a.r + (b.r - a.r) * k)}, ${Math.round(
    a.g + (b.g - a.g) * k,
  )}, ${Math.round(a.b + (b.b - a.b) * k)})`;
}

/**
 * Pushes a colour toward the app's near-black background — never toward pure
 * black, which reads as a hole rather than shadow.
 */
export function darken(color: string, amount: number, palette: ScenePalette): string {
  return mixColors(color, palette.rigShadow, amount);
}

/** The umpire's whites. A kit, so the rig can wear it like any other. */
export const umpireKit: FinalOverKit = {
  id: "_umpire",
  name: "UMPIRE",
  primary: "#e8ecf3",
  secondary: "#9aa8c7",
  accent: "#2a3550",
};

/** And the person inside them. */
export const umpireLook: FinalOverLook = { skin: "#c68642", hair: "#1c1310" };

export { finalOverKits };
