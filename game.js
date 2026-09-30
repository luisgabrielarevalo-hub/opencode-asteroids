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

// ── Asteroide especial rápido ("cometa") ──────────────────────────────────────
// Pequeño, muy rápido, entra por un borde aleatorio en línea recta y
// desaparece al salir de pantalla o al expirar su TTL. Al destruirlo
// da más puntos y se divide en 2 asteroides pequeños normales.
const FAST_RADIUS    = 14;
const FAST_POINTS    = 150;
const FAST_SPEED_MIN = 240;
const FAST_SPEED_MAX = 300;
const FAST_TTL       = 12;   // segundos máximos en pantalla
const FAST_MIN_DELAY = 8;    // respawn aleatorio entre 8 y 15 s
const FAST_MAX_DELAY = 15;
const FAST_COLOR     = '#ffb02e';
const FAST_MARGIN    = 60;   // margen fuera de pantalla para eliminarlo

class FastAsteroid {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = FAST_RADIUS;
    this.size = 1; // para reutilizar POINTS/split equivalentes si hiciera falta
    this.ttl = FAST_TTL;
    this.dead = false;
    this.rotSpeed = rand(-2.5, 2.5);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular pequeño
    const n = randInt(8, 11);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    // Recto, sin wrap: cruza y se va
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
    if (
      this.x < -FAST_MARGIN || this.x > W + FAST_MARGIN ||
      this.y < -FAST_MARGIN || this.y > H + FAST_MARGIN
    ) this.dead = true;
  }

  split() {
    return [
      new Asteroid(this.x, this.y, 1),
      new Asteroid(this.x, this.y, 1),
    ];
  }

  draw() {
    // Estela en dirección opuesta al movimiento
    const speed = Math.hypot(this.vx, this.vy) || 1;
    const nx = this.vx / speed;
    const ny = this.vy / speed;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 176, 46, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x - nx * this.radius * 3.2, this.y - ny * this.radius * 3.2);
    ctx.lineTo(this.x - nx * this.radius * 0.8, this.y - ny * this.radius * 0.8);
    ctx.stroke();
    // Parpadeo cuando está por expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = FAST_COLOR;
    ctx.lineWidth   = 1.8;
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

// ── Skins de nave ───────────────────────────────────────────────────────────────
// Cada skin define silueta (nariz hacia +X, contenida en ~±20px para no
// romper colisiones ni la posición de salida de las balas) y colores.
// Añadir una skin nueva es solo agregar un objeto a SHIP_SKINS.
function drawClassicShip() {
  ctx.beginPath();
  ctx.moveTo( 20,  0);   // nariz
  ctx.lineTo(-12, -9);   // ala izquierda
  ctx.lineTo( -7,  0);   // muesca trasera
  ctx.lineTo(-12,  9);   // ala derecha
  ctx.closePath();
  ctx.stroke();
}

function drawInterceptorShip() {
  // Esbelta y afilada: morro largo, alas estrechas barridas hacia atrás
  ctx.beginPath();
  ctx.moveTo( 22,  0);   // nariz
  ctx.lineTo( -6, -5);
  ctx.lineTo(-12, -12);  // punta ala izquierda
  ctx.lineTo( -8,  0);   // muesca trasera
  ctx.lineTo(-12,  12);  // punta ala derecha
  ctx.lineTo( -6,  5);
  ctx.closePath();
  ctx.stroke();
  // Cabina
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(2, -3);
  ctx.lineTo(2,  3);
  ctx.closePath();
  ctx.stroke();
}

function drawTankerShip() {
  // Ancha y robusta: morro corto, cuerpo ancho
  ctx.beginPath();
  ctx.moveTo( 14,  0);   // nariz
  ctx.lineTo(  4, -6);
  ctx.lineTo(-10, -13);  // ala izquierda ancha
  ctx.lineTo( -6,  0);   // muesca trasera
  ctx.lineTo(-10,  13);  // ala derecha ancha
  ctx.lineTo(  4,  6);
  ctx.closePath();
  ctx.stroke();
  // Blindaje frontal
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(4,  6);
  ctx.closePath();
  ctx.stroke();
}

const SHIP_SKINS = [
  { id: 'classic',     name: 'CLASICA',     color: '#fff', flame: 'rgba(255, 130, 0, 0.85)',  draw: drawClassicShip },
  { id: 'interceptor', name: 'INTERCEPTOR', color: '#0ff', flame: 'rgba(0, 200, 255, 0.9)',   draw: drawInterceptorShip },
  { id: 'tanker',      name: 'TANQUE',      color: '#7dff6a', flame: 'rgba(255, 220, 60, 0.9)', draw: drawTankerShip },
];

const SKIN_STORAGE_KEY = 'asteroids_skin';

function loadSkin() {
  try {
    const id = localStorage.getItem(SKIN_STORAGE_KEY);
    const i = SHIP_SKINS.findIndex(s => s.id === id);
    return i >= 0 ? i : 0;
  } catch { return 0; }
}

function saveSkin() {
  try { localStorage.setItem(SKIN_STORAGE_KEY, SHIP_SKINS[currentSkin].id); } catch { /* privado: se ignora */ }
}

function cycleSkin() {
  currentSkin = (currentSkin + 1) % SHIP_SKINS.length;
  saveSkin();
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
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  activateSpeedBoost() {
    this.speedBoost = SPEED_BOOST_DURATION;
  }

  activateTripleShot() {
    this.tripleShot = TRIPLE_SHOT_DURATION;
  }

  activateShield() {
    this.shield = SHIELD_DURATION;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoost > 0 ? 2 : 1);  // px/s² (x2 con power-up)
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
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot <= 0) return [new Bullet(ox, oy, this.angle)];
    const SPREAD = 10 * Math.PI / 180; // ±10°
    return [
      new Bullet(ox, oy, this.angle - SPREAD),
      new Bullet(ox, oy, this.angle),
      new Bullet(ox, oy, this.angle + SPREAD),
    ];
  }

  draw() {
    if (this.dead) return;
    // Anillo del escudo: visible incluso durante el parpadeo de invencibilidad
    if (this.shield > 0) {
      const pulse = 0.6 + 0.3 * Math.sin(Date.now() / 150);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const skin = SHIP_SKINS[currentSkin];
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta según la skin activa
    skin.draw();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up (velocidad / triple shot / escudo) ──────────────────────────────────
const SPEED_BOOST_DURATION  = 5;    // segundos de efecto
const TRIPLE_SHOT_DURATION  = 5;    // segundos de efecto
const POWERUP_DROP_CHANCE   = 0.20; // probabilidad al destruir asteroide size > 1
const POWERUP_TTL           = 8;    // segundos en pantalla si no se recoge
const POWERUP_COLORS = { speed: '#0ff', triple: '#ff2fd6', shield: '#4da6ff' };

// ── Escudo (protege de asteroides/cometa) ─────────────────────────────────────
const SHIELD_DURATION   = 8;       // segundos de protección
const SHIELD_DROP_CHANCE = 0.10;   // roll independiente al de velocidad
const SHIELD_COLOR      = '#4da6ff';

class PowerUp {
  constructor(x, y, kind = 'speed') {
    this.x = x;
    this.y = y;
    this.kind = kind; // 'speed' | 'triple' | 'shield'
    this.radius = 11;
    this.ttl  = POWERUP_TTL;
    this.dead = false;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(10, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = POWERUP_COLORS[this.kind] || '#0ff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    if (this.kind === 'triple') {
      // Tres puntos verticales = triple shot
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0.1, -5);
      ctx.moveTo(0, 0);
      ctx.lineTo(0.1, 0);
      ctx.moveTo(0, 5);
      ctx.lineTo(0.1, 5);
      ctx.stroke();
    } else if (this.kind === 'shield') {
      // Icono escudo: arco superior + base en punta
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(-5, 2);
      ctx.lineTo(-5, -2);
      ctx.quadraticCurveTo(-5, -6, 0, -7);
      ctx.quadraticCurveTo(5, -6, 5, -2);
      ctx.lineTo(5, 2);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Doble chevrón ">>" = velocidad
      ctx.beginPath();
      ctx.moveTo(-6, -5);
      ctx.lineTo(-1,  0);
      ctx.lineTo(-6,  5);
      ctx.moveTo( 0, -5);
      ctx.lineTo( 5,  0);
      ctx.lineTo( 0,  5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, fastAsteroids;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let fastTimer;  // cuenta atrás para el asteroide especial
let currentSkin = loadSkin(); // índice en SHIP_SKINS, sobrevive a reset/nivel

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

function resetFastTimer() {
  fastTimer = rand(FAST_MIN_DELAY, FAST_MAX_DELAY);
}

function spawnFastAsteroid() {
  // Punto aleatorio en un borde y rumbo recto hacia el lado opuesto
  const edge = randInt(0, 3);
  let x, y, baseAngle;
  if (edge === 0)      { x = rand(0, W); y = -20; baseAngle = Math.PI / 2; }
  else if (edge === 1) { x = W + 20; y = rand(0, H); baseAngle = Math.PI; }
  else if (edge === 2) { x = rand(0, W); y = H + 20; baseAngle = -Math.PI / 2; }
  else                 { x = -20; y = rand(0, H); baseAngle = 0; }
  const angle = baseAngle + rand(-0.5, 0.5);
  const speed = rand(FAST_SPEED_MIN, FAST_SPEED_MAX);
  fastAsteroids.push(new FastAsteroid(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  fastAsteroids = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  resetFastTimer();
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  fastAsteroids = [];
  ship.reset();
  resetFastTimer();
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
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    if (pressed('KeyS')) cycleSkin();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    fastAsteroids.forEach(f => f.update(dt));
    fastAsteroids = fastAsteroids.filter(f => !f.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar / cambiar skin
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }
  if (pressed('KeyS')) cycleSkin();

  // Temporizador del asteroide especial (máx. 1 en pantalla)
  fastTimer -= dt;
  if (fastTimer <= 0) {
    if (!fastAsteroids.some(f => !f.dead)) spawnFastAsteroid();
    resetFastTimer();
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  fastAsteroids.forEach(f => f.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  fastAsteroids = fastAsteroids.filter(f => !f.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (a.size > 1) {
          // Opción A: rolls independientes (speed/triple + escudo)
          if (Math.random() < POWERUP_DROP_CHANCE) {
            const kind = Math.random() < 0.5 ? 'speed' : 'triple';
            powerups.push(new PowerUp(a.x, a.y, kind));
          }
          if (Math.random() < SHIELD_DROP_CHANCE)
            powerups.push(new PowerUp(a.x, a.y, 'shield'));
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs asteroide especial: más puntos y se divide en 2 pequeños
  for (const b of bullets) {
    for (const f of fastAsteroids) {
      if (!f.dead && !b.dead && dist(b, f) < f.radius) {
        b.dead = true;
        f.dead = true;
        score += FAST_POINTS;
        explode(f.x, f.y, 10);
        asteroids.push(...f.split());
      }
    }
  }
  fastAsteroids = fastAsteroids.filter(f => !f.dead);
  bullets       = bullets.filter(b => !b.dead);

  // Nave vs asteroide (normales + especial)
  // El escudo destruye el asteroide al contacto en vez de matar la nave.
  // No se consume por impacto: solo expira por tiempo.
  if (ship.invincible <= 0 && !ship.dead) {
    const shielded = ship.shield > 0;
    const shieldHits = [];
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (shielded) {
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          shieldHits.push(...a.split());
          if (a.size > 1) {
            if (Math.random() < POWERUP_DROP_CHANCE) {
              const kind = Math.random() < 0.5 ? 'speed' : 'triple';
              powerups.push(new PowerUp(a.x, a.y, kind));
            }
            if (Math.random() < SHIELD_DROP_CHANCE)
              powerups.push(new PowerUp(a.x, a.y, 'shield'));
          }
        } else {
          killShip();
          break;
        }
      }
    }
    if (shieldHits.length > 0) asteroids.push(...shieldHits);
    asteroids = asteroids.filter(a => !a.dead);
    if (state === 'playing' && !ship.dead) {
      for (const f of fastAsteroids) {
        if (!f.dead && dist(ship, f) < ship.radius + f.radius * 0.82) {
          if (shielded) {
            f.dead = true;
            score += FAST_POINTS;
            explode(f.x, f.y, 10);
            asteroids.push(...f.split());
          } else {
            killShip();
            break;
          }
        }
      }
      fastAsteroids = fastAsteroids.filter(f => !f.dead);
    }
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const p of powerups) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        if (p.kind === 'triple') ship.activateTripleShot();
        else if (p.kind === 'shield') ship.activateShield();
        else ship.activateSpeedBoost();
        explode(p.x, p.y, 6);
      }
    }
    powerups = powerups.filter(p => !p.dead);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = SHIP_SKINS[currentSkin].color;
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

  // Estados apilados desde abajo para evitar solapes (speed / triple / shield)
  let hudY = H - 14;
  if (ship.speedBoost > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`VELOCIDAD x2  ${Math.max(0, ship.speedBoost).toFixed(1)}s`, 14, hudY);
    hudY -= 18;
  }
  if (ship.tripleShot > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff2fd6';
    ctx.fillText(`TRIPLE x3  ${Math.max(0, ship.tripleShot).toFixed(1)}s`, 14, hudY);
    hudY -= 18;
  }
  if (ship.shield > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = SHIELD_COLOR;
    ctx.fillText(`ESCUDO  ${Math.max(0, ship.shield).toFixed(1)}s`, 14, hudY);
  }

  // Skin activa (S para cambiar)
  ctx.textAlign = 'right';
  ctx.fillStyle = SHIP_SKINS[currentSkin].color;
  ctx.fillText(`NAVE: ${SHIP_SKINS[currentSkin].name}  [S]`, W - 14, H - 14);
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
  fastAsteroids.forEach(f => f.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

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
