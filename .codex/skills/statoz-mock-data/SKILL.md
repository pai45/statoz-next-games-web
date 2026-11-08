---
name: statoz-mock-data
description: Create or update StatOz mock and demo data consumed by UI components, especially sport fixtures and match details. Use when changing static fixture content; do not use for real APIs, generated asset registries, or gameplay engines.
---

# Statoz Mock Data

Use this skill when a StatOz screen needs new or changed demo records.

## Source boundary

- Inspect the relevant domain types and current `src/mocks` module before adding data.
- Put declarative UI fixtures in `src/mocks/<area>` and import focused modules such as `@/mocks/matches`; do not create a root mock barrel for component imports.
- Keep `src/mocks` free of React, Next.js, routes, stores, and feature implementation imports. Move a reusable fixture contract to `src/domain` and re-export it from the feature when compatibility requires it.
- Components, routes, and feature state may select, filter, and render mock data, but must not own product fixture literals.

## Match data

- Keep sport fixtures in `src/mocks/matches/<sport>.ts`; shared catalog helpers own leagues, IDs, lookup functions, and the combined feed order.
- Keep match-detail demo content in `src/mocks/matches/details/<sport>.ts`. Preserve stable match IDs and validate all cross-links to matches and markets.
- Use existing domain contracts and preserve a fixture's status, scores, kickoff time, ordering, and linked IDs unless the request explicitly changes them.

## Exclusions and validation

- Leave generated asset registries, design tokens, real integrations, browser state, and gameplay tuning or engine constants with their owners.
- After a mock-data change, run the narrow TypeScript and lint checks plus the production build. Verify the affected routes render all relevant scheduled, live, and finished states.
