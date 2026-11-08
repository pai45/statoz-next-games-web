"use client";

import { useEffect, useRef } from "react";

/** Native modality plus a safe focus destination when a bought item moves in the grid. */
export function useShopDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    dialog?.addEventListener("keydown", keepFocus);
    return () => {
      dialog?.removeEventListener("keydown", keepFocus);
      dialog?.close();
      requestAnimationFrame(() => {
        if (document.querySelector("dialog[open]")) return;
        const target = previous?.isConnected && previous !== document.body && !previous.closest("dialog") && !previous.matches(":disabled")
          ? previous : document.querySelector<HTMLElement>('[data-shop-screen] [role="tab"][aria-selected="true"]');
        target?.focus({preventScroll: true});
      });
    };
  }, []);
  return ref;
}
