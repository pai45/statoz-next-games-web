export const HOOPS_PROTOCOL=1;
export const HOOPS_ID="retro-hoops";
export type HostCommand={protocolVersion:1;gameId:typeof HOOPS_ID;sessionId:string;type:"launch"|"pause"|"resume"|"dispose";payload:unknown};
export function readHostCommand(value:unknown,sessionId:string):HostCommand|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const v=value as Record<string,unknown>;
  if(v.protocolVersion!==HOOPS_PROTOCOL||v.gameId!==HOOPS_ID||v.sessionId!==sessionId||!['launch','pause','resume','dispose'].includes(String(v.type)))return null;
  if(v.type==='launch'){
    const settings=v.payload as Record<string,unknown>|null;
    if(!settings||typeof settings!=='object'||typeof settings.sfx!=='boolean'||typeof settings.music!=='boolean')return null;
    for(const key of ['sfxVolume','musicVolume'])if(settings[key]!==undefined&&(typeof settings[key]!=='number'||!Number.isFinite(settings[key])||Number(settings[key])<0||Number(settings[key])>1))return null;
    return{protocolVersion:1,gameId:HOOPS_ID,sessionId,type:'launch',payload:{sfx:settings.sfx,music:settings.music,sfxVolume:settings.sfxVolume??.7,musicVolume:settings.musicVolume??.4}};
  }
  return{protocolVersion:1,gameId:HOOPS_ID,sessionId,type:v.type as HostCommand['type'],payload:{}};
}
