"use client";

import {useEffect, useRef, useState} from 'react';
import {useGameReturn} from '../hooks/use-game-return';
import Link from 'next/link';
import {Button} from '@statoz/design-system/games';
import {publicAsset} from '@/shared/config';
import {useAuthSession} from '@/features/auth';
import {guideFor} from '@/features/how-to-play';
import type {GameLauncherProps} from '../../components/game-launcher';
import {defaultPresentation, presentationKey, readPresentation} from '../retro/presentation';
import styles from './bundled-game.module.css';
import {loadGameArtifact,frameDocument} from './artifact-host.mjs';
type BootstrapWindow = Window & {__STATOZ_BUNDLE_BOOT__?: (session:string,child:Window)=>string|null};
/** launch is passed to the bundle as boot data; onExit replaces the default return to Games. */
type BundledGameProps = GameLauncherProps & {launch?: Readonly<Record<string, unknown>>; onExit?: () => void};

export function BundledGame(props: BundledGameProps) {
  const account = useAuthSession().email;
  return <AccountGameBundle key={`${props.game}.${account || 'guest'}`} {...props} account={account}/>;
}

function AccountGameBundle({game, entry, account, launch, onExit}: BundledGameProps & {account: string | null}) {
  const frame = useRef<HTMLIFrameElement>(null), gameReturn = useGameReturn();
  const leave = onExit ?? gameReturn;
  const launchData = useRef(launch);
  const query=useRef("");
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false), [attempt, setAttempt] = useState(0);
  const guide = guideFor(game);

  useEffect(() => {
    let active = true;
    const element = frame.current, sessionId = crypto.randomUUID();
    const hostWindow=window as BootstrapWindow;
    let bootText:string|null=null;
    const provideBoot=(requested:string,child:Window)=>active&&requested===sessionId&&child===element?.contentWindow?bootText:null;
    hostWindow.__STATOZ_BUNDLE_BOOT__=provideBoot;
    const key = 'statoz.next.games-web.bundle.' + game + '.' + encodeURIComponent(account || 'guest');
    const displayKey = presentationKey(account);
    let save = {schemaVersion: 1, stores: {}, resultIds: []}, invalidSave = false;
    let presentation = defaultPresentation();
    let raw: string | null = null;
    try { raw = localStorage.getItem(key); } catch { /* Storage denial still permits temporary play. */ }
    try {
      const old = JSON.parse(raw || 'null');
      if (old?.schemaVersion === 1) save = old;
      else if (old !== null) invalidSave = true;
    } catch { invalidSave = true; }
    try { presentation = readPresentation(JSON.parse(localStorage.getItem(displayKey) || 'null')) ?? defaultPresentation(); } catch {}
    const receive = (event: MessageEvent) => {
      const value = event.data;
      if (!active || event.source !== element?.contentWindow || event.origin !== 'null' || value?.protocolVersion !== 1 || value.gameId !== game || value.sessionId !== sessionId) return;
      if (value.type === 'restart' && typeof value.payload?.search === 'string' && value.payload.search.length < 1024){query.current=value.payload.search;setAttempt(n=>n+1);}
      if (value.type === 'ready') setReady(true);
      if (value.type === 'exit') leave();
      if (value.type === 'presentation') {
        const next = readPresentation(value.payload);
        if (next) { if(bootText)bootText=JSON.stringify({...JSON.parse(bootText),presentation:next});try { localStorage.setItem(displayKey, JSON.stringify(next)); } catch { setNotice('Display preferences could not be saved on this device.'); } }
      }
      if (value.type === 'save' && value.payload?.schemaVersion === 1 && JSON.stringify(value.payload).length < 600000) {
        save=value.payload;
        if(bootText)bootText=JSON.stringify({...JSON.parse(bootText),stores:save.stores,resultIds:save.resultIds});
        try { localStorage.setItem(key, JSON.stringify(value.payload)); } catch { setNotice('Progress could not be saved on this device.'); }
      }
      if (value.type === 'error') setError('The game could not continue. Try loading it again.');
    };
    window.addEventListener('message', receive);
    const abort = new AbortController();
    void loadGameArtifact(game, process.env.NEXT_PUBLIC_GAME_CATALOGUE_URL || 'https://pai45.github.io/statoz-next-games-web/game-library/catalogue.json', abort.signal).then(async ({html,entry:artifact,root:artifactRoot,entryRoot}: {html:string,entry:{saveSchema:number},root:string,entryRoot:string}) => {
      if(invalidSave || artifact.saveSchema !== 1){if(active)setError('Saved progress needs a compatible game version. It has been preserved.');return;}
      const boot={...save,presentation,sessionId,origin:location.origin,query:query.current,entryRoot,assetRoot:artifactRoot+'games/'+game+'/',artifactRoot,...(launchData.current?{launch:launchData.current}:{})};
      bootText=JSON.stringify(boot);if(active&&element){element.srcdoc=frameDocument(html,boot);}
    }).catch(e=>{if(active&&e.name!=='AbortError')setError(e.message);});
    const background = () => { if (document.hidden) element?.contentWindow?.postMessage({protocolVersion: 1, gameId: game, sessionId, type: 'pause'}, "*"); };
    document.addEventListener('visibilitychange', background);
    return () => {
      active = false; abort.abort();
      element?.contentWindow?.postMessage({protocolVersion: 1, gameId: game, sessionId, type: 'dispose'}, "*");
      window.removeEventListener('message', receive);
      document.removeEventListener('visibilitychange', background);
      if(hostWindow.__STATOZ_BUNDLE_BOOT__===provideBoot)delete hostWindow.__STATOZ_BUNDLE_BOOT__;
      if (element) element.srcdoc = '';
    };
  }, [game, account, leave, attempt]);

  const retry = () => { setError(''); setReady(false); setAttempt(value => value + 1); };
  return <section className={styles.root} data-bundled-game={game}>
    <iframe ref={frame} title={entry.title} className={styles.frame} sandbox="allow-scripts allow-pointer-lock" allow="autoplay; fullscreen; gamepad" allowFullScreen onLoad={() => setReady(true)}/>
    {(!ready || error) && <div className={styles.overlay} role={error ? 'alert' : 'status'}>
      <h1>{entry.title}</h1><p>{error || 'Opening your game…'}</p>
      <div className={styles.actions}>
        {error && <Button onClick={retry}>Try again</Button>}
        <Button variant="surface" onClick={leave}>Back to Games</Button>
        {guide && <Link href={`/how-to-play/${guide.id}`}>How to play</Link>}
      </div>
    </div>}
    {notice && <div className={styles.notice} role="status">{notice}<Button variant="surface" onClick={() => setNotice('')}>Dismiss</Button></div>}
  </section>;
}
