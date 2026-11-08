import {matchDiscovery} from '@statoz/design-system/games/tokens/match-discovery.generated';
export function editorialStatus(status: string | undefined): string {
  return matchDiscovery.status[status as keyof typeof matchDiscovery.status] ?? "";
}
export function kickoffLabel(iso: string, now: number): string {
  const date=new Date(iso); if (!Number.isFinite(date.getTime())) return "";
  const today=date.toDateString()===new Date(now).toDateString();
  return `Starts ${today ? "today" : date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})} · ${date.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false})}`;
}
export function deadlineLabel(iso: string | undefined, status: string | undefined, now: number): string {
  if (!iso || (status!=="upcoming" && status!=="live")) return "";
  const remaining=new Date(iso).getTime()-now;
  if (!Number.isFinite(remaining) || remaining<=0) return "";
  const minutes=Math.ceil(remaining/60000);
  return `Closes in ${minutes<60 ? `${minutes}m` : minutes<1440 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${Math.ceil(minutes/1440)}d`}`;
}

/** Hydration supplies the browser zone; invalid fixture times remain unavailable. */
export function kickoffClock(iso:string,timeZone='UTC'):string {
  const date=new Date(iso);if(!Number.isFinite(date.getTime()))return '';
  return date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone});
}
