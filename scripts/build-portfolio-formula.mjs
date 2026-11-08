import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { engineExternals, engineModulePrelude } from './build-game-engine.mjs';

/** An isolated offline port of the race mode in the user-supplied Figma code layer. */
export async function buildPortfolioFormula({ prelude }) {
  const directory = path.resolve("src/features/games/portfolio-formula/source");
  const result = await build({
    entryPoints: [path.join(directory, "src/main.tsx")],
    bundle: true,
    write: false,
    format: "esm",
    external: engineExternals,
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.env.DEV": "false",
      "import.meta.env.BASE_URL": '"./"',
    },
    tsconfig: path.join(directory, "tsconfig.json"),
    logLevel: "warning",
  });
  const cssPath = path.join(directory, "src/index.css");
  let css = await fs.readFile(cssPath, "utf8");
  css += "\n" + await fs.readFile(path.join(directory, "src/components/race/formula-menu.css"), "utf8");
  const localUrls = [...css.matchAll(/url\(['"]?(\.\/assets\/fonts\/[^'")]+)['"]?\)/g)];
  for (const match of localUrls) {
    const font = await fs.readFile(path.resolve(directory, "src", match[1]));
    css = css.replace(match[0], `url(data:font/woff2;base64,${font.toString("base64")})`);
  }
  const compiled = await postcss([tailwind({ base: directory, optimize: true })]).process(css, { from: cssPath });
  const js = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
  return `<!doctype html><html lang="en" data-game="portfolio-formula"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Formula · StatOz</title><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}*{box-sizing:border-box}button{touch-action:manipulation}${compiled.css}</style></head><body><div id="root"></div>${prelude}${await engineModulePrelude(['core','audio'])}<script type="module">${js}</script></body></html>`;
}
