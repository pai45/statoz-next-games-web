import { typography } from "@statoz/design-system/games/tokens/typography";
/**
 * The rooftop neon court — the web port of `_CourtComponent` from
 * `games/basketball/basketball_game.dart`.
 *
 * A night skyline in two parallax layers, roof clutter, a small event bowl with
 * a lighting truss and team banners, two rows of bobbing crowd silhouettes over
 * a scrolling LED hoarding, the hardwood with its markings, and the hoop
 * assembly with a swaying net and a diegetic shot clock.
 *
 * Every scattered thing — stars, towers, air-conditioning units — is generated
 * once from a fixed seed and then never again, so the skyline is the same
 * skyline on every frame and in every match. Flutter seeds `Random(11)`,
 * `Random(7)` and `Random(23)` for exactly that reason; the values differ from
 * Dart's stream but the structure, the counts and the ranges do not, and
 * decorative noise is the one place where that is the whole requirement.
 *
 * Atmosphere stays dark and the court markings stay high-contrast: the game is
 * read off the floor, not off the scenery.
 */

import { liveryById, liveryCode } from "../../data/liveries";
import type { HoopDuelGame } from "../../engine/game-loop";
import { BasketballRandom } from "../../engine/random";
import * as T from "../../tuning";

import {
  worldToScreen,
  type CourtProjection,
  type ScreenPoint,
} from "./geometry";
import {
  displayFontOf,
  mixColors,
  withAlpha,
  type ScenePalette,
} from "./palette";

/* ---- Generated scenery ---------------------------------------------------- */

type StarSpec = { x01: number; y01: number; radius: number; alpha: number };

type TowerWindowSpec = { x01: number; y01: number; cyan: boolean };

type TowerSpec = {
  worldX: number;
  width: number;
  height: number;
  near: boolean;
  billboard: boolean;
  billboardY01: number;
  billboardCyan: boolean;
  windows: TowerWindowSpec[];
};

type RoofPropKind = "acUnit" | "antenna" | "railing";

type RoofPropSpec = {
  worldX: number;
  kind: RoofPropKind;
  width: number;
  height: number;
};

const roofPropKinds: RoofPropKind[] = ["acUnit", "antenna", "railing"];

function buildStars(): StarSpec[] {
  const random = new BasketballRandom(11);
  return Array.from({ length: 24 }, () => ({
    x01: random.nextDouble(),
    y01: random.nextDouble() * 0.72,
    radius: 0.4 + random.nextDouble() * 1.1,
    alpha: 0.08 + random.nextDouble() * 0.16,
  }));
}

function buildTowers(): TowerSpec[] {
  const random = new BasketballRandom(7);
  return Array.from({ length: 12 }, (_, index) => {
    const windows: TowerWindowSpec[] = [];
    for (let window = 0; window < 7; window += 1) {
      if (random.nextDouble() < 0.44) continue;
      windows.push({
        x01: 0.12 + random.nextDouble() * 0.76,
        y01: 0.1 + random.nextDouble() * 0.78,
        cyan: window % 2 === 0,
      });
    }
    return {
      worldX: index * 1.55 - 2.6,
      width: 0.78 + random.nextDouble() * 0.85,
      height: 2.0 + random.nextDouble() * 2.5,
      near: index % 2 === 1,
      billboard: random.nextDouble() < 0.36,
      billboardY01: 0.18 + random.nextDouble() * 0.32,
      billboardCyan: random.nextBool(),
      windows,
    };
  });
}

function buildRoofProps(): RoofPropSpec[] {
  const random = new BasketballRandom(23);
  return Array.from({ length: 13 }, (_, index) => ({
    worldX: index * 1.35 - 2.0,
    kind: roofPropKinds[random.nextInt(roofPropKinds.length)],
    width: 0.55 + random.nextDouble() * 0.55,
    height: 0.28 + random.nextDouble() * 0.75,
  }));
}

const arenaFixtures = [
  { x01: 0.1, homeSide: true, drop: 0.18 },
  { x01: 0.25, homeSide: true, drop: 0.1 },
  { x01: 0.39, homeSide: true, drop: 0.16 },
  { x01: 0.61, homeSide: false, drop: 0.16 },
  { x01: 0.75, homeSide: false, drop: 0.1 },
  { x01: 0.9, homeSide: false, drop: 0.18 },
];

const cameraFlashes = [
  { x01: 0.12, height: 1.08, phase: 0 },
  { x01: 0.32, height: 0.92, phase: 4 },
  { x01: 0.56, height: 1.18, phase: 7 },
  { x01: 0.78, height: 1.02, phase: 10 },
  { x01: 0.92, height: 0.88, phase: 13 },
];

const tickerFlavors = [
  "HOOP DUEL LIVE",
  "ROOFTOP CIRCUIT",
  "NEON COURT NIGHTS",
  "HEAT CHECK SEASON",
];

/* ---- The scene ------------------------------------------------------------ */

/**
 * Everything about the court that outlives a frame: the generated scenery and
 * the cached gradients, which are rebuilt only when the viewport changes.
 */
export class CourtScene {
  private readonly stars = buildStars();
  private readonly towers = buildTowers();
  private readonly roofProps = buildRoofProps();

  private time = 0;

  private cachedWidth = -1;
  private cachedHeight = -1;
  private cachedFloorY = -1;
  private skyGradient: CanvasGradient | null = null;
  private hazeGradient: CanvasGradient | null = null;
  private floorGradient: CanvasGradient | null = null;

  private tickerKey = -1;
  private tickerText = "";

  advance(dt: number): void {
    this.time += dt;
  }

  /** Under reduced motion the world holds still rather than playing on mute. */
  private decorativeTime(reducedMotion: boolean): number {
    return reducedMotion ? 0 : this.time;
  }

  private ensureGradients(
    ctx: CanvasRenderingContext2D,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const { width, height, floorY, px } = projection;
    if (
      this.cachedWidth === width &&
      this.cachedHeight === height &&
      this.cachedFloorY === floorY
    ) {
      return;
    }
    this.cachedWidth = width;
    this.cachedHeight = height;
    this.cachedFloorY = floorY;

    const skyBottom = Math.max(1, floorY - 2.0 * px);

    const sky = ctx.createLinearGradient(0, 0, 0, skyBottom);
    sky.addColorStop(0, palette.arenaSky);
    sky.addColorStop(0.62, palette.arenaVioletHorizon);
    sky.addColorStop(1, palette.background);
    this.skyGradient = sky;

    const haze = ctx.createLinearGradient(
      0,
      skyBottom - px * 0.9,
      0,
      skyBottom + px * 0.5,
    );
    haze.addColorStop(0, withAlpha(palette.arenaHorizon, 0));
    haze.addColorStop(0.56, withAlpha(palette.cyan, 0.055));
    haze.addColorStop(1, withAlpha(palette.arenaHorizon, 0.28));
    this.hazeGradient = haze;

    const floor = ctx.createLinearGradient(0, floorY, 0, height);
    floor.addColorStop(0, palette.arenaVioletHorizon);
    floor.addColorStop(1, palette.arenaFloor);
    this.floorGradient = floor;
  }

  paint(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    this.ensureGradients(ctx, projection, palette);
    this.skyline(ctx, game, projection, palette);
    this.paintRoofProps(ctx, game, projection, palette);
    this.eventRig(ctx, game, projection, palette);
    this.crowd(ctx, game, projection, palette);
    this.floor(ctx, game, projection, palette);
    this.hoop(ctx, game, projection, palette);
  }

  /* ---- Sky ---------------------------------------------------------------- */

  private skyline(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const { width, height, floorY, px } = projection;
    const skyBottom = floorY - 2.0 * px;

    if (this.skyGradient !== null) {
      ctx.fillStyle = this.skyGradient;
      ctx.fillRect(0, 0, width, floorY);
    }

    const decorativeT = this.decorativeTime(game.reducedMotion);
    for (let i = 0; i < this.stars.length; i += 1) {
      const star = this.stars[i];
      const twinkle = game.reducedMotion
        ? 1
        : 0.82 + Math.sin(decorativeT * 1.7 + i * 1.9) * 0.18;
      fillCircle(
        ctx,
        star.x01 * width,
        star.y01 * Math.max(0, skyBottom),
        star.radius,
        withAlpha(palette.text, star.alpha * twinkle),
      );
    }

    // A moon, with a bite taken out of it by a second disc in the sky colour.
    const moonX = width * 0.78 - game.camX * px * 0.05;
    const moonY = height * 0.14;
    fillCircle(ctx, moonX, moonY, px * 0.3, withAlpha(palette.text, 0.42));
    fillCircle(
      ctx,
      moonX - px * 0.11,
      moonY - px * 0.05,
      px * 0.27,
      palette.arenaSky,
    );

    // A blimp on a slow loop, wearing the player's livery on its flank.
    const blimpW = px * 1.4;
    const blimpTravel = width + blimpW * 2;
    const blimpX = game.reducedMotion
      ? width * 0.24
      : ((decorativeT * 8) % blimpTravel) - blimpW;
    const blimpY = height * 0.09;
    ctx.beginPath();
    ctx.ellipse(blimpX, blimpY, blimpW / 2, (px * 0.4) / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.card;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(blimpX - blimpW * 0.42, blimpY);
    ctx.lineTo(blimpX - blimpW * 0.62, blimpY - px * 0.22);
    ctx.lineTo(blimpX - blimpW * 0.62, blimpY + px * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(liveryById(game.config.teamId).primary, 0.28);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(
      blimpX - (blimpW * 0.6) / 2,
      blimpY - (px * 0.16) / 2,
      blimpW * 0.6,
      px * 0.16,
    );

    // A faint magenta grid receding into the haze.
    for (let i = 0; i < 12; i += 1) {
      const gridY = floorY - px * 2.3 - i * px * 0.45;
      strokeLine(ctx, 0, gridY, width, gridY, withAlpha(palette.violet, 0.035), 1);
    }

    this.towerLayer(ctx, game, projection, palette, false);

    if (this.hazeGradient !== null) {
      ctx.fillStyle = this.hazeGradient;
      ctx.fillRect(0, Math.max(0, skyBottom - px * 0.9), width, px * 1.45);
    }

    this.towerLayer(ctx, game, projection, palette, true);
  }

  private towerLayer(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
    near: boolean,
  ): void {
    const { width, floorY, px } = projection;
    const baseY = floorY - (near ? 1.78 : 1.95) * px;
    for (const tower of this.towers) {
      if (tower.near !== near) continue;
      const parallax = near ? 0.86 : 0.68;
      const centerX = width / 2 + (tower.worldX - game.camX) * px * parallax;
      const towerWidth = tower.width * px * (near ? 1 : 0.82);
      const towerHeight = tower.height * px * (near ? 1 : 0.78);
      const left = centerX - towerWidth / 2;
      const top = baseY - towerHeight;

      ctx.fillStyle = near ? palette.backgroundMuted : palette.arenaHorizon;
      ctx.fillRect(left, top, towerWidth, towerHeight);

      if (tower.billboard) {
        const boardHeight = Math.min(px * 0.5, towerHeight * 0.24);
        ctx.strokeStyle = withAlpha(
          tower.billboardCyan ? palette.cyan : palette.violet,
          near ? 0.19 : 0.1,
        );
        ctx.lineWidth = 1.4;
        ctx.strokeRect(
          left - 2,
          top + towerHeight * tower.billboardY01,
          towerWidth + 4,
          boardHeight,
        );
      }

      for (const window of tower.windows) {
        ctx.fillStyle = withAlpha(
          window.cyan ? palette.cyan : palette.violet,
          near ? 0.23 : 0.12,
        );
        ctx.fillRect(
          left + towerWidth * window.x01,
          top + towerHeight * window.y01,
          near ? 3 : 2,
          near ? 5 : 4,
        );
      }
    }
  }

  /**
   * Near-rooftop clutter at parallax 0.3 — the depth layer between the far
   * towers and the crowd, and the thing that says this court is on a roof.
   */
  private paintRoofProps(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const { floorY, px } = projection;
    const baseY = floorY - 1.62 * px;

    for (const spec of this.roofProps) {
      const at = worldToScreen(
        projection,
        game.camX,
        game.shake,
        spec.worldX * 0.7 + game.camX * 0.3,
        0,
      );
      const width = spec.width * px;
      const height = spec.height * px;

      switch (spec.kind) {
        case "acUnit": {
          const unitHeight = Math.min(height, 0.42 * px);
          const left = at.x - width / 2;
          const top = baseY - unitHeight;
          ctx.fillStyle = palette.background;
          ctx.fillRect(left, top, width, unitHeight);
          ctx.strokeStyle = withAlpha(palette.line, 0.28);
          ctx.lineWidth = 1;
          ctx.strokeRect(left + 2, top + 2, width - 4, unitHeight - 4);
          ctx.beginPath();
          ctx.arc(
            left + width / 2,
            top + unitHeight / 2,
            unitHeight * 0.24,
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = withAlpha(palette.line, 0.34);
          ctx.stroke();
          break;
        }
        case "antenna":
          strokeLine(ctx, at.x, baseY, at.x, baseY - height, palette.borderMuted, 2);
          strokeLine(
            ctx,
            at.x - 0.1 * px,
            baseY - height * 0.62,
            at.x + 0.1 * px,
            baseY - height * 0.62,
            palette.borderMuted,
            2,
          );
          fillCircle(ctx, at.x, baseY - height, 2, withAlpha(palette.violet, 0.32));
          break;
        case "railing":
          strokeLine(
            ctx,
            at.x - width / 2,
            baseY - 0.16 * px,
            at.x + width / 2,
            baseY - 0.16 * px,
            palette.borderMuted,
            2,
          );
          for (let post = 0; post <= 3; post += 1) {
            const postX = at.x - width / 2 + (width * post) / 3;
            strokeLine(ctx, postX, baseY, postX, baseY - 0.16 * px, palette.borderMuted, 2);
          }
          break;
      }
    }
  }

  /* ---- The event bowl ----------------------------------------------------- */

  private eventRig(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const { width, floorY, px } = projection;
    const home = liveryById(game.config.teamId);
    const cpu = liveryById(game.config.cpuTeamId);

    // Stepped grandstand slabs read as an event bowl behind the crowd without
    // competing with the live court markings.
    for (let tier = 0; tier < 3; tier += 1) {
      const inset = width * (0.015 + tier * 0.025);
      const top = floorY - (1.72 - tier * 0.32) * px;
      const bottom = top + px * 0.38;
      ctx.beginPath();
      ctx.moveTo(inset + px * 0.18, top);
      ctx.lineTo(width - inset, top);
      ctx.lineTo(width - inset - px * 0.18, bottom);
      ctx.lineTo(inset, bottom);
      ctx.closePath();
      ctx.fillStyle = withAlpha(
        tier % 2 === 0 ? palette.backgroundMuted : palette.panel,
        tier === 2 ? 0.72 : 0.55,
      );
      ctx.fill();
      strokeLine(
        ctx,
        inset + px * 0.18,
        top,
        width - inset,
        top,
        withAlpha(palette.line, 0.22),
        1,
      );
    }

    // The lighting truss.
    const trussTop = floorY - 3.05 * px;
    const trussBase = floorY - 0.72 * px;
    const left = width * 0.045;
    const right = width * 0.955;
    const trussColor = withAlpha(palette.borderMuted, 0.72);
    strokeLine(ctx, left, trussTop, right, trussTop, trussColor, 2);
    for (const x of [left, right]) {
      strokeLine(ctx, x, trussTop, x, trussBase, trussColor, 2);
      for (let segment = 0; segment < 4; segment += 1) {
        const y0 = trussTop + ((trussBase - trussTop) * segment) / 4;
        const y1 = trussTop + ((trussBase - trussTop) * (segment + 1)) / 4;
        const inward = x === left ? px * 0.17 : -px * 0.17;
        const cross = withAlpha(palette.line, 0.34);
        strokeLine(ctx, x, y0, x + inward, y1, cross, 1);
        strokeLine(ctx, x + inward, y0, x, y1, cross, 1);
      }
    }

    for (const fixture of arenaFixtures) {
      const x = width * fixture.x01;
      const team = fixture.homeSide ? home : cpu;
      const centerY = trussTop + fixture.drop * px;
      const fw = px * 0.22;
      const fh = px * 0.16;
      ctx.fillStyle = palette.panel;
      ctx.fillRect(x - fw / 2, centerY - fh / 2, fw, fh);
      strokeLine(ctx, x, trussTop, x, centerY - fh / 2, withAlpha(palette.line, 0.38), 1);
      strokeLine(
        ctx,
        x - fw / 2 + 2,
        centerY + fh / 2,
        x + fw / 2 - 2,
        centerY + fh / 2,
        withAlpha(team.primary, 0.42),
        2,
      );
    }

    const bannerY = floorY - 2.35 * px;
    this.teamBanner(ctx, palette, {
      centerX: width * 0.21,
      centerY: bannerY,
      width: px * 1.55,
      height: px * 0.48,
      color: home.primary,
      label: `YOU·${liveryCode(home.id)}`,
      mirrored: false,
    });
    this.teamBanner(ctx, palette, {
      centerX: width * 0.79,
      centerY: bannerY,
      width: px * 1.55,
      height: px * 0.48,
      color: cpu.primary,
      label: `${liveryCode(cpu.id)}·CPU`,
      mirrored: true,
    });
  }

  private teamBanner(
    ctx: CanvasRenderingContext2D,
    palette: ScenePalette,
    options: {
      centerX: number;
      centerY: number;
      width: number;
      height: number;
      color: string;
      label: string;
      mirrored: boolean;
    },
  ): void {
    const { centerX, centerY, width, height, color, label, mirrored } = options;
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    const top = centerY - height / 2;
    const bottom = centerY + height / 2;
    const cut = Math.min(8, height * 0.28);

    ctx.beginPath();
    ctx.moveTo(left + (mirrored ? 0 : cut), top);
    ctx.lineTo(right - (mirrored ? cut : 0), top);
    ctx.lineTo(right, top + (mirrored ? cut : 0));
    ctx.lineTo(right - (mirrored ? 0 : cut), bottom);
    ctx.lineTo(left + (mirrored ? cut : 0), bottom);
    ctx.lineTo(left, bottom - (mirrored ? 0 : cut));
    ctx.closePath();
    ctx.fillStyle = mixColors(palette.panel, color, 0.22);
    ctx.fill();
    ctx.strokeStyle = mixColors(palette.line, color, 0.58);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.font = displayFontOf(palette, typography.sizePx.p8, typography.weight.extrabold);
    ctx.fillStyle = withAlpha(palette.text, 0.84);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    withLetterSpacing(ctx, "1.3px", () => ctx.fillText(label, centerX, centerY));
    ctx.restore();
  }

  /* ---- Crowd -------------------------------------------------------------- */

  private crowd(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const { width, floorY, px } = projection;
    const engine = game.engine;
    const hyped = engine.teams[0].heatActive || engine.teams[1].heatActive;
    // Sustained heat sets the floor; a big play surges on top of it — the crowd
    // stands up for a beat, then settles.
    const amp = game.reducedMotion ? 0 : (hyped ? 0.08 : 0.03) + game.crowdHype * 0.06;
    const freq = hyped ? 7.0 : 2.4 + game.crowdHype * 3;
    const decorativeT = this.decorativeTime(game.reducedMotion);
    const userLivery = liveryById(game.config.teamId);
    const cpuLivery = liveryById(game.config.cpuTeamId);

    for (const layer of [0, 1]) {
      const baseY = floorY - (1.35 - layer * 0.55) * px;
      const base = layer === 0 ? palette.background : palette.card;
      const pockets: { x: number; y: number; w: number; h: number; color: string }[] = [];

      ctx.beginPath();
      ctx.moveTo(0, baseY + px);
      let col = 0;
      for (let sx = -20; sx <= width + 20; sx += px * 0.5) {
        // Stable per-column head-height variance from a seedless hash, so no
        // per-frame allocation and no shimmer between frames.
        const hash = Math.sin(sx * 12.9898 + layer * 78.233) * 43758.5453;
        const variance = (hash - Math.floor(hash)) * 0.16;
        const head = 0.16 + variance + layer * 0.1;
        const bob = Math.sin(decorativeT * freq + sx * 0.11 + layer * 2) * amp * px;
        ctx.lineTo(sx, baseY - head * px + bob);
        ctx.lineTo(sx + px * 0.25, baseY - (0.05 + layer * 0.1) * px + bob);
        // Team-colour fan pockets, alternating supporters.
        if (col % 6 === 0 && layer === 1) {
          pockets.push({
            x: sx,
            y: baseY - head * px + bob,
            w: px * 0.4,
            h: px * 0.16,
            color: mixColors(
              base,
              Math.floor(col / 6) % 2 === 0 ? userLivery.primary : cpuLivery.primary,
              0.3,
            ),
          });
        }
        col += 1;
      }
      ctx.lineTo(width + 20, baseY + px);
      ctx.closePath();
      ctx.fillStyle = base;
      ctx.fill();

      for (const pocket of pockets) {
        ctx.fillStyle = pocket.color;
        ctx.fillRect(pocket.x, pocket.y, pocket.w, pocket.h);
      }
    }

    // Camera flashes when the building is up, or surging on a big play.
    if (!game.reducedMotion && (hyped || game.crowdHype > 0.3)) {
      const beat = Math.floor(decorativeT * 12);
      for (const flash of cameraFlashes) {
        if ((beat + flash.phase) % 17 !== 0) continue;
        fillCircle(
          ctx,
          flash.x01 * width,
          floorY - px * flash.height,
          px * 0.055,
          withAlpha(palette.text, 0.28 + game.crowdHype * 0.42),
        );
      }
    }

    // The hoarding rail between the crowd and the court.
    const railY = floorY - 0.78 * px;
    const railH = 0.78 * px;
    ctx.fillStyle = palette.arenaFloor;
    ctx.fillRect(0, railY, width, railH);
    this.ticker(ctx, game, projection, palette, railY, railH);

    // The rail edge lifts briefly when a basket flashes the boards.
    const edgeLift = game.scoreFlashT > 0 ? game.scoreFlashT / T.scoreFlashSeconds : 0;
    strokeLine(
      ctx,
      0,
      railY,
      width,
      railY,
      edgeLift > 0
        ? withAlpha(game.scoreFlashColor, 0.25 + edgeLift * 0.5)
        : withAlpha(palette.cyan, 0.25),
      2,
    );

    // Calm team-colour LED segments brand the venue; only a score brightens
    // them, so the persistent chrome stays free of glow.
    const ledY = railY + railH - 3;
    const ledCount = 12;
    const gap = 3;
    const ledW = (width - gap * (ledCount + 1)) / ledCount;
    for (let index = 0; index < ledCount; index += 1) {
      const teamColor =
        index < ledCount / 2 ? userLivery.primary : cpuLivery.primary;
      const activeColor = edgeLift > 0 ? game.scoreFlashColor : teamColor;
      ctx.fillStyle = withAlpha(activeColor, 0.22 + edgeLift * 0.42);
      ctx.fillRect(gap + index * (ledW + gap), ledY, ledW, 1.5);
    }
  }

  /** The scrolling LED score line. Re-laid out only when the score changes. */
  private ticker(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
    railY: number,
    railH: number,
  ): void {
    const engine = game.engine;
    const key =
      engine.teams[0].score * 1000 + engine.teams[1].score + engine.halfIndex * 1000000;
    if (key !== this.tickerKey || this.tickerText === "") {
      this.tickerKey = key;
      this.tickerText =
        `YOU ${engine.teams[0].score} — ${engine.teams[1].score} CPU` +
        `  •  ${tickerFlavors[key % tickerFlavors.length]}  •  `;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, railY, projection.width, railH);
    ctx.clip();
    ctx.font = displayFontOf(palette, typography.sizePx.p10, typography.weight.bold);
    ctx.fillStyle = withAlpha(palette.cyan, 0.5);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    withLetterSpacing(ctx, "2px", () => {
      const textWidth = ctx.measureText(this.tickerText).width;
      if (textWidth <= 0) return;
      const textY = railY + railH / 2;
      let dx = game.reducedMotion
        ? 8
        : ((this.decorativeTime(false) * -40) % textWidth) - textWidth;
      while (dx < projection.width) {
        ctx.fillText(this.tickerText, dx, textY);
        dx += textWidth;
      }
    });
    ctx.restore();
  }

  /* ---- Floor -------------------------------------------------------------- */

  private floor(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const { width, height, floorY, px } = projection;
    const floorDepth = height - floorY;
    const project = (x: number, h: number) =>
      worldToScreen(projection, game.camX, game.shake, x, h);

    if (this.floorGradient !== null) {
      ctx.fillStyle = this.floorGradient;
      ctx.fillRect(0, floorY, width, floorDepth);
    }

    // Perspective depth bands stay flat and quiet; the live court lines carry
    // the visual hierarchy.
    for (let band = 1; band <= 5; band += 1) {
      const depth = Math.pow(band / 5, 1.55);
      const y = floorY + floorDepth * depth;
      strokeLine(
        ctx,
        0,
        y,
        width,
        y,
        withAlpha(band % 2 === 0 ? palette.cyan : palette.line, band % 2 === 0 ? 0.035 : 0.12),
        band === 5 ? 1.5 : 1,
      );
    }

    // Floorboard seams, converging on a vanishing point.
    const camLeft = game.camX - width / 2 / px - 1;
    const camRight = game.camX + width / 2 / px + 1;
    const vanishX = width * 0.52;
    for (let wx = Math.floor(camLeft); wx <= camRight; wx += 0.62) {
      const top = project(wx, 0);
      const bottomX = vanishX + (top.x - vanishX) * 1.22;
      strokeLine(ctx, top.x, top.y, bottomX, height, withAlpha(palette.line, 0.3), 1.2);
    }

    // The three-point territory: a gold wash behind the line, then the line.
    const arcAt = project(T.arcLineX, 0);
    ctx.fillStyle = withAlpha(palette.gold, 0.045);
    ctx.fillRect(0, floorY, Math.max(0, arcAt.x), floorDepth);
    strokeLine(
      ctx,
      arcAt.x,
      arcAt.y,
      arcAt.x - px * 0.4,
      height,
      withAlpha(palette.gold, 0.62),
      2.4,
    );

    // The paint.
    const paintFrom = project(T.rimX - 2.6, 0);
    const paintTo = project(T.backboardX + 0.4, 0);
    ctx.fillStyle = withAlpha(palette.cyan, 0.075);
    ctx.fillRect(paintFrom.x, floorY, paintTo.x - paintFrom.x, floorDepth);
    strokeLine(
      ctx,
      paintFrom.x,
      paintFrom.y,
      paintFrom.x - px * 0.3,
      height,
      withAlpha(palette.cyan, 0.48),
      2,
    );

    // The restricted arc, drawn as the top half of an ellipse on the floor.
    const restrictedAt = project(T.rimX - 1.0, 0);
    ctx.beginPath();
    ctx.ellipse(restrictedAt.x, height, px, px * 0.6, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = withAlpha(palette.cyan, 0.36);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const labelY = floorY + Math.min(floorDepth * 0.24, px * 0.58);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = displayFontOf(palette, typography.sizePx.p8, typography.weight.extrabold);
    withLetterSpacing(ctx, "1.5px", () => {
      ctx.fillStyle = withAlpha(palette.gold, 0.52);
      ctx.fillText("3PT", arcAt.x - px * 0.58, labelY);
      ctx.fillStyle = withAlpha(palette.cyan, 0.46);
      ctx.fillText("PAINT", (paintFrom.x + paintTo.x) / 2, labelY);
    });

    // The centre-court emblem.
    const emblemAt = project((T.courtMinX + T.courtMaxX) / 2, 0);
    const emblemY = floorY + floorDepth * 0.38;
    const emblemRx = px * 1.4;
    const emblemRy = px * 0.41;
    ctx.beginPath();
    ctx.ellipse(emblemAt.x, emblemY, emblemRx, emblemRy, 0, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(palette.cyan, 0.24);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(
      emblemAt.x,
      emblemY,
      Math.max(0, emblemRx - 4),
      Math.max(0, emblemRy - 4),
      0,
      Math.PI * 0.1,
      Math.PI * 0.1 + Math.PI * 0.72,
    );
    ctx.strokeStyle = withAlpha(palette.gold, 0.34);
    ctx.stroke();
    ctx.font = displayFontOf(palette, typography.sizePx.p8, typography.weight.black);
    ctx.fillStyle = withAlpha(palette.cyan, 0.38);
    withLetterSpacing(ctx, "1.8px", () =>
      ctx.fillText("HOOP // DUEL", emblemAt.x, emblemY),
    );

    // The floor's own response to a basket.
    const flash = game.scoreFlashT > 0 ? game.scoreFlashT / T.scoreFlashSeconds : 0;
    if (flash > 0) {
      const responseY = floorY + floorDepth * 0.72;
      ctx.fillStyle = withAlpha(game.scoreFlashColor, 0.08 * flash);
      ctx.fillRect(0, responseY, width, Math.max(2, floorDepth * 0.06));
      strokeLine(
        ctx,
        0,
        responseY,
        width,
        responseY,
        withAlpha(game.scoreFlashColor, 0.42 * flash),
        2,
      );
    }

    // A calm near-edge bevel gives the roof deck physical thickness.
    const bevelH = Math.min(px * 0.24, floorDepth * 0.14);
    const bevelTop = height - bevelH;
    ctx.beginPath();
    ctx.moveTo(0, bevelTop + 4);
    ctx.lineTo(px * 0.24, bevelTop);
    ctx.lineTo(width, bevelTop);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = withAlpha(palette.backgroundMuted, 0.92);
    ctx.fill();
    strokeLine(
      ctx,
      px * 0.24,
      bevelTop,
      width,
      bevelTop,
      withAlpha(palette.line, 0.42),
      1.5,
    );

    strokeLine(ctx, 0, floorY, width, floorY, withAlpha(palette.cyan, 0.28), 2);
  }

  /* ---- Hoop --------------------------------------------------------------- */

  private hoop(
    ctx: CanvasRenderingContext2D,
    game: HoopDuelGame,
    projection: CourtProjection,
    palette: ScenePalette,
  ): void {
    const { px } = projection;
    const project = (x: number, h: number) =>
      worldToScreen(projection, game.camX, game.shake, x, h);

    const rim = project(T.rimX, T.rimHeight);
    const boardBase = project(T.backboardX, T.rimHeight - 0.2);
    const boardTop = project(T.backboardX, T.rimHeight + 0.8);
    const poleBase = project(T.backboardX + 0.35, 0);

    // Reflection ghosts on the polished hardwood, drawn before the assembly so
    // they always sit underneath it.
    if (!game.reducedMotion) {
      const floorLine = poleBase.y;
      const poleTopY = boardTop.y - px * 0.2;
      ctx.strokeStyle = withAlpha(palette.hoopPole, 0.35);
      ctx.lineWidth = px * 0.14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(poleBase.x, floorLine);
      ctx.lineTo(poleBase.x, floorLine + (floorLine - poleTopY) * T.reflectSquash);
      ctx.stroke();
      ctx.fillStyle = withAlpha(palette.cyan, 0.06);
      const ghostTop = floorLine + (floorLine - boardBase.y) * T.reflectSquash;
      const ghostBottom = floorLine + (floorLine - boardTop.y) * T.reflectSquash;
      ctx.fillRect(boardBase.x - px * 0.06, ghostTop, px * 0.12, ghostBottom - ghostTop);
    }

    // Pole and arm.
    ctx.strokeStyle = palette.hoopPole;
    ctx.lineWidth = px * 0.14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(poleBase.x, poleBase.y);
    ctx.lineTo(poleBase.x, boardTop.y - px * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(poleBase.x, boardTop.y - px * 0.1);
    ctx.lineTo(boardBase.x, boardBase.y - px * 0.2);
    ctx.stroke();

    // Backboard glass.
    const boardLeft = boardBase.x - px * 0.06;
    const boardWidth = px * 0.12;
    const boardHeight = boardBase.y - boardTop.y;
    ctx.fillStyle = palette.backboardGlass;
    ctx.fillRect(boardLeft, boardTop.y, boardWidth, boardHeight);
    ctx.strokeStyle = withAlpha(palette.cyan, 0.5);
    ctx.lineWidth = 1.6;
    ctx.strokeRect(boardLeft, boardTop.y, boardWidth, boardHeight);

    // A score flash pulses the board's LED frame in the scorer's livery —
    // event-driven and decaying, never an always-on glow.
    if (game.scoreFlashT > 0) {
      const flash = game.scoreFlashT / T.scoreFlashSeconds;
      ctx.strokeStyle = withAlpha(game.scoreFlashColor, 0.7 * flash);
      ctx.lineWidth = 2.4;
      ctx.strokeRect(
        boardLeft - 2,
        boardTop.y - 2,
        boardWidth + 4,
        boardHeight + 4,
      );
    }

    // Rim, side on, with its hook back to the board.
    const rimFront = { x: rim.x - 0.23 * px, y: rim.y };
    const rimBack = { x: rim.x + 0.23 * px, y: rim.y };
    ctx.strokeStyle = palette.amber;
    ctx.lineWidth = px * 0.07;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rimFront.x, rimFront.y);
    ctx.lineTo(rimBack.x, rimBack.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rimBack.x, rimBack.y);
    ctx.lineTo(boardBase.x, rim.y - px * 0.05);
    ctx.stroke();

    // The net, swaying off whatever just went through it.
    const sway = Math.sin(this.time * 13) * game.netSway * px * 0.12;
    ctx.strokeStyle = palette.net;
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= 4; i += 1) {
      const k = i / 4;
      const top = {
        x: rimFront.x + (rimBack.x - rimFront.x) * k,
        y: rimFront.y + (rimBack.y - rimFront.y) * k,
      };
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(rim.x + (k - 0.5) * 0.18 * px + sway, rim.y + 0.42 * px);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(rim.x - 0.11 * px + sway, rim.y + 0.28 * px);
    ctx.lineTo(rim.x + 0.11 * px + sway, rim.y + 0.28 * px);
    ctx.stroke();

    // The diegetic shot clock above the board. The HUD carries one too; this is
    // the one you actually watch, because it is where the shot is.
    const clock = Math.ceil(Math.min(99, Math.max(0, game.engine.shotClock)));
    const boxCenterX = boardBase.x;
    const boxCenterY = boardTop.y - px * 0.42;
    const boxW = px * 0.62;
    const boxH = px * 0.5;
    ctx.fillStyle = palette.shotClockBox;
    ctx.fillRect(boxCenterX - boxW / 2, boxCenterY - boxH / 2, boxW, boxH);
    ctx.strokeStyle = withAlpha(clock <= 3 ? palette.danger : palette.gold, 0.6);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(boxCenterX - boxW / 2, boxCenterY - boxH / 2, boxW, boxH);
    ctx.font = displayFontOf(palette, typography.sizePx.p13, typography.weight.extrabold);
    ctx.fillStyle = clock <= 3 ? palette.danger : palette.gold;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(clock), boxCenterX, boxCenterY);
  }
}

/* ---- Small canvas helpers -------------------------------------------------- */

function fillCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "butt";
  ctx.stroke();
}

/**
 * `ctx.letterSpacing` is the only way to track canvas text, and Firefox only
 * shipped it recently. Where it is missing the text simply sits untracked,
 * which is a slightly tighter label and nothing worse — so it is set, used and
 * put back rather than guarded behind a capability check.
 */
function withLetterSpacing(
  ctx: CanvasRenderingContext2D,
  spacing: string,
  draw: () => void,
): void {
  const previous = ctx.letterSpacing;
  ctx.letterSpacing = spacing;
  draw();
  ctx.letterSpacing = previous;
}

export type { ScreenPoint };
