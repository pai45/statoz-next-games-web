# Illustrated Matches and Games backgrounds

The home hub shares six original vector worlds across Matches and Games:
Trending, Football, Cricket, Basketball, Motorsport and Tennis. All scenes
have portrait and wide compositions. The current tab publishes its sport to
the home shell, keeping the existing independent selections and scroll state.
The artwork extends behind the header and feed, ignores input and semantics,
and stays stationary. Artwork stays sharp beneath three pronounced dark navy
gradients: a diagonal sweep, asymmetric edge shading, and a gently eased bottom fade.
The centre retains a strong navy veil rather than a transparent window, so
playing surfaces and equipment stay subdued behind the feed on app and web.
A shared transparent cyber overlay uses 36.8% of its original intensity for faint cyan-tinted diagonal facets,
chamfered navy plates and sparse segmented HUD edge marks. It has no blur,
glow or animation. The shared source generates matching CSS, Flutter gradients
and the bundled overlay SVG. Themes crossfade for 240 ms; reduced motion disables the
transition. Other routes retain their existing backgrounds.

`scripts/hub-background-source` owns geometry and the presentation manifest.
Colours resolve from the existing design-system CSS tokens at generation time.
SVG outputs include their colours and need no fonts, images or network access.

Run `npm run backgrounds:sync` after changing artwork, presentation settings or
their colour tokens. To explicitly update the Flutter library as well, run:

```powershell
npm run backgrounds:sync -- --flutter-root ../flutter_projects/card_game
npm run backgrounds:sync -- --flutter-root ../flutter_projects/card_game --check
```

Ordinary builds use local files only. `npm run backgrounds:check` rejects stale
web outputs, and `npm run test:backgrounds` verifies self-contained scenes and
the generator's platform parity. Flutter uses `CyberHubBackground`, exported
through its shared cyber catalog, and bundles the generated assets separately.
No imported club or athlete artwork is used.

## Filled illustration direction

The six worlds use original solid isometric dioramas: raised turf/court/track
platforms, faceted equipment, shaded sides and cast shadows. The game-card
illustrations inspire the material vocabulary; their scenes are not copied or
used as enlarged backgrounds. Football has a goal and ball, Cricket a bat and
wicket, Basketball a hoop and ball, Motorsport an open-wheel car, Tennis a racket
and net, and Trending an app-wide collectible/play arena. Material colours reuse
the existing generated game-art tokens. Sport identity remains the canonical
accent. The layered dark gradient overlay protects foreground contrast without blur.

The racing car follows the road centreline. Football goal posts sit on the
projected end line, with net depth extending outside the pitch. Goal geometry
uses the court projection, rather than an independently positioned rectangle.

The complete car footprint uses an affine projection into the road plane: its
length follows the road and its width follows the road cross-section. Tyres,
curbs and the chequered line share that projection; all four tyre footprints
remain inside the asphalt. A screen-space rotation alone is insufficient.
