/** Observed dark first lap / brighter later laps. Lap-boundary switch is inferred,
 * not a recovered native time-of-day algorithm. Pure presentation; no physics. */
const dark={daylight:false,sky:'#160704',ground:'#000000',verge:'#040400',road:['#000000','#040604']as const};
const bright={daylight:true,sky:'#c95e12',ground:'#004900',verge:'#006c00',road:['#354947','#40514b']as const};
export const hiroshimaPalette=(distance:number,length:number)=>distance>=length?bright:dark;
