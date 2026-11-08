"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import { HubBackdrop, type HubBackgroundTheme } from "@statoz/design-system/games/components/layout/hub-backdrop";
import { publicAsset } from "@/shared/config/base-path";
import styles from "./home-hub-surface.module.css";

const HubThemeContext = createContext<Dispatch<SetStateAction<HubBackgroundTheme | null>> | null>(null);

/** The home feature publishes the exact active selection, including unlock fallbacks. */
export function useHomeHubTheme() {
  const publish = useContext(HubThemeContext);
  if (!publish) throw new Error("HomeHub must be inside HomeHubSurface");
  return publish;
}

/** Only the root hub paints artwork; match details and other destinations keep their own backdrop. */
export function HomeHubSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<HubBackgroundTheme | null>(null);
  return (
    <HubThemeContext.Provider value={setTheme}>
      <div className={styles.surface}>
        {pathname === "/" && theme && (
          <div className={styles.background}>
            <HubBackdrop theme={theme} assetRoot={publicAsset("/assets/backgrounds/hub")} />
          </div>
        )}
        {children}
      </div>
    </HubThemeContext.Provider>
  );
}
