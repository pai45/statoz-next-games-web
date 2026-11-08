# Pack art

Drop pack cover images here. They are picked up automatically by the shop —
no code change needed (the shop paints a per-tier fallback until a file exists).

## Naming (must match the pack id)

| File                      | Pack         |
|---------------------------|--------------|
| `assets/packs/starter.webp` | Starter Pack |
| `assets/packs/bronze.webp`  | Bronze Pack  |
| `assets/packs/gold.webp`    | Gold Pack    |
| `assets/packs/elite.webp`   | Elite Pack   |

PNG fallbacks with the same names are supported. The starter pack currently
uses the silver card-back art, and the elite pack uses the platinum art.

The unpack animation also uses tier-named PNGs for each revealed card:
`bronze.png`, `silver.png`, `gold.png`, and `platinum.png`.

## Recommended

- **Format:** `.webp` (matches `assets/player_images/`).
- **Aspect ratio:** portrait ~5:7 (e.g. 500×700) — rendered with `BoxFit.cover`.
- Keep the art a touch darker toward the bottom; a scrim + the pack label sit
  there, and the rarity holographic shimmer reads best over darker mid-tones.
