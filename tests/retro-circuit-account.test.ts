import {test} from "node:test";
import assert from "node:assert/strict";
import {signInLocal} from "../src/features/auth/state/auth-session";

test("Retro Circuit records follow the existing local account switch",()=>{
 const records=new Map<string,string>(),oldWindow=Object.getOwnPropertyDescriptor(globalThis,"window"),oldStorageEvent=Object.getOwnPropertyDescriptor(globalThis,"StorageEvent");
 const localStorage={getItem:(key:string)=>records.get(key)??null,setItem:(key:string,value:string)=>records.set(key,value),removeItem:(key:string)=>records.delete(key)};
 Object.defineProperty(globalThis,"window",{configurable:true,value:{localStorage,dispatchEvent:()=>true}});
 Object.defineProperty(globalThis,"StorageEvent",{configurable:true,value:class{constructor(readonly type:string,readonly init:unknown){}}});
 try{
  signInLocal("driver-a@example.test");localStorage.setItem("statoz.games.web.retro-circuit:v1",'{"schemaVersion":1,"results":["A"]}');
  signInLocal("driver-b@example.test");assert.equal(localStorage.getItem("statoz.games.web.retro-circuit:v1"),null);localStorage.setItem("statoz.games.web.retro-circuit:v1",'{"schemaVersion":2,"future":"B"}');
  signInLocal("driver-a@example.test");assert.equal(localStorage.getItem("statoz.games.web.retro-circuit:v1"),'{"schemaVersion":1,"results":["A"]}');
  signInLocal("driver-b@example.test");assert.equal(localStorage.getItem("statoz.games.web.retro-circuit:v1"),'{"schemaVersion":2,"future":"B"}');
 }finally{if(oldWindow)Object.defineProperty(globalThis,"window",oldWindow);else Reflect.deleteProperty(globalThis,"window");if(oldStorageEvent)Object.defineProperty(globalThis,"StorageEvent",oldStorageEvent);else Reflect.deleteProperty(globalThis,"StorageEvent");}
});
