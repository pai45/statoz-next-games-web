/** Presentation calibration from retained footage; not native engine recovery.
 * V14 shows a 252-high window of the 360-high world (about 1.43x closer), so athletes
 * fill roughly the same share of the screen as the reference recording. */
export const VIEW={width:900,height:360,window:252,centerX:450,farY:164,nearY:330,farScale:.84,nearScale:1.10} as const;
export function depthScale(y:number){const t=Math.max(0,Math.min(1,(y-VIEW.farY)/(VIEW.nearY-VIEW.farY)));return VIEW.farScale+(VIEW.nearScale-VIEW.farScale)*t;}
export function courtPoint(x:number,y:number,z=0){const scale=depthScale(y);return {x:VIEW.centerX+(x-VIEW.centerX)*scale,y:y-z*scale,scale};}
export function cameraOrigin(s:{camera:number;ball:{y:number}},width:number){return Math.round(Math.max(0,Math.min(VIEW.width-width,courtPoint(s.camera+240,s.ball.y).x-width/2)));}
/** Vertical follow: the window slides with the ball's court depth and always keeps
 * part of the fence/crowd band in view, as the reference camera does. */
export const CAMERA_TOP={min:40,max:VIEW.height-VIEW.window} as const;
export function cameraTop(s:{ball:{y:number}}){const t=Math.max(0,Math.min(1,(s.ball.y-VIEW.farY)/(VIEW.nearY-VIEW.farY)));return Math.round(CAMERA_TOP.min+(CAMERA_TOP.max-CAMERA_TOP.min)*t);}

/** Original basket pack: rim ellipse centre measured in its authored atlas tile. */
export const BASKET_ART={left:{width:47,height:75,rimX:31,rimY:35},right:{width:92,height:75,rimX:13,rimY:35}} as const;
