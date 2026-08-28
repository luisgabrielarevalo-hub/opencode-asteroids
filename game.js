'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella Fugaz ─────────────────────────────────────────────────────────────
const SH_STAR_POINTS = 100;
const SH_STAR_RADII  = [0, 8, 12];

class ShootingStar {
  constructor(x, y, size = 2) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = SH_STAR_RADII[size];
    this.dead = false;
    this.color = '#ffd700';

    const speed = rand(220, 280) + (size === 1 ? 60 : 0);
    const angle = rand(0, Math.PI * 2);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rot = Math.atan2(this.vy, this.vx);
    this.rotSpeed = rand(-0.8, 0.8);

    this.ttl  = size === 1 ? 2 : 4;
    this.life = this.ttl;

    this.trailTimer = 0;

    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new ShootingStar(this.x, this.y, 1),
      new ShootingStar(this.x, this.y, 1),
    ];
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    this.trailTimer -= dt;
    if (this.ttl <= 0) this.dead = true;

    if (this.trailTimer <= 0) {
      this.trailTimer = 0.06;
      const ttl = rand(0.2, 0.35);
      particles.push(new Particle(this.x, this.y, ttl, this.color));
    }
  }

  draw() {
    const alpha = this.ttl / this.life < 0.25
      ? 0.3 + (this.ttl / this.life) * 2.8
      : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * SKINS[currentSkin].scale;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
    this.boostTimer    = 0;
    this.shield        = 0;
    this.shieldMax     = 3;
    this.shieldTimer   = 0;
    this.tripleShotTimer = 0;
  }

  get isBoosted()    { return this.boostTimer > 0; }
  get isTripleShot() { return this.tripleShotTimer > 0; }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.boostTimer    > 0) this.boostTimer    -= dt;
    if (this.shield > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shield = 0;
    }
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.isBoosted ? 520 : 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21 * SKINS[currentSkin].scale;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.isTripleShot) {
      const SPREAD = 0.15;
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    if (this.shield > 0) this.drawShield();

    const skin = SKINS[currentSkin];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.strokeColor;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      const s = SKINS[currentSkin].scale;
      ctx.beginPath();
      ctx.moveTo(-8 * s, -4 * s);
      ctx.lineTo(-8 * s - rand(6, 14) * s, 0);
      ctx.lineTo(-8 * s,  4 * s);
      ctx.strokeStyle = skin.flameColor;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawShield() {
    const ratio = this.shield / this.shieldMax;
    const RADIUS = 28 * SKINS[currentSkin].scale;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 250);
    const alpha = 0.35 + 0.45 * ratio + pulse * 0.2 * ratio;

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur  = 14 * ratio;
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle  = `rgba(0, 255, 255, ${alpha * 0.35})`;
    ctx.lineWidth    = 6;
    ctx.shadowBlur   = 0;
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// ── Skins ────────────────────────────────────────────────────────────────────
const SKINS = [
  {
    name: 'CLÁSICA',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    strokeColor: '#fff',
    flameColor: 'rgba(255, 130, 0, 0.85)',
    scale: 1,
    scoreMult: 1,
  },
  {
    name: 'FLECHA',
    verts: [[22, 0], [-5, -12], [-10, -5], [-8, 0], [-10, 5], [-5, 12]],
    strokeColor: '#00e5ff',
    flameColor: 'rgba(0, 180, 255, 0.85)',
    scale: 1,
    scoreMult: 1,
  },
  {
    name: 'ROMBO',
    verts: [[18, 0], [0, -10], [-14, 0], [0, 10]],
    strokeColor: '#ffd700',
    flameColor: 'rgba(255, 80, 0, 0.85)',
    scale: 1,
    scoreMult: 1,
  },
  {
    name: 'ANGULAR',
    verts: [[20, 0], [2, -14], [-6, -6], [-12, 0], [-6, 6], [2, 14]],
    strokeColor: '#76ff03',
    flameColor: 'rgba(180, 0, 255, 0.85)',
    scale: 1,
    scoreMult: 1,
  },
  {
    name: 'MORADA',
    verts: [[40, 0], [-24, -18], [-14, 0], [-24, 18]],
    strokeColor: '#aa00ff',
    flameColor: 'rgba(200, 0, 255, 0.85)',
    scale: 2,
    scoreMult: 2,
  },
];

let currentSkin = parseInt(localStorage.getItem('skin') || '0', 10);
if (currentSkin < 0 || currentSkin >= SKINS.length) currentSkin = 0;

let toastText = '';
let toastColor = '#fff';
let toastTimer = 0;

function showToast(text, color) {
  toastText = text;
  toastColor = color;
  toastTimer = 1.5;
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, ttl = rand(0.4, 1.1), color = '#fff') {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = ttl;
    this.ttl  = ttl;
    this.dead = false;
    this.color = color;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ── PowerUp ─────────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = rand(-20, 20);
    this.vy = rand(-20, 20);
    const r = Math.random();
    this.type = r < 0.4 ? 'shield' : r < 0.7 ? 'speed' : 'triple';
    this.radius = 14;
    this.color = this.type === 'shield' ? '#0ff' : this.type === 'triple' ? '#f0f' : '#ff0';
    this.ttl = 10;
    this.dead = false;
    this.rot = 0;
    this.rotSpeed = rand(-2, 2);
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    if (this.type === 'shield') {
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.moveTo(0, 11);
      ctx.arc(0, 0, 7, Math.PI / 2, -Math.PI / 2, true);
      ctx.stroke();
    } else if (this.type === 'triple') {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-8, 6);
      ctx.lineTo(0, 10);
      ctx.lineTo(8, 6);
      ctx.lineTo(8, -6);
      ctx.closePath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-3, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-4, 10);
      ctx.lineTo(3, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(4, -10);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, shootingStars, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let shootingStarTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  shootingStars = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  shootingStarTimer = rand(3, 6);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  shootingStars = [];
  powerups  = [];
  ship.reset();
  shootingStarTimer = rand(3, 6);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function spawnShootingStar() {
  const SIZE = 2;
  const MARGIN = 40;
  const edge = randInt(0, 3);
  let x, y;
  if (edge === 0)      { x = rand(0, W); y = -MARGIN; }
  else if (edge === 1) { x = W + MARGIN; y = rand(0, H); }
  else if (edge === 2) { x = rand(0, W); y = H + MARGIN; }
  else                 { x = -MARGIN; y = rand(0, H); }
  shootingStars.push(new ShootingStar(x, y, SIZE));
}

function update(dt) {
  if (toastTimer > 0) toastTimer -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Cambiar skin
  if (pressed('KeyS')) {
    currentSkin = (currentSkin + 1) % SKINS.length;
    localStorage.setItem('skin', currentSkin);
    showToast(SKINS[currentSkin].name, SKINS[currentSkin].strokeColor);
  }

  // Spawn de estrellas fugaces
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    spawnShootingStar();
    shootingStarTimer = rand(8, 10);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  shootingStars.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size] * (SKINS[currentSkin].scoreMult || 1);
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.3) powerups.push(new PowerUp(a.x, a.y));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  const newShootingStars = [];
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += SH_STAR_POINTS * (SKINS[currentSkin].scoreMult || 1);
        explode(s.x, s.y, s.size * 5);
        newShootingStars.push(...s.split());
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead).concat(newShootingStars);
  bullets       = bullets.filter(b => !b.dead);

  // Nave vs PowerUp
  for (const p of powerups) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'shield') {
        ship.shield = ship.shieldMax;
        ship.shieldTimer = 10;
      } else if (p.type === 'triple') {
        ship.tripleShotTimer = 5;
      } else {
        ship.boostTimer = 5;
      }
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shield > 0) {
          ship.shield--;
          a.dead = true;
          score += POINTS[a.size] * (SKINS[currentSkin].scoreMult || 1);
          explode(a.x, a.y, a.size * 5);
          asteroids = asteroids.concat(a.split());
        } else {
          killShip();
        }
        break;
      }
    }
    if (state !== 'dead' && state !== 'gameover') {
      for (const s of shootingStars) {
        if (!s.dead && dist(ship, s) < ship.radius + s.radius * 0.82) {
          if (ship.shield > 0) {
            ship.shield--;
            s.dead = true;
            score += SH_STAR_POINTS * (SKINS[currentSkin].scoreMult || 1);
            explode(s.x, s.y, s.size * 5);
          } else {
            killShip();
          }
          break;
        }
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0 && shootingStars.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = SKINS[currentSkin].strokeColor;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.isBoosted) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff0';
    ctx.fillText(`VELOCIDAD: ${ship.boostTimer.toFixed(1)}s`, W - 14, 50);
  }
  if (ship.shield > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`ESCUDO: ${'█'.repeat(ship.shield)}${'░'.repeat(ship.shieldMax - ship.shield)}`, W - 14, 72);
  }

  if (ship.isTripleShot) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`TRIPLE SHOT: ${ship.tripleShotTimer.toFixed(1)}s`, W - 14, 68);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (toastTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = toastColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`SKIN: ${toastText}`, W / 2, H / 2 + 60);
  }

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
