/**
 * The predictions feature's public API.
 *
 * The PREDICT tab itself, plus the store behind it — a player's drafts, their
 * sealed cards, and what those cards settled for.
 */
export { MatchPredictTab } from "./components/match-predict-tab";
export { MatchPredictionScreen } from "./components/match-prediction-screen";

export {
  chargeContestEntry,
  lockPrediction,
  predictionCareer,
  predictionFor,
  readPredictions,
  resetPredictions,
  saveDraft,
  settlePrediction,
  usePrediction,
  usePredictionCareer,
  usePredictions,
  type PredictionCareer,
  type PredictionsSnapshot,
  type SettlementOutcome,
} from "./state/prediction-store";

export { resolveQuizHubVisual, type QuizHubVisual } from "./hub-visual";
