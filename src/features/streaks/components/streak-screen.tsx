"use client";

import { useMemo, useState, type CSSProperties, type ComponentType } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FootballIcon,
  FlameIcon,
  GameIcon,
  LockIcon,
  MedalIcon,
  MatchIcon,
  MyLocationIcon,
  PickIcon,
  Progress,
  UnderlineTabs,
  accentVar,
  type IconProps,
} from "@statoz/design-system/games";
import { useGuessPlayerStore } from "@/features/games/guess-player/state/guess-player-store";
import { useShootoutProgress } from "@/features/games/penalty-shootout/state/shootout-progress";
import { usePitchDuelCareer as usePitchDuelProgress } from "@/features/games/pitch-duel/state/progress";
import { PackRevealSequence, type PackRevealItem } from "@/features/packs";
import { usePicks } from "@/features/picks";
import { useProfileIdentity } from "@/features/profile";

import { streakMilestones } from "../data/milestones";
import { claimStreakMilestone } from "../rewards";
import {
  addLocalCalendarDays,
  bestStreak,
  currentStreak,
  localDateFromKey,
  localDateKey,
  useIsStreakHydrated,
  useStreakSnapshot,
} from "../state/streak-store";
import type { StreakActivity, StreakCategory } from "../types";
import { StreakFlame } from "./streak-flame";
import styles from "./streak-screen.module.css";

type IconComponent = ComponentType<IconProps>;
type CalendarEvent = { id: string; activity: StreakActivity; title: string; subtitle: string };

const activityMeta: Record<StreakActivity, { label: string; color: string }> = {
  predict: { label: "Prediction made", color: accentVar("cyan") },
  pick: { label: "Pick placed", color: accentVar("lime") },
  pitchDuel: { label: "Pitch Duel completed", color: accentVar("orange") },
  penaltyShootout: { label: "Penalty Shootout completed", color: accentVar("violet") },
  guessPlayer: { label: "Guess the Player settled", color: accentVar("gold") },
};

const categories: { id: Exclude<StreakCategory, "overall">; label: string; accent: string; icon: IconComponent }[] = [
  { id: "predict", label: "PREDICT", accent: accentVar("cyan"), icon: MatchIcon },
  { id: "pick", label: "PICK", accent: accentVar("lime"), icon: PickIcon },
  { id: "games", label: "GAMES", accent: accentVar("orange"), icon: GameIcon },
  { id: "pitchDuel", label: "PITCH DUEL", accent: accentVar("cyan"), icon: FootballIcon },
  { id: "penaltyShootout", label: "PENALTY SHOOTOUT", accent: accentVar("lime"), icon: MyLocationIcon },
];

const tabs = [
  { id: "streaks", label: "STREAKS" },
  { id: "calendar", label: "CALENDAR" },
  { id: "milestones", label: "MILESTONES" },
];

export function StreakScreen() {
  const router = useRouter();
  const hydrated = useIsStreakHydrated();
  const snapshot = useStreakSnapshot();
  const profile = useProfileIdentity();
  const picks = usePicks();
  const pitch = usePitchDuelProgress();
  const shootout = useShootoutProgress();
  const guesses = useGuessPlayerStore();
  const [tab, setTab] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => localDateKey());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [reveal, setReveal] = useState<{ items: PackRevealItem[]; label: string } | null>(null);

  const overall = currentStreak(snapshot, "overall");
  const best = bestStreak(snapshot, "overall");
  const activeToday = snapshot.activeDays.overall.includes(localDateKey());
  const next = streakMilestones.find((item) => item.days > overall);
  const previousDays = [...streakMilestones].reverse().find((item) => item.days <= overall)?.days ?? 0;
  const progress = next ? (overall - previousDays) / (next.days - previousDays) : 1;

  const selectedEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    for (const position of picks.positions) {
      if (localDateKey(new Date(position.submittedAt)) !== selectedDay) continue;
      events.push({ id: `pick:${position.id}`, activity: "pick", title: position.marketQuestion, subtitle: `${position.outcomeLabel} · ${position.stakeOz} Oz` });
    }
    for (const entry of pitch.history) {
      if (localDateKey(new Date(entry.playedAt)) !== selectedDay) continue;
      events.push({ id: `pitch:${entry.id}`, activity: "pitchDuel", title: `Pitch Duel · ${entry.result}`, subtitle: `${entry.playerScore}–${entry.opponentScore} vs ${entry.opponentName}` });
    }
    for (const entry of shootout.history) {
      if (localDateKey(new Date(entry.playedAt)) !== selectedDay) continue;
      const won = entry.playerScore > entry.opponentScore;
      events.push({ id: `shootout:${entry.id}`, activity: "penaltyShootout", title: `Penalty Shootout · ${won ? "Victory" : "Defeat"}`, subtitle: `${entry.playerScore}–${entry.opponentScore} vs ${entry.opponentName}` });
    }
    for (const [sport, archive] of Object.entries(guesses.bySport)) {
      const record = archive?.resultsByDay[selectedDay];
      if (!record || !guesses.settled.includes(`guess-player:${sport}:${selectedDay}`)) continue;
      events.push({ id: `guess:${sport}:${selectedDay}`, activity: "guessPlayer", title: "Guess the Player", subtitle: `${sport.toUpperCase()} · ${record.status === "won" ? "Solved" : "Settled"}` });
    }
    const represented = new Set(events.map((event) => event.activity));
    for (const activity of snapshot.activities[selectedDay] ?? []) {
      if (represented.has(activity)) continue;
      events.push({ id: `generic:${selectedDay}:${activity}`, activity, title: activityMeta[activity].label, subtitle: "Streak activity recorded" });
    }
    return events;
  }, [guesses, picks.positions, pitch.history, selectedDay, shootout.history, snapshot.activities]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.replace("/");
  }

  function claim(days: number) {
    const result = claimStreakMilestone(days, profile.primarySport);
    if (result.ok && result.kind === "cards") setReveal({ items: result.items, label: result.label });
  }

  if (!hydrated) return <div className={`${styles.screen} grid place-items-center`}><p className="font-display text-2xs font-black tracking-ultra text-muted">SYNCING STREAK...</p></div>;

  return (
    <div className={styles.screen}>
      <header className="flex items-center px-3.5 py-3.5">
        <button type="button" onClick={goBack} aria-label="Go back" className="grid size-11 place-items-center text-gold hover:brightness-125"><ArrowLeftIcon size={22} /></button>
        <h1 className="ml-2 font-display text-xl font-black tracking-tight">STREAKS</h1>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-3 sm:px-6 lg:px-8">
        <section className={`${styles.hero} p-4 text-center`} aria-labelledby="streak-heading">
          <div className="mx-auto size-[108px]"><StreakFlame size={108} /></div>
          <h2 id="streak-heading" className="ds-tabular font-display text-hero font-black leading-compact text-gold">{overall}</h2>
          <p className="mt-1 font-display text-micro font-black tracking-ultra text-orange">{overall === 1 ? "DAY ACTIVE" : "DAYS ACTIVE"}</p>
          <div className="mx-auto mt-3.5 grid max-w-xl grid-cols-2 gap-2">
            <Metric label="BEST" value={`${best} DAYS`} />
            <Metric label="TODAY" value={activeToday ? "COMPLETE" : "PLAY NOW"} state={activeToday ? "complete" : "pending"} />
          </div>
          {next ? <div className="mx-auto mt-4 max-w-xl"><Progress value={progress} accent={accentVar("gold")} label="Progress to next streak milestone" height={8} className={styles.streakProgress} /><p className="mt-2 text-sm leading-body text-muted">{next.days - overall} days to {next.rewardLabel}</p></div> : null}
        </section>

        <UnderlineTabs tabs={tabs} activeIndex={tab} onChange={setTab} accent={accentVar("gold")} label="Streak sections" className={`${styles.tabs} -mx-4 mt-4 sm:-mx-6 lg:-mx-8`} />

        {tab === 0 ? (
          <section className="mt-4" aria-label="Streak categories">
            <SectionHeading title="YOUR STREAKS" subtitle="Each mode keeps its own daily run." />
            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
              {categories.map((category) => {
                const count = currentStreak(snapshot, category.id);
                const bestCategory = bestStreak(snapshot, category.id);
                const Icon = category.icon;
                return (
                  <article key={category.id} className={`${styles.card} flex items-center p-3.5`} style={{ "--card-accent": count > 0 ? category.accent : "var(--ds-color-border-inactive)" } as CSSProperties}>
                    <Icon size={16} style={{ color: category.accent }} />
                    <div className="ml-2.5 min-w-0 flex-1"><h3 className="font-display text-base font-black leading-tight tracking-wide">{category.label}</h3><p className="mt-1 text-sm leading-tight text-muted">Best {bestCategory} days</p></div>
                    {count > 0 ? <span className="flex h-6.5 items-center gap-1 text-gold" aria-label={`${count} day streak`}><FlameIcon size={16} /><strong className="ds-tabular font-display text-xs font-black">{count}</strong></span> : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {tab === 1 ? (
          <section className="mt-4">
            <SectionHeading title="ACTIVITY CALENDAR" subtitle="Tap a day to review your activity." />
            <div className="mt-2.5 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
              <CalendarPanel snapshot={snapshot} month={month} selectedDay={selectedDay} setMonth={setMonth} setSelectedDay={setSelectedDay} />
              <DayDetails dayKey={selectedDay} events={selectedEvents} />
            </div>
          </section>
        ) : null}

        {tab === 2 ? (
          <section className="mt-4" aria-label="Streak milestones">
            <SectionHeading title="STREAK MILESTONES" subtitle="Keep showing up to unlock bigger rewards." />
            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
              {streakMilestones.map((milestone) => {
                const claimed = snapshot.claimedMilestones.includes(milestone.days);
                const ready = snapshot.announcedMilestones.includes(milestone.days) && !claimed;
                return (
                  <article key={milestone.days} className={`${styles.milestone} ${ready ? styles.milestoneReady : ""} flex min-h-32 items-center gap-4 p-4`}>
                    <span className={`grid size-14 shrink-0 place-items-center border ${claimed ? "border-success text-success" : ready ? "border-gold text-gold" : "border-line-strong text-muted"}`}>{claimed ? <CheckIcon size={28} /> : ready ? <MedalIcon size={28} /> : <LockIcon size={24} />}</span>
                    <div className="min-w-0 flex-1"><p className="font-display text-micro font-black tracking-ultra text-muted">{milestone.days} DAY MILESTONE</p><h3 className="mt-1 font-display text-sm font-black tracking-wide">{milestone.title}</h3><p className="mt-1 text-xs font-semibold text-gold">{milestone.rewardLabel}</p></div>
                    {ready ? <button type="button" onClick={() => claim(milestone.days)} className="min-h-11 shrink-0 bg-gold px-3 font-display text-micro font-black tracking-wide text-inverse hover:brightness-110">CLAIM</button> : <span className="font-display text-micro font-black tracking-wide text-muted">{claimed ? "CLAIMED" : `${Math.max(0, milestone.days - overall)} TO GO`}</span>}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      {reveal ? <PackRevealSequence items={reveal.items} completeLabel={reveal.label} actionLabel="BACK TO STREAKS" onComplete={() => setReveal(null)} /> : null}
    </div>
  );
}

function Metric({ label, value, state = "default" }: { label: string; value: string; state?: "default" | "pending" | "complete" }) {
  return <div className={styles.metric}><p className="font-display text-micro font-black tracking-ultra text-muted">{label}</p><p className={`ds-tabular mt-1.5 font-display text-base font-black leading-tight tracking-wide ${state === "complete" ? "text-success" : state === "pending" ? "text-orange" : "text-foreground"}`}>{value}</p></div>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 className="font-display text-base font-black leading-tight tracking-wide">{title}</h2><p className="mt-1 text-sm leading-body text-muted">{subtitle}</p></div>;
}

function CalendarPanel({ snapshot, month, selectedDay, setMonth, setSelectedDay }: { snapshot: ReturnType<typeof useStreakSnapshot>; month: Date; selectedDay: string; setMonth: (date: Date) => void; setSelectedDay: (key: string) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = addLocalCalendarDays(first, -mondayOffset);
  const cells = Array.from({ length: 42 }, (_, index) => addLocalCalendarDays(start, index));
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month).toUpperCase();

  return (
    <div className={`${styles.card} border border-line bg-surface p-3 sm:p-4`} style={{ "--card-accent": "var(--ds-color-accent-gold)" } as CSSProperties}>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} className="grid size-11 place-items-center text-muted hover:text-gold"><ChevronLeftIcon size={22} /></button>
        <h2 className="font-display text-sm font-black tracking-wide">{monthLabel}</h2>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} className="grid size-11 place-items-center text-muted hover:text-gold"><ChevronRightIcon size={22} /></button>
      </div>
      <div className={`${styles.calendarGrid} mt-2`}>
        {['M','T','W','T','F','S','S'].map((day, index) => <span key={`${day}-${index}`} className="grid h-8 place-items-center font-display text-micro font-black text-muted">{day}</span>)}
        {cells.map((date) => {
          const key = localDateKey(date);
          const adjacent = date.getMonth() !== month.getMonth();
          const selected = key === selectedDay;
          const today = key === localDateKey();
          const markers = (snapshot.activities[key] ?? []).slice(0, 4);
          return (
            <button key={key} type="button" onClick={() => setSelectedDay(key)} aria-label={`${new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(date)}${markers.length ? `, ${markers.length} activities` : ""}`} aria-pressed={selected} className={`${styles.calendarCell} relative grid place-items-center border border-transparent font-display text-xs font-black hover:border-line-inactive ${adjacent ? "text-disabled" : "text-foreground"} ${selected ? "bg-gold text-inverse" : today ? "border-gold text-gold" : ""}`}>
              <span>{date.getDate()}</span>
              <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden>{markers.map((activity) => <i key={activity} className="size-1 rounded-full" style={{ background: activityMeta[activity].color }} />)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayDetails({ dayKey, events }: { dayKey: string; events: CalendarEvent[] }) {
  const date = localDateFromKey(dayKey) ?? new Date();
  const label = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date).toUpperCase();
  return (
    <aside className={`${styles.card} border border-line bg-surface p-4`} style={{ "--card-accent": "var(--ds-color-accent-gold)" } as CSSProperties}>
      <div className="flex items-center gap-3"><CalendarIcon size={22} className="text-gold" /><div><p className="font-display text-micro font-black tracking-ultra text-muted">SELECTED DAY</p><h2 className="font-display text-sm font-black tracking-wide">{label}</h2></div></div>
      <div className="mt-4 space-y-2">
        {events.length ? events.map((event) => <div key={event.id} className="flex min-h-16 items-center gap-3 border border-line-subtle bg-background/50 p-3"><span className="size-2 shrink-0 rounded-full" style={{ background: activityMeta[event.activity].color }} /><div><p className="text-sm font-semibold">{event.title}</p><p className="mt-1 text-xs text-muted">{event.subtitle}</p></div></div>) : <div className="grid min-h-40 place-items-center border border-dashed border-line-strong text-center"><div><FlameIcon size={24} className="mx-auto text-muted" /><p className="mt-3 font-display text-micro font-black tracking-wide text-muted">NO STREAK ACTIVITY</p></div></div>}
      </div>
    </aside>
  );
}
