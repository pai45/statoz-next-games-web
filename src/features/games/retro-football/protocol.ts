export const FOOTBALL_PROTOCOL = 1 as const;
export const FOOTBALL_ID = "retro-football" as const;
export type FootballSettings = { music: number; sfx: number };
export type FootballResult = {
  schemaVersion: 2; gameId: typeof FOOTBALL_ID; mode: "exhibition";
  outcome: "win" | "loss" | "draw"; score: [number, number];
  airContacts: [number, number]; airCollections: [number, number];
  passes: [number, number]; shots: [number, number]; saves: [number, number];
  halves: 2; activeSeconds: 180; rulesVersion: string; runtimeVersion: string; assetVersion: string;
};
export type FootballEnvelope = {protocolVersion: 1; gameId: typeof FOOTBALL_ID; sessionId: string; type: string; payload: unknown};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function readEnvelope(value: unknown, sessionId: string): FootballEnvelope | null {
  if (!object(value) || value.protocolVersion !== FOOTBALL_PROTOCOL || value.gameId !== FOOTBALL_ID || value.sessionId !== sessionId || typeof value.type !== "string") return null;
  return value as FootballEnvelope;
}
export function readSettings(value: unknown): FootballSettings | null {
  if (!object(value)) return null;
  const { music, sfx } = value;
  return typeof music === "number" && Number.isFinite(music) && music >= 0 && music <= 1 && typeof sfx === "number" && Number.isFinite(sfx) && sfx >= 0 && sfx <= 1 ? { music, sfx } : null;
}
export function readResult(value: unknown): FootballResult | null {
  if (!object(value) || value.schemaVersion !== 2 || value.gameId !== FOOTBALL_ID || value.mode !== "exhibition" || value.halves !== 2 || value.activeSeconds !== 180) return null;
  const known=(value.runtimeVersion==="0.5.0"&&value.rulesVersion==="exhibition-complete-v1"&&value.assetVersion==="football-complete-atlas-v1")||(["0.6.0","0.7.0"].includes(String(value.runtimeVersion))&&value.rulesVersion==="exhibition-handheld-v1"&&value.assetVersion==="football-handheld-atlas-v1")||(value.runtimeVersion==="0.8.0"&&value.rulesVersion==="exhibition-pitch-v1"&&value.assetVersion==="football-handheld-atlas-v1");
  const explicit=value.runtimeVersion==='0.11.0'&&value.rulesVersion==='exhibition-explicit-controls-v1'&&value.assetVersion==='football-chance-atlas-v2';
  if(!explicit&&!known&&!(["0.9.1","0.10.0"].includes(String(value.runtimeVersion))&&value.rulesVersion==="exhibition-chance-v1"&&value.assetVersion==="football-chance-atlas-v2")&&!(value.runtimeVersion==="0.9.0"&&value.rulesVersion==="exhibition-chance-v1"&&value.assetVersion==="football-chance-atlas-v1"))return null;
  const pair = (v: unknown, max: number): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(n => Number.isInteger(n) && n >= 0 && n <= max);
  if (!pair(value.score, 200) || !pair(value.airContacts, 10000) || !pair(value.airCollections, 10000) || !pair(value.passes, 10000) || !pair(value.shots, 10000) || !pair(value.saves, 10000)) return null;
  const expected = value.score[0] === value.score[1] ? "draw" : value.score[0] > value.score[1] ? "win" : "loss";
  if (value.outcome !== expected) return null;
  // Keep only game-owned fields, never an incoming reward or economy field.
  return {schemaVersion: 2, gameId: FOOTBALL_ID, mode: "exhibition", outcome: expected, score: [...value.score], airContacts: [...value.airContacts], airCollections: [...value.airCollections], passes: [...value.passes], shots: [...value.shots], saves: [...value.saves], halves: 2, activeSeconds: 180, rulesVersion: value.rulesVersion as string, runtimeVersion: value.runtimeVersion as string, assetVersion: value.assetVersion as string};
}
