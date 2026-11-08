import { typography } from "@statoz/design-system/games/tokens/typography";
import Link from "next/link";
import type { CSSProperties } from "react";

import {
  AccentPanel,
  ChevronLeftIcon,
  Glyph,
  GlyphTile,
  paletteVar,
} from "@statoz/design-system/games";

import type { GuideFact, GuideStat, GuideStep, ModeGuide } from "../types";
import { accentStyle, SectionLabel } from "./guide-parts";
import styles from "./how-to-play.module.css";

/**
 * One mode's reference page: what it is, three facts at a glance, the numbered
 * run of play, and the rules that are not steps — the app's order exactly.
 *
 * A phone reads it straight down. On a desktop the steps take a column of their
 * own beside the other two, because they are much the longest thing here and
 * would otherwise leave the rest of the page empty.
 */
export function HowToPlayGuide({ guide }: { guide: ModeGuide }) {
  const accent = paletteVar(guide.accent);

  return (
    <div className="min-h-full bg-background text-default" style={accentStyle(guide.accent)}>
      <header className="mx-auto flex min-h-14 w-full max-w-260 items-center gap-2 px-2 pt-2 lg:px-6 lg:pt-4">
        <Link
          href="/how-to-play"
          aria-label="Back to How To Play"
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
            {guide.title}
          </h1>
          <p
            className="mt-1 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {guide.subtitle}
          </p>
        </div>
      </header>

      <div className={styles.guidePage}>
        <div className={styles.introBlock}>
          <AccentPanel accent={accent}>
            <div className={styles.headerRow}>
              <GlyphTile icon={guide.icon} accent={accent} size={48} />
              <div className="min-w-0 flex-1">
                <h2 className={styles.headerTitle}>{guide.title}</h2>
                <p className={styles.headerPurpose}>{guide.purpose}</p>
                {guide.playHref && <Link href={guide.playHref} className="mt-4 inline-flex min-h-11 items-center border border-line bg-surface-elevated px-4 font-display text-xs font-bold" style={{color:accent}}>Play {guide.title}</Link>}
              </div>
            </div>
          </AccentPanel>

          <div className={styles.overview}>
            {guide.stats.map((stat) => (
              <StatCell key={stat.label} stat={stat} />
            ))}
          </div>
        </div>

        <div className={styles.stepsBlock}>
          <AccentPanel accent={accent}>
            <div className={styles.panelBody}>
              <SectionLabel label="How It Works" />
              <ol className={styles.steps}>
                {guide.steps.map((step, index) => (
                  <StepTile key={step.title} index={index + 1} step={step} />
                ))}
              </ol>
            </div>
          </AccentPanel>
        </div>

        <div className={styles.factsBlock}>
          <AccentPanel accent={accent}>
            <div className={styles.panelBody}>
              <SectionLabel label="Good to Know" />
              <ul className={styles.facts}>
                {guide.facts.map((fact, index) => (
                  <li key={fact.label}>
                    {index > 0 ? <hr className={`${styles.hairline} mb-2.5`} /> : null}
                    <FactTile fact={fact} />
                  </li>
                ))}
              </ul>
            </div>
          </AccentPanel>
        </div>
      </div>
    </div>
  );
}

/** One cell of the three-up strip. Each carries its own accent, not the guide's. */
function StatCell({ stat }: { stat: GuideStat }) {
  return (
    <div
      className={styles.statCell}
      style={{ "--stat-accent": paletteVar(stat.accent) } as CSSProperties}
    >
      <Glyph name={stat.icon} size={22} className={styles.statGlyph} aria-hidden="true" />
      <p className={styles.statLabel}>{stat.label}</p>
      <p className={styles.statSub}>{stat.sub}</p>
    </div>
  );
}

function StepTile({ index, step }: { index: number; step: GuideStep }) {
  return (
    <li className={styles.step}>
      <span className={styles.stepIndex} aria-hidden="true">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepBody}>{step.body}</p>
      </div>
    </li>
  );
}

function FactTile({ fact }: { fact: GuideFact }) {
  return (
    <div className={styles.fact}>
      <Glyph name={fact.icon} size={16} className={styles.factGlyph} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className={styles.factLabel}>{fact.label}</h3>
        <p className={styles.factBody}>{fact.body}</p>
      </div>
    </div>
  );
}
