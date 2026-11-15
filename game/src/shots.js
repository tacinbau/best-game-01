// The screenshot scenes behind ?shot=start|play|level|end|win. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot (look
// ahead each way the keeper could move, keep clear of moths, chase the lowest ember when that
// is safe), so the frame is what a short game really looks like and the same seed always gives
// the same frame.
import { FIELD, KEEPER, STEP } from './config.js';
import { EVENT_LEVEL, EVENT_OVER, EVENT_WIN, KIND_MOTH } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 900;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the play and level
 * scenes' pilot looks well ahead and keeps all its lives; the end scene's pilot is reckless —
 * it chases embers and never dodges, so the moths catch it, as a hurried player is caught.
 */
const HORIZON_GOOD = 0.7;
const SAMPLE = 1 / 30;
const DIRECTIONS = [0, -1, 1];
/** Extra room, each side, it keeps between the keeper and a moth. */
const MARGIN = 12;

/** Seconds until moving in `direction` (-1, 0, 1) runs the keeper into a moth; Infinity when it never does. */
function timeToHit(state, direction, horizon) {
  const keeper = state.keeper;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - keeper.width, Math.max(0, keeper.x + direction * KEEPER.speed * t));
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind !== KIND_MOTH) continue;
      const y = item.y + item.speed * t;
      if (y + item.height > keeper.y && y < keeper.y + keeper.height && item.x < x + keeper.width + MARGIN && item.x + item.width > x - MARGIN) return t;
    }
  }
  return Infinity;
}

/** Of the safe ways to move, the one toward the lowest ember (or the centre); else the one that is hit last. */
function autopilot(state, horizon) {
  const keeper = state.keeper;
  let ember = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (item.active && item.kind !== KIND_MOTH && (ember === null || item.y > ember.y)) ember = item;
  }
  const target = ember === null ? FIELD.width / 2 : ember.x + ember.width / 2;
  const centre = keeper.x + keeper.width / 2;
  const wanted = target > centre + 8 ? 1 : target < centre - 8 ? -1 : 0;
  let best = wanted;
  let bestTime = timeToHit(state, wanted, horizon);
  for (let index = 0; index < DIRECTIONS.length && bestTime !== Infinity; index += 1) {
    const time = timeToHit(state, DIRECTIONS[index], horizon);
    if (time > bestTime) {
      bestTime = time;
      best = DIRECTIONS[index];
    }
  }
  return best;
}

/** The reckless pilot for the end scene: toward the lowest ember, never dodging a moth. */
function recklessPilot(state) {
  const keeper = state.keeper;
  let ember = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (item.active && item.kind !== KIND_MOTH && (ember === null || item.y > ember.y)) ember = item;
  }
  if (ember === null) return 0;
  const centre = keeper.x + keeper.width / 2;
  const target = ember.x + ember.width / 2;
  return target > centre + 8 ? 1 : target < centre - 8 ? -1 : 0;
}

/**
 * Set `world` to the named scene (start, play, level, end or win; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'level' && name !== 'end' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const horizon = HORIZON_GOOD;
  const startLevel = world.state.level;
  for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
    const direction = name === 'end' ? recklessPilot(world.state) : autopilot(world.state, horizon);
    const events = world.step(STEP, direction, false);
    if (name === 'play' && world.state.elapsed >= PLAY_SECONDS) break;
    if (name === 'level' && events & EVENT_LEVEL) {
      // A few more steps so the level-up banner is on screen.
      for (let extra = 0; extra < 45; extra += 1) world.step(STEP, autopilot(world.state, horizon), false);
      break;
    }
    if (events & EVENT_OVER) break;
    if (events & EVENT_WIN) break;
    // Safety: never loop past the first level-up in the level scene.
    if (name === 'level' && world.state.level > startLevel) break;
  }
  if (world.state.lives === 0) return { screen: SCREEN_OVER, best: world.state.score };
  if (name === 'win' && world.state.level >= 5 && world.state.gathered >= world.state.quota) {
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  // The win scene should end on the win panel; if the pilot somehow did not win, show play.
  if (name === 'win') return { screen: SCREEN_PLAY, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}
