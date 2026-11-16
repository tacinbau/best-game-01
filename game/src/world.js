import { CONFIG } from './config.js';
import { createCombat } from './towers.js';
import { drawWorld } from './render.js';

export const PATH = Object.freeze([
  { x: -50, y: 350 }, { x: 190, y: 350 }, { x: 290, y: 180 },
  { x: 510, y: 180 }, { x: 610, y: 510 }, { x: 830, y: 510 },
  { x: 940, y: 290 }, { x: 1130, y: 290 }, { x: 1190, y: 390 },
]);
export const CHANNEL_RADIUS = 42;
export const ENEMY_TYPES = Object.freeze({
  skitter: { name: 'Skitterer', health: 35, speed: 70, reward: 8, radius: 12, armor: 0, color: '#e5bb77' },
  shellback: { name: 'Shellback', health: 125, speed: 43, reward: 15, radius: 18, armor: 5, color: '#b2c59b' },
  spitter: { name: 'Spitter', health: 65, speed: 62, reward: 11, radius: 14, armor: 1, color: '#d795bd' },
  leviathan: { name: 'Leviathan', health: 3200, speed: 28, reward: 250, radius: 38, armor: 8, color: '#7ec9be' },
});
const segments = PATH.slice(1).map((end, i) => {
  const start = PATH[i];
  return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) };
});
export const PATH_LENGTH = segments.reduce((sum, s) => sum + s.length, 0);
export function pointOnPath(distance) {
  for (const s of segments) {
    if (distance <= s.length) {
      const t = Math.max(0, distance / s.length);
      return { x: s.start.x + (s.end.x - s.start.x) * t, y: s.start.y + (s.end.y - s.start.y) * t,
        angle: Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x) };
    }
    distance -= s.length;
  }
  return { ...PATH.at(-1), angle: Math.PI / 3 };
}
export function channelDistance(x, y) {
  return Math.min(...segments.map(({ start: a, end: b, length }) => {
    const t = Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / length ** 2));
    return Math.hypot(x - a.x - t * (b.x - a.x), y - a.y - t * (b.y - a.y));
  }));
}
export const PLOTS = [];
for (let y = 110; y <= 610; y += 80) {
  for (let x = 100; x <= 1100; x += 80) {
    const distance = channelDistance(x, y);
    if (distance >= 78 && distance <= 155) PLOTS.push(Object.freeze({ x, y }));
  }
}
export function plotAt(x, y) {
  return PLOTS.find(p => Math.hypot(p.x - x, p.y - y) <= 25);
}

// The controller drives CONFIG.waves and calls spawn; this adapter owns all simulation.
export function createWorld() {
  const combat = createCombat();
  const world = {
    particles: [], texts: [], projectiles: combat.projectiles,
    reset() { combat.reset(); world.particles.length = 0; world.texts.length = 0; },
    canPlace(x, y, state) {
      const plot = plotAt(x, y);
      return Boolean(plot && !state.towers.some(t => Math.hypot(t.x - plot.x, t.y - plot.y) < CONFIG.placement.spacing));
    },
    spawn(enemy) {
      const type = enemy.type === 'surge' ? 'spitter' : enemy.type;
      const base = ENEMY_TYPES[type] || ENEMY_TYPES.skitter;
      Object.assign(enemy, base, { type, health: Math.round(base.health * (1 + (enemy.wave - 1) * CONFIG.enemyScaling.healthPerWave)),
        speed: base.speed * (1 + (enemy.wave - 1) * CONFIG.enemyScaling.speedPerWave),
        distance: 0, slow: 1, slowTime: 0, attackTime: 2, resolved: false });
      enemy.maxHealth = enemy.health;
      Object.assign(enemy, pointOnPath(0));
    },
    step(dt, state) {
      // Snap controller-created towers onto their chosen bank plot once.
      for (const tower of state.towers) {
        if (!tower.anchored) {
          const plot = plotAt(tower.x, tower.y);
          if (plot) Object.assign(tower, plot);
          tower.anchored = true;
        }
      }
      const kills = combat.step(dt, state, world);
      const breaches = [];
      for (const enemy of state.enemies.values()) {
        if (enemy.resolved) continue;
        enemy.slowTime = Math.max(0, enemy.slowTime - dt);
        if (!enemy.slowTime) enemy.slow = 1;
        enemy.distance += enemy.speed * enemy.slow * dt;
        Object.assign(enemy, pointOnPath(enemy.distance));
        // Spitters suppress a nearby tower with a travelling brine glob.
        if (enemy.type === 'spitter') {
          enemy.attackTime -= dt;
          const target = state.towers.find(t => Math.hypot(t.x - enemy.x, t.y - enemy.y) < 155);
          if (enemy.attackTime <= 0 && target) {
            combat.spit(enemy, target); enemy.attackTime = 3.5;
          }
        }
        if (enemy.distance >= PATH_LENGTH) {
          enemy.resolved = true; breaches.push(enemy.id);
          world.texts.push({ x: enemy.x, y: enemy.y, text: '−1 LIFE', color: '#ff987e', life: 1.2 });
        }
      }
      for (const p of world.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      for (const t of world.texts) { t.life -= dt; t.y -= 25 * dt; }
      world.particles = world.particles.filter(p => p.life > 0);
      world.texts = world.texts.filter(t => t.life > 0);
      return { kills, breaches };
    },
    render(ctx, state, pointer, alpha) { drawWorld(ctx, state, pointer, world, alpha); },
  };
  return world;
}
