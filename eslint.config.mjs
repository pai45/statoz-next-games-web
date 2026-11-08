import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-studio/**",
    "out/**",
    "build/**",
    // Generated standalone game bundle, including vendored React/Three.js.
    // Its authored TypeScript is validated in the game workspace.
    "public/games/**",
    // Immutable third-party REA exports are inspected data, not authored source.
    ".local-game-assets/**",
    "vendor/cricketv2/**",
    "src/features/games/vibe-basketball/source/**",
    "src/features/games/pitch-rush/source/**",
    "src/features/games/open-golf/source/**",
    // Isolated supplied portfolio game; checked with its own TypeScript project.
    "src/features/games/portfolio-formula/source/**",
    "src/features/games/holdover/source/**",
    "src/features/games/hoop-legacy/source/**",
    "vendor/final-third/dist/**",
    // Vendored UI UX Pro Max skill tooling (see .codex/skills/THIRD_PARTY_NOTICES.md).
    ".codex/skills/{banner-design,brand,design,design-system,slides,ui-styling,ui-ux-pro-max}/**",
    ".cache/vibe-*/**",
    ".cache/vibe-*.mjs",
    ".cache/removed-exports/**",
    ".cache/removed-games/**",
    ".cache/device-cache-e2e/**",
    "test-results/vibe-basketball/**",
    "test-results/stadium-cricket/**",
    "public/embedded-games/**",
    "public/game-runtime/**",
    // Generated diagnostic renderer bundles; authored game and review scripts remain linted.
    "test-results/retro-hoops-*/**",
    ".cache/penalty-model-v5/review.js",
    ".cache/penalty-model-v6/review.js",
    ".cache/penalty-model-v7/review.js",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
