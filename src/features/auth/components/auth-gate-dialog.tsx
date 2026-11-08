"use client";

import { useEffect, useId, useRef } from "react";

import { Button, LockIcon, accentVar } from "@statoz/design-system/games";

import type { AuthGateRequest } from "../types";

export type AuthGateDialogProps = {
  request: AuthGateRequest;
  onCancel: () => void;
  onContinue: () => void;
};

const focusable =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AuthGateDialog({
  request,
  onCancel,
  onContinue,
}: AuthGateDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>(focusable)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const controls = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusable),
      );
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[var(--ds-color-overlay-scrim)] p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-sm border border-cyan bg-surface-elevated p-5 shadow-[var(--ds-shadow-panel)] [clip-path:var(--ds-clip-panel)]"
      >
        <span
          aria-hidden
          className="grid size-11 place-items-center border border-cyan bg-cyan/10 text-cyan"
        >
          <LockIcon size={22} />
        </span>
        <p className="mt-5 font-display text-2xs font-black tracking-ultra text-cyan">
          {"// ACCOUNT REQUIRED"}
        </p>
        <h2
          id={titleId}
          className="mt-2 font-display text-xl font-black tracking-wide"
        >
          LOG IN TO {request.intent.toUpperCase()}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">
          {request.message ??
            "Log in to unlock this feature and keep your StatOz progress."}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="surface" size="lg" onClick={onCancel}>
            NOT NOW
          </Button>
          <Button
            variant="tonal"
            size="lg"
            onClick={onContinue}
            accent={accentVar("cyan")}
          >
            LOG IN
          </Button>
        </div>
      </div>
    </div>
  );
}
