/** Bounded live-frame sample; the caller must identify hardware and renderer. */
export function frameTiming(values:readonly number[]){const ordered=[...values].filter(n=>Number.isFinite(n)&&n>=0).sort((a,b)=>a-b);const q=(p:number)=>ordered.length?ordered[Math.min(ordered.length-1,Math.ceil(ordered.length*p)-1)]:null;return{sampleCount:ordered.length,medianMs:q(.5),p95Ms:q(.95),p99Ms:q(.99)};}
