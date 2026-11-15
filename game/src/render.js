// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. A night
// garden: gradient sky, twinkling stars, a glowing moon, hill silhouettes, five garden lanterns
// that light up as levels are cleared, a hooded keeper with a warm lantern, glowing ember-spirits
// and flapping shadow-moths. Text that holds a number is rebuilt only when the number changes,
// so a frame allocates nothing.
import { FIELD, FONT, LEVEL, LIVES, PALETTE } from './config.js';
import { KIND_GOLDEN, KIND_MOTH, quotaFor } from './world.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 140, line: 34, bottom: 76 };
const LANTERN_X = [150, 390, 640, 890, 1130];
const STAR_COUNT = 90;
const FIREFLY_COUNT = 22;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const finalLabel = cachedLabel('Score ');
  const comboLabel = cachedLabel('Combo x');
  const lanternLabel = cachedLabel('Lanterns ');
  const quotaLabel = cachedLabel('Embers ');

  // Fixed scenery, drawn from one seeded shuffle so every visit shows the same garden.
  const scenery = createRandom(20261116);
  const stars = [];
  for (let index = 0; index < STAR_COUNT; index += 1) {
    stars.push({ x: scenery() * FIELD.width, y: scenery() * 380, r: 0.6 + scenery() * 1.6, phase: scenery() * Math.PI * 2 });
  }
  const grass = [];
  for (let index = 0; index < 70; index += 1) {
    grass.push({ x: scenery() * FIELD.width, h: 10 + scenery() * 22, lean: (scenery() - 0.5) * 14 });
  }
  const fireflies = [];
  for (let index = 0; index < FIREFLY_COUNT; index += 1) {
    fireflies.push({
      x: scenery() * FIELD.width,
      y: 120 + scenery() * 480,
      amp: 14 + scenery() * 30,
      freq: 0.3 + scenery() * 0.7,
      phase: scenery() * Math.PI * 2,
    });
  }
  let skyGradient = null;
  let groundGradient = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function glow(x, y, radius, color, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawSky(elapsed) {
    if (skyGradient === null) {
      skyGradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
      skyGradient.addColorStop(0, PALETTE.skyTop);
      skyGradient.addColorStop(1, PALETTE.skyBottom);
    }
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    for (const star of stars) {
      context.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * 1.4 + star.phase));
      context.fillStyle = '#e8ecff';
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    glow(1090, 110, 130, PALETTE.moon, 0.35);
    context.fillStyle = PALETTE.moon;
    context.beginPath();
    context.arc(1090, 110, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e3d3a8';
    context.beginPath();
    context.arc(1076, 100, 9, 0, Math.PI * 2);
    context.arc(1102, 122, 6, 0, Math.PI * 2);
    context.fill();
    // Far and near hill silhouettes.
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, 620);
    context.quadraticCurveTo(320, 520, 640, 600);
    context.quadraticCurveTo(960, 660, 1280, 560);
    context.lineTo(1280, FIELD.groundY);
    context.lineTo(0, FIELD.groundY);
    context.fill();
    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(0, 640);
    context.quadraticCurveTo(420, 580, 820, 630);
    context.quadraticCurveTo(1060, 655, 1280, 620);
    context.lineTo(1280, FIELD.groundY);
    context.lineTo(0, FIELD.groundY);
    context.fill();
    // Wandering fireflies.
    for (const fly of fireflies) {
      const x = fly.x + Math.sin(elapsed * fly.freq + fly.phase) * fly.amp;
      const y = fly.y + Math.cos(elapsed * fly.freq * 0.8 + fly.phase) * 12;
      context.globalAlpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(elapsed * 2 + fly.phase * 3));
      context.fillStyle = '#ffe9a8';
      context.beginPath();
      context.arc(x, y, 2.2, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawGround() {
    if (groundGradient === null) {
      groundGradient = context.createLinearGradient(0, FIELD.groundY, 0, FIELD.height);
      groundGradient.addColorStop(0, PALETTE.ground);
      groundGradient.addColorStop(1, '#0e1a10');
    }
    context.fillStyle = groundGradient;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.grassDark;
    context.fillRect(0, FIELD.groundY, FIELD.width, 4);
    for (const blade of grass) {
      context.strokeStyle = PALETTE.grass;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(blade.x, FIELD.groundY + 56);
      context.quadraticCurveTo(blade.x + blade.lean, FIELD.groundY + 56 - blade.h, blade.x + blade.lean * 1.6, FIELD.groundY + 56 - blade.h - 6);
      context.stroke();
    }
  }

  /** The five garden lanterns on posts: lit ones glow warm, unlit ones wait dark. */
  function drawGardenLanterns(state, screen) {
    const lit = screen === SCREEN_WIN ? LEVEL.max : state.level - 1;
    for (let index = 0; index < LEVEL.max; index += 1) {
      const x = LANTERN_X[index];
      const top = FIELD.groundY - 58;
      context.fillStyle = '#0c1420';
      context.fillRect(x - 3, top + 18, 6, 40);
      context.fillStyle = '#0c1420';
      context.beginPath();
      context.moveTo(x - 12, top + 18);
      context.lineTo(x + 12, top + 18);
      context.lineTo(x + 7, top + 6);
      context.lineTo(x - 7, top + 6);
      context.closePath();
      context.fill();
      if (index < lit) {
        glow(x, top + 12, 44, PALETTE.lanternGlow, 0.55);
        context.fillStyle = PALETTE.lanternLit;
      } else {
        context.fillStyle = PALETTE.lanternUnlit;
      }
      context.fillRect(x - 8, top + 4, 16, 14);
    }
  }

  function drawKeeper(keeper) {
    const x = keeper.x;
    const y = keeper.y;
    const cx = x + keeper.width / 2;
    // Blink while invulnerable after a moth hit: hidden on every other tenth of a second.
    if (keeper.invulnerable !== 0 && Math.floor(keeper.invulnerable * 10) % 2 === 0) return;
    glow(cx + 26, y + 46, 52, PALETTE.lanternGlow, 0.5);
    // Cloak.
    context.fillStyle = PALETTE.keeperCloak;
    context.beginPath();
    context.moveTo(cx - 20, y + keeper.height);
    context.quadraticCurveTo(cx - 24, y + 34, cx - 10, y + 22);
    context.lineTo(cx + 10, y + 22);
    context.quadraticCurveTo(cx + 24, y + 34, cx + 20, y + keeper.height);
    context.closePath();
    context.fill();
    // Hood and face.
    context.fillStyle = PALETTE.keeperCloakDark;
    context.beginPath();
    context.arc(cx, y + 16, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.keeperFace;
    context.beginPath();
    context.arc(cx, y + 18, 9, 0, Math.PI * 2);
    context.fill();
    // The keeper's lantern, held out to the side.
    context.strokeStyle = PALETTE.keeperCloakDark;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(cx + 12, y + 40);
    context.lineTo(cx + 26, y + 40);
    context.stroke();
    context.fillStyle = '#2a1f10';
    context.fillRect(cx + 22, y + 38, 12, 16);
    context.fillStyle = PALETTE.lanternLit;
    context.fillRect(cx + 24, y + 41, 8, 10);
  }

  function drawItems(state, elapsed) {
    for (const item of state.items) {
      if (!item.active) continue;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      if (item.kind === KIND_MOTH) {
        const flap = Math.sin(elapsed * 14 + item.phase) * 0.55;
        context.fillStyle = PALETTE.mothWing;
        context.save();
        context.translate(cx, cy);
        context.rotate(-0.5 - flap);
        context.beginPath();
        context.ellipse(-16, -4, 18, 9, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
        context.save();
        context.translate(cx, cy);
        context.rotate(0.5 + flap);
        context.beginPath();
        context.ellipse(16, -4, 18, 9, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
        context.fillStyle = PALETTE.mothBody;
        context.beginPath();
        context.ellipse(cx, cy, 7, 12, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.mothEye;
        context.beginPath();
        context.arc(cx - 3, cy - 4, 1.8, 0, Math.PI * 2);
        context.arc(cx + 3, cy - 4, 1.8, 0, Math.PI * 2);
        context.fill();
      } else {
        const golden = item.kind === KIND_GOLDEN;
        const radius = item.width / 2;
        glow(cx, cy, radius * 3.2, golden ? PALETTE.golden : PALETTE.ember, 0.6);
        context.fillStyle = golden ? PALETTE.golden : PALETTE.ember;
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.emberCore;
        context.beginPath();
        context.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
        context.fill();
        if (golden) {
          context.strokeStyle = PALETTE.emberCore;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(cx, cy, radius + 5 + Math.sin(elapsed * 5 + item.phase) * 2, 0, Math.PI * 2);
          context.stroke();
        }
      }
    }
  }

  function drawHud(state, screen, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left');
    if (state.combo >= 3) {
      context.globalAlpha = 0.9;
      text(comboLabel(state.combo), 24, 52, 20, PALETTE.ember, 'left');
      context.globalAlpha = 1;
    }
    const lit = screen === SCREEN_WIN ? LEVEL.max : state.level - 1;
    text(lanternLabel(lit) + '/5', FIELD.width / 2, 18, 28, PALETTE.text, 'center');
    text(`${quotaLabel(state.gathered)}/${state.quota}`, FIELD.width / 2, 52, 20, PALETTE.muted, 'center');
    // Quota progress bar under the lantern count.
    const barWidth = 150;
    const barX = FIELD.width / 2 - barWidth / 2;
    context.fillStyle = '#0c1420';
    context.fillRect(barX, 78, barWidth, 8);
    context.fillStyle = PALETTE.lanternGlow;
    context.fillRect(barX, 78, barWidth * Math.min(1, state.gathered / state.quota), 8);
    // Lives as little lanterns, top right.
    const firstLife = FIELD.width - 24 - LIVES * 28 + 4;
    text('Lives', firstLife - 14, 18, 28, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      const x = firstLife + life * 28;
      if (life < state.lives) {
        glow(x + 10, 30, 16, PALETTE.lanternGlow, 0.6);
        context.fillStyle = PALETTE.lanternLit;
      } else {
        context.fillStyle = PALETTE.lanternUnlit;
      }
      context.fillRect(x, 22, 20, 16);
    }
    text(muted ? 'M: sound off' : 'M: sound on', FIELD.width - 24, FIELD.height - 30, 16, PALETTE.muted, 'right');
    if (state.bannerTimer > 0) {
      context.globalAlpha = Math.min(1, state.bannerTimer / 0.6);
      text(state.banner, FIELD.width / 2, 130, 30, PALETTE.lanternLit, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelBorder;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.lanternGlow, 'center');
  }

  const TITLE_LINES = [
    'Catch the drifting ember-spirits in your lantern.',
    'Dodge the shadow-moths — one touch costs a life.',
    'Gather the quota to light each garden lantern.',
    'Light all five lanterns to win. Three lives.',
    'Move with ← → or A D, or steer with the mouse.',
    'Pause with P.  M mutes the sound.',
    '',
  ];
  const PAUSED_LINES = ['The embers will wait for you.'];
  const OVER_LINES = ['', '', ''];
  const WIN_LINES = ['', '', ''];

  /** Paint one frame: the garden, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state.elapsed);
    drawGround();
    drawGardenLanterns(state, screen);
    drawItems(state, state.elapsed);
    drawKeeper(state.keeper);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[6] = bestLabel(best);
      drawPanel('Emberlight Keeper', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state, screen, muted);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = `Best combo x${state.bestCombo} · Lanterns lit ${state.level - 1}/5`;
      OVER_LINES[2] = bestLabel(best);
      drawPanel('The garden fades…', OVER_LINES, 'Press Space or click to play again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = `Best combo x${state.bestCombo} · All five lanterns lit!`;
      WIN_LINES[2] = bestLabel(best);
      drawPanel('The garden glows!', WIN_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
