import {readResult, readSettings, type FootballSettings, type FootballResult} from "./protocol";
export const FOOTBALL_STORAGE_KEY = "statoz.next.games-web.retro-football:v1";
export type FootballArchive = {version: 1; settings: FootballSettings; results: {id: string; completedAt: string; result: FootballResult}[]};
const defaults = (): FootballArchive => ({version: 1, settings: {music: .4, sfx: .7}, results: []});
export function readArchive(storage: Pick<Storage, "getItem"> | null): FootballArchive {
  try {
    const data: unknown = JSON.parse(storage?.getItem(FOOTBALL_STORAGE_KEY) ?? "null");
    if (!data || typeof data !== "object" || (data as {version?: unknown}).version !== 1) return defaults();
    const raw = data as Record<string, unknown>, archive = defaults();
    archive.settings = readSettings(raw.settings) ?? archive.settings;
    if (Array.isArray(raw.results)) for (const row of raw.results.slice(-20)) {
      if (!row || typeof row !== "object") continue;
      const result = readResult(row.result);
      if (result && typeof row.id === "string" && row.id.length <= 160 && typeof row.completedAt === "string" && Number.isFinite(Date.parse(row.completedAt))) archive.results.push({id: row.id, completedAt: row.completedAt, result});
    }
    return archive;
  } catch {return defaults();}
}
export function writeArchive(storage: Pick<Storage, "setItem"> | null, archive: FootballArchive): boolean {
  try {if(!storage)return false;storage.setItem(FOOTBALL_STORAGE_KEY, JSON.stringify({...archive, results: archive.results.slice(-20)}));return true;} catch {return false;}
}
