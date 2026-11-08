import type { Input } from "./simulation";
export type Control = "left"|"right"|"up"|"down"|"shoot"|"pass";
const controls:Record<string,Control>={ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",KeyJ:"shoot",KeyK:"pass"};
/** Physical keys and pointers stay held across action gates. Each device has its own identity. */
export class HoopsInput {
  private held=new Map<string,Control>();private edges=new Set<Control>();private sticks=new Map<string,{x:number;y:number}>();
  down(id:string,control:Control){if(!this.held.has(id)){this.held.set(id,control);this.edges.add(control);}}
  replace(id:string,control:Control){if(this.held.get(id)!==control){this.up(id);this.down(id,control);}}
  stick(id:string,x:number,y:number){if(!Number.isFinite(x)||!Number.isFinite(y)){this.sticks.delete(id);return;}const length=Math.max(1,Math.hypot(x,y));this.sticks.set(id,{x:x/length,y:y/length});}
  up(id:string){this.held.delete(id);this.sticks.delete(id);}
  clear(){this.held.clear();this.edges.clear();this.sticks.clear();}
  key(code:string,down:boolean){const c=controls[code];if(!c)return false;if(down)this.down(code,c);else this.up(code);return true;}
  read():Input{const active=new Set(this.held.values()),value={x:Number(active.has("right"))-Number(active.has("left")),y:Number(active.has("down"))-Number(active.has("up")),shoot:this.edges.has("shoot"),pass:this.edges.has("pass")};for(const stick of this.sticks.values()){value.x+=stick.x;value.y+=stick.y;}value.x=Math.max(-1,Math.min(1,value.x));value.y=Math.max(-1,Math.min(1,value.y));this.edges.clear();return value;}
}
