/**
 * Particles and the impact cinematic — the parts of `BasketballGame` that are
 * pure spectacle.
 *
 * Flame gives Flutter a `ParticleSystemComponent` that owns its own lifetime;
 * the web has no such thing, so this is a small fixed-capacity pool integrated
 * once per frame and drawn in screen space. The game loop never sees it: it
 * records *that* a swish or a block happened and where in the world, and the
 * pool decides what that looks like in pixels.
 *
 * Everything here is skipped under reduced motion — not played still, skipped.
 * The loop already refuses to queue bursts in that case.
 */

import type { Burst, HoopDuelGame } from "../../engine/game-loop";
import { BasketballRandom } from "../../engine/random";
import * as T from "../../tuning";

import { worldToScreen, type CourtProjection } from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Downward acceleration, px/s². */
  gravity: number;
  radius: number;
  color: string;
  life: number;
  lifespan: number;
};

/** Enough for several overlapping bursts; beyond that nobody can tell. */
const capacity = 120;

export class ParticleField {
  private readonly particles: Particle[] = [];
  private readonly random = new BasketballRandom(0xb00b5);

  /** Turns the loop's pending bursts into particles. */
  spawn(
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const bursts = game.drainBursts();
    for (const burst of bursts) {
      const at = worldToScreen(
        projection,
        game.camX,
        game.shake,
        burst.worldX,
        burst.worldH,
      );
      if (burst.kind === "swish") {
        this.swish(at.x, at.y, burst.count, palette);
      } else {
        this.spark(at.x, at.y, burst.count, this.toneColor(burst, palette));
      }
    }
  }

  private toneColor(burst: Burst, palette: ScenePalette): string {
    switch (burst.tone) {
      case "gold":
        return palette.gold;
      case "cyan":
        return palette.cyan;
      case "amber":
        return palette.amber;
    }
  }

  /** The net's spray: a cone thrown downward out of the rim. */
  private swish(x: number, y: number, count: number, palette: ScenePalette): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI / 2 + (this.random.nextDouble() - 0.5) * 0.9;
      const speed = 60 + this.random.nextDouble() * 120;
      this.add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 220,
        radius: 1.2 + this.random.nextDouble() * 1.6,
        color: withAlpha(this.random.nextBool() ? palette.gold : palette.cyan, 0.9),
        life: 0,
        lifespan: 0.5,
      });
    }
  }

  /** An omnidirectional pop, for a block or a shot clanging off the rim. */
  private spark(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i += 1) {
      const angle = this.random.nextDouble() * Math.PI * 2;
      const speed = 50 + this.random.nextDouble() * 150;
      this.add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 260,
        radius: 1.2 + this.random.nextDouble() * 1.6,
        color,
        life: 0,
        lifespan: 0.4,
      });
    }
  }

  private add(particle: Particle): void {
    // At capacity the oldest goes, which is always the least interesting.
    if (this.particles.length >= capacity) this.particles.shift();
    this.particles.push(particle);
  }

  paint(ctx: CanvasRenderingContext2D, dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life += dt;
      if (particle.life >= particle.lifespan) {
        this.particles.splice(i, 1);
        continue;
      }
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    }
  }

  clear(): void {
    this.particles.length = 0;
  }
}

/**
 * The impact cinematic: a decaying focal zoom-punch about the rim, plus a small
 * jitter, applied to the whole frame for the first ~0.3s after a dunk, a poster
 * or a block on a dunk.
 *
 * Call before drawing the scene and pair with `endImpactCinematic`.
 */
export function beginImpactCinematic(
  ctx: CanvasRenderingContext2D,
  game: HoopDuelGame,
  projection: CourtProjection,
): boolean {
  if (game.cineT <= 0 || game.reducedMotion) return false;

  const impact = game.cineT / T.cineSeconds;
  const focal = worldToScreen(
    projection,
    game.camX,
    game.shake,
    T.rimX,
    T.rimHeight,
  );

  ctx.save();
  ctx.translate(
    Math.sin(game.cineT * 47) * impact * 3,
    Math.cos(game.cineT * 53) * impact * 3,
  );
  const zoom = 1 + impact * T.cineZoom;
  ctx.translate(focal.x, focal.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-focal.x, -focal.y);
  return true;
}

export function endImpactCinematic(
  ctx: CanvasRenderingContext2D,
  active: boolean,
): void {
  if (active) ctx.restore();
}
