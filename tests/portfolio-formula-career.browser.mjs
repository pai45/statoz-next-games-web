import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

// Accelerate the real director and enable its existing AI driver ONLY in this
// in-memory test bundle. The published runtime and its diagnostics stay read-only.
const directory = path.resolve("src/features/games/portfolio-formula/source");
const compiled = await build({
  entryPoints: [path.join(directory,"src/main.tsx")], bundle:true, write:false, format:"iife", platform:"browser", target:"es2022", jsx:"automatic", minify:true,
  tsconfig:path.join(directory,"tsconfig.json"), define:{"process.env.NODE_ENV":'"production"',"import.meta.env.DEV":"false","import.meta.env.BASE_URL":'"./"'},
  plugins:[{name:"test-only-ai-driver",setup(api){ api.onLoad({filter:/RaceDirector\.tsx$/},async({path:file})=>{
    let source=await fs.readFile(file,"utf8");
    source=source.replace('const TIME_SCALE = devParams?.has("racefast") ? 4 : 1','const TIME_SCALE = 60')
      .replace('const AUTOPILOT = devParams?.has("raceauto") ?? false','const AUTOPILOT = true')
      .replace('const GRID_HOLD = 1.6','const GRID_HOLD = 0.02')
      .replace('const LIGHT_INTERVAL = 0.8','const LIGHT_INTERVAL = 0.005')
      .replace('const RESULTS_DELAY = 3.2','const RESULTS_DELAY = 0.03')
      .replace('const dt = Math.min(rawDelta, 0.1)','const dt = 0.1')
      .replaceAll('steps < 48','steps < 480').replaceAll('steps === 48','steps === 480');
    return {contents:source,loader:"tsx"};
  }); }}],
});
let html=await fs.readFile("public/embedded-games/portfolio-formula/index.html","utf8");
// The prelude has two scripts; React's bundled strings also contain <script>,
// so searching from the end would cut into JavaScript source.
const first=html.indexOf("<script>",html.indexOf("<body>"));
const second=html.indexOf("<script>",html.indexOf("</script>",first)+9);
const script=html.indexOf("<script>",html.indexOf("</script>",second)+9);
assert.ok(script>0);
html=html.slice(0,script+8)+compiled.outputFiles[0].text.replaceAll("</script","<\\/script")+html.slice(html.indexOf("</script>",script));
const origin=process.env.FORMULA_TEST_ORIGIN || "http://localhost:3000";
const out=path.resolve("test-results/portfolio-formula");
await fs.mkdir(out,{recursive:true});
const executablePath=process.env.CHROME_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser=await chromium.launch({...executablePath?{executablePath}:{channel:"chrome"},headless:true,args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
await context.route("**/embedded-games/portfolio-formula/index.html*",route=>route.fulfill({status:200,contentType:"text/html",body:html}));
const page=await context.newPage();
page.setDefaultTimeout(30000);
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
async function frame(){
  await page.waitForFunction(()=>[...document.querySelectorAll("iframe")].some(f=>f.src.includes("/embedded-games/portfolio-formula/")) || document.querySelector("iframe[data-mobile-game-frame]"),null,{timeout:120000});
  let game;
  for(let i=0;i<100&&!game;i++) {game=page.frames().find(f=>f.url().includes("/embedded-games/portfolio-formula/"));if(!game)await page.waitForTimeout(100)}
  assert.ok(game);
  await game.waitForFunction(()=>window.__PORTFOLIO_FORMULA__?.().ready,null,{timeout:120000});
  return game;
}
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("statoz.games.web.bundle.portfolio-formula.guest"))?.stores?.["statoz.portfolio-formula.career.v1"]);
try {
  await page.goto(origin+"/play/portfolio-formula",{waitUntil:"networkidle",timeout:120000});
  let game=await frame();
  console.log("CHECK accelerated runtime ready");
  await game.getByRole("button",{name:/Start Career/}).click();
  await game.getByRole("button",{name:"Begin Championship",exact:true}).click();
  for(let round=0;round<3;round++) {
    await game.waitForFunction(()=>window.__PORTFOLIO_FORMULA__().phase==="results",null,{timeout:120000});
    const state=await game.evaluate(()=>window.__PORTFOLIO_FORMULA__());
    assert.equal(state.career.round,round+1);
    const before=await saved();
    await game.getByText("Race details",{exact:true}).click();await game.getByRole("button",{name:"Championship",exact:true}).click();
    await page.screenshot({path:path.join(out,`career-round-${round+1}-results.png`)});
    assert.equal(await saved(),before,"opening championship table never awards points again");
    console.log(`PASS career round ${round+1}: ${state.circuit}`);
    if(round===0) {
      await page.reload({waitUntil:"networkidle"}); game=await frame();
      await game.getByRole("button",{name:/Continue Career/}).click();
      assert.equal((await game.evaluate(()=>window.__PORTFOLIO_FORMULA__())).career.round,1);
    } else await game.getByRole("button",{name:"Continue Career",exact:true}).click();
    if(round<2) await game.getByRole("button",{name:`Race ${round+2} / 3`,exact:true}).click();
  }
  const career=JSON.parse(await saved());
  assert.equal(career.unlockedTier,1);
  assert.ok(career.best[0]<=3);
  await game.getByRole("button",{name:"Browse career",exact:true}).click();
  await game.getByRole("button",{name:"rewards",exact:true}).click();
  await game.getByRole("button",{name:"Signal",exact:true}).click();
  await page.screenshot({path:path.join(out,"career-unlocked-rewards.png")});
  await game.getByRole("button",{name:"Lobby",exact:true}).click();
  await game.getByRole("button",{name:/Quick Match/}).click();
  await game.getByRole("button",{name:"Signal",exact:true}).waitFor();
  // The quick race finishes through the same director without mutating career.
  await game.getByRole("button",{name:"Laps: 3",exact:true}).click(); // 3 -> 5
  await game.getByRole("button",{name:"Laps: 5",exact:true}).click(); // 5 -> 1
  const before=await saved();
  await game.getByRole("button",{name:"Start race",exact:true}).click();
  await game.waitForFunction(()=>window.__PORTFOLIO_FORMULA__().phase==="results",null,{timeout:120000});
  assert.equal(await saved(),before);
  assert.deepEqual(errors,[]);
  console.log("PASS career autosave/reload, three real circuit races, promotion, cosmetic unlock, and Quick Match isolation");
} catch(error) {
  console.error(error,errors);
  await page.screenshot({path:path.join(out,"career-failure.png"),timeout:10000}).catch(()=>{});
  process.exitCode=1;
} finally { await browser.close(); }
