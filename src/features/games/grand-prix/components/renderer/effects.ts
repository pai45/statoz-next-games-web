import { sparkLifeSeconds } from "../../constants";

import { withAlpha } from "./palette";

/**
 * Sparks off a barrier or a wheel-to-wheel touch — Flame's
 * `ParticleSystemComponent` with the same figures: a burst thrown in every
 * direction at 60 to 220 px/s, pulled down at 260 px/s², living not quite half
 * a second.
 *
 * A pool rather than a component tree, because these are the only things on
 * screen that outlive the frame that spawned them and nothing else needs to
 * know they exist.
 */

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  color: string;
};

export class SparkField {
  private readonly sparks: Spark[] = [];

  spawn(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.4 + Math.random() * 1.8,
        life: sparkLifeSeconds,
        color,
      });
    }
  }

  paint(ctx: CanvasRenderingContext2D, dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const spark = this.sparks[i];
      spark.life -= dt;
      if (spark.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      spark.vy += 260 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;

      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(spark.color, spark.life / sparkLifeSeconds);
      ctx.fill();
    }
  }

  clear(): void {
    this.sparks.length = 0;
  }
}
