"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { Glyph } from "@statoz/design-system/games";
import { AdSlot } from "@/features/ads";

import styles from "./game-landing-ad.module.css";

type GameLandingAdState = {
  dismissed: boolean;
  dismiss: () => void;
};

const GameLandingAdContext = createContext<GameLandingAdState | null>(null);

export function GameLandingAdProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <GameLandingAdContext.Provider
      value={{ dismissed, dismiss: () => setDismissed(true) }}
    >
      {children}
    </GameLandingAdContext.Provider>
  );
}

/** Bottom anchor shown only by a game's initial lobby or home state. */
export function GameLandingAd() {
  const state = useContext(GameLandingAdContext);
  if (state === null || state.dismissed) return null;

  return (
    <>
      <span className={styles.spacer} aria-hidden />
      <div className={styles.dock} data-game-landing-ad>
        <div className={styles.panel}>
          <button
            type="button"
            className={styles.dismiss}
            onClick={state.dismiss}
            aria-label="Dismiss advertisement"
          >
            <Glyph name="close" size={18} />
          </button>
          <AdSlot placement="game-landing-anchor" />
        </div>
      </div>
    </>
  );
}
