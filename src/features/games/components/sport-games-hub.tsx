"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { GameSport } from "@/domain/game-sports";
import { GameSportTabs } from "./game-sport-tabs";

export function SportGamesHub({sport,children}:{sport:GameSport;children:ReactNode}) {
  const router=useRouter();
  return <div className="flex min-h-0 flex-1 flex-col">
    <GameSportTabs selected={sport} onSelect={next=>router.push(next?`/?sport=${next}`:"/")}/>
    <div role="tabpanel" aria-label={`${sport} games`} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">{children}</div>
    </div>
  </div>;
}
