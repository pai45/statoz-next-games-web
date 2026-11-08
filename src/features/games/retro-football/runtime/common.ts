export type Facing='N'|'S'|'E'|'W';
export type Direction='left'|'right'|'up'|'down';
export interface Point {x:number;y:number}
export interface World extends Point {z:number}
export interface Ball extends World {vx:number;vy:number;vz:number}
export interface View {pose:string;mirror:boolean}
export interface Actor extends Point {id:number;facing:Facing;moving:boolean;motionAge:number;homeX?:number;homeY?:number}
export interface Pose {id:string;width:number;height:number;anchors:Record<string,[number,number]>;atlas:[number,number,number,number]}
export interface AssetManifest {schemaVersion:1;version:string;approval:'reference';productionEligible:false;atlasUrl:string;atlasSha256:string;atlasSize:[number,number];records:Pose[];movement:{cycles:Record<Facing,{id:string;mirror:boolean}[]>;idle:Record<Facing,{id:string;mirror:boolean}>};parents:Record<string,string>}
export interface GameDefinition {id:'retro-football';runtimeVersion:string;rulesVersion:string;assetVersion:string;simulationHz:60}
export interface GameSettings {music:number;sfx:number}
export interface Contact {kind:string;tick:number;pose?:string;player?:number;anchor?:string;point?:Point;worldPoint?:World;worldBall?:World;distance?:number;fraction?:number;mirror?:boolean;segment?:{ballStart:World;ballEnd:World;anchorStart:World;anchorEnd:World;radius:number};handTests?:{anchor:string;fraction:number|null}[];resolvedBall?:Point;[key:string]:unknown}
