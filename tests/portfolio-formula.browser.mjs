import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const origin = process.env.FORMULA_TEST_ORIGIN || "http://localhost:3000";
const out = path.resolve("test-results/portfolio-formula");
await fs.mkdir(out, { recursive: true });
// Linux CI uses /usr/bin/chromium; elsewhere fall back to the installed Chrome, as the other browser checks do.
const executablePath = process.env.CHROME_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : { channel: "chrome" }), headless: true,
  args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [], failures = [], checks = [];
let currentPage;
async function open(context, suffix = "") {
  const page = await context.newPage();
  currentPage = page;
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => {
    if (!request.failure()?.errorText.includes("ERR_ABORTED")) failures.push(request.url());
  });
  await page.goto(`${origin}/play/portfolio-formula?returnTo=%2Fgames%2Fmotorsport${suffix}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll("iframe")].some(frame => frame.src.includes("/embedded-games/portfolio-formula/")) ||
    document.querySelector("iframe[data-mobile-game-frame]"), null, { timeout: 120000 });
  let frame;
  const deadline = Date.now() + 120000;
  while (!frame && Date.now() < deadline) {
    frame = page.frames().find(candidate => candidate.url().includes("/embedded-games/portfolio-formula/"));
    if (!frame) await page.waitForTimeout(100);
  }
  assert.ok(frame, "isolated game frame boots");
  await frame.waitForFunction(() => window.__PORTFOLIO_FORMULA__?.().ready === true, null, { timeout: 120000 });
  await frame.getByRole("button", { name: /Quick Match/ }).waitFor();
  // Next's development indicator overlaps the left pedal on short phones.
  // Remove only that development overlay, not any game chrome or controls.
  await Promise.all(page.frames().map(candidate =>
    candidate.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {})));
  return { page, frame };
}
const state = frame => frame.evaluate(() => window.__PORTFOLIO_FORMULA__());

try {
  if (!process.argv.includes("--mobile-only")) {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const { page, frame } = await open(desktop);
  await page.screenshot({ path: path.join(out, "00-lobby.png") });
  await frame.getByRole("button", { name: /Quick Match/ }).focus();
  await frame.evaluate(() => {
    window.__TEST_PAD__ = { connected: true, axes: [0,0], buttons: Array.from({length:16}, () => ({pressed:false,value:0})) };
    navigator.getGamepads = () => [window.__TEST_PAD__];
    window.__TEST_PAD__.buttons[0].pressed = true;
  });
  await frame.waitForFunction(() => window.__PORTFOLIO_FORMULA__().menu === "quick");
  await page.waitForTimeout(250);
  assert.equal((await state(frame)).menu,"quick","holding A must not activate the next screen's back button");
  await frame.evaluate(() => { window.__TEST_PAD__.buttons[0].pressed = false; });
  await page.waitForTimeout(100);
  await frame.evaluate(() => { window.__TEST_PAD__.buttons[1].pressed = true; });
  await frame.waitForFunction(() => window.__PORTFOLIO_FORMULA__().menu === "lobby");
  await frame.evaluate(() => { window.__TEST_PAD__.buttons[1].pressed = false; navigator.getGamepads = () => []; });
  await frame.getByRole("button", { name: /Quick Match/ }).click();
  await frame.getByRole("button", { name: "Next car", exact: true }).click();
  await frame.getByRole("button", { name: /02.*Harbor Run/ }).click();
  assert.equal((await state(frame)).circuit, "harbor");
  assert.equal((await state(frame)).car, "pluspay");
  await page.screenshot({ path: path.join(out, "01-car-selection.png") });
  checks.push("Lobby, original 3D grid, car selection and circuit selection work");

  await frame.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = frame.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByRole("radiogroup", { name: "Laps", exact: true }).getByRole("radio", { name: "1", exact: true }).click();
  await settings.getByRole("radiogroup", { name: "Rivals", exact: true }).getByRole("radio", { name: "Easy", exact: true }).click();
  await settings.getByRole("switch", { name: "Engine sound", exact: true }).click();
  await settings.getByRole("switch", { name: /Onboard camera/ }).click();
  await page.screenshot({ path: path.join(out, "02-settings.png") });
  await settings.getByRole("button", { name: "Done", exact: true }).click();
  const configured = await state(frame);
  await frame.getByRole("button", { name: "Lobby", exact: true }).click();
  await frame.getByRole("button", { name: /Start Career/ }).click();
  await frame.getByRole("button", { name: "Browse career", exact: true }).click();
  await frame.getByRole("button", { name: "standings", exact: true }).click();
  await page.screenshot({ path: path.join(out, "01b-career-standings.png") });
  await frame.getByRole("button", { name: "rewards", exact: true }).click();
  await page.screenshot({ path: path.join(out, "01c-career-rewards.png") });
  await frame.getByRole("button", { name: "calendar", exact: true }).click();
  await page.screenshot({ path: path.join(out, "01d-career-calendar.png") });
  await frame.getByRole("button", { name: "Begin Championship", exact: true }).click();
  assert.equal((await state(frame)).mode, "career");
  assert.equal((await state(frame)).laps, 1);
  assert.equal((await state(frame)).difficulty, "easy");
  const firstGrid = (await state(frame)).grid;
  await frame.getByRole("button", { name: "Pause (Esc)", exact: true }).click();
  await frame.getByRole("button", { name: "Restart race", exact: true }).click();
  assert.deepEqual((await state(frame)).grid, firstGrid);
  await frame.getByRole("button", { name: "Pause (Esc)", exact: true }).click();
  await frame.getByRole("button", { name: "Back to Career", exact: true }).click();
  await frame.getByRole("button", { name: "Settings", exact: true }).click();
  assert.equal(await frame.getByRole("radiogroup", { name: "Laps", exact: true }).count(), 0);
  await frame.getByRole("button", { name: "Done", exact: true }).click();
  await frame.getByRole("button", { name: "Lobby", exact: true }).click();
  checks.push("Career starts with fixed tier rules, preserves its seeded grid on restart, and locks race settings");
  assert.equal(configured.laps, 1);
  assert.equal(configured.difficulty, "easy");
  assert.equal(configured.camera, "onboard");

  await page.reload({ waitUntil: "networkidle" });
  const resumed = page.frames().find(candidate => candidate.url().includes("/embedded-games/portfolio-formula/"));
  await resumed.waitForFunction(() => window.__PORTFOLIO_FORMULA__?.().ready, null, { timeout: 120000 });
  assert.equal((await state(resumed)).laps, 1);
  assert.equal((await state(resumed)).difficulty, "easy");
  assert.equal((await state(resumed)).camera, "onboard");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("statoz.games.web.bundle.portfolio-formula.guest")));
  assert.ok(saved.stores["statoz.portfolio-formula.settings.v1"]);
  assert.equal(await page.evaluate(() => localStorage.getItem("pd-race-settings-v1")), null);
  checks.push("Lap count, rival difficulty, sound and camera settings use isolated persistent saves");

  await resumed.getByRole("button", { name: /Continue Career/ }).waitFor();
  await resumed.getByRole("button", { name: /Quick Match/ }).click();
  assert.equal((await state(resumed)).circuit, "harbor");
  const careerBefore = (await state(resumed)).career;
  await resumed.getByRole("button", { name: "Start race", exact: true }).click();
  await resumed.waitForFunction(() => window.__PORTFOLIO_FORMULA__().phase === "racing", null, { timeout: 120000 });
  await page.keyboard.down("ArrowUp");
  await resumed.waitForFunction(() => window.__PORTFOLIO_FORMULA__().speed > 8, null, { timeout: 30000 });
  await page.keyboard.up("ArrowUp");
  await page.screenshot({ path: path.join(out, "03-racing-onboard.png") });
  await page.keyboard.press("c");
  assert.equal((await state(resumed)).camera, "chase");
  await resumed.getByRole("button", { name: "Pause (Esc)", exact: true }).click();
  const paused = resumed.getByRole("dialog", { name: "Box, box.", exact: true });
  await paused.waitFor();
  const frozen = (await state(resumed)).time;
  await page.waitForTimeout(350);
  assert.equal((await state(resumed)).time, frozen);
  await page.screenshot({ path: path.join(out, "04-paused.png") });
  await paused.getByRole("button", { name: "Restart race", exact: true }).click();
  assert.ok(["grid", "lights"].includes((await state(resumed)).phase));
  await resumed.getByRole("button", { name: "Pause (Esc)", exact: true }).click();
  await resumed.getByRole("dialog", { name: "Box, box.", exact: true }).getByRole("button", { name: "Change car", exact: true }).click();
  await resumed.getByRole("button", { name: "Start race", exact: true }).waitFor();
  assert.deepEqual((await state(resumed)).career, careerBefore);
  await resumed.getByRole("button", { name: "Lobby", exact: true }).click();
  await resumed.getByRole("button", { name: "Motorsport", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/" && url.searchParams.get("sport") === "motorsport");
  await page.screenshot({ path: path.join(out, "04b-motorsport-hub.png") });
  checks.push("Start lights, keyboard driving, onboard/chase, pause freeze, restart, selection and exit work");
  await desktop.close();
  }

  for (const [name, viewport] of [["phone-landscape", { width: 844, height: 390 }], ["phone-portrait", { width: 390, height: 844 }], ["phone-small", { width: 667, height: 375 }]]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const { page: phone, frame: game } = await open(context);
    assert.equal((await state(game)).quality, "low");
    await phone.screenshot({ path: path.join(out, `05-${name}-lobby.png`) });
    await game.getByRole("button", { name: /Start Career/ }).click();
    await game.getByRole("button", { name: "Browse career", exact: true }).click();
    for (const tab of ["calendar", "standings", "rewards"]) {
      await game.getByRole("button", { name: tab, exact: true }).click();
      const clipped = await game.locator(".formula-menu button:not(:disabled)").evaluateAll(buttons => buttons.filter(b => {
        const r=b.getBoundingClientRect(); return r.width && r.height && (r.bottom > innerHeight+1 || r.top < -1 || r.right > innerWidth+1 || r.left < -1);
      }).map(b => b.textContent));
      assert.deepEqual(clipped, [], `${name} ${tab} controls fit viewport`);
      await phone.screenshot({ path: path.join(out, `05-${name}-career-${tab}.png`) });
    }
    await game.getByRole("button", { name: "Lobby", exact: true }).click();
    await game.getByRole("button", { name: /Quick Match/ }).click();
    const start = await game.getByRole("button", { name: "Start race", exact: true }).boundingBox();
    assert.ok(start.width >= 44 && start.height >= 44);
    assert.ok(await game.evaluate(() => innerWidth > innerHeight));
    assert.ok(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await phone.screenshot({ path: path.join(out, `05-${name}-setup.png`) });
    await game.getByRole("button", { name: "Start race", exact: true }).click();
    await game.getByRole("button", { name: "Steer left", exact: true }).waitFor();
    await game.waitForFunction(() => window.__PORTFOLIO_FORMULA__().phase === "racing", null, { timeout: 120000 });
    await phone.waitForTimeout(600);
    assert.equal((await state(game)).autoThrottle,false);
    assert.ok(Math.abs((await state(game)).speed)<.5,'mobile car waits for accelerator');
    const gas=game.getByRole('button',{name:'Accelerate',exact:true});
    const g=await gas.boundingBox();
    // Frame-local coordinates retain the game's horizontal axis when the host
    // rotates a landscape game inside an upright phone.
    const gasLayout=await gas.evaluate(element=>{const rect=element.getBoundingClientRect();return {left:rect.left};});
    const brakeLayout=await game.getByRole('button',{name:'Brake',exact:true}).evaluate(element=>{const rect=element.getBoundingClientRect();return {right:rect.right};});
    assert.ok(gasLayout.left>=brakeLayout.right,'pedals are side by side in the game viewport');
    const gasSession=await context.newCDPSession(phone);
    await gasSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:g.x+g.width/2,y:g.y+g.height/2,id:3}]});
    await game.waitForFunction(() => window.__PORTFOLIO_FORMULA__().speed > 3, null, { timeout: 30000 });
    await gasSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await game.waitForFunction(()=>!window.__PORTFOLIO_FORMULA__().touch.throttle);
    const left = game.getByRole("button", { name: "Steer left", exact: true });
    const brake = game.getByRole("button", { name: "Brake", exact: true });
    assert.ok((await left.boundingBox()).width >= 44);
    const l = await left.boundingBox(), b = await brake.boundingBox();
    const session = await context.newCDPSession(phone);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
      { x: l.x + l.width / 2, y: l.y + l.height / 2, id: 1 },
      { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 2 },
    ] });
    await game.waitForFunction(() => {
      const touch = window.__PORTFOLIO_FORMULA__().touch;
      return touch.left && touch.brake;
    }, null, { timeout: 5000 });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await game.waitForFunction(() => {
      const touch = window.__PORTFOLIO_FORMULA__().touch;
      return !touch.left && !touch.brake;
    });
    await phone.screenshot({ path: path.join(out, `06-${name}-race.png`) });
    await context.close();
  }
  checks.push("Landscape and rotated portrait phones have lightweight rendering and touch steering/pedals");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await fs.writeFile(path.join(out, "checks.json"), JSON.stringify({ checks, errors, failures }, null, 2));
  console.log("PASS\n- " + checks.join("\n- "));
} catch (error) {
  await currentPage?.screenshot({ path: path.join(out, "zz-failure.png") }).catch(() => {});
  console.error("FAIL", error, "\nChecks:", checks, "\nPage errors:", errors, "\nFailed requests:", failures);
  process.exitCode = 1;
} finally {
  await browser.close();
}
