import { CONFIG } from './config.js';
import { PATH, PLOTS, CHANNEL_RADIUS, plotAt } from './world.js';
import { towerValue } from './towers.js';

function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function text(ctx, label, x, y, size = 16, color = '#dbece4', align = 'left') {
  ctx.fillStyle = color; ctx.font = `${size}px system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(label, x, y);
}
function channel(ctx, width, color) {
  ctx.beginPath(); PATH.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke();
}
function drawTower(ctx, tower) {
  const spec = CONFIG.towers[tower.type];
  circle(ctx, tower.x + 3, tower.y + 5, 25, '#071b24aa');
  circle(ctx, tower.x, tower.y, 23, '#243f43', '#7d9990');
  circle(ctx, tower.x, tower.y, 17, '#112a35', spec.color);
  ctx.save(); ctx.translate(tower.x, tower.y); ctx.rotate(tower.angle || 0);
  ctx.fillStyle = spec.color;
  if (tower.type === 'cannon') { ctx.fillRect(-7, -9, 34, 18); circle(ctx, 25, 0, 7, '#172c36'); }
  else if (tower.type === 'harpoon') {
    ctx.fillRect(-12, -3, 39, 6); ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(19, -8); ctx.lineTo(19, 8); ctx.closePath(); ctx.fill();
  } else {
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.fillRect(0, -2, 18, 4); }
    circle(ctx, 0, 0, 7, '#d3fcff');
  }
  ctx.restore();
  for (let i = 0; i < tower.level; i++) circle(ctx, tower.x + (i - (tower.level - 1) / 2) * 9, tower.y + 31, 3, spec.color);
  if (tower.suppressed > 0) circle(ctx, tower.x, tower.y, 28, null, '#d795bd');
}
function drawEnemy(ctx, enemy) {
  ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(enemy.angle);
  const r = enemy.radius;
  circle(ctx, 2, 4, r, '#071b2488');
  ctx.fillStyle = enemy.color;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#172f38'; ctx.lineWidth = 3;
  if (enemy.type === 'shellback') {
    ctx.beginPath(); ctx.moveTo(-r / 2, -r / 2); ctx.lineTo(r / 2, r / 2); ctx.moveTo(-r / 2, r / 2); ctx.lineTo(r / 2, -r / 2); ctx.stroke();
  } else {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * r / 2, -r / 2); ctx.lineTo(i * r / 2 - 7, -r - 4);
      ctx.moveTo(i * r / 2, r / 2); ctx.lineTo(i * r / 2 - 7, r + 4); ctx.stroke();
    }
  }
  circle(ctx, r * 0.6, -r * 0.3, 3, '#102536'); circle(ctx, r * 0.6, r * 0.3, 3, '#102536');
  ctx.restore();
  if (enemy.slowTime > 0) circle(ctx, enemy.x, enemy.y, r + 5, null, '#91e6ed');
  ctx.fillStyle = '#071722'; ctx.fillRect(enemy.x - r, enemy.y - r - 13, r * 2, 5);
  ctx.fillStyle = enemy.type === 'leviathan' ? '#ff987e' : '#91d4ac';
  ctx.fillRect(enemy.x - r, enemy.y - r - 13, r * 2 * Math.max(0, enemy.health / enemy.maxHealth), 5);
  if (enemy.type === 'leviathan') text(ctx, 'LEVIATHAN', enemy.x, enemy.y - r - 22, 12, '#ffcfac', 'center');
}
export function drawWorld(ctx, state, pointer, world) {
  ctx.save();
  const time = state.elapsed;
  const bg = ctx.createLinearGradient(0, 0, 1280, 720); bg.addColorStop(0, '#234844'); bg.addColorStop(1, '#122d36');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1280, 720);
  // Deterministic pebbles and grass make the banks readable without image assets.
  for (let i = 0; i < 160; i++) {
    const x = (i * 173 + 31) % 1280, y = (i * 97 + 59) % 720;
    circle(ctx, x, y, 1 + i % 3, i % 2 ? '#3c5c4a' : '#476453');
  }
  channel(ctx, CHANNEL_RADIUS * 2 + 24, '#576b57');
  channel(ctx, CHANNEL_RADIUS * 2 + 10, '#a6996b');
  channel(ctx, CHANNEL_RADIUS * 2, '#103d51');
  channel(ctx, CHANNEL_RADIUS * 2 - 15, '#174e60');
  ctx.save(); ctx.setLineDash([12, 24]); ctx.lineDashOffset = -time * 24;
  channel(ctx, 2, '#71bacb55'); ctx.restore();
  for (let i = 0; i < 45; i++) {
    const p = PATH[i % PATH.length];
    const x = p.x + Math.sin(i * 8) * 22, y = p.y + Math.cos(i * 7) * 22;
    ctx.strokeStyle = '#75b6c333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 8 + Math.sin(time * 2 + i) * 3, 0.1, 2.4); ctx.stroke();
  }
  for (const plot of PLOTS) {
    if (state.towers.some(t => Math.hypot(t.x - plot.x, t.y - plot.y) < 48)) continue;
    circle(ctx, plot.x, plot.y, 22, '#16352c66', '#7d927166');
    text(ctx, '+', plot.x, plot.y + 6, 20, '#a6b89a88', 'center');
  }
  // Harbor piers and lighthouse sit beyond the final channel segment.
  ctx.fillStyle = '#877754'; ctx.fillRect(1138, 400, 125, 15); ctx.fillRect(1224, 322, 15, 94);
  for (let x = 1146; x < 1260; x += 15) { ctx.fillStyle = '#b6a375'; ctx.fillRect(x, 400, 2, 15); }
  ctx.fillStyle = '#b7c9b1'; ctx.fillRect(1206, 300, 31, 75);
  ctx.fillStyle = '#203c49'; ctx.fillRect(1201, 295, 41, 14);
  circle(ctx, 1221, 290, 10, '#ffe6a1');
  text(ctx, 'TIDEGATE HARBOR', 1125, 449, 13, '#e5d3a0');
  const hovered = pointer?.inside ? state.towers.find(t => Math.hypot(t.x - pointer.x, t.y - pointer.y) < 26) : null;
  const selected = state.towers.find(t => t.id === state.selectedTowerId);
  const preview = hovered || selected;
  if (preview) {
    const stats = CONFIG.towers[preview.type].levels[preview.level - 1];
    circle(ctx, preview.x, preview.y, stats.range, '#a8d9cb10', '#a8d9cb55');
    circle(ctx, preview.x, preview.y, 28, null, '#f4cd7a');
  } else if (pointer?.inside && ['playing', 'waveclear'].includes(state.screen)) {
    const plot = plotAt(pointer.x, pointer.y);
    if (plot) {
      const type = CONFIG.towers[state.selectedType];
      const valid = world.canPlace(pointer.x, pointer.y, state) && state.pearls >= type.cost;
      circle(ctx, plot.x, plot.y, type.levels[0].range, valid ? '#91e6ed15' : '#ff987e15', valid ? '#91e6ed66' : '#ff987e66');
      ctx.globalAlpha = 0.6; drawTower(ctx, { ...plot, type: state.selectedType, level: 1 }); ctx.globalAlpha = 1;
    }
  }
  state.towers.forEach(t => drawTower(ctx, t));
  for (const e of state.enemies.values()) if (!e.resolved) drawEnemy(ctx, e);
  for (const p of world.projectiles) {
    circle(ctx, p.x, p.y, p.type === 'cannon' ? 6 : 4, p.color);
    circle(ctx, p.x, p.y, 9, null, `${p.color}55`);
  }
  for (const p of world.particles) { ctx.globalAlpha = Math.min(1, p.life * 3); circle(ctx, p.x, p.y, 3, p.color); }
  ctx.globalAlpha = 1;
  for (const t of world.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); text(ctx, t.text, t.x, t.y, 14, t.color, 'center'); }
  ctx.globalAlpha = 1;
  if (selected) {
    const spec = CONFIG.towers[selected.type];
    ctx.fillStyle = '#071d2be8'; ctx.fillRect(24, 635, 650, 60);
    text(ctx, `${spec.name}  •  LEVEL ${selected.level}/3  •  TARGET: ${(selected.targetMode || 'first').toUpperCase()}`, 42, 660, 15, spec.color);
    text(ctx, `Click again to upgrade  ·  T: change target  ·  X: sell for ${Math.floor(towerValue(selected) / 2)} pearls`, 42, 683, 13);
  }
  ctx.restore();
}
