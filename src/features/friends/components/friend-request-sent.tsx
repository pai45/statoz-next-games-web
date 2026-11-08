"use client";

import { useEffect } from "react";

import { CheckIcon, PersonPinCircleIcon, SendIcon } from "@statoz/design-system/games";

import styles from "./friend-request-sent.module.css";

export function FriendRequestSent({ name, onComplete }: { name: string; onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 1900);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={styles.scrim} role="status" aria-live="polite" aria-label={`Friend request sent to ${name}`}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>{"// OUTBOUND SOCIAL LINK"}</p>
        <div className={styles.track} aria-hidden="true">
          <span className={styles.node}><PersonPinCircleIcon size={25} /></span>
          <span className={styles.line} />
          <span className={styles.send}><SendIcon size={21} /></span>
          <span className={`${styles.node} ${styles.confirm}`}><CheckIcon size={25} /></span>
        </div>
        <div className={styles.copy}>
          <strong>REQUEST SENT</strong>
          <span>{name.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
