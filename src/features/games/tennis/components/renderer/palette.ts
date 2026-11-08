/**
 * The renderer's colours, and the only place in the module that holds one.
 *
 * A 2D canvas cannot read `var(--ds-*)`, so the design-system tokens are
 * resolved once against the document and handed to the draw functions as plain
 * strings. Nothing under `renderer/` may write a colour of its own — if a value
 * is missing it belongs here, either as a token read or as court art.
 *
 * "Court art" is the second half: the sky, the surface, the ball's felt, the
 * athlete's kit. Those are the painted world, and deliberately not tokens the
 * rest of the app can reach for.
 */

const tokenNames = {
  background: "--ds-color-background-primary",
  panel: "--ds-color-background-elevated",
  cyan: "--ds-color-accent-cyan",
  lime: "--ds-color-accent-lime",
  amber: "--ds-color-accent-orange",
  gold: "--ds-color-accent-gold",
  danger: "--ds-color-danger",
  border: "--ds-color-border-default",
  muted: "--ds-color-text-muted",
  text: "--ds-color-text-default",
} as const;

/**
 * The token values as they stand in `tokens.css`. Used on the server and as the
 * fallback when a custom property reads back empty, which happens in a detached
 * canvas and during thumbnail capture.
 */
const tokenFallbacks: Record<keyof typeof tokenNames, string> = {
  background: "#0d111a",
  panel: "#1d293d",
  cyan: "#5cdfff",
  lime: "#51ff94",
  amber: "#ff8904",
  gold: "#fdc700",
  danger: "#ff4d4d",
  border: "#314158",
  muted: "#90a1b9",
  text: "#ffffff",
};

/**
 * The painted world.
 *
 * The athlete's kit is one palette rather than several. Flutter's `_palette(id)`
 * branches on seven ids — `jett-okafor`, `mira-chen`, and five more — that do
 * not exist anywhere in the top-100 roster the game actually deals from, so
 * every athlete already falls through to its default. These are those default
 * values; the six unreachable branches are not carried across, because carrying
 * them would be inventing dead code rather than preserving behaviour.
 */
const courtArt = {
  /** The stadium bowl behind the court, top to bottom. */
  skyTop: "#101f2b",
  skyDeep: "#040814",

  /** The surface: a hard court, lit from the near end. */
  surfaceNear: "#164b50",
  surfaceFar: "#0b303b",
  courtShadow: "#02050b",

  /** The athlete. One kit, as above. */
  skin: "#ca8464",
  hair: "#30201e",
  shirt: "#67dcff",
  shorts: "#20314a",

  /** The ball's felt, lit and unlit. */
  ballLit: "#f5ff8b",
  ballShade: "#a8d520",
} as const;

export type ScenePalette = Record<keyof typeof tokenNames, string> & typeof courtArt;

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
  return { ...resolved, ...courtArt };
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
