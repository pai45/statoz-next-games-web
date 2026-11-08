import type { Sport } from "@/domain/sports";
import { publicAsset } from "@/shared/config";

import { bandCount, bandSize, questionsPerSet, setCount } from "../constants";
import type { QuizMode, TriviaQuestion } from "../types";

/**
 * Loads the authored trivia database and caches it.
 *
 * One file per sport and mode lives at `/assets/quiz/<sport>_<mode>.json`,
 * copied verbatim from the app's asset bundle. Each carries five **bands** of a
 * hundred questions; band `k` owns sets `10(k-1)+1 … 10k`, so flattening the
 * bands in order reproduces the 500-question pool the ladder indexes into.
 * Bands exist so difficulty can ramp across the fifty sets.
 *
 * Fetched on demand rather than bundled: the twenty files are 2.1 MB together
 * and a player opens one mode at a time, which is exactly how the app loads
 * them too. A file may ship with later bands short — the database is authored
 * a batch at a time — and that is not an error: `authoredSetCount` reports how
 * many sets actually exist so the ladder can render the rest as SOON instead of
 * falling back to filler questions.
 */

const pools = new Map<string, TriviaQuestion[]>();
const inFlight = new Map<string, Promise<void>>();

function key(sport: Sport, mode: QuizMode): string {
  return `${sport}_${mode}`;
}

export function assetPathFor(sport: Sport, mode: QuizMode): string {
  return publicAsset(`/assets/quiz/${key(sport, mode)}.json`);
}

/** True once `ensureLoaded` has resolved for this pool. */
export function isLoaded(sport: Sport, mode: QuizMode): boolean {
  return pools.has(key(sport, mode));
}

/** The flattened pool, or an empty list when it has not been loaded. */
export function poolFor(sport: Sport, mode: QuizMode): TriviaQuestion[] {
  return pools.get(key(sport, mode)) ?? [];
}

/**
 * How many of the fifty sets have questions behind them. A partial set does not
 * count — a set needs all ten to be playable.
 */
export function authoredSetCount(sport: Sport, mode: QuizMode): number {
  return Math.floor(poolFor(sport, mode).length / questionsPerSet);
}

/**
 * Parses the file into the cache. Idempotent, and concurrent callers share one
 * decode. A missing or malformed file caches an empty pool rather than
 * throwing, so the ladder shows every set as upcoming instead of breaking.
 */
export function ensureLoaded(sport: Sport, mode: QuizMode): Promise<void> {
  const id = key(sport, mode);
  if (pools.has(id)) return Promise.resolve();

  const existing = inFlight.get(id);
  if (existing) return existing;

  const load = (async () => {
    try {
      const response = await fetch(assetPathFor(sport, mode));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      pools.set(id, parsePool(await response.json(), sport, mode));
    } catch {
      pools.set(id, []);
    } finally {
      inFlight.delete(id);
    }
  })();

  inFlight.set(id, load);
  return load;
}

/**
 * Flattens the bands in order, stopping at the first one that is missing or
 * short — so a half-authored band can never shift the questions behind an
 * already-published set.
 */
function parsePool(
  json: unknown,
  sport: Sport,
  mode: QuizMode,
): TriviaQuestion[] {
  if (typeof json !== "object" || json === null) return [];
  const bands = (json as { bands?: unknown }).bands;
  if (typeof bands !== "object" || bands === null) return [];
  const byNumber = bands as Record<string, unknown>;

  const questions: TriviaQuestion[] = [];
  for (let band = 1; band <= bandCount; band += 1) {
    const entries = byNumber[String(band)];
    if (!Array.isArray(entries) || entries.length < bandSize) break;
    for (let index = 0; index < bandSize; index += 1) {
      const parsed = parseQuestion(
        entries[index],
        sport,
        mode,
        questions.length + 1,
      );
      if (!parsed) return questions;
      questions.push(parsed);
    }
  }
  return questions;
}

/**
 * `{"p": prompt, "o": [options], "a": correctIndex}`. The id is positional so
 * it stays stable however the file is formatted.
 */
function parseQuestion(
  entry: unknown,
  sport: Sport,
  mode: QuizMode,
  number: number,
): TriviaQuestion | null {
  if (typeof entry !== "object" || entry === null) return null;
  const record = entry as { p?: unknown; o?: unknown; a?: unknown };

  const prompt = record.p;
  const options = record.o;
  const answer = record.a;
  if (typeof prompt !== "string" || prompt.length === 0) return null;
  if (!Array.isArray(options) || options.length < 2) return null;
  if (
    typeof answer !== "number" ||
    !Number.isInteger(answer) ||
    answer < 0 ||
    answer >= options.length
  ) {
    return null;
  }

  return {
    id: `${sport}_${mode}_q${String(number).padStart(3, "0")}`,
    sport,
    mode,
    prompt,
    options: options.map((option) => `${option}`),
    correctIndex: answer,
  };
}

/**
 * The ten questions behind a set.
 *
 * Deterministic — the same set always deals the same questions in the same
 * order, which is what makes chasing a flawless run worth doing. Empty when the
 * pool is not loaded, or when the set is past the authored range.
 */
export function buildQuizSet(
  sport: Sport,
  mode: QuizMode,
  setNumber: number,
): TriviaQuestion[] {
  const pool = poolFor(sport, mode);
  const clamped = Math.min(Math.max(setNumber, 1), setCount);
  const start = (clamped - 1) * questionsPerSet;
  if (start + questionsPerSet > pool.length) return [];
  return pool.slice(start, start + questionsPerSet);
}

/** The answer a question's index names, or an em dash for no answer at all. */
export function labelFor(question: TriviaQuestion, index: number | undefined) {
  if (index === undefined || index < 0 || index >= question.options.length) {
    return "—";
  }
  return question.options[index];
}
