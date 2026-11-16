import { CONFIG } from './config.js';

export const TARGET_MODES = ['first', 'last', 'strongest'];
export function towerValue(tower) {
  return CONFIG.towers[tower.type].cost + CONFIG.towers[tower.type].upgradeCosts.slice(0, tower.level - 1).reduce((a, b) => a + b, 0);
}
export function sellTower(state) {
  if (!['playing', 'waveclear'].includes(state.screen)) return 0;
  const index = state.towers.findIndex(t => t.id === state.selectedTowerId);
  if (index < 0) return 0;
  const refund = Math.floor(towerValue(state.towers[index]) / 2);
  state.towers.splice(index, 1); state.selectedTowerId = null; state.pearls += refund;
  return refund;
}
export function cycleTarget(state) {
  const tower = state.towers.find(t => t.id === state.selectedTowerId);
  if (tower && ['playing', 'waveclear'].includes(state.screen)) {
    tower.targetMode = TARGET_MODES[(TARGET_MODES.indexOf(tower.targetMode || 'first') + 1) % TARGET_MODES.length];
  }
}
export function createCombat() {
  const projectiles = [];
  const timers = new Map();
  function burst(world, x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      world.particles.push({ x, y, vx: Math.cos(angle) * 65, vy: Math.sin(angle) * 65, life: 0.45, color });
    }
  }
  return {
    projectiles,
    reset() { projectiles.length = 0; timers.clear(); },
    spit(enemy, tower) {
      projectiles.push({ x: enemy.x, y: enemy.y, targetId: tower.id, tx: tower.x, ty: tower.y,
        speed: 210, hostile: true, color: '#d795bd', type: 'spit' });
    },
    step(dt, state, world) {
      const kills = [];
      function hit(enemy, shot) {
        if (!enemy || enemy.resolved) return;
        const damage = Math.max(1, shot.damage - enemy.armor);
        enemy.health -= damage;
        world.cue?.('hit');
        if (shot.slow < 1) {
          enemy.slow = Math.min(enemy.slow, shot.slow);
          enemy.slowTime = Math.max(enemy.slowTime, shot.slowDuration);
        }
        world.texts.push({ x: enemy.x, y: enemy.y - enemy.radius, text: String(damage), color: shot.color, life: 0.65 });
        if (enemy.health <= 0) {
          enemy.resolved = true; kills.push(enemy.id);
          burst(world, enemy.x, enemy.y, enemy.color, 12);
          world.texts.push({ x: enemy.x, y: enemy.y, text: `+${enemy.reward} pearls`, color: '#f4cd7a', life: 1.2 });
        }
      }
      for (const tower of state.towers) {
        tower.suppressed = Math.max(0, (tower.suppressed || 0) - dt);
        const time = (timers.get(tower.id) || 0) - dt;
        timers.set(tower.id, time);
        if (time > 0 || tower.suppressed > 0) continue;
        const stats = CONFIG.towers[tower.type].levels[tower.level - 1];
        const targets = [...state.enemies.values()].filter(e => !e.resolved && Math.hypot(e.x - tower.x, e.y - tower.y) <= stats.range);
        const mode = tower.targetMode || 'first';
        targets.sort((a, b) => (mode === 'strongest' ? b.health - a.health : mode === 'last' ? a.distance - b.distance : b.distance - a.distance) || a.id - b.id);
        const enemy = targets[0];
        if (!enemy) continue;
        tower.angle = Math.atan2(enemy.y - tower.y, enemy.x - tower.x);
        projectiles.push({ ...stats, speed: stats.projectileSpeed, x: tower.x, y: tower.y,
          tx: enemy.x, ty: enemy.y, targetId: enemy.id, type: tower.type, color: CONFIG.towers[tower.type].color });
        world.cue?.('shoot', tower.type);
        timers.set(tower.id, stats.cooldown);
      }
      const activeIds = new Set(state.towers.map(t => t.id));
      for (const id of timers.keys()) if (!activeIds.has(id)) timers.delete(id);
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const shot = projectiles[i];
        const target = shot.hostile ? state.towers.find(t => t.id === shot.targetId) : state.enemies.get(shot.targetId);
        if (target && !target.resolved) { shot.tx = target.x; shot.ty = target.y; }
        const dx = shot.tx - shot.x, dy = shot.ty - shot.y;
        const distance = Math.hypot(dx, dy);
        if (distance > shot.speed * dt) {
          shot.x += dx / distance * shot.speed * dt; shot.y += dy / distance * shot.speed * dt;
          continue;
        }
        burst(world, shot.tx, shot.ty, shot.color);
        if (shot.hostile) { if (target) target.suppressed = Math.max(target.suppressed || 0, 0.65); }
        else if (shot.splash) {
          for (const enemy of state.enemies.values()) {
            if (Math.hypot(enemy.x - shot.tx, enemy.y - shot.ty) <= shot.splash + enemy.radius) hit(enemy, shot);
          }
        } else if (target && !target.resolved) hit(target, shot);
        projectiles.splice(i, 1);
      }
      return kills;
    },
  };
}
