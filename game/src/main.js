import { createAudio } from './audio.js';
import { WAVES } from './levels.js';
import { CONFIG, TOWER_TYPES } from './config.js';
import { bindInput } from './input.js';
import { createWorld } from './world.js';
import { sellTower, cycleTarget } from './towers.js';

/* World adapter contract:
   installWorld({ reset(state), canPlace(x,y,state), spawn(enemy,state),
     step(dt,state) -> { kills: [enemyId], breaches: [enemyId] },
     render(ctx,state,pointer,alpha), setMuted?(boolean), cue?(name) }).
   Controller owns towers {id,type,x,y,level}, active enemy records and economy.
   World owns movement/combat/effects and reports each resolved enemy ID once.
   spawn records contain id, type, health, speed, reward, radius, wave.
   step must simulate only; render must not mutate gameplay. Slow is a speed multiplier.
   reset clears world entities; a new run resets IDs. Tower stats are CONFIG.towers.
   canPlace validates bank/channel geometry; controller validates tower spacing.
   Audio and wave scheduling remain controller-owned.
*/
export function createGame(root) {
  const canvas = root.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const el = (id) => root.querySelector(`#${id}`);
  const audio = createAudio();
  let world = null;
  let nextId = 1;
  let queue = [];
  let waveTime = 0;
  let noticeTime = 0;
  let accumulator = 0;
  let lastTime = null;
  let raf = 0;
  let disposed = false;
  const state = {
    screen: 'title', wave: 0, pearls: CONFIG.economy.startingPearls,
    lives: CONFIG.lives, score: 0, muted: false, selectedType: 'harpoon',
    selectedTowerId: null, towers: [], enemies: new Map(), elapsed: 0,
  };
  function notify(message) {
    el('notice').textContent = message;
    noticeTime = CONFIG.ui.noticeSeconds;
  }
  function screen(name) {
    state.screen = name;
    audio.setScene(name);
    accumulator = 0;
    syncHUD();
  }
  function cue(name, type) { audio.cue(name, type); }
  function reset() {
    if (!world) { notify('The harbor is being prepared. Gameplay modules are not installed yet.'); return false; }
    nextId = 1;
    queue = [];
    waveTime = 0;
    Object.assign(state, { wave: 0, pearls: CONFIG.economy.startingPearls,
      lives: CONFIG.lives, score: 0, selectedType: 'harpoon',
      selectedTowerId: null, towers: [], enemies: new Map(), elapsed: 0 });
    world.reset(state);
    el('notice').textContent = '';
    noticeTime = 0;
    return true;
  }
  function startWave() {
    if (state.wave >= CONFIG.totalWaves) return;
    state.wave++;
    waveTime = 0;
    let at = 0;
    queue = [];
    for (const group of WAVES[state.wave - 1].groups) {
      at += group.delay;
      for (let i = 0; i < group.count; i++) {
        queue.push({ at, type: group.type });
        at += group.interval;
      }
    }
    screen('playing');
    cue('wave');
  }
  function restart() { if (reset()) startWave(); }
  function primary() {
    if (state.screen === 'title' || state.screen === 'gameover' || state.screen === 'win') restart();
    else if (state.screen === 'waveclear') startWave();
    else if (state.screen === 'paused') screen('playing');
  }
  function pause(force = false) {
    if (state.screen === 'playing') screen('paused');
    else if (!force && state.screen === 'paused') screen('playing');
  }
  function mute() {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    world?.setMuted?.(state.muted);
    syncHUD();
  }
  function selectTower(type) {
    if (!TOWER_TYPES.includes(type)) return;
    state.selectedType = type;
    state.selectedTowerId = null;
    syncHUD();
  }
  const canBuild = () => world && ['playing', 'waveclear'].includes(state.screen);
  const selectedTower = () => state.towers.find((tower) => tower.id === state.selectedTowerId);
  function upgrade() {
    const tower = selectedTower();
    if (!canBuild() || !tower) return;
    const cost = CONFIG.towers[tower.type].upgradeCosts[tower.level - 1];
    if (cost === undefined) { notify('This tower is at maximum level.'); return; }
    if (state.pearls < cost) { notify(`Need ${cost - state.pearls} more pearls.`); return; }
    state.pearls -= cost;
    tower.level++;
    cue('upgrade');
    syncHUD();
  }
  function interact(x, y) {
    if (!canBuild()) return;
    const tower = state.towers.find((item) => Math.hypot(item.x - x, item.y - y) <= CONFIG.placement.radius);
    if (tower) {
      if (state.selectedTowerId === tower.id) upgrade();
      else { state.selectedTowerId = tower.id; syncHUD(); }
      return;
    }
    state.selectedTowerId = null;
    const type = CONFIG.towers[state.selectedType];
    if (state.pearls < type.cost) { notify(`Need ${type.cost - state.pearls} more pearls.`); syncHUD(); return; }
    if (x < CONFIG.placement.radius || y < CONFIG.placement.radius ||
        x > CONFIG.width - CONFIG.placement.radius || y > CONFIG.height - CONFIG.placement.radius ||
        state.towers.some((item) => Math.hypot(item.x - x, item.y - y) < CONFIG.placement.spacing) ||
        !world.canPlace(x, y, state)) {
      notify('Choose an open bank, clear of the channel and other towers.'); syncHUD(); return;
    }
    const placed = { id: nextId++, type: state.selectedType, x, y, level: 1 };
    state.towers.push(placed);
    state.pearls -= type.cost;
    state.selectedTowerId = placed.id;
    cue('build');
    syncHUD();
  }
  function spawn(type) {
    const base = CONFIG.enemies[type];
    const enemy = { ...base, id: nextId++, type, wave: state.wave,
      health: Math.round(base.health * (1 + (state.wave - 1) * CONFIG.enemyScaling.healthPerWave)),
      speed: base.speed * (1 + (state.wave - 1) * CONFIG.enemyScaling.speedPerWave) };
    state.enemies.set(enemy.id, enemy);
    world.spawn(enemy, state);
  }
  function update(dt) {
    state.elapsed += dt;
    waveTime += dt;
    while (queue.length && queue[0].at <= waveTime) spawn(queue.shift().type);
    const resolved = world.step(dt, state) || {};
    for (const id of resolved.breaches || []) {
      if (!state.enemies.delete(id)) continue;
      state.lives = Math.max(0, state.lives - 1);
      cue('breach');
    }
    for (const id of resolved.kills || []) {
      const enemy = state.enemies.get(id);
      if (!enemy) continue;
      state.enemies.delete(id);
      state.pearls += enemy.reward;
      state.score += enemy.reward * CONFIG.economy.killScoreMultiplier;
      cue('kill');
    }
    if (state.lives === 0) { screen('gameover'); cue('defeat'); }
    else if (queue.length === 0 && state.enemies.size === 0) {
      state.score += CONFIG.economy.waveScore;
      state.pearls += WAVES[state.wave - 1].bonus;
      if (state.wave === CONFIG.totalWaves) {
        state.score += CONFIG.economy.victoryScore + state.lives * CONFIG.economy.lifeScore;
        screen('win'); cue('victory');
      } else { screen('waveclear'); cue('clear'); }
    }
    syncHUD();
  }
  function syncHUD() {
    for (const id of ['pearls', 'lives', 'score']) el(id).textContent = String(state[id]);
    el('wave').textContent = `${state.wave} / ${CONFIG.totalWaves}`;
    el('mute').textContent = state.muted ? 'Sound off' : 'Sound on';
    el('mute').setAttribute('aria-pressed', String(state.muted));
    el('pause').textContent = state.screen === 'paused' ? 'Resume' : 'Pause';
    el('pause').disabled = !['playing', 'paused'].includes(state.screen);
    root.querySelectorAll('[data-tower]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.tower === state.selectedType));
    });
    const tower = selectedTower();
    const cost = tower ? CONFIG.towers[tower.type].upgradeCosts[tower.level - 1] : undefined;
    el('selected').textContent = tower ? `${CONFIG.towers[tower.type].name} · Level ${tower.level} / 3` : 'Select a tower, then click a bank.';
    el('upgrade').textContent = tower && cost === undefined ? 'Max level' : cost === undefined ? 'Upgrade' : `Upgrade · ${cost} pearls`;
    el('upgrade').disabled = !canBuild() || cost === undefined || state.pearls < cost;
    const screens = {
      title: ['Hold the harbor.', 'Build along the banks. Break the tide. Survive ten waves and the Leviathan.', 'Start voyage'],
      paused: ['A moment of calm.', 'The tide is held. Resume when you are ready, or begin a new voyage.', 'Resume'],
      waveclear: [`Wave ${state.wave} repelled.`, 'Spend your pearls. Build and upgrade before the next tide.', 'Next wave'],
      gameover: ['The harbor has fallen.', `You reached wave ${state.wave}. Score: ${state.score}. The coast needs you again.`, 'Try again'],
      win: ['The tide is broken.', `Leviathan defeated. ${state.lives} lives remain. Final score: ${state.score}.`, 'Sail again'],
    };
    const content = screens[state.screen];
    el('overlay').hidden = !content || state.screen === 'waveclear';
    // Wave-clear allows bank interaction; show its message in a compact HUD instead.
    if (state.screen === 'waveclear') {
      el('selected').textContent = `Wave ${state.wave} clear · ${tower ? CONFIG.towers[tower.type].name + ' Lv ' + tower.level : 'Prepare your defenses'}`;
    }
    el('primary').textContent = content?.[2] || 'Continue';
    if (content) {
      el('screen-title').textContent = content[0];
      el('screen-description').textContent = content[1];
    }
    el('restart').hidden = state.screen === 'title';
    el('next-wave').hidden = state.screen !== 'waveclear';
    el('run-restart').hidden = state.screen !== 'waveclear';
  }
  // Compact intermission controls leave the battlefield available for construction.
  const nextButton = document.createElement('button');
  nextButton.id = 'next-wave'; nextButton.dataset.action = 'primary'; nextButton.textContent = 'Next wave';
  const restartButton = document.createElement('button');
  restartButton.id = 'run-restart'; restartButton.dataset.action = 'restart'; restartButton.textContent = 'Restart';
  root.querySelector('footer').append(nextButton, restartButton);
  const input = bindInput(canvas, root, { primary, restart, pause, mute, selectTower, interact, upgrade, sell: () => { sellTower(state); syncHUD(); }, target: () => cycleTarget(state) });
  function frame(time) {
    if (disposed) return;
    const dt = lastTime === null ? 0 : Math.min(CONFIG.simulation.maxFrame, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    if (noticeTime > 0) {
      noticeTime -= dt;
      if (noticeTime <= 0) el('notice').textContent = '';
    }
    if (state.screen === 'playing' && world) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= CONFIG.simulation.step && steps < CONFIG.simulation.maxSteps && state.screen === 'playing') {
        accumulator -= CONFIG.simulation.step;
        update(CONFIG.simulation.step);
        steps++;
      }
      if (steps === CONFIG.simulation.maxSteps) accumulator = 0;
    } else accumulator = 0;
    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
    world?.render(ctx, state, input.pointer, accumulator / CONFIG.simulation.step);
    raf = requestAnimationFrame(frame);
  }
  syncHUD();
  raf = requestAnimationFrame(frame);
  return {
    state, config: CONFIG,
    installWorld(adapter) {
      if (world || state.screen !== 'title') throw new Error('Install the world once, before starting.');
      for (const method of ['reset', 'canPlace', 'spawn', 'step', 'render']) {
        if (typeof adapter?.[method] !== 'function') throw new TypeError(`World adapter needs ${method}().`);
      }
      world = adapter;
      world.cue = cue;
      world.reset(state);
      world.setMuted?.(state.muted);
      syncHUD();
    },
    destroy() { audio.destroy(); disposed = true; cancelAnimationFrame(raf); input.destroy(); nextButton.remove(); restartButton.remove(); },
  };
}

if (typeof document !== 'undefined') {
  window.Tidegate = createGame(document.querySelector('#app'));
  window.Tidegate.installWorld(createWorld());
  window.dispatchEvent(new CustomEvent('tidegate-ready', { detail: window.Tidegate }));
}
