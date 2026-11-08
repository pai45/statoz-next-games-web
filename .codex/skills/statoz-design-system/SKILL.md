---
name: statoz-design-system
description: Maintain and extend the StatOz web interface with its design-system tokens and feature-first folder boundaries. Use when creating or modifying StatOz pages, reusable UI components, styling, themes, or Flutter-to-web visuals; do not use for backend-only work.
---

# StatOz Design System

Keep UI work visually consistent with StatOz and structurally aligned with the
project. Treat the repository files as the living source of truth rather than
copying their current values into this skill.

## Inspect the source of truth

Before changing UI, read the relevant parts of:

- `ARCHITECTURE.md` for application boundaries and dependency direction.
- `src/design-system/README.md` for design-system ownership rules.
- `src/design-system/components/README.md` for component categories and shape.
- `src/design-system/tokens/` and `src/design-system/styles/tokens.css` for the
  current colors, spacing, typography, and CSS variables.
- `src/app/globals.css` for the active Tailwind and global token mapping.

When porting a Flutter screen, also inspect that screen and its supporting
theme or widgets in the Flutter project. Preserve its product identity while
adapting layout and interactions to the web instead of mechanically
translating Flutter widget code.

## Place code by responsibility

Use these ownership rules:

| Code | Location |
| --- | --- |
| Reusable visual primitive | `src/design-system/components/<category>/<component>` |
| Color, spacing, or type decision | `src/design-system/tokens` and `styles/tokens.css` |
| Feature-aware UI composition | `src/features/<feature>/components` |
| Route, layout, loading, or error boundary | `src/app` |
| Shared non-visual hook, provider, or utility | `src/shared` |
| Shared business type or rule | `src/domain` |
| Server integration or persistence | `src/server` |

Do not recreate `src/shared/components`. Shared visual components belong in
the design system. A component that knows about matches, picks, games,
profiles, or another domain belongs to that feature even if several screens in
the same feature use it.

## Work token-first

- Reuse a semantic token before adding a value in a component.
- Add a new token only when the design introduces a reusable visual decision.
- Keep TypeScript tokens and their CSS custom properties synchronized.
- Export new token modules through `src/design-system/tokens/index.ts` and the
  design-system public API.
- Avoid raw hex colors, one-off font stacks, and repeated spacing literals in
  components when an appropriate token exists.
- Do not change the global palette to solve a local component requirement.

## Preserve surface geometry

- Every visible surface must retain a deliberate border around its full
  silhouette, including every clipped, chamfered, notched, or angled corner.
- Do not use a clipped background without a matching clipped border treatment.
  When a normal CSS border cannot follow the shape reliably, use a layered
  shell, pseudo-element, or inset treatment with the same clip path so the
  outline remains continuous.
- Reuse the appropriate semantic border token and shape token; keep the
  border geometry synchronized with the surface geometry at all breakpoints
  and states.

## Build reusable components

- Use the existing category directories: `actions`, `forms`, `feedback`,
  `data-display`, `navigation`, `overlays`, and `layout`.
- Give each component a kebab-case directory and a focused public `index.ts`.
- Keep props product-agnostic and prefer composition over feature flags.
- Cover labels, keyboard behavior, focus visibility, disabled state, errors,
  and touch targets when relevant.
- Make components responsive without encoding page-specific widths.
- Remove a directory's `.gitkeep` when adding its first real file.
- Add or update focused tests when the repository has a suitable test setup.

## Use the StatOz chip pattern

- Build navigation and filter chip groups with the shared `FilterChips` from
  `src/design-system/components/navigation/filter-chips`; do not recreate the
  pattern inside a feature.
- Render every chip as a compact dark chamfered plate with a continuous
  one-pixel silhouette. Inactive chips use a muted border and muted label;
  the selected chip uses the group accent for its border and label over a
  low-opacity accent wash.
- Do not represent these chip groups as plain labels separated by vertical
  rules or as underline-only tabs. The outlined plate is the visual affordance.
- Keep the visible plate compact while preserving a minimum 44px interactive
  target. Chip rows scroll horizontally on narrow screens instead of shrinking
  labels or wrapping the group.
- Preserve tab-list semantics, visible focus, and Left/Right/Home/End keyboard
  selection when changing the shared component.

## Validate the change

Check that imports follow the dependency boundaries, no equivalent component
already exists, and new tokens are wired into both TypeScript and CSS when
needed. Run the narrowest relevant tests and the production build. Do not add a
component library, restyle unrelated screens, activate placeholder routes, or
move feature code without the user's request.
