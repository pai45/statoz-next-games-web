"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { accentVar, CloseIcon, withAlpha } from "@statoz/design-system/games";

import { useIsHydrated } from "../state/profile-identity";

import styles from "./profile.module.css";

/**
 * The shell every profile overlay wears: the settings sheet, the time-zone
 * picker, the clubs editor, the avatar and banner editors, and the log-out
 * confirmation.
 *
 * Flutter reaches for four different presentations — `showModalBottomSheet`,
 * `showDialog`, a `fullscreenDialog` route, a `FractionallySizedBox` — because
 * a phone is the only thing it targets. On the web one overlay covers all four:
 * it docks to the bottom edge on a phone, exactly as the app's sheets do, and
 * centres itself once there is room, which is what a dialog is.
 *
 * Escape closes, the scrim closes, focus is taken on open and the page behind
 * is inert, none of which Flutter had to write.
 *
 * Rendered into `document.body` rather than where it is written. `position:
 * fixed` resolves against the nearest ancestor carrying a transform, a filter
 * or an in-effect animation — and the dossier is full of all three, between the
 * panels' drop shadows and the cards' entrances — so an overlay left in place
 * anchors to whichever card opened it and gets stacked under the next one. A
 * portal is the only version of this that cannot be broken from a distance.
 */

const cyan = accentVar("cyan");

export type ProfileOverlayProps = {
  title: string;
  /** Titles the panel's edge and header glyph. Defaults to cyan. */
  accent?: string;
  icon?: ReactNode;
  /** Pinned under the body, out of the scroll — a SAVE or a DONE. */
  footer?: ReactNode;
  /**
   * `sheet` fills most of the viewport height for a list to scroll inside;
   * `dialog` hugs its content, for a confirmation.
   */
  size?: "sheet" | "dialog" | "full";
  onClose: () => void;
  children: ReactNode;
};

export function ProfileOverlay({
  title,
  accent = cyan,
  icon,
  footer,
  size = "sheet",
  onClose,
  children,
}: ProfileOverlayProps) {
  const headingId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const hydrated = useIsHydrated();

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && !element.contains(panel.current));
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const onKeyDown = (event: KeyboardEvent) => {
      // Only the topmost sheet handles focus or Escape (Settings can open timezone).
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "Tab") {
        const targets = panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]');
        if (!targets?.length) { event.preventDefault(); return; }
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); background.forEach((element, index) => { element.inert = previousInert[index]; }); returnFocus?.focus(); };
  }, [onClose]);

  /**
   * Hold the page still underneath. Restoring what was there rather than
   * clearing it keeps a nested overlay — a badge opened from the catalogue —
   * from unlocking the page when only the inner one closes.
   */
  useEffect(() => {
    panel.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const height =
    size === "dialog"
      ? "max-h-[86dvh]"
      : size === "full"
        ? "h-[92dvh] sm:h-[88dvh]"
        : "max-h-[86dvh] sm:max-h-[80dvh]";

  const width =
    size === "dialog" ? "sm:max-w-95" : size === "full" ? "sm:max-w-160" : "sm:max-w-125";

  // An overlay only ever opens on a click, so this is true by the time one is
  // asked for; the guard is for the render that has no `document` to reach.
  if (!hydrated) return null;

  const overlay = (
    <div
      className={`${styles.scrim} fixed inset-0 z-50 flex items-end justify-center sm:items-center`}
      style={{ background: "var(--ds-color-overlay-scrim)" }}
    >
      {/* The scrim dismisses. It is a sibling rather than a wrapper so the
          panel's own clicks never have to be stopped from bubbling. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className={`${styles.sheet} relative flex w-full flex-col outline-none ${height} ${width}`}
        style={{ filter: "drop-shadow(0 6px 0 var(--ds-color-fixture-shadow))" }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            clipPath: "var(--ds-clip-panel)",
            background: withAlpha(accent, 0.55),
          }}
        />
        <div
          aria-hidden
          className="absolute inset-px"
          style={{
            clipPath: "var(--ds-clip-panel)",
            background: "var(--ds-color-background-primary)",
          }}
        />

        <div
          className="relative flex min-h-0 flex-1 flex-col"
          style={{ clipPath: "var(--ds-clip-panel)" }}
        >
          <div className="flex shrink-0 items-center gap-2.5 px-4.5 pb-3.5 pt-4">
            {icon ? (
              <span aria-hidden style={{ color: accent }}>
                {icon}
              </span>
            ) : null}
            <h2
              id={headingId}
              className="flex-1 font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p14,
                letterSpacing: "var(--ds-tracking-ultra)",
                color: accent,
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 grid size-11 cursor-pointer place-items-center text-muted transition-colors hover:text-foreground"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <hr className="h-px shrink-0 border-0 bg-line-muted" />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-line-muted px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
