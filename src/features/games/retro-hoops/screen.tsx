"use client";
import {useRouter} from "next/navigation";
import {publicAsset} from "@/shared/config";
import {StreetHoopGame as HoopsGame} from "./street-hoop-game";
/** Auth and deck gating remain owned by the existing StatOz launcher. */
export function RetroHoops(){const router=useRouter();return <HoopsGame assetBase={publicAsset("/games/retro-hoops/assets")} onExit={()=>router.push("/games/basketball")}/>;}
