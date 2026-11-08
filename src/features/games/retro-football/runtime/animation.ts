import type {Facing,Player,AssetManifest,View} from './contracts';
/** Preserve a readable facing near diagonals instead of changing family every update. */
export function movementFacing(previous:Facing,dx:number,dy:number):Facing{
    const ax=Math.abs(dx),ay=Math.abs(dy),horizontal=previous==='E'||previous==='W';
    if(ax<.0001&&ay<.0001)return previous;
    if(horizontal&&ay<=ax*1.2)return dx>=0?'E':'W';
    if(!horizontal&&ax<=ay*1.2)return dy>=0?'S':'N';
    return ax>=ay?dx>=0?'E':'W':dy>=0?'S':'N';
}
export function movementView(p:Player,manifest:AssetManifest):View{
    const cycle=manifest.movement.cycles[p.facing];
    // .72 world units/pose gives the previous six-update hold at full running speed.
    // Shortened steps near a destination slow the gait instead of causing skating.
    const v=p.moving?cycle[Math.floor(((p.strideDistance??0)+1e-8)/.72)%cycle.length]:manifest.movement.idle[p.facing];
    return {pose:v.id,mirror:v.mirror};
}
