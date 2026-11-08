"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { accentVar, BrandIcon, glow, withAlpha } from "@statoz/design-system/games";
import type { AuthHeroMedia } from "../types";

export type AuthHeroProps = {
  media: AuthHeroMedia | null;
  className?: string;
};

const MOBILE = "(max-width: 1023px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const CYAN = accentVar("cyan");

function subscribePreferences(onChange: () => void) {
  const queries = [window.matchMedia(MOBILE), window.matchMedia(REDUCED_MOTION)];
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

function readPreferences() {
  return `${window.matchMedia(MOBILE).matches}:${window.matchMedia(REDUCED_MOTION).matches}`;
}

/** Mount only the active composition, after reading the browser's preferences. */
export function AuthHero({ media, className }: AuthHeroProps) {
  const preferences = useSyncExternalStore(subscribePreferences, readPreferences, () => "pending");
  const [mobile, reducedMotion] = preferences.split(":").map((value) => value === "true");
  const source = mobile && media?.mobile ? media.mobile : media;

  return (
    <div
      className={["relative isolate overflow-hidden", className ?? ""].join(" ")}
      style={{ background: "var(--ds-gradient-app-background)" }}
    >
      {media?.kind === "video" ? (
        <>
          {/* The responsive poster remains beneath the video during loading or errors. */}
          {(media.poster || media.mobile?.poster) && (
            <picture>
              {media.mobile?.poster && <source media={MOBILE} srcSet={media.mobile.poster} />}
              <img
                src={media.poster ?? media.mobile?.poster}
                alt={media.alt ?? ""}
                className="absolute inset-0 size-full object-cover object-center"
                fetchPriority="high"
              />
            </picture>
          )}
          {preferences !== "pending" && source && (
            <HeroVideo
              key={`${source.src}:${reducedMotion}`}
              source={source}
              reducedMotion={reducedMotion}
            />
          )}
        </>
      ) : media ? (
        <Image
          src={media.src}
          alt={media.alt ?? ""}
          fill
          priority
          unoptimized={media.src.endsWith(".gif")}
          sizes="(min-width: 1024px) 53vw, 100vw"
          className="object-cover object-top"
        />
      ) : null}

      {media?.kind !== "video" && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 60% at 50% 0%, ${withAlpha(CYAN, 0.16)} 0%, transparent 62%)` }} />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5" style={{ background: "linear-gradient(to top, var(--ds-color-background-secondary) 0%, transparent 100%)" }} />
          <div className="relative flex h-full items-start justify-center pt-8">
            <span className="grid size-14 place-items-center rounded-pill" style={{ background: `color-mix(in srgb, ${accentVar("blue")} 28%, var(--ds-color-background-muted))`, boxShadow: `inset 0 0 0 1px ${withAlpha(CYAN, 0.4)}, ${glow(CYAN, { alpha: 0.35, blur: 28 })}` }}>
              <BrandIcon name="logo" size={30} priority />
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function HeroVideo({ source, reducedMotion }: {
  source: { src: string; mp4Src?: string; poster?: string };
  reducedMotion: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(!reducedMotion);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    void videoRef.current?.play().catch(() => setPlaying(false));
  }, [enabled]);

  function togglePlayback() {
    if (!enabled) {
      setEnabled(true);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }

  return (
    <>
      {enabled && !failed && (
        <video
          ref={videoRef}
          className={`absolute inset-0 size-full object-cover object-center ${ready ? "opacity-100" : "opacity-0"}`}
          poster={source.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          onPlaying={() => { setReady(true); setPlaying(true); }}
          onPause={() => setPlaying(false)}
          onError={(event) => {
            // React bubbles source errors; let the browser try the next format.
            if (event.target !== event.currentTarget) return;
            setFailed(true);
            setPlaying(false);
          }}
        >
          <source src={source.src} type={source.src.endsWith(".mp4") ? "video/mp4" : "video/webm"} onError={source.mp4Src ? undefined : () => { setFailed(true); setPlaying(false); }} />
          {source.mp4Src && <source src={source.mp4Src} type="video/mp4" onError={() => { setFailed(true); setPlaying(false); }} />}
        </video>
      )}
      {!failed && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? "Pause onboarding animation" : "Play onboarding animation"}
          className="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-pill border border-line-strong bg-surface-muted px-3 text-xs text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan lg:bottom-3 lg:top-auto"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="currentColor">
            {playing ? <path d="M5 4h3v12H5zm7 0h3v12h-3z" /> : <path d="m6 3 11 7-11 7z" />}
          </svg>
          <span className="hidden lg:inline">{playing ? "Pause" : "Play"}</span>
        </button>
      )}
    </>
  );
}
