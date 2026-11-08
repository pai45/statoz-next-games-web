/** Original StatOz tuning. No recovered native keeper classifier/timing claim. */
export const KEEPER = { maxCatchSpeed:29, maxVerticalSpeed:140, minimumHeight:6, maximumHeight:45, gripRadius:8, dropAge:80, puntAge:88, puntEnd:98, endAge:138, carrySpeed:1.8, gravity:280 } as const;
export function keeperPose(age:number){
 return age<10?'standing-secure':age<46?'standing-tuck':age<58?'carry':age<70?'standing-tuck':age<80?'release-prep':age<88?'drop':age<98?'punt':age<110?'follow-through':age<120?'settle':'ready';
}
