import {defaultPresentation, readPresentation, type RetroPresentation} from "./presentation";
import "./shell.css";

type Bridge = {presentation?: unknown; emit: (type: string, payload: unknown) => void};
const host = () => (window as unknown as {__STATOZ_HOST__?: Bridge}).__STATOZ_HOST__;
let current = defaultPresentation();
let screenStatus = "";
let change: ((value: RetroPresentation) => void) | undefined;
const standaloneKey = "statoz.retro.presentation.v1";

class PresentationSettings extends HTMLElement {
  private sync = () => {
    const layout = this.querySelector<HTMLSelectElement>("select");
    const fullscreen = this.querySelector<HTMLInputElement>("input");
    if (layout) layout.value = current.layout;
    if (fullscreen) fullscreen.checked = current.fullscreen;
    const status = this.querySelector<HTMLElement>(".retro-screen-status");
    if (status) status.textContent = screenStatus;
  };
  connectedCallback() {
    this.innerHTML = '<fieldset class="retro-presentation"><legend>DISPLAY &amp; CONTROLS &middot; ALL RETRO GAMES</legend><label>Control layout<select aria-label="Control layout"><option value="onscreen">On-screen buttons</option><option value="handheld">Handheld side buttons</option></select></label><label>Fullscreen by default<input aria-label="Fullscreen by default" type="checkbox"></label><p>Shared across the retro games. Rotate your phone to landscape.</p><p class="retro-screen-status" role="status"></p></fieldset>';
    this.onchange = () => {
      const layout = this.querySelector<HTMLSelectElement>("select")!.value;
      change?.({...current, layout: layout === "handheld" ? "handheld" : "onscreen", fullscreen: this.querySelector<HTMLInputElement>("input")!.checked});
    };
    window.addEventListener("retro-presentation-change", this.sync);
    this.sync();
  }
  disconnectedCallback() { window.removeEventListener("retro-presentation-change", this.sync); }
}

/** One lifecycle owner per game document; gameplay and input remain game-owned. */
export function mountRetroPresentation(root: HTMLElement, pause: () => void) {
  if (!customElements.get("retro-presentation-settings")) customElements.define("retro-presentation-settings", PresentationSettings);
  const bridge = host();
  screenStatus = "";
  let stored: unknown;
  if (!bridge) try { stored = JSON.parse(localStorage.getItem(standaloneKey) || "null"); } catch {}
  current = readPresentation(bridge?.presentation ?? stored) ?? defaultPresentation();
  const apply = () => { document.documentElement.dataset.retroLayout = current.layout; };
  apply();
  window.dispatchEvent(new Event("retro-presentation-change"));
  const abort = new AbortController(), {signal} = abort;
  // frameElement belongs to the parent realm; instanceof against the child constructor fails.
  const target = window.frameElement ?? document.documentElement;
  const fullDocument = target.ownerDocument;
  let disposed = false, attemptedInteraction = false, pending = false, entered = false;
  const status = (message: string) => { screenStatus = message; document.querySelectorAll<HTMLElement>(".retro-screen-status").forEach(el => { el.textContent = message; }); };
  const fullscreen = async () => {
    if (pending || disposed || !current.fullscreen || entered) return;
    pending = true;
    try {
      if (!fullDocument.fullscreenElement) await target.requestFullscreen();
      if (disposed) return;
      entered = true;
      const orientation = screen.orientation as ScreenOrientation & {lock?: (value: string) => Promise<void>};
      try { await orientation.lock?.("landscape"); } catch { /* Manual rotation remains available. */ }
      if (!disposed) status("");
    } catch { if (!disposed) status("Fullscreen is unavailable or was blocked. The game fills the available viewport."); }
    finally { pending = false; }
  };
  change = value => {
    const wasFullscreen = current.fullscreen;
    pause(); current = value; apply();
    if (bridge) { bridge.presentation = current; bridge.emit("presentation", current); }
    else try { localStorage.setItem(standaloneKey, JSON.stringify(current)); } catch { status("Display preferences could not be saved on this device."); }
    window.dispatchEvent(new Event("retro-presentation-change"));
    if (current.fullscreen && !wasFullscreen) { entered = false; attemptedInteraction = true; void fullscreen(); }
    else if (!current.fullscreen && fullDocument.fullscreenElement === target) void fullDocument.exitFullscreen().catch(() => {});
  };
  const rotate = document.createElement("aside");
  rotate.className = "retro-rotation";
  rotate.setAttribute("aria-label", "Landscape orientation required");
  rotate.innerHTML = '<span aria-hidden="true">&#8635;</span><h2>TURN TO LANDSCAPE</h2><p>Rotate your phone for the wide handheld screen.</p><button type="button">Settings</button>';
  const dialog = document.createElement("dialog");
  dialog.className = "retro-rotation-settings";
  dialog.setAttribute("aria-label", "Retro display settings");
  dialog.innerHTML = '<h2>SETTINGS</h2><retro-presentation-settings></retro-presentation-settings><form method="dialog"><button>Done</button></form>';
  document.body.append(rotate, dialog);
  rotate.querySelector("button")!.onclick = () => { pause(); dialog.showModal(); };
  let portrait = false;
  const rotation = () => {
    const next = innerWidth < innerHeight && innerWidth < 900;
    if (next && !portrait) pause();
    portrait = next; rotate.hidden = !portrait; root.inert = portrait;
  };
  window.addEventListener("resize", rotation, {signal});
  window.addEventListener("orientationchange", () => { pause(); rotation(); }, {signal});
  // Entering a same-origin native game iframe is still focus inside this game.
  window.addEventListener("blur", () => { if (!document.hasFocus()) pause(); }, {signal});
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, {signal});
  const interaction = () => { if (!attemptedInteraction && !pending) { attemptedInteraction = true; void fullscreen(); } };
  window.addEventListener("pointerdown", interaction, {capture: true, signal});
  window.addEventListener("keydown", event => {
    if (portrait && !dialog.open && !["Tab", "Escape", "Enter", " "].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (portrait && !dialog.open && event.target !== rotate.querySelector("button")) { event.stopImmediatePropagation(); return; }
    if (event.key !== "Escape") interaction();
  }, {capture: true, signal});
  fullDocument.addEventListener("fullscreenchange", () => {
    if (entered && !fullDocument.fullscreenElement) attemptedInteraction = true;
  }, {signal});
  rotation(); void fullscreen();
  return () => { disposed = true; abort.abort(); root.inert = false; rotate.remove(); dialog.remove(); change = undefined; delete document.documentElement.dataset.retroLayout; };
}
