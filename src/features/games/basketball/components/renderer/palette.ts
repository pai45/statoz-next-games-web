import { typography } from "@statoz/design-system/games/tokens/typography";
/**
 * The renderer's colours, and the only place in the module that holds one.
 *
 * A 2D canvas cannot read `var(--ds-*)`, so the design-system tokens are
 * resolved once against the document and handed to the draw functions as plain
 * strings. Nothing under `renderer/` may invent a colour — if a value is
 * missing it belongs here, either as a token read or as scene art.
 *
 * "Scene art" is the second half of the file: the night sky over the rooftop,
 * the hardwood, the backboard glass, the ball. Those are the painted world, the
 * way a team's livery is data — not palette decisions, and not tokens the rest
 * of the app should be able to reach for.
 */

export type ScenePalette = {
  /* Design-system tokens. */
  background: string;
  backgroundMuted: string;
  card: string;
  panel: string;
  cyan: string;
  violet: string;
  amber: string;
  gold: string;
  lime: string;
  danger: string;
  success: string;
  border: string;
  borderMuted: string;
  line: string;
  muted: string;
  text: string;

  /* Scene art. */
  arenaSky: string;
  arenaHorizon: string;
  arenaVioletHorizon: string;
  arenaFloor: string;
  hoopPole: string;
  backboardGlass: string;
  net: string;
  shotClockBox: string;
  ballSeam: string;
  rigShadow: string;

  /**
   * The display family, already resolved.
   *
   * `ctx.font` is parsed by the canvas, not the cascade — a `var()` in it is
   * invalid and the whole assignment is silently dropped, leaving 10px sans. So
   * the family is read from the computed style here and every draw call builds
   * its font string from this.
   */
  displayFont: string;
};

const tokenNames = {
  background: "--ds-color-background-primary",
  backgroundMuted: "--ds-color-background-muted",
  card: "--ds-color-background-secondary",
  panel: "--ds-color-background-elevated",
  cyan: "--ds-color-accent-cyan",
  violet: "--ds-color-accent-violet",
  amber: "--ds-color-accent-orange",
  gold: "--ds-color-accent-gold",
  lime: "--ds-color-accent-lime",
  danger: "--ds-color-danger",
  success: "--ds-color-success",
  border: "--ds-color-border-default",
  borderMuted: "--ds-color-border-muted",
  line: "--ds-color-border-strong",
  muted: "--ds-color-text-muted",
  text: "--ds-color-text-default",
} as const;

const displayFontProperty = "--ds-font-display";
const displayFontFallback = '"Orbitron", "Space Grotesk", system-ui, sans-serif';

/**
 * The token values as they stand in `tokens.css`. Used on the server and as the
 * fallback when a custom property reads back empty, which happens in a detached
 * canvas and during thumbnail capture.
 */
const tokenFallbacks: Record<keyof typeof tokenNames, string> = {
  background: "#0d111a",
  backgroundMuted: "#070c1f",
  card: "#0f172b",
  panel: "#1d293d",
  cyan: "#5cdfff",
  violet: "#c27aff",
  amber: "#ff8904",
  gold: "#fdc700",
  lime: "#51ff94",
  danger: "#ff4d4d",
  success: "#05df72",
  border: "#314158",
  borderMuted: "#243654",
  line: "#45556c",
  muted: "#90a1b9",
  text: "#ffffff",
};

/** The painted world. Not tokens, and deliberately not reachable as tokens. */
const sceneArt = {
  arenaSky: "#020812",
  arenaHorizon: "#071522",
  arenaVioletHorizon: "#101024",
  arenaFloor: "#02050b",
  hoopPole: "#232b3d",
  backboardGlass: "rgba(232, 236, 242, 0.08)",
  net: "rgba(232, 236, 242, 0.56)",
  shotClockBox: "#070b14",
  ballSeam: "#5b2c07",
  rigShadow: "#05070b",
} as const;

/**
 * Reads the live token values. Called on mount and whenever the theme changes,
 * never per frame — `getComputedStyle` forces a style flush.
 */
export function readScenePalette(): ScenePalette {
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
      // A detached document or a browser refusing style reads: fallbacks stand.
    }
  }

  return { ...resolved, ...sceneArt, displayFont };
}

/* ---- Colour maths --------------------------------------------------------- */

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

/**
 * Pushes a colour toward the app's near-black background — never toward pure
 * black, which reads as a hole rather than shadow.
 */
export function darken(color: string, amount: number): string {
  return mixColors(color, sceneArt.rigShadow, amount);
}

/** A display-font string for `ctx.font`, built the only way the canvas accepts. */
export function displayFontOf(
  palette: ScenePalette,
  sizePx: number,
  weight: number = typography.weight.extrabold,
): string {
  return `${weight} ${sizePx.toFixed(1)}px ${palette.displayFont}`;
}
