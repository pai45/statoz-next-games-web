# StatOz Games player profile

The games-only player hub lives at `/profile`. Its four sections are deep-linkable:
`?tab=overview`, `?tab=career`, `?tab=achievements`, and `?tab=locker`.
`/profile/history/games` opens the same Career view for existing links.

## Identity and ownership

The hub uses the existing StatOz tokens and host navigation. Landscape phones
retain the platform's rotated iframe policy. The compact hero keeps identity,
level and XP visible; the section chips stick below the host header.

The Player Nexus art direction adds a static circuit grid, scanline textures,
neon cyan/violet frames, numbered HUD panels, beveled controls and trophy slots
throughout all four sections. `HubSurface` owns this profile-only chrome; game
interfaces and global tokens are not restyled. Short landscape screens suppress
decorative header rails and use smaller ornaments while preserving touch targets.

Optional fields on `statoz.games.web.profile.v1` are `featuredGameId`,
`equippedTitleAchievementId`, and `pinnedAchievementIds`. Older records work
without migration. Missing pins select the top three earned trophies by rarity
and catalog order. Explicit empty slots remain empty and keep their positions.
The existing account switcher scopes this record alongside game and economy saves.

Locker selections are a local draft until Save; Cancel and leaving the section
discard the preview. The editor exposes free/owned avatars and banners, owned
frames, earned game titles, and enabled featured games. Equipping calls the
existing economy API and never purchases an item. Identity write failure leaves
the equipped card intact and displays an error.

## Career data

`useProfileGameSummaries` is the games feature's public read-only projection.
It merges account-scoped recent launches with native saved data for Pitch Duel,
Penalty Shootout, Tennis Rally, Open Golf and Rally Dash. Unsupported or retired
games cannot contribute results. Other enabled games can appear through their
recorded launches without invented statistics.

Opening a game is labeled "Last opened" and is never counted as completing a
match. Golf presents saved personal best strokes per hole, not fabricated match
history. Rally stage records preserve throttle/brake-assist variants; recent
Rallycross results use their native finishing position. Saves without timestamps
do not receive synthetic dates. The hub never writes game saves.

The achievement catalog is filtered to games/progression. Earned legacy game
trophies remain available; unsupported locked feats, prediction/pick badges and
purchase achievements are absent. Account XP totals keep their previous meaning;
the XP view hides prediction filters/rows without rewriting the stored ledger.

## Local verification

```powershell
.\node_modules\.bin\tsx.cmd --test tests/profile-hub.test.ts tests/home-recents.test.ts tests/open-golf-progress.test.ts
node tests/profile-hub.browser.mjs
.\node_modules\.bin\tsc.cmd --noEmit --pretty false
node node_modules/next/dist/bin/next build
```

Browser checks use the existing local server on port 3000, or
`PROFILE_TEST_ORIGIN`. Screenshots go to `test-results/profile-hub`.
Checks include desktop, short landscape phones, portrait rotation, real career
records, empty guests, pin/title persistence, Locker Save/Cancel, browser Back,
keyboard focus restoration, missing artwork and unavailable storage.
