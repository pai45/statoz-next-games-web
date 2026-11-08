/** FBNeo's RetroPad mapping: Neo Geo A = B(0), Neo Geo B = A(8). */
export const ARCADE = { shoot: 0, pass: 8, short: 1, coin: 2, start: 3, up: 4, down: 5, left: 6, right: 7 } as const;
type Button = typeof ARCADE[keyof typeof ARCADE];
const keys: Record<string, Button> = { ArrowUp: 4, KeyW: 4, ArrowDown: 5, KeyS: 5, ArrowLeft: 6, KeyA: 6, ArrowRight: 7, KeyD: 7, KeyJ: 0, KeyZ: 0, KeyK: 8, KeyX: 8, KeyL: 1, KeyC: 1, ShiftRight: 2, Digit5: 2, Enter: 3 };

/** Pointer/key ownership is aggregated; releasing one finger cannot release another. */
export class FootballArcadeInput {
  private sources = new Map<string, Set<Button>>();
  private active = new Set<Button>();
  private pressedAt = new Map<Button, number>();
  private releases = new Map<Button, ReturnType<typeof setTimeout>>();
  constructor(private readonly send: (button: number, value: 0 | 1) => void, private readonly now = () => performance.now()) {}
  private update(immediate = false) {
    const next = new Set([...this.sources.values()].flatMap(values => [...values]));
    for (const button of next) {
      const timer = this.releases.get(button);
      if (timer) { clearTimeout(timer); this.releases.delete(button); }
      if (!this.active.has(button)) { this.active.add(button); this.pressedAt.set(button, this.now()); this.send(button, 1); }
    }
    for (const button of [...this.active]) {
      if (next.has(button)) continue;
      if (this.releases.has(button)) {
        if (!immediate) continue;
        clearTimeout(this.releases.get(button)); this.releases.delete(button);
      }
      // A very quick touchscreen tap must still span an emulation poll. Direction changes are immediate.
      const delay = !immediate && [0, 8, 1, 2, 3].includes(button) ? Math.max(0, 50 - (this.now() - (this.pressedAt.get(button) ?? 0))) : 0;
      const release = () => { this.releases.delete(button); this.active.delete(button); this.pressedAt.delete(button); this.send(button, 0); };
      if (delay) this.releases.set(button, setTimeout(release, delay)); else release();
    }
  }
  down(id: string, button: Button) { this.sources.set(id, new Set([button])); this.update(); }
  up(id: string, immediate = false) { this.sources.delete(id); this.update(immediate); }
  stick(id: string, x: number, y: number) {
    const old = this.sources.has(id), deadZone = old ? 0.16 : 0.23;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < deadZone) { this.up(id); return; }
    const angle = Math.round(Math.atan2(y, x) / (Math.PI / 4)) * Math.PI / 4;
    const dx = Math.cos(angle), dy = Math.sin(angle), buttons = new Set<Button>();
    if (dx > 0.5) buttons.add(7); if (dx < -0.5) buttons.add(6);
    if (dy > 0.5) buttons.add(5); if (dy < -0.5) buttons.add(4);
    this.sources.set(id, buttons); this.update();
  }
  key(code: string, down: boolean) {
    const button = keys[code]; if (button === undefined) return false;
    if (down) this.down(`key:${code}`, button); else this.up(`key:${code}`);
    return true;
  }
  clear() {
    for (const timer of this.releases.values()) clearTimeout(timer);
    this.releases.clear(); this.sources.clear(); this.pressedAt.clear();
    for (const button of this.active) this.send(button, 0);
    this.active.clear();
  }
}
