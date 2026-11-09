'use client';
import {createContext,useCallback,useContext,useMemo,useState,type MouseEvent,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {loadGameArtifact} from '@/features/games/shared/components/artifact-host.mjs';
type Launch={game:string,state:'checking'|'installed'|'error',error?:string};
const Context=createContext<{launch:Launch|null,play:(game:string,title:string,href:string)=>void}|null>(null);
export function DeviceAssets({children}:{children:ReactNode}){const router=useRouter(),[launch,setLaunch]=useState<Launch|null>(null);const play=useCallback((game:string,_title:string,href:string)=>{setLaunch({game,state:'checking'});void loadGameArtifact(game,process.env.NEXT_PUBLIC_GAME_CATALOGUE_URL||'https://pai45.github.io/statoz-next-games-web/game-library/catalogue.json').then(()=>{setLaunch({game,state:'installed'});router.push(href);}).catch(e=>setLaunch({game,state:'error',error:e.message}));},[router]);const value=useMemo(()=>({launch,play}),[launch,play]);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useGamePlayState(game:string){const launch=useContext(Context)?.launch,match=launch?.game===game?launch:null;return {pending:match?.state==='checking',label:match?.state==='error'?'Retry release':match?.state==='checking'?'Checking game release…':'Play',error:match?.error,state:match?.state};}
export function GamePlayFeedback({game}:{game:string}){const {error}=useGamePlayState(game);return error?<span role="alert" data-game-download-error={game}>{error}</span>:null;}
export function useGamePlay(){const client=useContext(Context),router=useRouter();return useCallback((game:string,title:string,href:string)=>{window.dispatchEvent(new Event('statoz:home-launch'));if(client)client.play(game,title,href);else router.push(href);},[client,router]);}
export function useGamePlayAction(game:string,title:string,href:string){const play=useGamePlay();return useCallback((event:MouseEvent<HTMLAnchorElement|HTMLButtonElement>)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();play(game,title,href);},[play,game,title,href]);}
export function GameAssetGate({children}:{game:string,title:string,children:ReactNode,launchHref?:string,onCancel?:()=>void}){return children;}
