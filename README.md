# StatOz Games Web

Independent repository in the StatOz workspace.

```powershell
npm run setup
npm run dev
```

Opens http://127.0.0.1:4406 after readiness. From the parent: npm run games-web. Ctrl+C stops owned processes. Port conflicts are errors. 

Check: npm run check. Build: npm run build. Release: npm run release:doctor; follow AGENTS.md for an explicit bounded release scope. Source publication never deploys production automatically. Each PC installs and authenticates GitHub CLI independently.

Private data: %LOCALAPPDATA%/StatOz/next/games-web. Never store private records or browser sessions in Git. Transfer and backup commands preserve immutable incoming revisions and exclude credentials, sessions, schedules and live jobs. See docs/migration for original instructions and source provenance.
