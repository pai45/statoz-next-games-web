import {test} from "node:test";
import assert from "node:assert/strict";
import {readEnvelope, readResult, readSettings} from "../src/features/games/retro-football/protocol";
import {readArchive, writeArchive, FOOTBALL_STORAGE_KEY} from "../src/features/games/retro-football/persistence";
import {signInLocal} from "../src/features/auth/state/auth-session";
const result = {schemaVersion:2,gameId:"retro-football",mode:"exhibition",outcome:"win",score:[2,1],halves:2,activeSeconds:180,passes:[12,9],shots:[4,3],saves:[2,1],airContacts:[1,0],airCollections:[1,0],rulesVersion:"exhibition-complete-v1",runtimeVersion:"0.5.0",assetVersion:"football-complete-atlas-v1"};
test("Host rejects another game, session, protocol or malformed settings",()=>{
  const envelope={protocolVersion:1,gameId:"retro-football",sessionId:"A",type:"result",payload:result};
  assert.ok(readEnvelope(envelope,"A"));assert.equal(readEnvelope(envelope,"B"),null);
  assert.equal(readEnvelope({...envelope,protocolVersion:2},"A"),null);assert.equal(readEnvelope({...envelope,gameId:"retro-circuit"},"A"),null);
  for(const value of [null,[],{music:NaN,sfx:.5},{music:.5,sfx:2},{music:"0",sfx:0}])assert.equal(readSettings(value),null);
});
test("Result validates outcome, bounds and pinned independent versions; strips rewards",()=>{
  assert.deepEqual(readResult({...result,coins:1000,xp:500}),result);
  for(const patch of [{score:[-1,1]},{score:[2,1.5]},{score:[2001,1]},{outcome:"loss"},{mode:"tournament"},{runtimeVersion:"future"},{passes:[1]},{activeSeconds:0}])assert.equal(readResult({...result,...patch}),null);
});
test("Archive tolerates unavailable/corrupt storage and bounds results to twenty",()=>{
  const records=new Map<string,string>(),storage={getItem:(k:string)=>records.get(k)??null,setItem:(k:string,v:string)=>records.set(k,v)};
  assert.equal(readArchive(null).results.length,0);assert.equal(writeArchive(null,readArchive(null)),false);
  records.set(FOOTBALL_STORAGE_KEY,"malformed");assert.equal(readArchive(storage).results.length,0);
  const valid=readResult(result)!;
  const archive={version:1 as const,settings:{music:0,sfx:.5},results:Array.from({length:30},(_,i)=>({id:String(i),completedAt:"2026-10-20T00:00:00Z",result:valid}))};
  assert.equal(writeArchive(storage,archive),true);const loaded=readArchive(storage);assert.equal(loaded.results.length,20);assert.equal(loaded.results[0].id,"10");assert.equal(loaded.settings.music,0);
});
test("Football records follow local accounts without changing other game data",()=>{
  const records=new Map<string,string>(),oldWindow=Object.getOwnPropertyDescriptor(globalThis,"window"),oldEvent=Object.getOwnPropertyDescriptor(globalThis,"StorageEvent");
  const localStorage={getItem:(k:string)=>records.get(k)??null,setItem:(k:string,v:string)=>records.set(k,v),removeItem:(k:string)=>records.delete(k)};
  Object.defineProperty(globalThis,"window",{configurable:true,value:{localStorage,dispatchEvent:()=>true}});
  Object.defineProperty(globalThis,"StorageEvent",{configurable:true,value:class{}});
  try{
    signInLocal("football-a@example.test");localStorage.setItem(FOOTBALL_STORAGE_KEY,"A");localStorage.setItem("statoz.games.web.retro-circuit:v1","CIRCUIT A");
    signInLocal("football-b@example.test");assert.equal(localStorage.getItem(FOOTBALL_STORAGE_KEY),null);localStorage.setItem(FOOTBALL_STORAGE_KEY,"B");
    signInLocal("football-a@example.test");assert.equal(localStorage.getItem(FOOTBALL_STORAGE_KEY),"A");assert.equal(localStorage.getItem("statoz.games.web.retro-circuit:v1"),"CIRCUIT A");
    signInLocal("football-b@example.test");assert.equal(localStorage.getItem(FOOTBALL_STORAGE_KEY),"B");
  }finally{if(oldWindow)Object.defineProperty(globalThis,"window",oldWindow);else Reflect.deleteProperty(globalThis,"window");if(oldEvent)Object.defineProperty(globalThis,"StorageEvent",oldEvent);else Reflect.deleteProperty(globalThis,"StorageEvent");}
});
