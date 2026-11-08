import type { CSSProperties, ReactNode } from "react";

import styles from "./player-hub.module.css";

/** Profile-owned HUD chrome. The inset shell follows the complete cut-corner outline. */
export function HubSurface({ children, accent = "cyan" }: { children: ReactNode; accent?: "cyan" | "violet" | "gold" | "pink" }) {
  return <div className={styles.cyberPanel} style={{ "--hub-accent": `var(--ds-color-accent-${accent})` } as CSSProperties}>
    <div className={styles.cyberPanelInner}>
      <div className={styles.panelCircuit} aria-hidden="true" />
      <div className={styles.panelContent}>{children}</div>
    </div>
  </div>;
}
