import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import sharp from "sharp";

// Capture the actual supplied 3D game, not an unrelated illustration.
const origin = process.env.FORMULA_TEST_ORIGIN || "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/chromium", headless: true,
  args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${origin}/play/portfolio-formula`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll("iframe")].some(frame => frame.src.includes("/embedded-games/portfolio-formula/")), null, { timeout: 120000 });
  const frame = page.frames().find(frame => frame.url().includes("/embedded-games/portfolio-formula/"));
  await frame.waitForFunction(() => window.__PORTFOLIO_FORMULA__?.().ready, null, { timeout: 120000 });
  await frame.evaluate(async () => {
    await document.fonts.ready;
    const style = document.createElement("style");
    style.textContent = `section[aria-labelledby="race-title"],header{visibility:hidden!important}
      .cover-title{position:fixed;z-index:100;inset:0 0 0 460px;pointer-events:none;padding:68px 80px;
      background:linear-gradient(180deg,rgba(5,6,10,.9),transparent 35%,transparent 70%,rgba(5,6,10,.96));}
      .cover-title small{font:600 17px "JetBrains Mono";letter-spacing:.24em;color:#ffc24b}
      .cover-title strong{display:block;margin-top:18px;color:#f3f1ec;font:italic 900 88px/.94 "Archivo";font-stretch:125%;letter-spacing:-.04em}
      .cover-title em{position:absolute;bottom:58px;left:80px;font:600 18px "JetBrains Mono";letter-spacing:.15em;color:#f3f1ec}`;
    document.head.append(style);
    const title = document.createElement("div");
    title.className = "cover-title";
    title.innerHTML = "<small>NIGHT CIRCUIT</small><strong>FORMULA</strong><em>EIGHT LIVERIES. RACE THE GRID.</em>";
    document.body.append(title);
  });
  await page.waitForTimeout(1200);
  const capture = await page.screenshot({ clip: { x: 460, y: 0, width: 980, height: 900 } });
  await fs.mkdir("public/games/portfolio-formula", { recursive: true });
  await sharp(capture).resize(900, 900, { fit: "cover" }).png().toFile("public/games/portfolio-formula/cover.png");
  console.log("Captured Formula's actual 3D car for its hub cover.");
} finally {
  await browser.close();
}
