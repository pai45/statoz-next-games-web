import type {Player,ShotView} from './contracts';
export const GOAL_VIEW={centreX:125,lateralScale:13.4,keeperY:110,separation:105,basePlane:96} as const;
/** Authored sequence phases tied to simulation age/release, not independent wall time. */
export function foregroundPose(view:ShotView,shooter:Player):string|null{
    if(view.phase==='aim')return view.age<30?null:view.age<66?(Math.floor((view.age-30)/6)%2?'entry-alt':'entry'):'ready';
    const age=shooter.action?.kind==='shot'?shooter.action.age:99;
    return age<4?'ready':age<8?'windup':age<12?'plant':age<16?'contact':age<26?'follow':'recover';
}
