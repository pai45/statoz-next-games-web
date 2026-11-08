import type { CSSProperties } from "react";

import { cardClipPath } from "@statoz/design-system/games";
import { cardTierRank, type CardTier } from "@/domain/cards";

import styles from "./reveal-effects.module.css";

/** The palette's white, which several effects lighten towards. */
const WHITE = "var(--ds-color-text-default)";

/** The token backing a tier's own colour. */
export function tierVar(tier: CardTier, shade: "light" | "base" | "deep" = "base") {
  return `var(--ds-color-rarity-${tier}-${shade})`;
}

/**
 * The alternating second colour on the top tiers' rays. Flutter names white for
 * silver and a lighter hue for the rest; silver's own light shade is already
 * that near-white, so one rule covers all four.
 */
function rayPartner(tier: CardTier) {
  return tierVar(tier, tier === "platinum" ? "deep" : "light");
}

/** How strongly a tier's glow reads behind the card. */
const glowAlpha: Record<CardTier, number> = {
  bronze: 0.55,
  silver: 0.65,
  gold: 0.8,
  platinum: 0.9,
};

export function tierGlow(tier: CardTier): string {
  return `color-mix(in srgb, ${tierVar(tier)} ${glowAlpha[tier] * 100}%, transparent)`;
}

/* ---- Backdrop ---------------------------------------------------------- */

export type PackRevealBackdropProps = {
  tier: CardTier;
  /** Silver and above earn the rotating rays; bronze stays plain. */
  showRays?: boolean;
  /**
   * How long the effects wait before firing. The card lands one flip after the
   * pack bursts, and everything here is timed to that landing.
   */
  delayMs?: number;
};

/**
 * The bed every reveal sits on: a rarity-tinted bloom that breathes, a slow
 * scanline, an edge vignette, and — from silver up — the god-rays.
 */
export function PackRevealBackdrop({
  tier,
  showRays = true,
  delayMs = 0,
}: PackRevealBackdropProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-background"
      style={{ "--reveal-tier": tierGlow(tier) } as CSSProperties}
    >
      <div className={`${styles.glow} absolute inset-0`} />
      <div className={`${styles.scanline} absolute inset-x-0 top-0`} />
      {showRays ? <RayBurst tier={tier} delayMs={delayMs} /> : null}
      <div className={`${styles.vignette} absolute inset-0`} />
    </div>
  );
}

/* ---- God-rays ---------------------------------------------------------- */

/** Rays, and how bright they burn, escalating with tier. Bronze gets none. */
const rayCounts: Record<CardTier, number> = {
  bronze: 0,
  silver: 8,
  gold: 12,
  platinum: 16,
};

const rayAlpha: Record<CardTier, number> = {
  bronze: 0,
  silver: 0.09,
  gold: 0.16,
  platinum: 0.2,
};

/**
 * Builds the wedge gradient. Each ray fills 55% of its slice, leaving the gap
 * Flutter's half-angle leaves; platinum alternates two hues, so its period is
 * two slices rather than one.
 */
function rayGradient(tier: CardTier): string {
  const count = rayCounts[tier];
  const slice = 360 / count;
  const wedge = slice * 0.55;
  const tint = (color: string) =>
    `color-mix(in srgb, ${color} ${rayAlpha[tier] * 100}%, transparent)`;

  const primary = tint(tierVar(tier));
  if (tier !== "platinum") {
    return [
      "repeating-conic-gradient(from 0deg at 50% 50%,",
      `${primary} 0deg ${wedge}deg,`,
      `transparent ${wedge}deg ${slice}deg)`,
    ].join(" ");
  }

  const secondary = tint(rayPartner(tier));
  return [
    "repeating-conic-gradient(from 0deg at 50% 50%,",
    `${primary} 0deg ${wedge}deg,`,
    `transparent ${wedge}deg ${slice}deg,`,
    `${secondary} ${slice}deg ${slice + wedge}deg,`,
    `transparent ${slice + wedge}deg ${slice * 2}deg)`,
  ].join(" ");
}

export function RayBurst({
  tier,
  delayMs = 0,
}: {
  tier: CardTier;
  delayMs?: number;
}) {
  if (cardTierRank(tier) < 1) return null;

  return (
    <div
      aria-hidden
      className={`${styles.rays} absolute left-1/2 top-[46%]`}
      style={
        {
          "--ray-gradient": rayGradient(tier),
          "--ray-delay": `${delayMs}ms`,
        } as CSSProperties
      }
    />
  );
}

/* ---- Shockwave --------------------------------------------------------- */

/** Two rings punching outward as the card lands, the second a beat behind. */
export function Shockwave({
  tier,
  delayMs = 0,
}: {
  tier: CardTier;
  delayMs?: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ "--reveal-tier": tierVar(tier) } as CSSProperties}
    >
      {[0, 104].map((delay) => (
        <div
          key={delay}
          className={`${styles.ring} absolute left-1/2 top-[46%] rounded-full`}
          style={
            { "--ring-delay": `${delayMs + delay}ms` } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ---- Confetti ---------------------------------------------------------- */

/**
 * A tiny seeded generator. The spray must be identical on the server and in the
 * browser or React reports a hydration mismatch, so it is keyed on the card's
 * id rather than left to `Math.random`.
 */
function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash = (hash + 0x6d2b79f5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Particle = {
  dx: number;
  dy: number;
  dyMid: number;
  size: number;
  spin: number;
  tint: string;
  delay: number;
};

/** Gravity pulls the whole spray down by this much by the time it fades. */
const gravity = 40;

function buildParticles(tier: CardTier, seed: string): Particle[] {
  const random = seededRandom(seed);
  const rank = cardTierRank(tier);
  const out: Particle[] = [];

  const spray = (
    count: number,
    speedBase: number,
    speedSpread: number,
    sizeBase: number,
    sizeSpread: number,
    tintOf: (index: number) => string,
    delay: number,
  ) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * 2 * Math.PI + (random() - 0.5) * 0.3;
      const speed = speedBase + random() * speedSpread;
      out.push({
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed + gravity,
        dyMid: Math.sin(angle) * speed * 0.5 + gravity * 0.25,
        size: sizeBase + random() * sizeSpread,
        spin: random() * 180,
        tint: tintOf(i),
        delay,
      });
    }
  };

  // More confetti the rarer the pull: bronze 18, platinum 42.
  spray(18 + rank * 8, 80, 100, 2, 4, () =>
    random() < 0.6 ? tierVar(tier) : WHITE, 0,
  );

  // Gold and platinum earn a second, heavier wave a beat later.
  if (rank >= 2) {
    spray(12 + (rank - 2) * 8, 60, 80, 4, 6, (index) =>
      index % 2 === 0 ? "var(--ds-color-accent-gold)" : WHITE, 200,
    );
  }

  return out;
}

export type ConfettiProps = {
  tier: CardTier;
  /** Seeds the spray so the server and the browser draw the same one. */
  seed: string;
  /** Held back until the card has landed. */
  delayMs?: number;
};

export function Confetti({ tier, seed, delayMs = 0 }: ConfettiProps) {
  const particles = buildParticles(tier, seed);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {particles.map((particle, index) => (
        <span
          key={index}
          className={`${styles.particle} absolute left-1/2 top-1/2 block`}
          style={
            {
              "--dx": `${particle.dx.toFixed(1)}px`,
              "--dy": `${particle.dy.toFixed(1)}px`,
              "--dy-mid": `${particle.dyMid.toFixed(1)}px`,
              "--spin": `${particle.spin.toFixed(1)}deg`,
              "--tint": particle.tint,
              "--delay": `${delayMs + particle.delay}ms`,
              width: `${particle.size.toFixed(1)}px`,
              height: `${particle.size.toFixed(1)}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ---- Holographic foil sweep -------------------------------------------- */

/**
 * Per-tier foil: cooler tiers get a single calmer band, platinum a full rainbow
 * across two. Intensities stay moderate on purpose — this should read as light
 * moving over the card, not as a white-out.
 */
const holoBands: Record<
  CardTier,
  { colors: string[]; intensity: number; bands: number; durationMs: number }
> = {
  bronze: {
    colors: [tierVar("bronze"), tierVar("bronze", "light"), WHITE],
    intensity: 0.35,
    bands: 1,
    durationMs: 2200,
  },
  silver: {
    colors: [tierVar("silver"), WHITE, "var(--ds-color-accent-cyan)"],
    intensity: 0.35,
    bands: 1,
    durationMs: 2200,
  },
  gold: {
    colors: [
      tierVar("gold"),
      WHITE,
      tierVar("gold", "light"),
      tierVar("gold"),
    ],
    intensity: 0.42,
    bands: 2,
    durationMs: 1913,
  },
  platinum: {
    colors: [
      "var(--ds-color-accent-violet)",
      "var(--ds-color-accent-cyan)",
      "var(--ds-color-accent-gold)",
      "var(--ds-color-accent-violet)",
    ],
    intensity: 0.5,
    bands: 2,
    durationMs: 1692,
  },
};

function holoGradient(colors: string[]): string {
  const stops = colors.map((color, index) => {
    const at = 20 + (index / Math.max(colors.length - 1, 1)) * 50;
    return `${color} ${at.toFixed(0)}%`;
  });
  return `linear-gradient(115deg, transparent 0%, ${stops.join(", ")}, transparent 100%)`;
}

export type HoloSweepProps = {
  tier: CardTier;
  /** Clips the sweep to the card silhouette; actions are square-cornered. */
  chamfered?: boolean;
};

/**
 * Stretched over a card face. When chamfered it takes the card silhouette from
 * `cardClipPath`, whose cuts resolve against the wrapper this sits inside — the
 * same wrapper the card reads — so the shimmer stops exactly where the card
 * does, with nothing measured at runtime.
 */
export function HoloSweep({ tier, chamfered = true }: HoloSweepProps) {
  const foil = holoBands[tier];

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={chamfered ? { clipPath: cardClipPath } : undefined}
    >
      {Array.from({ length: foil.bands }, (_, index) => (
        <span
          key={index}
          className={`${styles.holo} absolute inset-0 block`}
          style={
            {
              "--holo-gradient": holoGradient(foil.colors),
              "--holo-intensity": foil.intensity,
              "--holo-duration": `${foil.durationMs}ms`,
              "--holo-delay": `${-(foil.durationMs / foil.bands) * index}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
