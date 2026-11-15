// The game's rules and state, with no drawing and no browser in it: the keeper, the pool of
// falling ember-spirits and shadow-moths, spawning, collisions, score, combo, lives, lanterns
// and the win. step() advances one fixed step and returns what happened as bit flags, so the
// caller can react without the world knowing about screens or sound. Nothing here allocates
// after createWorld returns.
import { EMBER, FIELD, GOLDEN, KEEPER, LEVEL, LIVES, MOTH, POOL_SIZE } from './config.js';

export const KIND_EMBER = 0;
export const KIND_GOLDEN = 1;
export const KIND_MOTH = 2;

export const EVENT_EMBER = 1;
export const EVENT_GOLDEN = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_LEVEL = 16;
export const EVENT_WIN = 32;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Embers needed to light the lantern of `level`. */
export function quotaFor(level) {
  return LEVEL.baseQuota + LEVEL.quotaPerLevel * (level - 1);
}

export function createWorld(random) {
  const keeper = {
    x: 0,
    y: FIELD.groundY - KEEPER.height,
    width: KEEPER.width,
    height: KEEPER.height,
    invulnerable: 0,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({
      active: false,
      kind: KIND_EMBER,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      speed: 0,
      swayAmp: 0,
      swayFreq: 0,
      phase: 0,
    });
  }
  const state = {
    keeper,
    items,
    score: 0,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    combo: 0,
    bestCombo: 0,
    gathered: 0,
    quota: quotaFor(1),
    emberTimer: 0,
    mothTimer: 0,
    banner: '',
    bannerTimer: 0,
  };

  function reset() {
    keeper.x = (FIELD.width - keeper.width) / 2;
    keeper.invulnerable = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.gathered = 0;
    state.quota = quotaFor(1);
    state.emberTimer = EMBER.interval;
    state.mothTimer = MOTH.interval;
    state.banner = '';
    state.bannerTimer = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function armFall(item, width, height, speed) {
    item.width = width;
    item.height = height;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = speed;
    item.swayAmp = 20 + random() * 45;
    item.swayFreq = 0.6 + random() * 1.4;
    item.phase = random() * Math.PI * 2;
  }

  function spawnEmber() {
    const item = freeItem();
    if (item === null) return;
    const golden = random() < GOLDEN.chance;
    item.active = true;
    item.kind = golden ? KIND_GOLDEN : KIND_EMBER;
    const size = golden ? GOLDEN.size : EMBER.size;
    const speed = golden
      ? GOLDEN.speed + random() * 30
      : EMBER.speed + EMBER.speedPerLevel * (state.level - 1) + random() * 40;
    armFall(item, size, size, speed);
  }

  function spawnMoth() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_MOTH;
    armFall(item, MOTH.width, MOTH.height, MOTH.speed + MOTH.speedPerLevel * (state.level - 1) + random() * 50);
    item.swayAmp = 60 + random() * 70;
  }

  function emberInterval() {
    return Math.max(EMBER.minInterval, EMBER.interval * EMBER.intervalScale ** (state.level - 1));
  }

  function mothInterval() {
    return Math.max(MOTH.minInterval, MOTH.interval * MOTH.intervalScale ** (state.level - 1));
  }

  /** Points for catching an ember at the current combo: the streak pays, up to +20. */
  function catchPoints(base) {
    return base + Math.min(state.combo, 10) * 2;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right). With `harmless` set (the
   * title screen's backdrop) things fall but nothing touches the keeper and nothing scores.
   */
  function step(dt, direction, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.bannerTimer > 0) state.bannerTimer = Math.max(0, state.bannerTimer - dt);

    keeper.x = Math.min(FIELD.width - keeper.width, Math.max(0, keeper.x + direction * KEEPER.speed * dt));
    if (keeper.invulnerable > 0) keeper.invulnerable = Math.max(0, keeper.invulnerable - dt);

    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber();
      state.emberTimer += emberInterval();
    }
    state.mothTimer -= dt;
    if (state.mothTimer <= 0) {
      spawnMoth();
      state.mothTimer += mothInterval();
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      item.x += Math.sin(state.elapsed * item.swayFreq + item.phase) * item.swayAmp * dt;
      if (item.x < 0) item.x = 0;
      if (item.x > FIELD.width - item.width) item.x = FIELD.width - item.width;
      if (item.y > FIELD.groundY) {
        item.active = false;
        if (!harmless) {
          if (item.kind === KIND_MOTH) state.score += MOTH.dodgePoints;
          else {
            // A lost ember breaks the streak.
            state.combo = 0;
          }
        }
        continue;
      }
      if (harmless || !overlaps(item, keeper)) continue;
      if (item.kind === KIND_MOTH) {
        if (keeper.invulnerable === 0) {
          item.active = false;
          state.lives -= 1;
          state.combo = 0;
          keeper.invulnerable = KEEPER.invulnerable;
          events |= EVENT_HIT;
          if (state.lives === 0) {
            events |= EVENT_OVER;
            break;
          }
        }
      } else {
        item.active = false;
        const golden = item.kind === KIND_GOLDEN;
        state.score += catchPoints(golden ? GOLDEN.points : EMBER.points);
        state.combo += 1;
        if (state.combo > state.bestCombo) state.bestCombo = state.combo;
        state.gathered += 1;
        events |= golden ? EVENT_GOLDEN : EVENT_EMBER;
        if (state.gathered >= state.quota) {
          if (state.level >= LEVEL.max) {
            state.score += LEVEL.bonus;
            events |= EVENT_WIN;
            break;
          }
          state.level += 1;
          state.gathered = 0;
          state.quota = quotaFor(state.level);
          state.score += LEVEL.bonus;
          state.banner = `Lantern ${state.level - 1} lit — the garden brightens!`;
          state.bannerTimer = LEVEL.bannerSeconds;
          events |= EVENT_LEVEL;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
