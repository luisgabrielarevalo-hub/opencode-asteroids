# AGENTS.md — asteroids

Zero-dependency HTML5 Canvas game. No bundler, no package manager, no tests, no lint/typecheck, no CI.

## Structure

- `index.html` — loads `game.js` via plain `<script>` (no modules, no imports/exports). Canvas is `800x600` with `id="canvas"`.
- `game.js` — all logic in one global-scope file (`'use strict'`). Classes: `Ship`, `Bullet`, `Asteroid`, `Particle`, plus `update`/`draw`/`loop` and `playing | dead | gameover` state machine.
- `favicon.svg` — static only.

## Run / verify

No build step. Open `index.html` directly or serve it:

```bash
npx serve .
```

There is no test suite — verify visually in the browser (controls: `←`/`→` rotate, `↑` thrust, `Space` shoot/restart).

## Gotchas

- Canvas size is duplicated: `width`/`height` attrs in `index.html` AND `const W/H` in `game.js`. Change both together.
- Frame loop clamps `dt` to `0.05` and wraps all movement toroidally via `wrap(v, max)` — keep this for teleport/resize safety.
- Input uses `e.code` (`keys` for held, `justPressed`/`pressed()` for edge-triggered Space). Don't switch to `e.key` without handling layouts.
- Ship collision uses `a.radius * 0.82` forgiveness factor; asteroid `RADII/SPEEDS/POINTS` arrays are indexed by size `1..3` (index 0 unused). Splits spawn 2× `size-1`.
- README mentions power-ups / shooting star — not implemented in code. Trust `game.js` as source of truth.
