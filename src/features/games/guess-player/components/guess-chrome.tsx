"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";

import {
  accentVar,
  ArrowLeftIcon,
  Glyph,
  withAlpha,
  type GlyphName,
} from "@statoz/design-system/games";

import styles from "./guess-player.module.css";

/**
 * The pieces every Guess The Player screen wears — the app's `GameScaffold`
 * header, its `CyberPanel` and `CyberChip`, and the confirmation dialog it puts
 * in front of anything that spends coins or ends a run.
 */

/** Staggers a `CyberSlideUpFadeIn`. */
export function enterAfter(delayMs: number, offset = 18): CSSProperties {
  return {
    "--enter-delay": `${delayMs}ms`,
    "--enter-offset": `${offset}px`,
  } as CSSProperties;
}

/** The all-caps micro type the app calls `Cyber.label`. */
export function Label({
  children,
  color = "var(--ds-color-text-muted)",
  tracking = "var(--ds-tracking-label)",
  className,
}: {
  children: ReactNode;
  color?: string;
  tracking?: string;
  className?: string;
}) {
  return (
    <p
      className={["font-bold leading-compact", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{ color, fontSize: "var(--ds-text-2xs)", letterSpacing: tracking }}
    >
      {children}
    </p>
  );
}

/** `CyberPanel`: a flat plate with a one-pixel accent edge. */
export function Panel({
  children,
  accent = "var(--ds-color-border-default)",
  className,
  style,
}: {
  children: ReactNode;
  accent?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={["p-3.5", className ?? ""].filter(Boolean).join(" ")}
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.88),
        border: `1px solid ${accent}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** `CyberChip`: a tinted capsule of label type. */
export function Chip({
  children,
  accent,
}: {
  children: ReactNode;
  accent: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center px-2 py-1 font-bold leading-compact"
      style={{
        color: accent,
        background: withAlpha(accent, 0.12),
        border: `1px solid ${withAlpha(accent, 0.45)}`,
        fontSize: "var(--ds-text-2xs)",
        letterSpacing: "var(--ds-tracking-label)",
      }}
    >
      {children}
    </span>
  );
}

/**
 * The app's `GameScaffold` bar: a way back, a two-line title, and the mode's
 * mark or a status chip on the right.
 */
export function GuessHeader({
  eyebrow,
  title,
  onBack,
  backHref,
  backLabel,
  right,
}: {
  eyebrow: string;
  title: string;
  /** Ignored when `backHref` is given. */
  onBack?: () => void;
  /** Leaving the game entirely is a link, so it behaves like one. */
  backHref?: string;
  backLabel: string;
  right?: ReactNode;
}) {
  const backClass = `${styles.link} grid size-11 shrink-0 cursor-pointer place-items-center`;

  return (
    <header
      className="flex h-16.5 shrink-0 items-center gap-1.5 px-3.5"
      style={{ borderBottom: "1px solid var(--ds-color-border-muted)" }}
    >
      {backHref === undefined ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className={backClass}
          style={{ color: accentVar("cyan") }}
        >
          <ArrowLeftIcon size={22} />
        </button>
      ) : (
        <Link
          href={backHref}
          aria-label={backLabel}
          className={backClass}
          style={{ color: accentVar("cyan") }}
        >
          <ArrowLeftIcon size={22} />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <Label color="var(--ds-color-text-default)">{eyebrow}</Label>
        <h1
          className="mt-1.5 truncate font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-lg)",
            letterSpacing: "var(--ds-tracking-display)",
          }}
        >
          {title}
        </h1>
      </div>

      {right}
    </header>
  );
}

/** The mode's mark, for the right of the header. */
export function HeaderMark({ name = "person_search" }: { name?: GlyphName }) {
  return (
    <span className="shrink-0" style={{ color: accentVar("pink") }}>
      <Glyph name={name} size={22} />
    </span>
  );
}

/**
 * The app's `showCyberConfirmDialog`, as a native modal.
 *
 * Nothing that costs coins or ends a run happens on one tap, which is the whole
 * point of it. Only this mode needs it on the web so far, so it lives here
 * rather than in the design system; a second caller is what would promote it.
 */
export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Paints the confirm plate red, for an irreversible choice. */
  destructive?: boolean;
  /** Absent when the dialog only has something to report. */
  onConfirm?: () => void;
};

export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = request !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    const cancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const close = () => {
      if (open) onClose();
    };
    dialog.addEventListener("cancel", cancel);
    dialog.addEventListener("close", close);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("close", close);
    };
  }, [onClose, open]);

  const accent = request?.destructive === true
    ? "var(--ds-color-danger)"
    : accentVar("cyan");

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(92vw,26rem)] max-w-none border-0 bg-transparent p-0 text-(--ds-color-text-default) backdrop:bg-(--ds-color-overlay-scrim)"
    >
      {request === null ? null : (
        <div
          className={styles.confirm}
          style={{
            background: "var(--ds-color-background-elevated)",
            border: `1px solid ${withAlpha(accent, 0.55)}`,
          }}
        >
          <div className="p-4.5">
            <h2
              id={titleId}
              className="font-display font-black leading-compact"
              style={{
                color: accent,
                fontSize: "var(--ds-text-md)",
                letterSpacing: "var(--ds-tracking-ultra)",
              }}
            >
              {request.title}
            </h2>
            <p
              className="mt-2.5 leading-body text-muted"
              style={{ fontSize: "var(--ds-text-xs)" }}
            >
              {request.message}
            </p>
          </div>
          <div
            className="flex gap-2 p-3"
            style={{ borderTop: "1px solid var(--ds-color-border-subtle)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className={`${styles.plate} h-11 flex-1 cursor-pointer font-display font-black leading-compact text-muted`}
              style={{
                border: "1px solid var(--ds-color-border-muted)",
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-ultra)",
              }}
            >
              {request.cancelLabel}
            </button>
            {request.onConfirm === undefined ? null : (
              <button
                type="button"
                onClick={() => {
                  request.onConfirm?.();
                  onClose();
                }}
                className={`${styles.plate} h-11 flex-1 cursor-pointer font-display font-black leading-compact`}
                style={{
                  color: "var(--ds-color-text-inverse)",
                  background: accent,
                  border: `1px solid ${accent}`,
                  fontSize: "var(--ds-text-2xs)",
                  letterSpacing: "var(--ds-tracking-ultra)",
                }}
              >
                {request.confirmLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
