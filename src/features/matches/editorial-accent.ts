import type {SportMatch} from '@/domain/matches';
import {matchDiscovery} from '@statoz/design-system/games/tokens/match-discovery.generated';
/** Lifecycle wins over following. Never infer a cricket/race winner from raw runs. */
export function finishedWinnerColor(match:SportMatch):string|undefined {
  if(match.status!=='finished')return undefined;
  const result=(match.resultLine??'').toLowerCase();
  const leader=result.split(/\b(?:won|wins|winner|beat|defeat(?:ed)?)\b/)[0];
  if(/draw|tie|abandon|no result/.test(result))return undefined;
  for(const team of [match.home,match.away]){
    if([team.name,team.shortName].some(name=>name.length>2&&leader.includes(name.toLowerCase()))&&/won|wins|winner|beat|defeat/.test(result))return team.color;
  }
  if(match.sport!=='football'&&match.sport!=='basketball')return undefined;
  const number=(value:number|string|undefined)=>value!=null&&/^\d+$/.test(String(value))?Number(value):undefined;
  const home=number(match.homeScore),away=number(match.awayScore);
  return home!=null&&away!=null&&home!==away?(home>away?match.home.color:match.away.color):undefined;
}
export function editorialMatchAccent(match:SportMatch,followed:boolean,winnerColor?:string):string {
  if(match.status==='live')return 'var(--ds-color-danger)';
  if(match.status==='finished')return winnerColor??finishedWinnerColor(match)??'var(--ds-color-border-default)';
  return followed?'var(--ds-color-accent-cyan)':'var(--ds-color-border-default)';
}

// Use the same contrast decision as the new Flutter percentage plate.
export function editorialPercentageInk(fill:string):string {
  const hex=fill.replace('#','');if(!/^[0-9a-f]{6}$/i.test(hex))return 'var(--ds-color-text-default)';
  const channel=(value:number)=>value/255<=0.03928?value/255/12.92:((value/255+0.055)/1.055)**2.4;
  const luminance=.2126*channel(parseInt(hex.slice(0,2),16))+.7152*channel(parseInt(hex.slice(2,4),16))+.0722*channel(parseInt(hex.slice(4,6),16));
  return luminance>matchDiscovery.appearance.percentageInkThreshold?'var(--ds-color-text-inverse)':'var(--ds-color-text-default)';
}
