/**
 * The renderer's colours, and the only place under `renderer/` that holds one.
 *
 * A 2D canvas cannot read `var(--ds-*)`, so the design-system tokens are
 * resolved once against the document and handed to the draw functions as plain
 * strings. Nothing else in this directory may invent a colour.
 *
 * The second half is scene art: the grass, the asphalt, the checker, and the
 * carbon and rubber a car is made of. Those are the painted world, the way a
 * livery is data — not palette decisions, and deliberately not tokens the rest
 * of the app can reach for.
 */

export type RacePalette = {
  /* Design-system tokens. */
  background: string;
  panel: string;
  cyan: string;
  amber: string;
  gold: string;
  danger: string;
  success: string;
  racing: string;
  border: string;
  muted: string;
  text: string;

  /* Scene art. */
  grass: string;
  asphalt: string;
  checkerLight: string;
  checkerDark: string;
  carbon: string;
  tyre: string;
  rim: string;
  halo: string;
  suspension: string;

  /**
   * The display family, already resolved. `ctx.font` is parsed by the canvas
   * rather than the cascade, so a `var()` inside it is invalid and the whole
   * assignment is silently dropped.
   */
  displayFont: string;
};

const tokenNames = {
  background: "--ds-color-background-primary",
  panel: "--ds-color-background-elevated",
  cyan: "--ds-color-accent-cyan",
  amber: "--ds-color-accent-orange",
  gold: "--ds-color-accent-gold",
  danger: "--ds-color-danger",
  success: "--ds-color-success",
  racing: "--ds-color-accent-racing",
  border: "--ds-color-border-default",
  muted: "--ds-color-text-muted",
  text: "--ds-color-text-default",
} as const;

const displayFontProperty = "--ds-font-display";
const displayFontFallback = '"Orbitron", "Space Grotesk", system-ui, sans-serif';

/**
 * The token values as they stand in `tokens.css`. Used on the server and
 * whenever a custom property reads back empty, which happens in a detached
 * canvas and during thumbnail capture.
 */
const tokenFallbacks: Record<keyof typeof tokenNames, string> = {
  background: "#0d111a",
  panel: "#1d293d",
  cyan: "#5cdfff",
  amber: "#ff8904",
  gold: "#fdc700",
  danger: "#ff4d4d",
  success: "#05df72",
  racing: "#f42d29",
  border: "#314158",
  muted: "#90a1b9",
  text: "#ffffff",
};

/** The painted world. Not tokens, and deliberately not reachable as tokens. */
const sceneArt = {
  grass: "#07230f",
  asphalt: "#11161f",
  checkerLight: "#e8ecf2",
  checkerDark: "#0a0e14",
  carbon: "#060910",
  tyre: "#05070b",
  rim: "#4a5462",
  halo: "#39424f",
  suspension: "#2a313c",
} as const;

/**
 * Reads the live token values. Called on mount and whenever the theme changes,
 * never per frame — `getComputedStyle` forces a style flush.
 */
export function readRacePalette(): RacePalette {
  const resolved = { ...tokenFallbacks };
  let displayFont = displayFontFallback;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const styles = window.getComputedStyle(document.documentElement);
      for (const key of Object.keys(tokenNames) as (keyof typeof tokenNames)[]) {
        const value = styles.getPropertyValue(tokenNames[key]).trim();
        if (value !== "") resolved[key] = value;
      }
      const family = styles.getPropertyValue(displayFontProperty).trim();
      if (family !== "") displayFont = family;
    } catch {
      // A detached document, or a browser refusing style reads: fallbacks hold.
    }
  }

  return { ...resolved, ...sceneArt, displayFont };
}

/* ---- Colour maths ---------------------------------------------------------- */

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

/** `Color.lerp`. */
export function mixColors(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return `rgb(${Math.round(a.r + (b.r - a.r) * k)}, ${Math.round(
    a.g + (b.g - a.g) * k,
  )}, ${Math.round(a.b + (b.b - a.b) * k)})`;
}

/** Pushes a colour toward black, which is what the car's shading does. */
export function darken(color: string, amount: number): string {
  return mixColors(color, "#000000", amount);
}
