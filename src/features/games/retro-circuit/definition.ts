import {BUILD_VERSION,RULES_VERSION} from "./types";
/** The artwork is embedded from the same authored source as this pinned registered pack. */
export const retroCircuitDefinition={
  gameId:"retro-circuit",sportId:"motorsport",runtimeApiVersion:1,
  gameVersion:BUILD_VERSION,rulesVersion:RULES_VERSION,saveVersion:1,
  orientation:"landscape",inputs:["keyboard","multitouch"],
  assetPack:{id:"retro-circuit-demo-v2",version:"0.4.0",delivery:"embedded-original-scenery-and-reference-cars",approval:"reference"},
} as const;
