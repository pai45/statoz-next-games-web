import { typography } from "@statoz/design-system/games/tokens/typography";
import Link from "next/link";

import { ChevronLeftIcon, DirectoryCard, paletteVar } from "@statoz/design-system/games";

import {
  channelNumber,
  supportChannels,
} from "../data/support-channels";
import styles from "./talk-to-statoz.module.css";

/**
 * TALK TO STATOZ — the direct line: pick a channel, compose a transmission,
 * send it.
 *
 * The hub is the How To Play hub's twin in the app, down to the card and its
 * meta plate, so it is the same `DirectoryCard` here. What differs is the tag:
 * a guide counts its steps, a channel names its number.
 */
export function TalkToStatoz() {
  return (
    <div className="min-h-full bg-background text-default">
      <header className="mx-auto flex min-h-14 w-full max-w-260 items-center gap-2 px-2 pt-2 lg:px-6 lg:pt-4">
        <Link
          href="/profile"
          aria-label="Back to profile"
          className="grid h-9 w-9 place-items-center text-default hover:bg-overlay-subtle"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <div className="min-w-0">
          <h1
            className="truncate font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p19,
              color: "var(--ds-color-accent-cyan)",
              letterSpacing: "var(--ds-tracking-label)",
            }}
          >
            TALK TO STATOZ
          </h1>
          <p
            className="mt-1 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {"// 1:1 DIRECT LINE"}
          </p>
        </div>
      </header>

      <div className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.introLabel}>OPEN A CHANNEL</p>
          <p className={styles.introBody}>
            Pick a channel. We read every transmission.
          </p>
        </div>

        <ul className={styles.channelGrid}>
          {supportChannels.map((channel) => (
            <li key={channel.id}>
              <DirectoryCard
                href={`/profile/talk-to-statoz/${channel.id}`}
                accent={paletteVar(channel.accent)}
                icon={channel.icon}
                title={channel.title}
                tagline={channel.tagline}
                meta={`CHANNEL ${channelNumber(channel)}`}
              />
            </li>
          ))}
        </ul>

        <section className={styles.socialPanel} aria-labelledby="follow-statoz-title">
          <h2 id="follow-statoz-title">FOLLOW US ON</h2>
          <p>Highlights, hot takes, and the next drop.</p>
          <div className={styles.socialActions}>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">INSTAGRAM</a>
            <a href="https://www.reddit.com/" target="_blank" rel="noreferrer">REDDIT</a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer">YOUTUBE</a>
          </div>
        </section>
      </div>
    </div>
  );
}
