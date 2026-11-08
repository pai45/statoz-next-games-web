/** Public evidence does not establish native input timing or hidden AI. */
export const BUILD_VERSION="character-v28-local";
export const ASSET_VERSION="28.0.0";
export const REFERENCE_PROFILE={version:2,steamApp:1189520,revisionVerified:false,
  footage:"https://www.youtube.com/watch?v=_k8IIS9n3dk",
  settingsSheet:"https://www.arcade-museum.com/manuals-videogames/S/Street-Slam--Street-Hoop-Soft-DIP-Settings.pdf",
  defaults:{gameSeconds:120,periods:2 as 1|2,possessionLimitSeconds:null as number|null,opening:true},
  evidence:{gameSeconds:"documented setting; observed opening",periods:"two halves observed at ~143s and ~270s; 2:00 second-half reset at ~158s",clockRate:"authored 2x countdown fit; recording countdown accelerates, exact native rate unresolved",possessionLimit:"no separate counter observed; prior 24-second NBA adaptation removed",ai:"authored behavioural reconstruction"}
} as const;
export type MatchOptions={gameSeconds?:number;periods?:1|2;possessionLimitSeconds?:number|null;opening?:boolean};
export function matchOptions(options:MatchOptions={}){return{gameSeconds:Math.max(60,Math.min(240,Math.round((Number.isFinite(options.gameSeconds)?options.gameSeconds!:120)/15)*15)),periods:options.periods===1?1:2,possessionLimitSeconds:typeof options.possessionLimitSeconds==="number"&&Number.isFinite(options.possessionLimitSeconds)&&options.possessionLimitSeconds>0?Math.max(1,Math.min(60,options.possessionLimitSeconds)):null,opening:options.opening??false};}
