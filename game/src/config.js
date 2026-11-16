import { WAVES } from './levels.js';
// Distances are canvas pixels; durations are seconds; level arrays use index level - 1.
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const CONFIG = freeze({
  width: 1280, height: 720, lives: 10, totalWaves: WAVES.length,
  simulation: { step: 1 / 60, maxFrame: 0.1, maxSteps: 6 },
  economy: { startingPearls: 180, waveBonus: 25, waveBonusGrowth: 5,
    killScoreMultiplier: 10, waveScore: 250, victoryScore: 3000, lifeScore: 200 },
  placement: { radius: 22, spacing: 48, bankMargin: 10 },
  ui: { noticeSeconds: 2.5 },
  towers: {
    harpoon: { name: 'Harpoon', key: '1', description: 'Swift single-target strikes',
      color: '#f4cd7a', cost: 55, upgradeCosts: [65, 105],
      levels: [
        { damage: 9, range: 155, cooldown: 0.38, projectileSpeed: 620, splash: 0, slow: 1, slowDuration: 0 },
        { damage: 15, range: 175, cooldown: 0.32, projectileSpeed: 680, splash: 0, slow: 1, slowDuration: 0 },
        { damage: 24, range: 195, cooldown: 0.26, projectileSpeed: 740, splash: 0, slow: 1, slowDuration: 0 },
      ] },
    cannon: { name: 'Cannon', key: '2', description: 'Heavy blasts against groups',
      color: '#ff987e', cost: 100, upgradeCosts: [110, 160],
      levels: [
        { damage: 34, range: 165, cooldown: 1.65, projectileSpeed: 340, splash: 56, slow: 1, slowDuration: 0 },
        { damage: 57, range: 180, cooldown: 1.5, projectileSpeed: 360, splash: 68, slow: 1, slowDuration: 0 },
        { damage: 88, range: 200, cooldown: 1.35, projectileSpeed: 380, splash: 82, slow: 1, slowDuration: 0 },
      ] },
    frost: { name: 'Frost', key: '3', description: 'Chill the tide to buy time',
      color: '#91e6ed', cost: 80, upgradeCosts: [85, 135],
      levels: [
        { damage: 4, range: 140, cooldown: 0.8, projectileSpeed: 450, splash: 0, slow: 0.6, slowDuration: 1.5 },
        { damage: 7, range: 160, cooldown: 0.7, projectileSpeed: 480, splash: 0, slow: 0.48, slowDuration: 1.8 },
        { damage: 11, range: 180, cooldown: 0.6, projectileSpeed: 510, splash: 0, slow: 0.36, slowDuration: 2.1 },
      ] },
  },
  enemies: {
    skitter: { name: 'Brine Skitter', health: 35, speed: 70, reward: 8, radius: 12 },
    shellback: { name: 'Shellback', health: 125, speed: 43, reward: 15, radius: 18 },
    spitter: { name: 'Spitter', health: 65, speed: 62, reward: 11, radius: 14 },
    leviathan: { name: 'Leviathan', health: 3200, speed: 28, reward: 250, radius: 38 },
  },
  enemyScaling: { healthPerWave: 0.14, speedPerWave: 0.015 },
  // Compatibility view; the controller uses WAVES for groups and clear rewards.
  waves: WAVES.map(wave => wave.groups),

});
export const TOWER_TYPES = Object.freeze(Object.keys(CONFIG.towers));
export const STATES = Object.freeze(['title', 'playing', 'paused', 'waveclear', 'gameover', 'win']);
