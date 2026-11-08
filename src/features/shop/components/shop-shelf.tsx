"use client";

import { useId, type ReactNode } from "react";

import { AdaptiveDrawer, ChevronRightIcon } from "@statoz/design-system/games";

import styles from "./shop-screen.module.css";

/**
 * One storefront section: a kicker and title, a short status on the right, an
 * optional SEE ALL that opens the full catalogue for the section, and the row
 * itself underneath.
 */
export function ShopShelf({
  id,
  kicker,
  title,
  meta,
  controls,
  onSeeAll,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  /** A short status read-out: OWNED 4/20, FREE STARTER READY. */
  meta?: ReactNode;
  /** Filter chips that sit between the heading and the row. */
  controls?: ReactNode;
  onSeeAll?: () => void;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={styles.shelf}>
      <header className={styles.shelfHead}>
        <div className="min-w-0">
          <p className={styles.kicker}>{`// ${kicker}`}</p>
          <h2 id={headingId} className={styles.shelfTitle}>{title}</h2>
        </div>
        <div className={styles.shelfAside}>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
          {onSeeAll ? (
            <button type="button" onClick={onSeeAll} className={styles.seeAll} aria-label={`See all ${title.toLowerCase()}`}>
              SEE ALL <ChevronRightIcon size={16} />
            </button>
          ) : null}
        </div>
      </header>
      {controls}
      {children}
    </section>
  );
}

/** The full catalogue behind a shelf's SEE ALL. */
export function ShopShelfDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AdaptiveDrawer open={open} title={title} onClose={onClose}>
      <div className="p-4">{children}</div>
    </AdaptiveDrawer>
  );
}

/** Owned out of total, for a shelf's status read-out. */
export function ownedCount(ids: readonly string[], owned: readonly string[]) {
  const set = new Set(owned);
  return `OWNED ${ids.filter((id) => set.has(id)).length}/${ids.length}`;
}
