# Game modules

Gameplay does not live here. Every playable game ships in the pinned game
library artifact and runs inside the sandboxed iframe rendered by
`shared/components/bundled-game.tsx`.

This folder holds only what the host shell itself needs:

- `components/` – launcher, covers, dashboard and other shell UI.
- `shared/` – the iframe host, navigation, mobile viewport and gate helpers.
- `<game>/` folders – small data, types and saved-progress readers that host
  screens still import (for example the deck editor's liveries and kits, or
  streak and profile progress). They contain no engines or renderers.

Before adding a file here, make sure a route under `src/app` reaches it.
