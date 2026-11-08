export type RetroPresentation = { schemaVersion: 1; layout: "onscreen" | "handheld"; fullscreen: boolean };
export const defaultPresentation = (): RetroPresentation => ({schemaVersion: 1, layout: "onscreen", fullscreen: true});
export function readPresentation(value: unknown): RetroPresentation | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 1 && (v.layout === "onscreen" || v.layout === "handheld") && typeof v.fullscreen === "boolean"
    ? {schemaVersion: 1, layout: v.layout, fullscreen: v.fullscreen} : null;
}
export const presentationKey = (account: string | null | undefined) => "statoz.next.games-web.retro.presentation." + encodeURIComponent(account || "guest");
