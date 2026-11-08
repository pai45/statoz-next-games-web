# Game modules

Every game is isolated so its renderer, rules, state, and tests can evolve
without coupling unrelated games. Use `shared` only for proven cross-game
building blocks such as matchmaking, countdowns, result overlays, or audio.

Recommended module shape:

```text
<game>/
|-- components/
|-- engine/
|-- state/
|-- data/
|-- types.ts
|-- index.ts
`-- __tests__/
```
