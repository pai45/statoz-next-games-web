"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LockIcon, accentVar } from "@statoz/design-system/games";

import { loginHref } from "../return-path";
import { useAuthSession } from "../state/auth-session";

export type AuthBoundaryProps = {
  children: ReactNode;
  intent: string;
  message: string;
  returnTo: string;
  fullScreen?: boolean;
  allowGuest?: boolean;
};

export function AuthBoundary({
  children,
  intent,
  message,
  returnTo,
  fullScreen = false,
  allowGuest = false,
}: AuthBoundaryProps) {
  const session = useAuthSession();

  if (session.status === "hydrating") {
    return (
      <div
        className={`grid place-items-center px-5 ${fullScreen ? "min-h-dvh" : "min-h-96 flex-1"}`}
        aria-label="Checking account status"
      >
        <span className="font-display text-2xs font-black tracking-ultra text-muted">
          CHECKING ACCOUNT...
        </span>
      </div>
    );
  }

  if (session.status === "guest" && !allowGuest) {
    const accent = accentVar("cyan");
    return (
      <div
        className={`grid place-items-center px-5 py-10 text-center ${fullScreen ? "min-h-dvh" : "min-h-96 flex-1"}`}
      >
        <div className="w-full max-w-md border border-line bg-surface-elevated p-6 [clip-path:var(--ds-clip-panel)]">
          <span
            aria-hidden
            className="mx-auto grid size-12 place-items-center border"
            style={{ color: accent, borderColor: accent }}
          >
            <LockIcon size={24} />
          </span>
          <p className="mt-5 font-display text-2xs font-black tracking-ultra text-cyan">
            {"// ACCOUNT REQUIRED"}
          </p>
          <h1 className="mt-2 font-display text-2xl font-black tracking-wide">
            LOG IN TO {intent.toUpperCase()}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
          <Link
            href={loginHref(returnTo)}
            className="mt-6 grid h-12 place-items-center bg-cyan font-display text-xs font-black tracking-wide text-inverse"
          >
            LOG IN
          </Link>
          <Link
            href="/"
            className="mt-3 inline-flex min-h-11 items-center px-4 font-display text-2xs font-black tracking-wide text-muted"
          >
            BACK TO SPORTS
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
