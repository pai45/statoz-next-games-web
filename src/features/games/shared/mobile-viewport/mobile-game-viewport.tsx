"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { basePath } from '@/shared/config';
import { homeLaunchEvent } from '../navigation';
import { landscapeGeometry, leavesPlatformFrame, phoneQuery } from './policy';
import styles from './mobile-game-viewport.module.css';

const mobileQuery = '(pointer: coarse) and (max-width: 1366px)';
const navigationMessage = 'statoz:mobile-game-navigation';
/** Sent by the rotated platform shell when a tap opens a page that must take the whole screen. */
const leaveMessage = 'statoz:platform-frame-leave';

type FrameKind = 'game' | 'platform';
const frameAttribute: Record<FrameKind, string> = { game: 'data-mobile-game-frame', platform: 'data-mobile-platform-frame' };
const hostedIn = (kind: FrameKind) => Boolean(window.frameElement?.hasAttribute(frameAttribute[kind]));
const hosted = () => hostedIn('game') || hostedIn('platform');
const normalized = (pathname: string) => pathname.replace(/\/+$/, '') || '/';
const sameApp = (url: URL) => url.origin === location.origin && (!basePath || url.pathname === basePath || url.pathname.startsWith(basePath + '/'));
/** The route inside the app, without the deployment base path. */
const appPath = (url: URL) => url.pathname.slice(basePath.length) || '/';

function watch(query: string) {
  return (listener: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener('change', listener);
    return () => list.removeEventListener('change', listener);
  };
}
const watchMobile = watch(mobileQuery);
const watchPhone = watch(phoneQuery);
const noSubscription = () => () => {};

function gameSurface() {
  if (hosted()) return 'embedded';
  return window.matchMedia(mobileQuery).matches ? 'mobile' : 'desktop';
}

/** A real iframe viewport keeps canvas sizing, media queries and touch coordinates
 * in landscape too. Rotating a React div alone leaves window.innerWidth portrait. */
export function MobileGameViewport({ title, children, allowExternalGame = false, allowNativeFullscreen = false }: { title: string; children: ReactNode; allowExternalGame?: boolean; allowNativeFullscreen?: boolean }) {
  const mode = useSyncExternalStore(watchMobile, gameSurface, () => 'pending');
  if (mode === 'pending') return <div role="status" className="grid min-h-dvh place-content-center">Opening {title}…</div>;
  if (mode !== 'mobile') return children;
  const allow = allowExternalGame ? "autoplay *; gamepad *; fullscreen 'none'" : allowNativeFullscreen ? "autoplay; gamepad; fullscreen" : "autoplay; gamepad; fullscreen 'none'";
  return <LandscapeFrame kind="game" title={`${title} — landscape`} allow={allow} />;
}

function platformSurface() {
  if (hosted()) return 'embedded';
  return window.matchMedia(phoneQuery).matches ? 'phone' : 'other';
}

/**
 * Most platform tabs on a phone are drawn in
 * landscape, inside the same rotated frame the games use. Holding the phone
 * upright turns the frame; holding it sideways leaves it as is. Tablets,
 * desktops and the page inside the frame render the shell directly.
 */
export function PlatformLandscape({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(watchPhone, platformSurface, () => 'pending');
  if (mode === 'phone') return <LandscapeFrame kind="platform" title="StatOz" allow="autoplay; fullscreen 'none'" />;
  // Same element in every other mode, so the shell is not remounted after hydration.
  return <div className={mode === 'pending' ? styles.awaitPhone : styles.ready}>{children}</div>;
}

/** Pages that take over the screen (games, streaks) never run inside the rotated platform frame;
 * the outer page is already opening them. */
export function PlatformFrameGuard({ children }: { children: ReactNode }) {
  const inside = useSyncExternalStore(noSubscription, () => hostedIn('platform'), () => false);
  if (inside) return <div role="status" className="grid min-h-dvh place-content-center">Opening…</div>;
  return children;
}

function LandscapeFrame({ kind, title, allow }: { kind: FrameKind; title: string; allow: string }) {
  const host = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  // This component only renders after hydration. Keep src stable across resize.
  const routePath = usePathname();
  const query = useSearchParams();
  // Client navigation can render this frame before browser history updates.
  const [source] = useState(() => new URL(basePath + routePath + (query.size ? `?${query}` : '') + window.location.hash, window.location.origin).href);
  /** The page inside the frame moved to `href`. */
  const follow = useCallback((href: string) => {
    let url: URL;
    try { url = new URL(href); } catch { return; }
    if (!sameApp(url)) return;
    const path = appPath(url);
    if (kind === 'platform' && !leavesPlatformFrame(path)) {
      // Tab moves stay inside the frame; the address bar follows so a reload reopens the same tab.
      const address = url.pathname + url.search + url.hash;
      if (location.pathname + location.search + location.hash !== address) window.history.replaceState(window.history.state, '', address);
      return;
    }
    if (kind === 'game' && normalized(url.pathname) === normalized(new URL(source).pathname)) return;
    router.replace(path + url.search + url.hash);
  }, [kind, router, source]);

  useEffect(() => {
    const element = frame.current, area = viewport.current, shell = host.current;
    if (!element || !area || !shell) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const sizeFrame = () => {
      const geometry = landscapeGeometry(area.clientWidth, area.clientHeight);
      element.style.width = geometry.width + 'px';
      element.style.height = geometry.height + 'px';
      element.style.transform = geometry.transform;
    };
    const visible = window.visualViewport;
    const sizeHost = () => {
      if (visible && visible.scale !== 1) return;
      shell.style.width = (visible?.width ?? window.innerWidth) + 'px';
      shell.style.height = (visible?.height ?? window.innerHeight) + 'px';
      shell.style.left = (visible?.offsetLeft ?? 0) + 'px';
      shell.style.top = (visible?.offsetTop ?? 0) + 'px';
      sizeFrame();
    };
    const observer = new ResizeObserver(sizeFrame);
    observer.observe(area);
    sizeHost();
    window.addEventListener('resize', sizeHost);
    visible?.addEventListener('resize', sizeHost);
    visible?.addEventListener('scroll', sizeHost);
    const receive = (event: MessageEvent) => {
      if (event.source !== element.contentWindow || event.origin !== location.origin || typeof event.data?.href !== 'string') return;
      if (event.data.type === navigationMessage) follow(event.data.href);
      if (event.data.type === leaveMessage && kind === 'platform') {
        // A tapped link: open it as a normal step, so Back returns to the tabs.
        let url: URL;
        try { url = new URL(event.data.href); } catch { return; }
        if (sameApp(url)) router.push(appPath(url) + url.search + url.hash);
      }
    };
    window.addEventListener('message', receive);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sizeHost);
      visible?.removeEventListener('resize', sizeHost);
      visible?.removeEventListener('scroll', sizeHost);
      window.removeEventListener('message', receive);
      document.body.style.overflow = previousOverflow;
    };
  }, [follow, kind, router]);

  const attributes = { [frameAttribute[kind]]: true };
  return <div ref={host} className={styles.host} data-mobile-game-viewport="landscape" data-landscape-frame={kind}>
    <div ref={viewport} className={styles.viewport}>
      <iframe ref={frame} {...attributes} title={title} src={source} className={styles.frame} allow={allow}
        onLoad={() => { try { if (frame.current?.contentWindow) follow(frame.current.contentWindow.location.href); } catch { /* Only same-origin app routes participate. */ } }} />
    </div>
  </div>;
}

/** Mounted in the app layout so Next client-side exits also leave the outer
 * rotated frame. Saves/auth stay in the existing same-origin account stores.
 * Inside the platform frame it also catches taps on links to full-screen pages
 * (games, login) and hands them to the outer page before the frame loads them. */
export function MobileGameNavigationBridge() {
  const pathname = usePathname();
  const query = useSearchParams();
  useEffect(() => {
    if (hosted()) window.parent.postMessage({ type: navigationMessage, href: location.href }, location.origin);
  }, [pathname, query]);
  useEffect(() => {
    if (!hostedIn('platform')) return;
    // Registered after React's own document listeners, so a component that cancels a
    // click (the coverflow does after a swipe) is seen as defaultPrevented here.
    const intercept = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, location.href);
      if (!sameApp(url) || !leavesPlatformFrame(appPath(url))) return;
      // PLAY owns the download screen, then opens the verified route in the parent.
      if (appPath(url).startsWith('/play/')) return;
      if (appPath(new URL(location.href)) === '/') window.dispatchEvent(new Event(homeLaunchEvent));
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage({ type: leaveMessage, href: url.href }, location.origin);
    };
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, []);
  return null;
}
