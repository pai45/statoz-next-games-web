"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type CSSProperties } from "react";

import {
  AccentPanel,
  Button,
  CheckIcon,
  ChevronLeftIcon,
  GlyphTile,
  paletteVar,
  SendIcon,
} from "@statoz/design-system/games";

import type { SupportChannel } from "../data/support-channels";
import styles from "./talk-to-statoz.module.css";

/**
 * Compose a transmission on one channel: what happened in a line, then the
 * whole of it, then TRANSMIT.
 *
 * Nothing is sent anywhere. The app says so in its own source — "local stub, no
 * backend yet" — and inventing a destination for a message a player believes
 * was read would be worse than keeping the stub honest.
 *
 * Both fields are required. The app signals that with red edges alone; here the
 * empty field also says what is wrong, because a colour is not a message to
 * anyone who cannot see it.
 */
export function TransmissionCompose({ channel }: { channel: SupportChannel }) {
  const router = useRouter();
  const accent = paletteVar(channel.accent);

  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [submittedEmpty, setSubmittedEmpty] = useState(false);
  const [sent, setSent] = useState(false);

  const summaryEmpty = submittedEmpty && summary.trim() === "";
  const detailsEmpty = submittedEmpty && details.trim() === "";

  function transmit() {
    if (summary.trim() === "" || details.trim() === "") {
      setSubmittedEmpty(true);
      return;
    }
    setSent(true);
  }

  return (
    <div
      className="flex min-h-full flex-col bg-background text-default"
      style={{ "--channel-accent": accent } as CSSProperties}
    >
      <header className="mx-auto flex min-h-14 w-full max-w-260 items-center gap-2 px-2 pt-2 lg:px-6 lg:pt-4">
        <Link
          href="/profile/talk-to-statoz"
          aria-label="Back to the channels"
          className="grid h-9 w-9 place-items-center text-default hover:bg-overlay-subtle"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <div className="min-w-0">
          <h1
            className="truncate font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p19,
              color: accent,
              letterSpacing: "var(--ds-tracking-label)",
            }}
          >
            {channel.title.toUpperCase()}
          </h1>
          <p
            className="mt-1 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {channel.composeSubtitle}
          </p>
        </div>
      </header>

      <form
        className={styles.composePage}
        onSubmit={(event) => {
          event.preventDefault();
          transmit();
        }}
        noValidate
      >
        <AccentPanel accent={accent} className={styles.composeHeader}>
          <div className={styles.headerRow}>
            <GlyphTile icon={channel.icon} accent={accent} size={48} />
            <div className="min-w-0 flex-1">
              <h2 className={styles.headerTitle}>{channel.title.toUpperCase()}</h2>
              <p className={styles.headerHint}>{channel.composeHint}</p>
            </div>
          </div>
        </AccentPanel>

        <div className={styles.fields}>
          <TransmissionField
            label="Summary"
            hint={channel.summaryHint}
            value={summary}
            onValue={setSummary}
            error={summaryEmpty ? "Add a one-line summary." : undefined}
          />
          <TransmissionField
            label="Details"
            hint={channel.detailsHint}
            value={details}
            onValue={setDetails}
            rows={6}
            error={detailsEmpty ? "Tell us the rest — we need the details." : undefined}
          />
        </div>

        {/* Docked, so TRANSMIT is reachable without scrolling the form away. */}
        <div className={styles.transmitDock}>
          <Button
            type="submit"
            accent={accent}
            size="lg"
            fullWidth
            trailingIcon={<SendIcon size={18} />}
          >
            TRANSMIT
          </Button>
        </div>
      </form>

      {sent ? (
        <TransmissionSent
          accent={accent}
          channelTitle={channel.title}
          onDone={() => router.push("/profile/talk-to-statoz")}
        />
      ) : null}
    </div>
  );
}

/**
 * A transmission field: a label above a square plate.
 *
 * Square, and label-led, because that is what the app draws here — the system's
 * chamfered `InputField` is the login form's field, and this is a console.
 */
function TransmissionField({
  label,
  hint,
  value,
  onValue,
  error,
  rows,
}: {
  label: string;
  hint: string;
  value: string;
  onValue: (value: string) => void;
  error?: string;
  rows?: number;
}) {
  const id = useId();
  const messageId = `${id}-message`;

  const shared = {
    id,
    value,
    placeholder: hint,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? messageId : undefined,
    className: [styles.field, error ? styles.fieldError : ""].filter(Boolean).join(" "),
    onChange: (event: { target: { value: string } }) => onValue(event.target.value),
  };

  return (
    <div className={styles.fieldBlock}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label.toUpperCase()}
      </label>
      {rows ? (
        <textarea {...shared} rows={rows} />
      ) : (
        <input {...shared} type="text" />
      )}
      {error ? (
        <p className={styles.fieldMessage} id={messageId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The send-off: a badge slams in behind a flash, the line lands, and the whole
 * thing fades out and returns to the channels.
 *
 * The app runs this as one 2.2s controller; here the beats are keyframes and
 * the only thing left in JavaScript is the timer that navigates at the end.
 */
function TransmissionSent({
  accent,
  channelTitle,
  onDone,
}: {
  accent: string;
  channelTitle: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={styles.sentScrim}
      style={{ "--channel-accent": accent } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      {/* CRT scanlines — the app's texture overlay, a dark row every third pixel. */}
      <span aria-hidden className={styles.sentTexture} />

      <div className={styles.sentStack}>
        <span className={styles.sentBadge}>
          <span aria-hidden className={styles.sentFlash} />
          <span className={styles.sentSeal}>
            <CheckIcon size={36} />
          </span>
        </span>

        <div className={styles.sentText}>
          <p className={styles.sentHeadline}>TRANSMISSION SENT</p>
          <p className={styles.sentChannel}>{channelTitle.toUpperCase()}</p>
          <p className={styles.sentBody}>Signal locked. We&rsquo;ll take it from here.</p>
        </div>
      </div>
    </div>
  );
}
