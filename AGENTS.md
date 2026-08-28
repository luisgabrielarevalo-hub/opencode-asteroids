# AGENTS.md

Vanilla JS Asteroids game. No build system, no dependencies, no tests, no lint.

## Run
- Open `index.html` directly (double-click) or `npx serve .` then `http://localhost:3000`.
- It's a plain `<script src="game.js">` page — edits to `game.js` take effect on refresh.

## Structure
- `index.html` — HTML5 page; hardcodes the `<canvas id="canvas">` at 800x600 and loads `game.js`.
- `game.js` — the entire game in one `'use strict'` file (423 lines). All runtime state and geometry are globals.
- `favicon.svg`, `README.md` — non-functional.

## Conventions / gotchas
- **UI text is Spanish** (HUD: `SCORE`, `PUNTAJE`, `NIVEL`, `GAME OVER`). Keep new UI strings in Spanish to match.
- Game is a state machine: `state` ∈ `'playing' | 'dead' | 'gameover'` (game.js:241). Update/render branches on it — keep new gameplay logic inside the right branch.
- Main loop uses `requestAnimationFrame` with delta-time, clamped to 0.05s (game.js:415). All movement uses `dt`; do not assume a fixed framerate.
- Playfield is toroidal — entities wrap edges via `wrap()` (game.js:27). The ship stays at center-top on reset; asteroids spawn at least 130px away (game.js:251).
- `pressed(code)` is edge-triggered (fires once per key press) and consumed on read; `keys[code]` is level (held). Use `pressed` for single-shot actions like shooting/restart, `keys` for continuous ones like thrust/rotation.
- There is no package.json: do not assume `npm run`, linters, or a test runner exist. Verify behavior by opening the page in a browser.
