import type { MatchDetailData, SportMatch } from "@/domain/matches";

import { basketballDetail } from "./basketball";
import { cricketDetail } from "./cricket";
import { footballDetail } from "./football";
import { motorsportDetail } from "./motorsport";
import { buildMatchDetail } from "./shared";
import { tennisDetail } from "./tennis";
import { italianGpReport } from "./f1";
import { applyFootballSnapshot } from "./football-snapshot";
import { applyCricketSnapshot } from "./cricket-snapshot";
import { applyBasketballSnapshot } from "./basketball-snapshot";
export { footballSnapshotPlayerIds } from "./football-snapshot";
export { cricketSnapshotPlayerIds } from "./cricket-snapshot";

const detailBySport = { football: footballDetail, cricket: cricketDetail, basketball: basketballDetail, tennis: tennisDetail, motorsport: motorsportDetail };
export function matchDetailFor(match: SportMatch): MatchDetailData {
  const detail = buildMatchDetail(match, detailBySport[match.sport]);
  applyFootballSnapshot(match, detail.scoreboard);
  applyCricketSnapshot(match, detail.scoreboard);
  applyBasketballSnapshot(match, detail.scoreboard);
  if (match.id === italianGpReport.id) detail.scoreboard.race = italianGpReport;
  return detail;
}

export { italianGpReport } from "./f1";
