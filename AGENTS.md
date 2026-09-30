# AGENTS.md — asteroids

Zero-dependency HTML5 Canvas game. No bundler, no package manager, no tests, no lint/typecheck, no CI.

## Structure

- `index.html` — loads `game.js` via plain `<script>` (no modules, no imports/exports). Canvas is `800x600` with `id="canvas"`.
- `game.js` — all logic in one global-scope file (`'use strict'`, ~840 lines). Classes: `Ship`, `Bullet`, `Asteroid`, `FastAsteroid` (cometa), `PowerUp`, `Particle`, plus `update`/`draw`/`loop` and `playing | dead | gameover` state machine.
- `favicon.svg` — static only.

## Run / verify

No build step. Open `index.html` directly or serve it:

```bash
npx serve .
```

There is no test suite — verify visually in the browser (controls: `←`/`→` rotate, `↑` thrust, `Space` shoot/restart, `S` cycle ship skin).

## Gotchas

- Canvas size is duplicated: `width`/`height` attrs in `index.html` AND `const W/H` in `game.js`. Change both together.
- Frame loop clamps `dt` to `0.05` and wraps all movement toroidally via `wrap(v, max)` — except `FastAsteroid` and `Particle`, which move straight without wrap (comet is removed at `FAST_MARGIN=60` px off-screen or `FAST_TTL=12`s).
- Input uses `e.code` (`keys` for held, `justPressed`/`pressed()` for edge-triggered Space/KeyS). Don't switch to `e.key` without handling layouts.
- Ship collision uses `a.radius * 0.82` forgiveness factor; asteroid `RADII/SPEEDS/POINTS` arrays are indexed by size `1..3` (index 0 unused). Splits spawn 2× `size-1`.
- Cometa (`FastAsteroid`): orange `#ffb02e` with trail, speed 240–300, spawns every 8–15 s (`FAST_MIN/MAX_DELAY`, max 1 on screen), 150 pts, splits into 2× size-1 normal asteroids. Shield destroys it on contact instead of killing the ship.
- Power-ups (`PowerUp`, kinds `speed | triple | shield`): drop only from asteroids with `size > 1` — independent rolls of 20% (`speed`/`triple` 50/50) + 10% `shield`. TTL 8 s in screen, effects last 5/5/8 s. Colors: speed `#0ff`, triple `#ff2fd6`, shield `#4da6ff`. Shield is not consumed on impact, only expires by time.
- Ship skins (`SHIP_SKINS`: `classic | interceptor | tanker`): `KeyS` cycles (`cycleSkin()`), persisted in `localStorage` key `asteroids_skin`. Nose points to +X within ~±22 px — keep it so `NOSE=21` bullet spawn and `radius=12` collisions stay valid.
- Lives/levels: 3 lives, `invincible=3`s blink on respawn, `deadTimer=2`s in `dead` state, `nextLevel()` spawns `3+level` asteroids with `SAFE_DIST=130` px from center. `gameover` restarts with Space.
- HUD/overlay text is in Spanish (`SCORE`, `NIVEL`, `NAVE: … [S]`, `GAME OVER`). Trust `game.js` as source of truth over `README.md`.
