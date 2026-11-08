"use client";

import { Lottie } from "lottie-react";
import { useEffect, useState } from "react";

export function StreakFlame({ size = 108, loop = 2 }: { size?: number; loop?: boolean | number }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  return (
    <span style={{ width: size, height: size }} aria-hidden>
      <Lottie
        src="/assets/animations/streak_animation.json"
        autoplay
        loop={reduced ? false : loop}
        segment={reduced ? [131, 132] : undefined}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
