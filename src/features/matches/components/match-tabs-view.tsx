"use client";

import { useEffect, useState } from "react";

import { UnderlineTabs, accentVar } from "@statoz/design-system/games";
import type { SportMatch } from "@/domain/matches";
import { MatchPicksPanel } from "@/features/picks";
import { MatchPredictTab } from "@/features/predictions";

import type { MatchDetailData } from "../types";
import { MatchLeaderboardTab } from "./match-leaderboard-tab";
import { MatchScoreboard } from "./match-scoreboard";
import styles from "./match-detail.module.css";

/**
 * The four match surfaces: the quizzes, the markets on the same fixture, the
 * board those quizzes rank, and the scoreboard.
 *
 * The tabs know about each other in exactly two places, both of which the app
 * has too: TOPS hands an unranked player to PREDICT, and PREDICT hands a
 * finished draft to PICKS.
 */

type MainTab = "predict" | "picks" | "tops" | "stats";

/** Labels only, as on the app's strip — the underline is the whole signal. */
const mainTabs: { id: MainTab; label: string }[] = [
  { id: "predict", label: "PREDICT" },
  { id: "picks", label: "PICKS" },
  { id: "tops", label: "TOPS" },
  { id: "stats", label: "STATS" },
];

export function MatchTabsView({ match, detail }: { match: SportMatch; detail: MatchDetailData }) {
  const [activeTab, setActiveTab] = useState<MainTab>("predict");
  useEffect(() => {
    if (window.location.hash !== "#picks") return;
    const task = window.setTimeout(() => setActiveTab("picks"), 0);
    return () => window.clearTimeout(task);
  }, []);
  const activeIndex = mainTabs.findIndex((tab) => tab.id === activeTab);
  return (
    <section className={styles.tabsBody} aria-label="Match content">
      <UnderlineTabs
        label="Match detail tabs"
        className={styles.mainTabs}
        tabs={mainTabs}
        activeIndex={activeIndex}
        onChange={(index) => setActiveTab(mainTabs[index].id)}
        accent={accentVar("cyan")}
      />

      <div className={styles.tabPanel}>
        {activeTab === "predict" ? (
          <MatchPredictTab
            match={match}
            quizzes={detail.quizzes}
          />
        ) : null}
        {activeTab === "picks" ? <MatchPicksPanel matchId={match.id} /> : null}
        {activeTab === "tops" ? (
          <MatchLeaderboardTab match={match} detail={detail} onJoin={() => setActiveTab("predict")} />
        ) : null}
        {activeTab === "stats" ? <MatchScoreboard match={match} scoreboard={detail.scoreboard} /> : null}
      </div>
    </section>
  );
}
