"use client";
import {useSyncExternalStore} from 'react';
import {matchDiscovery} from '@statoz/design-system/games/tokens/match-discovery.generated';

// One browser subscription for the entire feed, released when its last card leaves.
const listeners=new Set<()=>void>();
let stop:(()=>void)|undefined;
function subscribe(notify:()=>void){
 listeners.add(notify);
 if(!stop){
  let frame=0;
  const emit=()=>listeners.forEach(listener=>listener());
  const changed=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{emit();frame=requestAnimationFrame(emit);});};
  const observer=new MutationObserver(changed);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});
  observer.observe(document.head,{childList:true,subtree:true});
  const sizing=new ResizeObserver(changed);sizing.observe(document.body);sizing.observe(document.documentElement);
  window.addEventListener('resize',changed);
  stop=()=>{observer.disconnect();sizing.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',changed);};
 }
 return()=>{listeners.delete(notify);if(!listeners.size){stop?.();stop=undefined;}};
}
function snapshot(){return window.innerWidth<matchDiscovery.layout.collapseWidth||parseFloat(getComputedStyle(document.documentElement).fontSize)+.01>=16*matchDiscovery.layout.collapseTextScale;}
export function useEditorialSingleColumn(){return useSyncExternalStore(subscribe,snapshot,()=>false);}
