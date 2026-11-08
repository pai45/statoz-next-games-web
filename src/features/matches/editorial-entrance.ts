"use client";
import {useCallback} from 'react';
import {matchDiscovery} from '@statoz/design-system/games/tokens/match-discovery.generated';
const seen=new Set<string>();
/** One reveal per stable card identity. SSR and unavailable observer APIs stay visible. */
export function useEditorialEntrance(identity:string){
 return useCallback((node:HTMLElement|null)=>{
  if(!node||seen.has(identity)||typeof IntersectionObserver==='undefined')return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(media.matches){seen.add(identity);return;}
  const motion=matchDiscovery.appearance,chrome=node.querySelector<HTMLElement>('[data-reveal-rail]');
  let animation:Animation|undefined,rail:Animation|undefined,timer:ReturnType<typeof setTimeout>|undefined,visible=false,done=false;
  node.style.opacity='0';node.style.transform='translate3d(0,'+motion.entranceDistance+'px,0)';
  const finish=()=>{if(done)return;done=true;seen.add(identity);if(timer)clearTimeout(timer);animation?.cancel();rail?.cancel();node.style.removeProperty('opacity');node.style.removeProperty('transform');observer.disconnect();};
  const start=()=>{if(done||!visible||document.hidden)return;if(animation){animation.play();rail?.play();return;}if(timer)return;
   const band=Math.min(3,Math.max(0,Math.floor(node.getBoundingClientRect().top/Math.max(innerHeight/3,1))));
   timer=setTimeout(()=>{timer=undefined;if(done||!visible||document.hidden)return;
    const options={duration:motion.entranceMs,easing:'cubic-bezier(.215,.61,.355,1)',fill:'both' as FillMode};
    animation=node.animate([{opacity:0,transform:'translate3d(0,'+motion.entranceDistance+'px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],options);
    if(chrome)rail=chrome.animate([{transform:'scaleX(.2)'},{transform:'scaleX(1)'}],options);
    animation.finished.then(finish,()=>{});
   },band*motion.entranceStaggerMs);
  };
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=motion.entranceThreshold;if(visible)start();else{if(timer){clearTimeout(timer);timer=undefined;}animation?.pause();rail?.pause();}},{threshold:[0,motion.entranceThreshold]});
  const visibility=()=>{if(document.hidden){animation?.pause();rail?.pause();}else start();};
  const reduced=()=>{if(media.matches)finish();};
  node.addEventListener('focusin',finish);node.addEventListener('pointerdown',finish);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',reduced);observer.observe(node);
  return()=>{if(timer)clearTimeout(timer);animation?.cancel();rail?.cancel();observer.disconnect();node.style.removeProperty('opacity');node.style.removeProperty('transform');node.removeEventListener('focusin',finish);node.removeEventListener('pointerdown',finish);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',reduced);};
 },[identity]);
}
