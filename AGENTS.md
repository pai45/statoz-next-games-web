# StatOz Games Web

This independent repository owns Games Web. Read module.json and release.config.json. Original folders in module.json are read-only migration sources. Never run a build, sync, script or write against those paths.

Use npm run dev (port 4406); Products and other servers are optional. Use npm run setup after a clean clone. New schedules are disabled. Local records live outside Git under %LOCALAPPDATA%/StatOz/next/games-web. Never publish credentials, browser profiles, private records or unsigned native artifacts.

Edits, tests, previews and builds are local. Push only when asked. An explicit release request authorizes this repository's configured workflow. Prepare an explicit JSON list of requested file paths; run npm run release:doctor, then npm run release:prepare -- --files SCOPE.json --message 'description'. Inspect its receipt, then npm run release -- --request ID. Monitor the exact workflow using release:status; use release:resume after interruption. Do not stage all dirty files, force-push, overwrite versions or retry uncertain remote writes. Never submit a native store build without a store-submission request.

Pinned shared packages are consumed without sibling-source imports. Modify the package owner and publish a new version; consumers adopt explicitly. Games retain independent artwork. Report unverified device and cross-PC acceptance honestly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
