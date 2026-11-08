# Hoop Legacy authored athletes

This is the repository-owned implementation of
`docs/HOOP-LEGACY-ATHLETE-PLAN.md`. The supplied plan in Downloads was studied;
the original game and its source hashes remain unchanged.

`blender/base_body.py`, `conform.py`, `mh.py`, `subdiv.py`, `skin_bake.py`,
`raster.py`, `common.py` and the source locks were copied from the supplied
`src/features/games/hoop-legacy/source/tools/athletes` pipeline. `blender/outfit.py` is the local
original basketball geometry stage. Changes to the local copies do not alter
the imported baseline. Preserve the MakeHuman CC0 notices in generated output.

## Regenerate

Install this game's development dependencies with `npm ci --prefix
src/features/games/hoop-legacy/source --ignore-scripts`. Blender 4.5 LTS is used headlessly. Set
`HOOP_LEGACY_BLENDER` if it is not installed at the standard Windows path.

1. `node tools/hoop-legacy-athletes/fetch-sources.mjs`
2. `node tools/hoop-legacy-athletes/fetch-sources.mjs --system`
3. `node tools/hoop-legacy-athletes/build.mjs`
4. `node tools/hoop-legacy-athletes/check.mjs`
5. `npm run build:hoop-legacy`
6. `node tools/hoop-legacy-athletes/review.mjs`
7. `npm run test:hoop-legacy:deformation`

Every downloaded mesh/target/rig is pinned by the supplied SHA-256 lock. The
system archive is also hash pinned; only the selected CC0 data files are
extracted. The cache is local to `.cache/hoop-legacy-athletes`. Blender and
MakeHuman application code are not shipped. `--outfit-only` rebuilds the original
uniform/shoes/hair/accessories without rerunning the skin bake.

## Distribution and contracts

`public/games/hoop-legacy/athletes` owns the hashed GLBs, lossless WebP maps,
manifest, licences and provenance. Normal game builds mirror this into
`public/embedded-games/hoop-legacy/assets/athletes-v2` and remove stale generated
files. The device-cache manifest uses that runtime mirror, without downloading
the editable distribution twice.

The 19-bone rig, normalized height, +Z facing, soles at foot-local -0.039 and
existing palm offset are retained. `body` and `head` have build/face morphs;
`uniform` has build morphs. Geometry is shared across athletes; materials and
print textures are player-owned. Head/neck normals are derived before splitting.
Hero/game swaps preserve the skeleton and pose. Hero is disabled on low and
medium handhelds. The game falls back to the original procedural Character if
asset loading fails or times out.

The mesh bind matrix is captured once beside the skeleton inverses, before court
position/facing/jump transforms. Never replace it with the current world matrix
when selecting another detail tier. Regression checks must inspect deformed
vertices, not just unchanged bone matrices. Geometry caches are keyed by content
hash across tiers; materials reuse player-owned print textures across mesh swaps.

Material calls are kept to eight including hair and optional gear: body, head,
uniform, shoes, eyes, combined brow/lash cards, hair, combined head/wrist bands.
The gear shader hides absent accessories. Shared textures are cached by SHA-256
across tiers. Skin detail/normal/ORM maps remain linear; eye and card colour maps
use sRGB. Prints use the game's existing original team graphics and font.

Cloth folds are authored in the rest geometry and weighted to the existing rig;
this implementation does not claim a cloth-simulation bake. Afro/high-top cuts
use fitted CC0 MakeHuman afro01 cards. Other cuts use fitted scalp surfaces and
strand tubes with transported frames, with coverage breakup for short cuts.
This is an original web-game realism upgrade, not scanned NBA 2K characters.

The review harness uses the real game renderer and animations, loads the actual
font before painting prints, and captures identical before/after views. Numeric
checks validate budgets, file hashes, finite geometry, skin joints/weights and
morph coverage. Inspect screenshots as well as passing checks.

`test-results/hoop-legacy-athletes/comparison.html` provides an offline comparison
divider for each captured view. `review.json` includes complete render-pass counts
and the median of nine synchronous CPU render submissions. These timings exclude
GPU completion, browser presentation and physical-device performance. The runtime
browser suite separately verifies low/medium/high settings, changing quality while
a hero is visible, six-player gameplay and blocked-asset recovery.
