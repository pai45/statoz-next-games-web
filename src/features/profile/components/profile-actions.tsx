"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import {
  accentVar,
  ChevronRightIcon,
  feedbackVar,
  HeadsetIcon,
  LogoutIcon,
  MenuBookIcon,
  SettingsIcon,
  StyleIcon,
  withAlpha,
} from "@statoz/design-system/games";
import { loginHref, signOut, useAuthSession } from "@/features/auth";

import { ProfileOverlay } from "./profile-overlay";
import styles from "./profile.module.css";
import { TimeZoneCard } from "./time-zone-card";
import { useProfileIdentity } from "../state/profile-identity";

/**
 * The utility rows that close the dossier, and the settings sheet behind the
 * last of them.
 *
 * All four rows go somewhere now; `NavRow` stays a button because the last of
 * them opens a sheet rather than a route.
 */

const cyan = accentVar("cyan");
const danger = feedbackVar("danger");

export function ProfileActions() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <ul className="flex flex-col gap-2.5">
        <li>
          <NavLink icon={<StyleIcon size={20} />} label="All Cards" href="/cards" />
        </li>
        <li>
          <NavLink icon={<MenuBookIcon size={20} />} label="How To Play" href="/how-to-play" />
        </li>
        <li>
          <NavLink
            icon={<HeadsetIcon size={20} />}
            label="Talk to StatOz 1:1"
            href="/profile/talk-to-statoz"
          />
        </li>
        <li>
          <NavRow
            icon={<SettingsIcon size={20} />}
            label="Settings"
            onClick={() => setSettingsOpen(true)}
          />
        </li>
      </ul>

      {settingsOpen ? (
        <SettingsSheet onClose={() => setSettingsOpen(false)} />
      ) : null}
    </>
  );
}

/** A row that goes somewhere. Same plate as {@link NavRow}, different element. */
function NavLink({
  icon,
  label,
  href,
}: {
  icon: ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 border px-4 py-4 text-left ${styles.pressable} cursor-pointer`}
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.5),
        borderColor: "var(--ds-color-border-default)",
      }}
    >
      <span aria-hidden style={{ color: cyan }}>
        {icon}
      </span>
      <span className="flex-1 text-base font-semibold leading-none">{label}</span>
      <ChevronRightIcon size={20} className="text-muted" />
    </Link>
  );
}

/** A row that opens something in place — the settings sheet. */
function NavRow({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border px-4 py-4 text-left ${styles.pressable} cursor-pointer`}
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.5),
        borderColor: "var(--ds-color-border-default)",
      }}
    >
      <span aria-hidden style={{ color: cyan }}>
        {icon}
      </span>
      <span className="flex-1 text-base font-semibold leading-none">{label}</span>
      <ChevronRightIcon size={20} className="text-muted" />
    </button>
  );
}

/* ---- Settings -------------------------------------------------------------- */

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const session = useAuthSession();
  const identity = useProfileIdentity();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return <LogoutConfirm onCancel={() => setConfirming(false)} onClose={onClose} />;
  }

  return (
    <ProfileOverlay
      title="SETTINGS"
      icon={<SettingsIcon size={17} />}
      onClose={onClose}
    >
      <div className="p-4"><TimeZoneCard selectedId={identity.timeZoneId} /></div>
      {session.status === "guest" ? (
        <div className="p-4"><NavLink icon={<SettingsIcon size={20} />} label="Save progress â€” Log in / Create account" href={loginHref("/profile")} /></div>
      ) : <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full cursor-pointer items-center gap-3 px-4.5 py-4 text-left transition-colors hover:bg-white/4"
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center border"
          style={{
            color: danger,
            background: withAlpha(danger, 0.12),
            borderColor: withAlpha(danger, 0.55),
          }}
        >
          <LogoutIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p12,
              letterSpacing: "var(--ds-tracking-wide)",
              color: danger,
            }}
          >
            LOG OUT
          </span>
          <span className="mt-1 block text-xs leading-none text-muted">
            Hide your player data and return to sports
          </span>
        </span>
        <ChevronRightIcon size={20} style={{ color: danger }} />
      </button>}
    </ProfileOverlay>
  );
}

/**
 * Signing out only removes the local demo session. Player data remains stored
 * but is unreachable until the next sign-in.
 */
function LogoutConfirm({
  onCancel,
  onClose,
}: {
  onCancel: () => void;
  onClose: () => void;
}) {
  const router = useRouter();

  const logOut = useCallback(() => {
    onClose();
    signOut();
    router.replace("/");
  }, [onClose, router]);

  return (
    <ProfileOverlay
      title="LOG OUT"
      accent={danger}
      icon={<LogoutIcon size={16} />}
      size="dialog"
      onClose={onCancel}
      footer={
        <div className="flex">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer py-3 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-mega)" }}
          >
            CANCEL
          </button>
          <span aria-hidden className="w-px self-stretch bg-line-strong" />
          <button
            type="button"
            onClick={logOut}
            className="flex-1 cursor-pointer py-3 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p11,
              letterSpacing: "var(--ds-tracking-mega)",
              color: danger,
            }}
          >
            LOG OUT &gt;
          </button>
        </div>
      }
    >
      <div className="px-5 pb-5 pt-4">
        <p
          className="font-display font-black leading-tight"
          style={{ fontSize: typography.sizeRem.p16, letterSpacing: "var(--ds-tracking-label)" }}
        >
          LOG OUT OF STATOZ?
        </p>
        <p className="mt-2.5 text-sm leading-body text-muted">
          Your profile, coins, cards, matches, and progress will be hidden but
          remain saved in this browser for your next sign-in.
        </p>
      </div>
    </ProfileOverlay>
  );
}
