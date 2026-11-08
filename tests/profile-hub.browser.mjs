import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const origin = process.env.PROFILE_TEST_ORIGIN || "http://localhost:3000";
const output = path.resolve("test-results/profile-hub");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe") ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/chromium"), headless: true });
const errors = [];
const email = "profile-hub@example.test";
async function seed(context, longName = false) {
  await context.addInitScript(({ email, longName }) => {
    if (localStorage.getItem("profile-hub-test-seeded")) return;
    localStorage.setItem("profile-hub-test-seeded", "1");
    localStorage.setItem("statoz.games.web.auth.v2", JSON.stringify({ version: 2, authenticated: true, email }));
    localStorage.setItem("statoz.games.web.accounts.v1", JSON.stringify({ version: 1, accounts: { [email]: { onboardingComplete: true } } }));
    localStorage.setItem("statoz.games.web.account-data-owner.v1", email);
    localStorage.setItem("statoz.games.web.profile.v1", JSON.stringify({ displayName: longName ? "THE VERY LONG PLAYER NAME THAT STILL NEEDS TO FIT" : "PLAYER ONE", avatarId: "adams", bannerId: "south_africa", playerTag: "PLAY-2026" }));
    localStorage.setItem("statoz.games.web.home-recents.v1", JSON.stringify({ version: 1, entries: [{ gameId: "open-golf", lastPlayedAt: 1793959200000 }, { gameId: "grand-prix-dash", lastPlayedAt: 1793959100000 }, { gameId: "penalty-cup", lastPlayedAt: 1793959000000 }] }));
    localStorage.setItem("statoz.games.web.pitch-duel.v4", JSON.stringify({ version: 4, xp: 4500, played: 4, wins: 3, goalsFor: 7, bestStreak: 3, history: [{ id: "real-result", at: "2026-11-06T10:00:00Z", opponentName: "Recorded Rival", playerScore: 3, opponentScore: 1, result: "Victory" }] }));
    localStorage.setItem(`statoz.games.web.bundle.open-golf.${encodeURIComponent(email)}`, JSON.stringify({ schemaVersion: 1, stores: { "open-golf.storage": JSON.stringify({ stroke_count_level_0: 1, stroke_count_level_1: 3 }) }, resultIds: [] }));
    localStorage.setItem("statoz.games.web.rally-dash.v1", JSON.stringify({ version: 1, rulesVersion: 1, records: { "pine-ridge:auto:assist": { best: 65.25, medal: "silver" }, "pine-ridge:manual:free": { best: 69.5, medal: "bronze" } } }));
  }, { email, longName });
}
async function ready(root) {
  await root.locator("[data-player-hub]").waitFor({ timeout: 180000 });
  await expect(root.getByRole("button", { name: "Copy player tag" })).toBeVisible({ timeout: 180000 });
  await expect.poll(() => root.locator('[aria-label="Player identity"] img').evaluateAll(images => images.every(image => image.complete)), { timeout: 30000 }).toBe(true);
}
async function noOverflow(root) {
  assert.ok(await root.locator("html").evaluate(el => el.scrollWidth <= innerWidth + 1), "no horizontal page overflow");
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await seed(context);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  await page.goto(origin + "/profile", { waitUntil: "load", timeout: 180000 }); await ready(page);
  await expect(page.getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute("aria-selected", "true");
  assert.equal(await page.getByRole("heading", { name: "OPEN GOLF", exact: true }).count(), 2, "most recent game is featured and recently played");
  assert.ok(!/predictions|predicts|picks|operative/i.test(await page.locator("[data-player-hub]").innerText()));
  await noOverflow(page);
  await page.screenshot({ path: path.join(output, "desktop-overview.png"), fullPage: true });
  const before = await page.evaluate(() => Object.fromEntries(["statoz.games.web.pitch-duel.v4", "statoz.games.web.rally-dash.v1", "statoz.games.web.economy.v1"].map(key => [key, localStorage.getItem(key)])));
  await page.getByRole("tab", { name: "Achievements", exact: true }).click();
  await page.getByLabel("Showcase slot 1", { exact: true }).selectOption("first_blood");
  await page.getByLabel("Showcase slot 2", { exact: true }).selectOption("on_fire");
  await page.locator("#achievement-first_blood").getByRole("button", { name: "Use as title" }).click();
  await expect(page.getByRole("region", { name: "Player identity" })).toContainText("First Blood");
  await page.reload(); await ready(page);
  await expect(page.getByLabel("Showcase slot 1", { exact: true })).toHaveValue("first_blood");
  await expect(page.getByLabel("Showcase slot 2", { exact: true })).toHaveValue("on_fire");
  await page.getByLabel("Showcase slot 1", { exact: true }).selectOption("");
  await page.reload(); await ready(page);
  await expect(page.getByLabel("Showcase slot 1", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Showcase slot 2", { exact: true })).toHaveValue("on_fire");
  await page.getByLabel("Showcase slot 1", { exact: true }).selectOption("first_blood");
  await page.screenshot({ path: path.join(output, "desktop-achievements.png"), fullPage: true });
  await page.getByRole("tab", { name: "Locker", exact: true }).click();
  await page.getByRole("button", { name: "Bellingham", exact: true }).click();
  await expect(page.getByRole("region", { name: "Player card preview" }).getByAltText("Player avatar")).toHaveAttribute("src", /bellingham/);
  await expect(page.getByRole("region", { name: "Player identity" }).getByAltText("Player avatar")).toHaveAttribute("src", /adams/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("region", { name: "Player card preview" }).getByAltText("Player avatar")).toHaveAttribute("src", /adams/);
  await page.getByRole("button", { name: "Bellingham", exact: true }).click();
  await page.getByRole("tab", { name: "Featured game", exact: true }).click();
  await page.getByRole("button", { name: "PENALTY CUP", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved. Your player card is ready." })).toBeVisible();
  await page.reload(); await ready(page);
  await expect(page.getByRole("region", { name: "Player identity" }).getByAltText("Player avatar")).toHaveAttribute("src", /bellingham/);
  await page.screenshot({ path: path.join(output, "desktop-locker.png"), fullPage: true });
  await page.getByRole("tab", { name: "Career", exact: true }).click();
  const golf = page.locator('[data-career-game="open-golf"]'); await expect(golf).toContainText("2/20");
  await golf.locator("summary").click(); await expect(golf).toContainText("Personal best · 1 stroke");
  const rally = page.locator('[data-career-game="grand-prix-dash"]'); await rally.locator("summary").click();
  await expect(rally).toContainText("Auto throttle · Brake assist"); await expect(rally).toContainText("Manual throttle · No brake assist");
  const duel = page.locator('[data-career-game="pitch-duel"]'); await duel.locator("summary").click(); await expect(duel).toContainText("Recorded Rival");
  const cup = page.locator('[data-career-game="penalty-cup"]'); await expect(cup).toContainText("No completed results recorded"); assert.equal(await cup.locator("summary").count(), 0);
  await page.screenshot({ path: path.join(output, "desktop-career.png"), fullPage: true });
  await page.goBack(); await expect(page.getByRole("tab", { name: "Locker", exact: true })).toHaveAttribute("aria-selected", "true");
  const after = await page.evaluate(() => Object.fromEntries(["statoz.games.web.pitch-duel.v4", "statoz.games.web.rally-dash.v1", "statoz.games.web.economy.v1"].map(key => [key, localStorage.getItem(key)])));
  assert.equal(after["statoz.games.web.pitch-duel.v4"], before["statoz.games.web.pitch-duel.v4"]);
  assert.equal(after["statoz.games.web.rally-dash.v1"], before["statoz.games.web.rally-dash.v1"]);
  const beforeCoins = JSON.parse(before["statoz.games.web.economy.v1"] || '{"coins":1000}').coins;
  assert.equal(JSON.parse(after["statoz.games.web.economy.v1"]).coins, beforeCoins, "appearance changes do not spend currency");
  await page.goto(origin + "/profile/history/games", { waitUntil: "load", timeout: 180000 }); await ready(page); await expect(page.getByRole("tab", { name: "Career", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goto(origin + "/profile/xp?track=prediction", { waitUntil: "load", timeout: 180000 });
  await expect(page.getByRole("heading", { name: "XP PROGRESS", exact: true })).toBeVisible({ timeout: 180000 });
  assert.ok(!/prediction|picks/i.test(await page.locator("#platform-content").innerText()));
  await page.setViewportSize({ width: 1280, height: 720 }); await page.goto(origin + "/profile"); await ready(page); await noOverflow(page);
  await page.screenshot({ path: path.join(output, "desktop-1280.png"), fullPage: true });
  await context.close();

  for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 390, height: 844 }]) {
    const mobile = await browser.newContext({ viewport, isMobile: true, hasTouch: true, reducedMotion: "reduce" }); await seed(mobile, true);
    const mobilePage = await mobile.newPage(); mobilePage.on("pageerror", error => errors.push(error.message));
    await mobilePage.goto(origin + "/profile", { waitUntil: "load", timeout: 180000 });
    await mobilePage.locator("iframe[data-mobile-platform-frame]").waitFor({ timeout: 180000 });
    const root = mobilePage.frameLocator("iframe[data-mobile-platform-frame]"); await ready(root); await noOverflow(root);
    for (const tab of await root.getByRole("tablist", { name: "Profile sections" }).getByRole("tab").all()) {
      const box = await tab.boundingBox(); assert.ok(box.height >= 44 && box.width >= 44);
    }
    await mobilePage.screenshot({ path: path.join(output, `phone-${viewport.width}-overview.png`) });
    await root.getByRole("tab", { name: "Locker", exact: true }).click();
    await root.getByRole("button", { name: "Bellingham", exact: true }).click();
    await root.getByRole("button", { name: "Save changes", exact: true }).scrollIntoViewIfNeeded();
    await expect(root.getByRole("button", { name: "Save changes", exact: true })).toBeInViewport();
    await mobilePage.screenshot({ path: path.join(output, `phone-${viewport.width}-locker.png`) });
    await root.getByRole("button", { name: "Save changes", exact: true }).click();
    await root.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(root.getByRole("dialog", { name: "SETTINGS", exact: true })).toBeVisible();
    await mobilePage.keyboard.press("Escape");
    await expect(root.getByRole("button", { name: "Settings", exact: true })).toBeFocused();
    await mobile.close();
  }
  const fresh = await browser.newPage({ viewport: { width: 1440, height: 900 } }); fresh.on("pageerror", error => errors.push(error.message));
  await fresh.route("**/assets/avatars/**", route => route.abort());
  await fresh.goto(origin + "/profile"); await expect(fresh.locator("[data-player-hub]")).toBeVisible({ timeout: 180000 });
  await expect(fresh.getByRole("heading", { name: "Find your next favorite" })).toBeVisible();
  await fresh.getByRole("tab", { name: "Career", exact: true }).click(); await expect(fresh.getByRole("heading", { name: "Your career starts here" })).toBeVisible();
  await fresh.screenshot({ path: path.join(output, "fresh-guest.png"), fullPage: true });
  await fresh.close();
  const blockedContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await blockedContext.addInitScript(() => { Object.defineProperty(Storage.prototype, "setItem", { configurable: true, value() { throw Error("Storage unavailable"); } }); });
  const blocked = await blockedContext.newPage(); blocked.on("pageerror", error => errors.push(error.message));
  await blocked.goto(origin + "/profile?tab=locker"); await expect(blocked.locator("[data-player-hub]")).toBeVisible({ timeout: 180000 });
  await blocked.getByRole("button", { name: "Bellingham", exact: true }).click();
  await blocked.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(blocked.getByRole("status").filter({ hasText: "Could not save" })).toBeVisible();
  await expect(blocked.getByRole("region", { name: "Player identity" }).getByAltText("Player avatar")).toHaveAttribute("src", /adams/);
  await blockedContext.close();
  assert.deepEqual(errors, [], "no uncaught runtime errors");
  console.log("Profile hub: desktop, landscape, rotated portrait, saved records, pin/title persistence, Locker save/cancel, and guest checks passed.");
} finally { await browser.close(); }
