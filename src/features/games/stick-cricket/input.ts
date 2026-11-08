export type Direction = "left" | "right";
/** Aggregate keyboard/pointer owners; short taps survive one native input poll. */
export class CricketInput {
  private owners = new Map<string, Direction>();
  private since = new Map<Direction, number>();
  private timers = new Map<Direction, ReturnType<typeof setTimeout>>();
  constructor(private emit: (direction: Direction, value: 0 | 1) => void) {}
  down(source: string, direction: Direction) {
    if (this.owners.has(source)) return;
    const pending=this.timers.get(direction); if(pending) { clearTimeout(pending);this.timers.delete(direction); }
    const already=[...this.owners.values()].includes(direction) || this.since.has(direction);
    this.owners.set(source,direction);
    if(!already) { this.since.set(direction,performance.now());this.emit(direction,1); }
  }
  up(source: string, cancel=false) {
    const direction=this.owners.get(source);if(!direction)return;this.owners.delete(source);
    if([...this.owners.values()].includes(direction))return;
    const finish=()=>{this.timers.delete(direction);this.since.delete(direction);this.emit(direction,0);};
    const delay=cancel?0:Math.max(0,50-(performance.now()-(this.since.get(direction)??0)));
    if(delay)this.timers.set(direction,setTimeout(finish,delay));else finish();
  }
  key(code: string, pressed: boolean) {const direction=({ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right"} as Record<string,Direction>)[code];if(!direction)return false;if(pressed)this.down(`key:${code}`,direction);else this.up(`key:${code}`);return true;}
  clear() {for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();this.owners.clear();for(const direction of this.since.keys())this.emit(direction,0);this.since.clear();}
}
