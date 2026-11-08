"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";

import { usePrefersReducedMotion } from "@/shared/hooks";
import { publicAsset } from "@/shared/config";
import { formatInt } from "@/shared/utils";

import styles from "./onboarding-coin-reward.module.css";

const animationDurationMs = 3300;
const naturalContinueDelayMs = 700;
const skippedContinueDelayMs = 1400;
const reducedMotionContinueDelayMs = 1600;

type Curve = (value: number) => number;

const easeOut = cubicBezier(0, 0, 0.58, 1);
const easeOutBack = cubicBezier(0.175, 0.885, 0.32, 1.275);
const easeOutCubic = cubicBezier(0.215, 0.61, 0.355, 1);

export type OnboardingCoinRewardProps = {
  amount: number;
  balanceAfter: number;
  onComplete: () => void;
};

/**
 * The first-run wallet payoff, ported from Flutter's
 * `OnboardingCoinRewardAnimation`. The same 3.3 second timeline drives the DOM
 * and canvas, so the pack slam, burst, count-up, and settlement cannot drift
 * apart when a frame is missed.
 */
export function OnboardingCoinReward({
  amount,
  balanceAfter,
  onComplete,
}: OnboardingCoinRewardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef(0);
  const frameRef = useRef(0);
  const continueTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const rewardAmount = Math.abs(Math.round(amount));
  const walletBalance = Math.max(0, Math.round(balanceAfter));

  const clearRun = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    if (continueTimerRef.current !== null) {
      window.clearTimeout(continueTimerRef.current);
      continueTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearRun();
    onComplete();
  }, [clearRun, onComplete]);

  const scheduleFinish = useCallback(
    (delayMs: number) => {
      if (continueTimerRef.current !== null) {
        window.clearTimeout(continueTimerRef.current);
      }
      continueTimerRef.current = window.setTimeout(finish, delayMs);
    },
    [finish],
  );

  const applyTimeline = useCallback(
    (timeline: number) => {
      const scene = sceneRef.current;
      const canvas = canvasRef.current;
      if (!scene || !canvas) return;

      timelineRef.current = timeline;

      const intro = easeOut(interval(timeline, 0, 0.18));
      const rise = easeOutBack(interval(timeline, 0.04, 0.3));
      const shakeProgress = interval(timeline, 0.23, 0.38);
      const shake =
        Math.sin(shakeProgress * Math.PI * 9) * 8 * (1 - shakeProgress);
      const slam = easeOutBack(interval(timeline, 0.36, 0.58));
      const countProgress = easeOutCubic(interval(timeline, 0.44, 0.75));
      const settlement = easeOutBack(interval(timeline, 0.67, 0.84));
      const flashPhase = interval(timeline, 0.34, 0.43);
      const flashOpacity = clamp(Math.sin(flashPhase * Math.PI));
      const artScale =
        timeline < 0.36 ? 0.66 + 0.34 * rise : 0.72 + 0.28 * slam;

      scene.style.setProperty("--reward-intro-opacity", String(clamp(intro)));
      scene.style.setProperty("--reward-intro-y", `${12 * (1 - intro)}px`);
      scene.style.setProperty("--reward-art-x", `${shake}px`);
      scene.style.setProperty("--reward-art-y", `${110 * (1 - rise)}px`);
      scene.style.setProperty("--reward-art-scale", String(artScale));
      scene.style.setProperty("--reward-art-opacity", String(clamp(rise)));
      scene.style.setProperty(
        "--reward-line-opacity",
        String(interval(timeline, 0.42, 0.57)),
      );
      scene.style.setProperty(
        "--reward-line-y",
        `${16 * (1 - settlement)}px`,
      );
      scene.style.setProperty(
        "--reward-settlement-opacity",
        String(clamp(settlement)),
      );
      scene.style.setProperty(
        "--reward-settlement-scale",
        String(0.9 + 0.1 * settlement),
      );
      scene.style.setProperty(
        "--reward-tap-opacity",
        String(interval(timeline, 0.76, 0.9)),
      );
      scene.style.setProperty(
        "--reward-flash-opacity",
        String(flashOpacity * 0.68),
      );

      if (amountRef.current) {
        amountRef.current.textContent = `+${formatInt(
          Math.round(rewardAmount * countProgress),
        )}`;
      }

      paintRewardCanvas(canvas, timeline);
    },
    [rewardAmount],
  );

  useEffect(() => {
    finishedRef.current = false;
    clearRun();

    if (reducedMotion) {
      applyTimeline(1);
      scheduleFinish(reducedMotionContinueDelayMs);
      return clearRun;
    }

    applyTimeline(0);
    const startedAt = performance.now();

    const tick = (now: number) => {
      const timeline = Math.min(1, (now - startedAt) / animationDurationMs);
      applyTimeline(timeline);
      if (timeline < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        scheduleFinish(naturalContinueDelayMs);
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return clearRun;
  }, [applyTimeline, clearRun, reducedMotion, scheduleFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() =>
      paintRewardCanvas(canvas, timelineRef.current),
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function handleTap() {
    if (finishedRef.current) return;
    if (timelineRef.current < 0.78) {
      window.cancelAnimationFrame(frameRef.current);
      applyTimeline(0.82);
      scheduleFinish(skippedContinueDelayMs);
      return;
    }
    finish();
  }

  const initialTimeline = {
    "--reward-intro-opacity": 0,
    "--reward-intro-y": "12px",
    "--reward-art-x": "0px",
    "--reward-art-y": "110px",
    "--reward-art-scale": 0.66,
    "--reward-art-opacity": 0,
    "--reward-line-opacity": 0,
    "--reward-line-y": "16px",
    "--reward-settlement-opacity": 0,
    "--reward-settlement-scale": 0.9,
    "--reward-tap-opacity": 0,
    "--reward-flash-opacity": 0,
  } as CSSProperties;

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      style={initialTimeline}
    >
      <span className="sr-only" role="status" aria-live="polite">
        {formatInt(rewardAmount)} coins credited. Balance{" "}
        {formatInt(walletBalance)} coins.
      </span>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      <div className={styles.content}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>WELCOME BONUS</p>
          <p className={styles.systemLabel}>SYS://WALLET LINKED</p>
        </header>

        <div className={styles.spacer} />

        <div className={styles.artMotion}>
          <div className={styles.artFrame}>
            <Image
              src={publicAsset("/assets/shop/coins/rookie.png")}
              alt=""
              fill
              priority
              sizes="(max-height: 679px) 184px, 232px"
              className={styles.artImage}
            />
            <svg
              aria-hidden
              className={styles.artBorder}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path d="M0 0H100V88L88 100H12L0 88Z" />
            </svg>
          </div>
        </div>

        <div className={styles.rewardBlock}>
          <div className={styles.rewardLine}>
            <CoinGlyph className={styles.rewardCoin} />
            <span ref={amountRef} className={styles.rewardAmount}>
              +0
            </span>
          </div>
          <p className={styles.credited}>COINS CREDITED TO WALLET</p>
        </div>

        <div className={styles.balanceOuter}>
          <div className={styles.balancePlate}>
            <span className={styles.balanceLabel}>WALLET BALANCE</span>
            <CoinGlyph className={styles.balanceCoin} />
            <span className={styles.balanceValue}>{formatInt(walletBalance)}</span>
          </div>
        </div>

        <div className={styles.spacer} />

        <p className={styles.continueLabel}>TAP TO CONTINUE</p>
      </div>

      <div className={styles.flash} aria-hidden />

      <button
        type="button"
        onClick={handleTap}
        className={styles.tapTarget}
      >
        <span className="sr-only">Continue to StatOz</span>
      </button>
    </div>
  );
}

function CoinGlyph({ className }: { className: string }) {
  return (
    <span
      className={`${styles.coinGlyph} ${className}`}
      style={{
        backgroundImage: `url("${publicAsset("/assets/icons/oz_coins.svg")}")`,
      }}
      aria-hidden
    />
  );
}

function paintRewardCanvas(canvas: HTMLCanvasElement, timeline: number) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const computed = getComputedStyle(canvas);
  const gold = computed.getPropertyValue("--ds-color-accent-gold").trim();
  const cyan = computed.getPropertyValue("--ds-color-accent-cyan").trim();
  const centerX = width / 2;
  const centerY = height * 0.43;
  const radius = Math.min(width, height) * 0.74;

  const glow = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    radius,
  );
  glow.addColorStop(0, withCanvasAlpha(gold, 0.09 + timeline * 0.05));
  glow.addColorStop(1, withCanvasAlpha(gold, 0));
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.strokeStyle = withCanvasAlpha(gold, 0.08);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index * Math.PI) / 6;
    const inner = radius * 0.48;
    const outer = radius * (0.82 + (index % 2 === 0 ? 0.12 : 0));
    context.beginPath();
    context.moveTo(
      centerX + Math.cos(angle) * inner,
      centerY + Math.sin(angle) * inner,
    );
    context.lineTo(
      centerX + Math.cos(angle) * outer,
      centerY + Math.sin(angle) * outer,
    );
    context.stroke();
  }
  context.beginPath();
  context.arc(centerX, centerY, radius * 0.56, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = withCanvasAlpha(cyan, 0.05);
  context.beginPath();
  context.arc(centerX, centerY, radius * 0.78, 0, Math.PI * 2);
  context.stroke();

  const revealProgress = interval(timeline, 0.35, 0.72);
  if (revealProgress <= 0 || revealProgress >= 1) return;

  const eased = easeOut(revealProgress);
  const fade = 1 - revealProgress;
  const maxRadius = Math.min(width, height) * 0.58;

  for (const delay of [0, 0.18]) {
    const wave = clamp((revealProgress - delay) / (1 - delay));
    if (wave <= 0 || wave >= 1) continue;
    context.strokeStyle = withCanvasAlpha(gold, (1 - wave) * 0.58);
    context.lineWidth = 2.4 * (1 - wave) + 0.6;
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      maxRadius * easeOut(wave),
      0,
      Math.PI * 2,
    );
    context.stroke();
  }

  context.strokeStyle = withCanvasAlpha(gold, fade * 0.9);
  context.lineWidth = 1.2;
  for (let index = 0; index < 24; index += 1) {
    const angle =
      index * ((Math.PI * 2) / 24) + (index % 2 === 1 ? 0.07 : 0);
    const reach = maxRadius * (index % 2 === 0 ? 0.92 : 0.72);
    const pointX = centerX + Math.cos(angle) * eased * reach;
    const pointY = centerY + Math.sin(angle) * eased * reach;
    const coinRadius = 2.5 + (index % 3) * 0.7;

    context.beginPath();
    context.arc(pointX, pointY, coinRadius, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(pointX - coinRadius * 0.45, pointY);
    context.lineTo(pointX + coinRadius * 0.45, pointY);
    context.stroke();
  }
}

function interval(value: number, begin: number, end: number) {
  return clamp((value - begin) / (end - begin));
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Evaluate a CSS cubic-bezier at a timeline value, including back overshoot. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): Curve {
  const sample = (a: number, b: number, t: number) => {
    const inverse = 1 - t;
    return 3 * inverse * inverse * t * a + 3 * inverse * t * t * b + t * t * t;
  };
  const derivative = (a: number, b: number, t: number) =>
    3 * (1 - t) * (1 - t) * a +
    6 * (1 - t) * t * (b - a) +
    3 * t * t * (1 - b);

  return (value: number) => {
    const x = clamp(value);
    let t = x;
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const slope = derivative(x1, x2, t);
      if (Math.abs(slope) < 0.000001) break;
      t -= (sample(x1, x2, t) - x) / slope;
      t = clamp(t);
    }
    return sample(y1, y2, t);
  };
}

function withCanvasAlpha(color: string, alpha: number) {
  const hex = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (hex) {
    return `rgba(${Number.parseInt(hex[1], 16)}, ${Number.parseInt(hex[2], 16)}, ${Number.parseInt(hex[3], 16)}, ${clamp(alpha)})`;
  }
  const rgb = color.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\)$/i);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${clamp(alpha)})`;
  }
  return color;
}
