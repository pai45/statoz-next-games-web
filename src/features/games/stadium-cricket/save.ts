export type CricketSave={schemaVersion:1;stores:Record<string,string>;resultIds:string[]};
export const emptyCricketSave=():CricketSave=>({schemaVersion:1,stores:{},resultIds:[]});
export function cricketSaveKey(account:string){return 'statoz.next.games-web.bundle.stadium-cricket.'+encodeURIComponent(account.trim().toLowerCase());}
export function isCricketSave(value:unknown):value is CricketSave{
 if(!value||typeof value!=='object')return false;
 const save=value as Partial<CricketSave>;
 return save.schemaVersion===1&&!!save.stores&&typeof save.stores==='object'&&!Array.isArray(save.stores)&&
  Object.entries(save.stores).every(([key,item])=>(key==='cm-match'||key==='cm-quality'||key==='cm-options'||/^cm-best-(rookie|club|pro|legend)-(2|5|10|20)-\d{1,3}$/.test(key))&&typeof item==='string')&&
  Array.isArray(save.resultIds)&&save.resultIds.length===0&&JSON.stringify(value).length<600000;
}
export function cricketMessage(value:unknown,sessionId:string):value is {type:'ready'|'save'|'error'|'reload'|'exit';payload?:unknown}{
 if(!value||typeof value!=='object')return false;
 const data=value as Record<string,unknown>;
 return data.protocolVersion===1&&data.gameId==='stadium-cricket'&&data.sessionId===sessionId&&['ready','save','error','reload','exit'].includes(String(data.type));
}
