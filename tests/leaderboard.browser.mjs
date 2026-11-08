import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const origin = (process.env.LEADERBOARD_TEST_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
const output = path.resolve("test-results/leaderboard");
await fs.mkdir(output, { recursive: true });
const executablePath = process.env.CHROME_PATH || (existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe") ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/chromium");
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];
const checkpoints = [];
const fixedTime = new Date("2026-11-06T12:30:00Z");

async function ready(page, surface = page) {
  await expect(surface.locator('[data-ladder]:visible')).toBeVisible({ timeout: 180000 });
  await expect(surface.getByRole("list", { name: "Leaderboard standings" }).locator(":scope > li").first()).toBeVisible({ timeout: 180000 });
}
async function noOverflow(surface) {
  assert.ok(await surface.locator("html").evaluate((element) => element.scrollWidth <= innerWidth + 1), "no horizontal page overflow");
}
function recordErrors(page) { page.on("pageerror", (error) => errors.push(error.message)); }
async function settledPodium(surface) {
  for (const winner of await surface.getByRole("list", { name: "Top three podium" }).locator(":scope > li").all()) {
    const points = await winner.getAttribute("data-rp");
    await expect(winner.locator('[data-podium-score]')).toContainText(Number(points).toLocaleString("en-US"));
    await expect.poll(() => winner.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
  }
}

async function firstScreenRankings(surface, lastRank) {
  for (const rank of [1, 2, 3, lastRank]) {
    const row = surface.locator(`[data-ladder]:visible [data-rank="${rank}"]`);
    assert.ok(await row.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight + 1;
    }), `rank ${rank} is fully visible on the opening screen`);
  }
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Asia/Kolkata" });
  await context.addInitScript(() => {
    localStorage.setItem("statoz.games.web.auth.v2", JSON.stringify({ version: 2, authenticated: true, email: "ladder@example.test" }));
    localStorage.setItem("statoz.games.web.accounts.v1", JSON.stringify({ version: 1, accounts: { "ladder@example.test": { onboardingComplete: true } } }));
    localStorage.setItem("statoz.games.web.profile.v1", JSON.stringify({ displayName: "Ladder Tester", avatarId: "", bannerId: "", primarySport: "football", playerTag: "TEST-RANK", followedLeagueIds: [], favoriteTeams: {}, timeZoneId: "device" }));
  });
  const page = await context.newPage();
  recordErrors(page);
  await page.clock.setFixedTime(fixedTime);
  await page.goto(`${origin}/leaderboard`, { waitUntil: "load", timeout: 180000 });
  await ready(page);
  await expect(page).toHaveURL(/ladder=master&period=weekly$/);
  await expect(page.getByRole("heading", { name: "MASTER LEADERBOARD", exact: true })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Browse by sport" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "ALL-TIME" })).toHaveCount(0);
  const rail = page.getByRole("navigation", { name: "Leaderboard boards" }).first();
  await expect(rail.getByRole("button", { name: "LONGBOW", exact: true })).toBeVisible();
  await expect(rail.getByRole("button", { name: "OPEN GOLF", exact: true })).toBeVisible();
  await expect(page.locator('[data-self="true"]')).toHaveCount(1);
  await expect(page.locator('[data-leaderboard-workspace]')).not.toContainText("DEMO STANDINGS");
  await expect(page.locator('[data-leaderboard-workspace]')).not.toContainText("YOUR DEMO STANDING");
  await expect(page.getByRole("region", { name: "Your rank", exact: true })).toHaveCount(0);
  await expect(page.locator('[data-leaderboard-workspace] h1')).toHaveCount(1);
  await expect(page.locator('[data-leaderboard-workspace]')).not.toContainText("1UP");
  await expect(page.locator('[data-leaderboard-workspace]')).not.toContainText("HIGH SCORES");
  await expect(page.locator('[data-self="true"]')).not.toContainText("Demo participant");
  const podium = page.getByRole("list", { name: "Top three podium" });
  await expect(podium).toBeVisible();
  assert.deepEqual(await podium.locator(":scope > li").evaluateAll((items) => items.map((item) => item.dataset.rank)), ["2", "1", "3"]);
  await expect(page.getByRole("list", { name: "Leaderboard standings" }).locator(":scope > li").first()).toHaveAttribute("data-rank", "4");
  const headingFont = await page.getByRole("heading", { name: "MASTER LEADERBOARD", exact: true }).evaluate((element) => getComputedStyle(element).fontFamily);
  const podiumFont = await podium.locator('[data-rank="1"] strong').first().evaluate((element) => getComputedStyle(element).fontFamily);
  assert.equal(podiumFont, headingFont, "the podium reuses the existing display font");
  const podiumIds = await podium.locator(":scope > li").evaluateAll((items) => items.map((item) => item.dataset.participant));
  for (const id of podiumIds) await expect(page.locator(`[data-participant="${id}"]`)).toHaveCount(1);
  const rawProfile = await page.evaluate(() => localStorage.getItem("statoz.games.web.profile.v1"));
  const masterRows = await page.locator('[data-participant]').evaluateAll((rows) => rows.map((row) => ({ id: row.dataset.participant, rank: row.dataset.rank, text: row.textContent })));
  await settledPodium(page);
  await firstScreenRankings(page, 6);
  await page.screenshot({ path: path.join(output, "desktop-master.png"), fullPage: false });
  await page.screenshot({ path: path.join(output, "desktop-arcade-full.png"), fullPage: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await firstScreenRankings(page, 6);
  await page.screenshot({ path: path.join(output, "laptop-1366.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  checkpoints.push("Master default, unique 2–1–3 podium, unchanged font, one title, no personal panel or repeated readouts, ranks 1–6 on desktop/laptop opening screen");

  await page.getByRole("button", { name: /View .* Master contributions/ }).first().click();
  const contributions = page.getByRole("dialog", { name: "MASTER CONTRIBUTIONS" });
  await expect(contributions).toBeVisible();
  const values = await contributions.locator("ol li b").allTextContents();
  const sum = values.reduce((total, text) => total + Number(text.replace(/\D/g, "")), 0);
  await expect(contributions.getByText(`${sum.toLocaleString("en-US")} RP`, { exact: true }).last()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(contributions).not.toBeVisible();
  await expect(page.getByRole("button", { name: /View .* Master contributions/ }).first()).toBeFocused();

  await page.getByRole("tab", { name: "SEASON", exact: true }).click();
  await expect(page.locator('[data-ladder]:visible')).toHaveAttribute("data-period", "season");
  await rail.getByRole("searchbox", { name: "Search leaderboard games" }).fill("long");
  await rail.getByRole("button", { name: "LONGBOW", exact: true }).click();
  await expect(page).toHaveURL(/ladder=longbow&period=season$/);
  await expect(page.locator('[data-ladder]:visible')).toHaveAttribute("data-ladder", "longbow");
  const selectedRow = page.locator('[data-participant]').first();
  const selectedId = await selectedRow.getAttribute("data-participant");
  const selectedRank = await selectedRow.getAttribute("data-rank");
  const selectedRp = await selectedRow.getAttribute("data-rp");
  const selectedName = await selectedRow.locator('button[aria-label*="profile"]').getAttribute("aria-label");
  const name = selectedName.startsWith("View ") ? selectedName.slice(5, -10) : "Ladder Tester";
  await page.getByRole("link", { name: "FIND PLAYER" }).click();
  await expect(page).toHaveURL(/leaderboard\/search\?ladder=longbow&period=season$/);
  await page.getByRole("searchbox", { name: "Search leaderboard players" }).fill(name);
  await expect(page.locator(`[data-participant="${selectedId}"]`)).toHaveAttribute("data-rank", selectedRank);
  await expect(page.locator(`[data-participant="${selectedId}"]`)).toHaveAttribute("data-rp", selectedRp);
  await page.getByRole("link", { name: "Back to leaderboard" }).click();
  await ready(page);
  await expect(page).toHaveURL(/ladder=longbow&period=season$/);
  await page.goBack();
  await expect(page).toHaveURL(/leaderboard\/search\?ladder=longbow&period=season$/);
  await page.goBack();
  await ready(page);
  await page.goBack();
  await expect(page.locator('[data-ladder]:visible')).toHaveAttribute("data-ladder", "master");
  checkpoints.push("Contribution sums, focus return, period preservation, board-aware search, browser history");

  await page.goto(`${origin}/leaderboard?type=games&sport=archery&mode=longbow&scope=season&league=epl`, { waitUntil: "load" });
  await ready(page);
  await expect(page).toHaveURL(/ladder=longbow&period=season$/);
  const rivalButton = page.locator('[data-participant]:not([data-self])').first().getByRole("button");
  await rivalButton.click();
  await expect(page.getByText("LONGBOW · Season · leaderboard position", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(rivalButton).toBeFocused();
  assert.equal(await page.evaluate(() => localStorage.getItem("statoz.games.web.profile.v1")), rawProfile);
  await page.goto(`${origin}/leaderboard?ladder=football-quiz&period=season`, { waitUntil: "load" });
  await ready(page);
  await expect(page).toHaveURL(/ladder=master&period=season$/);
  checkpoints.push("Legacy migration, disabled-game fallback, dossier context, profile preservation");

  for (const viewport of [{ width: 320, height: 760 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    if (viewport.width < 1024) {
      await expect(page.getByRole("button", { name: /SELECT LEADERBOARD/ })).toBeVisible();
      await expect(page.getByRole("region", { name: "Your rank", exact: true })).toHaveCount(0);
    }
    if (viewport.width === 390) { await settledPodium(page); await firstScreenRankings(page, 5); await page.screenshot({ path: path.join(output, "portrait-390.png") }); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const pickerTrigger = page.getByRole("button", { name: /SELECT LEADERBOARD/ });
  await pickerTrigger.click();
  const picker = page.getByRole("dialog", { name: "CHOOSE A LEADERBOARD" });
  await picker.getByRole("searchbox", { name: "Search leaderboard games" }).fill("golf");
  await picker.getByRole("button", { name: "OPEN GOLF", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await expect(pickerTrigger).toBeFocused();
  await expect(page.locator('[data-ladder]:visible')).toHaveAttribute("data-ladder", "open-golf");
  await expect(page.locator('[data-ladder]:visible')).toHaveAttribute("data-period", "season");
  await page.getByRole("tab", { name: "SEASON", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "WEEKLY", exact: true })).toBeFocused();
  await expect(page.locator('[data-ladder]:visible')).toHaveAttribute("data-period", "weekly");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await noOverflow(page);
  await page.screenshot({ path: path.join(output, "zoom-200.png") });
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });
  checkpoints.push("320/390/tablet/desktop layouts, mobile picker, keyboard selection, 200% zoom, reduced motion");

  await page.goto(`${origin}/leaderboard?ladder=pitch-rush&period=weekly`, { waitUntil: "load" });
  await ready(page);
  await expect(page.locator('[data-self]:visible')).toHaveCount(0);
  await page.goto(`${origin}/leaderboard?ladder=master&period=weekly`, { waitUntil: "load" });
  await ready(page);
  const samplePoints = await page.locator('[data-self]:visible').getAttribute("data-rank");
  await page.evaluate(() => {
    const key = "statoz.games.web.profile.v1";
    const profile = JSON.parse(localStorage.getItem(key));
    profile.displayName = "AReallyLongPlayerNameThatMustWrapWithoutCoveringPointsOrLeavingTheLeaderboardViewport";
    localStorage.setItem(key, JSON.stringify(profile));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  await page.setViewportSize({ width: 320, height: 760 });
  await expect(page.locator('[data-self]:visible')).toContainText("AReallyLongPlayerNameThatMustWrapWithoutCoveringPointsOrLeavingTheLeaderboardViewport");
  await expect(page.locator('[data-self]:visible')).toHaveAttribute("data-rank", samplePoints);
  await noOverflow(page);
  await page.locator('[data-self]:visible').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "long-player-name.png") });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.setFixedTime(new Date("2026-11-08T23:59:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  const signature = () => page.locator('[data-ladder]:visible [data-participant]').evaluateAll((rows) => rows.map((row) => `${row.dataset.participant}:${row.dataset.rank}:${row.dataset.rp}`).join("|"));
  const sundayPoints = await signature();
  await page.clock.setFixedTime(new Date("2026-11-09T00:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect.poll(signature).not.toBe(sundayPoints);
  await page.getByRole("tab", { name: "SEASON", exact: true }).click();
  await expect(page.locator('[data-ladder]:visible')).toHaveAttribute("data-period", "season");
  const seasonPoints = await signature();
  await page.clock.setFixedTime(new Date("2026-11-16T00:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect.poll(signature).toBe(seasonPoints);
  await page.clock.setFixedTime(new Date("2027-01-01T00:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page.getByText("2027 Season 1", { exact: true })).toBeVisible();
  await expect.poll(signature).not.toBe(seasonPoints);
  checkpoints.push("Unranked samples, long names, XP-independent identity, weekly/quarter rollover");

  const guest = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  recordErrors(guest);
  await guest.clock.setFixedTime(fixedTime);
  await guest.goto(`${origin}/leaderboard`, { waitUntil: "load", timeout: 180000 });
  await ready(guest);
  await expect(guest.locator('[data-self]')).toHaveCount(0);
  await expect(guest.getByRole("region", { name: "Your rank", exact: true })).toHaveCount(0);
  await guest.locator('[data-participant]').first().getByRole("button", { name: /profile/ }).click();
  await expect(guest.getByText("Sign in to compare your standing with other players.", { exact: true })).toBeVisible();
  await guest.close();

  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const phone = await browser.newPage({ viewport, isMobile: true, hasTouch: true });
    recordErrors(phone);
    await phone.goto(`${origin}/leaderboard?ladder=longbow&period=weekly`, { waitUntil: "load", timeout: 180000 });
    await phone.locator('iframe[data-mobile-platform-frame]').waitFor({ timeout: 180000 });
    const surface = phone.frameLocator('iframe[data-mobile-platform-frame]');
    await ready(phone, surface);
    await noOverflow(surface);
    await surface.getByRole("button", { name: /SELECT LEADERBOARD/ }).click();
    await expect(surface.getByRole("dialog", { name: "CHOOSE A LEADERBOARD" })).toBeVisible();
    await phone.keyboard.press("Escape");
    await expect(surface.getByRole("button", { name: /SELECT LEADERBOARD/ })).toBeFocused();
    await surface.getByRole("tab", { name: "SEASON", exact: true }).click();
    await expect(surface.locator('[data-ladder]:visible')).toHaveAttribute("data-period", "season");
    await phone.goBack();
    await expect(surface.locator('[data-ladder]:visible')).toHaveAttribute("data-period", "weekly");
    await settledPodium(surface);
    await firstScreenRankings(surface, 6);
    await phone.screenshot({ path: path.join(output, `touch-${viewport.width}.png`) });
    await phone.close();
  }
  checkpoints.push("Guest gate and actual portrait/landscape phone host frames");
  assert.ok(masterRows.length >= 23);
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ checkpoints, pageErrors: errors }, null, 2));
  console.log(`PASS: ${checkpoints.join("; ")}`);
  await context.close();
} finally { await browser.close(); }
